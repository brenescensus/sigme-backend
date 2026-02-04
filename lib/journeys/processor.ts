// // lib/journeys/processor.ts -
// // Fixed: Wait nodes, Advanced triggers, Counter updates, and TypeScript errors

// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// import { sendNotificationToSubscriber } from '@/lib/push/sender';
// import { getNotificationQueue } from '../queue/notification-queue';

// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );
// // ============================================================================
// // TYPE DEFINITIONS
// // ============================================================================

// interface JourneyNode {
//   id: string;
//   type: 'send_notification' | 'wait' | 'condition' | 'ab_split' | 'entry' | 'exit';
//   position: { x: number; y: number };
//   data: any;
// }

// interface JourneyEdge {
//   id?: string;
//   from: string;
//   to: string;
//   type?: 'yes' | 'no' | 'default' | 'branch' | 'success' | 'timeout';
//   branchId?: string;
//   condition?: string;
// }

// interface FlowDefinition {
//   nodes: JourneyNode[];
//   edges: JourneyEdge[];
//   start_step_id?: string;
// }

// interface JourneyState {
//   id: string;
//   journey_id: string;
//   subscriber_id: string;
//   current_step_id: string | null;
//   status: 'active' | 'completed' | 'exited' | 'waiting' | null;
//   context: any;
//   node_history: string[];
//   entered_at: string | null;
//   next_execution_at: string | null;
//   last_processed_at?: string | null;
//   completed_at?: string | null;
// }

// interface ProcessingResult {
//   processed: number;
//   failed: number;
//   skipped: number;
//   total: number;
//   errors?: string[];
// }

// //  FIX: Add proper types for event properties
// interface EventProperties {
//   url?: string;
//   path?: string;
//   percentage?: number;
//   time_on_page_seconds?: number;
//   seconds?: number;
//   is_external?: boolean;
//   device?: string;
//   items?: Array<{
//     id?: string;
//     product_id?: string;
//     category?: string;
//     [key: string]: any;
//   }>;
//   total_value?: number;
//   [key: string]: any;
// }

// // ============================================================================
// // UTILITY FUNCTIONS
// // ============================================================================

// function parseFlowDefinition(data: any): FlowDefinition {
//   if (!data || typeof data !== 'object') {
//     console.warn('[Processor] Invalid flow definition, returning empty flow');
//     return { nodes: [], edges: [] };
//   }
//   return {
//     nodes: Array.isArray(data.nodes) ? data.nodes : [],
//     edges: Array.isArray(data.edges) ? data.edges : [],
//     start_step_id: data.start_step_id,
//   };
// }

// function toJourneyState(dbRow: any): JourneyState {
//   return {
//     id: dbRow.id,
//     journey_id: dbRow.journey_id,
//     subscriber_id: dbRow.subscriber_id,
//     current_step_id: dbRow.current_step_id,
//     status: dbRow.status || 'active',
//     context: dbRow.context || {},
//     node_history: Array.isArray(dbRow.node_history) ? dbRow.node_history : [],
//     entered_at: dbRow.entered_at,
//     next_execution_at: dbRow.next_execution_at,
//     last_processed_at: dbRow.last_processed_at,
//     completed_at: dbRow.completed_at,
//   };
// }

// function getNextNodeId(flowDefinition: FlowDefinition, currentNodeId: string, condition?: string): string | null {
//   if (condition) {
//     const conditionalEdge = flowDefinition.edges.find(
//       e => e.from === currentNodeId && (e.type === condition || e.condition === condition)
//     );
//     if (conditionalEdge) return conditionalEdge.to;
//   }

//   const defaultEdge = flowDefinition.edges.find(
//     e => e.from === currentNodeId && (!e.type || e.type === 'default')
//   );

//   return defaultEdge ? defaultEdge.to : null;
// }

// async function logExecution(
//   journeyId: string,
//   stateId: string | null,
//   eventType: string,
//   message: string,
//   metadata: any = {}
// ) {
//   try {
//     await supabase.from('journey_execution_logs').insert({
//       journey_id: journeyId,
//       user_journey_state_id: stateId,
//       event_type: eventType,
//       message,
//       metadata,
//     });
//   } catch (error) {
//     console.error('[Logging] Failed to log execution:', error);
//   }
// }

// async function logJourneyEvent(
//   journeyId: string,
//   subscriberId: string,
//   stateId: string,
//   eventType: string,
//   metadata?: any,
//   stepId?: string
// ) {
//   try {
//     await supabase.from('journey_events').insert({
//       journey_id: journeyId,
//       subscriber_id: subscriberId,
//       user_journey_state_id: stateId,
//       event_type: eventType,
//       step_id: stepId || null,
//       metadata: metadata || {},
//     });
//   } catch (error: any) {
//     console.error('[Processor] Failed to log event:', error.message);
//   }
// }

// //  FIX: Helper to safely get event properties
// function getEventProperties(properties: any): EventProperties {
//   if (!properties || typeof properties !== 'object') {
//     return {};
//   }
//   return properties as EventProperties;
// }

// // ============================================================================
// // ADVANCED TRIGGER EVALUATION
// // ============================================================================

// async function checkAdvancedTrigger(subscriberId: string, trigger: any): Promise<boolean> {
//   console.log('[Processor]  Checking advanced trigger:', trigger.type);

//   try {
//     const { data: subscriber } = await supabase
//       .from('subscribers')
//       .select('*')
//       .eq('id', subscriberId)
//       .single();

//     if (!subscriber) {
//       console.log('[Processor]  Subscriber not found');
//       return false;
//     }

//     switch (trigger.type) {
//       // ==========================================
//       // PAGE BEHAVIOR TRIGGERS
//       // ==========================================
//       case 'page_landing': {
//         const urlPattern = trigger.url_pattern || trigger.url;
//         if (!urlPattern) {
//           console.log('[Processor]  Page landing: no URL pattern specified');
//           return false;
//         }

//         const { data: events } = await supabase
//           .from('subscriber_events')
//           .select('*')
//           .eq('subscriber_id', subscriberId)
//           .eq('event_name', 'page_landed')
//           .order('created_at', { ascending: false })
//           .limit(10);

//         if (!events || events.length === 0) {
//           console.log('[Processor]  No page_landed events found');
//           return false;
//         }

//         const hasLanded = events.some(e => {
//           const props = getEventProperties(e.properties);
//           const eventUrl = props.url || props.path || '';

//           if (urlPattern.includes('*')) {
//             // Escape special regex characters except *
//             const escapedPattern = urlPattern
//               .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
//               .replace(/\*/g, '.*');
//             const regex = new RegExp('^' + escapedPattern + '$', 'i'); // Case-insensitive
//             return regex.test(eventUrl);
//           }

//           // Case-insensitive includes
//           return eventUrl.toLowerCase().includes(urlPattern.toLowerCase());
//         });

//         console.log('[Processor] Page landing check:', { urlPattern, hasLanded, eventsChecked: events.length });
//         return hasLanded;
//       }

//       //     case 'scroll_depth': {
//       //       const requiredPercentage = trigger.percentage || 0;
//       //       if (requiredPercentage <= 0) return false;

//       //       const { data: events } = await supabase
//       //         .from('subscriber_events')
//       //         .select('*')
//       //         .eq('subscriber_id', subscriberId)
//       //         .eq('event_name', 'scroll_depth')
//       //         .order('created_at', { ascending: false })
//       //         .limit(10);

//       //       if (!events || events.length === 0) return false;

//       //       const hasReached = events.some(e => {
//       // const props = getEventProperties(e.properties);
//       // const percentage = props.percentage || 0;
//       // return percentage >= requiredPercentage;

//       // });

//       // console.log('[Processor]  Scroll depth check:', { 
//       //   requiredPercentage, 
//       //   recentScrolls: events.map(e => getEventProperties(e.properties).percentage),
//       //   hasReached 
//       // });

//       // return hasReached;
//       //     }
//       case 'scroll_depth': {
//         const requiredPercentage = trigger.percentage || 0;

//         if (requiredPercentage <= 0 || requiredPercentage > 100) {
//           console.log('[Processor]  Invalid scroll depth percentage:', requiredPercentage);
//           return false;
//         }

//         const { data: events } = await supabase
//           .from('subscriber_events')
//           .select('*')
//           .eq('subscriber_id', subscriberId)
//           .eq('event_name', 'scroll_depth')
//           .order('created_at', { ascending: false })
//           .limit(10);

//         if (!events || events.length === 0) {
//           console.log('[Processor]  No scroll_depth events found');
//           return false;
//         }

//         const hasReached = events.some(e => {
//           const props = getEventProperties(e.properties);
//           const percentage = props.percentage || 0;
//           return percentage >= requiredPercentage;
//         });

//         console.log('[Processor]  Scroll depth check:', {
//           requiredPercentage,
//           maxScrollFound: Math.max(...events.map(e => getEventProperties(e.properties).percentage || 0)),
//           hasReached
//         });

//         return hasReached;
//       }

//       case 'page_abandonment': {
//         // Support ALL possible property names
//         const minTime = trigger.min_time_value ||
//           trigger.min_time_seconds ||
//           trigger.minimum_time ||
//           trigger.time_value ||
//           trigger.min_time || // Additional backup
//           0;

//         if (minTime <= 0) {
//           console.log('[Processor] Page abandonment: no minimum time set');
//           return false;
//         }

//         // Validate reasonable range (1 second to 1 hour)
//         if (minTime < 1 || minTime > 3600) {
//           console.log('[Processor] Page abandonment: unreasonable time value:', minTime);
//           return false;
//         }

//         const { data: events } = await supabase
//           .from('subscriber_events')
//           .select('*')
//           .eq('subscriber_id', subscriberId)
//           .eq('event_name', 'page_abandoned')
//           .order('created_at', { ascending: false })
//           .limit(10); // Increased to check more events

//         if (!events || events.length === 0) {
//           console.log('[Processor] No page_abandoned events found for subscriber');
//           return false;
//         }

//         const hasAbandoned = events.some(e => {
//           const props = getEventProperties(e.properties);
//           const timeOnPage = props.time_on_page_seconds ||
//             props.time_on_page ||
//             props.seconds ||
//             0;
//           const meetsRequirement = timeOnPage >= minTime;

//           console.log('[Processor]  Checking abandonment event:', {
//             timeOnPage,
//             minTime,
//             meetsRequirement,
//             eventId: e.id
//           });

//           return meetsRequirement;
//         });

//         console.log('[Processor]  Page abandonment check:', {
//           minTime,
//           eventsChecked: events.length,
//           hasAbandoned
//         });

//         return hasAbandoned;
//       }

//       //       case 'time_on_page': {
//       //         const threshold = trigger.threshold_value || 
//       //                          trigger.threshold_seconds || 
//       //                          trigger.minimum_time || 
//       //                          trigger.min_time_seconds || 
//       //                          trigger.time_threshold || 0;

//       //         if (threshold <= 0) return false;

//       //         const { data: events } = await supabase
//       //           .from('subscriber_events')
//       //           .select('*')
//       //           .eq('subscriber_id', subscriberId)
//       //           .eq('event_name', 'time_on_page')
//       //           .order('created_at', { ascending: false })
//       //           .limit(10);

//       //         if (!events || events.length === 0) return false;
//       //  //  FIX: Check if ANY event reached threshold
//       //         const hasReached = events.some(e => {
//       //           const props = getEventProperties(e.properties);
//       //           const seconds = props.seconds || 0;
//       //           return seconds >= threshold;
//       //         });

