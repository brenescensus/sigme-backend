// // // // /backend/app/services/JourneyExecutor.ts

import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure web-push
webpush.setVapidDetails(
  'mailto:your-email@example.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface Journey {
  id: string;
  name: string;
  status: string;
  entry_trigger: {
    type: 'event' | 'segment';
    event_name?: string;
    segment_id?: string;
  };
  flow_definition: {
    nodes: FlowNode[];
    edges: FlowEdge[];
  };
  settings: any;
}

interface FlowNode {
  id: string;
  type: 'trigger' | 'notification' | 'delay' | 'condition' | 'exit';
  data: any;
  position?: { x: number; y: number };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface UserState {
  id: string;
  journey_id: string;
  subscriber_id: string;
  current_step_id: string;
  status: 'active' | 'completed' | 'exited';
  next_execution_at: Date | null;
  node_history: string[];
  metadata: any;
  entered_at: Date;
}

export class JourneyExecutor {
  /**
   * Main processing loop - run this on a cron schedule
   */
  async processActiveJourneys(): Promise<void> {
    console.log('[JourneyExecutor] Starting journey processing...');
    
    try {
      // 1. Get all active journeys
      const { data: journeys, error } = await supabase
        .from('journeys')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      if (!journeys || journeys.length === 0) {
        console.log('[JourneyExecutor] No active journeys found');
        return;
      }

      console.log(`[JourneyExecutor] Processing ${journeys.length} active journeys`);

      for (const journey of journeys) {
        try {
          // 2. Check for new entries
          await this.checkForNewEntries(journey);
          
          // 3. Process users currently in the journey
          await this.processUsersInJourney(journey);
        } catch (err) {
          console.error(`[JourneyExecutor] Error processing journey ${journey.id}:`, err);
        }
      }

      console.log('[JourneyExecutor] Journey processing complete');
    } catch (error) {
      console.error('[JourneyExecutor] Fatal error:', error);
    }
  }

  /**
   * Check for new users who should enter this journey
   */
  async checkForNewEntries(journey: Journey): Promise<void> {
    console.log(`[JourneyExecutor] Checking new entries for journey: ${journey.name}`);

    if (journey.entry_trigger.type === 'event') {
      const eventName = journey.entry_trigger.event_name;
      
      // Find users who triggered the entry event and aren't already in the journey
      const { data: newEvents, error } = await supabase
        .from('subscriber_events')
        .select('subscriber_id, id, created_at')
        .eq('event_name', eventName)
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()) // Last 5 minutes
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!newEvents || newEvents.length === 0) return;

      // Filter out subscribers already in this journey
      const subscriberIds = [...new Set(newEvents.map(e => e.subscriber_id))];
      const { data: existingStates } = await supabase
        .from('user_journey_states')
        .select('subscriber_id')
        .eq('journey_id', journey.id)
        .in('subscriber_id', subscriberIds)
        .in('status', ['active', 'completed']);

      const existingSubscriberIds = new Set(existingStates?.map(s => s.subscriber_id) || []);
      const newSubscribers = subscriberIds.filter(id => !existingSubscriberIds.has(id));

      console.log(`[JourneyExecutor] Found ${newSubscribers.length} new subscribers for journey ${journey.name}`);

