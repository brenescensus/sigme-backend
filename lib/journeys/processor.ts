// backend/lib/journeys/processor.ts
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface JourneyStep {
  id: string;
  type: 'send_notification' | 'delay' | 'wait_for_event' | 'condition' | 'split';
  config: {
    title?: string;
    body?: string;
    click_url?: string;
    icon_url?: string;
    delay_value?: number;
    delay_unit?: 'minutes' | 'hours' | 'days';
    event_name?: string;
    timeout_value?: number;
    timeout_unit?: 'minutes' | 'hours' | 'days';
    condition?: {
      field: string;
      operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
      value: any;
    };
  };
  next_step_id?: string;
  fallback_step_id?: string;
}

class JourneyProcessor {
  private processing = false;
  private lastProcessTime = 0;
  private MIN_PROCESS_INTERVAL = 5000; // 5 seconds between runs

  async processDueSteps(): Promise<void> {
    // Prevent concurrent processing
    if (this.processing) {
      console.log('[JourneyProcessor] Already processing, skipping');
      return;
    }

    // Rate limiting
    const now = Date.now();
    if (now - this.lastProcessTime < this.MIN_PROCESS_INTERVAL) {
      console.log('[JourneyProcessor] Too soon since last run, skipping');
      return;
    }

    this.processing = true;
    this.lastProcessTime = now;

    try {
      console.log('[JourneyProcessor] Starting processing run');



      const { data: dueSteps, error } = await supabase
        .from('scheduled_journey_steps')
        .select(`
    *,
    user_journey_state:user_journey_states!scheduled_journey_steps_user_journey_state_id_fkey(*)
  `)
        .eq('status', 'pending')
        .lte('execute_at', new Date().toISOString())
        .order('execute_at', { ascending: true })
        .limit(50);

      if (error) throw error;

      console.log(`[JourneyProcessor] Found ${dueSteps?.length || 0} due steps`);

      for (const scheduledStep of dueSteps || []) {
        await this.executeScheduledStep(scheduledStep);
      }
    } catch (error) {
      console.error('[JourneyProcessor] Error:', error);
    } finally {
      this.processing = false;
    }
  }

  private async executeScheduledStep(scheduledStep: any): Promise<void> {
    const { id, user_journey_state_id, step_id, payload } = scheduledStep;

    try {
      console.log(`[JourneyProcessor] Executing step ${step_id}`);

      // Mark as executing
      await supabase
        .from('scheduled_journey_steps')
        .update({ status: 'executing' })
        .eq('id', id)
        .eq('status', 'pending'); // Only if still pending

      // Get journey state
      const { data: journeyState } = await supabase
        .from('user_journey_states')
        .select(`
          *,
          journey:journeys(*)
        `)
        .eq('id', user_journey_state_id)
        .single();

      if (!journeyState) {
        throw new Error('Journey state not found');
      }

      // Find the step in journey definition
      const journey = journeyState.journey;
      const step = journey.flow_definition.nodes.find(
        (n: any) => n.id === step_id
      );

      if (!step) {
        throw new Error(`Step ${step_id} not found in journey`);
      }

      // Execute the step
      await this.executeStep(journeyState, step, payload);

      // Mark as completed
      await supabase
        .from('scheduled_journey_steps')
        .update({
          status: 'completed',
          executed_at: new Date().toISOString(),
        })
        .eq('id', id);

      // Move to next step
      await this.advanceJourney(journeyState, step);

    } catch (error: any) {
      console.error(`[JourneyProcessor] Failed step ${id}:`, error);

      await supabase
        .from('scheduled_journey_steps')
        .update({
          status: 'failed',
          payload: { ...payload, error: error.message },
        })
        .eq('id', id);
    }
  }

