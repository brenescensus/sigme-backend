// // backend/lib/journeys/entry-handler.ts
// import { createClient } from '@supabase/supabase-js';
// import { journeyProcessor } from './processor';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// );

// export interface TrackedEvent {
//   subscriber_id: string;
//   website_id: string;
//   event_name: string;
//   event_data?: any;
//   timestamp: string;
// }

// //  FIX: Add proper type definitions
// interface FlowNode {
//   id: string;
//   type: string;
//   position?: { x: number; y: number };
//   data?: any;
// }

// interface FlowEdge {
//   id?: string;
//   from: string;
//   to: string;
//   type?: string;
//   condition?: string;
//   branchId?: string;
// }

// interface FlowDefinition {
//   nodes: FlowNode[];
//   edges: FlowEdge[];
//   start_step_id?: string;
// }

// //  FIX: Add return type
// function parseFlowDefinition(data: any): FlowDefinition {
//   if (!data || typeof data !== 'object') {
//     console.warn('[JourneyEntry] Invalid flow definition, returning empty flow');
//     return { nodes: [], edges: [] };
//   }
//   return {
//     nodes: Array.isArray(data.nodes) ? data.nodes : [],
//     edges: Array.isArray(data.edges) ? data.edges : [],
//     start_step_id: data.start_step_id,
//   };
// }

// class JourneyEntryHandler {
//   async handleEvent(event: TrackedEvent): Promise<void> {
//     console.log(`[JourneyEntry] Handling event: ${event.event_name}`);

//     try {
//       // 1. Check for journey entries
//       await this.checkJourneyEntries(event);

//       // 2. Advance waiting journeys
//       await this.checkWaitingJourneys(event);

//       // 3. Process due steps
//       setTimeout(() => {
//         journeyProcessor.processDueSteps().catch(console.error);
//       }, 100);
//     } catch (error) {
//       console.error('[JourneyEntry] Error:', error);
//     }
//   }

//   // private async checkJourneyEntries(event: TrackedEvent): Promise<void> {
//   //   // Get active journeys for this website
//   //   const { data: journeys } = await supabase
//   //     .from('journeys')
//   //     .select('*')
//   //     .eq('website_id', event.website_id)
//   //     .eq('status', 'active');

//   //   if (!journeys) return;

//   //   for (const journey of journeys) {
//   //     const matches = await this.matchesEntryTrigger(journey, event);
      
//   //     if (matches) {
//   //       await this.enterJourney(event.subscriber_id, journey, event);
//   //     }
//   //   }
//   // }

//   // private async matchesEntryTrigger(journey: any, event: TrackedEvent): Promise<boolean> {
//   //   const trigger = journey.entry_trigger;

//   //   // 1. Check basic trigger type
//   //   if (trigger.type === 'event') {
//   //     if (trigger.event_name !== event.event_name) {
//   //       return false;
//   //     }
//   //   } else if (trigger.type === 'manual') {
//   //     return false;
//   //   }

//   //   // 2. Check segment filters
//   //   if (trigger.segment_filters && trigger.segment_filters.length > 0) {
//   //     const matchesSegments = await this.checkSegmentFilters(
//   //       event.subscriber_id,
//   //       trigger.segment_filters,
//   //       trigger.segment_logic || 'AND',
//   //       event.event_data
//   //     );

//   //     if (!matchesSegments) {
//   //       console.log(`[JourneyEntry] Subscriber ${event.subscriber_id} doesn't match segment filters for journey ${journey.name}`);
//   //       return false;
//   //     }

//   //     console.log(`[JourneyEntry] Subscriber ${event.subscriber_id} matches segment filters for journey ${journey.name}`);
//   //   }

//   //   // 3. Check re-entry rules
//   //   const canReEnter = await this.checkReEntryRules(
//   //     event.subscriber_id,
//   //     journey
//   //   );

//   //   if (!canReEnter) {
//   //     console.log(`[JourneyEntry] Subscriber ${event.subscriber_id} cannot re-enter journey ${journey.name}`);
//   //     return false;
//   //   }

//   //   return true;
//   // }

//   // lib/journeys/entry-handler.ts
// // lib/journeys/entry-handler.ts - Simplified approach

// private async checkJourneyEntries(event: TrackedEvent): Promise<void> {
//   // Get active journeys for this website
//   const { data: journeys } = await supabase
//     .from('journeys')
//     .select('*')
//     .eq('website_id', event.website_id)
//     .eq('status', 'active');

//   if (!journeys) return;

