// // // lib/journeys/processor.ts
// /**
//  * Journey Execution Engine - Brevo-Style Implementation
//  * Handles multi-step journey flows with advanced triggers and conditions
//  */

// import { createClient } from '@supabase/supabase-js';
// import type { Database } from '@/types/database';
// import { sendWebPushNotification, type WebPushSubscription, type NotificationPayload } from '@/lib/push/web-push';

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
//   // First try to find edge with specific condition
//   if (condition) {
//     const conditionalEdge = flowDefinition.edges.find(
//       e => e.from === currentNodeId && (e.type === condition || e.condition === condition)
//     );
//     if (conditionalEdge) return conditionalEdge.to;
//   }

//   // Then try default edge
//   const defaultEdge = flowDefinition.edges.find(
//     e => e.from === currentNodeId && (!e.type || e.type === 'default')
//   );
  
//   return defaultEdge ? defaultEdge.to : null;
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

// // ============================================================================
// // CORE PROCESSING FUNCTIONS
// // ============================================================================

// /**
//  *  MAIN FUNCTION: Process all due steps
//  * Called by cron job every 1-5 minutes
//  */
// export async function processDueSteps(): Promise<ProcessingResult> {
//   console.log('⏰ [Processor] Starting scheduled step processing...');
//   const startTime = Date.now();

//   try {
//     const now = new Date().toISOString();

//     // Fetch all pending steps that are due
//     const { data: dueSteps, error } = await supabase
//       .from('scheduled_journey_steps')
//       .select('*')
//       .eq('status', 'pending')
//       .lte('execute_at', now)
//       .order('execute_at', { ascending: true })
//       .limit(100);

//     if (error) {
//       console.error('[Processor] Error fetching due steps:', error);
//       throw error;
//     }

//     if (!dueSteps || dueSteps.length === 0) {
//       console.log(' [Processor] No due steps found');
//       return { processed: 0, failed: 0, skipped: 0, total: 0 };
//     }

//     console.log(`📋 [Processor] Found ${dueSteps.length} due steps to process`);

//     let processed = 0;
//     let failed = 0;
//     let skipped = 0;
//     const errors: string[] = [];

//     // Process each step
//     for (const step of dueSteps) {
//       try {
//         console.log(`🔄 [Processor] Processing step ${step.id} (type: ${step.payload?.step_type})`);

//         // Mark as processing
//         await supabase
//           .from('scheduled_journey_steps')
//           .update({ 
//             status: 'processing',
//             started_at: new Date().toISOString(),
//           })
//           .eq('id', step.id);

//         // Verify journey state still exists and is valid
//         const { data: stateData, error: stateError } = await supabase
//           .from('user_journey_states')
//           .select('*')
//           .eq('id', step.user_journey_state_id)
//           .single();

//         if (stateError || !stateData) {
//           console.warn(`[Processor] Journey state ${step.user_journey_state_id} not found, skipping`);
//           await supabase
//             .from('scheduled_journey_steps')
//             .update({ 
//               status: 'skipped',
//               error: 'Journey state not found',
//               completed_at: new Date().toISOString(),
//             })
//             .eq('id', step.id);
//           skipped++;
//           continue;
//         }

//         const state = toJourneyState(stateData);

//         // Skip if journey is no longer active/waiting
//         if (state.status !== 'active' && state.status !== 'waiting') {
//           console.log(`[Processor] Journey ${state.id} status is ${state.status}, skipping`);
//           await supabase
//             .from('scheduled_journey_steps')
//             .update({ 
//               status: 'skipped',
//               error: `Journey status is ${state.status}`,
//               completed_at: new Date().toISOString(),
//             })
//             .eq('id', step.id);
//           skipped++;
//           continue;
//         }

//         // Update state to active if it was waiting
//         if (state.status === 'waiting') {
//           await supabase
//             .from('user_journey_states')
//             .update({ 
//               status: 'active',
//               next_execution_at: null,
//             })
//             .eq('id', step.user_journey_state_id);
//         }

//         // Process the journey step
//         await processJourneyStep(step.user_journey_state_id);

//         // Mark step as completed
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
//         console.error(`❌ [Processor] Step ${step.id} failed:`, stepError.message);
        
//         // Mark step as failed
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
    
//     console.log(` [Processor] Completed in ${duration}ms - Processed: ${processed}, Failed: ${failed}, Skipped: ${skipped}, Total: ${total}`);
    
//     return { processed, failed, skipped, total, errors: errors.length > 0 ? errors : undefined };

//   } catch (error: any) {
//     console.error('❌ [Processor] Fatal error in processDueSteps:', error.message);
//     throw error;
//   }
// }

// /**
//  *  Enroll a subscriber in a journey
//  */
// export async function enrollSubscriber(
//   journeyId: string,
//   subscriberId: string,
//   initialContext: any = {}
// ): Promise<any> {
//   console.log('📝 [Processor] Enrolling subscriber:', { journeyId, subscriberId });

//   try {
//     // Fetch journey
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

//     // Parse flow definition
//     const flowDefinition = parseFlowDefinition(journey.flow_definition);
    
//     if (!flowDefinition.nodes || flowDefinition.nodes.length === 0) {
//       throw new Error('Journey has no steps defined');
//     }

//     // Find entry node or use first node
//     const entryNode = flowDefinition.nodes.find(n => n.type === 'entry');
//     const startNode = entryNode || flowDefinition.nodes[0];

