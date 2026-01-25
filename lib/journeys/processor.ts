// // // backend/lib/journeys/processor.ts
// // import { createClient } from '@supabase/supabase-js';
// // import webpush from 'web-push';

// // const supabase = createClient(
// //   process.env.NEXT_PUBLIC_SUPABASE_URL!,
// //   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// // );

// // export interface ProcessingResult {
// //   processed: number;
// //   failed: number;
// //   skipped: number;
// // }

// // export interface JourneyStep {
// //   id: string;
// //   type: 'send_notification' | 'delay' | 'wait_for_event' | 'condition' | 'split';
// //   config: {
// //     title?: string;
// //     body?: string;
// //     click_url?: string;
// //     icon_url?: string;
// //     delay_value?: number;
// //     delay_unit?: 'minutes' | 'hours' | 'days';
// //     event_name?: string;
// //     timeout_value?: number;
// //     timeout_unit?: 'minutes' | 'hours' | 'days';
// //     condition?: {
// //       field: string;
// //       operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
// //       value: any;
// //     };
// //   };
// //   next_step_id?: string;
// //   fallback_step_id?: string;
// // }

// // class JourneyProcessor {
// //   private processing = false;
// //   private lastProcessTime = 0;
// //   private MIN_PROCESS_INTERVAL = 5000; // 5 seconds between runs

// //   // ✅ KEEP ONLY THIS VERSION - with ProcessingResult return type
// //   async processDueSteps(): Promise<ProcessingResult> {
// //     // Prevent concurrent processing
// //     if (this.processing) {
// //       console.log('[JourneyProcessor] Already processing, skipping');
// //       return { processed: 0, failed: 0, skipped: 0 };
// //     }

// //     // Rate limiting
// //     const now = Date.now();
// //     if (now - this.lastProcessTime < this.MIN_PROCESS_INTERVAL) {
// //       console.log('[JourneyProcessor] Too soon since last run, skipping');
// //       return { processed: 0, failed: 0, skipped: 0 };
// //     }

// //     this.processing = true;
// //     this.lastProcessTime = now;

// //     let processedCount = 0;
// //     let failedCount = 0;
// //     let skippedCount = 0;

// //     try {
// //       console.log('[JourneyProcessor] Starting processing run');

// //       const { data: dueSteps, error } = await supabase
// //         .from('scheduled_journey_steps')
// //         .select(`
// //           *,
// //           user_journey_state:user_journey_states!scheduled_journey_steps_user_journey_state_id_fkey(*)
// //         `)
// //         .eq('status', 'pending')
// //         .lte('execute_at', new Date().toISOString())
// //         .order('execute_at', { ascending: true })
// //         .limit(50);

// //       if (error) {
// //         console.error('[JourneyProcessor] Query error:', error);
// //         throw error;
// //       }

// //       const totalSteps = dueSteps?.length || 0;
// //       console.log(`[JourneyProcessor] Found ${totalSteps} due steps`);

// //       for (const scheduledStep of dueSteps || []) {
// //         try {
// //           await this.executeScheduledStep(scheduledStep);
// //           processedCount++;
// //           console.log(`[JourneyProcessor] ✅ Step ${scheduledStep.id} processed (${processedCount}/${totalSteps})`);
// //         } catch (error: any) {
// //           failedCount++;
// //           console.error(`[JourneyProcessor] ❌ Step ${scheduledStep.id} failed:`, error.message);
// //         }
// //       }

// //       console.log(`[JourneyProcessor] ✅ Completed: ${processedCount} processed, ${failedCount} failed, ${skippedCount} skipped`);
      
// //       return { 
// //         processed: processedCount, 
// //         failed: failedCount,
// //         skipped: skippedCount
// //       };
      
// //     } catch (error: any) {
// //       console.error('[JourneyProcessor] 💥 Fatal error:', error.message);
// //       return { 
// //         processed: processedCount, 
// //         failed: failedCount,
// //         skipped: skippedCount
// //       };
// //     } finally {
// //       this.processing = false;
// //     }
// //   }

// //   private async executeScheduledStep(scheduledStep: any): Promise<void> {
// //     const { id, user_journey_state_id, step_id, payload } = scheduledStep;

// //     try {
// //       console.log(`[JourneyProcessor] Executing step ${step_id}`);

// //       // Mark as executing
// //       await supabase
// //         .from('scheduled_journey_steps')
// //         .update({ status: 'executing' })
// //         .eq('id', id)
// //         .eq('status', 'pending'); // Only if still pending

      
// //       const { data: journeyState } = await supabase
// //         .from('user_journey_states')
// //         .select(`
// //           *,
// //           journey:journeys(*)
// //         `)
// //         .eq('id', user_journey_state_id)
// //         .single();

// //       if (!journeyState) {
// //         throw new Error('Journey state not found');
// //       }

// //       // Find the step in journey definition
// //       const journey = journeyState.journey;
// //       const step = journey.flow_definition.nodes.find(
// //         (n: any) => n.id === step_id
// //       );

// //       if (!step) {
// //         throw new Error(`Step ${step_id} not found in journey`);
// //       }

// //       // Execute the step
// //       await this.executeStep(journeyState, step, payload);

// //       // Mark as completed
// //       await supabase
// //         .from('scheduled_journey_steps')
// //         .update({
// //           status: 'completed',
// //           executed_at: new Date().toISOString(),
// //         })
// //         .eq('id', id);

// //       // Move to next step
// //       await this.advanceJourney(journeyState, step);

// //     } catch (error: any) {
// //       console.error(`[JourneyProcessor] Failed step ${id}:`, error);

