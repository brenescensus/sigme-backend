// // // //backend/lib/journeyEngine.ts

// // // import { supabase } from /lib/supabase';
// // // import { scheduleTask, cancelScheduledTasks } from './scheduler';
// // // import { sendNotification } from './notifications';

// // // interface JourneyNode {
// // //   id: string;
// // //   type: 'entry' | 'wait' | 'message' | 'branch' | 'exit' | 'webhook';
// // //   data: any;
// // //   next?: string | null;
// // // }

// // // class JourneyEngine {
// // //   // Start monitoring a journey for new entries
// // //   async startJourney(journeyId: string) {
// // //     console.log(`[JourneyEngine] Starting journey: ${journeyId}`);

// // //     const { data: journey } = await supabase
// // //       .from('journeys')
// // //       .select('*')
// // //       .eq('id', journeyId)
// // //       .single();

// // //     if (!journey) {
// // //       throw new Error('Journey not found');
// // //     }

// // //     // If entry trigger is segment-based, enroll all matching subscribers
// // //     if (journey.entry_trigger.type === 'segment') {
// // //       await this.enrollSegment(journeyId, journey.entry_trigger.segment);
// // //     }

// // //     // Set up event listener for event-based triggers
// // //     if (journey.entry_trigger.type === 'event') {
// // //       // This would be handled by your event tracking system
// // //       console.log(`[JourneyEngine] Listening for event: ${journey.entry_trigger.event_name}`);
// // //     }
// // //   }

// // //   // Pause a journey (stop new enrollments)
// // //   async pauseJourney(journeyId: string) {
// // //     console.log(`[JourneyEngine] Pausing journey: ${journeyId}`);
// // //     // Cancel all pending scheduled steps
// // //     await cancelScheduledTasks(journeyId);
// // //   }

// // //   // Enroll all subscribers in a segment
// // //   async enrollSegment(journeyId: string, segment: string) {
// // //     const { data: journey } = await supabase
// // //       .from('journeys')
// // //       .select('website_id')
// // //       .eq('id', journeyId)
// // //       .single();

// // //     if (!journey) return;

// // //     // Get subscribers based on segment
// // //     let query = supabase
// // //       .from('subscribers')
// // //       .select('id')
// // //       .eq('website_id', journey.website_id)
// // //       .eq('status', 'active');

// // //     if (segment === 'active') {
// // //       // Last seen in last 7 days
// // //       const sevenDaysAgo = new Date();
// // //       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
// // //       query = query.gte('last_seen_at', sevenDaysAgo.toISOString());
// // //     } else if (segment === 'inactive') {
// // //       // Not seen in last 30 days
// // //       const thirtyDaysAgo = new Date();
// // //       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
// // //       query = query.lt('last_seen_at', thirtyDaysAgo.toISOString());
// // //     }

// // //     const { data: subscribers } = await query;

// // //     if (!subscribers) return;

// // //     // Enroll each subscriber
// // //     for (const subscriber of subscribers) {
// // //       await this.enrollUser(journeyId, subscriber.id);
// // //     }

// // //     console.log(`[JourneyEngine] Enrolled ${subscribers.length} subscribers in journey ${journeyId}`);
// // //   }

// // //   // Enroll a single user in a journey
// // //   async enrollUser(journeyId: string, subscriberId: string, context: any = {}) {
// // //     console.log(`[JourneyEngine] Enrolling user ${subscriberId} in journey ${journeyId}`);

// // //     const { data: journey } = await supabase
// // //       .from('journeys')
// // //       .select('*')
// // //       .eq('id', journeyId)
// // //       .single();

// // //     if (!journey || journey.status !== 'active') {
// // //       console.log(`[JourneyEngine] Journey not active, skipping enrollment`);
// // //       return;
// // //     }

// // //     // Check if user already in journey
// // //     const { data: existingState } = await supabase
// // //       .from('user_journey_states')
// // //       .select('id, status')
// // //       .eq('journey_id', journeyId)
// // //       .eq('subscriber_id', subscriberId)
// // //       .eq('status', 'active')
// // //       .maybeSingle();

// // //     if (existingState && !journey.settings?.allow_reentry) {
// // //       console.log(`[JourneyEngine] User already in journey, skipping`);
// // //       return;
// // //     }

// // //     // Create user journey state
// // //     const { data: userState, error } = await supabase
// // //       .from('user_journey_states')
// // //       .insert({
// // //         journey_id: journeyId,
// // //         subscriber_id: subscriberId,
// // //         current_step_id: 'entry',
// // //         status: 'active',
// // //         context: context,
// // //       })
// // //       .select()
// // //       .single();

// // //     if (error) {
// // //       console.error('[JourneyEngine] Error creating user state:', error);
// // //       return;
// // //     }

// // //     // Log entry event
// // //     await this.logEvent(journeyId, subscriberId, userState.id, 'entered', 'entry');

// // //     // Update journey stats
// // //     await supabase
// // //       .from('journeys')
// // //       .update({
// // //         total_entered: (journey.total_entered || 0) + 1,
// // //         total_active: (journey.total_active || 0) + 1,
// // //       })
// // //       .eq('id', journeyId);

// // //     // Execute first step
// // //     await this.executeStep(userState.id, journey, 'entry');
// // //   }

// // //   // Execute a journey step
// // //   async executeStep(userStateId: string, journey: any, stepId: string) {
// // //     console.log(`[JourneyEngine] Executing step ${stepId} for user state ${userStateId}`);

// // //     const step: JourneyNode = journey.flow_definition.nodes[stepId];

// // //     if (!step) {
// // //       console.error(`[JourneyEngine] Step ${stepId} not found`);
// // //       return;
// // //     }

// // //     // Get current user state
// // //     const { data: userState } = await supabase
// // //       .from('user_journey_states')
// // //       .select('*, subscribers(id, endpoint, auth_key, p256dh_key)')
// // //       .eq('id', userStateId)
// // //       .single();

// // //     if (!userState || userState.status !== 'active') {
// // //       console.log(`[JourneyEngine] User state not active, stopping execution`);
// // //       return;
// // //     }

// // //     // Update current step
// // //     await supabase
// // //       .from('user_journey_states')
// // //       .update({ current_step_id: stepId })
// // //       .eq('id', userStateId);

// // //     // Execute based on step type
// // //     switch (step.type) {
// // //       case 'entry':
// // //         if (step.next) {
// // //           await this.executeStep(userStateId, journey, step.next);
// // //         }
// // //         break;

// // //       case 'wait':
// // //         await this.handleWait(userStateId, journey, step);
// // //         break;

// // //       case 'message':
// // //         await this.handleMessage(userStateId, journey, step, userState);
// // //         break;

// // //       case 'branch':
// // //         await this.handleBranch(userStateId, journey, step, userState);
// // //         break;

// // //       case 'webhook':
// // //         await this.handleWebhook(userStateId, journey, step);
// // //         break;

// // //       case 'exit':
// // //         await this.handleExit(userStateId, journey);
// // //         break;

// // //       default:
// // //         console.error(`[JourneyEngine] Unknown step type: ${step.type}`);
// // //     }
// // //   }

// // //   // Handle wait step
// // //   async handleWait(userStateId: string, journey: any, step: JourneyNode) {
// // //     const duration = step.data.duration;
// // //     const executeAt = this.calculateExecuteTime(duration);

// // //     console.log(`[JourneyEngine] Scheduling next step at ${executeAt}`);

// // //     // Schedule next step
// // //     await supabase
// // //       .from('scheduled_journey_steps')
// // //       .insert({
// // //         user_journey_state_id: userStateId,
// // //         step_id: step.next || 'exit',
// // //         execute_at: executeAt,
// // //         payload: { journey_id: journey.id },
// // //         status: 'pending',
// // //       });

// // //     // Schedule task in background job system
// // //     await scheduleTask({
// // //       type: 'journey_step',
// // //       executeAt,
// // //       data: {
// // //         userStateId,
// // //         journeyId: journey.id,
// // //         stepId: step.next,
// // //       },
// // //     });

// // //     await this.logEvent(
// // //       journey.id,
// // //       userStateId,
// // //       userStateId,
// // //       'wait_scheduled',
// // //       step.id,
// // //       { execute_at: executeAt }
// // //     );
// // //   }

// // //   // Handle message step
// // //   async handleMessage(userStateId: string, journey: any, step: JourneyNode, userState: any) {
// // //     console.log(`[JourneyEngine] Sending message: ${step.data.title}`);