//     console.log(`[Processor] Starting at node: ${startNode.id} (type: ${startNode.type})`);

//     // Check re-entry rules
//     const canEnter = await checkReEntryRules(subscriberId, journey);
//     if (!canEnter) {
//       console.log('[Processor] Re-entry rules prevent enrollment');
//       throw new Error('Subscriber cannot re-enter this journey at this time');
//     }

//     // Create journey state
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
//       console.error('[Processor] Failed to create journey state:', stateError);
//       throw stateError;
//     }

//     // Log entry event
//     await logJourneyEvent(
//       journeyId,
//       subscriberId,
//       journeyState.id,
//       'journey_entered',
//       { context: initialContext }
//     );

//     // Update journey counters
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

//     // If entry node, move to first real step
//     if (startNode.type === 'entry') {
//       const nextNodeId = getNextNodeId(flowDefinition, startNode.id);
//       if (nextNodeId) {
//         await supabase
//           .from('user_journey_states')
//           .update({ current_step_id: nextNodeId })
//           .eq('id', journeyState.id);
//       }
//     }

//     // Process the first step
//     await processJourneyStep(journeyState.id);

//     console.log(' [Processor] Subscriber enrolled successfully');
//     return journeyState;

//   } catch (error: any) {
//     console.error('❌ [Processor] Enrollment error:', error.message);
//     throw error;
//   }
// }

// /**
//  *  Process a single journey step
//  */
// export async function processJourneyStep(journeyStateId: string): Promise<void> {
//   console.log('🔄 [Processor] Processing journey step:', journeyStateId);

//   try {
//     // Fetch current state
//     const { data: stateData, error: stateError } = await supabase
//       .from('user_journey_states')
//       .select('*')
//       .eq('id', journeyStateId)
//       .single();

//     if (stateError || !stateData) {
//       throw new Error('Journey state not found');
//     }

//     const state = toJourneyState(stateData);

//     // Verify state is processable
//     if (state.status !== 'active' && state.status !== 'waiting') {
//       console.log(`[Processor] Journey state is ${state.status}, cannot process`);
//       return;
//     }

//     // Fetch journey
//     const { data: journey, error: journeyError } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', state.journey_id)
//       .single();

//     if (journeyError || !journey) {
//       throw new Error('Journey not found');
//     }

//     // Parse flow
//     const flowDefinition = parseFlowDefinition(journey.flow_definition);
    
//     // Find current node
//     const currentNode = flowDefinition.nodes.find(n => n.id === state.current_step_id);

//     if (!currentNode) {
//       console.log('[Processor] Current step not found in flow, completing journey');
//       await completeJourney(journeyStateId);
//       return;
//     }

//     console.log(`📍 [Processor] Current node: ${currentNode.id} (type: ${currentNode.type})`);

//     // Update node history
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

//     // Process based on node type
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
//         // Entry nodes are just markers, move to next
//         await moveToNextNode(state, flowDefinition, currentNode.id);
//         break;
      
//       default:
//         console.warn(`[Processor] Unknown node type: ${currentNode.type}, moving to next`);
//         await moveToNextNode(state, flowDefinition, currentNode.id);
//     }

//   } catch (error: any) {
//     console.error('❌ [Processor] Step processing error:', error.message);
    
//     // Log error event
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
//   console.log('📨 [Processor] Sending notification');

//   try {
//     // Fetch subscriber
//     const { data: subscriber, error: subError } = await supabase
//       .from('subscribers')
//       .select('*')
//       .eq('id', state.subscriber_id)
//       .single();

//     if (subError || !subscriber) {
//       throw new Error('Subscriber not found');
//     }

//     // Fetch website for branding
//     const { data: website } = await supabase
//       .from('websites')
//       .select('*')
//       .eq('id', subscriber.website_id)
//       .single();

//     if (!website) {
//       throw new Error('Website not found');
//     }

//     // Prepare push subscription
//     const subscription: WebPushSubscription = {
//       endpoint: subscriber.endpoint!,
//       keys: {
//         p256dh: subscriber.p256dh_key!,
//         auth: subscriber.auth_key!,
//       },
//     };

//     // Prepare notification payload
//     const notificationPayload: NotificationPayload = {
//       title: node.data.title || 'Notification',
//       body: node.data.body || '',
//       icon: node.data.icon_url || (website.notification_branding as any)?.logo_url,
//       url: node.data.url || node.data.click_url || '/',
//       branding: website.notification_branding as any,
//     };

//     // Send notification
//     const result = await sendWebPushNotification(subscription, notificationPayload);

//     // Log notification
//     await supabase.from('notification_logs').insert({
//       website_id: subscriber.website_id,
//       subscriber_id: subscriber.id,
//       journey_id: state.journey_id,
//       journey_step_id: node.id,
//       user_journey_state_id: state.id,
//       status: result.success ? 'sent' : 'failed',
//       platform: 'web',
//       sent_at: new Date().toISOString(),
//       error_message: result.error,
//     });

//     // Log event
//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       result.success ? 'notification_sent' : 'notification_failed',
//       { 
//         title: notificationPayload.title,
//         error: result.error 
//       },
//       node.id
//     );

//     // Move to next node regardless of send success (Brevo behavior)
//     await moveToNextNode(state, flowDefinition, node.id);

//   } catch (error: any) {
//     console.error('❌ [Processor] Notification error:', error.message);
    