// //       await supabase
// //         .from('scheduled_journey_steps')
// //         .update({
// //           status: 'failed',
// //           payload: { ...payload, error: error.message },
// //         })
// //         .eq('id', id);
// //     }
// //   }

// //   private async executeStep(
// //     journeyState: any,
// //     step: any,
// //     payload?: any
// //   ): Promise<void> {
// //     const stepType = step.type || step.data?.type;

// //     console.log(`[JourneyProcessor] Executing ${stepType} step`);

// //     switch (stepType) {
// //       case 'send_notification':
// //         await this.executeSendNotification(journeyState, step);
// //         break;

// //       case 'delay':
// //         console.log('[JourneyProcessor] Delay step completed');
// //         break;

// //       case 'wait_for_event':
// //         await this.executeWaitForEvent(journeyState, step);
// //         break;

// //       case 'condition':
// //         await this.executeCondition(journeyState, step);
// //         break;

// //       case 'split':
// //         await this.executeSplit(journeyState, step);
// //         break;

// //       default:
// //         console.warn(`[JourneyProcessor] Unknown step type: ${stepType}`);
// //     }

// //     // Log event
// //     await supabase.from('journey_events').insert({
// //       journey_id: journeyState.journey_id,
// //       subscriber_id: journeyState.subscriber_id,
// //       user_journey_state_id: journeyState.id,
// //       step_id: step.id,
// //       event_type: 'step_executed',
// //       metadata: { step_type: stepType },
// //     });
// //   }

// //   private async executeSendNotification(
// //     journeyState: any,
// //     step: any
// //   ): Promise<void> {
// //     const config = step.config || step.data?.config || {};
// //     const { title, body, click_url, icon_url } = config;

// //     // Get subscriber
// //     const { data: subscriber } = await supabase
// //       .from('subscribers')
// //       .select('*')
// //       .eq('id', journeyState.subscriber_id)
// //       .single();

// //     if (!subscriber || !subscriber.endpoint) {
// //       console.log('[JourneyProcessor] Subscriber has no valid subscription');
// //       return;
// //     }

// //     // Get website VAPID keys
// //     const { data: website } = await supabase
// //       .from('websites')
// //       .select('vapid_public_key, vapid_private_key')
// //       .eq('id', journeyState.journey.website_id)
// //       .single();

// //     if (!website?.vapid_public_key || !website?.vapid_private_key) {
// //       throw new Error('Website VAPID keys not configured');
// //     }

// //     // Set VAPID details
// //     webpush.setVapidDetails(
// //       'mailto:support@yourapp.com',
// //       website.vapid_public_key,
// //       website.vapid_private_key
// //     );

// //     // Build push subscription
// //     const pushSubscription = {
// //       endpoint: subscriber.endpoint,
// //       keys: {
// //         p256dh: subscriber.p256dh_key,
// //         auth: subscriber.auth_key,
// //       },
// //     };

// //     // Send notification
// //     const payload = JSON.stringify({
// //       title: title || 'Notification',
// //       body: body || '',
// //       icon: icon_url,
// //       data: {
// //         url: click_url,
// //         journey_id: journeyState.journey_id,
// //       },
// //     });

// //     try {
// //       await webpush.sendNotification(pushSubscription, payload);
// //       console.log('[JourneyProcessor] Notification sent successfully');

// //       // Log notification
// //       await supabase.from('notification_logs').insert({
// //         website_id: journeyState.journey.website_id,
// //         subscriber_id: subscriber.id,
// //         status: 'delivered',
// //         sent_at: new Date().toISOString(),
// //         delivered_at: new Date().toISOString(),
// //       });
// //     } catch (error: any) {
// //       console.error('[JourneyProcessor] Failed to send notification:', error);

// //       await supabase.from('notification_logs').insert({
// //         website_id: journeyState.journey.website_id,
// //         subscriber_id: subscriber.id,
// //         status: 'failed',
// //         error_message: error.message,
// //         sent_at: new Date().toISOString(),
// //       });

// //       throw error;
// //     }
// //   }

// //   private async executeWaitForEvent(
// //     journeyState: any,
// //     step: any
// //   ): Promise<void> {
// //     const config = step.config || step.data?.config || {};
// //     const { event_name, timeout_value = 24, timeout_unit = 'hours' } = config;

// //     // Calculate timeout
// //     const timeoutMs = this.calculateDelay(timeout_value, timeout_unit);
// //     const timeoutAt = new Date(Date.now() + timeoutMs);

// //     // Update journey state to waiting
// //     await supabase
// //       .from('user_journey_states')
// //       .update({
// //         status: 'waiting',
// //         current_step_id: step.id,
// //         context: {
// //           ...journeyState.context,
// //           waiting_for_event: event_name,
// //           timeout_at: timeoutAt.toISOString(),
// //         },
// //       })
// //       .eq('id', journeyState.id);

// //     // Schedule timeout fallback
// //     const connections = journeyState.journey.flow_definition.edges || [];
// //     const fallbackEdge = connections.find(
// //       (e: any) => e.from === step.id && e.condition === 'timeout'
// //     );

// //     if (fallbackEdge) {
// //       await this.scheduleStep(
// //         journeyState.id,
// //         fallbackEdge.to,
// //         timeoutAt,
// //         { reason: 'timeout' }
// //       );
// //     }

// //     console.log(`[JourneyProcessor] Waiting for event: ${event_name}`);
// //   }

// //   private async executeCondition(
// //     journeyState: any,
// //     step: any
// //   ): Promise<void> {
// //     const config = step.config || step.data?.config || {};
// //     const { condition } = config;

// //     if (!condition) {
// //       console.warn('[JourneyProcessor] Condition config missing');
// //       return;
// //     }