//       //         console.log('[Processor]  Time on page check:', { 
//       //           threshold, 
//       //           recentTimes: events.map(e => getEventProperties(e.properties).seconds),
//       //           hasReached 
//       //         });
//       //         return hasReached;

//       //       }
//       case 'time_on_page': {
//         const threshold = trigger.threshold_value ||
//           trigger.threshold_seconds ||
//           trigger.minimum_time ||
//           trigger.min_time_seconds ||
//           trigger.time_threshold ||
//           trigger.duration || // Additional
//           trigger.seconds || // Additional
//           0;

//         if (threshold <= 0) {
//           console.log('[Processor]  Time on page: no threshold set');
//           return false;
//         }

//         // Validate reasonable range (1 second to 1 hour)
//         if (threshold > 3600) {
//           console.log('[Processor]  Time on page: unreasonable threshold:', threshold);
//           return false;
//         }

//         const { data: events } = await supabase
//           .from('subscriber_events')
//           .select('*')
//           .eq('subscriber_id', subscriberId)
//           .eq('event_name', 'time_on_page')
//           .order('created_at', { ascending: false })
//           .limit(10);

//         if (!events || events.length === 0) {
//           console.log('[Processor]  No time_on_page events found');
//           return false;
//         }

//         const hasReached = events.some(e => {
//           const props = getEventProperties(e.properties);
//           const seconds = props.seconds ||
//             props.duration ||
//             props.time_seconds ||
//             0;
//           return seconds >= threshold;
//         });

//         console.log('[Processor]  Time on page check:', {
//           threshold,
//           maxTimeFound: Math.max(...events.map(e => {
//             const p = getEventProperties(e.properties);
//             return p.seconds || p.duration || 0;
//           })),
//           hasReached
//         });

//         return hasReached;
//       }
//       // ==========================================
//       // INTERACTION TRIGGERS
//       // ==========================================

//       //     case 'link_interaction': {
//       //       const targetUrl = trigger.url || trigger.link_url;

//       //       const { data: events } = await supabase
//       //         .from('subscriber_events')
//       //         .select('*')
//       //         .eq('subscriber_id', subscriberId)
//       //         .eq('event_name', 'link_clicked')
//       //         .order('created_at', { ascending: false })
//       //         .limit(20);

//       //       if (!events || events.length === 0) return false;

//       //       const props = getEventProperties(events[0].properties);

//       //        if (targetUrl) {
//       //   const matches = events.some(e => {
//       //     const eventProps = getEventProperties(e.properties);
//       //     const clickedUrl = eventProps.url || '';
//       //     return clickedUrl.includes(targetUrl);

//       //   });
//       //   console.log('[Processor]  Link click check:', { targetUrl, matches });
//       //   return matches;
//       // }

//       // // If no specific URL required, any link click counts
//       // console.log('[Processor]  Link click check: any link clicked');
//       // return true;
//       //     }
//       case 'link_interaction': {
//         const targetUrl = trigger.url ||
//           trigger.link_url ||
//           trigger.target_url ||
//           trigger.href;

//         const { data: events } = await supabase
//           .from('subscriber_events')
//           .select('*')
//           .eq('subscriber_id', subscriberId)
//           .eq('event_name', 'link_clicked')
//           .order('created_at', { ascending: false })
//           .limit(20);

//         if (!events || events.length === 0) {
//           console.log('[Processor]  No link_clicked events found');
//           return false;
//         }

//         if (targetUrl) {
//           const matches = events.some(e => {
//             const eventProps = getEventProperties(e.properties);
//             const clickedUrl = (eventProps.url ||
//               eventProps.href ||
//               eventProps.link ||
//               '').toLowerCase();

//             return clickedUrl.includes(targetUrl.toLowerCase());
//           });

//           console.log('[Processor]  Link interaction check:', {
//             targetUrl,
//             matches,
//             eventsChecked: events.length
//           });

//           return matches;
//         }

//         // If no specific URL required, any link click counts
//         console.log('[Processor]  Link interaction check: any link clicked');
//         return true;
//       }

//       // ==========================================
//       // E-COMMERCE TRIGGERS
//       // ==========================================

//       case 'cart_abandoned': {
//         const delayValue = trigger.delay_value ||
//           trigger.delay_minutes ||
//           trigger.delay ||
//           30;
//         const delayUnit = trigger.delay_unit || 'minutes';

//         // Validate delay value
//         if (delayValue <= 0) {
//           console.log('[Processor]  Cart abandoned: invalid delay value');
//           return false;
//         }

//         // Calculate delay in milliseconds
//         let delayMs;
//         switch (delayUnit) {
//           case 'minutes':
//             delayMs = delayValue * 60 * 1000;
//             break;
//           case 'hours':
//             delayMs = delayValue * 60 * 60 * 1000;
//             break;
//           case 'days':
//             delayMs = delayValue * 24 * 60 * 60 * 1000;
//             break;
//           default:
//             console.log('[Processor]  Cart abandoned: unknown delay unit:', delayUnit);
//             delayMs = delayValue * 60 * 1000; // Default to minutes
//         }

//         // Validate reasonable delay (max 30 days)
//         if (delayMs > 30 * 24 * 60 * 60 * 1000) {
//           console.log('[Processor] Cart abandoned: delay too long (max 30 days)');
//           return false;
//         }

//         const cutoffTime = new Date(Date.now() - delayMs).toISOString();

//         const { data: events } = await supabase
//           .from('subscriber_events')
//           .select('*')
//           .eq('subscriber_id', subscriberId)
//           .eq('event_name', 'cart_abandoned')
//           .lte('created_at', cutoffTime)
//           .order('created_at', { ascending: false })
//           .limit(1);

//         if (!events || events.length === 0) {
//           console.log('[Processor]  No cart_abandoned events found before cutoff');
//           return false;
//         }

//         // Check for purchases OR checkout completion after abandonment
//         const { data: purchases } = await supabase
//           .from('subscriber_events')
//           .select('*')
//           .eq('subscriber_id', subscriberId)
//           .in('event_name', ['product_purchased', 'checkout_completed', 'order_completed'])
//           .gte('created_at', events[0].created_at)
//           .limit(1);

//         const hasAbandonedCart = !purchases || purchases.length === 0;

//         console.log('[Processor] Cart abandoned check:', {
//           delayValue,
//           delayUnit,
//           cutoffTime,
//           hasAbandonedCart,
//           abandonedAt: events[0].created_at
//         });

//         return hasAbandonedCart;
//       }

//      case 'product_purchased': {
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
//     console.log('[Processor]  No product_purchased events found');
//     return false;
//   }

//   // Check for specific product IDs
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
    
//     console.log('[Processor]  Product purchased check (by ID):', { 
//       productIds, 
//       hasPurchased 
//     });
//     return hasPurchased;
//   }

//   // Check for SKU
//   if (sku) {
//     const hasPurchased = events.some(e => {
//       const props = getEventProperties(e.properties);
//       const items = props.items || [];
//       return items.some((item: any) => item.sku === sku);
//     });
    
//     console.log('[Processor]  Product purchased check (by SKU):', { 
//       sku, 
//       hasPurchased 
//     });
//     return hasPurchased;
//   }

//   // Check for categories (case-insensitive)
//   if (categories.length > 0) {
//     const lowerCategories = categories.map((c: string) => c.toLowerCase());
    
//     const hasPurchased = events.some(e => {
//       const props = getEventProperties(e.properties);
//       const items = props.items || [];
//       return items.some((item: any) => 
//         lowerCategories.includes((item.category || '').toLowerCase())
//       );
//     });
    
//     console.log('[Processor]  Product purchased check (by category):', { 
//       categories, 
//       hasPurchased 
//     });
//     return hasPurchased;
//   }

//   // If no filters specified, any purchase counts
//   console.log('[Processor] Product purchased check: any product');
//   return true;
// }

//       // ==========================================
//       // USER ATTRIBUTE FILTERS
//       // ==========================================

//    case 'device_filter': {
//   const allowedDevices = trigger.devices || [];
//   if (allowedDevices.length === 0) {
//     console.log('[Processor]  Device filter: no restrictions');
//     return true; // No filter = allow all
//   }

//   // Normalize device names (case-insensitive)
//   const normalizedAllowedDevices = allowedDevices.map((d: string) => d.toLowerCase());

//   let device = 'desktop'; // Default

//   // Method 1: Check subscriber custom attributes
//   const customAttrs = subscriber.custom_attributes as any;
//   if (customAttrs?.device) {
//     device = customAttrs.device.toLowerCase();
//   } else {
//     // Method 2: Check most recent event
//     const { data: events } = await supabase
//       .from('subscriber_events')
//       .select('*')
//       .eq('subscriber_id', subscriberId)
//       .order('created_at', { ascending: false })
//       .limit(1);

//     if (events && events.length > 0) {
//       const props = getEventProperties(events[0].properties);
//       device = (props.device || 
//                props.device_type || 
//                props.platform ||
//                'desktop').toLowerCase();
//     }

//     // Method 3: Parse User-Agent if available
//     if (subscriber.user_agent && device === 'desktop') {
//       const ua = subscriber.user_agent.toLowerCase();
//       if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
//         device = 'mobile';
//       } else if (ua.includes('tablet') || ua.includes('ipad')) {
//         device = 'tablet';
//       }
//     }
//   }

//   const matches = normalizedAllowedDevices.includes(device);
  
//   console.log('[Processor] Device filter check:', { 
//     allowedDevices: normalizedAllowedDevices, 
//     subscriberDevice: device,
//     matches 
//   });
  
//   return matches;
// }

//      case 'geography_filter': {
//   const allowedCountries = trigger.countries || [];
//   const allowedRegions = trigger.regions || [];
//   const allowedCities = trigger.cities || [];

//   if (allowedCountries.length === 0 && 
//       allowedRegions.length === 0 && 
//       allowedCities.length === 0) {
//     console.log('[Processor]  Geography filter: no restrictions');
//     return true;
//   }

//   const subscriberData = subscriber as any;
//   const country = (subscriber.country || '').toLowerCase();
//   const countryCode = (subscriberData.country_code || '').toLowerCase();
//   const region = (subscriberData.region || subscriberData.state || '').toLowerCase();
//   const city = (subscriber.city || '').toLowerCase();

//   // Normalize allowed values
//   const normalizedCountries = allowedCountries.map((c: string) => c.toLowerCase());
//   const normalizedRegions = allowedRegions.map((r: string) => r.toLowerCase());
//   const normalizedCities = allowedCities.map((c: string) => c.toLowerCase());

//   // Country match (supports both names and codes)
//   let countryMatch = allowedCountries.length === 0;
//   if (!countryMatch) {
//     countryMatch = normalizedCountries.includes(country) || 
//                   normalizedCountries.includes(countryCode);
//   }

//   // Region/State match (exact match, not includes)
//   let regionMatch = allowedRegions.length === 0;
//   if (!regionMatch) {
//     regionMatch = normalizedRegions.includes(region);
//   }

//   // City match (exact match)
//   let cityMatch = allowedCities.length === 0;
//   if (!cityMatch) {
//     cityMatch = normalizedCities.includes(city);
//   }

//   // All specified filters must match (AND logic)
//   const matches = countryMatch && regionMatch && cityMatch;
  
//   console.log('[Processor]  Geography filter check:', { 
//     subscriberCountry: country,
//     subscriberRegion: region,
//     subscriberCity: city,
//     countryMatch,
//     regionMatch,
//     cityMatch,
//     finalMatch: matches
//   });
  
