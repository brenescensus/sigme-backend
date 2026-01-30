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

//   private async checkJourneyEntries(event: TrackedEvent): Promise<void> {
//     // Get active journeys for this website
//     const { data: journeys } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('website_id', event.website_id)
//       .eq('status', 'active');

//     if (!journeys) return;

//     for (const journey of journeys) {
//       if (this.matchesEntryTrigger(journey, event)) {
//         await this.enterJourney(event.subscriber_id, journey, event);
//       }
//     }
//   }

//   private matchesEntryTrigger(journey: any, event: TrackedEvent): boolean {
//     const trigger = journey.entry_trigger;

//     if (trigger.type === 'event') {
//       return trigger.event_name === event.event_name;
//     }

//     if (trigger.type === 'segment') {
//       // Implement segment matching
//       return true;
//     }

//     return false;
//   }

//   private async enterJourney(
//     subscriberId: string,
//     journey: any,
//     triggerEvent: TrackedEvent
//   ): Promise<void> {
//     console.log(`[JourneyEntry] Entering subscriber into: ${journey.name}`);

//     // Check if already in journey
//     const { data: existingState } = await supabase
//       .from('user_journey_states')
//       .select('id, status')
//       .eq('subscriber_id', subscriberId)
//       .eq('journey_id', journey.id)
//       .eq('status', 'active')
//       .maybeSingle();

//     if (existingState) {
//       console.log('[JourneyEntry] Already in this journey');
//       return;
//     }

//     // Get start step
//     const startStepId =
//       journey.flow_definition.start_step_id ||
//       journey.flow_definition.nodes?.[0]?.id;

//     if (!startStepId) {
//       console.error('[JourneyEntry] No start step found');
//       return;
//     }

//     // Create journey state
//     const { data: journeyState, error } = await supabase
//       .from('user_journey_states')
//       .insert({
//         journey_id: journey.id,
//         subscriber_id: subscriberId,
//         current_step_id: startStepId,
//         status: 'active',
//         entered_at: new Date().toISOString(),
//         context: {
//           entry_event: triggerEvent.event_name,
//           entry_data: triggerEvent.event_data,
//         },
//       })
//       .select()
//       .single();

//     if (error) {
//       console.error('[JourneyEntry] Failed to create state:', error);
//       return;
//     }

//     console.log(`[JourneyEntry] current_step_id Created journey state: ${journeyState.id}`);

//     // Update journey stats
//     await supabase.rpc('increment', {
//       table_name: 'journeys',
//       row_id: journey.id,
//       column_name: 'total_entered',
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

//     // current_step_id SCHEDULE THE FIRST STEP (this was missing!)
//     await this.scheduleFirstStep(journeyState.id, startStepId, journey);
//   }

//   private async scheduleFirstStep(
//     journeyStateId: string,
//     stepId: string,
//     journey: any
//   ): Promise<void> {
//     const step = journey.flow_definition.nodes.find(
//       (n: any) => n.id === stepId
//     );

//     if (!step) {
//       console.error('[JourneyEntry] First step not found in flow');
//       return;
//     }

//     const stepType = step.type || step.data?.type;
//     console.log(`[JourneyEntry] Scheduling first step: ${stepId} (${stepType})`);

//     // Calculate execution time based on step type
//     let executeAt = new Date(); // Default: execute immediately

//     if (stepType === 'delay' || stepType === 'wait') {
//       const config = { ...(step.data || {}), ...(step.data?.config || {}) };
      
//       let delayMs: number;
//       if (config.duration) {
//         delayMs = config.duration * 1000;
//       } else {
//         const { delay_value = 1, delay_unit = 'hours' } = config;
//         delayMs = this.calculateDelay(delay_value, delay_unit);
//       }
      
//       executeAt = new Date(Date.now() + delayMs);
//     }

//     // Insert into scheduled_journey_steps
//     const { error } = await supabase
//       .from('scheduled_journey_steps')
//       .insert({
//         user_journey_state_id: journeyStateId,
//         step_id: stepId,
//         execute_at: executeAt.toISOString(),
//         status: 'pending',
//         payload: {
//           first_step: true,
//           step_type: stepType,
//         },
//       });

