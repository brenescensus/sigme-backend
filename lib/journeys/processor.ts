// lib/journeys/processor.ts 

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { sendNotificationToSubscriber } from '@/lib/push/sender';
import { getNotificationQueue } from '../queue/notification-queue';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    // 🔥 ADD THIS:
    global: {
      fetch: (...args) => fetch(...args).then(res => {
        if (!res.ok && res.status >= 500) {
          console.error('[Supabase] Server error:', res.status);
        }
        return res;
      }),
    },
    db: {
      schema: 'public',
    },
  }
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface JourneyNode {
  id: string;
  type: 'send_notification' | 'wait' | 'condition' | 'ab_split' | 'entry' | 'exit' | 'update_contact';
  position: { x: number; y: number };
  data: any;
}

interface JourneyEdge {
  id?: string;
  from: string;
  to: string;
  type?: 'yes' | 'no' | 'default' | 'branch' | 'success' | 'timeout';
  branchId?: string;
  condition?: string;
}

interface FlowDefinition {
  nodes: JourneyNode[];
  edges: JourneyEdge[];
  start_step_id?: string;
}

interface JourneyState {
  id: string;
  journey_id: string;
  subscriber_id: string;
  current_step_id: string | null;
  status: 'active' | 'completed' | 'exited' | 'waiting' | 'failed' | null;
  context: any;
  node_history: string[];
  entered_at: string | null;
  next_execution_at: string | null;
  last_processed_at?: string | null;
  completed_at?: string | null;
}

interface ProcessingResult {
  processed: number;
  failed: number;
  skipped: number;
  total: number;
  errors?: string[];
}

interface EventProperties {
  url?: string;
  path?: string;
  percentage?: number;
  time_on_page_seconds?: number;
  seconds?: number;
  is_external?: boolean;
  device?: string;
  items?: Array<{
    id?: string;
    product_id?: string;
    category?: string;
    [key: string]: any;
  }>;
  total_value?: number;
  [key: string]: any;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function parseFlowDefinition(data: any): FlowDefinition {
  if (!data || typeof data !== 'object') {
    console.warn('[Processor] Invalid flow definition, returning empty flow');
    return { nodes: [], edges: [] };
  }
  return {
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
    edges: Array.isArray(data.edges) ? data.edges : [],
    start_step_id: data.start_step_id,
  };
}

function toJourneyState(dbRow: any): JourneyState {
  return {
    id: dbRow.id,
    journey_id: dbRow.journey_id,
    subscriber_id: dbRow.subscriber_id,
    current_step_id: dbRow.current_step_id,
    status: dbRow.status || 'active',
    context: dbRow.context || {},
    node_history: Array.isArray(dbRow.node_history) ? dbRow.node_history : [],
    entered_at: dbRow.entered_at,
    next_execution_at: dbRow.next_execution_at,
    last_processed_at: dbRow.last_processed_at,
    completed_at: dbRow.completed_at,
  };
}

function getNextNodeId(flowDefinition: FlowDefinition, currentNodeId: string, condition?: string): string | null {
  if (condition) {
    const conditionalEdge = flowDefinition.edges.find(
      e => e.from === currentNodeId && (e.type === condition || e.condition === condition)
    );
    if (conditionalEdge) return conditionalEdge.to;
  }

  const defaultEdge = flowDefinition.edges.find(
    e => e.from === currentNodeId && (!e.type || e.type === 'default')
  );

  return defaultEdge ? defaultEdge.to : null;
}

async function logExecution(
  journeyId: string,
  stateId: string | null,
  eventType: string,
  message: string,
  metadata: any = {}
) {
  try {
    await supabase.from('journey_execution_logs').insert({
      journey_id: journeyId,
      user_journey_state_id: stateId,
      event_type: eventType,
      message,
      metadata,
    });
  } catch (error) {
    console.error('[Logging] Failed to log execution:', error);
  }
}

async function logJourneyEvent(
  journeyId: string,
  subscriberId: string,
  stateId: string,
  eventType: string,
  metadata?: any,
  stepId?: string
) {
  try {
    await supabase.from('journey_events').insert({
      journey_id: journeyId,
      subscriber_id: subscriberId,
      user_journey_state_id: stateId,
      event_type: eventType,
      step_id: stepId || null,
      metadata: metadata || {},
    });
  } catch (error: any) {
    console.error('[Processor] Failed to log event:', error.message);
  }
}

function getEventProperties(properties: any): EventProperties {
  if (!properties || typeof properties !== 'object') {
    return {};
  }
  return properties as EventProperties;
}

// ============================================================================
// ADVANCED TRIGGER EVALUATION
// ============================================================================

async function checkAdvancedTrigger(subscriberId: string, trigger: any): Promise<boolean> {
  console.log('[Processor] ✓ Checking advanced trigger:', trigger.type);

  try {
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', subscriberId)
      .single();

    if (!subscriber) {
      console.log('[Processor] ✗ Subscriber not found');
      return false;
    }

    switch (trigger.type) {
      case 'page_landing':
      case 'page_landed': {
        const urlPattern = trigger.event_config?.url_pattern ||
          trigger.url_pattern ||
          trigger.url;
        if (!urlPattern) {
          console.log('[Processor] ✗ Page landing: no URL pattern specified');
          return false;
        }

        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .eq('event_name', 'page_landed')
          .order('created_at', { ascending: false })
          .limit(3);

        if (!events || events.length === 0) {
          console.log('[Processor] ✗ No page_landed events found');
          return false;
        }

        const hasLanded = events.some(e => {
          const props = getEventProperties(e.properties);
          const eventUrl = props.url || props.path || '';

          if (urlPattern.includes('*')) {
            const escapedPattern = urlPattern
              .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
              .replace(/\*/g, '.*');
            const regex = new RegExp('^' + escapedPattern + '$', 'i');
            return regex.test(eventUrl);
          }

          return eventUrl.toLowerCase().includes(urlPattern.toLowerCase());
        });

        console.log('[Processor]', hasLanded ? '✓' : '✗', 'Page landing check:', { urlPattern, hasLanded });
        return hasLanded;
      }

      case 'scroll_depth': {
        const requiredPercentage = trigger.event_config?.percentage ||
          trigger.percentage ||
          0;

        if (requiredPercentage <= 0 || requiredPercentage > 100) {
          console.log('[Processor] ✗ Invalid scroll depth percentage:', requiredPercentage);
          return false;
        }

        const pagePattern = trigger.event_config?.page_pattern || trigger.page_pattern;

        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .eq('event_name', 'scroll_depth')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!events || events.length === 0) {
          console.log('[Processor] ✗ No scroll_depth events found');
          return false;
        }

        const hasReached = events.some(e => {
          const props = getEventProperties(e.properties);
          const percentage = props.percentage || 0;
          const eventPath = props.path || props.url || '';

          if (pagePattern) {
            if (pagePattern.includes('*')) {
              const escapedPattern = pagePattern
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '.*');
              const regex = new RegExp('^' + escapedPattern + '$', 'i');
              const pathMatches = regex.test(eventPath);

              if (!pathMatches) {
                return false;
              }
            } else {
              const pathMatches = eventPath.toLowerCase().includes(pagePattern.toLowerCase());
              if (!pathMatches) {
                return false;
              }
            }
          }
          return percentage >= requiredPercentage;
        });

        console.log('[Processor]', hasReached ? '✓' : '✗', 'Scroll depth check:', { requiredPercentage, pagePattern, hasReached });
        return hasReached;
      }

      case 'page_abandonment': {
        const minTime = trigger.event_config?.min_time_seconds ||
          trigger.min_time_value ||
          trigger.min_time_seconds ||
          trigger.minimum_time ||
          trigger.time_value ||
          trigger.min_time ||
          5;

        console.log('[Processor] Page abandonment check - min time:', minTime, 'seconds');

        // 🔥 FIX: Validate range but don't reject completely
        const validatedMinTime = Math.max(1, Math.min(minTime, 3600)); // Clamp between 1s and 1hr



        if (minTime !== validatedMinTime) {
          console.log(`[Processor] Adjusted min time from ${minTime}s to ${validatedMinTime}s`);
        }
        // if (minTime <= 0 || minTime > 3600) {
        //   console.log('[Processor] ✗ Page abandonment: invalid time value:', minTime);
        //   return false;
        // }
        const pagePattern = trigger.event_config?.page_pattern || trigger.page_pattern;

        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .eq('event_name', 'page_abandoned')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!events || events.length === 0) {
          console.log('[Processor]  No page_abandoned events found');
          return false;
        }

        const hasAbandoned = events.some((e, index) => {
          const props = getEventProperties(e.properties);
          const timeOnPage = props.time_on_page_seconds || props.time_on_page || props.seconds || 0;
          const eventPath = props.path || props.url || '';
          console.log(`[Processor]  Event ${index + 1}: path="${eventPath}", time=${timeOnPage}s`);

          // if (pagePattern) {
          //   if (pagePattern.includes('*')) {
          //     const escapedPattern = pagePattern
          //       .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          //       .replace(/\*/g, '.*');
          //     const regex = new RegExp('^' + escapedPattern + '$', 'i');
          //     const pathMatches = regex.test(eventPath);


          if (pagePattern) {
            let pathMatches = false;

            if (pagePattern.includes('*')) {
              // Wildcard matching
              const escapedPattern = pagePattern
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '.*');
              const regex = new RegExp('^' + escapedPattern + '$', 'i');
              pathMatches = regex.test(eventPath);
            } else {
              // Simple contains matching
              pathMatches = eventPath.toLowerCase().includes(pagePattern.toLowerCase());
            }

            if (!pathMatches) {
              console.log(`[Processor]   ✗ Path mismatch (pattern: "${pagePattern}")`);

              return false;
            }
            console.log(`[Processor]   ✓ Path matches pattern`);
          }

          const meetsTime = timeOnPage >= validatedMinTime;
          console.log(`[Processor]   ${meetsTime ? '✓' : '✗'} Time check: ${timeOnPage}s >= ${validatedMinTime}s`);

          return meetsTime;
        });