// // //     try {
// // //       // Send notification
// // //       const result = await sendNotification({
// // //         subscriberId: userState.subscriber_id,
// // //         websiteId: journey.website_id,
// // //         notification: {
// // //           title: step.data.title,
// // //           body: step.data.body,
// // //           icon: step.data.icon_url,
// // //           image: step.data.image_url,
// // //           data: {
// // //             url: step.data.click_url,
// // //           },
// // //         },
// // //       });

// // //       await this.logEvent(
// // //         journey.id,
// // //         userState.subscriber_id,
// // //         userStateId,
// // //         'message_sent',
// // //         step.id,
// // //         { notification_result: result }
// // //       );

// // //       // Move to next step
// // //       if (step.next) {
// // //         await this.executeStep(userStateId, journey, step.next);
// // //       }
// // //     } catch (error: any) {
// // //       console.error('[JourneyEngine] Message send error:', error);
// // //       await this.logEvent(
// // //         journey.id,
// // //         userState.subscriber_id,
// // //         userStateId,
// // //         'message_failed',
// // //         step.id,
// // //         { error: error.message }
// // //       );
// // //     }
// // //   }

// // //   // Handle branch step
// // //   async handleBranch(userStateId: string, journey: any, step: JourneyNode, userState: any) {
// // //     const condition = step.data.condition;

// // //     // Get subscriber data for evaluation
// // //     const { data: subscriber } = await supabase
// // //       .from('subscribers')
// // //       .select('*')
// // //       .eq('id', userState.subscriber_id)
// // //       .single();

// // //     // Evaluate condition
// // //     const conditionResult = this.evaluateCondition(condition, {
// // //       subscriber,
// // //       context: userState.context,
// // //     });

// // //     const nextStepId = step.data.branches[conditionResult ? 'true' : 'false'];

// // //     await this.logEvent(
// // //       journey.id,
// // //       userState.subscriber_id,
// // //       userStateId,
// // //       'branch_evaluated',
// // //       step.id,
// // //       { condition_result: conditionResult, next_step: nextStepId }
// // //     );

// // //     if (nextStepId) {
// // //       await this.executeStep(userStateId, journey, nextStepId);
// // //     }
// // //   }

// // //   // Handle webhook step
// // //   async handleWebhook(userStateId: string, journey: any, step: JourneyNode) {
// // //     const { url, method, headers, payload } = step.data;

// // //     try {
// // //       const response = await fetch(url, {
// // //         method: method || 'POST',
// // //         headers: {
// // //           'Content-Type': 'application/json',
// // //           ...headers,
// // //         },
// // //         body: JSON.stringify({
// // //           journey_id: journey.id,
// // //           user_state_id: userStateId,
// // //           ...payload,
// // //         }),
// // //       });

// // //       await this.logEvent(
// // //         journey.id,
// // //         userStateId,
// // //         userStateId,
// // //         'webhook_sent',
// // //         step.id,
// // //         { status: response.status }
// // //       );

// // //       if (step.next) {
// // //         await this.executeStep(userStateId, journey, step.next);
// // //       }
// // //     } catch (error: any) {
// // //       console.error('[JourneyEngine] Webhook error:', error);
// // //       await this.logEvent(
// // //         journey.id,
// // //         userStateId,
// // //         userStateId,
// // //         'webhook_failed',
// // //         step.id,
// // //         { error: error.message }
// // //       );
// // //     }
// // //   }

// // //   // Handle exit step
// // //   async handleExit(userStateId: string, journey: any) {
// // //     console.log(`[JourneyEngine] Exiting journey for user state ${userStateId}`);

// // //     const { data: userState } = await supabase
// // //       .from('user_journey_states')
// // //       .update({
// // //         status: 'completed',
// // //         completed_at: new Date().toISOString(),
// // //       })
// // //       .eq('id', userStateId)
// // //       .select()
// // //       .single();

// // //     if (userState) {
// // //       await this.logEvent(
// // //         journey.id,
// // //         userState.subscriber_id,
// // //         userStateId,
// // //         'completed',
// // //         'exit'
// // //       );

// // //       // Update journey stats
// // //       await supabase.rpc('increment', {
// // //         table_name: 'journeys',
// // //         row_id: journey.id,
// // //         column_name: 'total_completed',
// // //       });

// // //       await supabase.rpc('decrement', {
// // //         table_name: 'journeys',
// // //         row_id: journey.id,
// // //         column_name: 'total_active',
// // //       });
// // //     }
// // //   }

// // //   // Helper: Calculate execution time for wait steps
// // //   calculateExecuteTime(duration: { value: number; unit: string }): string {
// // //     const now = new Date();
// // //     const units: Record<string, number> = {
// // //       minutes: 60 * 1000,
// // //       hours: 60 * 60 * 1000,
// // //       days: 24 * 60 * 60 * 1000,
// // //     };

// // //     const delay = duration.value * (units[duration.unit] || 0);
// // //     const executeAt = new Date(now.getTime() + delay);

// // //     return executeAt.toISOString();
// // //   }

// // //   // Helper: Evaluate branch condition
// // //   evaluateCondition(condition: any, data: any): boolean {
// // //     const { field, operator, value } = condition;

// // //     // Get value from data using dot notation
// // //     const actualValue = field.split('.').reduce((obj: any, key: string) => obj?.[key], data);

// // //     switch (operator) {
// // //       case 'equals':
// // //         return actualValue === value;
// // //       case 'not_equals':
// // //         return actualValue !== value;
// // //       case 'contains':
// // //         return String(actualValue).includes(value);
// // //       case 'greater_than':
// // //         return Number(actualValue) > Number(value);
// // //       case 'less_than':
// // //         return Number(actualValue) < Number(value);
// // //       default:
// // //         return false;
// // //     }
// // //   }

// // //   // Helper: Log journey events
// // //   async logEvent(
// // //     journeyId: string,
// // //     subscriberId: string,
// // //     userStateId: string,
// // //     eventType: string,
// // //     stepId?: string,
// // //     metadata?: any
// // //   ) {
// // //     await supabase.from('journey_events').insert({
// // //       journey_id: journeyId,
// // //       subscriber_id: subscriberId,
// // //       user_journey_state_id: userStateId,
// // //       event_type: eventType,
// // //       step_id: stepId,
// // //       metadata,
// // //     });
// // //   }
// // // }

// // // export const journeyEngine = new JourneyEngine();







// // // backend/lib/journeyEngine.ts

// // import { createClient } from '@supabase/supabase-js';
// // import type { Database } from '@/types/database';
// // import { scheduleTask, cancelScheduledTasks } from './scheduler';
// // import { sendNotification } from './notifications';
// // class JourneyEngine {
// //   async startJourney(journeyId: string) {
// //     console.log(`[JourneyEngine] Starting journey: ${journeyId}`);

// //     const { data: journey } = await supabase
// //       .from('journeys')
// //       .select('*')
// //       .eq('id', journeyId)
// //       .single();

// //     if (!journey) {
// //       throw new Error('Journey not found');
// //     }

// //     // Add null check for entry_trigger
// //     if (!journey.entry_trigger) {
// //       throw new Error('Journey entry trigger not configured');
// //     }

// //     // Type assertion after null check
// //     const entryTrigger = journey.entry_trigger as {
// //       type: string;
// //       segment?: string;
// //       event_name?: string;
// //     };

// //     // If entry trigger is segment-based, enroll all matching subscribers
// //     if (entryTrigger.type === 'segment' && entryTrigger.segment) {
// //       await this.enrollSegment(journeyId, entryTrigger.segment);
// //     }

// //     // Set up event listener for event-based triggers
// //     if (entryTrigger.type === 'event' && entryTrigger.event_name) {
// //       console.log(`[JourneyEngine] Listening for event: ${entryTrigger.event_name}`);
// //     }
// //   }

// // // Create service role client for backend operations
// // const supabase = createClient<Database>(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// //   {
// //     auth: {
// //       autoRefreshToken: false,
// //       persistSession: false,
// //     },
// //   }
// // );

// // interface JourneyNode {
// //   id: string;
// //   type: 'entry' | 'wait' | 'message' | 'branch' | 'exit' | 'webhook';
// //   data: any;
// //   next?: string | null;
// // }

// // class JourneyEngine {
// //   // Start monitoring a journey for new entries
// //   async startJourney(journeyId: string) {
// //     console.log(`[JourneyEngine] Starting journey: ${journeyId}`);