//     if (error) {
//       console.error('[JourneyEntry] Failed to schedule first step:', error);
//       return;
//     }

//     console.log(`[JourneyEntry] current_step_id Scheduled first step for ${executeAt.toISOString()}`);

//     // Trigger immediate processing if step should execute now
//     if (executeAt <= new Date()) {
//       setTimeout(() => {
//         journeyProcessor.processDueSteps().catch(console.error);
//       }, 500);
//     }
//   }

//   private async checkWaitingJourneys(event: TrackedEvent): Promise<void> {
//     // Get journey states waiting for this event
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

//     console.log(
//       `[JourneyEntry] Found ${waitingStates.length} waiting journeys`
//     );

//     for (const state of waitingStates) {
//       await this.advanceWaitingJourney(state, event);
//     }
//   }

//   private async advanceWaitingJourney(
//     journeyState: any,
//     event: TrackedEvent
//   ): Promise<void> {
//     console.log(`[JourneyEntry] Advancing waiting journey: ${journeyState.id}`);

//     // Cancel scheduled timeout
//     await supabase
//       .from('scheduled_journey_steps')
//       .delete()
//       .eq('user_journey_state_id', journeyState.id)
//       .eq('status', 'pending');

//     // Get current step
//     const currentStep = journeyState.journey.flow_definition.nodes.find(
//       (n: any) => n.id === journeyState.current_step_id
//     );

//     if (!currentStep || currentStep.type !== 'wait_for_event') {
//       console.warn('[JourneyEntry] Not in wait_for_event state');
//       return;
//     }

//     // Update to active
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

//     // Log event
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

//     // Find next step
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

//         // Schedule the next step
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