        console.log('[Processor]', hasAbandoned ? '✅' : '❌', 'Page abandonment final result:', {
          minTime: validatedMinTime,
          pagePattern: pagePattern || 'any',
          hasAbandoned
        });

        return hasAbandoned;
      }

      //       } else {
      //         const pathMatches = eventPath.toLowerCase().includes(pagePattern.toLowerCase());
      //         if (!pathMatches) {
      //           return false;
      //         }
      //       }
      //     }
      //       return timeOnPage >= minTime;
      //   });

      //     console.log('[Processor]', hasAbandoned ? '✓' : '✗', 'Page abandonment check:', { minTime, hasAbandoned });
      //     return hasAbandoned;
      // }

      case 'time_on_page': {
        const threshold = trigger.event_config?.threshold_seconds ||
          trigger.threshold_value ||
          trigger.threshold_seconds ||
          trigger.minimum_time ||
          trigger.min_time_seconds ||
          trigger.time_threshold ||
          trigger.duration ||
          trigger.seconds ||
          0;

        if (threshold <= 0 || threshold > 3600) {
          console.log('[Processor] ✗ Time on page: invalid threshold:', threshold);
          return false;
        }
        const pagePattern = trigger.event_config?.page_pattern || trigger.page_pattern;

        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .eq('event_name', 'time_on_page')
          .order('created_at', { ascending: false })
          .limit(3);

        if (!events || events.length === 0) {
          console.log('[Processor] ✗ No time_on_page events found');
          return false;
        }

        const hasReached = events.some(e => {
          const props = getEventProperties(e.properties);
          const seconds = props.seconds || props.duration || props.time_seconds || 0;
          const eventPath = props.path || props.url || '';

          if (pagePattern) {
            if (pagePattern.includes('*')) {
              const escapedPattern = pagePattern
                .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                .replace(/\*/g, '.*');
              const regex = new RegExp('^' + escapedPattern + '$', 'i');
              const pathMatches = regex.test(eventPath);

              if (!pathMatches) {
                return false;
              }
            } else {
              const pathMatches = eventPath.toLowerCase().includes(pagePattern.toLowerCase());
              if (!pathMatches) {
                return false;
              }
            }
          }
          return seconds >= threshold;
        });

        console.log('[Processor]', hasReached ? '✓' : '✗', 'Time on page check:', { threshold, pagePattern, hasReached });
        return hasReached;
      }

      case 'link_interaction': {
        const targetUrl = trigger.url || trigger.link_url || trigger.target_url || trigger.href;

        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .eq('event_name', 'link_clicked')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!events || events.length === 0) {
          console.log('[Processor] ✗ No link_clicked events found');
          return false;
        }

        if (targetUrl) {
          const matches = events.some(e => {
            const eventProps = getEventProperties(e.properties);
            const clickedUrl = (eventProps.url || eventProps.href || eventProps.link || '').toLowerCase();
            return clickedUrl.includes(targetUrl.toLowerCase());
          });

          console.log('[Processor]', matches ? '✓' : '✗', 'Link interaction check:', { targetUrl, matches });
          return matches;
        }

        console.log('[Processor] ✓ Link interaction check: any link clicked');
        return true;
      }

      case 'cart_abandoned': {
        const delayValue = trigger.delay_value || trigger.delay_minutes || trigger.delay || 30;
        const delayUnit = trigger.delay_unit || 'minutes';

        if (delayValue <= 0) {
          console.log('[Processor] ✗ Cart abandoned: invalid delay value');
          return false;
        }

        let delayMs;
        switch (delayUnit) {
          case 'minutes':
            delayMs = delayValue * 60 * 1000;
            break;
          case 'hours':
            delayMs = delayValue * 60 * 60 * 1000;
            break;
          case 'days':
            delayMs = delayValue * 24 * 60 * 60 * 1000;
            break;
          default:
            delayMs = delayValue * 60 * 1000;
        }

        if (delayMs > 30 * 24 * 60 * 60 * 1000) {
          console.log('[Processor] ✗ Cart abandoned: delay too long (max 30 days)');
          return false;
        }

        const cutoffTime = new Date(Date.now() - delayMs).toISOString();

        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .eq('event_name', 'cart_abandoned')
          .lte('created_at', cutoffTime)
          .order('created_at', { ascending: false })
          .limit(1);

        if (!events || events.length === 0) {
          console.log('[Processor] ✗ No cart_abandoned events found before cutoff');
          return false;
        }

        const { data: purchases } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .in('event_name', ['product_purchased', 'checkout_completed', 'order_completed'])
          .gte('created_at', events[0].created_at)
          .limit(1);

        const hasAbandonedCart = !purchases || purchases.length === 0;

        console.log('[Processor]', hasAbandonedCart ? '✓' : '✗', 'Cart abandoned check:', { delayValue, delayUnit, hasAbandonedCart });
        return hasAbandonedCart;
      }

      // case 'product_purchased': {
      //   const productId = trigger.product_id;
      //   const productIds = trigger.product_ids || (productId ? [productId] : []);
      //   const category = trigger.category;
      //   const categories = trigger.categories || (category ? [category] : []);
      //   const sku = trigger.sku;

      //   const { data: events } = await supabase
      //     .from('subscriber_events')
      //     .select('*')
      //     .eq('subscriber_id', subscriberId)
      //     .eq('event_name', 'product_purchased')
      //     .order('created_at', { ascending: false })
      //     .limit(10);

      //   if (!events || events.length === 0) {
      //     console.log('[Processor] ✗ No product_purchased events found');
      //     return false;
      //   }

      //   if (productIds.length > 0) {
      //     const hasPurchased = events.some(e => {
      //       const props = getEventProperties(e.properties);
      //       const items = props.items || [];
      //       return items.some((item: any) =>
      //         productIds.includes(item.id) ||
      //         productIds.includes(item.product_id) ||
      //         productIds.includes(item.sku)
      //       );
      //     });

      //     console.log('[Processor]', hasPurchased ? '✓' : '✗', 'Product purchased check (by ID):', { productIds, hasPurchased });
      //     return hasPurchased;
      //   }

      //   if (sku) {
      //     const hasPurchased = events.some(e => {
      //       const props = getEventProperties(e.properties);
      //       const items = props.items || [];
      //       return items.some((item: any) => item.sku === sku);
      //     });

      //     console.log('[Processor]', hasPurchased ? '✓' : '✗', 'Product purchased check (by SKU):', { sku, hasPurchased });
      //     return hasPurchased;
      //   }

      //   if (categories.length > 0) {
      //     const lowerCategories = categories.map((c: string) => c.toLowerCase());
      //     const hasPurchased = events.some(e => {
      //       const props = getEventProperties(e.properties);
      //       const items = props.items || [];
      //       return items.some((item: any) =>
      //         lowerCategories.includes((item.category || '').toLowerCase())
      //       );
      //     });

      //     console.log('[Processor]', hasPurchased ? '✓' : '✗', 'Product purchased check (by category):', { categories, hasPurchased });
      //     return hasPurchased;
      //   }

      //   console.log('[Processor] ✓ Product purchased check: any product');
      //   return true;
      // }

      case 'device_filter': {
        const allowedDevices = trigger.devices || [];
        if (allowedDevices.length === 0) {
          console.log('[Processor] Device filter: no restrictions');
          return true;
        }

        const normalizedAllowedDevices = allowedDevices.map((d: string) => d.toLowerCase());
        let device = 'desktop';
        let platform = 'unknown';
        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (events && events.length > 0) {
          for (const event of events) {
            const props = getEventProperties(event.properties);
            const eventDevice = (props.device || props.device_type || '').toLowerCase();
            const eventPlatform = (props.platform || '').toLowerCase();

            if (eventDevice && ['mobile', 'tablet', 'desktop'].includes(eventDevice)) {
              device = eventDevice;
              // console.log('[Processor] ✓ Device from recent event:', device);
              // break;
              platform = eventPlatform;
              console.log('[Processor]  Device from event:', device, '| Platform:', platform);
              break;
            }
          }
        }

        // Fallback to custom attributes
        if (device === 'desktop' && platform === 'unknown') {
          const customAttrs = subscriber.custom_attributes as any;
          if (customAttrs?.device) {
            device = customAttrs.device.toLowerCase();
          }
          if (customAttrs?.platform) {
            platform = customAttrs.platform.toLowerCase();
          }
        }

        // if (device === 'desktop') {
        //   const customAttrs = subscriber.custom_attributes as any;
        //   if (customAttrs?.device) {
        //     device = customAttrs.device.toLowerCase();
        //     console.log('[Processor] ✓ Device from custom attributes:', device);
        //   }
        // }

        // if (device === 'desktop' && subscriber.user_agent) {
        //   const ua = subscriber.user_agent.toLowerCase();
        //   if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
        //     device = 'mobile';
        //   } else if (ua.includes('tablet') || ua.includes('ipad')) {
        //     device = 'tablet';
        //   }
        //   console.log('[Processor] ✓ Device from user agent:', device);
        // }


        if (device === 'desktop' && subscriber.user_agent) {
          const ua = subscriber.user_agent.toLowerCase();
          if (ua.includes('iphone') || ua.includes('ipod')) {
            device = 'mobile';
            platform = 'ios';
          } else if (ua.includes('ipad')) {
            device = 'tablet';
            platform = 'ios';
          } else if (ua.includes('android')) {
            if (ua.includes('mobile')) {
              device = 'mobile';
              platform = 'android';
            } else {
              device = 'tablet';
              platform = 'android';
            }
          } else if (ua.includes('mobile')) {
            device = 'mobile';
          } else if (ua.includes('tablet')) {
            device = 'tablet';
          }
          console.log('[Processor]  Device from user agent:', device, '| Platform:', platform);
        }
        const deviceMatches = normalizedAllowedDevices.includes(device);
        const platformMatches = normalizedAllowedDevices.includes(platform);

        const matches = deviceMatches || platformMatches;
        // const matches = normalizedAllowedDevices.includes(device);
        console.log('[Processor]', matches ? '' : '', 'Device filter check:', {
          allowedDevices: normalizedAllowedDevices,
          subscriberDevice: device,
          matches
        });
        return matches;
      }

      case 'geography_filter': {
        const allowedCountries = trigger.countries || [];
        const allowedRegions = trigger.regions || [];
        const allowedCities = trigger.cities || [];

        if (allowedCountries.length === 0 && allowedRegions.length === 0 && allowedCities.length === 0) {
          console.log('[Processor] ✓ Geography filter: no restrictions');
          return true;
        }

        const subscriberData = subscriber as any;
        const country = (subscriber.country || '').toLowerCase();
        const countryCode = (subscriberData.country_code || '').toLowerCase();
        const region = (subscriberData.region || subscriberData.state || '').toLowerCase();
        const city = (subscriber.city || '').toLowerCase();

        const normalizedCountries = allowedCountries.map((c: string) => c.toLowerCase());
        const normalizedRegions = allowedRegions.map((r: string) => r.toLowerCase());
        const normalizedCities = allowedCities.map((c: string) => c.toLowerCase());

        let countryMatch = allowedCountries.length === 0;
        if (!countryMatch) {
          countryMatch = normalizedCountries.includes(country) || normalizedCountries.includes(countryCode);
        }

        let regionMatch = allowedRegions.length === 0;
        if (!regionMatch) {
          regionMatch = normalizedRegions.includes(region);
        }

        let cityMatch = allowedCities.length === 0;
        if (!cityMatch) {
          cityMatch = normalizedCities.includes(city);
        }

        const matches = countryMatch && regionMatch && cityMatch;
        console.log('[Processor]', matches ? '✓' : '✗', 'Geography filter check:', { countryMatch, regionMatch, cityMatch, finalMatch: matches });
        return matches;
      }

      default:
        console.log('[Processor] ✗ Unknown trigger type:', trigger.type);
        return false;
    }
  } catch (error: any) {
    console.error('[Processor] ✗ Advanced trigger check failed:', error.message);
    return false;
  }
}