//   for (const journey of journeys) {
//     try {
//       //  SIMPLIFIED: Let processor handle EVERYTHING
//       // It checks: triggers, re-entry rules, segments, etc.
//       await journeyProcessor.enrollSubscriber(
//         journey.id,
//         event.subscriber_id,
//         {
//           event: event.event_name,
//           event_data: event.event_data,
//           timestamp: event.timestamp,
//         }
//       );
      
//       console.log(`[JourneyEntry]  Enrolled in journey: ${journey.name}`);
//     } catch (error: any) {
//       // Enrollment failed (trigger didn't match, re-entry blocked, etc.)
//       console.log(`[JourneyEntry]  Skipped journey ${journey.name}: ${error.message}`);
//     }
//   }
// }

// private async matchesEntryTrigger(journey: any, event: TrackedEvent): Promise<boolean> {
//   const trigger = journey.entry_trigger;

//   // 1. Basic event trigger
//   if (trigger.type === 'event') {
//     if (trigger.event_name !== event.event_name) {
//       return false;
//     }
//   } else if (trigger.type === 'manual') {
//     return false;
//   } 
//   //  NEW: Let processor handle advanced triggers
//   else if (['page_landing', 'scroll_depth', 'page_abandonment', 'time_on_page', 
//             'link_interaction', 'cart_abandoned', 'product_purchased', 
//             'device_filter', 'geography_filter'].includes(trigger.type)) {
    
//     // Let processor.enrollSubscriber() handle the advanced trigger check
//     // (It has checkAdvancedTrigger() built in)
//     return true; // ← Temporarily return true, let enrollSubscriber() validate
//   }

//   // 2. Check segment filters (keep existing logic)
//   if (trigger.segment_filters && trigger.segment_filters.length > 0) {
//     const matchesSegments = await this.checkSegmentFilters(
//       event.subscriber_id,
//       trigger.segment_filters,
//       trigger.segment_logic || 'AND',
//       event.event_data
//     );

//     if (!matchesSegments) {
//       console.log(`[JourneyEntry] Segment filters not matched for journey ${journey.name}`);
//       return false;
//     }
//   }

//   // 3. Check re-entry rules (keep existing logic)
//   const canReEnter = await this.checkReEntryRules(
//     event.subscriber_id,
//     journey
//   );

//   if (!canReEnter) {
//     console.log(`[JourneyEntry] Re-entry rules prevent enrollment`);
//     return false;
//   }

//   return true;
// }

//   private async checkSegmentFilters(
//     subscriberId: string,
//     filters: any[],
//     logic: 'AND' | 'OR',
//     eventData?: any
//   ): Promise<boolean> {
//     const { data: subscriber } = await supabase
//       .from('subscribers')
//       .select('*')
//       .eq('id', subscriberId)
//       .single();

//     if (!subscriber) return false;

//     const results = await Promise.all(
//       filters.map((filter: any) => this.evaluateFilter(subscriber, filter, eventData))
//     );

//     if (logic === 'AND') {
//       return results.every((r: boolean) => r === true);
//     } else {
//       return results.some((r: boolean) => r === true);
//     }
//   }

//   private async evaluateFilter(
//     subscriber: any,
//     filter: any,
//     eventData?: any
//   ): Promise<boolean> {
//     switch (filter.type) {
//       case 'url_path':
//         return this.evaluateUrlPathFilter(subscriber, filter, eventData);
      
//       case 'tag':
//         return this.evaluateTagFilter(subscriber, filter);
      
//       case 'attribute':
//         return this.evaluateAttributeFilter(subscriber, filter);
      
//       case 'behavior':
//         return await this.evaluateBehaviorFilter(subscriber, filter);
      
//       default:
//         console.warn(`[JourneyEntry] Unknown filter type: ${filter.type}`);
//         return false;
//     }
//   }

//   private evaluateUrlPathFilter(subscriber: any, filter: any, eventData?: any): boolean {
//     const urlPattern = filter.url_pattern?.toLowerCase() || '';
//     const matchType = filter.url_match_type || 'contains';

//     const currentUrl = (
//       eventData?.current_url ||
//       subscriber.custom_attributes?.last_visited_url ||
//       ''
//     ).toLowerCase();

//     if (!currentUrl) {
//       console.log('[JourneyEntry] No URL data available for URL filter');
//       return false;
//     }

//     switch (matchType) {
//       case 'exact':
//         return currentUrl === urlPattern;
//       case 'contains':
//         return currentUrl.includes(urlPattern);
//       case 'starts_with':
//         return currentUrl.startsWith(urlPattern);
//       default:
//         return false;
//     }
//   }