// backend/lib/journeys/entry-handler.ts
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
  async handleEvent(event: TrackedEvent): Promise<void> {
    console.log(`[JourneyEntry] Handling event: ${event.event_name}`);

    try {
      // 1. Check for journey entries
      await this.checkJourneyEntries(event);

      // 2. Advance waiting journeys
      await this.checkWaitingJourneys(event);

      // 3. Process due steps
      setTimeout(() => {
        journeyProcessor.processDueSteps().catch(console.error);
      }, 100);
    } catch (error) {
      console.error('[JourneyEntry] Error:', error);
    }
  }

  private async checkJourneyEntries(event: TrackedEvent): Promise<void> {
    // Get active journeys for this website
    const { data: journeys } = await supabase
      .from('journeys')
      .select('*')
      .eq('website_id', event.website_id)
      .eq('status', 'active');

    if (!journeys) return;

    for (const journey of journeys) {
      // current_step_id Enhanced matching with segment filters
      const matches = await this.matchesEntryTrigger(journey, event);
      
      if (matches) {
        await this.enterJourney(event.subscriber_id, journey, event);
      }
    }
  }

  private async matchesEntryTrigger(journey: any, event: TrackedEvent): Promise<boolean> {
    const trigger = journey.entry_trigger;

    // 1. Check basic trigger type
    if (trigger.type === 'event') {
      if (trigger.event_name !== event.event_name) {
        return false;
      }
    } else if (trigger.type === 'manual') {
      return false; // Manual journeys don't auto-trigger
    }

    // 2. current_step_id CHECK SEGMENT FILTERS (NEW!)
    if (trigger.segment_filters && trigger.segment_filters.length > 0) {
      const matchesSegments = await this.checkSegmentFilters(
        event.subscriber_id,
        trigger.segment_filters,
        trigger.segment_logic || 'AND',
        event.event_data
      );

      if (!matchesSegments) {
        console.log(`[JourneyEntry] Subscriber ${event.subscriber_id} doesn't match segment filters for journey ${journey.name}`);
        return false;
      }

      console.log(`[JourneyEntry] current_step_id Subscriber ${event.subscriber_id} matches segment filters for journey ${journey.name}`);
    }

    // 3. current_step_id CHECK RE-ENTRY RULES (NEW!)
    const canReEnter = await this.checkReEntryRules(
      event.subscriber_id,
      journey
    );

    if (!canReEnter) {
      console.log(`[JourneyEntry] Subscriber ${event.subscriber_id} cannot re-enter journey ${journey.name}`);
      return false;
    }

    return true;
  }

  // current_step_id NEW: CHECK IF SUBSCRIBER MATCHES SEGMENT FILTERS
  private async checkSegmentFilters(
    subscriberId: string,
    filters: any[],
    logic: 'AND' | 'OR',
    eventData?: any
  ): Promise<boolean> {
    // Get subscriber data
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', subscriberId)
      .single();

    if (!subscriber) return false;

    const results = await Promise.all(
      filters.map(filter => this.evaluateFilter(subscriber, filter, eventData))
    );

    if (logic === 'AND') {
      return results.every(r => r === true);
    } else {
      return results.some(r => r === true);
    }
  }

  // current_step_id NEW: EVALUATE INDIVIDUAL FILTER
  private async evaluateFilter(
    subscriber: any,
    filter: any,
    eventData?: any
  ): Promise<boolean> {
    switch (filter.type) {
      case 'url_path':
        return this.evaluateUrlPathFilter(subscriber, filter, eventData);
      
      case 'tag':
        return this.evaluateTagFilter(subscriber, filter);
      
      case 'attribute':
        return this.evaluateAttributeFilter(subscriber, filter);
      
      case 'behavior':
        return await this.evaluateBehaviorFilter(subscriber, filter);
      
      default:
        console.warn(`[JourneyEntry] Unknown filter type: ${filter.type}`);
        return false;
    }
  }

  // current_step_id URL PATH FILTER
  private evaluateUrlPathFilter(subscriber: any, filter: any, eventData?: any): boolean {
    const urlPattern = filter.url_pattern?.toLowerCase() || '';
    const matchType = filter.url_match_type || 'contains';

    // Try to get URL from event data or subscriber attributes
    const currentUrl = (
      eventData?.current_url ||
      subscriber.custom_attributes?.last_visited_url ||
      ''
    ).toLowerCase();

    if (!currentUrl) {
      console.log('[JourneyEntry] No URL data available for URL filter');
      return false;
    }

    switch (matchType) {
      case 'exact':
        return currentUrl === urlPattern;
      case 'contains':
        return currentUrl.includes(urlPattern);
      case 'starts_with':
        return currentUrl.startsWith(urlPattern);
      default:
        return false;
    }
  }

  // current_step_id TAG FILTER
  private evaluateTagFilter(subscriber: any, filter: any): boolean {
    const subscriberTags = (subscriber.tags as string[]) || [];
    const requiredTags = filter.tags || [];
    const tagMatch = filter.tag_match || 'has_any';

    if (requiredTags.length === 0) return true;

    if (tagMatch === 'has_all') {
      return requiredTags.every((tag: string) => subscriberTags.includes(tag));
    } else {
      return requiredTags.some((tag: string) => subscriberTags.includes(tag));
    }
  }

  // current_step_id ATTRIBUTE FILTER
  private evaluateAttributeFilter(subscriber: any, filter: any): boolean {
    const attributes = subscriber.custom_attributes || {};
    const key = filter.attribute_key;
    const operator = filter.attribute_operator || 'equals';
    const expectedValue = filter.attribute_value;

    if (!key) return false;

    const actualValue = attributes[key];

    switch (operator) {
      case 'equals':
        return actualValue === expectedValue;
      case 'not_equals':
        return actualValue !== expectedValue;
      case 'contains':
        return String(actualValue || '').includes(String(expectedValue));
      case 'greater_than':
        return Number(actualValue) > Number(expectedValue);
      case 'less_than':
        return Number(actualValue) < Number(expectedValue);
      case 'exists':
        return actualValue !== undefined && actualValue !== null;
      default:
        return false;
    }
  }

  // current_step_id BEHAVIOR FILTER
  private async evaluateBehaviorFilter(subscriber: any, filter: any): Promise<boolean> {
    const behaviorType = filter.behavior?.type;

    switch (behaviorType) {
      case 'last_active':
        return this.checkLastActive(subscriber, filter.behavior);
      
      case 'signup_incomplete':
        return subscriber.signup_completed === false;
      
      case 'new_subscriber':
        const daysSinceSignup = this.getDaysSince(subscriber.created_at);
        return daysSinceSignup <= (filter.behavior?.timeframe_days || 7);
      
      default:
        return false;
    }
  }

  private checkLastActive(subscriber: any, behaviorConfig: any): boolean {
    if (!subscriber.last_active_at) return false;

    const daysSinceActive = this.getDaysSince(subscriber.last_active_at);
    const targetDays = behaviorConfig.timeframe_days || 7;
    const comparison = behaviorConfig.comparison || 'within';

    if (comparison === 'within') {
      return daysSinceActive <= targetDays;
    } else {
      return daysSinceActive > targetDays;
    }
  }

  private getDaysSince(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  // current_step_id NEW: CHECK RE-ENTRY RULES
  private async checkReEntryRules(subscriberId: string, journey: any): Promise<boolean> {
    const reEntrySettings = journey.re_entry_settings || {};
    const allowReEntry = reEntrySettings.allow_re_entry || false;

    // Get all journey states for this subscriber and journey
    const { data: states } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('subscriber_id', subscriberId)
      .eq('journey_id', journey.id)
      .order('entered_at', { ascending: false });

    if (!states || states.length === 0) {
      // First time entering
      return true;
    }

    // Check if already active in journey
    const activeState = states.find(s => s.status === 'active');
    if (activeState) {
      console.log('[JourneyEntry] Already active in journey');
      return false;
    }

    // If re-entry not allowed
    if (!allowReEntry) {
      console.log('[JourneyEntry] Re-entry not allowed');
      return false;
    }

    // Check max entries
    const maxEntries = reEntrySettings.max_entries || 0;
    if (maxEntries > 0 && states.length >= maxEntries) {
      console.log(`[JourneyEntry] Max entries (${maxEntries}) reached`);
      return false;
    }

    // Check cooldown period
    const cooldownDays = reEntrySettings.cooldown_days || 0;
    if (cooldownDays > 0 && states.length > 0) {
      const lastEntry = states[0];
      const daysSinceLastEntry = this.getDaysSince(lastEntry.entered_at);
      
      if (daysSinceLastEntry < cooldownDays) {
        console.log(`[JourneyEntry] Cooldown period (${cooldownDays} days) not met`);
        return false;
      }
    }

    return true;
  }

  private async enterJourney(
    subscriberId: string,
    journey: any,
    triggerEvent: TrackedEvent
  ): Promise<void> {
    console.log(`[JourneyEntry] Entering subscriber into: ${journey.name}`);

    // Get start step
    const startStepId =
      journey.flow_definition.start_step_id ||
      journey.flow_definition.nodes?.[0]?.id;

    if (!startStepId) {
      console.error('[JourneyEntry] No start step found');
      return;
    }

    // Create journey state
    const { data: journeyState, error } = await supabase
      .from('user_journey_states')
      .insert({
        journey_id: journey.id,
        subscriber_id: subscriberId,
        current_step_id: startStepId,
        status: 'active',
        entered_at: new Date().toISOString(),
        context: {
          entry_event: triggerEvent.event_name,
          entry_data: triggerEvent.event_data,
        },
          node_history: [], //  Add this
        last_processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[JourneyEntry] Failed to create state:', error);
      return;
    }

    console.log(`[JourneyEntry] current_step_id Created journey state: ${journeyState.id}`);

    // Update journey stats
    await supabase.rpc('increment', {
      table_name: 'journeys',
      row_id: journey.id,
      column_name: 'total_entered',
    });

    // Log entry event
    await supabase.from('journey_events').insert({
      journey_id: journey.id,
      subscriber_id: subscriberId,
      user_journey_state_id: journeyState.id,
      event_type: 'journey_entered',
      metadata: {
        trigger_event: triggerEvent.event_name,
      },
    });

    // Schedule the first step
    await this.scheduleFirstStep(journeyState.id, startStepId, journey);
  }

  private async scheduleFirstStep(
    journeyStateId: string,
    stepId: string,
    journey: any
  ): Promise<void> {
    const step = journey.flow_definition.nodes.find(
      (n: any) => n.id === stepId
    );

    if (!step) {
      console.error('[JourneyEntry] First step not found in flow');
      return;
    }

    const stepType = step.type || step.data?.type;
    console.log(`[JourneyEntry] Scheduling first step: ${stepId} (${stepType})`);

    let executeAt = new Date();

    if (stepType === 'delay' || stepType === 'wait') {
      const config = { ...(step.data || {}), ...(step.data?.config || {}) };
      
      let delayMs: number;
      if (config.duration) {
        delayMs = config.duration * 1000;
      } else {
        const { delay_value = 1, delay_unit = 'hours' } = config;
        delayMs = this.calculateDelay(delay_value, delay_unit);
      }
      
      executeAt = new Date(Date.now() + delayMs);
    }

    const { error } = await supabase
      .from('scheduled_journey_steps')
      .insert({
        user_journey_state_id: journeyStateId,
        step_id: stepId,
        execute_at: executeAt.toISOString(),
        status: 'pending',
        payload: {
          first_step: true,
          step_type: stepType,
        },
      });

    if (error) {
      console.error('[JourneyEntry] Failed to schedule first step:', error);
      return;
    }

    console.log(`[JourneyEntry] current_step_id Scheduled first step for ${executeAt.toISOString()}`);

    if (executeAt <= new Date()) {
      setTimeout(() => {
        journeyProcessor.processDueSteps().catch(console.error);
      }, 500);
    }
  }

  private async checkWaitingJourneys(event: TrackedEvent): Promise<void> {
    const { data: waitingStates } = await supabase
      .from('user_journey_states')
      .select(`
        *,
        journey:journeys(*)
      `)
      .eq('subscriber_id', event.subscriber_id)
      .eq('status', 'waiting')
      .contains('context', { waiting_for_event: event.event_name });

    if (!waitingStates || waitingStates.length === 0) return;

    console.log(`[JourneyEntry] Found ${waitingStates.length} waiting journeys`);

    for (const state of waitingStates) {
      await this.advanceWaitingJourney(state, event);
    }
  }

  private async advanceWaitingJourney(
    journeyState: any,
    event: TrackedEvent
  ): Promise<void> {
    console.log(`[JourneyEntry] Advancing waiting journey: ${journeyState.id}`);

    await supabase
      .from('scheduled_journey_steps')
      .delete()
      .eq('user_journey_state_id', journeyState.id)
      .eq('status', 'pending');

    const currentStep = journeyState.journey.flow_definition.nodes.find(
      (n: any) => n.id === journeyState.current_step_id
    );

    if (!currentStep || currentStep.type !== 'wait_for_event') {
      console.warn('[JourneyEntry] Not in wait_for_event state');
      return;
    }

    await supabase
      .from('user_journey_states')
      .update({
        status: 'active',
        context: {
          ...journeyState.context,
          waiting_for_event: null,
          event_received: event.event_name,
          event_data: event.event_data,
        },
      })
      .eq('id', journeyState.id);

    await supabase.from('journey_events').insert({
      journey_id: journeyState.journey_id,
      subscriber_id: journeyState.subscriber_id,
      user_journey_state_id: journeyState.id,
      event_type: 'event_received',
      metadata: {
        event_name: event.event_name,
        event_data: event.event_data,
      },
    });

    const connections = journeyState.journey.flow_definition.edges || [];
    const nextEdge = connections.find(
      (e: any) => e.from === currentStep.id && e.condition === 'success'
    );

    if (nextEdge) {
      const nextStep = journeyState.journey.flow_definition.nodes.find(
        (n: any) => n.id === nextEdge.to
      );

      if (nextStep) {
        await supabase
          .from('user_journey_states')
          .update({ current_step_id: nextEdge.to })
          .eq('id', journeyState.id);

        await this.scheduleFirstStep(journeyState.id, nextEdge.to, journeyState.journey);
      }
    }
  }

  private calculateDelay(
    value: number,
    unit: 'minutes' | 'hours' | 'days'
  ): number {
    const multipliers = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    };
    return value * multipliers[unit];
  }
}

export const journeyEntryHandler = new JourneyEntryHandler();

export async function trackEventWithJourneys(
  event: TrackedEvent
): Promise<void> {
  await journeyEntryHandler.handleEvent(event);
}