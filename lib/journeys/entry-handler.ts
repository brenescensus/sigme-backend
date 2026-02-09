// backend/lib/journeys/entry-handler.ts - 

import { createClient } from '@supabase/supabase-js';
import { journeyProcessor } from './processor';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface TrackedEvent {
  subscriber_id: string;
  website_id: string;
  event_name: string;
  event_data?: any;
  timestamp: string;
}

class JourneyEntryHandler {
  //  Per-journey cooldown (not global)
  private enrollmentCache = new Map<string, number>();
  private readonly ENROLLMENT_COOLDOWN_MS = 5000; // 5 seconds per journey
  
  // 🔥 Track page sessions per journey
  private pageSessionCache = new Map<string, string>();

  async handleEvent(event: TrackedEvent): Promise<void> {
    console.log(`[JourneyEntry] Handling event: ${event.event_name}`);

    try {
      // 1. Check for journey entries (allows multiple)
      await this.checkJourneyEntries(event);

      // 2. Advance waiting journeys
      await journeyProcessor.handleSubscriberEvent(
        event.subscriber_id,
        event.event_name,
        event.event_data
      );

      // 3. Process due steps (debounced)
      setTimeout(() => {
        journeyProcessor.processDueSteps().catch(console.error);
      }, 100);
    } catch (error) {
      console.error('[JourneyEntry] ✗ Error:', error);
    }
  }

  // 🔥 Per-journey cooldown
  private canEnroll(subscriberId: string, journeyId: string): boolean {
    const cacheKey = `${subscriberId}:${journeyId}`;
    const lastEnrollment = this.enrollmentCache.get(cacheKey);
    const now = Date.now();

    if (lastEnrollment && (now - lastEnrollment) < this.ENROLLMENT_COOLDOWN_MS) {
      console.log(`[JourneyEntry] ⏸️  Cooldown active for ${cacheKey} (${this.ENROLLMENT_COOLDOWN_MS}ms)`);
      return false;
    }

    this.enrollmentCache.set(cacheKey, now);
    
    // Clean old entries
    if (this.enrollmentCache.size > 1000) {
      const oldestAllowed = now - this.ENROLLMENT_COOLDOWN_MS;
      for (const [key, timestamp] of this.enrollmentCache.entries()) {
        if (timestamp < oldestAllowed) {
          this.enrollmentCache.delete(key);
        }
      }
    }

    return true;
  }