//   private evaluateTagFilter(subscriber: any, filter: any): boolean {
//     const subscriberTags = (subscriber.tags as string[]) || [];
//     const requiredTags = filter.tags || [];
//     const tagMatch = filter.tag_match || 'has_any';

//     if (requiredTags.length === 0) return true;

//     if (tagMatch === 'has_all') {
//       return requiredTags.every((tag: string) => subscriberTags.includes(tag));
//     } else {
//       return requiredTags.some((tag: string) => subscriberTags.includes(tag));
//     }
//   }

//   private evaluateAttributeFilter(subscriber: any, filter: any): boolean {
//     const attributes = subscriber.custom_attributes || {};
//     const key = filter.attribute_key;
//     const operator = filter.attribute_operator || 'equals';
//     const expectedValue = filter.attribute_value;

//     if (!key) return false;

//     const actualValue = attributes[key];

//     switch (operator) {
//       case 'equals':
//         return actualValue === expectedValue;
//       case 'not_equals':
//         return actualValue !== expectedValue;
//       case 'contains':
//         return String(actualValue || '').includes(String(expectedValue));
//       case 'greater_than':
//         return Number(actualValue) > Number(expectedValue);
//       case 'less_than':
//         return Number(actualValue) < Number(expectedValue);
//       case 'exists':
//         return actualValue !== undefined && actualValue !== null;
//       default:
//         return false;
//     }
//   }

//   private async evaluateBehaviorFilter(subscriber: any, filter: any): Promise<boolean> {
//     const behaviorType = filter.behavior?.type;

//     switch (behaviorType) {
//       case 'last_active':
//         return this.checkLastActive(subscriber, filter.behavior);
      
//       case 'signup_incomplete':
//         return subscriber.signup_completed === false;
      
//       case 'new_subscriber':
//         const daysSinceSignup = this.getDaysSince(subscriber.created_at);
//         return daysSinceSignup <= (filter.behavior?.timeframe_days || 7);
      
//       default:
//         return false;
//     }
//   }

//   private checkLastActive(subscriber: any, behaviorConfig: any): boolean {
//     if (!subscriber.last_active_at) return false;

//     const daysSinceActive = this.getDaysSince(subscriber.last_active_at);
//     const targetDays = behaviorConfig.timeframe_days || 7;
//     const comparison = behaviorConfig.comparison || 'within';

//     if (comparison === 'within') {
//       return daysSinceActive <= targetDays;
//     } else {
//       return daysSinceActive > targetDays;
//     }
//   }

//   private getDaysSince(dateString: string): number {
//     const date = new Date(dateString);
//     const now = new Date();
//     const diffMs = now.getTime() - date.getTime();
//     return Math.floor(diffMs / (1000 * 60 * 60 * 24));
//   }

//   private async checkReEntryRules(subscriberId: string, journey: any): Promise<boolean> {
//     const reEntrySettings = journey.re_entry_settings || {};
//     const allowReEntry = reEntrySettings.allow_re_entry || false;

//     const { data: states } = await supabase
//       .from('user_journey_states')
//       .select('*')
//       .eq('subscriber_id', subscriberId)
//       .eq('journey_id', journey.id)
//       .order('entered_at', { ascending: false });

//     if (!states || states.length === 0) {
//       return true;
//     }

//     const activeState = states.find((s: any) => s.status === 'active');
//     if (activeState) {
//       console.log('[JourneyEntry] Already active in journey');
//       return false;
//     }

//     if (!allowReEntry) {
//       console.log('[JourneyEntry] Re-entry not allowed');
//       return false;
//     }

//     const maxEntries = reEntrySettings.max_entries || 0;
//     if (maxEntries > 0 && states.length >= maxEntries) {
//       console.log(`[JourneyEntry] Max entries (${maxEntries}) reached`);
//       return false;
//     }

//     const cooldownDays = reEntrySettings.cooldown_days || 0;
//     if (cooldownDays > 0 && states.length > 0) {
//       const lastEntry = states[0];
//       const daysSinceLastEntry = this.getDaysSince(lastEntry.entered_at);
      
//       if (daysSinceLastEntry < cooldownDays) {
//         console.log(`[JourneyEntry] Cooldown period (${cooldownDays} days) not met`);
//         return false;
//       }
//     }

//     return true;
//   }

//   private async enterJourney(
//     subscriberId: string,
//     journey: any,
//     triggerEvent: TrackedEvent
//   ): Promise<void> {
//     console.log(`[JourneyEntry]  Entering subscriber into: ${journey.name}`);