//     // Log error but continue
//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       'notification_error',
//       { error: error.message },
//       node.id
//     );
    
//     // Move to next node anyway
//     await moveToNextNode(state, flowDefinition, node.id);
//   }
// }

// async function processWaitNode(
//   state: JourneyState,
//   node: JourneyNode,
//   flowDefinition: FlowDefinition
// ): Promise<void> {
//   console.log('⏰ [Processor] Processing wait node');

//   // Check if wait was already scheduled
//   if (state.status === 'waiting') {
//     console.log(' [Processor] Wait period completed, advancing');
//     await moveToNextNode(state, flowDefinition, node.id);
//     return;
//   }

//   // Schedule new wait
//   const waitMode = node.data.mode || 'duration';

//   if (waitMode === 'duration') {
//     // Duration-based wait
//     const durationSeconds = node.data.duration || node.data.delay_value * getDelayMultiplier(node.data.delay_unit || 'hours');
//     const executeAt = new Date(Date.now() + durationSeconds * 1000);

//     console.log(`⏰ [Processor] Scheduling wait for ${durationSeconds} seconds (until ${executeAt.toISOString()})`);

//     // Update state to waiting
//     await supabase
//       .from('user_journey_states')
//       .update({
//         status: 'waiting',
//         next_execution_at: executeAt.toISOString(),
//       })
//       .eq('id', state.id);

//     // Schedule step
//     await supabase.from('scheduled_journey_steps').insert({
//       user_journey_state_id: state.id,
//       step_id: node.id,
//       execute_at: executeAt.toISOString(),
//       status: 'pending',
//       payload: { 
//         next_node_id: getNextNodeId(flowDefinition, node.id),
//         mode: 'duration'
//       },
//     });

//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       'wait_started',
//       { duration_seconds: durationSeconds, until: executeAt.toISOString() },
//       node.id
//     );

//   } else if (waitMode === 'until_event') {
//     // Event-based wait
//     const eventName = node.data.event?.name || node.data.event_name;
//     const timeoutSeconds = node.data.event?.timeout_seconds || node.data.timeout_seconds || 604800; // 7 days default
//     const timeoutAt = new Date(Date.now() + timeoutSeconds * 1000);

//     console.log(`⏰ [Processor] Waiting for event "${eventName}" (timeout: ${timeoutAt.toISOString()})`);

//     // Update state
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

//     // Schedule timeout step
//     await supabase.from('scheduled_journey_steps').insert({
//       user_journey_state_id: state.id,
//       step_id: node.id,
//       execute_at: timeoutAt.toISOString(),
//       status: 'pending',
//       payload: { 
//         next_node_id: getNextNodeId(flowDefinition, node.id, 'timeout'),
//         mode: 'event_timeout',
//         event_name: eventName
//       },
//     });

//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       'wait_for_event_started',
//       { event_name: eventName, timeout: timeoutAt.toISOString() },
//       node.id
//     );
//   }
// }

// async function processConditionNode(
//   state: JourneyState,
//   node: JourneyNode,
//   flowDefinition: FlowDefinition
// ): Promise<void> {
//   console.log('🔀 [Processor] Processing condition');

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
//           query = query.contains('event_data', { url: targetUrl });
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
//         const attributes = sub?.custom_attributes || {};
//         const attrKey = node.data.attribute_key;
//         const attrValue = node.data.attribute_value;
        
//         if (conditionType === 'has_attribute') {
//           conditionMet = attributes[attrKey] !== undefined;
//         } else {
//           conditionMet = attributes[attrKey] === attrValue;
//         }
//         break;

//       default:
//         console.warn(`[Processor] Unknown condition type: ${conditionType}`);
//         conditionMet = false;
//     }

//     // Log condition result
//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       state.id,
//       'condition_evaluated',
//       { condition_type: conditionType, result: conditionMet },
//       node.id
//     );

//     // Find appropriate branch
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
//     console.error('❌ [Processor] Condition error:', error.message);
    
//     // On error, take 'no' path
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
//   console.log('🎲 [Processor] Processing A/B split');

//   const branches = node.data.branches || [];
  
//   if (!branches || branches.length === 0) {
//     console.warn('[Processor] No branches defined, completing journey');
//     await completeJourney(state.id);
//     return;
//   }

//   // Select branch based on percentage
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

//   console.log(`[Processor] Selected branch: ${selectedBranch.id} (${selectedBranch.name})`);

//   // Find edge for selected branch
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
//     console.warn('[Processor] No edge found for selected branch');
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

//   if (nextNodeId) {
//     console.log(`[Processor] Moving to next node: ${nextNodeId}`);
    
//     await supabase
//       .from('user_journey_states')
//       .update({ 
//         current_step_id: nextNodeId, 
//         status: 'active',
//         last_processed_at: new Date().toISOString(),
//       })
//       .eq('id', state.id);

//     // Process next step
//     await processJourneyStep(state.id);
//   } else {
//     console.log('[Processor] No next node found, completing journey');
//     await completeJourney(state.id);
//   }
// }

// async function completeJourney(journeyStateId: string): Promise<void> {
//   console.log('🏁 [Processor] Completing journey:', journeyStateId);

//   try {
//     const { data: stateData } = await supabase
//       .from('user_journey_states')
//       .select('*')
//       .eq('id', journeyStateId)
//       .single();

//     if (!stateData) return;

//     const state = toJourneyState(stateData);