//   return matches;
// }

//       default:
//         console.log('[Processor]  Unknown trigger type:', trigger.type);
//         return false;
//     }
//   } catch (error: any) {
//     console.error('[Processor]  Advanced trigger check failed:', error.message);
//     return false;
//   }
// }

// // ============================================================================
// // CORE PROCESSING FUNCTIONS
// // ============================================================================

// export async function processDueSteps(): Promise<ProcessingResult> {
//   console.log('[Processor] Starting scheduled step processing...');
//   const startTime = Date.now();

//   try {
//     const now = new Date().toISOString();

//     const { data: dueSteps, error } = await supabase
//       .from('scheduled_journey_steps')
//       .select('*')
//       .eq('status', 'pending')
//       .lte('execute_at', now)
//       .order('execute_at', { ascending: true })
//       .limit(100);

//     if (error) {
//       console.error(' [Processor] Error fetching due steps:', error);
//       throw error;
//     }

//     if (!dueSteps || dueSteps.length === 0) {
//       console.log(' [Processor] No due steps found');
//       return { processed: 0, failed: 0, skipped: 0, total: 0 };
//     }

//     console.log(` [Processor] Found ${dueSteps.length} due steps to process`);

//     let processed = 0;
//     let failed = 0;
//     let skipped = 0;
//     const errors: string[] = [];

//     for (const step of dueSteps) {
//       try {
//         const stepPayload = step.payload as Record<string, any> | null;
//         console.log(`\n [Processor] Processing step ${step.id} (type: ${stepPayload?.step_type || 'unknown'})`);

//         await supabase
//           .from('scheduled_journey_steps')
//           .update({
//             status: 'processing',
//             started_at: new Date().toISOString(),
//           })
//           .eq('id', step.id);

//         const { data: stateData, error: stateError } = await supabase
//           .from('user_journey_states')
//           .select('*')
//           .eq('id', step.user_journey_state_id)
//           .single();

//         if (stateError || !stateData) {
//           console.warn(` [Processor] Journey state ${step.user_journey_state_id} not found, cancelling step`);
//           await supabase
//             .from('scheduled_journey_steps')
//             .update({
//               status: 'cancelled',
//               error: 'Journey state not found',
//               completed_at: new Date().toISOString(),
//             })
//             .eq('id', step.id);
//           skipped++;
//           continue;
//         }

//         const state = toJourneyState(stateData);

//         if (stepPayload?.step_type?.includes('wait')) {
//           console.log(' [Processor] Wait step completed, advancing journey...');

//           const { data: journey } = await supabase
//             .from('journeys')
//             .select('flow_definition')
//             .eq('id', state.journey_id)
//             .single();

//           if (journey) {
//             const flowDefinition = parseFlowDefinition(journey.flow_definition);
//             const currentNode = flowDefinition.nodes.find(n => n.id === state.current_step_id);

//             if (currentNode) {
//               const nextNodeId = getNextNodeId(flowDefinition, currentNode.id);

//               if (nextNodeId) {
//                 console.log(` [Processor] Moving from wait node ${currentNode.id} to ${nextNodeId}`);

//                 await supabase
//                   .from('user_journey_states')
//                   .update({
//                     current_step_id: nextNodeId,
//                     status: 'active',
//                     next_execution_at: null,
//                     last_processed_at: new Date().toISOString(),
//                   })
//                   .eq('id', state.id);

//                 await supabase
//                   .from('scheduled_journey_steps')
//                   .update({
//                     status: 'completed',
//                     completed_at: new Date().toISOString(),
//                   })
//                   .eq('id', step.id);

//                 await logJourneyEvent(
//                   state.journey_id,
//                   state.subscriber_id,
//                   state.id,
//                   'wait_completed',
//                   {
//                     wait_node_id: currentNode.id,
//                     next_node_id: nextNodeId
//                   },
//                   currentNode.id
//                 );

//                 console.log(` [Processor] Processing next node: ${nextNodeId}`);
//                 await processJourneyStep(state.id);

//                 processed++;
//                 console.log(` [Processor] Wait step ${step.id} completed successfully`);
//                 continue;
//               } else {
//                 console.log('[Processor] No next node after wait, completing journey');
//                 await completeJourney(state.id);

//                 await supabase
//                   .from('scheduled_journey_steps')
//                   .update({
//                     status: 'completed',
//                     completed_at: new Date().toISOString(),
//                   })
//                   .eq('id', step.id);

//                 processed++;
//                 continue;
//               }
//             }
//           }
//         }

//         await processJourneyStep(step.user_journey_state_id);

//         await supabase
//           .from('scheduled_journey_steps')
//           .update({
//             status: 'completed',
//             completed_at: new Date().toISOString(),
//           })
//           .eq('id', step.id);

//         processed++;
//         console.log(` [Processor] Step ${step.id} completed successfully`);

//       } catch (stepError: any) {
//         console.error(` [Processor] Step ${step.id} failed:`, stepError.message);

//         await supabase
//           .from('scheduled_journey_steps')
//           .update({
//             status: 'failed',
//             error: stepError.message,
//             completed_at: new Date().toISOString(),
//           })
//           .eq('id', step.id);

//         failed++;
//         errors.push(`Step ${step.id}: ${stepError.message}`);
//       }
//     }

//     const duration = Date.now() - startTime;
//     const total = processed + failed + skipped;

//     console.log(`\n [Processor] Completed in ${duration}ms`);
//     console.log(`    Processed: ${processed}`);
//     console.log(`    Failed: ${failed}`);
//     console.log(`    Skipped: ${skipped}`);
//     console.log(`   Total: ${total}`);

//     return { processed, failed, skipped, total, errors: errors.length > 0 ? errors : undefined };

//   } catch (error: any) {
//     console.error(' [Processor] Fatal error in processDueSteps:', error.message);
//     throw error;
//   }
// }

// export async function enrollSubscriber(
//   journeyId: string,
//   subscriberId: string,
//   initialContext: any = {}
// ): Promise<any> {
//   console.log(' [Processor] Enrolling subscriber:', { journeyId, subscriberId });

//   try {
//     const { data: journey, error: journeyError } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', journeyId)
//       .single();

//     if (journeyError || !journey) {
//       throw new Error('Journey not found');
//     }

//     if (journey.status !== 'active') {
//       throw new Error(`Journey is not active (status: ${journey.status})`);
//     }

//     //  FIX: Properly type the entry_trigger JSON field
//     const entryTrigger = (journey.entry_trigger as any) || {};

//     if (entryTrigger.type && entryTrigger.type !== 'event' && entryTrigger.type !== 'manual') {
//       console.log(' [Processor] Checking advanced trigger criteria...');

//       const triggerMet = await checkAdvancedTrigger(subscriberId, entryTrigger);

//       if (!triggerMet) {
//         console.log(' [Processor] Advanced trigger criteria not met');
//         throw new Error('Subscriber does not meet entry trigger criteria');
//       }

//       console.log(' [Processor] Advanced trigger criteria met');
//     }

//     const flowDefinition = parseFlowDefinition(journey.flow_definition);

//     if (!flowDefinition.nodes || flowDefinition.nodes.length === 0) {
//       throw new Error('Journey has no steps defined');
//     }

//     const entryNode = flowDefinition.nodes.find(n => n.type === 'entry');
//     const startNode = entryNode || flowDefinition.nodes[0];

//     console.log(` [Processor] Starting at node: ${startNode.id} (type: ${startNode.type})`);

//     const canEnter = await checkReEntryRules(subscriberId, journey);
//     if (!canEnter) {
//       console.log(' [Processor] Re-entry rules prevent enrollment');
//       throw new Error('Subscriber cannot re-enter this journey at this time');
//     }

//     const { data: journeyState, error: stateError } = await supabase
//       .from('user_journey_states')
//       .insert({
//         journey_id: journeyId,
//         subscriber_id: subscriberId,
//         current_step_id: startNode.id,
//         status: 'active',
//         context: {
//           ...initialContext,
//           entry_timestamp: new Date().toISOString(),
//         },
//         node_history: [startNode.id],
//         entered_at: new Date().toISOString(),
//         last_processed_at: new Date().toISOString(),
//       })
//       .select()
//       .single();

//     if (stateError) {
//       console.error(' [Processor] Failed to create journey state:', stateError);
//       throw stateError;
//     }

//     await logJourneyEvent(
//       journeyId,
//       subscriberId,
//       journeyState.id,
//       'journey_entered',
//       { context: initialContext }
//     );

//     await supabase.rpc('increment', {
//       table_name: 'journeys',
//       column_name: 'total_entered',
//       row_id: journeyId,
//     });

//     await supabase.rpc('increment', {
//       table_name: 'journeys',
//       column_name: 'total_active',
//       row_id: journeyId,
//     });

//     if (startNode.type === 'entry') {
//       const nextNodeId = getNextNodeId(flowDefinition, startNode.id);
//       if (nextNodeId) {
//         await supabase
//           .from('user_journey_states')
//           .update({ current_step_id: nextNodeId })
//           .eq('id', journeyState.id);
//       }
//     }

//     await processJourneyStep(journeyState.id);

//     console.log(' [Processor] Subscriber enrolled successfully');
//     return journeyState;

//   } catch (error: any) {
//     console.error(' [Processor] Enrollment error:', error.message);
//     throw error;
//   }
// }

// export async function processJourneyStep(journeyStateId: string): Promise<void> {
//   console.log('\n [Processor] Processing journey step:', journeyStateId);

//   try {
//     const { data: stateData, error: stateError } = await supabase
//       .from('user_journey_states')
//       .select('*')
//       .eq('id', journeyStateId)
//       .single();

//     if (stateError || !stateData) {
//       throw new Error('Journey state not found');
//     }

//     const state = toJourneyState(stateData);

//     if (state.status !== 'active' && state.status !== 'waiting') {
//       console.log(`  [Processor] Journey state is ${state.status}, cannot process`);
//       return;
//     }

//     const { data: journey, error: journeyError } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', state.journey_id)
//       .single();

//     if (journeyError || !journey) {
//       throw new Error('Journey not found');
//     }

//     const flowDefinition = parseFlowDefinition(journey.flow_definition);
//     const currentNode = flowDefinition.nodes.find(n => n.id === state.current_step_id);

//     if (!currentNode) {
//       console.log('[Processor] Current step not found in flow, completing journey');
//       await completeJourney(journeyStateId);
//       return;
//     }

//     console.log(` [Processor] Current node: ${currentNode.id} (type: ${currentNode.type})`);

//     const nodeHistory = Array.isArray(state.node_history) ? state.node_history : [];
//     if (!nodeHistory.includes(currentNode.id)) {
//       nodeHistory.push(currentNode.id);
//       await supabase
//         .from('user_journey_states')
//         .update({
//           node_history: nodeHistory,
//           last_processed_at: new Date().toISOString(),
//         })
//         .eq('id', journeyStateId);
//     }

//     switch (currentNode.type) {
//       case 'send_notification':
//         await processSendNotification(state, currentNode, flowDefinition);
//         break;
//       case 'wait':
//         await processWaitNode(state, currentNode, flowDefinition);
//         break;
//       case 'condition':
//         await processConditionNode(state, currentNode, flowDefinition);
//         break;
//       case 'ab_split':
//         await processAbSplitNode(state, currentNode, flowDefinition);
//         break;
//       case 'exit':
//         await exitJourney(journeyStateId, 'reached_exit_node');
//         break;
//       case 'entry':
//         await moveToNextNode(state, flowDefinition, currentNode.id);
//         break;
//       default:
//         console.warn(` [Processor] Unknown node type: ${currentNode.type}, moving to next`);
//         await moveToNextNode(state, flowDefinition, currentNode.id);
//     }