// ============================================================================
// CORE PROCESSING FUNCTIONS
// ============================================================================

export async function processDueSteps(): Promise<ProcessingResult> {
  console.log('[Processor] Starting scheduled step processing...');
  const startTime = Date.now();

  try {
    const now = new Date().toISOString();

    const { data: dueSteps, error } = await supabase
      .from('scheduled_journey_steps')
      .select('*')
      .eq('status', 'pending')
      .lte('execute_at', now)
      .order('execute_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[Processor] ✗ Error fetching due steps:', error);
      throw error;
    }

    if (!dueSteps || dueSteps.length === 0) {
      console.log('[Processor] ✓ No due steps found');
      return { processed: 0, failed: 0, skipped: 0, total: 0 };
    }

    console.log(`[Processor] ℹ Found ${dueSteps.length} due steps to process`);

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const step of dueSteps) {
      try {
        const stepPayload = step.payload as Record<string, any> | null;
        console.log(`\n[Processor] Processing step ${step.id} (type: ${stepPayload?.step_type || 'unknown'})`);

        if (stepPayload?.step_type === 'wait_duration') {
          console.log('[Processor] ⏭️ Skipping wait_duration step - handled by worker');
          skipped++;
          continue;
        }

        await supabase
          .from('scheduled_journey_steps')
          .update({
            status: 'processing',
            started_at: new Date().toISOString(),
          })
          .eq('id', step.id);

        const { data: stateData, error: stateError } = await supabase
          .from('user_journey_states')
          .select('*')
          .eq('id', step.user_journey_state_id)
          .single();

        if (stateError || !stateData) {
          console.warn(`[Processor] ⚠ Journey state ${step.user_journey_state_id} not found, cancelling step`);
          await supabase
            .from('scheduled_journey_steps')
            .update({
              status: 'cancelled',
              error: 'Journey state not found',
              completed_at: new Date().toISOString(),
            })
            .eq('id', step.id);
          skipped++;
          continue;
        }

        const state = toJourneyState(stateData);

        if (stepPayload?.step_type?.includes('wait')) {
          console.log('[Processor] ✓ Wait step completed, advancing journey...');

          const { data: journey } = await supabase
            .from('journeys')
            .select('flow_definition')
            .eq('id', state.journey_id)
            .single();

          if (journey) {
            const flowDefinition = parseFlowDefinition(journey.flow_definition);
            const currentNode = flowDefinition.nodes.find(n => n.id === state.current_step_id);

            if (currentNode) {
              const nextNodeId = getNextNodeId(flowDefinition, currentNode.id);

              if (nextNodeId) {
                console.log(`[Processor] Moving from wait node ${currentNode.id} to ${nextNodeId}`);

                await supabase
                  .from('user_journey_states')
                  .update({
                    current_step_id: nextNodeId,
                    status: 'active',
                    next_execution_at: null,
                    last_processed_at: new Date().toISOString(),
                  })
                  .eq('id', state.id);

                await supabase
                  .from('scheduled_journey_steps')
                  .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', step.id);

                await logJourneyEvent(
                  state.journey_id,
                  state.subscriber_id,
                  state.id,
                  'wait_completed',
                  {
                    wait_node_id: currentNode.id,
                    next_node_id: nextNodeId
                  },
                  currentNode.id
                );

                console.log(`[Processor] Processing next node: ${nextNodeId}`);
                await processJourneyStep(state.id);

                processed++;
                console.log(`[Processor] ✓ Wait step ${step.id} completed successfully`);
                continue;
              } else {
                console.log('[Processor] No next node after wait, completing journey');
                await completeJourney(state.id);

                await supabase
                  .from('scheduled_journey_steps')
                  .update({
                    status: 'completed',
                    completed_at: new Date().toISOString(),
                  })
                  .eq('id', step.id);

                processed++;
                continue;
              }
            }
          }
        }

        await processJourneyStep(step.user_journey_state_id);

        await supabase
          .from('scheduled_journey_steps')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id);

        processed++;
        console.log(`[Processor] ✓ Step ${step.id} completed successfully`);

      } catch (stepError: any) {
        console.error(`[Processor] ✗ Step ${step.id} failed:`, stepError.message);

        await supabase
          .from('scheduled_journey_steps')
          .update({
            status: 'failed',
            error: stepError.message,
            completed_at: new Date().toISOString(),
          })
          .eq('id', step.id);

        failed++;
        errors.push(`Step ${step.id}: ${stepError.message}`);
      }
    }

    const duration = Date.now() - startTime;
    const total = processed + failed + skipped;

    console.log(`\n[Processor] ✓ Completed in ${duration}ms`);
    console.log(`    Processed: ${processed}`);
    console.log(`    Failed: ${failed}`);
    console.log(`    Skipped: ${skipped}`);
    console.log(`    Total: ${total}`);

    return { processed, failed, skipped, total, errors: errors.length > 0 ? errors : undefined };

  } catch (error: any) {
    console.error('[Processor] ✗ Fatal error in processDueSteps:', error.message);
    throw error;
  }
}