// //     // Evaluate condition
// //     const result = await this.evaluateCondition(journeyState, condition);
// //     console.log(`[JourneyProcessor] Condition result: ${result}`);

// //     // Find next step based on result
// //     const connections = journeyState.journey.flow_definition.edges || [];
// //     const nextEdge = connections.find(
// //       (e: any) => e.from === step.id && e.condition === (result ? 'yes' : 'no')
// //     );

// //     if (nextEdge) {
// //       await supabase
// //         .from('user_journey_states')
// //         .update({ current_step_id: nextEdge.to })
// //         .eq('id', journeyState.id);
// //     }
// //   }

// //   private async executeSplit(journeyState: any, step: any): Promise<void> {
// //     // Random 50/50 split
// //     const takeMainBranch = Math.random() < 0.5;

// //     const connections = journeyState.journey.flow_definition.edges || [];
// //     const nextEdge = connections.find(
// //       (e: any) => e.from === step.id && e.condition === (takeMainBranch ? 'A' : 'B')
// //     );

// //     if (nextEdge) {
// //       await supabase
// //         .from('user_journey_states')
// //         .update({
// //           current_step_id: nextEdge.to,
// //           context: {
// //             ...journeyState.context,
// //             split_branch: takeMainBranch ? 'A' : 'B',
// //           },
// //         })
// //         .eq('id', journeyState.id);
// //     }

// //     console.log(`[JourneyProcessor] Split: ${takeMainBranch ? 'A' : 'B'}`);
// //   }

// //   private async advanceJourney(
// //     journeyState: any,
// //     currentStep: any
// //   ): Promise<void> {
// //     // Find next step connection
// //     const connections = journeyState.journey.flow_definition.edges || [];
// //     const nextEdge = connections.find(
// //       (e: any) => e.from === currentStep.id && !e.condition
// //     );

// //     if (!nextEdge) {
// //       // Journey complete
// //       await supabase
// //         .from('user_journey_states')
// //         .update({
// //           status: 'completed',
// //           completed_at: new Date().toISOString(),
// //         })
// //         .eq('id', journeyState.id);

// //       console.log('[JourneyProcessor] Journey completed');
// //       return;
// //     }

// //     const nextStep = journeyState.journey.flow_definition.nodes.find(
// //       (n: any) => n.id === nextEdge.to
// //     );

// //     if (!nextStep) {
// //       console.warn(`[JourneyProcessor] Next step ${nextEdge.to} not found`);
// //       return;
// //     }

// //     // Update current step
// //     await supabase
// //       .from('user_journey_states')
// //       .update({ current_step_id: nextStep.id })
// //       .eq('id', journeyState.id);

// //     const stepType = nextStep.type || nextStep.data?.type;
// // // If delay, schedule it
// // if (stepType === 'delay' || stepType === 'wait') {  // ✅ Support both 'delay' and 'wait'
// //   const config = { ...(nextStep.data || {}), ...(nextStep.data?.config || {}) };
  
// //   // ✅ Handle both formats: duration (seconds) and delay_value/delay_unit
// //   let delayMs: number;
// //   if (config.duration) {
// //     // Frontend format: duration in seconds
// //     delayMs = config.duration * 1000;
// //   } else {
// //     // Backend format: delay_value and delay_unit
// //     const { delay_value = 1, delay_unit = 'hours' } = config;
// //     delayMs = this.calculateDelay(delay_value, delay_unit);
// //   }
  
// //   const executeAt = new Date(Date.now() + delayMs);

// //   await this.scheduleStep(journeyState.id, nextStep.id, executeAt, {
// //     delay_value: config.delay_value,
// //     delay_unit: config.delay_unit,
// //     duration: config.duration,
// //   });

// //   console.log(`[JourneyProcessor] Scheduled delay for ${executeAt}`);
// // }
// //     // // If delay, schedule it
// //     // if (stepType === 'delay') {
// //     //   const config = nextStep.config || nextStep.data?.config || {};
// //     //   const { delay_value = 1, delay_unit = 'hours' } = config;
// //     //   const delayMs = this.calculateDelay(delay_value, delay_unit);
// //     //   const executeAt = new Date(Date.now() + delayMs);

// //     //   await this.scheduleStep(journeyState.id, nextStep.id, executeAt, {
// //     //     delay_value,
// //     //     delay_unit,
// //     //   });

// //     //   console.log(`[JourneyProcessor] Scheduled delay for ${executeAt}`);
// //     // } 
// //     else {
// //       // Execute immediately
// //       await this.executeStep(journeyState, nextStep);
// //       await this.advanceJourney(journeyState, nextStep);
// //     }
// //   }

// //   private calculateDelay(
// //     value: number,
// //     unit: 'minutes' | 'hours' | 'days'
// //   ): number {
// //     const multipliers = {
// //       minutes: 60 * 1000,
// //       hours: 60 * 60 * 1000,
// //       days: 24 * 60 * 60 * 1000,
// //     };
// //     return value * multipliers[unit];
// //   }

// //   private async evaluateCondition(
// //     journeyState: any,
// //     condition: any
// //   ): Promise<boolean> {
// //     const value = journeyState.context?.[condition.field];

// //     switch (condition.operator) {
// //       case 'equals':
// //         return value === condition.value;
// //       case 'contains':
// //         return String(value).includes(condition.value);
// //       case 'greater_than':
// //         return Number(value) > Number(condition.value);
// //       case 'less_than':
// //         return Number(value) < Number(condition.value);
// //       default:
// //         return false;
// //     }
// //   }