//   } catch (error: any) {
//     console.error(' [Processor] Step processing error:', error.message);

//     const { data: stateData } = await supabase
//       .from('user_journey_states')
//       .select('*')
//       .eq('id', journeyStateId)
//       .single();

//     if (stateData) {
//       const state = toJourneyState(stateData);
//       await logJourneyEvent(
//         state.journey_id,
//         state.subscriber_id,
//         journeyStateId,
//         'step_error',
//         { error: error.message },
//         state.current_step_id || undefined
//       );
//     }

//     throw error;
//   }
// }

// // ============================================================================
// // NODE PROCESSORS
// // ============================================================================

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

//     if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
//       console.error(' [Processor] Subscriber has no valid push subscription');

//       await supabase.from('notification_logs').insert({
//         website_id: subscriber.website_id,
//         subscriber_id: subscriber.id,
//         journey_id: state.journey_id,
//         journey_step_id: node.id,
//         user_journey_state_id: state.id,
//         status: 'failed',
//         platform: 'web',
//         sent_at: new Date().toISOString(),
//         error_message: 'Subscriber not subscribed to push notifications',
//       });

//       await logJourneyEvent(
//         state.journey_id,
//         state.subscriber_id,
//         state.id,
//         'notification_error',
//         { error: 'No push subscription' },
//         node.id
//       );

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

//     console.log(' [Processor] Sending notification...');

//     const result = await sendNotificationToSubscriber(subscriber, notificationPayload);

//     if (result.success) {
//       console.log(' [Processor] Notification sent successfully!');

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
//       console.error(' [Processor] Notification failed:', result.error);

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

//       if (result.error?.includes('410') ||
//         result.error?.includes('404') ||
//         result.error?.includes('SUBSCRIPTION_EXPIRED') ||
//         result.error?.includes('Invalid subscription keys')) {
//         await supabase
//           .from('subscribers')
//           .update({
//             status: 'inactive',
//             updated_at: new Date().toISOString(),
//           })
//           .eq('id', subscriber.id);
//       }
//     }

//     await moveToNextNode(state, flowDefinition, node.id);

//   } catch (error: any) {
//     console.error(' [Processor] Notification error:', error.message);

//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       'notification_error',
//       { error: error.message },
//       node.id
//     );

//     await moveToNextNode(state, flowDefinition, node.id);
//   }
// }

// // async function processWaitNode(
// //   state: JourneyState,
// //   node: JourneyNode,
// //   flowDefinition: FlowDefinition
// // ): Promise<void> {
// //   console.log(' [Processor] Processing wait node');

// //   const { data: freshState } = await supabase
// //     .from('user_journey_states')
// //     .select('status, next_execution_at')
// //     .eq('id', state.id)
// //     .single();

// //   if (freshState?.next_execution_at) {
// //     const waitUntil = new Date(freshState.next_execution_at);
// //     const now = new Date();

// //     if (now >= waitUntil) {
// //       console.log(' [Processor] Wait period completed, advancing to next node');
// //       await moveToNextNode(state, flowDefinition, node.id);
// //       return;
// //     }
// //   }

// //   const { data: existingSchedule } = await supabase
// //     .from('scheduled_journey_steps')
// //     .select('id')
// //     .eq('user_journey_state_id', state.id)
// //     .eq('step_id', node.id)
// //     .eq('status', 'pending')
// //     .single();

// //   if (existingSchedule) {
// //     console.log('  [Processor] Wait already scheduled, skipping');
// //     return;
// //   }

// //   const waitMode = node.data.mode || 'duration';

// //   if (waitMode === 'duration') {
// //     const durationSeconds = node.data.duration || 86400;
// //     const executeAt = new Date(Date.now() + durationSeconds * 1000);

// //     console.log(`  [Processor] Scheduling wait for ${durationSeconds}s until ${executeAt.toISOString()}`);

// //     await supabase
// //       .from('user_journey_states')
// //       .update({
// //         status: 'waiting',
// //         next_execution_at: executeAt.toISOString(),
// //       })
// //       .eq('id', state.id);

// //     const { data: scheduledStep, error: scheduleError } = await supabase
// //       .from('scheduled_journey_steps')
// //       .insert({
// //         user_journey_state_id: state.id,
// //         step_id: node.id,
// //         execute_at: executeAt.toISOString(),
// //         status: 'pending',
// //         payload: { 
// //           mode: 'duration',
// //           step_type: 'wait_duration'
// //         },
// //       })
// //       .select()
// //       .single();

// //     if (scheduleError) {
// //       throw scheduleError;
// //     }

// //     console.log(` [Processor] Step scheduled: ${scheduledStep.id}`);

// //     await logJourneyEvent(
// //       state.journey_id,
// //       state.subscriber_id,
// //       state.id,
// //       'wait_started',
// //       { 
// //         duration_seconds: durationSeconds, 
// //         until: executeAt.toISOString(),
// //         scheduled_step_id: scheduledStep.id 
// //       },
// //       node.id
// //     );

// //   } else if (waitMode === 'until_event') {
// //     const eventName = node.data.event?.name || node.data.event_name;
// //     const timeoutSeconds = node.data.timeout_seconds || 604800;
// //     const timeoutAt = new Date(Date.now() + timeoutSeconds * 1000);

// //     console.log(` [Processor] Waiting for event "${eventName}" (timeout: ${timeoutAt.toISOString()})`);

// //     await supabase
// //       .from('user_journey_states')
// //       .update({
// //         status: 'waiting',
// //         next_execution_at: timeoutAt.toISOString(),
// //         context: {
// //           ...state.context,
// //           waiting_for_event: eventName,
// //         },
// //       })
// //       .eq('id', state.id);

// //     const { data: scheduledStep, error: scheduleError } = await supabase
// //       .from('scheduled_journey_steps')
// //       .insert({
// //         user_journey_state_id: state.id,
// //         step_id: node.id,
// //         execute_at: timeoutAt.toISOString(),
// //         status: 'pending',
// //         payload: { 
// //           mode: 'event_timeout',
// //           event_name: eventName,
// //           step_type: 'wait_event_timeout'
// //         },
// //       })
// //       .select()
// //       .single();

// //     if (scheduleError) {
// //       throw scheduleError;
// //     }

// //     await logJourneyEvent(
// //       state.journey_id,
// //       state.subscriber_id,
// //       state.id,
// //       'wait_for_event_started',
// //       { 
// //         event_name: eventName, 
// //         timeout: timeoutAt.toISOString(),
// //         scheduled_step_id: scheduledStep.id 
// //       },
// //       node.id
// //     );
// //   }
// // }

// // Add this import at the top

// // Replace the processWaitNode function using queues now:
// async function processWaitNode(
//   state: JourneyState,
//   node: JourneyNode,
//   flowDefinition: FlowDefinition
// ): Promise<void> {
//   console.log(' [Processor] Processing wait node');

//   const { data: freshState } = await supabase
//     .from('user_journey_states')
//     .select('status, next_execution_at')
//     .eq('id', state.id)
//     .single();

//   if (freshState?.next_execution_at) {
//     const waitUntil = new Date(freshState.next_execution_at);
//     const now = new Date();

//     if (now >= waitUntil) {
//       console.log('[Processor] Wait period completed');
//       await moveToNextNode(state, flowDefinition, node.id);
//       return;
//     }
//   }

//   // Check if already scheduled
//   const { data: existingSchedule } = await supabase
//     .from('scheduled_journey_steps')
//     .select('id')
//     .eq('user_journey_state_id', state.id)
//     .eq('step_id', node.id)
//     .eq('status', 'pending')
//     .single();

//   if (existingSchedule) {
//     console.log('  [Processor] Wait already scheduled');
//     return;
//   }

//   const waitMode = node.data.mode || 'duration';

//   if (waitMode === 'duration') {
//     const durationSeconds = node.data.duration || 86400;
//     const executeAt = new Date(Date.now() + durationSeconds * 1000);

//     console.log(` [Processor] Scheduling wait: ${durationSeconds}s`);

//     // Update journey state
//     await supabase
//       .from('user_journey_states')
//       .update({
//         status: 'waiting',
//         next_execution_at: executeAt.toISOString(),
//       })
//       .eq('id', state.id);

//     // Create database record
//     const { data: scheduledStep, error: scheduleError } = await supabase
//       .from('scheduled_journey_steps')
//       .insert({
//         user_journey_state_id: state.id,
//         step_id: node.id,
//         execute_at: executeAt.toISOString(),
//         status: 'pending',
//         payload: {
//           mode: 'duration',
//           step_type: 'wait_duration'
//         },
//       })
//       .select()
//       .single();

//     if (scheduleError) {
//       throw scheduleError;
//     }

//     //  Schedule in BullMQ
//     try {
//       const queue = getNotificationQueue();

//       await queue.add(
//         'wait-completion',
//         {
//           scheduledStepId: scheduledStep.id,
//           journeyStateId: state.id,
//           stepType: 'wait_duration',
//           executeAt: executeAt.toISOString(),
//         },
//         {
//           delay: durationSeconds * 1000,
//           jobId: `wait-${scheduledStep.id}`,
//         }
//       );

//       console.log(` [Processor] Job queued: wait-${scheduledStep.id}`);
//     } catch (queueError: any) {
//       console.error('[Processor] Queue error:', queueError.message);
//       // Fallback: mark for manual processing
//       await supabase
//         .from('scheduled_journey_steps')
//         .update({
//           status: 'pending',
//           error: `Queue failed: ${queueError.message}`
//         })
//         .eq('id', scheduledStep.id);
//     }

//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       'wait_started',
//       {
//         duration_seconds: durationSeconds,
//         until: executeAt.toISOString(),
//         scheduled_step_id: scheduledStep.id
//       },
//       node.id
//     );

//   } else if (waitMode === 'until_event') {
//     const eventName = node.data.event?.name || node.data.event_name;
//     const timeoutSeconds = node.data.timeout_seconds || 604800;
//     const timeoutAt = new Date(Date.now() + timeoutSeconds * 1000);

//     console.log(`[Processor] Waiting for event: ${eventName}`);

//     await supabase
//       .from('user_journey_states')
//       .update({
//         status: 'waiting',
//         next_execution_at: timeoutAt.toISOString(),
//         context: {
//           ...state.context,
//           waiting_for_event: eventName,
//         },
//       })
//       .eq('id', state.id);

//     const { data: scheduledStep } = await supabase
//       .from('scheduled_journey_steps')
//       .insert({
//         user_journey_state_id: state.id,
//         step_id: node.id,
//         execute_at: timeoutAt.toISOString(),
//         status: 'pending',
//         payload: {
//           mode: 'event_timeout',
//           event_name: eventName,
//           step_type: 'wait_event_timeout'
//         },
//       })
//       .select()
//       .single();

//     // Schedule timeout in queue
//     try {
//       const queue = getNotificationQueue();

//       await queue.add(
//         'event-timeout',
//         {
//           scheduledStepId: scheduledStep!.id,
//           journeyStateId: state.id,
//           stepType: 'wait_event_timeout',
//           executeAt: timeoutAt.toISOString(),
//         },
//         {
//           delay: timeoutSeconds * 1000,
//           jobId: `timeout-${scheduledStep!.id}`,
//         }
//       );
//     } catch (queueError: any) {
//       console.error('[Processor] Queue error:', queueError.message);
//     }