export async function enrollSubscriber(
  journeyId: string,
  subscriberId: string,
  initialContext: any = {}
): Promise<any> {
  console.log('[Processor] Enrolling subscriber:', { journeyId, subscriberId });

  try {
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', journeyId)
      .single();

    if (journeyError || !journey) {
      throw new Error('Journey not found');
    }

    if (journey.status !== 'active') {
      throw new Error(`Journey is not active (status: ${journey.status})`);
    }

    // 🔥 NEW: Log current active journeys for debugging
    const { data: activeJourneys } = await supabase
      .from('user_journey_states')
      .select('journey_id, status')
      .eq('subscriber_id', subscriberId)
      .in('status', ['active', 'waiting']);

    if (activeJourneys && activeJourneys.length > 0) {
      console.log(`[Processor]   Subscriber has ${activeJourneys.length} other active journey(s)`);
    }

    const entryTrigger = (journey.entry_trigger as any) || {};
    console.log('[Processor]  Entry trigger:', JSON.stringify(entryTrigger, null, 2));

    if (entryTrigger.type && entryTrigger.type !== 'event' && entryTrigger.type !== 'manual') {
      console.log('[Processor] Checking advanced trigger criteria...');

      const triggerMet = await checkAdvancedTrigger(subscriberId, entryTrigger);

      if (!triggerMet) {
        console.log('[Processor] ✗ Advanced trigger criteria not met');
        throw new Error('Subscriber does not meet entry trigger criteria');
      }

      console.log('[Processor] ✓ Advanced trigger criteria met');
    }

    const flowDefinition = parseFlowDefinition(journey.flow_definition);

    if (!flowDefinition.nodes || flowDefinition.nodes.length === 0) {
      throw new Error('Journey has no steps defined');
    }

    const entryNode = flowDefinition.nodes.find(n => n.type === 'entry');
    const startNode = entryNode || flowDefinition.nodes[0];

    console.log(`[Processor] Starting at node: ${startNode.id} (type: ${startNode.type})`);

    const canEnter = await checkReEntryRules(subscriberId, journey);
    if (!canEnter) {
      console.log('[Processor] ✗ Re-entry rules prevent enrollment');
      throw new Error('Subscriber cannot re-enter this journey at this time');
    }

    const { data: journeyState, error: stateError } = await supabase
      .from('user_journey_states')
      .insert({
        journey_id: journeyId,
        subscriber_id: subscriberId,
        current_step_id: startNode.id,
        status: 'active',
        context: {
          ...initialContext,
          entry_timestamp: new Date().toISOString(),
        },
        node_history: [startNode.id],
        entered_at: new Date().toISOString(),
        last_processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (stateError) {
      if (stateError.code === '23505') {
        console.log('[Processor] ⚠ Already enrolled (duplicate prevented by database)');
        throw new Error('Subscriber already enrolled in this journey');
      }

      if (stateError.code === '23514') {
        console.error('[Processor] ✗ Invalid status value');
        throw new Error('Invalid journey state status');
      }

      console.error('[Processor] ✗ Failed to create journey state:', stateError);
      throw stateError;
    }

    console.log('[Processor] ✅ Journey state created:', journeyState.id);

    await logJourneyEvent(
      journeyId,
      subscriberId,
      journeyState.id,
      'journey_entered',
      { context: initialContext }
    );

    await recalculateJourneyMetrics(journeyId);

    if (startNode.type === 'entry') {
      const nextNodeId = getNextNodeId(flowDefinition, startNode.id);
      if (nextNodeId) {
        await supabase
          .from('user_journey_states')
          .update({ current_step_id: nextNodeId })
          .eq('id', journeyState.id);
      }
    }

    await processJourneyStep(journeyState.id);

    console.log('[Processor] ✓ Subscriber enrolled successfully');
    return journeyState;

  } catch (error: any) {
    console.error('[Processor] ✗ Enrollment error:', error.message);
    throw error;
  }
}

async function checkReEntryRules(subscriberId: string, journey: any): Promise<boolean> {
  const reEntrySettings = (journey.re_entry_settings as any) || {};
  const allowReEntry = reEntrySettings.allow_re_entry || false;

  const { data: states, error } = await supabase
    .from('user_journey_states')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .eq('journey_id', journey.id)
    .order('entered_at', { ascending: false });

  if (error) {
    console.error('[Processor] ✗ Error checking re-entry rules:', error);
    throw error;
  }

  if (!states || states.length === 0) {
    return true;
  }

  // 🔥 CRITICAL FIX: Check for ACTIVE or WAITING states
  const activeOrWaitingState = states.find(
    s => s.status === 'active' || s.status === 'waiting'
  );

  if (activeOrWaitingState) {
    console.log(`[Processor] ⚠️  Already in journey ${journey.name} (status: ${activeOrWaitingState.status})`);

    console.log('[Processor]  Already in journey (status:', activeOrWaitingState.status + ')');
    return false;
  }

  const completedStates = states.filter(
    s => s.status === 'completed' || s.status === 'exited'
  );

  if (completedStates.length === 0) {
    return true;
  }

  if (!allowReEntry) {
    console.log('[Processor] ✗ Re-entry not allowed');
    return false;
  }

  const maxEntries = reEntrySettings.max_entries || 0;
  if (maxEntries > 0 && states.length >= maxEntries) {
    console.log(`[Processor] ✗ Max entries (${maxEntries}) reached`);
    return false;
  }

  const cooldownDays = reEntrySettings.cooldown_days || 0;
  if (cooldownDays > 0 && states.length > 0 && states[0].entered_at) {
    const lastEntry = new Date(states[0].entered_at);
    const daysSince = (Date.now() - lastEntry.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince < cooldownDays) {
      console.log(
        `[Processor] ✗ Cooldown period (${cooldownDays} days) not met. ${daysSince.toFixed(1)} days since last entry`
      );
      return false;
    }
  }

  console.log('[Processor] ✓ Re-entry allowed');
  return true;
}

async function processExitNode(
  state: JourneyState,
  node: JourneyNode,
  flowDefinition: FlowDefinition
): Promise<void> {
  console.log('[Processor] Processing exit node');

  const exitType = node.data.exit_type || 'goal_achieved';
  const sendNotification = node.data.send_notification || false;

  if (sendNotification && node.data.notification) {
    try {
      const { data: subscriber } = await supabase
        .from('subscribers')
        .select('*')
        .eq('id', state.subscriber_id)
        .single();

      if (subscriber && subscriber.endpoint) {
        const notificationPayload = {
          title: node.data.notification.title || 'Journey Complete',
          body: node.data.notification.body || '',
          url: node.data.notification.url || '/',
          icon: node.data.notification.icon_url,
        };

        await sendNotificationToSubscriber(subscriber, notificationPayload);
        console.log('[Processor] ✓ Exit notification sent');
      }
    } catch (error: any) {
      console.error('[Processor] ✗ Failed to send exit notification:', error);
    }
  }

  switch (exitType) {
    case 'goal_achieved':
      await exitJourney(state.id, 'goal_achieved');
      break;

    case 'exit_journey':
      await exitJourney(state.id, 'manual_exit');
      break;

    case 'unsubscribe':
      await supabase
        .from('subscribers')
        .update({ status: 'inactive' })
        .eq('id', state.subscriber_id);

      await exitJourney(state.id, 'unsubscribed');
      break;

    default:
      await exitJourney(state.id, 'reached_exit_node');
  }
}

export async function processJourneyStep(journeyStateId: string): Promise<void> {
  console.log('\n[Processor] Processing journey step:', journeyStateId);

  try {
    const { data: stateData, error: stateError } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('id', journeyStateId)
      .single();

    if (stateError || !stateData) {
      throw new Error('Journey state not found');
    }

    const state = toJourneyState(stateData);

    if (state.status !== 'active' && state.status !== 'waiting') {
      console.log(`[Processor] Journey state is ${state.status}, cannot process`);
      return;
    }

    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', state.journey_id)
      .single();

    if (journeyError || !journey) {
      throw new Error('Journey not found');
    }

    const flowDefinition = parseFlowDefinition(journey.flow_definition);
    const currentNode = flowDefinition.nodes.find(n => n.id === state.current_step_id);

    if (!currentNode) {
      console.log('[Processor] Current step not found in flow, completing journey');
      await completeJourney(journeyStateId);
      return;
    }

    console.log(`[Processor] Current node: ${currentNode.id} (type: ${currentNode.type})`);

    const nodeHistory = Array.isArray(state.node_history) ? state.node_history : [];
    if (!nodeHistory.includes(currentNode.id)) {
      nodeHistory.push(currentNode.id);
      await supabase
        .from('user_journey_states')
        .update({
          node_history: nodeHistory,
          last_processed_at: new Date().toISOString(),
        })
        .eq('id', journeyStateId);
    }

    switch (currentNode.type) {
      case 'send_notification':
        await processSendNotification(state, currentNode, flowDefinition);
        break;
      case 'wait':
        await processWaitNode(state, currentNode, flowDefinition);
        break;
      case 'condition':
        await processConditionNode(state, currentNode, flowDefinition);
        break;
      case 'ab_split':
        await processAbSplitNode(state, currentNode, flowDefinition);
        break;
      case 'exit':
        await processExitNode(state, currentNode, flowDefinition);
        break;
      case 'entry':
        await moveToNextNode(state, flowDefinition, currentNode.id);
        break;
      case 'update_contact':
        await processUpdateContactNode(state, currentNode, flowDefinition);
        break;
      default:
        console.warn(`[Processor] Unknown node type: ${currentNode.type}, moving to next`);
        await moveToNextNode(state, flowDefinition, currentNode.id);
    }

  } catch (error: any) {
    console.error('[Processor] ✗ Step processing error:', error.message);

    const { data: stateData } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('id', journeyStateId)
      .single();

    if (stateData) {
      const state = toJourneyState(stateData);
      await logJourneyEvent(
        state.journey_id,
        state.subscriber_id,
        journeyStateId,
        'step_error',
        { error: error.message },
        state.current_step_id || undefined
      );
    }

    throw error;
  }
}

// ============================================================================
// NODE PROCESSORS
// ============================================================================

// async function processSendNotification(
//   state: JourneyState,
//   node: JourneyNode,
//   flowDefinition: FlowDefinition
// ): Promise<void> {
//   console.log('[Processor] Sending notification');

//   await logExecution(
//     state.journey_id,
//     state.id,
//     'notification_sending',
//     `Sending notification: ${node.data.title}`,
//     { title: node.data.title, body: node.data.body, url: node.data.url }
//   );

//   try {
//     const { data: subscriber, error: subError } = await supabase
//       .from('subscribers')
//       .select('*')
//       .eq('id', state.subscriber_id)
//       .single();

//     if (subError || !subscriber) {
//       throw new Error('Subscriber not found');
//     }

//     // 🔥 FIX: Check if subscription is missing or expired
//     if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
//       console.log('[Processor] ⚠ No valid push subscription');

//       await supabase.from('notification_logs').insert({
//         website_id: subscriber.website_id,
//         subscriber_id: subscriber.id,
//         journey_id: state.journey_id,
//         journey_step_id: node.id,
//         user_journey_state_id: state.id,
//         status: 'failed',
//         platform: 'web',
//         sent_at: new Date().toISOString(),
//         error_message: 'No valid push subscription - user needs to re-subscribe',
//       });

//       await logJourneyEvent(
//         state.journey_id,
//         state.subscriber_id,
//         state.id,
//         'notification_skipped',
//         { reason: 'No push subscription' },
//         node.id
//       );

//       // 🔥 CRITICAL: Move to next node anyway (don't block journey)
//       await moveToNextNode(state, flowDefinition, node.id);
//       return;
//     }

//     const { data: website } = await supabase
//       .from('websites')
//       .select('*')
//       .eq('id', subscriber.website_id)
//       .single();

//     if (!website) {
//       throw new Error('Website not found');
//     }

//     const branding = website.notification_branding as any || {};

//     const { data: notificationLog, error: logError } = await supabase
//       .from('notification_logs')
//       .insert({
//         website_id: subscriber.website_id,
//         subscriber_id: subscriber.id,
//         journey_id: state.journey_id,
//         journey_step_id: node.id,
//         user_journey_state_id: state.id,
//         status: 'sent',
//         platform: 'web',
//         sent_at: new Date().toISOString(),
//       })
//       .select()
//       .single();

//     if (logError || !notificationLog) {
//       throw new Error('Failed to create notification log');
//     }

//     const notificationPayload = {
//       title: node.data.title || 'Notification',
//       body: node.data.body || '',
//       icon: branding?.logo_url || node.data.icon_url || '/icon-192x192.png',
//       badge: '/badge-96x96.png',
//       image: node.data.image_url || undefined,
//       url: node.data.url || node.data.click_url || '/',
//       tag: notificationLog.id,
//       requireInteraction: false,
//       branding: {
//         primary_color: branding?.primary_color || '#667eea',
//         secondary_color: branding?.secondary_color || '#764ba2',
//         logo_url: branding?.logo_url,
//         font_family: branding?.font_family || 'Inter',
//         button_style: branding?.button_style || 'rounded',
//         notification_position: branding?.notification_position || 'top-right',
//         animation_style: branding?.animation_style || 'slide',
//         show_logo: branding?.show_logo ?? true,
//         show_branding: branding?.show_branding ?? true,
//       },
//     };

//     console.log('[Processor] Sending notification...');

//     const result = await sendNotificationToSubscriber(subscriber, notificationPayload);

//     if (result.success) {
//       console.log('[Processor] ✓ Notification sent successfully!');

//       await supabase
//         .from('notification_logs')
//         .update({
//           status: 'delivered',
//           delivered_at: new Date().toISOString(),
//         })
//         .eq('id', notificationLog.id);

//       await logJourneyEvent(
//         state.journey_id,
//         state.subscriber_id,
//         state.id,
//         'notification_sent',
//         {
//           title: notificationPayload.title,
//           notification_id: notificationLog.id,
//         },
//         node.id
//       );
//     } else {
//       console.error('[Processor] ✗ Notification failed:', result.error);

//       await supabase
//         .from('notification_logs')
//         .update({
//           status: 'failed',
//           error_message: result.error,
//         })
//         .eq('id', notificationLog.id);

//       await logJourneyEvent(
//         state.journey_id,
//         state.subscriber_id,
//         state.id,
//         'notification_failed',
//         { error: result.error },
//         node.id
//       );

//       // 🔥 FIX: Handle expired subscriptions
//       if (result.error?.includes('410') ||
//           result.error?.includes('404') ||
//           result.error?.includes('SUBSCRIPTION_EXPIRED') ||
//           result.error?.includes('Invalid subscription keys')) {

//         console.log('[Processor] ⚠ Push subscription expired - clearing invalid subscription');

//         // Clear the expired subscription (but keep subscriber active)
//         await supabase.from('subscribers')
//           .update({
//             endpoint: null,
//             p256dh_key: null,
//             auth_key: null,
//             updated_at: new Date().toISOString(),
//           })
//           .eq('id', subscriber.id);

//         await logJourneyEvent(
//           state.journey_id,
//           state.subscriber_id,
//           state.id,
//           'subscription_expired',
//           { 
//             error: result.error,
//             note: 'User can re-subscribe to receive future notifications'
//           },
//           node.id
//         );
//       }
//     }

//     // 🔥 CRITICAL: ALWAYS move to next node (don't block journey on notification failure)
//     await moveToNextNode(state, flowDefinition, node.id);

//   } catch (error: any) {
//     console.error('[Processor] ✗ Notification error:', error.message);

//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       'notification_error',
//       { error: error.message },
//       node.id
//     );

//     // Move to next step anyway
//     await moveToNextNode(state, flowDefinition, node.id);
//   }
// }

async function processSendNotification(
  state: JourneyState,
  node: JourneyNode,
  flowDefinition: FlowDefinition
): Promise<void> {
  console.log('[Processor] Sending notification');

  await logExecution(
    state.journey_id,
    state.id,
    'notification_sending',
    `Sending notification: ${node.data.title}`,
    { title: node.data.title, body: node.data.body, url: node.data.url }
  );

  try {
    // 🔥 FIX 1: PARALLEL database queries (saves 1-2s)
    const [subscriberResult, websiteResult] = await Promise.all([
      supabase.from('subscribers').select('*').eq('id', state.subscriber_id).single(),
      supabase.from('subscribers')
        .select('website_id')
        .eq('id', state.subscriber_id)
        .single()
        .then(({ data }) =>
          data ? supabase.from('websites').select('*').eq('id', data.website_id).single() : null
        ),
    ]);

    const subscriber = subscriberResult.data;
    const website = websiteResult?.data;

    if (!subscriber) {
      throw new Error('Subscriber not found');
    }

    // Check subscription validity
    if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
      console.log('[Processor] ⚠ No valid push subscription');

      // 🔥 FIX 2: Fire-and-forget log insertion (proper async handling)
      Promise.all([
        supabase.from('notification_logs').insert({
          website_id: subscriber.website_id,
          subscriber_id: subscriber.id,
          journey_id: state.journey_id,
          journey_step_id: node.id,
          user_journey_state_id: state.id,
          status: 'failed',
          platform: 'web',
          sent_at: new Date().toISOString(),
          error_message: 'No valid push subscription - user needs to re-subscribe',
        }),
        logJourneyEvent(
          state.journey_id,
          state.subscriber_id,
          state.id,
          'notification_skipped',
          { reason: 'No push subscription' },
          node.id
        ),
      ]).catch((err) => console.error('[Processor] ✗ Background logging failed:', err));

      await moveToNextNode(state, flowDefinition, node.id);
      return;
    }

    if (!website) {
      throw new Error('Website not found');
    }

    const branding = website.notification_branding as any || {};
    // const { data: notificationLog } = await supabase
    //   .from('notification_logs')
    //   .insert({
    //           website_id: subscriber.website_id,
    //             subscriber_id: subscriber.id,
    //             journey_id: state.journey_id,
    //             journey_step_id: node.id,
    //             user_journey_state_id: state.id,
    //             platform: 'web',
    //             sent_at: new Date().toISOString(),

    //   })
    //   .select()
    //   .single();

    const { data: notificationLog } = await supabase
      .from('notification_logs')
      .insert({
        website_id: subscriber.website_id,
        subscriber_id: subscriber.id,
        journey_id: state.journey_id,
        journey_step_id: node.id,
        // user_journey_state_id: stateId,
        status: 'sent',
        platform: 'web',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

      const notificationUrl = node.data.url || node.data.click_url || '/';
    
    // 🔥 FIX 3: Prepare notification payload
    const notificationPayload = {
      // title: node.data.title || 'Notification',
      // body: node.data.body || '',
      // icon: branding?.logo_url || node.data.icon_url || '/favicon.ico',
      // badge: '/badge-96x96.png',
      // image: node.data.image_url || undefined,
      //  url: notificationUrl, // ✅ CRITICAL: Primary URL field
      // click_url: notificationUrl, // ✅ CRITICAL: Backup URL field
      // url: node.data.url || node.data.click_url || '/',
      // tag: `notif-${state.id}-${Date.now()}`,
      // requireInteraction: false,
      // campaign_id: null,
      // subscriber_id: subscriber.id,
      // notification_id: notificationLog?.id || null,
      // journey_id: state.journey_id,
      title: node.data.title || 'Notification',
      body: node.data.body || '',
      icon: branding?.logo_url || node.data.icon_url || '/favicon.ico',
      badge: '/badge-96x96.png',
      image: node.data.image_url || undefined,
      url: notificationUrl, // ✅ CRITICAL: Primary URL field
      click_url: notificationUrl, // ✅ CRITICAL: Backup URL field
      tag: notificationLog?.id || `notif-${state.id}-${Date.now()}`,
      requireInteraction: false,
      // ✅ TOP-LEVEL fields for service worker
      subscriber_id: subscriber.id,
      notification_id: notificationLog?.id ?? undefined,
      journey_id: state.journey_id,
      campaign_id: null,
      // ✅ CRITICAL: Include ALL tracking data
      data: {
        url: notificationUrl,
        click_url: notificationUrl,
        subscriber_id: subscriber.id,
        notification_id: notificationLog?.id ?? undefined,
        journey_id: state.journey_id,
        campaign_id: null,
      },
      
      branding: {
        primary_color: branding?.primary_color || '#667eea',
        secondary_color: branding?.secondary_color || '#764ba2',
        logo_url: branding?.logo_url,
        font_family: branding?.font_family || 'Inter',
        button_style: branding?.button_style || 'rounded',
        notification_position: branding?.notification_position || 'top -right',
        animation_style: branding?.animation_style || 'slide',
        show_logo: branding?.show_logo ?? true,
        show_branding: branding?.show_branding ?? true,
      },
    };
    console.log('[Processor] Notification payload:', {
      title: notificationPayload.title,
      subscriber_id: notificationPayload.subscriber_id,
      journey_id: notificationPayload.journey_id,
      has_branding: !!notificationPayload.branding,
    });
    console.log('[Processor] Sending notification...');

    // 🔥 FIX 4: Send notification FIRST, then log (saves 700ms)
    const result = await sendNotificationToSubscriber(subscriber, notificationPayload);

    // Fire-and-forget logging (don't block on database writes)
    (async () => {
      try {
        // const { data: notificationLog } = await supabase
        //   .from('notification_logs')
        //   .insert({
        //     website_id: subscriber.website_id,
        //     subscriber_id: subscriber.id,
        //     journey_id: state.journey_id,
        //     journey_step_id: node.id,
        //     user_journey_state_id: state.id,
        //     status: result.success ? 'delivered' : 'failed',
        //     platform: 'web',
        //     sent_at: new Date().toISOString(),
        //     delivered_at: result.success ? new Date().toISOString() : null,
        //     error_message: result.success ? null : result.error,
        //   })
        //   .select()
        //   .single();

        await logJourneyEvent(
          state.journey_id,
          state.subscriber_id,
          state.id,
          result.success ? 'notification_sent' : 'notification_failed',
          result.success
            ? { title: notificationPayload.title, notification_id: notificationLog?.id }
            : { error: result.error },
          node.id
        );

        // Handle expired subscriptions
        // if (!result.success && (
        //   result.error?.includes('410') ||
        //   result.error?.includes('404') ||
        //   result.error?.includes('SUBSCRIPTION_EXPIRED') ||
        //   result.error?.includes('Invalid subscription keys')
        // )) 
        // {
        //   await Promise.all([
        //     supabase.from('subscribers').update({
        //       endpoint: null,
        //       p256dh_key: null,
        //       auth_key: null,
        //       updated_at: new Date().toISOString(),
        //     }).eq('id', subscriber.id),

        //     logJourneyEvent(
        //       state.journey_id,
        //       state.subscriber_id,
        //       state.id,
        //       'subscription_expired',
        //       { 
        //         error: result.error,
        //         note: 'User can re-subscribe to receive future notifications'
        //       },
        //       node.id
        //     ),
        //   ]);
        // }

        // 🔥 CRITICAL FIX: ONLY clear on CONFIRMED expiration (410/404)
        if (!result.success) {
          const errorStr = String(result.error || '').toLowerCase();
          const statusCode = result.error?.match(/\b(410|404)\b/)?.[0];

          const isDefinitelyExpired = (
            statusCode === '410' ||  // HTTP 410 Gone
            statusCode === '404' ||  // HTTP 404 Not Found
            errorStr.includes('410 gone') ||
            errorStr.includes('404 not found')
          );

          if (isDefinitelyExpired) {
            console.log('[Processor] ⚠ Subscription CONFIRMED expired (410/404)');
            console.log('[Processor] → Clearing invalid subscription');

            await Promise.all([
              supabase.from('subscribers').update({
                endpoint: null,
                p256dh_key: null,
                auth_key: null,
                status: 'inactive',  // 🔥 CRITICAL: Set status too!
                updated_at: new Date().toISOString(),
              }).eq('id', subscriber.id),

              logJourneyEvent(
                state.journey_id,
                state.subscriber_id,
                state.id,
                'subscription_expired',
                {
                  error: result.error,
                  status_code: statusCode,
                  note: 'Subscription confirmed expired (410/404)'
                },
                node.id
              ),
            ]);
          } else {
            // 🔥 NEW: Log but DON'T clear subscription
            console.log('[Processor] ℹ️ Notification failed but subscription may still be valid');
            console.log('[Processor] → Error:', result.error);
            console.log('[Processor] → NOT clearing subscription (might be VAPID/rate limit/network issue)');
          }
        }

      } catch (logError) {
        console.error('[Processor] ✗ Background logging failed:', logError);
      }
    })(); // Self-executing async function (fire-and-forget)

    if (result.success) {
      console.log('[Processor] ✓ Notification sent successfully!');
    } else {
      console.error('[Processor] ✗ Notification failed:', result.error);
    }

    // 🔥 CRITICAL: Move to next node IMMEDIATELY (don't wait for logging)
    await moveToNextNode(state, flowDefinition, node.id);

  } catch (error: any) {
    console.error('[Processor] ✗ Notification error:', error.message);

    // Fire-and-forget event logging
    logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      'notification_error',
      { error: error.message },
      node.id
    ).then(() => { }).catch((err) => console.error('[Processor] ✗ Event logging failed:', err));

    await moveToNextNode(state, flowDefinition, node.id);
  }
}

async function processWaitNode(
  state: JourneyState,
  node: JourneyNode,
  flowDefinition: FlowDefinition
): Promise<void> {
  console.log('[Processor]Processing wait node');

  const { data: existingSchedule } = await supabase
    .from('scheduled_journey_steps')
    .select('id, status, execute_at')
    .eq('user_journey_state_id', state.id)
    .eq('step_id', node.id)
    .in('status', ['pending', 'processing'])
    .single();

  if (existingSchedule) {
    console.log('[Processor]  Wait already scheduled:', existingSchedule.id);
    console.log('[Processor]  Execute at:', existingSchedule.execute_at);
    return;
  }

  const waitMode = node.data.mode || 'duration';

  if (waitMode === 'duration') {
    // let durationSeconds = node.data.duration || 86400;

    let durationSeconds = node.data.duration_seconds || node.data.duration || 86400;

    // ✅ ADD DEBUG LOGGING
    console.log('[Processor] 📊 Wait node data:', {
      duration: node.data.duration,
      duration_seconds: node.data.duration_seconds,
      unit: node.data.unit,
      final_duration: durationSeconds
    });

    // if (node.data.duration_seconds !== undefined) {
    //   durationSeconds = node.data.duration_seconds;
    // }
    const executeAt = new Date(Date.now() + durationSeconds * 1000);

    console.log(`[Processor] Scheduling wait: ${durationSeconds}s until ${executeAt.toISOString()}`);

    const { error: updateError } = await supabase
      .from('user_journey_states')
      .update({
        status: 'waiting',
        next_execution_at: executeAt.toISOString(),
        last_processed_at: new Date().toISOString(),
      })
      .eq('id', state.id);

    if (updateError) {
      console.error('[Processor] ✗ Failed to update state:', updateError);
      throw updateError;
    }

    console.log('[Processor]  State updated to waiting');

    const { data: scheduledStep, error: scheduleError } = await supabase
      .from('scheduled_journey_steps')
      .insert({
        user_journey_state_id: state.id,
        step_id: node.id,
        execute_at: executeAt.toISOString(),
        status: 'pending',
        payload: {
          mode: 'duration',
          step_type: 'wait_duration',
          journey_id: state.journey_id,
          subscriber_id: state.subscriber_id,
          current_node_id: node.id,
        },
      })
      .select()
      .single();

    if (scheduleError) {
      console.error('[Processor] ✗ Failed to create scheduled step:', scheduleError);
      throw scheduleError;
    }

    console.log('[Processor] Scheduled step created:', scheduledStep.id);

    try {
      const queue = getNotificationQueue();

      await queue.add(
        'wait-completion',
        {
          scheduledStepId: scheduledStep.id,
          journeyStateId: state.id,
          stepType: 'wait_duration',
          executeAt: executeAt.toISOString(),
        },
        {
          delay: durationSeconds * 1000,
          jobId: `wait-${scheduledStep.id}`,
          priority: 1,
        }
      );

      console.log(`[Processor]  Job queued: wait-${scheduledStep.id}`);
    } catch (queueError: any) {
      console.error('[Processor] ✗ Queue error:', queueError.message);
      await supabase
        .from('scheduled_journey_steps')
        .update({
          status: 'failed',
          error: `Queue failed: ${queueError.message}`
        })
        .eq('id', scheduledStep.id);
      throw queueError;
    }

    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      'wait_started',
      {
        duration_seconds: durationSeconds,
        until: executeAt.toISOString(),
        scheduled_step_id: scheduledStep.id
      },
      node.id
    );

    //  CRITICAL: STOP HERE
    console.log('[Processor] ⏸  Journey paused - waiting for timer');
    return;

  }
  else if (waitMode === 'until_event') {
    //  FIX: Better event name extraction
    // const eventName = 
    //   node.data.event?.name ||
    //   node.data.event?.event_name ||
    //   node.data.event_name ||
    //   node.data.waiting_for_event;


    console.log('[Processor] 🔍 DEBUG: Inspecting node.data for event name');
    console.log('[Processor] 🔍 node.data.event_name:', node.data.event_name);
    console.log('[Processor] 🔍 node.data.waiting_for_event:', node.data.waiting_for_event);
    console.log('[Processor] 🔍 node.data.event:', JSON.stringify(node.data.event));
    console.log('[Processor] 🔍 Full node.data keys:', Object.keys(node.data));

    const eventName =
      node.data.event_name ||                    // Direct property
      node.data.waiting_for_event ||             // Alternative location
      node.data.event?.event_name ||             // Nested in event object
      node.data.event?.name ||                   // Event.name
      node.data.waitConfig?.event_name ||        // Wait config
      node.data.config?.event_name ||            // Generic config
      (typeof node.data.event === 'string' ? node.data.event : null);  // String directly

    // 🔥 CRITICAL: Log the full node data if event name is missing
    if (!eventName) {
      console.error('[Processor] ✗ Event name missing!');
      console.error('[Processor] 📋 Full node.data:', JSON.stringify(node.data, null, 2));
      console.error('[Processor] 📋 Available keys:', Object.keys(node.data));
      throw new Error('Event name is required for wait-until-event mode');
    }

    console.log(`[Processor] ⏰ Waiting for event: "${eventName}"`);

    const timeoutSeconds =
      node.data.timeout_seconds ||
      node.data.event?.timeout_seconds ||
      604800;

    const timeoutAt = new Date(Date.now() + timeoutSeconds * 1000);

    const eventConfig =
      node.data.event_config ||
      node.data.event?.config ||
      node.data.config ||
      {};

    if (!eventName) {
      console.error('[Processor] ✗ Event name missing!');
      console.error('[Processor] 📋 Node data:', JSON.stringify(node.data, null, 2));
      throw new Error('Event name is required for wait-until-event mode');
    }

    console.log(`[Processor] ⏰ Waiting for event: "${eventName}"`);
    console.log(`[Processor] 📋 Event config:`, JSON.stringify(eventConfig, null, 2));
    console.log(`[Processor] ⏱️  Timeout: ${timeoutSeconds}s`);

    // 🔥 CRITICAL: Update state with proper event name
    const { error: updateError } = await supabase
      .from('user_journey_states')
      .update({
        status: 'waiting',
        next_execution_at: timeoutAt.toISOString(),
        context: {
          ...state.context,
          waiting_for_event: eventName,  // 🔥 Must be set correctly!
          event_config: eventConfig,
          wait_mode: 'until_event',
          wait_started_at: new Date().toISOString(),
          wait_node_id: node.id,
        },
        last_processed_at: new Date().toISOString(),
      })
      .eq('id', state.id);

    if (updateError) {
      console.error('[Processor] ✗ Failed to update state:', updateError);
      throw updateError;
    }

    console.log('[Processor] ✅ State updated to waiting for event');

    const { data: scheduledStep } = await supabase
      .from('scheduled_journey_steps')
      .insert({
        user_journey_state_id: state.id,
        step_id: node.id,
        execute_at: timeoutAt.toISOString(),
        status: 'pending',
        payload: {
          mode: 'event_timeout',
          event_name: eventName,
          step_type: 'wait_event_timeout',
          is_timeout: true,
          journey_id: state.journey_id,
          subscriber_id: state.subscriber_id,
        },
      })
      .select()
      .single();

    try {
      const queue = getNotificationQueue();
      await queue.add(
        'event-timeout',
        {
          scheduledStepId: scheduledStep!.id,
          journeyStateId: state.id,
          stepType: 'wait_event_timeout',
          executeAt: timeoutAt.toISOString(),
        },
        {
          delay: timeoutSeconds * 1000,
          jobId: `timeout-${scheduledStep!.id}`,
        }
      );
      console.log(`[Processor] ✓ Timeout job queued: timeout-${scheduledStep!.id}`);
    } catch (queueError: any) {
      console.error('[Processor] ✗ Queue error:', queueError.message);
    }

    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      'wait_for_event_started',
      {
        event_name: eventName,
        timeout: timeoutAt.toISOString(),
        timeout_seconds: timeoutSeconds,
        scheduled_step_id: scheduledStep!.id
      },
      node.id
    );

    // 🔥 CRITICAL: STOP HERE
    console.log('[Processor] ⏸️  Journey paused - waiting for event or timeout');
    return;
  }
}