// //   private async scheduleStep(
// //     journeyStateId: string,
// //     stepId: string,
// //     executeAt: Date,
// //     payload: any
// //   ): Promise<void> {
// //     await supabase.from('scheduled_journey_steps').insert({
// //       user_journey_state_id: journeyStateId,
// //       step_id: stepId,
// //       execute_at: executeAt.toISOString(),
// //       status: 'pending',
// //       payload,
// //     });
// //   }
// // }

// // export const journeyProcessor = new JourneyProcessor();

// // backend/lib/journeys/processor.ts
// import { createClient } from '@supabase/supabase-js';
// import webpush from 'web-push';

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!,
// );

// export interface ProcessingResult {
//   processed: number;
//   failed: number;
//   skipped: number;
// }

// export interface JourneyStep {
//   id: string;
//   type: 'send_notification' | 'delay' | 'wait' | 'wait_for_event' | 'condition' | 'split';
//   config: {
//     title?: string;
//     body?: string;
//     click_url?: string;
//     icon_url?: string;
//     delay_value?: number;
//     delay_unit?: 'minutes' | 'hours' | 'days';
//     duration?: number; // in seconds (old format)
//     event_name?: string;
//     timeout_value?: number;
//     timeout_unit?: 'minutes' | 'hours' | 'days';
//     condition?: {
//       field: string;
//       operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
//       value: any;
//     };
//   };
//   next_step_id?: string;
//   fallback_step_id?: string;
// }

// // Helper function to merge step data and config
// function getStepConfig(step: any): any {
//   return { ...(step.data || {}), ...(step.data?.config || {}) };
// }

// class JourneyProcessor {
//   private processing = false;
//   private lastProcessTime = 0;
//   private MIN_PROCESS_INTERVAL = 5000; // 5 seconds between runs

//   async processDueSteps(): Promise<ProcessingResult> {
//     // Prevent concurrent processing
//     if (this.processing) {
//       console.log('[JourneyProcessor] Already processing, skipping');
//       return { processed: 0, failed: 0, skipped: 0 };
//     }

//     // Rate limiting
//     const now = Date.now();
//     if (now - this.lastProcessTime < this.MIN_PROCESS_INTERVAL) {
//       console.log('[JourneyProcessor] Too soon since last run, skipping');
//       return { processed: 0, failed: 0, skipped: 0 };
//     }

//     this.processing = true;
//     this.lastProcessTime = now;

//     let processedCount = 0;
//     let failedCount = 0;
//     let skippedCount = 0;

//     try {
//       console.log('[JourneyProcessor] Starting processing run');

//       const { data: dueSteps, error } = await supabase
//         .from('scheduled_journey_steps')
//         .select(`
//           *,
//           user_journey_state:user_journey_states!scheduled_journey_steps_user_journey_state_id_fkey(*)
//         `)
//         .eq('status', 'pending')
//         .lte('execute_at', new Date().toISOString())
//         .order('execute_at', { ascending: true })
//         .limit(50);

//       if (error) {
//         console.error('[JourneyProcessor] Query error:', error);
//         throw error;
//       }

//       const totalSteps = dueSteps?.length || 0;
//       console.log(`[JourneyProcessor] Found ${totalSteps} due steps`);

//       for (const scheduledStep of dueSteps || []) {
//         try {
//           await this.executeScheduledStep(scheduledStep);
//           processedCount++;
//           console.log(`[JourneyProcessor] ✅ Step ${scheduledStep.id} processed (${processedCount}/${totalSteps})`);
//         } catch (error: any) {
//           failedCount++;
//           console.error(`[JourneyProcessor] ❌ Step ${scheduledStep.id} failed:`, error.message);
//         }
//       }

//       console.log(`[JourneyProcessor] ✅ Completed: ${processedCount} processed, ${failedCount} failed, ${skippedCount} skipped`);
      
//       return { 
//         processed: processedCount, 
//         failed: failedCount,
//         skipped: skippedCount
//       };
      
//     } catch (error: any) {
//       console.error('[JourneyProcessor] 💥 Fatal error:', error.message);
//       return { 
//         processed: processedCount, 
//         failed: failedCount,
//         skipped: skippedCount
//       };
//     } finally {
//       this.processing = false;
//     }
//   }

//   private async executeScheduledStep(scheduledStep: any): Promise<void> {
//     const { id, user_journey_state_id, step_id, payload } = scheduledStep;

//     try {
//       console.log(`[JourneyProcessor] Executing step ${step_id}`);

//       // Mark as executing
//       await supabase
//         .from('scheduled_journey_steps')
//         .update({ status: 'executing' })
//         .eq('id', id)
//         .eq('status', 'pending');

//       const { data: journeyState } = await supabase
//         .from('user_journey_states')
//         .select(`
//           *,
//           journey:journeys(*)
//         `)
//         .eq('id', user_journey_state_id)
//         .single();

//       if (!journeyState) {
//         throw new Error('Journey state not found');
//       }

//       // Find the step in journey definition
//       const journey = journeyState.journey;
//       const step = journey.flow_definition.nodes.find(
//         (n: any) => n.id === step_id
//       );

//       if (!step) {
//         throw new Error(`Step ${step_id} not found in journey`);
//       }

//       // Execute the step
//       await this.executeStep(journeyState, step, payload);

//       // Mark as completed
//       await supabase
//         .from('scheduled_journey_steps')
//         .update({
//           status: 'completed',
//           executed_at: new Date().toISOString(),
//         })
//         .eq('id', id);

//       // Move to next step
//       await this.advanceJourney(journeyState, step);

//     } catch (error: any) {
//       console.error(`[JourneyProcessor] Failed step ${id}:`, error);

//       await supabase
//         .from('scheduled_journey_steps')
//         .update({
//           status: 'failed',
//           payload: { ...payload, error: error.message },
//         })
//         .eq('id', id);
//     }
//   }

