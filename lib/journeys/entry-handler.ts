// backend/lib/journeys/entry-handler.ts - FIXED VERSION
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
  // 🔥 CRITICAL FIX: Rate limiting per subscriber
  private enrollmentCache = new Map<string, number>();
  private readonly ENROLLMENT_COOLDOWN_MS = 5000; // 5 seconds
  
  // 🔥 NEW: Track page sessions to prevent re-enrollment on same page
  private pageSessionCache = new Map<string, string>(); // subscriberId:journeyId -> sessionId

  async handleEvent(event: TrackedEvent): Promise<void> {
    console.log(`[JourneyEntry] Handling event: ${event.event_name}`);

    try {
      // 1. Check for journey entries
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

  // 🔥 CRITICAL FIX: Prevent rapid re-enrollment
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
    // Get active journeys for this website
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

    for (const journey of journeys) {
      try {
        // 🔥 CRITICAL: Rate limit enrollments
        if (!this.canEnroll(event.subscriber_id, journey.id)) {
          console.log(`[JourneyEntry] ⏸️  Skipping ${journey.name} - cooldown active`);
          continue;
        }

        // 🔥 CRITICAL: Check if journey matches this event type
        const entryTrigger = journey.entry_trigger as any;
        
        // ✅ FIX: Check if event matches trigger type
        if (!this.doesEventMatchTrigger(entryTrigger, event)) {
          continue;
        }

        // 🔥 NEW: Check page session for time_on_page triggers
        if (entryTrigger.type === 'time_on_page') {
          const sessionKey = `${event.subscriber_id}:${journey.id}`;
          const currentSessionId = event.event_data?.session_id || event.event_data?.page_id || '';
          const lastSessionId = this.pageSessionCache.get(sessionKey);

          if (lastSessionId && lastSessionId === currentSessionId) {
            console.log(`[JourneyEntry] ⏭️  Already enrolled in ${journey.name} for this page session`);
            continue;
          }

          // Check if currently in journey or recently completed
          const { data: states } = await supabase
            .from('user_journey_states')
            .select('status, entered_at, completed_at')
            .eq('subscriber_id', event.subscriber_id)
            .eq('journey_id', journey.id)
            .order('entered_at', { ascending: false })
            .limit(1);

          if (states && states.length > 0) {
            const state = states[0];
            
            // If actively in journey, skip
            if (state.status === 'active' || state.status === 'waiting') {
              console.log(`[JourneyEntry] ⚠️  Already in journey: ${journey.name} (${state.status})`);
              continue;
            }

            // If recently completed (within last 60 seconds), skip
            if (state.status === 'completed' && state.completed_at) {
              const completedAt = new Date(state.completed_at).getTime();
              const timeSinceCompletion = Date.now() - completedAt;
              
              if (timeSinceCompletion < 60000) { // 60 seconds
                console.log(`[JourneyEntry] 🕒 Recently completed ${journey.name} (${Math.round(timeSinceCompletion/1000)}s ago)`);
                // Set page session to prevent re-enrollment
                this.pageSessionCache.set(sessionKey, currentSessionId);
                continue;
              }
            }
          }

          // Set page session for this enrollment attempt
          this.pageSessionCache.set(sessionKey, currentSessionId);
        }

        // Try to enroll
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
        // Expected - enrollment blocked by processor
        if (error.message.includes('cannot re-enter') || 
            error.message.includes('already enrolled') ||
            error.message.includes('Already in journey')) {
          console.log(`[JourneyEntry] ℹ Skipped ${journey.name}: ${error.message}`);
        } else {
          console.error(`[JourneyEntry] ✗ Error enrolling in ${journey.name}:`, error.message);
        }
      }
    }
  }

  // ✅ NEW: Comprehensive event-trigger matching
  private doesEventMatchTrigger(trigger: any, event: TrackedEvent): boolean {
    // Manual triggers don't match events
    if (trigger.type === 'manual') {
      return false;
    }

    // Event-based triggers
    if (trigger.type === 'event') {
      const targetEvent = trigger.event_name || trigger.event?.name;
      return event.event_name === targetEvent;
    }

    // ✅ Advanced triggers - match event name
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
      
      case 'product_purchased':
        return event.event_name === 'product_purchased';
      
      case 'form_started':
        return event.event_name === 'form_started';
      
      case 'form_submitted':
        return event.event_name === 'form_submitted';
      
      default:
        // Unknown trigger type - let processor handle validation
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