// //     const { data: journey } = await supabase
// //       .from('journeys')
// //       .select('*')
// //       .eq('id', journeyId)
// //       .single();

// //     if (!journey) {
// //       throw new Error('Journey not found');
// //     }

// //     // If entry trigger is segment-based, enroll all matching subscribers
// //     if (journey.entry_trigger.type === 'segment') {
// //       await this.enrollSegment(journeyId, journey.entry_trigger.segment);
// //     }

// //     // Set up event listener for event-based triggers
// //     if (journey.entry_trigger.type === 'event') {
// //       console.log(`[JourneyEngine] Listening for event: ${journey.entry_trigger.event_name}`);
// //     }
// //   }

// //   // Pause a journey (stop new enrollments)
// //   async pauseJourney(journeyId: string) {
// //     console.log(`[JourneyEngine] Pausing journey: ${journeyId}`);
// //     await cancelScheduledTasks(journeyId);
// //   }

// //   // Enroll all subscribers in a segment
// //   async enrollSegment(journeyId: string, segment: string) {
// //     const { data: journey } = await supabase
// //       .from('journeys')
// //       .select('website_id')
// //       .eq('id', journeyId)
// //       .single();

// //     if (!journey) return;

// //     let query = supabase
// //       .from('subscribers')
// //       .select('id')
// //       .eq('website_id', journey.website_id)
// //       .eq('status', 'active');

// //     if (segment === 'active') {
// //       const sevenDaysAgo = new Date();
// //       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
// //       query = query.gte('last_seen_at', sevenDaysAgo.toISOString());
// //     } else if (segment === 'inactive') {
// //       const thirtyDaysAgo = new Date();
// //       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
// //       query = query.lt('last_seen_at', thirtyDaysAgo.toISOString());
// //     }

// //     const { data: subscribers } = await query;

// //     if (!subscribers) return;

// //     for (const subscriber of subscribers) {
// //       await this.enrollUser(journeyId, subscriber.id);
// //     }

// //     console.log(`[JourneyEngine] Enrolled ${subscribers.length} subscribers in journey ${journeyId}`);
// //   }

// //   // Enroll a single user in a journey
// //   async enrollUser(journeyId: string, subscriberId: string, context: any = {}) {
// //     console.log(`[JourneyEngine] Enrolling user ${subscriberId} in journey ${journeyId}`);

// //     const { data: journey } = await supabase
// //       .from('journeys')
// //       .select('*')
// //       .eq('id', journeyId)
// //       .single();

// //     if (!journey || journey.status !== 'active') {
// //       console.log(`[JourneyEngine] Journey not active, skipping enrollment`);
// //       return;
// //     }

// //     const { data: existingState } = await supabase
// //       .from('user_journey_states')
// //       .select('id, status')
// //       .eq('journey_id', journeyId)
// //       .eq('subscriber_id', subscriberId)
// //       .eq('status', 'active')
// //       .maybeSingle();

// //     if (existingState && !journey.settings?.allow_reentry) {
// //       console.log(`[JourneyEngine] User already in journey, skipping`);
// //       return;
// //     }

// //     const { data: userState, error } = await supabase
// //       .from('user_journey_states')
// //       .insert({
// //         journey_id: journeyId,
// //         subscriber_id: subscriberId,
// //         current_step_id: 'entry',
// //         status: 'active',
// //         context: context,
// //       })
// //       .select()
// //       .single();

// //     if (error) {
// //       console.error('[JourneyEngine] Error creating user state:', error);
// //       return;
// //     }

// //     await this.logEvent(journeyId, subscriberId, userState.id, 'entered', 'entry');

// //     await supabase
// //       .from('journeys')
// //       .update({
// //         total_entered: (journey.total_entered || 0) + 1,
// //         total_active: (journey.total_active || 0) + 1,
// //       })
// //       .eq('id', journeyId);

// //     await this.executeStep(userState.id, journey, 'entry');
// //   }

// //   // Execute a journey step
// //   async executeStep(userStateId: string, journey: any, stepId: string) {
// //     console.log(`[JourneyEngine] Executing step ${stepId} for user state ${userStateId}`);

// //     const step: JourneyNode = journey.flow_definition.nodes[stepId];

// //     if (!step) {
// //       console.error(`[JourneyEngine] Step ${stepId} not found`);
// //       return;
// //     }

// //     const { data: userState } = await supabase
// //       .from('user_journey_states')
// //       .select('*, subscribers(id, endpoint, auth_key, p256dh_key)')
// //       .eq('id', userStateId)
// //       .single();

// //     if (!userState || userState.status !== 'active') {
// //       console.log(`[JourneyEngine] User state not active, stopping execution`);
// //       return;
// //     }

// //     await supabase
// //       .from('user_journey_states')
// //       .update({ current_step_id: stepId })
// //       .eq('id', userStateId);

// //     switch (step.type) {
// //       case 'entry':
// //         if (step.next) {
// //           await this.executeStep(userStateId, journey, step.next);
// //         }
// //         break;

// //       case 'wait':
// //         await this.handleWait(userStateId, journey, step);
// //         break;

// //       case 'message':
// //         await this.handleMessage(userStateId, journey, step, userState);
// //         break;

// //       case 'branch':
// //         await this.handleBranch(userStateId, journey, step, userState);
// //         break;

// //       case 'webhook':
// //         await this.handleWebhook(userStateId, journey, step);
// //         break;

// //       case 'exit':
// //         await this.handleExit(userStateId, journey);
// //         break;

// //       default:
// //         console.error(`[JourneyEngine] Unknown step type: ${step.type}`);
// //     }
// //   }

// //   // Handle wait step
// //   async handleWait(userStateId: string, journey: any, step: JourneyNode) {
// //     const duration = step.data.duration;
// //     const executeAt = this.calculateExecuteTime(duration);

// //     console.log(`[JourneyEngine] Scheduling next step at ${executeAt}`);

// //     await supabase
// //       .from('scheduled_journey_steps')
// //       .insert({
// //         user_journey_state_id: userStateId,
// //         step_id: step.next || 'exit',
// //         execute_at: executeAt,
// //         payload: { journey_id: journey.id },
// //         status: 'pending',
// //       });

// //     await scheduleTask({
// //       type: 'journey_step',
// //       executeAt,
// //       data: {
// //         userStateId,
// //         journeyId: journey.id,
// //         stepId: step.next,
// //       },
// //     });

// //     await this.logEvent(
// //       journey.id,
// //       userStateId,
// //       userStateId,
// //       'wait_scheduled',
// //       step.id,
// //       { execute_at: executeAt }
// //     );
// //   }

// //   // Handle message step
// //   async handleMessage(userStateId: string, journey: any, step: JourneyNode, userState: any) {
// //     console.log(`[JourneyEngine] Sending message: ${step.data.title}`);

// //     try {
// //       const result = await sendNotification({
// //         subscriberId: userState.subscriber_id,
// //         websiteId: journey.website_id,
// //         notification: {
// //           title: step.data.title,
// //           body: step.data.body,
// //           icon: step.data.icon_url,
// //           image: step.data.image_url,
// //           data: {
// //             url: step.data.click_url,
// //           },
// //         },
// //       });

// //       await this.logEvent(
// //         journey.id,
// //         userState.subscriber_id,
// //         userStateId,
// //         'message_sent',
// //         step.id,
// //         { notification_result: result }
// //       );

// //       if (step.next) {
// //         await this.executeStep(userStateId, journey, step.next);
// //       }
// //     } catch (error: any) {
// //       console.error('[JourneyEngine] Message send error:', error);
// //       await this.logEvent(
// //         journey.id,
// //         userState.subscriber_id,
// //         userStateId,
// //         'message_failed',
// //         step.id,
// //         { error: error.message }
// //       );
// //     }
// //   }

// //   // Handle branch step
// //   async handleBranch(userStateId: string, journey: any, step: JourneyNode, userState: any) {
// //     const condition = step.data.condition;

// //     const { data: subscriber } = await supabase
// //       .from('subscribers')
// //       .select('*')
// //       .eq('id', userState.subscriber_id)
// //       .single();

// //     const conditionResult = this.evaluateCondition(condition, {
// //       subscriber,
// //       context: userState.context,
// //     });

// //     const nextStepId = step.data.branches[conditionResult ? 'true' : 'false'];

// //     await this.logEvent(
// //       journey.id,
// //       userState.subscriber_id,
// //       userStateId,
// //       'branch_evaluated',
// //       step.id,
// //       { condition_result: conditionResult, next_step: nextStepId }
// //     );