//   private async executeStep(
//     journeyState: any,
//     step: any,
//     payload?: any
//   ): Promise<void> {
//     const stepType = step.type || step.data?.type;

//     console.log(`[JourneyProcessor] Executing ${stepType} step`);

//     switch (stepType) {
//       case 'send_notification':
//         await this.executeSendNotification(journeyState, step);
//         break;

//       case 'delay':
//       case 'wait':
//         console.log('[JourneyProcessor] Delay/wait step completed');
//         break;

//       case 'wait_for_event':
//         await this.executeWaitForEvent(journeyState, step);
//         break;

//       case 'condition':
//         await this.executeCondition(journeyState, step);
//         break;

//       case 'split':
//         await this.executeSplit(journeyState, step);
//         break;

//       default:
//         console.warn(`[JourneyProcessor] Unknown step type: ${stepType}`);
//     }

//     // Log event
//     await supabase.from('journey_events').insert({
//       journey_id: journeyState.journey_id,
//       subscriber_id: journeyState.subscriber_id,
//       user_journey_state_id: journeyState.id,
//       step_id: step.id,
//       event_type: 'step_executed',
//       metadata: { step_type: stepType },
//     });
//   }

//   private async executeSendNotification(
//     journeyState: any,
//     step: any
//   ): Promise<void> {
//     // Use helper to get merged config
//     const config = getStepConfig(step);
//     const { title, body, url, click_url, icon_url } = config;

//     // Get subscriber
//     const { data: subscriber } = await supabase
//       .from('subscribers')
//       .select('*')
//       .eq('id', journeyState.subscriber_id)
//       .single();

//     if (!subscriber || !subscriber.endpoint) {
//       console.log('[JourneyProcessor] Subscriber has no valid subscription');
//       return;
//     }

//     // Get website VAPID keys
//     const { data: website } = await supabase
//       .from('websites')
//       .select('vapid_public_key, vapid_private_key')
//       .eq('id', journeyState.journey.website_id)
//       .single();

//     if (!website?.vapid_public_key || !website?.vapid_private_key) {
//       throw new Error('Website VAPID keys not configured');
//     }

//     // Set VAPID details
//     webpush.setVapidDetails(
//       'mailto:support@yourapp.com',
//       website.vapid_public_key,
//       website.vapid_private_key
//     );

//     // Build push subscription
//     const pushSubscription = {
//       endpoint: subscriber.endpoint,
//       keys: {
//         p256dh: subscriber.p256dh_key,
//         auth: subscriber.auth_key,
//       },
//     };

//     // Send notification
//     const notificationPayload = JSON.stringify({
//       title: title || 'Notification',
//       body: body || '',
//       icon: icon_url,
//       data: {
//         url: click_url || url || '/',
//         journey_id: journeyState.journey_id,
//       },
//     });

//     try {
//       await webpush.sendNotification(pushSubscription, notificationPayload);
//       console.log('[JourneyProcessor] Notification sent successfully');

//       // Log notification
//       await supabase.from('notification_logs').insert({
//         website_id: journeyState.journey.website_id,
//         subscriber_id: subscriber.id,
//         status: 'delivered',
//         sent_at: new Date().toISOString(),
//         delivered_at: new Date().toISOString(),
//       });
//     } catch (error: any) {
//       console.error('[JourneyProcessor] Failed to send notification:', error);

//       await supabase.from('notification_logs').insert({
//         website_id: journeyState.journey.website_id,
//         subscriber_id: subscriber.id,
//         status: 'failed',
//         error_message: error.message,
//         sent_at: new Date().toISOString(),
//       });

//       throw error;
//     }
//   }

//   private async executeWaitForEvent(
//     journeyState: any,
//     step: any
//   ): Promise<void> {
//     const config = getStepConfig(step);
//     const { event_name, timeout_value = 24, timeout_unit = 'hours' } = config;

//     // Calculate timeout
//     const timeoutMs = this.calculateDelay(timeout_value, timeout_unit);
//     const timeoutAt = new Date(Date.now() + timeoutMs);

//     // Update journey state to waiting
//     await supabase
//       .from('user_journey_states')
//       .update({
//         status: 'waiting',
//         current_step_id: step.id,
//         context: {
//           ...journeyState.context,
//           waiting_for_event: event_name,
//           timeout_at: timeoutAt.toISOString(),
//         },
//       })
//       .eq('id', journeyState.id);

//     // Schedule timeout fallback
//     const connections = journeyState.journey.flow_definition.edges || [];
//     const fallbackEdge = connections.find(
//       (e: any) => e.from === step.id && e.condition === 'timeout'
//     );

//     if (fallbackEdge) {
//       await this.scheduleStep(
//         journeyState.id,
//         fallbackEdge.to,
//         timeoutAt,
//         { reason: 'timeout' }
//       );
//     }

//     console.log(`[JourneyProcessor] Waiting for event: ${event_name}`);
//   }

//   private async executeCondition(
//     journeyState: any,
//     step: any
//   ): Promise<void> {
//     const config = getStepConfig(step);
//     const { condition } = config;

//     if (!condition) {
//       console.warn('[JourneyProcessor] Condition config missing');
//       return;
//     }

//     // Evaluate condition
//     const result = await this.evaluateCondition(journeyState, condition);
//     console.log(`[JourneyProcessor] Condition result: ${result}`);

//     // Find next step based on result
//     const connections = journeyState.journey.flow_definition.edges || [];
//     const nextEdge = connections.find(
//       (e: any) => e.from === step.id && e.condition === (result ? 'yes' : 'no')
//     );