//     const flowDefinition = parseFlowDefinition(journey.flow_definition);
    
//     //  FIX: Add type to find callback
//     const entryNode = flowDefinition.nodes.find((n: FlowNode) => n.type === 'entry');
//     const startNode = entryNode || flowDefinition.nodes[0];

//     if (!startNode) {
//       console.error('[JourneyEntry] No start step found');
//       return;
//     }

//     console.log(`[JourneyEntry] Start step: ${startNode.id} (${startNode.type})`);

//     const { data: journeyState, error } = await supabase
//       .from('user_journey_states')
//       .insert({
//         journey_id: journey.id,
//         subscriber_id: subscriberId,
//         current_step_id: startNode.id,
//         status: 'active',
//         entered_at: new Date().toISOString(),
//         context: {
//           entry_event: triggerEvent.event_name,
//           entry_data: triggerEvent.event_data,
//         },
//         node_history: [startNode.id],
//         last_processed_at: new Date().toISOString(),
//       })
//       .select()
//       .single();

//     if (error) {
//       console.error('[JourneyEntry] Failed to create state:', error);
//       return;
//     }

//     console.log(`[JourneyEntry]  Created journey state: ${journeyState.id}`);

//     // Update journey stats
//     await supabase.rpc('increment', {
//       table_name: 'journeys',
//       row_id: journey.id,
//       column_name: 'total_entered',
//     });

//     await supabase.rpc('increment', {
//       table_name: 'journeys',
//       row_id: journey.id,
//       column_name: 'total_active',
//     });

//     // Log entry event
//     await supabase.from('journey_events').insert({
//       journey_id: journey.id,
//       subscriber_id: subscriberId,
//       user_journey_state_id: journeyState.id,
//       event_type: 'journey_entered',
//       metadata: {
//         trigger_event: triggerEvent.event_name,
//       },
//     });

//     console.log('[JourneyEntry] Processing first step immediately...');
    
//     try {
//       if (startNode.type === 'entry') {
//         //  FIX: Add type to find callback
//         const nextEdge = flowDefinition.edges.find((e: FlowEdge) => e.from === startNode.id);
//         if (nextEdge) {
//           await supabase
//             .from('user_journey_states')
//             .update({ current_step_id: nextEdge.to })
//             .eq('id', journeyState.id);
          
//           await journeyProcessor.processJourneyStep(journeyState.id);
//         }
//       } else {
//         await journeyProcessor.processJourneyStep(journeyState.id);
//       }
      
//       console.log('[JourneyEntry]  First step processed');
//     } catch (error: any) {
//       console.error('[JourneyEntry]  First step failed:', error.message);
//     }
//   }

//   private async scheduleFirstStep(
//     journeyStateId: string,
//     stepId: string,
//     journey: any
//   ): Promise<void> {
//     //  FIX: Add type to find callback
//     const step = journey.flow_definition.nodes.find(
//       (n: any) => n.id === stepId
//     );

//     if (!step) {
//       console.error('[JourneyEntry] First step not found in flow');
//       return;
//     }

//     console.log(`[JourneyEntry]  Processing first step immediately: ${stepId} (${step.type})`);

//     try {
//       await journeyProcessor.processJourneyStep(journeyStateId);
//       console.log('[JourneyEntry]  First step processed successfully');
//     } catch (error: any) {
//       console.error('[JourneyEntry]  First step failed:', error.message);
//     }
//   }

//   private async checkWaitingJourneys(event: TrackedEvent): Promise<void> {
//     const { data: waitingStates } = await supabase
//       .from('user_journey_states')
//       .select(`
//         *,
//         journey:journeys(*)
//       `)
//       .eq('subscriber_id', event.subscriber_id)
//       .eq('status', 'waiting')
//       .contains('context', { waiting_for_event: event.event_name });

//     if (!waitingStates || waitingStates.length === 0) return;

//     console.log(`[JourneyEntry] Found ${waitingStates.length} waiting journeys`);

//     for (const state of waitingStates) {
//       await this.advanceWaitingJourney(state, event);
//     }
//   }

//   private async advanceWaitingJourney(
//     journeyState: any,
//     event: TrackedEvent
//   ): Promise<void> {
//     console.log(`[JourneyEntry] Advancing waiting journey: ${journeyState.id}`);

//     await supabase
//       .from('scheduled_journey_steps')
//       .delete()
//       .eq('user_journey_state_id', journeyState.id)
//       .eq('status', 'pending');

//     const currentStep = journeyState.journey.flow_definition.nodes.find(
//       (n: any) => n.id === journeyState.current_step_id
//     );