  private async checkJourneyEntries(event: TrackedEvent): Promise<void> {
    const { data: journeys } = await supabase
      .from('journeys')
      .select('*')
      .eq('website_id', event.website_id)
      .eq('status', 'active');

    if (!journeys || journeys.length === 0) {
      console.log('[JourneyEntry] No active journeys for this website');
      return;
    }

    console.log(`[JourneyEntry] Found ${journeys.length} active journey(s)`);

    // 🔥 CRITICAL: Process ALL journeys (don't stop on first match)
    for (const journey of journeys) {
      try {
        const entryTrigger = journey.entry_trigger as any;
        
        if (!this.doesEventMatchTrigger(entryTrigger, event)) {
          continue; // Skip THIS journey, check OTHERS
        }

        // 🔥 FIX: Pre-validate scroll depth
        if (entryTrigger.type === 'scroll_depth') {
          const requiredPercentage = entryTrigger.event_config?.percentage || 
                                      entryTrigger.percentage || 0;
          const actualPercentage = event.event_data?.percentage || 0;
          
          if (actualPercentage < requiredPercentage) {
            console.log(`[JourneyEntry] ⏭️  Scroll ${actualPercentage}% < required ${requiredPercentage}% for ${journey.name}`);
            continue; // Skip THIS journey, check OTHERS
          }
        }

        // 🔥 FIX: Pre-validate time threshold
        if (entryTrigger.type === 'time_on_page') {
          const threshold = entryTrigger.event_config?.threshold_seconds ||
                           entryTrigger.threshold_seconds ||
                           entryTrigger.seconds || 0;
          const actualTime = event.event_data?.seconds || 0;
          
          if (actualTime < threshold) {
            console.log(`[JourneyEntry] ⏭️  Time ${actualTime}s < required ${threshold}s for ${journey.name}`);
            continue; // Skip THIS journey, check OTHERS
          }
        }

        // Check per-journey cooldown
        if (!this.canEnroll(event.subscriber_id, journey.id)) {
          console.log(`[JourneyEntry] ⏸️  Skipping ${journey.name} - cooldown active`);
          continue; // Skip THIS journey, check OTHERS
        }

        // Check page session for time_on_page
        if (entryTrigger.type === 'time_on_page') {
          const sessionKey = `${event.subscriber_id}:${journey.id}`;
          const currentSessionId = event.event_data?.session_id || event.event_data?.page_id || '';
          const lastSessionId = this.pageSessionCache.get(sessionKey);

          if (lastSessionId && lastSessionId === currentSessionId) {
            console.log(`[JourneyEntry] ⏭️  Already enrolled in ${journey.name} for this page session`);
            continue; // Skip THIS journey, check OTHERS
          }

          // Check if currently in THIS journey
          const { data: states } = await supabase
            .from('user_journey_states')
            .select('status, entered_at, completed_at')
            .eq('subscriber_id', event.subscriber_id)
            .eq('journey_id', journey.id) // 🔥 Check THIS journey only
            .order('entered_at', { ascending: false })
            .limit(1);

          if (states && states.length > 0) {
            const state = states[0];
            
            if (state.status === 'active' || state.status === 'waiting') {
              console.log(`[JourneyEntry] ⚠️  Already in journey: ${journey.name} (${state.status})`);
              continue; // Skip THIS journey, check OTHERS
            }

            if (state.status === 'completed' && state.completed_at) {
              const completedAt = new Date(state.completed_at).getTime();
              const timeSinceCompletion = Date.now() - completedAt;
              
              if (timeSinceCompletion < 60000) { // 60 seconds
                console.log(`[JourneyEntry] 🕒 Recently completed ${journey.name} (${Math.round(timeSinceCompletion/1000)}s ago)`);
                this.pageSessionCache.set(sessionKey, currentSessionId);
                continue; // Skip THIS journey, check OTHERS
              }
            }
          }

          this.pageSessionCache.set(sessionKey, currentSessionId);
        }

        // Try to enroll in THIS journey
        await journeyProcessor.enrollSubscriber(
          journey.id,
          event.subscriber_id,
          {
            event: event.event_name,
            event_data: event.event_data,
            timestamp: event.timestamp,
          }
        );

        console.log(`[JourneyEntry] ✓ Enrolled in journey: ${journey.name}`);

      } catch (error: any) {
        // Don't stop processing other journeys
        if (error.message.includes('cannot re-enter') || 
            error.message.includes('already enrolled') ||
            error.message.includes('Already in journey')) {
          console.log(`[JourneyEntry] ℹ️  Skipped ${journey.name}: ${error.message}`);
        } else {
          console.error(`[JourneyEntry] ✗ Error enrolling in ${journey.name}:`, error.message);
        }
        continue; // 🔥 CRITICAL: Continue to next journey
      }
    }
  }

  private doesEventMatchTrigger(trigger: any, event: TrackedEvent): boolean {
    if (trigger.type === 'manual') {
      return false;
    }

    if (trigger.type === 'event') {
      const targetEvent = trigger.event_name || trigger.event?.name;
      return event.event_name === targetEvent;
    }

    switch (trigger.type) {
      case 'time_on_page':
        return event.event_name === 'time_on_page';
      case 'scroll_depth':
        return event.event_name === 'scroll_depth';
      case 'page_abandonment':
        return event.event_name === 'page_abandoned';
      case 'page_landing':
      case 'page_landed':
        return event.event_name === 'page_landed';
      case 'link_interaction':
        return event.event_name === 'link_clicked';
      case 'cart_abandoned':
        return event.event_name === 'cart_abandoned';
      // case 'product_purchased':
      //   return event.event_name === 'product_purchased';
      case 'form_started':
        return event.event_name === 'form_started';
      case 'form_submitted':
        return event.event_name === 'form_submitted';
      default:
        return true;
    }
  }
}

export const journeyEntryHandler = new JourneyEntryHandler();

export async function trackEventWithJourneys(
  event: TrackedEvent
): Promise<void> {
  await journeyEntryHandler.handleEvent(event);
}