//     if (nextEdge) {
//       await supabase
//         .from('user_journey_states')
//         .update({ current_step_id: nextEdge.to })
//         .eq('id', journeyState.id);
//     }
//   }

//   private async executeSplit(journeyState: any, step: any): Promise<void> {
//     // Random 50/50 split
//     const takeMainBranch = Math.random() < 0.5;

//     const connections = journeyState.journey.flow_definition.edges || [];
//     const nextEdge = connections.find(
//       (e: any) => e.from === step.id && e.condition === (takeMainBranch ? 'A' : 'B')
//     );

//     if (nextEdge) {
//       await supabase
//         .from('user_journey_states')
//         .update({
//           current_step_id: nextEdge.to,
//           context: {
//             ...journeyState.context,
//             split_branch: takeMainBranch ? 'A' : 'B',
//           },
//         })
//         .eq('id', journeyState.id);
//     }

//     console.log(`[JourneyProcessor] Split: ${takeMainBranch ? 'A' : 'B'}`);
//   }

//   private async advanceJourney(
//     journeyState: any,
//     currentStep: any
//   ): Promise<void> {
//     // Find next step connection
//     const connections = journeyState.journey.flow_definition.edges || [];
//     const nextEdge = connections.find(
//       (e: any) => e.from === currentStep.id && !e.condition
//     );

//     if (!nextEdge) {
//       // Journey complete
//       await supabase
//         .from('user_journey_states')
//         .update({
//           status: 'completed',
//           completed_at: new Date().toISOString(),
//         })
//         .eq('id', journeyState.id);

//       console.log('[JourneyProcessor] Journey completed');
//       return;
//     }

//     const nextStep = journeyState.journey.flow_definition.nodes.find(
//       (n: any) => n.id === nextEdge.to
//     );

//     if (!nextStep) {
//       console.warn(`[JourneyProcessor] Next step ${nextEdge.to} not found`);
//       return;
//     }

//     // Update current step
//     await supabase
//       .from('user_journey_states')
//       .update({ current_step_id: nextStep.id })
//       .eq('id', journeyState.id);

//     const stepType = nextStep.type || nextStep.data?.type;

//     // If delay/wait, schedule it
//     if (stepType === 'delay' || stepType === 'wait') {
//       const config = getStepConfig(nextStep);
      
//       // Handle both formats: duration (seconds) and delay_value/delay_unit
//       let delayMs: number;
//       if (config.duration) {
//         // Frontend format: duration in seconds
//         delayMs = config.duration * 1000;
//       } else {
//         // Backend format: delay_value and delay_unit
//         const { delay_value = 1, delay_unit = 'hours' } = config;
//         delayMs = this.calculateDelay(delay_value, delay_unit);
//       }
      
//       const executeAt = new Date(Date.now() + delayMs);

//       await this.scheduleStep(journeyState.id, nextStep.id, executeAt, {
//         delay_value: config.delay_value,
//         delay_unit: config.delay_unit,
//         duration: config.duration,
//       });

//       console.log(`[JourneyProcessor] Scheduled delay for ${executeAt}`);
//     } else {
//       // Execute immediately
//       await this.scheduleStep(journeyState.id, nextStep.id, new Date(), {});
//       console.log(`[JourneyProcessor] Scheduled immediate execution for ${stepType}`);
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

//   private async evaluateCondition(
//     journeyState: any,
//     condition: any
//   ): Promise<boolean> {
//     const value = journeyState.context?.[condition.field];

//     switch (condition.operator) {
//       case 'equals':
//         return value === condition.value;
//       case 'contains':
//         return String(value).includes(condition.value);
//       case 'greater_than':
//         return Number(value) > Number(condition.value);
//       case 'less_than':
//         return Number(value) < Number(condition.value);
//       default:
//         return false;
//     }
//   }

//   private async scheduleStep(
//     journeyStateId: string,
//     stepId: string,
//     executeAt: Date,
//     payload: any
//   ): Promise<void> {
//     await supabase.from('scheduled_journey_steps').insert({
//       user_journey_state_id: journeyStateId,
//       step_id: stepId,
//       execute_at: executeAt.toISOString(),
//       status: 'pending',
//       payload,
//     });
//   }
// }

// export const journeyProcessor = new JourneyProcessor();
















// backend/lib/journeys/processor.ts
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface ProcessingResult {
  processed: number;
  failed: number;
  skipped: number;
  total: number;
}

export interface JourneyStep {
  id: string;
  type: 'send_notification' | 'delay' | 'wait' | 'wait_for_event' | 'condition' | 'split';
  data?: any;
  config?: any;
}

// Helper function to merge step data and config
function getStepConfig(step: any): any {
  return { ...(step.data || {}), ...(step.data?.config || {}) };
}

class JourneyProcessor {
  private processing = false;
  private lastProcessTime = 0;
  private MIN_PROCESS_INTERVAL = 5000; // 5 seconds between runs