  private async executeStep(
    journeyState: any,
    step: any,
    payload?: any
  ): Promise<void> {
    const stepType = step.type || step.data?.type;

    console.log(`[JourneyProcessor] Executing ${stepType} step`);

    switch (stepType) {
      case 'send_notification':
        await this.executeSendNotification(journeyState, step);
        break;

      case 'delay':
        console.log('[JourneyProcessor] Delay step completed');
        break;

      case 'wait_for_event':
        await this.executeWaitForEvent(journeyState, step);
        break;

      case 'condition':
        await this.executeCondition(journeyState, step);
        break;

      case 'split':
        await this.executeSplit(journeyState, step);
        break;

      default:
        console.warn(`[JourneyProcessor] Unknown step type: ${stepType}`);
    }

    // Log event
    await supabase.from('journey_events').insert({
      journey_id: journeyState.journey_id,
      subscriber_id: journeyState.subscriber_id,
      user_journey_state_id: journeyState.id,
      step_id: step.id,
      event_type: 'step_executed',
      metadata: { step_type: stepType },
    });
  }

  private async executeSendNotification(
    journeyState: any,
    step: any
  ): Promise<void> {
    const config = step.config || step.data?.config || {};
    const { title, body, click_url, icon_url } = config;

    // Get subscriber
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', journeyState.subscriber_id)
      .single();

    if (!subscriber || !subscriber.endpoint) {
      console.log('[JourneyProcessor] Subscriber has no valid subscription');
      return;
    }

    // Get website VAPID keys
    const { data: website } = await supabase
      .from('websites')
      .select('vapid_public_key, vapid_private_key')
      .eq('id', journeyState.journey.website_id)
      .single();

    if (!website?.vapid_public_key || !website?.vapid_private_key) {
      throw new Error('Website VAPID keys not configured');
    }

    // Set VAPID details
    webpush.setVapidDetails(
      'mailto:support@yourapp.com',
      website.vapid_public_key,
      website.vapid_private_key
    );

    // Build push subscription
    const pushSubscription = {
      endpoint: subscriber.endpoint,
      keys: {
        p256dh: subscriber.p256dh_key,
        auth: subscriber.auth_key,
      },
    };

    // Send notification
    const payload = JSON.stringify({
      title: title || 'Notification',
      body: body || '',
      icon: icon_url,
      data: {
        url: click_url,
        journey_id: journeyState.journey_id,
      },
    });

    try {
      await webpush.sendNotification(pushSubscription, payload);
      console.log('[JourneyProcessor] Notification sent successfully');

      // Log notification
      await supabase.from('notification_logs').insert({
        website_id: journeyState.journey.website_id,
        subscriber_id: subscriber.id,
        status: 'delivered',
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('[JourneyProcessor] Failed to send notification:', error);

      await supabase.from('notification_logs').insert({
        website_id: journeyState.journey.website_id,
        subscriber_id: subscriber.id,
        status: 'failed',
        error_message: error.message,
        sent_at: new Date().toISOString(),
      });

      throw error;
    }
  }

  private async executeWaitForEvent(
    journeyState: any,
    step: any
  ): Promise<void> {
    const config = step.config || step.data?.config || {};
    const { event_name, timeout_value = 24, timeout_unit = 'hours' } = config;

    // Calculate timeout
    const timeoutMs = this.calculateDelay(timeout_value, timeout_unit);
    const timeoutAt = new Date(Date.now() + timeoutMs);

    // Update journey state to waiting
    await supabase
      .from('user_journey_states')
      .update({
        status: 'waiting',
        current_step_id: step.id,
        context: {
          ...journeyState.context,
          waiting_for_event: event_name,
          timeout_at: timeoutAt.toISOString(),
        },
      })
      .eq('id', journeyState.id);

    // Schedule timeout fallback
    const connections = journeyState.journey.flow_definition.edges || [];
    const fallbackEdge = connections.find(
      (e: any) => e.from === step.id && e.condition === 'timeout'
    );

    if (fallbackEdge) {
      await this.scheduleStep(
        journeyState.id,
        fallbackEdge.to,
        timeoutAt,
        { reason: 'timeout' }
      );
    }

    console.log(`[JourneyProcessor] Waiting for event: ${event_name}`);
  }

  private async executeCondition(
    journeyState: any,
    step: any
  ): Promise<void> {
    const config = step.config || step.data?.config || {};
    const { condition } = config;

    if (!condition) {
      console.warn('[JourneyProcessor] Condition config missing');
      return;
    }

    // Evaluate condition
    const result = await this.evaluateCondition(journeyState, condition);
    console.log(`[JourneyProcessor] Condition result: ${result}`);

    // Find next step based on result
    const connections = journeyState.journey.flow_definition.edges || [];
    const nextEdge = connections.find(
      (e: any) => e.from === step.id && e.condition === (result ? 'yes' : 'no')
    );

    if (nextEdge) {
      await supabase
        .from('user_journey_states')
        .update({ current_step_id: nextEdge.to })
        .eq('id', journeyState.id);
    }
  }

  private async executeSplit(journeyState: any, step: any): Promise<void> {
    // Random 50/50 split
    const takeMainBranch = Math.random() < 0.5;

    const connections = journeyState.journey.flow_definition.edges || [];
    const nextEdge = connections.find(
      (e: any) => e.from === step.id && e.condition === (takeMainBranch ? 'A' : 'B')
    );

    if (nextEdge) {
      await supabase
        .from('user_journey_states')
        .update({
          current_step_id: nextEdge.to,
          context: {
            ...journeyState.context,
            split_branch: takeMainBranch ? 'A' : 'B',
          },
        })
        .eq('id', journeyState.id);
    }

    console.log(`[JourneyProcessor] Split: ${takeMainBranch ? 'A' : 'B'}`);
  }

  private async advanceJourney(
    journeyState: any,
    currentStep: any
  ): Promise<void> {
    // Find next step connection
    const connections = journeyState.journey.flow_definition.edges || [];
    const nextEdge = connections.find(
      (e: any) => e.from === currentStep.id && !e.condition
    );

    if (!nextEdge) {
      // Journey complete
      await supabase
        .from('user_journey_states')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', journeyState.id);

      console.log('[JourneyProcessor] Journey completed');
      return;
    }

    const nextStep = journeyState.journey.flow_definition.nodes.find(
      (n: any) => n.id === nextEdge.to
    );

    if (!nextStep) {
      console.warn(`[JourneyProcessor] Next step ${nextEdge.to} not found`);
      return;
    }

    // Update current step
    await supabase
      .from('user_journey_states')
      .update({ current_step_id: nextStep.id })
      .eq('id', journeyState.id);

    const stepType = nextStep.type || nextStep.data?.type;

    // If delay, schedule it
    if (stepType === 'delay') {
      const config = nextStep.config || nextStep.data?.config || {};
      const { delay_value = 1, delay_unit = 'hours' } = config;
      const delayMs = this.calculateDelay(delay_value, delay_unit);
      const executeAt = new Date(Date.now() + delayMs);

      await this.scheduleStep(journeyState.id, nextStep.id, executeAt, {
        delay_value,
        delay_unit,
      });

      console.log(`[JourneyProcessor] Scheduled delay for ${executeAt}`);
    } else {
      // Execute immediately
      await this.executeStep(journeyState, nextStep);
      await this.advanceJourney(journeyState, nextStep);
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

  private async evaluateCondition(
    journeyState: any,
    condition: any
  ): Promise<boolean> {
    const value = journeyState.context?.[condition.field];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'contains':
        return String(value).includes(condition.value);
      case 'greater_than':
        return Number(value) > Number(condition.value);
      case 'less_than':
        return Number(value) < Number(condition.value);
      default:
        return false;
    }
  }

  private async scheduleStep(
    journeyStateId: string,
    stepId: string,
    executeAt: Date,
    payload: any
  ): Promise<void> {
    await supabase.from('scheduled_journey_steps').insert({
      user_journey_state_id: journeyStateId,
      step_id: stepId,
      execute_at: executeAt.toISOString(),
      status: 'pending',
      payload,
    });
  }
}

export const journeyProcessor = new JourneyProcessor();