//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       'wait_for_event_started',
//       {
//         event_name: eventName,
//         timeout: timeoutAt.toISOString(),
//         scheduled_step_id: scheduledStep!.id
//       },
//       node.id
//     );
//   }
// }

// async function processConditionNode(
//   state: JourneyState,
//   node: JourneyNode,
//   flowDefinition: FlowDefinition
// ): Promise<void> {
//   console.log(' [Processor] Processing condition');

//   const conditionType = node.data.check || node.data.condition_type;
//   const lookbackSeconds = node.data.lookback || node.data.lookback_seconds || 86400;
//   const lookbackDate = new Date(Date.now() - lookbackSeconds * 1000);

//   let conditionMet = false;

//   try {
//     switch (conditionType) {
//       case 'clicked_notification':
//       case 'clicked_link':
//         const { data: clicks } = await supabase
//           .from('notification_logs')
//           .select('id')
//           .eq('subscriber_id', state.subscriber_id)
//           .not('clicked_at', 'is', null)
//           .gte('clicked_at', lookbackDate.toISOString())
//           .limit(1);
//         conditionMet = (clicks && clicks.length > 0) || false;
//         break;

//       case 'visited_page':
//       case 'page_view':
//         const targetUrl = node.data.url || node.data.target_url;
//         let query = supabase
//           .from('subscriber_events')
//           .select('id')
//           .eq('subscriber_id', state.subscriber_id)
//           .eq('event_name', 'page_view')
//           .gte('created_at', lookbackDate.toISOString());

//         if (targetUrl) {
//           query = query.contains('properties', { url: targetUrl });
//         }

//         const { data: events } = await query.limit(1);
//         conditionMet = (events && events.length > 0) || false;
//         break;

//       case 'completed_action':
//       case 'custom_event':
//         const actionName = node.data.action_name || node.data.event_name;
//         const { data: actionEvents } = await supabase
//           .from('subscriber_events')
//           .select('id')
//           .eq('subscriber_id', state.subscriber_id)
//           .eq('event_name', actionName)
//           .gte('created_at', lookbackDate.toISOString())
//           .limit(1);
//         conditionMet = (actionEvents && actionEvents.length > 0) || false;
//         break;

//       case 'has_tag':
//         const { data: subscriber } = await supabase
//           .from('subscribers')
//           .select('tags')
//           .eq('id', state.subscriber_id)
//           .single();
//         const tags = subscriber?.tags || [];
//         const requiredTag = node.data.tag || node.data.tag_name;
//         conditionMet = Array.isArray(tags) && tags.includes(requiredTag);
//         break;

//       case 'attribute_equals':
//       case 'has_attribute':
//         const { data: sub } = await supabase
//           .from('subscribers')
//           .select('custom_attributes')
//           .eq('id', state.subscriber_id)
//           .single();
//         const attributes = (sub?.custom_attributes || {}) as Record<string, any>;
//         const attrKey = node.data.attribute_key;
//         const attrValue = node.data.attribute_value;

//         if (conditionType === 'has_attribute') {
//           conditionMet = attrKey && attributes[attrKey] !== undefined;
//         } else {
//           conditionMet = attrKey && attributes[attrKey] === attrValue;
//         }
//         break;

//       default:
//         console.warn(` [Processor] Unknown condition type: ${conditionType}`);
//         conditionMet = false;
//     }

//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       'condition_evaluated',
//       { condition_type: conditionType, result: conditionMet },
//       node.id
//     );

//     const branchType = conditionMet ? 'yes' : 'no';
//     const nextEdge = flowDefinition.edges.find(
//       e => e.from === node.id && (e.type === branchType || e.condition === branchType)
//     );

//     if (nextEdge) {
//       await supabase
//         .from('user_journey_states')
//         .update({
//           current_step_id: nextEdge.to,
//           status: 'active',
//         })
//         .eq('id', state.id);

//       await processJourneyStep(state.id);
//     } else {
//       console.log(`[Processor] No ${branchType} branch found, completing journey`);
//       await completeJourney(state.id);
//     }

//   } catch (error: any) {
//     console.error(' [Processor] Condition error:', error.message);

//     const noEdge = flowDefinition.edges.find(e => e.from === node.id && (e.type === 'no' || e.condition === 'no'));
//     if (noEdge) {
//       await supabase.from('user_journey_states').update({ current_step_id: noEdge.to }).eq('id', state.id);
//       await processJourneyStep(state.id);
//     } else {
//       await completeJourney(state.id);
//     }
//   }
// }

// async function processAbSplitNode(
//   state: JourneyState,
//   node: JourneyNode,
//   flowDefinition: FlowDefinition
// ): Promise<void> {
//   console.log('[Processor] Processing A/B split');

//   const branches = node.data.branches || [];

//   if (!branches || branches.length === 0) {
//     console.warn(' [Processor] No branches defined, completing journey');
//     await completeJourney(state.id);
//     return;
//   }

//   const random = Math.random() * 100;
//   let cumulative = 0;
//   let selectedBranch = branches[0];

//   for (const branch of branches) {
//     cumulative += branch.percentage || 0;
//     if (random <= cumulative) {
//       selectedBranch = branch;
//       break;
//     }
//   }

//   console.log(` [Processor] Selected branch: ${selectedBranch.id} (${selectedBranch.name})`);

//   const nextEdge = flowDefinition.edges.find(
//     e => e.from === node.id && e.type === 'branch' && e.branchId === selectedBranch.id
//   );

//   if (nextEdge) {
//     await supabase
//       .from('user_journey_states')
//       .update({
//         current_step_id: nextEdge.to,
//         status: 'active',
//         context: {
//           ...state.context,
//           ab_variant: selectedBranch.id,
//           ab_variant_name: selectedBranch.name
//         },
//       })
//       .eq('id', state.id);

//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       'ab_split_selected',
//       { branch_id: selectedBranch.id, branch_name: selectedBranch.name },
//       node.id
//     );

//     await processJourneyStep(state.id);
//   } else {
//     console.warn(' [Processor] No edge found for selected branch');
//     await completeJourney(state.id);
//   }
// }

// // ============================================================================
// // JOURNEY STATE MANAGEMENT
// // ============================================================================

// async function moveToNextNode(
//   state: JourneyState,
//   flowDefinition: FlowDefinition,
//   currentNodeId: string
// ): Promise<void> {
//   const nextNodeId = getNextNodeId(flowDefinition, currentNodeId);

//   await logExecution(
//     state.journey_id,
//     state.id,
//     'node_transition',
//     `Moving from ${currentNodeId} to ${nextNodeId || 'completion'}`,
//     { from: currentNodeId, to: nextNodeId }
//   );

//   if (nextNodeId) {
//     console.log(`  [Processor] Moving to next node: ${nextNodeId}`);

//     await supabase
//       .from('user_journey_states')
//       .update({
//         current_step_id: nextNodeId,
//         status: 'active',
//         last_processed_at: new Date().toISOString(),
//       })
//       .eq('id', state.id);

//     await processJourneyStep(state.id);
//   } else {
//     console.log('[Processor] No next node found, completing journey');
//     await completeJourney(state.id);
//   }
// }

// async function completeJourney(journeyStateId: string): Promise<void> {
//   console.log(' [Processor] Completing journey:', journeyStateId);

//   try {
//     const { data: stateData } = await supabase
//       .from('user_journey_states')
//       .select('*')
//       .eq('id', journeyStateId)
//       .single();

//     if (!stateData) return;

//     const state = toJourneyState(stateData);

//     await supabase
//       .from('user_journey_states')
//       .update({
//         status: 'completed',
//         completed_at: new Date().toISOString(),
//         current_step_id: null,
//       })
//       .eq('id', journeyStateId);

//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       journeyStateId,
//       'journey_completed'
//     );

//     await supabase.rpc('increment', {
//       table_name: 'journeys',
//       column_name: 'total_completed',
//       row_id: state.journey_id,
//     });

//     await supabase.rpc('decrement', {
//       table_name: 'journeys',
//       column_name: 'total_active',
//       row_id: state.journey_id,
//     });

//     console.log(' [Processor] Journey completed successfully');

//   } catch (error: any) {
//     console.error(' [Processor] Error completing journey:', error.message);
//   }
// }

// async function exitJourney(journeyStateId: string, reason: string): Promise<void> {
//   console.log(' [Processor] Exiting journey:', journeyStateId, 'Reason:', reason);

//   try {
//     const { data: stateData } = await supabase
//       .from('user_journey_states')
//       .select('*')
//       .eq('id', journeyStateId)
//       .single();

//     if (!stateData) return;

//     const state = toJourneyState(stateData);

//     await supabase
//       .from('user_journey_states')
//       .update({
//         status: 'exited',
//         completed_at: new Date().toISOString(),
//         current_step_id: null,
//         context: {
//           ...state.context,
//           exit_reason: reason
//         }
//       })
//       .eq('id', journeyStateId);

//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       journeyStateId,
//       'journey_exited',
//       { reason }
//     );

//     await supabase.rpc('increment', {
//       table_name: 'journeys',
//       column_name: 'total_exited',
//       row_id: state.journey_id,
//     });

//     await supabase.rpc('decrement', {
//       table_name: 'journeys',
//       column_name: 'total_active',
//       row_id: state.journey_id,
//     });

//     console.log(' [Processor] Journey exited successfully');

//   } catch (error: any) {
//     console.error(' [Processor] Error exiting journey:', error.message);
//   }
// }

// // ============================================================================
// // HELPER FUNCTIONS
// // ============================================================================

// async function checkReEntryRules(subscriberId: string, journey: any): Promise<boolean> {
//   //  FIX: Properly type the re_entry_settings JSON field
//   const reEntrySettings = (journey.re_entry_settings as any) || {};
//   const allowReEntry = reEntrySettings.allow_re_entry || false;

//   const { data: states } = await supabase
//     .from('user_journey_states')
//     .select('*')
//     .eq('subscriber_id', subscriberId)
//     .eq('journey_id', journey.id)
//     .order('entered_at', { ascending: false });

//   if (!states || states.length === 0) {
//     return true;
//   }

//   const activeState = states.find(s => s.status === 'active' || s.status === 'waiting');
//   if (activeState) {
//     console.log(' [Processor] Already active in journey');
//     return false;
//   }

//   if (!allowReEntry) {
//     console.log(' [Processor] Re-entry not allowed');
//     return false;
//   }

//   const maxEntries = reEntrySettings.max_entries || 0;
//   if (maxEntries > 0 && states.length >= maxEntries) {
//     console.log(` [Processor] Max entries (${maxEntries}) reached`);
//     return false;
//   }

//   const cooldownDays = reEntrySettings.cooldown_days || 0;
//   if (cooldownDays > 0 && states.length > 0 && states[0].entered_at) {
//     const lastEntry = new Date(states[0].entered_at);
//     const daysSince = (Date.now() - lastEntry.getTime()) / (1000 * 60 * 60 * 24);

//     if (daysSince < cooldownDays) {
//       console.log(` [Processor] Cooldown period (${cooldownDays} days) not met`);
//       return false;
//     }
//   }

//   return true;
// }

// export async function handleSubscriberEvent(
//   subscriberId: string,
//   eventName: string,
//   eventData: any = {}
// ): Promise<void> {
//   console.log(' [Processor] Handling subscriber event:', { subscriberId, eventName });