//     // Update state
//     await supabase
//       .from('user_journey_states')
//       .update({
//         status: 'completed',
//         completed_at: new Date().toISOString(),
//         current_step_id: null,
//       })
//       .eq('id', journeyStateId);

//     // Log event
//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       journeyStateId,
//       'journey_completed'
//     );

//     // Update counters
//     await supabase.rpc('increment', {
//       table_name: 'journeys',
//       column_name: 'total_completed',
//       row_id: state.journey_id,
//     });

//     // Decrement active count
//     const { data: journey } = await supabase
//       .from('journeys')
//       .select('total_active')
//       .eq('id', state.journey_id)
//       .single();

//     if (journey && journey.total_active && journey.total_active > 0) {
//       await supabase
//         .from('journeys')
//         .update({ total_active: journey.total_active - 1 })
//         .eq('id', state.journey_id);
//     }

//     console.log(' [Processor] Journey completed successfully');

//   } catch (error: any) {
//     console.error('❌ [Processor] Error completing journey:', error.message);
//   }
// }

// async function exitJourney(journeyStateId: string, reason: string): Promise<void> {
//   console.log('🚪 [Processor] Exiting journey:', journeyStateId, 'Reason:', reason);

//   try {
//     const { data: stateData } = await supabase
//       .from('user_journey_states')
//       .select('*')
//       .eq('id', journeyStateId)
//       .single();

//     if (!stateData) return;

//     const state = toJourneyState(stateData);

//     // Update state
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

//     // Log event
//     await logJourneyEvent(
//       state.journey_id,
//       state.subscriber_id,
//       journeyStateId,
//       'journey_exited',
//       { reason }
//     );

//     // Update counters
//     await supabase.rpc('increment', {
//       table_name: 'journeys',
//       column_name: 'total_exited',
//       row_id: state.journey_id,
//     });

//     // Decrement active count
//     const { data: journey } = await supabase
//       .from('journeys')
//       .select('total_active')
//       .eq('id', state.journey_id)
//       .single();

//     if (journey && journey.total_active && journey.total_active > 0) {
//       await supabase
//         .from('journeys')
//         .update({ total_active: journey.total_active - 1 })
//         .eq('id', state.journey_id);
//     }

//   } catch (error: any) {
//     console.error('❌ [Processor] Error exiting journey:', error.message);
//   }
// }

// // ============================================================================
// // HELPER FUNCTIONS
// // ============================================================================

// async function checkReEntryRules(subscriberId: string, journey: any): Promise<boolean> {
//   const reEntrySettings = journey.re_entry_settings || {};
//   const allowReEntry = reEntrySettings.allow_re_entry || false;

//   // Get previous states
//   const { data: states } = await supabase
//     .from('user_journey_states')
//     .select('*')
//     .eq('subscriber_id', subscriberId)
//     .eq('journey_id', journey.id)
//     .order('entered_at', { ascending: false });

//   if (!states || states.length === 0) {
//     return true; // First time
//   }

//   // Check if already active
//   const activeState = states.find(s => s.status === 'active' || s.status === 'waiting');
//   if (activeState) {
//     console.log('[Processor] Already active in journey');
//     return false;
//   }

//   // Check if re-entry allowed
//   if (!allowReEntry) {
//     console.log('[Processor] Re-entry not allowed');
//     return false;
//   }

//   // Check max entries
//   const maxEntries = reEntrySettings.max_entries || 0;
//   if (maxEntries > 0 && states.length >= maxEntries) {
//     console.log(`[Processor] Max entries (${maxEntries}) reached`);
//     return false;
//   }

//   // Check cooldown
//   const cooldownDays = reEntrySettings.cooldown_days || 0;
//   if (cooldownDays > 0 && states.length > 0) {
//     const lastEntry = new Date(states[0].entered_at);
//     const daysSince = (Date.now() - lastEntry.getTime()) / (1000 * 60 * 60 * 24);
    
//     if (daysSince < cooldownDays) {
//       console.log(`[Processor] Cooldown period (${cooldownDays} days) not met`);
//       return false;
//     }
//   }

//   return true;
// }

// function getDelayMultiplier(unit: string): number {
//   switch (unit) {
//     case 'minutes': return 60;
//     case 'hours': return 3600;
//     case 'days': return 86400;
//     default: return 3600;
//   }
// }

// /**
//  * Handle subscriber events (for wait-until-event nodes)
//  */
// export async function handleSubscriberEvent(
//   subscriberId: string,
//   eventName: string,
//   eventData: any = {}
// ): Promise<void> {
//   console.log('📥 [Processor] Handling subscriber event:', { subscriberId, eventName });

//   try {
//     // Find waiting states for this event
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

//     console.log(`[Processor] Found ${waitingStates.length} waiting state(s)`);

//     for (const stateData of waitingStates) {
//       const state = toJourneyState(stateData);
      
//       // Cancel scheduled timeout
//       await supabase
//         .from('scheduled_journey_steps')
//         .update({ status: 'cancelled' })
//         .eq('user_journey_state_id', state.id)
//         .eq('status', 'pending');

//       // Update context
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

//       // Log event
//       await logJourneyEvent(
//         state.journey_id,
//         state.subscriber_id,
//         state.id,
//         'event_received',
//         { event_name: eventName, event_data: eventData },
//         state.current_step_id || undefined
//       );

//       // Fetch journey to get flow
//       const { data: journey } = await supabase
//         .from('journeys')
//         .select('flow_definition')
//         .eq('id', state.journey_id)
//         .single();