  async processDueSteps(): Promise<ProcessingResult> {
    // Prevent concurrent processing
    if (this.processing) {
      console.log('[JourneyProcessor] Already processing, skipping');
      return { processed: 0, failed: 0, skipped: 0, total: 0 };
    }

    // Rate limiting
    const now = Date.now();
    if (now - this.lastProcessTime < this.MIN_PROCESS_INTERVAL) {
      console.log('[JourneyProcessor] Too soon since last run, skipping');
      return { processed: 0, failed: 0, skipped: 0, total: 0 };
    }

    this.processing = true;
    this.lastProcessTime = now;

    let processedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    try {
      console.log('[JourneyProcessor] Starting processing run');

      // Query due steps
      const { data: dueSteps, error } = await supabase
        .from('scheduled_journey_steps')
        .select('*')
        .eq('status', 'pending')
        .lte('execute_at', new Date().toISOString())
        .order('execute_at', { ascending: true })
        .limit(50);

      if (error) {
        console.error('[JourneyProcessor] Query error:', error);
        throw error;
      }

      const totalSteps = dueSteps?.length || 0;
      console.log(`[JourneyProcessor] Found ${totalSteps} due steps`);

      if (totalSteps === 0) {
        return { processed: 0, failed: 0, skipped: 0, total: 0 };
      }

      // Process each step
      for (const scheduledStep of dueSteps || []) {
        try {
          await this.executeScheduledStep(scheduledStep);
          processedCount++;
          console.log(`[JourneyProcessor] ✅ Step ${scheduledStep.id} processed (${processedCount}/${totalSteps})`);
        } catch (error: any) {
          failedCount++;
          console.error(`[JourneyProcessor] ❌ Step ${scheduledStep.id} failed:`, error.message);
        }
      }

      console.log(`[JourneyProcessor] ✅ Completed: ${processedCount} processed, ${failedCount} failed, ${skippedCount} skipped`);
      
      return { 
        processed: processedCount, 
        failed: failedCount,
        skipped: skippedCount,
        total: totalSteps
      };
      
    } catch (error: any) {
      console.error('[JourneyProcessor] 💥 Fatal error:', error.message);
      return { 
        processed: processedCount, 
        failed: failedCount,
        skipped: skippedCount,
        total: processedCount + failedCount
      };
    } finally {
      this.processing = false;
    }
  }

  private async executeScheduledStep(scheduledStep: any): Promise<void> {
    const { id, user_journey_state_id, step_id, payload } = scheduledStep;

    try {
      console.log(`[JourneyProcessor] Executing step ${step_id}`);

      // Note: Database uses 'executed' not 'completed', and 'cancelled' for failures
      // Valid statuses: 'pending', 'executed', 'cancelled'

      // Get journey state with journey data
      // Use specific relationship name to avoid ambiguity
      const { data: journeyState, error: stateError } = await supabase
        .from('user_journey_states')
        .select(`
          *,
          journeys!fk_user_journey_journey (*)
        `)
        .eq('id', user_journey_state_id)
        .single();

      if (stateError) {
        console.error('[JourneyProcessor] State query error:', stateError);
        throw new Error(`Failed to fetch journey state: ${stateError.message}`);
      }

      if (!journeyState) {
        throw new Error('Journey state not found');
      }

      // Handle journey data (can be array or object depending on Supabase response)
      const journey = Array.isArray(journeyState.journeys) 
        ? journeyState.journeys[0] 
        : journeyState.journeys;

      if (!journey) {
        throw new Error('Journey not found in journey state');
      }

      console.log(`[JourneyProcessor] Journey: ${journey.name || journey.id}`);

      // Parse flow_definition if it's a string
      const flowDefinition = typeof journey.flow_definition === 'string'
        ? JSON.parse(journey.flow_definition)
        : journey.flow_definition;

      if (!flowDefinition || !flowDefinition.nodes) {
        throw new Error('Invalid flow definition');
      }

      // Find the step in journey definition
      const step = flowDefinition.nodes.find(
        (n: any) => n.id === step_id
      );

      if (!step) {
        throw new Error(`Step ${step_id} not found in journey flow`);
      }

      const stepType = step.type || step.data?.type;
      console.log(`[JourneyProcessor] Step type: ${stepType}`);

      // Execute the step
      await this.executeStep({ ...journeyState, journey, flow_definition: flowDefinition }, step, payload);

      // Mark as executed (not 'completed' - DB constraint uses 'executed')
      await supabase
        .from('scheduled_journey_steps')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
        })
        .eq('id', id);

      console.log(`[JourneyProcessor] ✅ Step ${step_id} completed`);