//   try {
//     const { data: waitingStates } = await supabase
//       .from('user_journey_states')
//       .select('*')
//       .eq('subscriber_id', subscriberId)
//       .eq('status', 'waiting')
//       .contains('context', { waiting_for_event: eventName });

//     if (!waitingStates || waitingStates.length === 0) {
//       console.log('[Processor] No waiting states for this event');
//       return;
//     }

//     console.log(` [Processor] Found ${waitingStates.length} waiting state(s)`);

//     for (const stateData of waitingStates) {
//       const state = toJourneyState(stateData);

//       await supabase
//         .from('scheduled_journey_steps')
//         .update({ status: 'cancelled' })
//         .eq('user_journey_state_id', state.id)
//         .eq('status', 'pending');

//       await supabase
//         .from('user_journey_states')
//         .update({
//           status: 'active',
//           next_execution_at: null,
//           context: {
//             ...state.context,
//             waiting_for_event: null,
//             received_event: eventName,
//             received_event_data: eventData
//           }
//         })
//         .eq('id', state.id);

//       await logJourneyEvent(
//         state.journey_id,
//         state.subscriber_id,
//         state.id,
//         'event_received',
//         { event_name: eventName, event_data: eventData },
//         state.current_step_id || undefined
//       );

//       const { data: journey } = await supabase
//         .from('journeys')
//         .select('flow_definition')
//         .eq('id', state.journey_id)
//         .single();

//       if (journey) {
//         const flowDefinition = parseFlowDefinition(journey.flow_definition);
//         const currentNode = flowDefinition.nodes.find(n => n.id === state.current_step_id);

//         if (currentNode) {
//           await moveToNextNode(state, flowDefinition, currentNode.id);
//         }
//       }
//     }

//   } catch (error: any) {
//     console.error(' [Processor] Error handling event:', error.message);
//   }
// }

// // ============================================================================
// // EXPORTS
// // ============================================================================

// export const journeyProcessor = {
//   enrollSubscriber,
//   processJourneyStep,
//   processDueSteps,
//   handleSubscriberEvent,
// };

// export default journeyProcessor;










// lib/journeys/processor.ts
// Fixed: Duplicate enrollment prevention with database constraints

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { sendNotificationToSubscriber } from '@/lib/push/sender';
import { getNotificationQueue } from '../queue/notification-queue';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface JourneyNode {
  id: string;
  type: 'send_notification' | 'wait' | 'condition' | 'ab_split' | 'entry' | 'exit';
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
  console.log('[Processor]  Checking advanced trigger:', trigger.type);

  try {
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', subscriberId)
      .single();

    if (!subscriber) {
      console.log('[Processor]  Subscriber not found');
      return false;
    }

    switch (trigger.type) {
      // ... (keep all your existing trigger cases - page_landing, scroll_depth, etc.)
      // I'll include them but they remain unchanged
      
      case 'page_landing': {
        const urlPattern = trigger.url_pattern || trigger.url;
        if (!urlPattern) {
          console.log('[Processor]  Page landing: no URL pattern specified');
          return false;
        }

        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .eq('event_name', 'page_landed')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!events || events.length === 0) {
          console.log('[Processor]  No page_landed events found');
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

        console.log('[Processor] Page landing check:', { urlPattern, hasLanded, eventsChecked: events.length });
        return hasLanded;
      }

      case 'scroll_depth': {
        const requiredPercentage = trigger.percentage || 0;

        if (requiredPercentage <= 0 || requiredPercentage > 100) {
          console.log('[Processor]  Invalid scroll depth percentage:', requiredPercentage);
          return false;
        }

        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .eq('event_name', 'scroll_depth')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!events || events.length === 0) {
          console.log('[Processor]  No scroll_depth events found');
          return false;
        }

        const hasReached = events.some(e => {
          const props = getEventProperties(e.properties);
          const percentage = props.percentage || 0;
          return percentage >= requiredPercentage;
        });

        console.log('[Processor]  Scroll depth check:', {
          requiredPercentage,
          maxScrollFound: Math.max(...events.map(e => getEventProperties(e.properties).percentage || 0)),
          hasReached
        });

        return hasReached;
      }

      case 'page_abandonment': {
        const minTime = trigger.min_time_value ||
          trigger.min_time_seconds ||
          trigger.minimum_time ||
          trigger.time_value ||
          trigger.min_time ||
          0;

        if (minTime <= 0) {
          console.log('[Processor] Page abandonment: no minimum time set');
          return false;
        }

        if (minTime < 1 || minTime > 3600) {
          console.log('[Processor] Page abandonment: unreasonable time value:', minTime);
          return false;
        }

        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .eq('event_name', 'page_abandoned')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!events || events.length === 0) {
          console.log('[Processor] No page_abandoned events found for subscriber');
          return false;
        }

        const hasAbandoned = events.some(e => {
          const props = getEventProperties(e.properties);
          const timeOnPage = props.time_on_page_seconds ||
            props.time_on_page ||
            props.seconds ||
            0;
          const meetsRequirement = timeOnPage >= minTime;

          console.log('[Processor]  Checking abandonment event:', {
            timeOnPage,
            minTime,
            meetsRequirement,
            eventId: e.id
          });

          return meetsRequirement;
        });

        console.log('[Processor]  Page abandonment check:', {
          minTime,
          eventsChecked: events.length,
          hasAbandoned
        });

        return hasAbandoned;
      }

      case 'time_on_page': {
        const threshold = trigger.threshold_value ||
          trigger.threshold_seconds ||
          trigger.minimum_time ||
          trigger.min_time_seconds ||
          trigger.time_threshold ||
          trigger.duration ||
          trigger.seconds ||
          0;

        if (threshold <= 0) {
          console.log('[Processor]  Time on page: no threshold set');
          return false;
        }

        if (threshold > 3600) {
          console.log('[Processor]  Time on page: unreasonable threshold:', threshold);
          return false;
        }

        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .eq('event_name', 'time_on_page')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!events || events.length === 0) {
          console.log('[Processor]  No time_on_page events found');
          return false;
        }

        const hasReached = events.some(e => {
          const props = getEventProperties(e.properties);
          const seconds = props.seconds ||
            props.duration ||
            props.time_seconds ||
            0;
          return seconds >= threshold;
        });

        console.log('[Processor]  Time on page check:', {
          threshold,
          maxTimeFound: Math.max(...events.map(e => {
            const p = getEventProperties(e.properties);
            return p.seconds || p.duration || 0;
          })),
          hasReached
        });

        return hasReached;
      }

      case 'link_interaction': {
        const targetUrl = trigger.url ||
          trigger.link_url ||
          trigger.target_url ||
          trigger.href;

        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .eq('event_name', 'link_clicked')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!events || events.length === 0) {
          console.log('[Processor]  No link_clicked events found');
          return false;
        }

        if (targetUrl) {
          const matches = events.some(e => {
            const eventProps = getEventProperties(e.properties);
            const clickedUrl = (eventProps.url ||
              eventProps.href ||
              eventProps.link ||
              '').toLowerCase();

            return clickedUrl.includes(targetUrl.toLowerCase());
          });

          console.log('[Processor]  Link interaction check:', {
            targetUrl,
            matches,
            eventsChecked: events.length
          });

          return matches;
        }

        console.log('[Processor]  Link interaction check: any link clicked');
        return true;
      }

      case 'cart_abandoned': {
        const delayValue = trigger.delay_value ||
          trigger.delay_minutes ||
          trigger.delay ||
          30;
        const delayUnit = trigger.delay_unit || 'minutes';

        if (delayValue <= 0) {
          console.log('[Processor]  Cart abandoned: invalid delay value');
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
            console.log('[Processor]  Cart abandoned: unknown delay unit:', delayUnit);
            delayMs = delayValue * 60 * 1000;
        }

        if (delayMs > 30 * 24 * 60 * 60 * 1000) {
          console.log('[Processor] Cart abandoned: delay too long (max 30 days)');
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
          console.log('[Processor]  No cart_abandoned events found before cutoff');
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

        console.log('[Processor] Cart abandoned check:', {
          delayValue,
          delayUnit,
          cutoffTime,
          hasAbandonedCart,
          abandonedAt: events[0].created_at
        });

        return hasAbandonedCart;
      }

      case 'product_purchased': {
        const productId = trigger.product_id;
        const productIds = trigger.product_ids || (productId ? [productId] : []);
        const category = trigger.category;
        const categories = trigger.categories || (category ? [category] : []);
        const sku = trigger.sku;

        const { data: events } = await supabase
          .from('subscriber_events')
          .select('*')
          .eq('subscriber_id', subscriberId)
          .eq('event_name', 'product_purchased')
          .order('created_at', { ascending: false })
          .limit(10);

        if (!events || events.length === 0) {
          console.log('[Processor]  No product_purchased events found');
          return false;
        }

        if (productIds.length > 0) {
          const hasPurchased = events.some(e => {
            const props = getEventProperties(e.properties);
            const items = props.items || [];
            return items.some((item: any) =>
              productIds.includes(item.id) ||
              productIds.includes(item.product_id) ||
              productIds.includes(item.sku)
            );
          });

          console.log('[Processor]  Product purchased check (by ID):', {
            productIds,
            hasPurchased
          });
          return hasPurchased;
        }

        if (sku) {
          const hasPurchased = events.some(e => {
            const props = getEventProperties(e.properties);
            const items = props.items || [];
            return items.some((item: any) => item.sku === sku);
          });

          console.log('[Processor]  Product purchased check (by SKU):', {
            sku,
            hasPurchased
          });
          return hasPurchased;
        }

        if (categories.length > 0) {
          const lowerCategories = categories.map((c: string) => c.toLowerCase());

          const hasPurchased = events.some(e => {
            const props = getEventProperties(e.properties);
            const items = props.items || [];
            return items.some((item: any) =>
              lowerCategories.includes((item.category || '').toLowerCase())
            );
          });

          console.log('[Processor]  Product purchased check (by category):', {
            categories,
            hasPurchased
          });
          return hasPurchased;
        }

        console.log('[Processor] Product purchased check: any product');
        return true;
      }

      case 'device_filter': {
        const allowedDevices = trigger.devices || [];
        if (allowedDevices.length === 0) {
          console.log('[Processor]  Device filter: no restrictions');
          return true;
        }

        const normalizedAllowedDevices = allowedDevices.map((d: string) => d.toLowerCase());

        let device = 'desktop';

        const customAttrs = subscriber.custom_attributes as any;
        if (customAttrs?.device) {
          device = customAttrs.device.toLowerCase();
        } else {
          const { data: events } = await supabase
            .from('subscriber_events')
            .select('*')
            .eq('subscriber_id', subscriberId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (events && events.length > 0) {
            const props = getEventProperties(events[0].properties);
            device = (props.device ||
              props.device_type ||
              props.platform ||
              'desktop').toLowerCase();
          }

          if (subscriber.user_agent && device === 'desktop') {
            const ua = subscriber.user_agent.toLowerCase();
            if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
              device = 'mobile';
            } else if (ua.includes('tablet') || ua.includes('ipad')) {
              device = 'tablet';
            }
          }
        }

        const matches = normalizedAllowedDevices.includes(device);

        console.log('[Processor] Device filter check:', {
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

        if (allowedCountries.length === 0 &&
          allowedRegions.length === 0 &&
          allowedCities.length === 0) {
          console.log('[Processor]  Geography filter: no restrictions');
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
          countryMatch = normalizedCountries.includes(country) ||
            normalizedCountries.includes(countryCode);
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

        console.log('[Processor]  Geography filter check:', {
          subscriberCountry: country,
          subscriberRegion: region,
          subscriberCity: city,
          countryMatch,
          regionMatch,
          cityMatch,
          finalMatch: matches
        });

        return matches;
      }

      default:
        console.log('[Processor]  Unknown trigger type:', trigger.type);
        return false;
    }
  } catch (error: any) {
    console.error('[Processor]  Advanced trigger check failed:', error.message);
    return false;
  }
}

// ============================================================================
// CORE PROCESSING FUNCTIONS
// ============================================================================

export async function processDueSteps(): Promise<ProcessingResult> {
  // ... (keep existing implementation)
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
      console.error(' [Processor] Error fetching due steps:', error);
      throw error;
    }

    if (!dueSteps || dueSteps.length === 0) {
      console.log(' [Processor] No due steps found');
      return { processed: 0, failed: 0, skipped: 0, total: 0 };
    }

    console.log(` [Processor] Found ${dueSteps.length} due steps to process`);

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const step of dueSteps) {
      try {
        const stepPayload = step.payload as Record<string, any> | null;
        console.log(`\n [Processor] Processing step ${step.id} (type: ${stepPayload?.step_type || 'unknown'})`);

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
          console.warn(` [Processor] Journey state ${step.user_journey_state_id} not found, cancelling step`);
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
          console.log(' [Processor] Wait step completed, advancing journey...');

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
                console.log(` [Processor] Moving from wait node ${currentNode.id} to ${nextNodeId}`);

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

                console.log(` [Processor] Processing next node: ${nextNodeId}`);
                await processJourneyStep(state.id);

                processed++;
                console.log(` [Processor] Wait step ${step.id} completed successfully`);
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
        console.log(` [Processor] Step ${step.id} completed successfully`);

      } catch (stepError: any) {
        console.error(` [Processor] Step ${step.id} failed:`, stepError.message);

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

    console.log(`\n [Processor] Completed in ${duration}ms`);
    console.log(`    Processed: ${processed}`);
    console.log(`    Failed: ${failed}`);
    console.log(`    Skipped: ${skipped}`);
    console.log(`   Total: ${total}`);

    return { processed, failed, skipped, total, errors: errors.length > 0 ? errors : undefined };

  } catch (error: any) {
    console.error(' [Processor] Fatal error in processDueSteps:', error.message);
    throw error;
  }
}