//       if (journey) {
//         const flowDefinition = parseFlowDefinition(journey.flow_definition);
//         const currentNode = flowDefinition.nodes.find(n => n.id === state.current_step_id);
        
//         if (currentNode) {
//           // Move to success path
//           await moveToNextNode(state, flowDefinition, currentNode.id);
//         }
//       }
//     }

//   } catch (error: any) {
//     console.error('❌ [Processor] Error handling event:', error.message);
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
/**
 * Journey Execution Engine - Brevo-Style Implementation
 * Handles multi-step journey flows with advanced triggers and conditions
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import { sendWebPushNotification, type WebPushSubscription, type NotificationPayload } from '@/lib/push/web-push';

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
  status: 'active' | 'completed' | 'exited' | 'waiting' | null;
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
  // First try to find edge with specific condition
  if (condition) {
    const conditionalEdge = flowDefinition.edges.find(
      e => e.from === currentNodeId && (e.type === condition || e.condition === condition)
    );
    if (conditionalEdge) return conditionalEdge.to;
  }

  // Then try default edge
  const defaultEdge = flowDefinition.edges.find(
    e => e.from === currentNodeId && (!e.type || e.type === 'default')
  );
  
  return defaultEdge ? defaultEdge.to : null;
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

// ============================================================================
// CORE PROCESSING FUNCTIONS
// ============================================================================

/**
 *  MAIN FUNCTION: Process all due steps
 * Called by cron job every 1-5 minutes
 */
/**
 * 🔧 FIXED VERSION: Process all due steps
 * This version properly handles completed/cancelled steps to prevent infinite loops
 */