// //     if (nextStepId) {
// //       await this.executeStep(userStateId, journey, nextStepId);
// //     }
// //   }

// //   // Handle webhook step
// //   async handleWebhook(userStateId: string, journey: any, step: JourneyNode) {
// //     const { url, method, headers, payload } = step.data;

// //     try {
// //       const response = await fetch(url, {
// //         method: method || 'POST',
// //         headers: {
// //           'Content-Type': 'application/json',
// //           ...headers,
// //         },
// //         body: JSON.stringify({
// //           journey_id: journey.id,
// //           user_state_id: userStateId,
// //           ...payload,
// //         }),
// //       });

// //       await this.logEvent(
// //         journey.id,
// //         userStateId,
// //         userStateId,
// //         'webhook_sent',
// //         step.id,
// //         { status: response.status }
// //       );

// //       if (step.next) {
// //         await this.executeStep(userStateId, journey, step.next);
// //       }
// //     } catch (error: any) {
// //       console.error('[JourneyEngine] Webhook error:', error);
// //       await this.logEvent(
// //         journey.id,
// //         userStateId,
// //         userStateId,
// //         'webhook_failed',
// //         step.id,
// //         { error: error.message }
// //       );
// //     }
// //   }

// //   // Handle exit step
// //   async handleExit(userStateId: string, journey: any) {
// //     console.log(`[JourneyEngine] Exiting journey for user state ${userStateId}`);

// //     const { data: userState } = await supabase
// //       .from('user_journey_states')
// //       .update({
// //         status: 'completed',
// //         completed_at: new Date().toISOString(),
// //       })
// //       .eq('id', userStateId)
// //       .select()
// //       .single();

// //     if (userState) {
// //       await this.logEvent(
// //         journey.id,
// //         userState.subscriber_id,
// //         userStateId,
// //         'completed',
// //         'exit'
// //       );

// //       const { data: journeyData } = await supabase
// //         .from('journeys')
// //         .select('total_completed, total_active')
// //         .eq('id', journey.id)
// //         .single();

// //       if (journeyData) {
// //         await supabase
// //           .from('journeys')
// //           .update({
// //             total_completed: (journeyData.total_completed || 0) + 1,
// //             total_active: Math.max((journeyData.total_active || 0) - 1, 0),
// //           })
// //           .eq('id', journey.id);
// //       }
// //     }
// //   }

// //   // Helper: Calculate execution time for wait steps
// //   calculateExecuteTime(duration: { value: number; unit: string }): string {
// //     const now = new Date();
// //     const units: Record<string, number> = {
// //       minutes: 60 * 1000,
// //       hours: 60 * 60 * 1000,
// //       days: 24 * 60 * 60 * 1000,
// //     };

// //     const delay = duration.value * (units[duration.unit] || 0);
// //     const executeAt = new Date(now.getTime() + delay);

// //     return executeAt.toISOString();
// //   }

// //   // Helper: Evaluate branch condition
// //   evaluateCondition(condition: any, data: any): boolean {
// //     const { field, operator, value } = condition;

// //     const actualValue = field.split('.').reduce((obj: any, key: string) => obj?.[key], data);

// //     switch (operator) {
// //       case 'equals':
// //         return actualValue === value;
// //       case 'not_equals':
// //         return actualValue !== value;
// //       case 'contains':
// //         return String(actualValue).includes(value);
// //       case 'greater_than':
// //         return Number(actualValue) > Number(value);
// //       case 'less_than':
// //         return Number(actualValue) < Number(value);
// //       default:
// //         return false;
// //     }
// //   }

// //   // Helper: Log journey events
// //   async logEvent(
// //     journeyId: string,
// //     subscriberId: string,
// //     userStateId: string,
// //     eventType: string,
// //     stepId?: string,
// //     metadata?: any
// //   ) {
// //     await supabase.from('journey_events').insert({
// //       journey_id: journeyId,
// //       subscriber_id: subscriberId,
// //       user_journey_state_id: userStateId,
// //       event_type: eventType,
// //       step_id: stepId,
// //       metadata,
// //     });
// //   }
// // }

// // export const journeyEngine = new JourneyEngine();


// // backend/lib/journeyEngine.ts

// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// import { scheduleTask, cancelScheduledTasks } from './scheduler';
// import { sendNotification } from './notifications';

// // Create service role client for backend operations
// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
//   {
//     auth: {
//       autoRefreshToken: false,
//       persistSession: false,
//     },
//   }
// );

// interface JourneyNode {
//   id: string;
//   type: 'entry' | 'wait' | 'message' | 'branch' | 'exit' | 'webhook';
//   data: any;
//   next?: string | null;
// }

// class JourneyEngine {
//   // Start monitoring a journey for new entries
//   async startJourney(journeyId: string) {
//     console.log(`[JourneyEngine] Starting journey: ${journeyId}`);

//     const { data: journey } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', journeyId)
//       .single();

//     if (!journey) {
//       throw new Error('Journey not found');
//     }

//     // Add null check for entry_trigger
//     if (!journey.entry_trigger) {
//       throw new Error('Journey entry trigger not configured');
//     }

//     // Type assertion after null check
//     const entryTrigger = journey.entry_trigger as {
//       type: string;
//       segment?: string;
//       event_name?: string;
//     };

//     // If entry trigger is segment-based, enroll all matching subscribers
//     if (entryTrigger.type === 'segment' && entryTrigger.segment) {
//       await this.enrollSegment(journeyId, entryTrigger.segment);
//     }

//     // Set up event listener for event-based triggers
//     if (entryTrigger.type === 'event' && entryTrigger.event_name) {
//       console.log(`[JourneyEngine] Listening for event: ${entryTrigger.event_name}`);
//     }
//   }

//   // Pause a journey (stop new enrollments)
//   async pauseJourney(journeyId: string) {
//     console.log(`[JourneyEngine] Pausing journey: ${journeyId}`);
//     await cancelScheduledTasks(journeyId);
//   }

//   // Enroll all subscribers in a segment
//   async enrollSegment(journeyId: string, segment: string) {
//     const { data: journey } = await supabase
//       .from('journeys')
//       .select('website_id')
//       .eq('id', journeyId)
//       .single();

//     if (!journey) return;

//     let query = supabase
//       .from('subscribers')
//       .select('id')
//       .eq('website_id', journey.website_id)
//       .eq('status', 'active');

//     if (segment === 'active') {
//       const sevenDaysAgo = new Date();
//       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//       query = query.gte('last_seen_at', sevenDaysAgo.toISOString());
//     } else if (segment === 'inactive') {
//       const thirtyDaysAgo = new Date();
//       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//       query = query.lt('last_seen_at', thirtyDaysAgo.toISOString());
//     }

//     const { data: subscribers } = await query;

//     if (!subscribers) return;

//     for (const subscriber of subscribers) {
//       await this.enrollUser(journeyId, subscriber.id);
//     }

//     console.log(`[JourneyEngine] Enrolled ${subscribers.length} subscribers in journey ${journeyId}`);
//   }

//   // Enroll a single user in a journey
//   async enrollUser(journeyId: string, subscriberId: string, context: any = {}) {
//     console.log(`[JourneyEngine] Enrolling user ${subscriberId} in journey ${journeyId}`);

//     const { data: journey } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', journeyId)
//       .single();

//     if (!journey || journey.status !== 'active') {
//       console.log(`[JourneyEngine] Journey not active, skipping enrollment`);
//       return;
//     }

//     const { data: existingState } = await supabase
//       .from('user_journey_states')
//       .select('id, status')
//       .eq('journey_id', journeyId)
//       .eq('subscriber_id', subscriberId)
//       .eq('status', 'active')
//       .maybeSingle();

//     if (existingState && !journey.settings?.allow_reentry) {
//       console.log(`[JourneyEngine] User already in journey, skipping`);
//       return;
//     }

//     const { data: userState, error } = await supabase
//       .from('user_journey_states')
//       .insert({
//         journey_id: journeyId,
//         subscriber_id: subscriberId,
//         current_step_id: 'entry',
//         status: 'active',
//         context: context,
//       })
//       .select()
//       .single();

//     if (error) {
//       console.error('[JourneyEngine] Error creating user state:', error);
//       return;
//     }

//     await this.logEvent(journeyId, subscriberId, userState.id, 'entered', 'entry');