      // Enroll new users
      for (const subscriberId of newSubscribers) {
        await this.enrollUser(journey.id, subscriberId);
      }
    } else if (journey.entry_trigger.type === 'segment') {
      // Handle segment-based entry (check segment membership)
      console.log('[JourneyExecutor] Segment-based entry not yet implemented');
    }
  }

  /**
   * Enroll a user into a journey
   */
  async enrollUser(journeyId: string, subscriberId: string): Promise<void> {
    console.log(`[JourneyExecutor] Enrolling subscriber ${subscriberId} in journey ${journeyId}`);

    // Get journey to find the first node after trigger
    const { data: journey } = await supabase
      .from('journeys')
      .select('flow_definition')
      .eq('id', journeyId)
      .single();

    if (!journey || !journey.flow_definition) return;

    const flowDef = journey.flow_definition as { nodes: FlowNode[]; edges: FlowEdge[] };
    
    const triggerNode = flowDef.nodes.find((n: FlowNode) => n.type === 'trigger');
    if (!triggerNode) return;

    const firstEdge = flowDef.edges.find((e: FlowEdge) => e.source === triggerNode.id);
    if (!firstEdge) return;

    // Create user state
    const { error } = await supabase
      .from('user_journey_states')
      .insert({
        journey_id: journeyId,
        subscriber_id: subscriberId,
        current_step_id: firstEdge.target,
        status: 'active',
        next_execution_at: new Date().toISOString(),
        node_history: [triggerNode.id],
        metadata: {}
      });

    if (error && !error.message.includes('duplicate')) {
      console.error('[JourneyExecutor] Error enrolling user:', error);
    }
  }

  /**
   * Process all users currently in a journey
   */
  async processUsersInJourney(journey: Journey): Promise<void> {
    // Get users ready to be processed
    const { data: userStates, error } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('journey_id', journey.id)
      .eq('status', 'active')
      .lte('next_execution_at', new Date().toISOString());

    if (error) throw error;
    if (!userStates || userStates.length === 0) return;

    console.log(`[JourneyExecutor] Processing ${userStates.length} users in journey ${journey.name}`);

    for (const userState of userStates) {
      try {
        await this.processUserStep(journey, userState);
      } catch (err) {
        console.error(`[JourneyExecutor] Error processing user ${userState.subscriber_id}:`, err);
      }
    }
  }

  /**
   * Process a single user's current step
   */
  async processUserStep(journey: Journey, userState: UserState): Promise<void> {
    const currentNode = journey.flow_definition.nodes.find(
      (n: FlowNode) => n.id === userState.current_step_id
    );

    if (!currentNode) {
      console.error(`[JourneyExecutor] Node ${userState.current_step_id} not found`);
      return;
    }

    console.log(`[JourneyExecutor] Processing ${currentNode.type} node for user ${userState.subscriber_id}`);

    switch (currentNode.type) {
      case 'notification':
        await this.handleNotificationNode(journey, userState, currentNode);
        break;
        
      case 'delay':
        await this.handleDelayNode(journey, userState, currentNode);
        break;
        
      case 'condition':
        await this.handleConditionNode(journey, userState, currentNode);
        break;
        
      case 'exit':
        await this.handleExitNode(userState);
        break;
        
      default:
        // Unknown node type, move to next
        await this.moveToNextNode(journey, userState);
    }
  }

  /**
   * Handle notification node - send push notification
   */
  async handleNotificationNode(journey: Journey, userState: UserState, node: FlowNode): Promise<void> {
    // Get subscriber details
    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', userState.subscriber_id)
      .single();

    if (!subscriber || !subscriber.endpoint) {
      console.log('[JourneyExecutor] Subscriber has no push subscription');
      await this.moveToNextNode(journey, userState);
      return;
    }

    // Send notification
    const payload = {
      title: node.data.title || 'Notification',
      body: node.data.body || '',
      icon: node.data.icon || '/icon.png',
      badge: node.data.badge || '/badge.png',
      data: {
        url: node.data.url || '/',
        journey_id: journey.id,
        subscriber_id: subscriber.id,
        node_id: node.id
      }
    };

    try {
      await webpush.sendNotification(
        {
          endpoint: subscriber.endpoint,
          keys: {
            p256dh: subscriber.p256dh,
            auth: subscriber.auth
          }
        },
        JSON.stringify(payload)
      );

      console.log('[JourneyExecutor] Notification sent successfully');

      // Track the notification send event
      await supabase.from('subscriber_events').insert({
        subscriber_id: subscriber.id,
        website_id: subscriber.website_id,
        event_name: 'notification_sent',
        properties: { 
          journey_id: journey.id,
          node_id: node.id, 
          title: payload.title 
        }
      });

      // Move to next node
      await this.moveToNextNode(journey, userState);
    } catch (error) {
      console.error('[JourneyExecutor] Failed to send notification:', error);
      // Still move forward to avoid getting stuck
      await this.moveToNextNode(journey, userState);
    }
  }

  /**
   * Handle delay node - schedule next execution
   */
  async handleDelayNode(journey: Journey, userState: UserState, node: FlowNode): Promise<void> {
    const duration = node.data.duration || '1h';
    const delayMs = this.parseDuration(duration);
    const nextExecutionAt = new Date(Date.now() + delayMs);

    console.log(`[JourneyExecutor] Delaying user for ${duration} until ${nextExecutionAt}`);

    // Find next node
    const nextEdge = journey.flow_definition.edges.find(
      (e: FlowEdge) => e.source === node.id
    );

    if (!nextEdge) {
      await this.handleExitNode(userState);
      return;
    }

    // Update user state with next execution time
    await supabase
      .from('user_journey_states')
      .update({
        current_step_id: nextEdge.target,
        next_execution_at: nextExecutionAt.toISOString(),
        node_history: [...userState.node_history, node.id],
        updated_at: new Date().toISOString()
      })
      .eq('id', userState.id);
  }

  /**
   * Handle condition node - evaluate and branch
   */
  async handleConditionNode(journey: Journey, userState: UserState, node: FlowNode): Promise<void> {
    const condition = node.data.condition;
    const result = await this.evaluateCondition(userState, condition);

    console.log(`[JourneyExecutor] Condition evaluated to: ${result}`);

    // Find the appropriate edge (yes/no)
    const edges = journey.flow_definition.edges.filter(
      (e: FlowEdge) => e.source === node.id
    );

    const targetEdge = edges.find(
      (e: FlowEdge) => e.sourceHandle === (result ? 'yes' : 'no')
    );

    if (!targetEdge) {
      console.log('[JourneyExecutor] No matching edge found for condition result');
      await this.handleExitNode(userState);
      return;
    }

    // Update to next node
    await supabase
      .from('user_journey_states')
      .update({
        current_step_id: targetEdge.target,
        next_execution_at: new Date().toISOString(),
        node_history: [...userState.node_history, node.id],
        updated_at: new Date().toISOString()
      })
      .eq('id', userState.id);
  }

  /**
   * Evaluate a condition
   */
  async evaluateCondition(userState: UserState, condition: any): Promise<boolean> {
    if (!condition) return true;

    if (condition.type === 'clicked_notification') {
      const { data: clickEvents } = await supabase
        .from('subscriber_events')
        .select('id')
        .eq('subscriber_id', userState.subscriber_id)
        .eq('event_name', 'notification_clicked')
        .eq('journey_id', userState.journey_id)
        .gte('created_at', userState.entered_at);

      // return (clickEvents && clickEvents.length > 0);
      return !!(clickEvents && clickEvents.length > 0);

    }

    if (condition.type === 'event_occurred') {
      const withinMs = (condition.within_hours || 24) * 60 * 60 * 1000;
      const sinceDate = new Date(Date.now() - withinMs);

      const { data: events } = await supabase
        .from('subscriber_events')
        .select('id')
        .eq('subscriber_id', userState.subscriber_id)
        .eq('event_name', condition.event_name)
        .gte('created_at', sinceDate.toISOString());

      // return (events && events.length > 0);
      return !!(events && events.length > 0);

    }

    return true;
  }

  /**
   * Handle exit node - complete the journey
   */
  async handleExitNode(userState: UserState): Promise<void> {
    console.log(`[JourneyExecutor] User ${userState.subscriber_id} completing journey`);

    await supabase
      .from('user_journey_states')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userState.id);
  }

  /**
   * Move user to the next node in the journey
   */
  async moveToNextNode(journey: Journey, userState: UserState): Promise<void> {
    const currentNode = journey.flow_definition.nodes.find(
      (n: FlowNode) => n.id === userState.current_step_id
    );

    if (!currentNode) return;

    const nextEdge = journey.flow_definition.edges.find(
      (e: FlowEdge) => e.source === currentNode.id
    );

    if (!nextEdge) {
      await this.handleExitNode(userState);
      return;
    }

    await supabase
      .from('user_journey_states')
      .update({
        current_step_id: nextEdge.target,
        next_execution_at: new Date().toISOString(),
        node_history: [...userState.node_history, currentNode.id],
        updated_at: new Date().toISOString()
      })
      .eq('id', userState.id);
  }

  /**
   * Parse duration string to milliseconds
   */
  parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 60000;

    const value = parseInt(match[1]);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      's': 1000,
      'm': 60 * 1000,
      'h': 60 * 60 * 1000,
      'd': 24 * 60 * 60 * 1000
    };

    return value * (multipliers[unit] || 60000);
  }
}

// Export singleton instance
export const journeyExecutor = new JourneyExecutor();