async function processConditionNode(
  state: JourneyState,
  node: JourneyNode,
  flowDefinition: FlowDefinition
): Promise<void> {
  console.log('[Processor] Processing condition');

  const conditionType = node.data.check || node.data.condition_type;
  const lookbackSeconds = node.data.lookback || node.data.lookback_seconds || 86400;
  const lookbackDate = new Date(Date.now() - lookbackSeconds * 1000);

  let conditionMet = false;

  try {
    switch (conditionType) {
      case 'clicked_notification':
      case 'clicked_link':
        const { data: clicks } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('subscriber_id', state.subscriber_id)
          .not('clicked_at', 'is', null)
          .gte('clicked_at', lookbackDate.toISOString())
          .limit(1);
        conditionMet = (clicks && clicks.length > 0) || false;
        break;

      case 'visited_page':
      case 'page_view':
        const targetUrl = node.data.url || node.data.target_url;
        let query = supabase
          .from('subscriber_events')
          .select('id')
          .eq('subscriber_id', state.subscriber_id)
          .eq('event_name', 'page_view')
          .gte('created_at', lookbackDate.toISOString());

        if (targetUrl) {
          query = query.contains('properties', { url: targetUrl });
        }

        const { data: events } = await query.limit(1);
        conditionMet = (events && events.length > 0) || false;
        break;

      case 'completed_action':
      case 'custom_event':
        const actionName = node.data.action_name || node.data.event_name;
        const { data: actionEvents } = await supabase
          .from('subscriber_events')
          .select('id')
          .eq('subscriber_id', state.subscriber_id)
          .eq('event_name', actionName)
          .gte('created_at', lookbackDate.toISOString())
          .limit(1);
        conditionMet = (actionEvents && actionEvents.length > 0) || false;
        break;

      case 'has_tag':
        const { data: subscriber } = await supabase
          .from('subscribers')
          .select('tags')
          .eq('id', state.subscriber_id)
          .single();
        const tags = subscriber?.tags || [];
        const requiredTag = node.data.tag || node.data.tag_name;
        conditionMet = Array.isArray(tags) && tags.includes(requiredTag);
        break;

      case 'attribute_equals':
      case 'has_attribute':
        const { data: sub } = await supabase
          .from('subscribers')
          .select('custom_attributes')
          .eq('id', state.subscriber_id)
          .single();
        const attributes = (sub?.custom_attributes || {}) as Record<string, any>;
        const attrKey = node.data.attribute_key;
        const attrValue = node.data.attribute_value;

        if (conditionType === 'has_attribute') {
          conditionMet = attrKey && attributes[attrKey] !== undefined;
        } else {
          conditionMet = attrKey && attributes[attrKey] === attrValue;
        }
        break;

      default:
        console.warn(`[Processor] ⚠ Unknown condition type: ${conditionType}`);
        conditionMet = false;
    }

    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      'condition_evaluated',
      { condition_type: conditionType, result: conditionMet },
      node.id
    );

    const branchType = conditionMet ? 'yes' : 'no';
    const nextEdge = flowDefinition.edges.find(
      e => e.from === node.id && (e.type === branchType || e.condition === branchType)
    );

    if (nextEdge) {
      await supabase
        .from('user_journey_states')
        .update({
          current_step_id: nextEdge.to,
          status: 'active',
        })
        .eq('id', state.id);

      await processJourneyStep(state.id);
    } else {
      console.log(`[Processor] No ${branchType} branch found, completing journey`);
      await completeJourney(state.id);
    }

  } catch (error: any) {
    console.error('[Processor] ✗ Condition error:', error.message);

    const noEdge = flowDefinition.edges.find(e => e.from === node.id && (e.type === 'no' || e.condition === 'no'));
    if (noEdge) {
      await supabase.from('user_journey_states').update({ current_step_id: noEdge.to }).eq('id', state.id);
      await processJourneyStep(state.id);
    } else {
      await completeJourney(state.id);
    }
  }
}