//     await supabase
//       .from('journeys')
//       .update({
//         total_entered: (journey.total_entered || 0) + 1,
//         total_active: (journey.total_active || 0) + 1,
//       })
//       .eq('id', journeyId);

//     await this.executeStep(userState.id, journey, 'entry');
//   }

//   // Execute a journey step
//   async executeStep(userStateId: string, journey: any, stepId: string) {
//     console.log(`[JourneyEngine] Executing step ${stepId} for user state ${userStateId}`);

//     const step: JourneyNode = journey.flow_definition.nodes[stepId];

//     if (!step) {
//       console.error(`[JourneyEngine] Step ${stepId} not found`);
//       return;
//     }

//     const { data: userState } = await supabase
//       .from('user_journey_states')
//       .select('*, subscribers(id, endpoint, auth_key, p256dh_key)')
//       .eq('id', userStateId)
//       .single();

//     if (!userState || userState.status !== 'active') {
//       console.log(`[JourneyEngine] User state not active, stopping execution`);
//       return;
//     }

//     await supabase
//       .from('user_journey_states')
//       .update({ current_step_id: stepId })
//       .eq('id', userStateId);

//     switch (step.type) {
//       case 'entry':
//         if (step.next) {
//           await this.executeStep(userStateId, journey, step.next);
//         }
//         break;

//       case 'wait':
//         await this.handleWait(userStateId, journey, step);
//         break;

//       case 'message':
//         await this.handleMessage(userStateId, journey, step, userState);
//         break;

//       case 'branch':
//         await this.handleBranch(userStateId, journey, step, userState);
//         break;

//       case 'webhook':
//         await this.handleWebhook(userStateId, journey, step);
//         break;

//       case 'exit':
//         await this.handleExit(userStateId, journey);
//         break;

//       default:
//         console.error(`[JourneyEngine] Unknown step type: ${step.type}`);
//     }
//   }

//   // Handle wait step
//   async handleWait(userStateId: string, journey: any, step: JourneyNode) {
//     const duration = step.data.duration;
//     const executeAt = this.calculateExecuteTime(duration);

//     console.log(`[JourneyEngine] Scheduling next step at ${executeAt}`);

//     await supabase
//       .from('scheduled_journey_steps')
//       .insert({
//         user_journey_state_id: userStateId,
//         step_id: step.next || 'exit',
//         execute_at: executeAt,
//         payload: { journey_id: journey.id },
//         status: 'pending',
//       });

//     await scheduleTask({
//       type: 'journey_step',
//       executeAt,
//       data: {
//         userStateId,
//         journeyId: journey.id,
//         stepId: step.next,
//       },
//     });

//     await this.logEvent(
//       journey.id,
//       userStateId,
//       userStateId,
//       'wait_scheduled',
//       step.id,
//       { execute_at: executeAt }
//     );
//   }

//   // Handle message step
//   async handleMessage(userStateId: string, journey: any, step: JourneyNode, userState: any) {
//     console.log(`[JourneyEngine] Sending message: ${step.data.title}`);

//     try {
//       const result = await sendNotification({
//         subscriberId: userState.subscriber_id,
//         websiteId: journey.website_id,
//         notification: {
//           title: step.data.title,
//           body: step.data.body,
//           icon: step.data.icon_url,
//           image: step.data.image_url,
//           data: {
//             url: step.data.click_url,
//           },
//         },
//       });

//       await this.logEvent(
//         journey.id,
//         userState.subscriber_id,
//         userStateId,
//         'message_sent',
//         step.id,
//         { notification_result: result }
//       );

//       if (step.next) {
//         await this.executeStep(userStateId, journey, step.next);
//       }
//     } catch (error: any) {
//       console.error('[JourneyEngine] Message send error:', error);
//       await this.logEvent(
//         journey.id,
//         userState.subscriber_id,
//         userStateId,
//         'message_failed',
//         step.id,
//         { error: error.message }
//       );
//     }
//   }

//   // Handle branch step
//   async handleBranch(userStateId: string, journey: any, step: JourneyNode, userState: any) {
//     const condition = step.data.condition;

//     const { data: subscriber } = await supabase
//       .from('subscribers')
//       .select('*')
//       .eq('id', userState.subscriber_id)
//       .single();

//     const conditionResult = this.evaluateCondition(condition, {
//       subscriber,
//       context: userState.context,
//     });

//     const nextStepId = step.data.branches[conditionResult ? 'true' : 'false'];

//     await this.logEvent(
//       journey.id,
//       userState.subscriber_id,
//       userStateId,
//       'branch_evaluated',
//       step.id,
//       { condition_result: conditionResult, next_step: nextStepId }
//     );

//     if (nextStepId) {
//       await this.executeStep(userStateId, journey, nextStepId);
//     }
//   }

//   // Handle webhook step
//   async handleWebhook(userStateId: string, journey: any, step: JourneyNode) {
//     const { url, method, headers, payload } = step.data;

//     try {
//       const response = await fetch(url, {
//         method: method || 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           ...headers,
//         },
//         body: JSON.stringify({
//           journey_id: journey.id,
//           user_state_id: userStateId,
//           ...payload,
//         }),
//       });

//       await this.logEvent(
//         journey.id,
//         userStateId,
//         userStateId,
//         'webhook_sent',
//         step.id,
//         { status: response.status }
//       );

//       if (step.next) {
//         await this.executeStep(userStateId, journey, step.next);
//       }
//     } catch (error: any) {
//       console.error('[JourneyEngine] Webhook error:', error);
//       await this.logEvent(
//         journey.id,
//         userStateId,
//         userStateId,
//         'webhook_failed',
//         step.id,
//         { error: error.message }
//       );
//     }
//   }

//   // Handle exit step
//   async handleExit(userStateId: string, journey: any) {
//     console.log(`[JourneyEngine] Exiting journey for user state ${userStateId}`);

//     const { data: userState } = await supabase
//       .from('user_journey_states')
//       .update({
//         status: 'completed',
//         completed_at: new Date().toISOString(),
//       })
//       .eq('id', userStateId)
//       .select()
//       .single();

//     if (userState) {
//       await this.logEvent(
//         journey.id,
//         userState.subscriber_id,
//         userStateId,
//         'completed',
//         'exit'
//       );

//       const { data: journeyData } = await supabase
//         .from('journeys')
//         .select('total_completed, total_active')
//         .eq('id', journey.id)
//         .single();

//       if (journeyData) {
//         await supabase
//           .from('journeys')
//           .update({
//             total_completed: (journeyData.total_completed || 0) + 1,
//             total_active: Math.max((journeyData.total_active || 0) - 1, 0),
//           })
//           .eq('id', journey.id);
//       }
//     }
//   }

//   // Helper: Calculate execution time for wait steps
//   calculateExecuteTime(duration: { value: number; unit: string }): string {
//     const now = new Date();
//     const units: Record<string, number> = {
//       minutes: 60 * 1000,
//       hours: 60 * 60 * 1000,
//       days: 24 * 60 * 60 * 1000,
//     };

//     const delay = duration.value * (units[duration.unit] || 0);
//     const executeAt = new Date(now.getTime() + delay);

//     return executeAt.toISOString();
//   }

//   // Helper: Evaluate branch condition
//   evaluateCondition(condition: any, data: any): boolean {
//     const { field, operator, value } = condition;

//     const actualValue = field.split('.').reduce((obj: any, key: string) => obj?.[key], data);

//     switch (operator) {
//       case 'equals':
//         return actualValue === value;
//       case 'not_equals':
//         return actualValue !== value;
//       case 'contains':
//         return String(actualValue).includes(value);
//       case 'greater_than':
//         return Number(actualValue) > Number(value);
//       case 'less_than':
//         return Number(actualValue) < Number(value);
//       default:
//         return false;
//     }
//   }

//   // Helper: Log journey events
//   async logEvent(
//     journeyId: string,
//     subscriberId: string,
//     userStateId: string,
//     eventType: string,
//     stepId?: string,
//     metadata?: any
//   ) {
//     await supabase.from('journey_events').insert({
//       journey_id: journeyId,
//       subscriber_id: subscriberId,
//       user_journey_state_id: userStateId,
//       event_type: eventType,
//       step_id: stepId,
//       metadata,
//     });
//   }
// }

// export const journeyEngine = new JourneyEngine();







// //backend/lib/journeyEngine.ts

// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// import { scheduleTask, cancelScheduledTasks } from './scheduler';
// import { sendNotification } from './notifications';