      // Move to next step
      await this.advanceJourney({ ...journeyState, journey, flow_definition: flowDefinition }, step);

    } catch (error: any) {
      console.error(`[JourneyProcessor] Failed step ${id}:`, error);

      // Mark as cancelled (not 'failed' - DB constraint uses 'cancelled')
      await supabase
        .from('scheduled_journey_steps')
        .update({
          status: 'cancelled',
          payload: { ...payload, error: error.message },
        })
        .eq('id', id);
      
      throw error;
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
      case 'wait':
        console.log('[JourneyProcessor] Delay/wait step completed');
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
    try {
      // Get merged config
      const config = getStepConfig(step);
      const title = config.title || 'Notification';
      const body = config.body || '';
      const clickUrl = config.click_url || config.url || '/';
      const iconUrl = config.icon_url || config.icon;

      console.log(`[JourneyProcessor] Sending notification: "${title}"`);

      // Get subscriber
      const { data: subscriber, error: subError } = await supabase
        .from('subscribers')
        .select('*')
        .eq('id', journeyState.subscriber_id)
        .single();

      if (subError || !subscriber) {
        throw new Error(`Subscriber not found: ${subError?.message}`);
      }

      if (!subscriber.endpoint) {
        console.log('[JourneyProcessor] Subscriber has no valid push subscription');
        return;
      }

      // Get website VAPID keys
      const { data: website, error: websiteError } = await supabase
        .from('websites')
        .select('vapid_public_key, vapid_private_key')
        .eq('id', journeyState.journey.website_id)
        .single();

      if (websiteError || !website) {
        throw new Error(`Website not found: ${websiteError?.message}`);
      }

      if (!website.vapid_public_key || !website.vapid_private_key) {
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
      const notificationPayload = JSON.stringify({
        title,
        body,
        icon: iconUrl,
        data: {
          url: clickUrl,
          journey_id: journeyState.journey_id,
        },
      });

      await webpush.sendNotification(pushSubscription, notificationPayload);
      console.log('[JourneyProcessor] ✅ Notification sent successfully');

      // Log notification
      await supabase.from('notification_logs').insert({
        website_id: journeyState.journey.website_id,
        subscriber_id: subscriber.id,
        status: 'delivered',
        platform: 'web',
        sent_at: new Date().toISOString(),
        delivered_at: new Date().toISOString(),
      });

    } catch (error: any) {
      console.error('[JourneyProcessor] Failed to send notification:', error);

      // Log failed notification
      await supabase.from('notification_logs').insert({
        website_id: journeyState.journey.website_id,
        subscriber_id: journeyState.subscriber_id,
        status: 'failed',
        platform: 'web',
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
    const config = getStepConfig(step);
    const eventName = config.event_name;
    const timeoutValue = config.timeout_value || 24;
    const timeoutUnit = config.timeout_unit || 'hours';

    console.log(`[JourneyProcessor] Waiting for event: ${eventName}`);

    // Calculate timeout
    const timeoutMs = this.calculateDelay(timeoutValue, timeoutUnit);
    const timeoutAt = new Date(Date.now() + timeoutMs);

    // Update journey state to waiting
    await supabase
      .from('user_journey_states')
      .update({
        status: 'waiting',
        current_step_id: step.id,
        context: {
          ...journeyState.context,
          waiting_for_event: eventName,
          timeout_at: timeoutAt.toISOString(),
        },
      })
      .eq('id', journeyState.id);

    // Schedule timeout fallback
    const connections = journeyState.flow_definition.edges || [];
    const fallbackEdge = connections.find(
      (e: any) => e.from === step.id && e.condition === 'timeout'
    );

    if (fallbackEdge) {
      await this.scheduleStep(
        journeyState.id,
        fallbackEdge.to,
        timeoutAt,
        { reason: 'timeout', step_type: 'timeout' }
      );
    }

    console.log(`[JourneyProcessor] Wait scheduled until ${timeoutAt.toISOString()}`);
  }

  private async executeCondition(
    journeyState: any,
    step: any
  ): Promise<void> {
    const config = getStepConfig(step);
    const condition = config.condition;

    if (!condition) {
      console.warn('[JourneyProcessor] Condition config missing');
      return;
    }

    // Evaluate condition
    const result = await this.evaluateCondition(journeyState, condition);
    console.log(`[JourneyProcessor] Condition result: ${result}`);

    // Find next step based on result
    const connections = journeyState.flow_definition.edges || [];
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

    console.log(`[JourneyProcessor] Split: taking branch ${takeMainBranch ? 'A' : 'B'}`);

    const connections = journeyState.flow_definition.edges || [];
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
  }

  private async advanceJourney(
    journeyState: any,
    currentStep: any
  ): Promise<void> {
    const flowDefinition = journeyState.flow_definition;

    if (!flowDefinition) {
      console.error('[JourneyProcessor] Flow definition not found');
      return;
    }

    // Find next step connection
    const connections = flowDefinition.edges || [];
    const nextEdge = connections.find(
      (e: any) => e.from === currentStep.id && !e.condition
    );

    if (!nextEdge) {
      // Journey complete
      console.log('[JourneyProcessor] No next step - completing journey');
      
      await supabase
        .from('user_journey_states')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', journeyState.id);

      // Log completion event
      await supabase.from('journey_events').insert({
        journey_id: journeyState.journey_id,
        subscriber_id: journeyState.subscriber_id,
        user_journey_state_id: journeyState.id,
        step_id: currentStep.id,
        event_type: 'journey_completed',
        metadata: {},
      });

      console.log('[JourneyProcessor] ✅ Journey completed');
      return;
    }

    const nextStep = flowDefinition.nodes?.find(
      (n: any) => n.id === nextEdge.to
    );

    if (!nextStep) {
      console.warn(`[JourneyProcessor] Next step ${nextEdge.to} not found in flow`);
      return;
    }

    // Update current step in journey state
    await supabase
      .from('user_journey_states')
      .update({ current_step_id: nextStep.id })
      .eq('id', journeyState.id);

    const stepType = nextStep.type || nextStep.data?.type;
    console.log(`[JourneyProcessor] Next step: ${nextStep.id} (${stepType})`);

    // Calculate execution time
    let executeAt = new Date(); // Default: immediate

    if (stepType === 'delay' || stepType === 'wait') {
      const config = getStepConfig(nextStep);
      
      let delayMs: number;
      if (config.duration) {
        // Frontend format: duration in seconds
        delayMs = config.duration * 1000;
      } else {
        // Backend format: delay_value and delay_unit
        const delayValue = config.delay_value || 1;
        const delayUnit = config.delay_unit || 'hours';
        delayMs = this.calculateDelay(delayValue, delayUnit);
      }
      
      executeAt = new Date(Date.now() + delayMs);
      console.log(`[JourneyProcessor] Scheduling ${stepType} for ${executeAt.toISOString()}`);
    }

    // Schedule the next step
    await this.scheduleStep(journeyState.id, nextStep.id, executeAt, {
      step_type: stepType,
    });

    console.log(`[JourneyProcessor] ✅ Next step scheduled`);
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
    const { error } = await supabase
      .from('scheduled_journey_steps')
      .insert({
        user_journey_state_id: journeyStateId,
        step_id: stepId,
        execute_at: executeAt.toISOString(),
        status: 'pending',
        payload,
      });

    if (error) {
      console.error('[JourneyProcessor] Failed to schedule step:', error);
      throw error;
    }
  }
}

export const journeyProcessor = new JourneyProcessor();