async function processAbSplitNode(
  state: JourneyState,
  node: JourneyNode,
  flowDefinition: FlowDefinition
): Promise<void> {
  console.log('[Processor] Processing A/B split');

  const branches = node.data.branches || [];

  if (!branches || branches.length === 0) {
    console.warn('[Processor] ⚠ No branches defined, completing journey');
    await completeJourney(state.id);
    return;
  }

  const random = Math.random() * 100;
  let cumulative = 0;
  let selectedBranch = branches[0];

  for (const branch of branches) {
    cumulative += branch.percentage || 0;
    if (random <= cumulative) {
      selectedBranch = branch;
      break;
    }
  }

  console.log(`[Processor] Selected branch: ${selectedBranch.id} (${selectedBranch.name})`);

  const nextEdge = flowDefinition.edges.find(
    e => e.from === node.id && e.type === 'branch' && e.branchId === selectedBranch.id
  );

  if (nextEdge) {
    await supabase
      .from('user_journey_states')
      .update({
        current_step_id: nextEdge.to,
        status: 'active',
        context: {
          ...state.context,
          ab_variant: selectedBranch.id,
          ab_variant_name: selectedBranch.name
        },
      })
      .eq('id', state.id);

    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      'ab_split_selected',
      { branch_id: selectedBranch.id, branch_name: selectedBranch.name },
      node.id
    );

    await processJourneyStep(state.id);
  } else {
    console.warn('[Processor] ⚠ No edge found for selected branch');
    await completeJourney(state.id);
  }
}