// // Create service role client for backend operations
// const supabase = createClient<Database>(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
//   {
//     auth: {
//       autoRefreshToken: false,
//       persistSession: false,
//     },
//   }
// );

// // Type definitions for journey settings and flow
// interface JourneySettings {
//   allow_reentry?: boolean;
//   max_duration_days?: number;
//   timezone?: string;
//   [key: string]: any;
// }

// interface JourneyNode {
//   id: string;
//   type: 'entry' | 'wait' | 'message' | 'branch' | 'exit' | 'webhook';
//   data: any;
//   next?: string | null;
// }

// interface FlowDefinition {
//   nodes: Record<string, JourneyNode>;
//   edges?: Array<{
//     id: string;
//     source: string;
//     target: string;
//   }>;
// }

// interface EntryTrigger {
//   type: string;
//   segment?: string;
//   event_name?: string;
//   conditions?: Record<string, any>;
// }

// class JourneyEngine {
//   // Start monitoring a journey for new entries
//   async startJourney(journeyId: string) {
//     console.log(`[JourneyEngine] Starting journey: ${journeyId}`);

//     const { data: journey } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', journeyId)
//       .single();

//     if (!journey) {
//       throw new Error('Journey not found');
//     }

//     // Add null check and type assertion for entry_trigger
//     if (!journey.entry_trigger) {
//       throw new Error('Journey entry trigger not configured');
//     }

//     // Safe type casting through unknown
//     const entryTrigger = journey.entry_trigger as unknown as EntryTrigger;

//     // If entry trigger is segment-based, enroll all matching subscribers
//     if (entryTrigger.type === 'segment' && entryTrigger.segment) {
//       await this.enrollSegment(journeyId, entryTrigger.segment);
//     }

//     // Set up event listener for event-based triggers
//     if (entryTrigger.type === 'event' && entryTrigger.event_name) {
//       console.log(`[JourneyEngine] Listening for event: ${entryTrigger.event_name}`);
//     }
//   }

//   // Pause a journey (stop new enrollments)
//   async pauseJourney(journeyId: string) {
//     console.log(`[JourneyEngine] Pausing journey: ${journeyId}`);
//     await cancelScheduledTasks(journeyId);
//   }

//   // Enroll all subscribers in a segment
//   async enrollSegment(journeyId: string, segment: string) {
//     const { data: journey } = await supabase
//       .from('journeys')
//       .select('website_id')
//       .eq('id', journeyId)
//       .single();

//     if (!journey) return;

//     let query = supabase
//       .from('subscribers')
//       .select('id')
//       .eq('website_id', journey.website_id)
//       .eq('status', 'active');

//     if (segment === 'active') {
//       const sevenDaysAgo = new Date();
//       sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
//       query = query.gte('last_seen_at', sevenDaysAgo.toISOString());
//     } else if (segment === 'inactive') {
//       const thirtyDaysAgo = new Date();
//       thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
//       query = query.lt('last_seen_at', thirtyDaysAgo.toISOString());
//     }

//     const { data: subscribers } = await query;

//     if (!subscribers) return;

//     for (const subscriber of subscribers) {
//       await this.enrollUser(journeyId, subscriber.id);
//     }

//     console.log(`[JourneyEngine] Enrolled ${subscribers.length} subscribers in journey ${journeyId}`);
//   }

//   // Enroll a single user in a journey
//   async enrollUser(journeyId: string, subscriberId: string, context: any = {}) {
//     console.log(`[JourneyEngine] Enrolling user ${subscriberId} in journey ${journeyId}`);

//     const { data: journey } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', journeyId)
//       .single();

//     if (!journey || journey.status !== 'active') {
//       console.log(`[JourneyEngine] Journey not active, skipping enrollment`);
//       return;
//     }

//     const { data: existingState } = await supabase
//       .from('user_journey_states')
//       .select('id, status')
//       .eq('journey_id', journeyId)
//       .eq('subscriber_id', subscriberId)
//       .eq('status', 'active')
//       .maybeSingle();

//     // Safe type casting through unknown for settings
//     const settings = (journey.settings ? 
//       journey.settings as unknown as JourneySettings : 
//       {}) as JourneySettings;

//     if (existingState && !settings.allow_reentry) {
//       console.log(`[JourneyEngine] User already in journey, skipping`);
//       return;
//     }

//     const { data: userState, error } = await supabase
//       .from('user_journey_states')
//       .insert({
//         journey_id: journeyId,
//         subscriber_id: subscriberId,
//         current_step_id: 'entry',
//         status: 'active',
//         context: context,
//       })
//       .select()
//       .single();

//     if (error) {
//       console.error('[JourneyEngine] Error creating user state:', error);
//       return;
//     }

//     await this.logEvent(journeyId, subscriberId, userState.id, 'entered', 'entry');

//     await supabase
//       .from('journeys')
//       .update({
//         total_entered: (journey.total_entered || 0) + 1,
//         total_active: (journey.total_active || 0) + 1,
//       })
//       .eq('id', journeyId);

//     await this.executeStep(userState.id, journey, 'entry');
//   }

//   // Execute a journey step
//   async executeStep(userStateId: string, journey: any, stepId: string) {
//     console.log(`[JourneyEngine] Executing step ${stepId} for user state ${userStateId}`);

//     // Safe type casting through unknown for flow definition
//     const flowDefinition = (journey.flow_definition ? 
//       journey.flow_definition as unknown as FlowDefinition : 
//       { nodes: {} }) as FlowDefinition;

//     const step: JourneyNode | undefined = flowDefinition.nodes[stepId];

//     if (!step) {
//       console.error(`[JourneyEngine] Step ${stepId} not found`);
//       return;
//     }

//     const { data: userState } = await supabase
//       .from('user_journey_states')
//       .select('*, subscribers(id, endpoint, auth_key, p256dh_key)')
//       .eq('id', userStateId)
//       .single();

//     if (!userState || userState.status !== 'active') {
//       console.log(`[JourneyEngine] User state not active, stopping execution`);
//       return;
//     }

//     await supabase
//       .from('user_journey_states')
//       .update({ current_step_id: stepId })
//       .eq('id', userStateId);

//     switch (step.type) {
//       case 'entry':
//         if (step.next) {
//           await this.executeStep(userStateId, journey, step.next);
//         }
//         break;

//       case 'wait':
//         await this.handleWait(userStateId, journey, step);
//         break;

//       case 'message':
//         await this.handleMessage(userStateId, journey, step, userState);
//         break;

//       case 'branch':
//         await this.handleBranch(userStateId, journey, step, userState);
//         break;

//       case 'webhook':
//         await this.handleWebhook(userStateId, journey, step);
//         break;

//       case 'exit':
//         await this.handleExit(userStateId, journey);
//         break;

//       default:
//         console.error(`[JourneyEngine] Unknown step type: ${step.type}`);
//     }
//   }

//   // Handle wait step
//   async handleWait(userStateId: string, journey: any, step: JourneyNode) {
//     const duration = step.data.duration;
//     const executeAt = this.calculateExecuteTime(duration);

//     console.log(`[JourneyEngine] Scheduling next step at ${executeAt}`);

//     await supabase
//       .from('scheduled_journey_steps')
//       .insert({
//         user_journey_state_id: userStateId,
//         step_id: step.next || 'exit',
//         execute_at: executeAt,
//         payload: { journey_id: journey.id },
//         status: 'pending',
//       });

//     await scheduleTask({
//       type: 'journey_step',
//       executeAt,
//       data: {
//         userStateId,
//         journeyId: journey.id,
//         stepId: step.next,
//       },
//     });

//     await this.logEvent(
//       journey.id,
//       userStateId,
//       userStateId,
//       'wait_scheduled',
//       step.id,
//       { execute_at: executeAt }
//     );
//   }

//   // Handle message step
//   async handleMessage(userStateId: string, journey: any, step: JourneyNode, userState: any) {
//     console.log(`[JourneyEngine] Sending message: ${step.data.title}`);

//     try {
//       const result = await sendNotification({
//         subscriberId: userState.subscriber_id,
//         websiteId: journey.website_id,
//         notification: {
//           title: step.data.title,
//           body: step.data.body,
//           icon: step.data.icon_url,
//           image: step.data.image_url,
//           data: {
//             url: step.data.click_url,
//           },
//         },
//       });

//       await this.logEvent(
//         journey.id,
//         userState.subscriber_id,
//         userStateId,
//         'message_sent',
//         step.id,
//         { notification_result: result }
//       );