export async function processDueSteps(): Promise<ProcessingResult> {
  console.log('⏰ [Processor] Starting scheduled step processing...');
  const startTime = Date.now();

  try {
    const now = new Date().toISOString();

    // Fetch all pending steps that are due
    const { data: dueSteps, error } = await supabase
      .from('scheduled_journey_steps')
      .select('*')
      .eq('status', 'pending')
      .lte('execute_at', now)
      .order('execute_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('[Processor] Error fetching due steps:', error);
      throw error;
    }

    if (!dueSteps || dueSteps.length === 0) {
      console.log(' [Processor] No due steps found');
      return { processed: 0, failed: 0, skipped: 0, total: 0 };
    }

    console.log(`📋 [Processor] Found ${dueSteps.length} due steps to process`);

    let processed = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];

    // Process each step
    for (const step of dueSteps) {
      try {
        const stepPayload = step.payload as Record<string, any> | null;
        console.log(`🔄 [Processor] Processing step ${step.id} (type: ${stepPayload?.step_type || 'unknown'})`);

        // Mark as processing
        await supabase
          .from('scheduled_journey_steps')
          .update({ 
            status: 'processing',
            started_at: new Date().toISOString(),
          })
          .eq('id', step.id);

        // Verify journey state still exists and is valid
        const { data: stateData, error: stateError } = await supabase
          .from('user_journey_states')
          .select('*')
          .eq('id', step.user_journey_state_id)
          .single();

        if (stateError || !stateData) {
          console.warn(`[Processor] Journey state ${step.user_journey_state_id} not found, cancelling step`);
          await supabase
            .from('scheduled_journey_steps')
            .update({ 
              status: 'cancelled',  //  Changed from 'skipped'
              error: 'Journey state not found',
              completed_at: new Date().toISOString(),
            })
            .eq('id', step.id);
          skipped++;
          continue;
        }

        const state = toJourneyState(stateData);

        //  NEW: Check journey status first
        const { data: journey, error: journeyError } = await supabase
          .from('journeys')
          .select('status')
          .eq('id', state.journey_id)
          .single();

        if (journeyError || !journey) {
          console.warn(`[Processor] Journey not found for state ${state.id}, cancelling step`);
          await supabase
            .from('scheduled_journey_steps')
            .update({ 
              status: 'cancelled',
              error: 'Journey not found',
              completed_at: new Date().toISOString(),
            })
            .eq('id', step.id);
          skipped++;
          continue;
        }

        //  NEW: Check if journey is completed/archived
        if (journey.status === 'completed' || journey.status === 'archived') {
          console.log(`[Processor] Journey ${state.journey_id} status is ${journey.status}, cancelling step`);
          await supabase
            .from('scheduled_journey_steps')
            .update({ 
              status: 'cancelled',
              error: `Journey status is ${journey.status}`,
              completed_at: new Date().toISOString(),
            })
            .eq('id', step.id);
          skipped++;
          continue;
        }

        // Check if journey state is in valid status
        if (state.status !== 'active' && state.status !== 'waiting') {
          console.log(`[Processor] Journey state ${state.id} status is ${state.status}, cancelling step`);
          await supabase
            .from('scheduled_journey_steps')
            .update({ 
              status: 'cancelled',  //  Changed from 'skipped'
              error: `Journey state status is ${state.status}`,
              completed_at: new Date().toISOString(),
            })
            .eq('id', step.id);
          skipped++;
          continue;
        }

        // Update state to active if it was waiting
        if (state.status === 'waiting') {
          await supabase
            .from('user_journey_states')
            .update({ 
              status: 'active',
              next_execution_at: null,
            })
            .eq('id', step.user_journey_state_id);
        }

        // Process the journey step
        await processJourneyStep(step.user_journey_state_id);

        // Mark step as completed
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
        console.error(`❌ [Processor] Step ${step.id} failed:`, stepError.message);
        
        // Mark step as failed
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
    
    console.log(` [Processor] Completed in ${duration}ms - Processed: ${processed}, Failed: ${failed}, Skipped: ${skipped}, Total: ${total}`);
    
    return { processed, failed, skipped, total, errors: errors.length > 0 ? errors : undefined };

  } catch (error: any) {
    console.error('❌ [Processor] Fatal error in processDueSteps:', error.message);
    throw error;
  }
}
/**
 *  Enroll a subscriber in a journey
 */
export async function enrollSubscriber(
  journeyId: string,
  subscriberId: string,
  initialContext: any = {}
): Promise<any> {
  console.log('📝 [Processor] Enrolling subscriber:', { journeyId, subscriberId });

  try {
    // Fetch journey
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

    // Parse flow definition
    const flowDefinition = parseFlowDefinition(journey.flow_definition);
    
    if (!flowDefinition.nodes || flowDefinition.nodes.length === 0) {
      throw new Error('Journey has no steps defined');
    }

    // Find entry node or use first node
    const entryNode = flowDefinition.nodes.find(n => n.type === 'entry');
    const startNode = entryNode || flowDefinition.nodes[0];

    console.log(`[Processor] Starting at node: ${startNode.id} (type: ${startNode.type})`);

    // Check re-entry rules
    const canEnter = await checkReEntryRules(subscriberId, journey);
    if (!canEnter) {
      console.log('[Processor] Re-entry rules prevent enrollment');
      throw new Error('Subscriber cannot re-enter this journey at this time');
    }

    // Create journey state
    const { data: journeyState, error: stateError } = await supabase
      .from('user_journey_states')
      .insert({
        journey_id: journeyId,
        subscriber_id: subscriberId,
        current_step_id: startNode.id,
        status: 'active',
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
      console.error('[Processor] Failed to create journey state:', stateError);
      throw stateError;
    }

    // Log entry event
    await logJourneyEvent(
      journeyId,
      subscriberId,
      journeyState.id,
      'journey_entered',
      { context: initialContext }
    );

    // Update journey counters
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

    // If entry node, move to first real step
    if (startNode.type === 'entry') {
      const nextNodeId = getNextNodeId(flowDefinition, startNode.id);
      if (nextNodeId) {
        await supabase
          .from('user_journey_states')
          .update({ current_step_id: nextNodeId })
          .eq('id', journeyState.id);
      }
    }

    // Process the first step
    await processJourneyStep(journeyState.id);

    console.log(' [Processor] Subscriber enrolled successfully');
    return journeyState;

  } catch (error: any) {
    console.error('❌ [Processor] Enrollment error:', error.message);
    throw error;
  }
}

/**
 *  Process a single journey step
 */
export async function processJourneyStep(journeyStateId: string): Promise<void> {
  console.log('🔄 [Processor] Processing journey step:', journeyStateId);

  try {
    // Fetch current state
    const { data: stateData, error: stateError } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('id', journeyStateId)
      .single();

    if (stateError || !stateData) {
      throw new Error('Journey state not found');
    }

    const state = toJourneyState(stateData);

    // Verify state is processable
    if (state.status !== 'active' && state.status !== 'waiting') {
      console.log(`[Processor] Journey state is ${state.status}, cannot process`);
      return;
    }

    // Fetch journey
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', state.journey_id)
      .single();

    if (journeyError || !journey) {
      throw new Error('Journey not found');
    }

    // Parse flow
    const flowDefinition = parseFlowDefinition(journey.flow_definition);
    
    // Find current node
    const currentNode = flowDefinition.nodes.find(n => n.id === state.current_step_id);

    if (!currentNode) {
      console.log('[Processor] Current step not found in flow, completing journey');
      await completeJourney(journeyStateId);
      return;
    }

    console.log(`📍 [Processor] Current node: ${currentNode.id} (type: ${currentNode.type})`);

    // Update node history
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

    // Process based on node type
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
        // Entry nodes are just markers, move to next
        await moveToNextNode(state, flowDefinition, currentNode.id);
        break;
      
      default:
        console.warn(`[Processor] Unknown node type: ${currentNode.type}, moving to next`);
        await moveToNextNode(state, flowDefinition, currentNode.id);
    }

  } catch (error: any) {
    console.error('❌ [Processor] Step processing error:', error.message);
    
    // Log error event
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
  console.log('📨 [Processor] Sending notification');

  try {
    // Fetch subscriber
    const { data: subscriber, error: subError } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', state.subscriber_id)
      .single();

    if (subError || !subscriber) {
      throw new Error('Subscriber not found');
    }

    // Fetch website for branding
    const { data: website } = await supabase
      .from('websites')
      .select('*')
      .eq('id', subscriber.website_id)
      .single();

    if (!website) {
      throw new Error('Website not found');
    }

    // Prepare push subscription
    const subscription: WebPushSubscription = {
      endpoint: subscriber.endpoint!,
      keys: {
        p256dh: subscriber.p256dh_key!,
        auth: subscriber.auth_key!,
      },
    };

    // Prepare notification payload
    const notificationPayload: NotificationPayload = {
      title: node.data.title || 'Notification',
      body: node.data.body || '',
      icon: node.data.icon_url || (website.notification_branding as any)?.logo_url,
      url: node.data.url || node.data.click_url || '/',
      branding: website.notification_branding as any,
    };

    // Send notification
    const result = await sendWebPushNotification(subscription, notificationPayload);

    // Log notification
    await supabase.from('notification_logs').insert({
      website_id: subscriber.website_id,
      subscriber_id: subscriber.id,
      journey_id: state.journey_id,
      journey_step_id: node.id,
      user_journey_state_id: state.id,
      status: result.success ? 'sent' : 'failed',
      platform: 'web',
      sent_at: new Date().toISOString(),
      error_message: result.error,
    });

    // Log event
    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      result.success ? 'notification_sent' : 'notification_failed',
      { 
        title: notificationPayload.title,
        error: result.error 
      },
      node.id
    );

    // Move to next node regardless of send success (Brevo behavior)
    await moveToNextNode(state, flowDefinition, node.id);

  } catch (error: any) {
    console.error('❌ [Processor] Notification error:', error.message);
    
    // Log error but continue
    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      'notification_error',
      { error: error.message },
      node.id
    );
    
    // Move to next node anyway
    await moveToNextNode(state, flowDefinition, node.id);
  }
}