//     if (!currentStep || currentStep.type !== 'wait_for_event') {
//       console.warn('[JourneyEntry] Not in wait_for_event state');
//       return;
//     }

//     await supabase
//       .from('user_journey_states')
//       .update({
//         status: 'active',
//         context: {
//           ...journeyState.context,
//           waiting_for_event: null,
//           event_received: event.event_name,
//           event_data: event.event_data,
//         },
//       })
//       .eq('id', journeyState.id);

//     await supabase.from('journey_events').insert({
//       journey_id: journeyState.journey_id,
//       subscriber_id: journeyState.subscriber_id,
//       user_journey_state_id: journeyState.id,
//       event_type: 'event_received',
//       metadata: {
//         event_name: event.event_name,
//         event_data: event.event_data,
//       },
//     });

//     const connections = journeyState.journey.flow_definition.edges || [];
//     const nextEdge = connections.find(
//       (e: any) => e.from === currentStep.id && e.condition === 'success'
//     );

//     if (nextEdge) {
//       const nextStep = journeyState.journey.flow_definition.nodes.find(
//         (n: any) => n.id === nextEdge.to
//       );

//       if (nextStep) {
//         await supabase
//           .from('user_journey_states')
//           .update({ current_step_id: nextEdge.to })
//           .eq('id', journeyState.id);

//         await this.scheduleFirstStep(journeyState.id, nextEdge.to, journeyState.journey);
//       }
//     }
//   }

//   private calculateDelay(
//     value: number,
//     unit: 'minutes' | 'hours' | 'days'
//   ): number {
//     const multipliers = {
//       minutes: 60 * 1000,
//       hours: 60 * 60 * 1000,
//       days: 24 * 60 * 60 * 1000,
//     };
//     return value * multipliers[unit];
//   }
// }

// export const journeyEntryHandler = new JourneyEntryHandler();

// export async function trackEventWithJourneys(
//   event: TrackedEvent
// ): Promise<void> {
//   await journeyEntryHandler.handleEvent(event);
// }







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

interface FlowNode {
  id: string;
  type: string;
  position?: { x: number; y: number };
  data?: any;
}

interface FlowEdge {
  id?: string;
  from: string;
  to: string;
  type?: string;
  condition?: string;
  branchId?: string;
}

interface FlowDefinition {
  nodes: FlowNode[];
  edges: FlowEdge[];
  start_step_id?: string;
}

function parseFlowDefinition(data: any): FlowDefinition {
  if (!data || typeof data !== 'object') {
    console.warn('[JourneyEntry] Invalid flow definition, returning empty flow');
    return { nodes: [], edges: [] };
  }
  return {
    nodes: Array.isArray(data.nodes) ? data.nodes : [],
    edges: Array.isArray(data.edges) ? data.edges : [],
    start_step_id: data.start_step_id,
  };
}

class JourneyEntryHandler {
  async handleEvent(event: TrackedEvent): Promise<void> {
    console.log(`[JourneyEntry] Handling event: ${event.event_name}`);

    try {
      // 1. Check for journey entries
      await this.checkJourneyEntries(event);

      // 2. Advance waiting journeys (handled by processor now)
      await journeyProcessor.handleSubscriberEvent(
        event.subscriber_id,
        event.event_name,
        event.event_data
      );

      // 3. Process due steps
      setTimeout(() => {
        journeyProcessor.processDueSteps().catch(console.error);
      }, 100);
    } catch (error) {
      console.error('[JourneyEntry] ✗ Error:', error);
    }
  }

  // ✅ SIMPLIFIED: Let processor handle ALL validation
  private async checkJourneyEntries(event: TrackedEvent): Promise<void> {
    // Get active journeys for this website
    const { data: journeys } = await supabase
      .from('journeys')
      .select('*')
      .eq('website_id', event.website_id)
      .eq('status', 'active');

    if (!journeys) return;

    for (const journey of journeys) {
      try {
        // ✅ SIMPLIFIED: Let processor handle EVERYTHING
        // It checks: triggers, re-entry rules, segments, etc.
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
        // Enrollment failed (trigger didn't match, re-entry blocked, etc.)
        // This is expected behavior, not an error
        console.log(`[JourneyEntry] ℹ Skipped journey ${journey.name}: ${error.message}`);
      }
    }
  }
}

export const journeyEntryHandler = new JourneyEntryHandler();

export async function trackEventWithJourneys(
  event: TrackedEvent
): Promise<void> {
  await journeyEntryHandler.handleEvent(event);
}