//       if (step.next) {
//         await this.executeStep(userStateId, journey, step.next);
//       }
//     } catch (error: any) {
//       console.error('[JourneyEngine] Message send error:', error);
//       await this.logEvent(
//         journey.id,
//         userState.subscriber_id,
//         userStateId,
//         'message_failed',
//         step.id,
//         { error: error.message }
//       );
//     }
//   }

//   // Handle branch step
//   async handleBranch(userStateId: string, journey: any, step: JourneyNode, userState: any) {
//     const condition = step.data.condition;

//     const { data: subscriber } = await supabase
//       .from('subscribers')
//       .select('*')
//       .eq('id', userState.subscriber_id)
//       .single();

//     const conditionResult = this.evaluateCondition(condition, {
//       subscriber,
//       context: userState.context,
//     });

//     const nextStepId = step.data.branches[conditionResult ? 'true' : 'false'];

//     await this.logEvent(
//       journey.id,
//       userState.subscriber_id,
//       userStateId,
//       'branch_evaluated',
//       step.id,
//       { condition_result: conditionResult, next_step: nextStepId }
//     );

//     if (nextStepId) {
//       await this.executeStep(userStateId, journey, nextStepId);
//     }
//   }

//   // Handle webhook step
//   async handleWebhook(userStateId: string, journey: any, step: JourneyNode) {
//     const { url, method, headers, payload } = step.data;

//     try {
//       const response = await fetch(url, {
//         method: method || 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           ...headers,
//         },
//         body: JSON.stringify({
//           journey_id: journey.id,
//           user_state_id: userStateId,
//           ...payload,
//         }),
//       });

//       await this.logEvent(
//         journey.id,
//         userStateId,
//         userStateId,
//         'webhook_sent',
//         step.id,
//         { status: response.status }
//       );

//       if (step.next) {
//         await this.executeStep(userStateId, journey, step.next);
//       }
//     } catch (error: any) {
//       console.error('[JourneyEngine] Webhook error:', error);
//       await this.logEvent(
//         journey.id,
//         userStateId,
//         userStateId,
//         'webhook_failed',
//         step.id,
//         { error: error.message }
//       );
//     }
//   }

//   // Handle exit step
//   async handleExit(userStateId: string, journey: any) {
//     console.log(`[JourneyEngine] Exiting journey for user state ${userStateId}`);

//     const { data: userState } = await supabase
//       .from('user_journey_states')
//       .update({
//         status: 'completed',
//         completed_at: new Date().toISOString(),
//       })
//       .eq('id', userStateId)
//       .select()
//       .single();

//     if (userState) {
//       await this.logEvent(
//         journey.id,
//         userState.subscriber_id,
//         userStateId,
//         'completed',
//         'exit'
//       );

//       const { data: journeyData } = await supabase
//         .from('journeys')
//         .select('total_completed, total_active')
//         .eq('id', journey.id)
//         .single();

//       if (journeyData) {
//         await supabase
//           .from('journeys')
//           .update({
//             total_completed: (journeyData.total_completed || 0) + 1,
//             total_active: Math.max((journeyData.total_active || 0) - 1, 0),
//           })
//           .eq('id', journey.id);
//       }
//     }
//   }

//   // Helper: Calculate execution time for wait steps
//   calculateExecuteTime(duration: { value: number; unit: string }): string {
//     const now = new Date();
//     const units: Record<string, number> = {
//       minutes: 60 * 1000,
//       hours: 60 * 60 * 1000,
//       days: 24 * 60 * 60 * 1000,
//     };

//     const delay = duration.value * (units[duration.unit] || 0);
//     const executeAt = new Date(now.getTime() + delay);

//     return executeAt.toISOString();
//   }

//   // Helper: Evaluate branch condition
//   evaluateCondition(condition: any, data: any): boolean {
//     const { field, operator, value } = condition;

//     const actualValue = field.split('.').reduce((obj: any, key: string) => obj?.[key], data);

//     switch (operator) {
//       case 'equals':
//         return actualValue === value;
//       case 'not_equals':
//         return actualValue !== value;
//       case 'contains':
//         return String(actualValue).includes(value);
//       case 'greater_than':
//         return Number(actualValue) > Number(value);
//       case 'less_than':
//         return Number(actualValue) < Number(value);
//       default:
//         return false;
//     }
//   }

//   // Helper: Log journey events
//   async logEvent(
//     journeyId: string,
//     subscriberId: string,
//     userStateId: string,
//     eventType: string,
//     stepId?: string,
//     metadata?: any
//   ) {
//     await supabase.from('journey_events').insert({
//       journey_id: journeyId,
//       subscriber_id: subscriberId,
//       user_journey_state_id: userStateId,
//       event_type: eventType,
//       step_id: stepId,
//       metadata,
//     });
//   }
// }

// export const journeyEngine = new JourneyEngine();


//backend/lib/journeyEngine.ts

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { scheduleTask, cancelScheduledTasks } from './scheduler';
import { sendNotification } from './notifications';

// Create service role client for backend operations
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Type definitions for journey settings and flow
interface JourneySettings {
  allow_reentry?: boolean;
  max_duration_days?: number;
  timezone?: string;
  [key: string]: any;
}

interface JourneyNode {
  id: string;
  type: 'entry' | 'wait' | 'message' | 'branch' | 'exit' | 'webhook';
  data: any;
  next?: string | null;
}

interface FlowDefinition {
  nodes: Record<string, JourneyNode>;
  edges?: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}

interface EntryTrigger {
  type: string;
  segment?: string;
  event_name?: string;
  conditions?: Record<string, any>;
}

class JourneyEngine {
  // Start monitoring a journey for new entries
  async startJourney(journeyId: string) {
    console.log(`[JourneyEngine] Starting journey: ${journeyId}`);

    const { data: journey } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', journeyId)
      .single();

    if (!journey) {
      throw new Error('Journey not found');
    }

    // Add null check and type assertion for entry_trigger
    if (!journey.entry_trigger) {
      throw new Error('Journey entry trigger not configured');
    }

    // Safe type casting through unknown
    const entryTrigger = journey.entry_trigger as unknown as EntryTrigger;

    // If entry trigger is segment-based, enroll all matching subscribers
    if (entryTrigger.type === 'segment' && entryTrigger.segment) {
      await this.enrollSegment(journeyId, entryTrigger.segment);
    }

    // Set up event listener for event-based triggers
    if (entryTrigger.type === 'event' && entryTrigger.event_name) {
      console.log(`[JourneyEngine] Listening for event: ${entryTrigger.event_name}`);
    }
  }

  // Pause a journey (stop new enrollments)
  async pauseJourney(journeyId: string) {
    console.log(`[JourneyEngine] Pausing journey: ${journeyId}`);
    await cancelScheduledTasks(journeyId);
  }