async function processWaitNode(
  state: JourneyState,
  node: JourneyNode,
  flowDefinition: FlowDefinition
): Promise<void> {
  console.log('⏰ [Processor] Processing wait node');

  // Check if wait was already scheduled
  if (state.status === 'waiting') {
    console.log(' [Processor] Wait period completed, advancing');
    await moveToNextNode(state, flowDefinition, node.id);
    return;
  }

  // Schedule new wait
  const waitMode = node.data.mode || 'duration';

  if (waitMode === 'duration') {
    // Duration-based wait
    const durationSeconds = node.data.duration || node.data.delay_value * getDelayMultiplier(node.data.delay_unit || 'hours');
    const executeAt = new Date(Date.now() + durationSeconds * 1000);

    console.log(`⏰ [Processor] Scheduling wait for ${durationSeconds} seconds (until ${executeAt.toISOString()})`);

    // Update state to waiting
    await supabase
      .from('user_journey_states')
      .update({
        status: 'waiting',
        next_execution_at: executeAt.toISOString(),
      })
      .eq('id', state.id);

    // Schedule step
    await supabase.from('scheduled_journey_steps').insert({
      user_journey_state_id: state.id,
      step_id: node.id,
      execute_at: executeAt.toISOString(),
      status: 'pending',
      payload: { 
        next_node_id: getNextNodeId(flowDefinition, node.id),
        mode: 'duration'
      },
    });

    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      'wait_started',
      { duration_seconds: durationSeconds, until: executeAt.toISOString() },
      node.id
    );

  } else if (waitMode === 'until_event') {
    // Event-based wait
    const eventName = node.data.event?.name || node.data.event_name;
    const timeoutSeconds = node.data.event?.timeout_seconds || node.data.timeout_seconds || 604800; // 7 days default
    const timeoutAt = new Date(Date.now() + timeoutSeconds * 1000);

    console.log(`⏰ [Processor] Waiting for event "${eventName}" (timeout: ${timeoutAt.toISOString()})`);

    // Update state
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

    // Schedule timeout step
    await supabase.from('scheduled_journey_steps').insert({
      user_journey_state_id: state.id,
      step_id: node.id,
      execute_at: timeoutAt.toISOString(),
      status: 'pending',
      payload: { 
        next_node_id: getNextNodeId(flowDefinition, node.id, 'timeout'),
        mode: 'event_timeout',
        event_name: eventName
      },
    });

    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      'wait_for_event_started',
      { event_name: eventName, timeout: timeoutAt.toISOString() },
      node.id
    );
  }
}

async function processConditionNode(
  state: JourneyState,
  node: JourneyNode,
  flowDefinition: FlowDefinition
): Promise<void> {
  console.log('🔀 [Processor] Processing condition');

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
          query = query.contains('event_data', { url: targetUrl });
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
        console.warn(`[Processor] Unknown condition type: ${conditionType}`);
        conditionMet = false;
    }

    // Log condition result
    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      state.id,
      'condition_evaluated',
      { condition_type: conditionType, result: conditionMet },
      node.id
    );

    // Find appropriate branch
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
    console.error('❌ [Processor] Condition error:', error.message);
    
    // On error, take 'no' path
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
  console.log('🎲 [Processor] Processing A/B split');

  const branches = node.data.branches || [];
  
  if (!branches || branches.length === 0) {
    console.warn('[Processor] No branches defined, completing journey');
    await completeJourney(state.id);
    return;
  }

  // Select branch based on percentage
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

  console.log(`[Processor] Selected branch: ${selectedBranch.id} (${selectedBranch.name})`);

  // Find edge for selected branch
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
    console.warn('[Processor] No edge found for selected branch');
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

  if (nextNodeId) {
    console.log(`[Processor] Moving to next node: ${nextNodeId}`);
    
    await supabase
      .from('user_journey_states')
      .update({ 
        current_step_id: nextNodeId, 
        status: 'active',
        last_processed_at: new Date().toISOString(),
      })
      .eq('id', state.id);

    // Process next step
    await processJourneyStep(state.id);
  } else {
    console.log('[Processor] No next node found, completing journey');
    await completeJourney(state.id);
  }
}