// ✅ UPDATED: enrollSubscriber with proper duplicate handling
export async function enrollSubscriber(
  journeyId: string,
  subscriberId: string,
  initialContext: any = {}
): Promise<any> {
  console.log(' [Processor] Enrolling subscriber:', { journeyId, subscriberId });

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

    const entryTrigger = (journey.entry_trigger as any) || {};

    if (entryTrigger.type && entryTrigger.type !== 'event' && entryTrigger.type !== 'manual') {
      console.log(' [Processor] Checking advanced trigger criteria...');

      const triggerMet = await checkAdvancedTrigger(subscriberId, entryTrigger);

      if (!triggerMet) {
        console.log(' [Processor] Advanced trigger criteria not met');
        throw new Error('Subscriber does not meet entry trigger criteria');
      }

      console.log(' [Processor] Advanced trigger criteria met');
    }

    const flowDefinition = parseFlowDefinition(journey.flow_definition);

    if (!flowDefinition.nodes || flowDefinition.nodes.length === 0) {
      throw new Error('Journey has no steps defined');
    }

    const entryNode = flowDefinition.nodes.find(n => n.type === 'entry');
    const startNode = entryNode || flowDefinition.nodes[0];

    console.log(` [Processor] Starting at node: ${startNode.id} (type: ${startNode.type})`);

    // ✅ Check re-entry rules BEFORE database insert
    const canEnter = await checkReEntryRules(subscriberId, journey);
    if (!canEnter) {
      console.log(' [Processor] Re-entry rules prevent enrollment');
      throw new Error('Subscriber cannot re-enter this journey at this time');
    }

    // ✅ Try to insert - database unique index will prevent duplicates
    const { data: journeyState, error: stateError } = await supabase
      .from('user_journey_states')
      .insert({
        journey_id: journeyId,
        subscriber_id: subscriberId,
        current_step_id: startNode.id,
        status: 'active', // ✅ Valid status
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
      // ✅ Handle unique constraint violation (23505)
      if (stateError.code === '23505') {
        console.log(' [Processor] Already enrolled (duplicate prevented by database)');
        throw new Error('Subscriber cannot re-enter this journey at this time');
      }

      // ✅ Handle CHECK constraint violation (23514 - invalid status)
      if (stateError.code === '23514') {
        console.error(' [Processor] Invalid status value');
        throw new Error('Invalid journey state status');
      }

      console.error(' [Processor] Failed to create journey state:', stateError);
      throw stateError;
    }

    // ✅ Only increment counters if insert succeeded
    await logJourneyEvent(
      journeyId,
      subscriberId,
      journeyState.id,
      'journey_entered',
      { context: initialContext }
    );

    await supabase.rpc('increment', {
      table_name: 'journeys',
      column_name: 'total_entered',
      row_id: journeyId,
    });

    await supabase.rpc('increment', {
      table_name: 'journeys',
      column_name: 'total_active',
      row_id: journeyId,
    });

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

    console.log(' [Processor] Subscriber enrolled successfully');
    return journeyState;

  } catch (error: any) {
    console.error(' [Processor] Enrollment error:', error.message);
    throw error;
  }
}

// ✅ UPDATED: checkReEntryRules with better error handling
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
    console.error(' [Processor] Error checking re-entry rules:', error);
    throw error;
  }

  if (!states || states.length === 0) {
    // No previous enrollment
    return true;
  }

  // ✅ Check for active or waiting states
  const activeState = states.find(s => s.status === 'active' || s.status === 'waiting');
  if (activeState) {
    console.log(' [Processor] Already active in journey');
    return false;
  }

  if (!allowReEntry) {
    console.log(' [Processor] Re-entry not allowed');
    return false;
  }

  const maxEntries = reEntrySettings.max_entries || 0;
  if (maxEntries > 0 && states.length >= maxEntries) {
    console.log(` [Processor] Max entries (${maxEntries}) reached`);
    return false;
  }

  const cooldownDays = reEntrySettings.cooldown_days || 0;
  if (cooldownDays > 0 && states.length > 0 && states[0].entered_at) {
    const lastEntry = new Date(states[0].entered_at);
    const daysSince = (Date.now() - lastEntry.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSince < cooldownDays) {
      console.log(` [Processor] Cooldown period (${cooldownDays} days) not met. ${daysSince.toFixed(1)} days since last entry`);
      return false;
    }
  }

  return true;
}

export async function processJourneyStep(journeyStateId: string): Promise<void> {
  console.log('\n [Processor] Processing journey step:', journeyStateId);

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
      console.log(`  [Processor] Journey state is ${state.status}, cannot process`);
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

    console.log(` [Processor] Current node: ${currentNode.id} (type: ${currentNode.type})`);

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
        await exitJourney(journeyStateId, 'reached_exit_node');
        break;
      case 'entry':
        await moveToNextNode(state, flowDefinition, currentNode.id);
        break;
      default:
        console.warn(` [Processor] Unknown node type: ${currentNode.type}, moving to next`);
        await moveToNextNode(state, flowDefinition, currentNode.id);
    }

  } catch (error: any) {
    console.error(' [Processor] Step processing error:', error.message);

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
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', state.subscriber_id)
      .single();

    if (subError || !subscriber) {
      throw new Error('Subscriber not found');
    }

    if (!subscriber.endpoint || !subscriber.p256dh_key || !subscriber.auth_key) {
      console.error(' [Processor] Subscriber has no valid push subscription');

      await supabase.from('notification_logs').insert({
        website_id: subscriber.website_id,
        subscriber_id: subscriber.id,
        journey_id: state.journey_id,
        journey_step_id: node.id,
        user_journey_state_id: state.id,
        status: 'failed',
        platform: 'web',
        sent_at: new Date().toISOString(),
        error_message: 'Subscriber not subscribed to push notifications',
      });

      await logJourneyEvent(
        state.journey_id,
        state.subscriber_id,
        state.id,
        'notification_error',
        { error: 'No push subscription' },
        node.id
      );

      await moveToNextNode(state, flowDefinition, node.id);
      return;
    }

    const { data: website } = await supabase
      .from('websites')
      .select('*')
      .eq('id', subscriber.website_id)
      .single();

    if (!website) {
      throw new Error('Website not found');
    }

    const branding = website.notification_branding as any || {};

    const { data: notificationLog, error: logError } = await supabase
      .from('notification_logs')
      .insert({
        website_id: subscriber.website_id,
        subscriber_id: subscriber.id,
        journey_id: state.journey_id,
        journey_step_id: node.id,
        user_journey_state_id: state.id,
        status: 'sent',
        platform: 'web',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError || !notificationLog) {
      throw new Error('Failed to create notification log');
    }

    const notificationPayload = {
      title: node.data.title || 'Notification',
      body: node.data.body || '',
      icon: branding?.logo_url || node.data.icon_url || '/icon-192x192.png',
      badge: '/badge-96x96.png',
      image: node.data.image_url || undefined,
      url: node.data.url || node.data.click_url || '/',
      tag: notificationLog.id,
      requireInteraction: false,
      branding: {
        primary_color: branding?.primary_color || '#667eea',
        secondary_color: branding?.secondary_color || '#764ba2',
        logo_url: branding?.logo_url,
        font_family: branding?.font_family || 'Inter',
        button_style: branding?.button_style || 'rounded',
        notification_position: branding?.notification_position || 'top-right',
        animation_style: branding?.animation_style || 'slide',
        show_logo: branding?.show_logo ?? true,
        show_branding: branding?.show_branding ?? true,
      },
    };

    console.log(' [Processor] Sending notification...');

    const result = await sendNotificationToSubscriber(subscriber, notificationPayload);

    if (result.success) {
      console.log(' [Processor] Notification sent successfully!');

      await supabase
        .from('notification_logs')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString(),
        })
        .eq('id', notificationLog.id);

      await logJourneyEvent(
        state.journey_id,
        state.subscriber_id,
        state.id,
        'notification_sent',
        {
          title: notificationPayload.title,
          notification_id: notificationLog.id,
        },
        node.id
      );
    } else {
      console.error(' [Processor] Notification failed:', result.error);

      await supabase
        .from('notification_logs')
        .update({
          status: 'failed',
          error_message: result.error,
        })
        .eq('id', notificationLog.id);

      await logJourneyEvent(
        state.journey_id,
        state.subscriber_id,
        state.id,
        'notification_failed',
        { error: result.error },
        node.id
      );

      if (result.error?.includes('410') ||
        result.error?.includes('404') ||
        result.error?.includes('SUBSCRIPTION_EXPIRED') ||
        result.error?.includes('Invalid subscription keys')) {
        await supabase
          .from('subscribers')
          .update({
            status: 'inactive',
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscriber.id);
      }
    }

    await moveToNextNode(state, flowDefinition, node.id);

  } catch (error: any) {
    console.error(' [Processor] Notification error:', error.message);

    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      'notification_error',
      { error: error.message },
      node.id
    );

    await moveToNextNode(state, flowDefinition, node.id);
  }
}

// async function processWaitNode(
//   state: JourneyState,
//   node: JourneyNode,
//   flowDefinition: FlowDefinition
// ): Promise<void> {
//   console.log(' [Processor] Processing wait node');