  // Enroll all subscribers in a segment
  async enrollSegment(journeyId: string, segment: string) {
    const { data: journey } = await supabase
      .from('journeys')
      .select('website_id')
      .eq('id', journeyId)
      .single();

    if (!journey) return;

    let query = supabase
      .from('subscribers')
      .select('id')
      .eq('website_id', journey.website_id)
      .eq('status', 'active');

    if (segment === 'active') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte('last_seen_at', sevenDaysAgo.toISOString());
    } else if (segment === 'inactive') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.lt('last_seen_at', thirtyDaysAgo.toISOString());
    }

    const { data: subscribers } = await query;

    if (!subscribers) return;

    for (const subscriber of subscribers) {
      await this.enrollUser(journeyId, subscriber.id);
    }

    console.log(`[JourneyEngine] Enrolled ${subscribers.length} subscribers in journey ${journeyId}`);
  }

  // Enroll a single user in a journey
  async enrollUser(journeyId: string, subscriberId: string, context: any = {}) {
    console.log(`[JourneyEngine] Enrolling user ${subscriberId} in journey ${journeyId}`);

    const { data: journey } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', journeyId)
      .single();

    if (!journey || journey.status !== 'active') {
      console.log(`[JourneyEngine] Journey not active, skipping enrollment`);
      return;
    }

    const { data: existingState } = await supabase
      .from('user_journey_states')
      .select('id, status')
      .eq('journey_id', journeyId)
      .eq('subscriber_id', subscriberId)
      .eq('status', 'active')
      .maybeSingle();

    // Safe type casting through unknown for settings
    const settings = (journey.settings ? 
      journey.settings as unknown as JourneySettings : 
      {}) as JourneySettings;

    if (existingState && !settings.allow_reentry) {
      console.log(`[JourneyEngine] User already in journey, skipping`);
      return;
    }

    const { data: userState, error } = await supabase
      .from('user_journey_states')
      .insert({
        journey_id: journeyId,
        subscriber_id: subscriberId,
        current_step_id: 'entry',
        status: 'active',
        context: context,
      })
      .select()
      .single();

    if (error) {
      console.error('[JourneyEngine] Error creating user state:', error);
      return;
    }

    await this.logEvent(journeyId, subscriberId, userState.id, 'entered', 'entry');

    await supabase
      .from('journeys')
      .update({
        total_entered: (journey.total_entered || 0) + 1,
        total_active: (journey.total_active || 0) + 1,
      })
      .eq('id', journeyId);

    await this.executeStep(userState.id, journey, 'entry');
  }

  // Execute a journey step
  async executeStep(userStateId: string, journey: any, stepId: string) {
    console.log(`[JourneyEngine] Executing step ${stepId} for user state ${userStateId}`);

    // Safe type casting through unknown for flow definition
    const flowDefinition = (journey.flow_definition ? 
      journey.flow_definition as unknown as FlowDefinition : 
      { nodes: {} }) as FlowDefinition;

    const step: JourneyNode | undefined = flowDefinition.nodes[stepId];

    if (!step) {
      console.error(`[JourneyEngine] Step ${stepId} not found`);
      return;
    }

    const { data: userState } = await supabase
      .from('user_journey_states')
      .select('*, subscribers(id, endpoint, auth_key, p256dh_key)')
      .eq('id', userStateId)
      .single();

    if (!userState || userState.status !== 'active') {
      console.log(`[JourneyEngine] User state not active, stopping execution`);
      return;
    }

    await supabase
      .from('user_journey_states')
      .update({ current_step_id: stepId })
      .eq('id', userStateId);

    switch (step.type) {
      case 'entry':
        if (step.next) {
          await this.executeStep(userStateId, journey, step.next);
        }
        break;

      case 'wait':
        await this.handleWait(userStateId, journey, step);
        break;

      case 'message':
        await this.handleMessage(userStateId, journey, step, userState);
        break;

      case 'branch':
        await this.handleBranch(userStateId, journey, step, userState);
        break;

      case 'webhook':
        await this.handleWebhook(userStateId, journey, step);
        break;

      case 'exit':
        await this.handleExit(userStateId, journey);
        break;

      default:
        console.error(`[JourneyEngine] Unknown step type: ${step.type}`);
    }
  }

  // Handle wait step
  async handleWait(userStateId: string, journey: any, step: JourneyNode) {
    const duration = step.data.duration;
    const executeAt = this.calculateExecuteTime(duration);

    console.log(`[JourneyEngine] Scheduling next step at ${executeAt}`);

    await supabase
      .from('scheduled_journey_steps')
      .insert({
        user_journey_state_id: userStateId,
        step_id: step.next || 'exit',
        execute_at: executeAt,
        payload: { journey_id: journey.id },
        status: 'pending',
      });

    await scheduleTask({
      type: 'journey_step',
      executeAt,
      data: {
        userStateId,
        journeyId: journey.id,
        stepId: step.next,
      },
    });

    await this.logEvent(
      journey.id,
      userStateId,
      userStateId,
      'wait_scheduled',
      step.id,
      { execute_at: executeAt }
    );
  }

  // 🔥 UPDATED: Handle message step with click tracking
  async handleMessage(userStateId: string, journey: any, step: JourneyNode, userState: any) {
    console.log(`[JourneyEngine] Sending message: ${step.data.title}`);

    try {
      // 🔥 UPDATED: Include journey and node tracking IDs
      const result = await sendNotification({
        subscriberId: userState.subscriber_id,
        websiteId: journey.website_id,
        journeyId: journey.id,     // 🔥 ADD THIS for journey tracking
        nodeId: step.id,           // 🔥 ADD THIS for step tracking
        notification: {
          title: step.data.title,
          body: step.data.body,
          icon: step.data.icon_url,
          image: step.data.image_url,
          data: {
            url: step.data.click_url,
          },
        },
      });

      await this.logEvent(
        journey.id,
        userState.subscriber_id,
        userStateId,
        'message_sent',
        step.id,
        { notification_result: result }
      );

      if (step.next) {
        await this.executeStep(userStateId, journey, step.next);
      }
    } catch (error: any) {
      console.error('[JourneyEngine] Message send error:', error);
      await this.logEvent(
        journey.id,
        userState.subscriber_id,
        userStateId,
        'message_failed',
        step.id,
        { error: error.message }
      );
    }
  }

  // Handle branch step
  async handleBranch(userStateId: string, journey: any, step: JourneyNode, userState: any) {
    const condition = step.data.condition;

    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', userState.subscriber_id)
      .single();

    const conditionResult = this.evaluateCondition(condition, {
      subscriber,
      context: userState.context,
    });

    const nextStepId = step.data.branches[conditionResult ? 'true' : 'false'];

    await this.logEvent(
      journey.id,
      userState.subscriber_id,
      userStateId,
      'branch_evaluated',
      step.id,
      { condition_result: conditionResult, next_step: nextStepId }
    );

    if (nextStepId) {
      await this.executeStep(userStateId, journey, nextStepId);
    }
  }

  // Handle webhook step
  async handleWebhook(userStateId: string, journey: any, step: JourneyNode) {
    const { url, method, headers, payload } = step.data;

    try {
      const response = await fetch(url, {
        method: method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          journey_id: journey.id,
          user_state_id: userStateId,
          ...payload,
        }),
      });

      await this.logEvent(
        journey.id,
        userStateId,
        userStateId,
        'webhook_sent',
        step.id,
        { status: response.status }
      );

      if (step.next) {
        await this.executeStep(userStateId, journey, step.next);
      }
    } catch (error: any) {
      console.error('[JourneyEngine] Webhook error:', error);
      await this.logEvent(
        journey.id,
        userStateId,
        userStateId,
        'webhook_failed',
        step.id,
        { error: error.message }
      );
    }
  }

  // Handle exit step
  async handleExit(userStateId: string, journey: any) {
    console.log(`[JourneyEngine] Exiting journey for user state ${userStateId}`);

    const { data: userState } = await supabase
      .from('user_journey_states')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', userStateId)
      .select()
      .single();

    if (userState) {
      await this.logEvent(
        journey.id,
        userState.subscriber_id,
        userStateId,
        'completed',
        'exit'
      );

      const { data: journeyData } = await supabase
        .from('journeys')
        .select('total_completed, total_active')
        .eq('id', journey.id)
        .single();

      if (journeyData) {
        await supabase
          .from('journeys')
          .update({
            total_completed: (journeyData.total_completed || 0) + 1,
            total_active: Math.max((journeyData.total_active || 0) - 1, 0),
          })
          .eq('id', journey.id);
      }
    }
  }

  // Helper: Calculate execution time for wait steps
  calculateExecuteTime(duration: { value: number; unit: string }): string {
    const now = new Date();
    const units: Record<string, number> = {
      minutes: 60 * 1000,
      hours: 60 * 60 * 1000,
      days: 24 * 60 * 60 * 1000,
    };

    const delay = duration.value * (units[duration.unit] || 0);
    const executeAt = new Date(now.getTime() + delay);

    return executeAt.toISOString();
  }

  // Helper: Evaluate branch condition
  evaluateCondition(condition: any, data: any): boolean {
    const { field, operator, value } = condition;

    const actualValue = field.split('.').reduce((obj: any, key: string) => obj?.[key], data);

    switch (operator) {
      case 'equals':
        return actualValue === value;
      case 'not_equals':
        return actualValue !== value;
      case 'contains':
        return String(actualValue).includes(value);
      case 'greater_than':
        return Number(actualValue) > Number(value);
      case 'less_than':
        return Number(actualValue) < Number(value);
      default:
        return false;
    }
  }

  // Helper: Log journey events
  async logEvent(
    journeyId: string,
    subscriberId: string,
    userStateId: string,
    eventType: string,
    stepId?: string,
    metadata?: any
  ) {
    await supabase.from('journey_events').insert({
      journey_id: journeyId,
      subscriber_id: subscriberId,
      user_journey_state_id: userStateId,
      event_type: eventType,
      step_id: stepId,
      metadata,
    });
  }
}

export const journeyEngine = new JourneyEngine();