async function processUpdateContactNode(
  state: JourneyState,
  node: JourneyNode,
  flowDefinition: FlowDefinition
): Promise<void> {
  console.log('[Processor] Processing update contact node');

  const operation = node.data.operation || 'set';
  const attributeKey = node.data.attribute_key;
  const attributeValue = node.data.attribute_value;

  if (!attributeKey) {
    console.error('[Processor] ✗ No attribute key specified');
    await moveToNextNode(state, flowDefinition, node.id);
    return;
  }

  try {
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('custom_attributes')
      .eq('id', state.subscriber_id)
      .single();

    let customAttributes = (subscriber?.custom_attributes || {}) as Record<string, any>;

    switch (operation) {
      case 'set':
        customAttributes[attributeKey] = attributeValue;
        break;

      case 'increment':
        const currentValue = Number(customAttributes[attributeKey]) || 0;
        customAttributes[attributeKey] = currentValue + Number(attributeValue);
        break;

      case 'decrement':
        const currentVal = Number(customAttributes[attributeKey]) || 0;
        customAttributes[attributeKey] = currentVal - Number(attributeValue);
        break;

      case 'append':
        const existingArray = Array.isArray(customAttributes[attributeKey])
          ? customAttributes[attributeKey]
          : [];
        customAttributes[attributeKey] = [...existingArray, attributeValue];
        break;
    }

    await supabase
      .from('subscribers')
      .update({
        custom_attributes: customAttributes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.subscriber_id);

    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      'contact_updated',
      {
        attribute_key: attributeKey,
        operation: operation,
        new_value: customAttributes[attributeKey],
      },
      node.id
    );

    console.log('[Processor] ✓ Contact updated successfully');

  } catch (error: any) {
    console.error('[Processor] ✗ Failed to update contact:', error.message);
  }

  await moveToNextNode(state, flowDefinition, node.id);
}

// ============================================================================
// JOURNEY STATE MANAGEMENT
// ============================================================================

async function moveToNextNode(
  state: JourneyState,
  flowDefinition: FlowDefinition,
  currentNodeId: string
): Promise<void> {
  const nextNodeId = getNextNodeId(flowDefinition, currentNodeId);

  await logExecution(
    state.journey_id,
    state.id,
    'node_transition',
    `Moving from ${currentNodeId} to ${nextNodeId || 'completion'}`,
    { from: currentNodeId, to: nextNodeId }
  );

  if (nextNodeId) {
    console.log(`[Processor] Moving to next node: ${nextNodeId}`);
    const nextNode = flowDefinition.nodes.find(n => n.id === nextNodeId);

    if (!nextNode) {
      console.error(`[Processor] ✗ Next node ${nextNodeId} not found in flow definition!`);
      console.error(`[Processor] Available nodes:`, flowDefinition.nodes.map(n => n.id));
      await completeJourney(state.id);
      return;
    }

    console.log(`[Processor] ➡️ Moving to next node: ${nextNodeId} (type: ${nextNode.type})`);

    await supabase
      .from('user_journey_states')
      .update({
        current_step_id: nextNodeId,
        status: 'active',
        last_processed_at: new Date().toISOString(),
      })
      .eq('id', state.id);

    await processJourneyStep(state.id);
  } else {
    console.log('[Processor] No next node found, completing journey');
    await completeJourney(state.id);
  }
}