//   const { data: freshState } = await supabase
//     .from('user_journey_states')
//     .select('status, next_execution_at')
//     .eq('id', state.id)
//     .single();

//   if (freshState?.next_execution_at) {
//     const waitUntil = new Date(freshState.next_execution_at);
//     const now = new Date();

//     if (now >= waitUntil) {
//       console.log(' [Processor] Wait period completed, advancing to next node');
//       await moveToNextNode(state, flowDefinition, node.id);
//       return;
//     }
//   }

//   const { data: existingSchedule } = await supabase
//     .from('scheduled_journey_steps')
//     .select('id')
//     .eq('user_journey_state_id', state.id)
//     .eq('step_id', node.id)
//     .eq('status', 'pending')
//     .single();

//   if (existingSchedule) {
//     console.log('  [Processor] Wait already scheduled, skipping');
//     return;
//   }

//   const waitMode = node.data.mode || 'duration';

//   if (waitMode === 'duration') {
//     const durationSeconds = node.data.duration || 86400;
//     const executeAt = new Date(Date.now() + durationSeconds * 1000);

//     console.log(`  [Processor] Scheduling wait for ${durationSeconds}s until ${executeAt.toISOString()}`);

//     await supabase
//       .from('user_journey_states')
//       .update({
//         status: 'waiting',
//         next_execution_at: executeAt.toISOString(),
//       })
//       .eq('id', state.id);

//     const { data: scheduledStep, error: scheduleError } = await supabase
//       .from('scheduled_journey_steps')
//       .insert({
//         user_journey_state_id: state.id,
//         step_id: node.id,
//         execute_at: executeAt.toISOString(),
//         status: 'pending',
//         payload: { 
//           mode: 'duration',
//           step_type: 'wait_duration'
//         },
//       })
//       .select()
//       .single();

//     if (scheduleError) {
//       throw scheduleError;
//     }

//     console.log(` [Processor] Step scheduled: ${scheduledStep.id}`);

//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       'wait_started',
//       { 
//         duration_seconds: durationSeconds, 
//         until: executeAt.toISOString(),
//         scheduled_step_id: scheduledStep.id 
//       },
//       node.id
//     );

//   } else if (waitMode === 'until_event') {
//     const eventName = node.data.event?.name || node.data.event_name;
//     const timeoutSeconds = node.data.timeout_seconds || 604800;
//     const timeoutAt = new Date(Date.now() + timeoutSeconds * 1000);

//     console.log(` [Processor] Waiting for event "${eventName}" (timeout: ${timeoutAt.toISOString()})`);

//     await supabase
//       .from('user_journey_states')
//       .update({
//         status: 'waiting',
//         next_execution_at: timeoutAt.toISOString(),
//         context: {
//           ...state.context,
//           waiting_for_event: eventName,
//         },
//       })
//       .eq('id', state.id);

//     const { data: scheduledStep, error: scheduleError } = await supabase
//       .from('scheduled_journey_steps')
//       .insert({
//         user_journey_state_id: state.id,
//         step_id: node.id,
//         execute_at: timeoutAt.toISOString(),
//         status: 'pending',
//         payload: { 
//           mode: 'event_timeout',
//           event_name: eventName,
//           step_type: 'wait_event_timeout'
//         },
//       })
//       .select()
//       .single();

//     if (scheduleError) {
//       throw scheduleError;
//     }

//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       'wait_for_event_started',
//       { 
//         event_name: eventName, 
//         timeout: timeoutAt.toISOString(),
//         scheduled_step_id: scheduledStep.id 
//       },
//       node.id
//     );
//   }
// }

// Add this import at the top

// Replace the processWaitNode function using queues now:
async function processWaitNode(
  state: JourneyState,
  node: JourneyNode,
  flowDefinition: FlowDefinition
): Promise<void> {
  console.log(' [Processor] Processing wait node');

  const { data: freshState } = await supabase
    .from('user_journey_states')
    .select('status, next_execution_at')
    .eq('id', state.id)
    .single();

  if (freshState?.next_execution_at) {
    const waitUntil = new Date(freshState.next_execution_at);
    const now = new Date();

    if (now >= waitUntil) {
      console.log('[Processor] Wait period completed');
      await moveToNextNode(state, flowDefinition, node.id);
      return;
    }
  }

  // Check if already scheduled
  const { data: existingSchedule } = await supabase
    .from('scheduled_journey_steps')
    .select('id')
    .eq('user_journey_state_id', state.id)
    .eq('step_id', node.id)
    .eq('status', 'pending')
    .single();

  if (existingSchedule) {
    console.log('  [Processor] Wait already scheduled');
    return;
  }

  const waitMode = node.data.mode || 'duration';

  if (waitMode === 'duration') {
    const durationSeconds = node.data.duration || 86400;
    const executeAt = new Date(Date.now() + durationSeconds * 1000);

    console.log(` [Processor] Scheduling wait: ${durationSeconds}s`);

    // Update journey state
    await supabase
      .from('user_journey_states')
      .update({
        status: 'waiting',
        next_execution_at: executeAt.toISOString(),
      })
      .eq('id', state.id);

    // Create database record
    const { data: scheduledStep, error: scheduleError } = await supabase
      .from('scheduled_journey_steps')
      .insert({
        user_journey_state_id: state.id,
        step_id: node.id,
        execute_at: executeAt.toISOString(),
        status: 'pending',
        payload: {
          mode: 'duration',
          step_type: 'wait_duration'
        },
      })
      .select()
      .single();

    if (scheduleError) {
      throw scheduleError;
    }

    //  Schedule in BullMQ
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
        }
      );

      console.log(` [Processor] Job queued: wait-${scheduledStep.id}`);
    } catch (queueError: any) {
      console.error('[Processor] Queue error:', queueError.message);
      // Fallback: mark for manual processing
      await supabase
        .from('scheduled_journey_steps')
        .update({
          status: 'pending',
          error: `Queue failed: ${queueError.message}`
        })
        .eq('id', scheduledStep.id);
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

  } else if (waitMode === 'until_event') {
    const eventName = node.data.event?.name || node.data.event_name;
    const timeoutSeconds = node.data.timeout_seconds || 604800;
    const timeoutAt = new Date(Date.now() + timeoutSeconds * 1000);

    console.log(`[Processor] Waiting for event: ${eventName}`);

    await supabase
      .from('user_journey_states')
      .update({
        status: 'waiting',
        next_execution_at: timeoutAt.toISOString(),
        context: {
          ...state.context,
          waiting_for_event: eventName,
        },
      })
      .eq('id', state.id);

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
          step_type: 'wait_event_timeout'
        },
      })
      .select()
      .single();

    // Schedule timeout in queue
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
    } catch (queueError: any) {
      console.error('[Processor] Queue error:', queueError.message);
    }

    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      'wait_for_event_started',
      {
        event_name: eventName,
        timeout: timeoutAt.toISOString(),
        scheduled_step_id: scheduledStep!.id
      },
      node.id
    );
  }
}

async function processConditionNode(
  state: JourneyState,
  node: JourneyNode,
  flowDefinition: FlowDefinition
): Promise<void> {
  console.log(' [Processor] Processing condition');

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
        console.warn(` [Processor] Unknown condition type: ${conditionType}`);
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
    console.error(' [Processor] Condition error:', error.message);

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
    console.warn(' [Processor] No branches defined, completing journey');
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

  console.log(` [Processor] Selected branch: ${selectedBranch.id} (${selectedBranch.name})`);

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
    console.warn(' [Processor] No edge found for selected branch');
    await completeJourney(state.id);
  }
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
    console.log(`  [Processor] Moving to next node: ${nextNodeId}`);

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

async function completeJourney(journeyStateId: string): Promise<void> {
  console.log(' [Processor] Completing journey:', journeyStateId);

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

    await supabase.rpc('increment', {
      table_name: 'journeys',
      column_name: 'total_completed',
      row_id: state.journey_id,
    });

    await supabase.rpc('decrement', {
      table_name: 'journeys',
      column_name: 'total_active',
      row_id: state.journey_id,
    });

    console.log(' [Processor] Journey completed successfully');

  } catch (error: any) {
    console.error(' [Processor] Error completing journey:', error.message);
  }
}

async function exitJourney(journeyStateId: string, reason: string): Promise<void> {
  console.log(' [Processor] Exiting journey:', journeyStateId, 'Reason:', reason);

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

    await supabase.rpc('increment', {
      table_name: 'journeys',
      column_name: 'total_exited',
      row_id: state.journey_id,
    });

    await supabase.rpc('decrement', {
      table_name: 'journeys',
      column_name: 'total_active',
      row_id: state.journey_id,
    });

    console.log(' [Processor] Journey exited successfully');

  } catch (error: any) {
    console.error(' [Processor] Error exiting journey:', error.message);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

// async function checkReEntryRules(subscriberId: string, journey: any): Promise<boolean> {
//   //  FIX: Properly type the re_entry_settings JSON field
//   const reEntrySettings = (journey.re_entry_settings as any) || {};
//   const allowReEntry = reEntrySettings.allow_re_entry || false;

//   const { data: states } = await supabase
//     .from('user_journey_states')
//     .select('*')
//     .eq('subscriber_id', subscriberId)
//     .eq('journey_id', journey.id)
//     .order('entered_at', { ascending: false });

//   if (!states || states.length === 0) {
//     return true;
//   }

//   const activeState = states.find(s => s.status === 'active' || s.status === 'waiting');
//   if (activeState) {
//     console.log(' [Processor] Already active in journey');
//     return false;
//   }

//   if (!allowReEntry) {
//     console.log(' [Processor] Re-entry not allowed');
//     return false;
//   }

//   const maxEntries = reEntrySettings.max_entries || 0;
//   if (maxEntries > 0 && states.length >= maxEntries) {
//     console.log(` [Processor] Max entries (${maxEntries}) reached`);
//     return false;
//   }

//   const cooldownDays = reEntrySettings.cooldown_days || 0;
//   if (cooldownDays > 0 && states.length > 0 && states[0].entered_at) {
//     const lastEntry = new Date(states[0].entered_at);
//     const daysSince = (Date.now() - lastEntry.getTime()) / (1000 * 60 * 60 * 24);

//     if (daysSince < cooldownDays) {
//       console.log(` [Processor] Cooldown period (${cooldownDays} days) not met`);
//       return false;
//     }
//   }

//   return true;
// }

export async function handleSubscriberEvent(
  subscriberId: string,
  eventName: string,
  eventData: any = {}
): Promise<void> {
  console.log(' [Processor] Handling subscriber event:', { subscriberId, eventName });

  try {
    const { data: waitingStates } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('subscriber_id', subscriberId)
      .eq('status', 'waiting')
      .contains('context', { waiting_for_event: eventName });

    if (!waitingStates || waitingStates.length === 0) {
      console.log('[Processor] No waiting states for this event');
      return;
    }

    console.log(` [Processor] Found ${waitingStates.length} waiting state(s)`);

    for (const stateData of waitingStates) {
      const state = toJourneyState(stateData);

      await supabase
        .from('scheduled_journey_steps')
        .update({ status: 'cancelled' })
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
            received_event_data: eventData
          }
        })
        .eq('id', state.id);

      await logJourneyEvent(
        state.journey_id,
        state.subscriber_id,
        state.id,
        'event_received',
        { event_name: eventName, event_data: eventData },
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
          await moveToNextNode(state, flowDefinition, currentNode.id);
        }
      }
    }

  } catch (error: any) {
    console.error(' [Processor] Error handling event:', error.message);
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