async function completeJourney(journeyStateId: string): Promise<void> {
  console.log('🏁 [Processor] Completing journey:', journeyStateId);

  try {
    const { data: stateData } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('id', journeyStateId)
      .single();

    if (!stateData) return;

    const state = toJourneyState(stateData);

    // Update state
    await supabase
      .from('user_journey_states')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        current_step_id: null,
      })
      .eq('id', journeyStateId);

    // Log event
    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      journeyStateId,
      'journey_completed'
    );

    // Update counters
    await supabase.rpc('increment', {
      table_name: 'journeys',
      column_name: 'total_completed',
      row_id: state.journey_id,
    });

    // Decrement active count
    const { data: journey } = await supabase
      .from('journeys')
      .select('total_active')
      .eq('id', state.journey_id)
      .single();

    if (journey && journey.total_active && journey.total_active > 0) {
      await supabase
        .from('journeys')
        .update({ total_active: journey.total_active - 1 })
        .eq('id', state.journey_id);
    }

    console.log(' [Processor] Journey completed successfully');

  } catch (error: any) {
    console.error('❌ [Processor] Error completing journey:', error.message);
  }
}

async function exitJourney(journeyStateId: string, reason: string): Promise<void> {
  console.log('🚪 [Processor] Exiting journey:', journeyStateId, 'Reason:', reason);

  try {
    const { data: stateData } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('id', journeyStateId)
      .single();

    if (!stateData) return;

    const state = toJourneyState(stateData);

    // Update state
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

    // Log event
    await logJourneyEvent(
      state.journey_id,
      state.subscriber_id,
      journeyStateId,
      'journey_exited',
      { reason }
    );

    // Update counters
    await supabase.rpc('increment', {
      table_name: 'journeys',
      column_name: 'total_exited',
      row_id: state.journey_id,
    });

    // Decrement active count
    const { data: journey } = await supabase
      .from('journeys')
      .select('total_active')
      .eq('id', state.journey_id)
      .single();

    if (journey && journey.total_active && journey.total_active > 0) {
      await supabase
        .from('journeys')
        .update({ total_active: journey.total_active - 1 })
        .eq('id', state.journey_id);
    }

  } catch (error: any) {
    console.error('❌ [Processor] Error exiting journey:', error.message);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function checkReEntryRules(subscriberId: string, journey: any): Promise<boolean> {
  const reEntrySettings = journey.re_entry_settings || {};
  const allowReEntry = reEntrySettings.allow_re_entry || false;

  // Get previous states
  const { data: states } = await supabase
    .from('user_journey_states')
    .select('*')
    .eq('subscriber_id', subscriberId)
    .eq('journey_id', journey.id)
    .order('entered_at', { ascending: false });

  if (!states || states.length === 0) {
    return true; // First time
  }

  // Check if already active
  const activeState = states.find(s => s.status === 'active' || s.status === 'waiting');
  if (activeState) {
    console.log('[Processor] Already active in journey');
    return false;
  }

  // Check if re-entry allowed
  if (!allowReEntry) {
    console.log('[Processor] Re-entry not allowed');
    return false;
  }

  // Check max entries
  const maxEntries = reEntrySettings.max_entries || 0;
  if (maxEntries > 0 && states.length >= maxEntries) {
    console.log(`[Processor] Max entries (${maxEntries}) reached`);
    return false;
  }

  // Check cooldown
  const cooldownDays = reEntrySettings.cooldown_days || 0;
  if (cooldownDays > 0 && states.length > 0 && states[0].entered_at) {
    const lastEntry = new Date(states[0].entered_at);
    const daysSince = (Date.now() - lastEntry.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSince < cooldownDays) {
      console.log(`[Processor] Cooldown period (${cooldownDays} days) not met`);
      return false;
    }
  }

  return true;
}

function getDelayMultiplier(unit: string): number {
  switch (unit) {
    case 'minutes': return 60;
    case 'hours': return 3600;
    case 'days': return 86400;
    default: return 3600;
  }
}

/**
 * Handle subscriber events (for wait-until-event nodes)
 */
export async function handleSubscriberEvent(
  subscriberId: string,
  eventName: string,
  eventData: any = {}
): Promise<void> {
  console.log('📥 [Processor] Handling subscriber event:', { subscriberId, eventName });

  try {
    // Find waiting states for this event
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

    console.log(`[Processor] Found ${waitingStates.length} waiting state(s)`);

    for (const stateData of waitingStates) {
      const state = toJourneyState(stateData);
      
      // Cancel scheduled timeout
      await supabase
        .from('scheduled_journey_steps')
        .update({ status: 'cancelled' })
        .eq('user_journey_state_id', state.id)
        .eq('status', 'pending');

      // Update context
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

      // Log event
      await logJourneyEvent(
        state.journey_id,
        state.subscriber_id,
        state.id,
        'event_received',
        { event_name: eventName, event_data: eventData },
        state.current_step_id || undefined
      );

      // Fetch journey to get flow
      const { data: journey } = await supabase
        .from('journeys')
        .select('flow_definition')
        .eq('id', state.journey_id)
        .single();

      if (journey) {
        const flowDefinition = parseFlowDefinition(journey.flow_definition);
        const currentNode = flowDefinition.nodes.find(n => n.id === state.current_step_id);
        
        if (currentNode) {
          // Move to success path
          await moveToNextNode(state, flowDefinition, currentNode.id);
        }
      }
    }

  } catch (error: any) {
    console.error('❌ [Processor] Error handling event:', error.message);
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