export async function recalculateJourneyMetrics(journeyId: string): Promise<void> {
  console.log('[Processor] Recalculating metrics for journey:', journeyId);

  try {
    const { data: states, error } = await supabase
      .from('user_journey_states')
      .select('status')
      .eq('journey_id', journeyId);

    if (error) throw error;

    if (!states || states.length === 0) {
      await supabase
        .from('journeys')
        .update({
          total_entered: 0,
          total_active: 0,
          total_completed: 0,
          total_exited: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', journeyId);
      return;
    }

    const total_entered = states.length;
    const total_active = states.filter(s => s.status === 'active' || s.status === 'waiting').length;
    const total_completed = states.filter(s => s.status === 'completed').length;
    const total_exited = states.filter(s => s.status === 'exited').length;

    await supabase
      .from('journeys')
      .update({
        total_entered,
        total_active,
        total_completed,
        total_exited,
        updated_at: new Date().toISOString(),
      })
      .eq('id', journeyId);

    console.log('[Processor] ✓ Metrics updated:', {
      total_entered,
      total_active,
      total_completed,
      total_exited,
    });
  } catch (error: any) {
    console.error('[Processor] ✗ Failed to recalculate metrics:', error);
  }
}

async function completeJourney(journeyStateId: string): Promise<void> {
  console.log('[Processor] Completing journey:', journeyStateId);

  try {
    const { data: stateData } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('id', journeyStateId)
      .single();

    if (!stateData) return;

    const state = toJourneyState(stateData);

    await supabase
      .from('user_journey_states')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        current_step_id: null,
      })
      .eq('id', journeyStateId);

    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      journeyStateId,
      'journey_completed'
    );

    await recalculateJourneyMetrics(state.journey_id);

    console.log('[Processor] ✓ Journey completed successfully');

  } catch (error: any) {
    console.error('[Processor] ✗ Error completing journey:', error.message);
  }
}

async function exitJourney(journeyStateId: string, reason: string): Promise<void> {
  console.log('[Processor] Exiting journey:', journeyStateId, 'Reason:', reason);

  try {
    const { data: stateData } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('id', journeyStateId)
      .single();

    if (!stateData) return;

    const state = toJourneyState(stateData);

    await supabase
      .from('user_journey_states')
      .update({
        status: 'exited',
        completed_at: new Date().toISOString(),
        current_step_id: null,
        context: {
          ...state.context,
          exit_reason: reason
        }
      })
      .eq('id', journeyStateId);

    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      journeyStateId,
      'journey_exited',
      { reason }
    );

    await recalculateJourneyMetrics(state.journey_id);

    console.log('[Processor] ✓ Journey exited successfully');

  } catch (error: any) {
    console.error('[Processor] ✗ Error exiting journey:', error.message);
  }
}

export async function handleSubscriberEvent(
  subscriberId: string,
  eventName: string,
  eventData: any = {}
): Promise<void> {
  console.log('[Processor] Handling subscriber event:', { subscriberId, eventName });

  try {
    const { data: waitingStates } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('subscriber_id', subscriberId)
      .eq('status', 'waiting');

    if (!waitingStates || waitingStates.length === 0) {
      console.log('[Processor] ℹ No waiting states for this event');
      return;
    }

    console.log(`[Processor] Found ${waitingStates.length} waiting state(s)`);

    for (const stateData of waitingStates) {
      const state = toJourneyState(stateData);

      const waitingForEvent = state.context?.waiting_for_event;

      if (waitingForEvent !== eventName) {
        console.log(`[Processor] State ${state.id} waiting for "${waitingForEvent}", not "${eventName}"`);
        continue;
      }

      const eventConfig = state.context?.event_config || {};
      if (Object.keys(eventConfig).length > 0) {
        console.log(`[Processor] Checking event configuration:`, eventConfig);

        let configMatches = true;

        if (eventName === 'scroll_depth' && eventConfig.percentage) {
          const requiredPercentage = parseInt(eventConfig.percentage);
          const actualPercentage = eventData.percentage || 0;

          if (actualPercentage < requiredPercentage) {
            console.log(`[Processor] ✗ Scroll depth ${actualPercentage}% < required ${requiredPercentage}%`);
            configMatches = false;
          }
        }

        if (eventName === 'page_landed' && eventConfig.url_pattern) {
          const urlPattern = eventConfig.url_pattern;
          const actualUrl = eventData.url || eventData.path || '';

          if (urlPattern.includes('*')) {
            const escapedPattern = urlPattern
              .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
              .replace(/\*/g, '.*');
            const regex = new RegExp('^' + escapedPattern + '$', 'i');
            configMatches = regex.test(actualUrl);
          } else {
            configMatches = actualUrl.toLowerCase().includes(urlPattern.toLowerCase());
          }

          if (!configMatches) {
            console.log(`[Processor] ✗ URL "${actualUrl}" doesn't match pattern "${urlPattern}"`);
          }
        }

        if (eventName === 'page_abandoned' && eventConfig.min_time_seconds) {
          const requiredTime = parseInt(eventConfig.min_time_seconds);
          const actualTime = eventData.time_on_page_seconds || eventData.seconds || 0;

          if (actualTime < requiredTime) {
            console.log(`[Processor] ✗ Time on page ${actualTime}s < required ${requiredTime}s`);
            configMatches = false;
          }
        }

        if (eventName === 'time_on_page' && eventConfig.threshold_seconds) {
          const threshold = parseInt(eventConfig.threshold_seconds);
          const actualTime = eventData.seconds || eventData.duration || 0;

          if (actualTime < threshold) {
            console.log(`[Processor] ✗ Time ${actualTime}s < threshold ${threshold}s`);
            configMatches = false;
          }
        }

        if (eventName === 'link_clicked' && eventConfig.url) {
          const targetUrl = eventConfig.url.toLowerCase();
          const clickedUrl = (eventData.url || eventData.href || '').toLowerCase();

          configMatches = clickedUrl.includes(targetUrl);

          if (!configMatches) {
            console.log(`[Processor] ✗ Clicked URL "${clickedUrl}" doesn't match "${targetUrl}"`);
          }
        }

        if (eventName === 'cart_abandoned' && eventConfig.min_value) {
          const minValue = parseFloat(eventConfig.min_value);
          const cartValue = eventData.total_value || eventData.value || 0;

          if (cartValue < minValue) {
            console.log(`[Processor] ✗ Cart value ${cartValue} < minimum ${minValue}`);
            configMatches = false;
          }
        }

        // if (eventName === 'product_purchased') {
        //   if (eventConfig.product_id) {
        //     const items = eventData.items || [];
        //     configMatches = items.some((item: any) =>
        //       item.id === eventConfig.product_id || item.product_id === eventConfig.product_id
        //     );

        //     if (!configMatches) {
        //       console.log(`[Processor] ✗ Product ID "${eventConfig.product_id}" not in purchase`);
        //     }
        //   }

        //   if (eventConfig.category) {
        //     const items = eventData.items || [];
        //     configMatches = items.some((item: any) =>
        //       (item.category || '').toLowerCase() === eventConfig.category.toLowerCase()
        //     );

        //     if (!configMatches) {
        //       console.log(`[Processor] ✗ Category "${eventConfig.category}" not in purchase`);
        //     }
        //   }
        // }

        if ((eventName === 'form_started' || eventName === 'form_submitted') && eventConfig.form_id) {
          const actualFormId = eventData.form_id || eventData.id || '';
          configMatches = actualFormId === eventConfig.form_id;

          if (!configMatches) {
            console.log(`[Processor] ✗ Form ID "${actualFormId}" doesn't match "${eventConfig.form_id}"`);
          }
        }

        if (!configMatches) {
          console.log(`[Processor] Event configuration doesn't match, continuing to wait...`);
          continue;
        }
      }

      console.log(`[Processor] ✓ Event "${eventName}" received for waiting journey ${state.journey_id}`);

      await supabase
        .from('scheduled_journey_steps')
        .update({
          status: 'cancelled',
          error: 'Event received before timeout'
        })
        .eq('user_journey_state_id', state.id)
        .eq('status', 'pending');

      await supabase
        .from('user_journey_states')
        .update({
          status: 'active',
          next_execution_at: null,
          context: {
            ...state.context,
            waiting_for_event: null,
            received_event: eventName,
            received_event_data: eventData,
            event_received_at: new Date().toISOString(),
          }
        })
        .eq('id', state.id);

      await logJourneyEvent(
        state.journey_id,
        state.subscriber_id,
        state.id,
        'event_received',
        {
          event_name: eventName,
          event_data: eventData
        },
        state.current_step_id || undefined
      );

      const { data: journey } = await supabase
        .from('journeys')
        .select('flow_definition')
        .eq('id', state.journey_id)
        .single();

      if (journey) {
        const flowDefinition = parseFlowDefinition(journey.flow_definition);
        const currentNode = flowDefinition.nodes.find(n => n.id === state.current_step_id);

        if (currentNode) {
          console.log(`[Processor] Moving from wait node ${currentNode.id}`);
          await moveToNextNode(state, flowDefinition, currentNode.id);
        }
      }
    }

  } catch (error: any) {
    console.error('[Processor] ✗ Error handling event:', error.message);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const journeyProcessor = {
  enrollSubscriber,
  processJourneyStep,
  processDueSteps,
  handleSubscriberEvent,
};

export default journeyProcessor;