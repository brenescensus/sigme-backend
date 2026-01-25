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
      if (this.matchesEntryTrigger(journey, event)) {
        await this.enterJourney(event.subscriber_id, journey, event);
      }
    }
  }

  private matchesEntryTrigger(journey: any, event: TrackedEvent): boolean {
    const trigger = journey.entry_trigger;

    if (trigger.type === 'event') {
      return trigger.event_name === event.event_name;
    }

    if (trigger.type === 'segment') {
      // Implement segment matching
      return true;
    }

    return false;
  }

  private async enterJourney(
    subscriberId: string,
    journey: any,
    triggerEvent: TrackedEvent
  ): Promise<void> {
    console.log(`[JourneyEntry] Entering subscriber into: ${journey.name}`);

    // Check if already in journey
    const { data: existingState } = await supabase
      .from('user_journey_states')
      .select('id, status')
      .eq('subscriber_id', subscriberId)
      .eq('journey_id', journey.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existingState) {
      console.log('[JourneyEntry] Already in this journey');
      return;
    }

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
      })
      .select()
      .single();

    if (error) {
      console.error('[JourneyEntry] Failed to create state:', error);
      return;
    }

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

    // Start executing first step
    const firstStep = journey.flow_definition.nodes.find(
      (n: any) => n.id === startStepId
    );

    if (firstStep) {
      // Trigger processing for this journey
      setTimeout(() => {
        this.processJourneyState(journeyState.id).catch(console.error);
      }, 500);
    }
  }

  private async checkWaitingJourneys(event: TrackedEvent): Promise<void> {
    // Get journey states waiting for this event
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

    console.log(
      `[JourneyEntry] Found ${waitingStates.length} waiting journeys`
    );

    for (const state of waitingStates) {
      await this.advanceWaitingJourney(state, event);
    }
  }

  private async advanceWaitingJourney(
    journeyState: any,
    event: TrackedEvent
  ): Promise<void> {
    console.log(`[JourneyEntry] Advancing waiting journey: ${journeyState.id}`);

    // Cancel scheduled timeout
    await supabase
      .from('scheduled_journey_steps')
      .delete()
      .eq('user_journey_state_id', journeyState.id)
      .eq('status', 'pending');

    // Get current step
    const currentStep = journeyState.journey.flow_definition.nodes.find(
      (n: any) => n.id === journeyState.current_step_id
    );

    if (!currentStep || currentStep.type !== 'wait_for_event') {
      console.warn('[JourneyEntry] Not in wait_for_event state');
      return;
    }

    // Update to active
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

    // Log event
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

    // Find next step
    const connections = journeyState.journey.flow_definition.edges || [];
    const nextEdge = connections.find(
      (e: any) => e.from === currentStep.id && e.condition === 'success'
    );

    if (nextEdge) {
      await supabase
        .from('user_journey_states')
        .update({ current_step_id: nextEdge.to })
        .eq('id', journeyState.id);

      // Continue processing
      setTimeout(() => {
        this.processJourneyState(journeyState.id).catch(console.error);
      }, 500);
    }
  }

  private async processJourneyState(stateId: string): Promise<void> {
    // Get full state
    const { data: state } = await supabase
      .from('user_journey_states')
      .select(`
        *,
        journey:journeys(*)
      `)
      .eq('id', stateId)
      .single();

    if (!state || state.status !== 'active') return;

    const currentStep = state.journey.flow_definition.nodes.find(
      (n: any) => n.id === state.current_step_id
    );

    if (!currentStep) return;

    const stepType = currentStep.type || currentStep.data?.type;

    // If it's a delay step, schedule it
    if (stepType === 'delay') {
      const config = currentStep.config || currentStep.data?.config || {};
      const { delay_value = 1, delay_unit = 'hours' } = config;

      const delayMs = this.calculateDelay(delay_value, delay_unit);
      const executeAt = new Date(Date.now() + delayMs);

      await supabase.from('scheduled_journey_steps').insert({
        user_journey_state_id: stateId,
        step_id: currentStep.id,
        execute_at: executeAt.toISOString(),
        status: 'pending',
        payload: { delay_value, delay_unit },
      });

      console.log(
        `[JourneyEntry] Scheduled delay step for ${executeAt.toISOString()}`
      );
    } else {
      // For non-delay steps, trigger immediate processing
      journeyProcessor.processDueSteps().catch(console.error);
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