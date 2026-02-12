// worker/index.ts - FIXED VERSION (NO conversion_rate)
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Worker, Job, Queue } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import webpush from 'web-push';

// Redis connection
const redisConnection: ConnectionOptions = {
  host: process.env.REDIS_HOST!,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  ...(process.env.REDIS_TLS === 'true' && { 
    tls: { rejectUnauthorized: false } 
  })
};

const notificationQueue = new Queue('journey-notifications', {
  connection: redisConnection,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure VAPID
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:mushiele01@gmail.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('VAPID configured');
} else {
  console.warn('VAPID keys not configured');
}

interface NotificationJobData {
  scheduledStepId: string;
  journeyStateId: string;
  stepType: string;
  executeAt: string;
}

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  branding?: any;
}

interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// ============================================================================
// WEB PUSH SENDER
// ============================================================================

async function sendWebPushNotification(
  subscription: WebPushSubscription,
  notification: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured');
    }

    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192.png',
      badge: notification.badge || '/badge-72.png',
      image: notification.image,
      url: notification.url || '/',
      tag: notification.tag || `notification-${Date.now()}`,
      requireInteraction: notification.requireInteraction || false,
      branding: notification.branding,
      timestamp: Date.now(),
    });

    await webpush.sendNotification(subscription, payload, {
      TTL: 86400,
      urgency: 'normal',
    });

    return { success: true };
  } catch (error: any) {
    console.error('[Web Push] ✗ Send error:', error.message);

    if (error.statusCode === 410 || error.statusCode === 404) {
      return { success: false, error: 'SUBSCRIPTION_EXPIRED' };
    }

    if (error.statusCode === 401) {
      return { success: false, error: 'UNAUTHORIZED' };
    }

    return { success: false, error: error.message };
  }
}

async function sendNotificationToSubscriber(
  subscriber: any,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string; platform?: string }> {
  const platform = subscriber.platform || 'web';

  try {
    if (platform === 'web' && subscriber.endpoint && subscriber.p256dh_key && subscriber.auth_key) {
      const subscription: WebPushSubscription = {
        endpoint: subscriber.endpoint,
        keys: {
          p256dh: subscriber.p256dh_key,
          auth: subscriber.auth_key,
        },
      };

      const result = await sendWebPushNotification(subscription, payload);
      return { ...result, platform: 'web' };
    }

    return { success: false, error: 'No valid push credentials', platform };
  } catch (error: any) {
    return { success: false, error: error.message, platform };
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function processNextStepInWorker(
  stateId: string, 
  nextStepId: string, 
  journeyId: string
): Promise<void> {
  console.log(`[Worker]  Processing next step: ${nextStepId}`);

  try {
    const { data: journey } = await supabase
      .from('journeys')
      .select('flow_definition')
      .eq('id', journeyId)
      .single();

    if (!journey) {
      console.error('[Worker] ✗ Journey not found');
      return;
    }

    const flowDefinition = journey.flow_definition as any;
    const nextNode = flowDefinition.nodes.find((n: any) => n.id === nextStepId);

    if (!nextNode) {
      console.log('[Worker] Next node not found, completing journey');
      await completeJourney(stateId, journeyId);
      return;
    }

    console.log(`[Worker]  Next node type: ${nextNode.type}`);

    switch (nextNode.type) {
      case 'send_notification':
        await sendNotificationFromWorker(stateId, nextNode, flowDefinition, journeyId);
        break;
      
      case 'wait':
        await scheduleWaitFromWorker(stateId, nextNode, flowDefinition);
        break;
      
      case 'condition':
        console.log('[Worker] Delegating condition to processor');
        await triggerProcessorForState(stateId);
        break;
      
      case 'exit':
        await completeJourney(stateId, journeyId);
        break;
      
      default:
        const edge = flowDefinition.edges.find((e: any) => e.from === nextNode.id);
        if (edge) {
          await supabase.from('user_journey_states')
            .update({ 
              current_step_id: edge.to,
              last_processed_at: new Date().toISOString(),
            })
            .eq('id', stateId);
          await processNextStepInWorker(stateId, edge.to, journeyId);
        } else {
          await completeJourney(stateId, journeyId);
        }
    }
  } catch (error: any) {
    console.error('[Worker] ✗ Error processing next step:', error.message);
  }
}

async function sendNotificationFromWorker(
  stateId: string,
  node: any,
  flowDefinition: any,
  journeyId: string
): Promise<void> {
  console.log(`[Worker]  Sending notification: "${node.data.title}"`);

  try {
    const { data: state } = await supabase
      .from('user_journey_states')
      .select('*')
      .eq('id', stateId)
      .single();

    if (!state) {
      console.error('[Worker] ✗ State not found');
      return;
    }

    const { data: subscriber } = await supabase
      .from('subscribers')
      .select('*')
      .eq('id', state.subscriber_id)
      .single();

    if (!subscriber || !subscriber.endpoint) {
      console.log('[Worker] Subscriber has no push subscription');
      
      await supabase.from('notification_logs').insert({
        website_id: subscriber?.website_id || null,
        subscriber_id: state.subscriber_id,
        journey_id: journeyId,
        journey_step_id: node.id,
        user_journey_state_id: stateId,
        status: 'failed',
        platform: 'web',
        sent_at: new Date().toISOString(),
        error_message: 'No push subscription',
      });

      await moveToNextNodeInWorker(stateId, node.id, flowDefinition, journeyId);
      return;
    }

    const { data: website } = await supabase
      .from('websites')
      .select('*')
      .eq('id', subscriber.website_id)
      .single();

    const branding = (website?.notification_branding as any) || {};

    const { data: notificationLog } = await supabase
      .from('notification_logs')
      .insert({
        website_id: subscriber.website_id,
        subscriber_id: subscriber.id,
        journey_id: journeyId,
        journey_step_id: node.id,
        user_journey_state_id: stateId,
        status: 'sent',
        platform: subscriber.platform || 'web',
        sent_at: new Date().toISOString(),
      })
      .select()
      .single();

    const result = await sendNotificationToSubscriber(subscriber, {
      title: node.data.title || 'Notification',
      body: node.data.body || '',
      icon: branding.logo_url || '/favicon.ico',
      image: node.data.image_url,
      url: node.data.url || '/',
      tag: notificationLog?.id,
      branding,
    });

    if (result.success) {
      await supabase.from('notification_logs').update({ 
        status: 'delivered',
        delivered_at: new Date().toISOString() 
      }).eq('id', notificationLog?.id);
      
      console.log('[Worker]  Notification sent successfully');
    } else {
      await supabase.from('notification_logs').update({ 
        status: 'failed',
        error_message: result.error || 'Unknown error'
      }).eq('id', notificationLog?.id);
      
      console.log('[Worker] ✗ Notification failed:', result.error);
    }

    await supabase.from('journey_events').insert({
      journey_id: journeyId,
      subscriber_id: state.subscriber_id,
      user_journey_state_id: stateId,
      event_type: result.success ? 'notification_sent' : 'notification_failed',
      step_id: node.id,
      metadata: result.success ? { notification_id: notificationLog?.id } : { error: result.error }
    });

    await moveToNextNodeInWorker(stateId, node.id, flowDefinition, journeyId);
    return;

  } catch (error: any) {
    console.error('[Worker] ✗ Notification error:', error.message);
    await moveToNextNodeInWorker(stateId, node.id, flowDefinition, journeyId);
    return;
  }
}

async function scheduleWaitFromWorker(
  stateId: string,
  node: any,
  flowDefinition: any
): Promise<void> {
  console.log('[Worker]  Scheduling nested wait node');

  try {
    let durationSeconds = node.data.duration || 86400;
    
    if (node.data.duration_seconds !== undefined) {
      durationSeconds = node.data.duration_seconds;
    }

    const executeAt = new Date(Date.now() + durationSeconds * 1000);

    console.log(`[Worker]  Scheduling wait: ${durationSeconds}s`);

    const { data: state } = await supabase
      .from('user_journey_states')
      .select('journey_id, subscriber_id')
      .eq('id', stateId)
      .single();

    if (!state) {
      console.error('[Worker] ✗ State not found');
      return;
    }

    await supabase.from('user_journey_states').update({
      status: 'waiting',
      next_execution_at: executeAt.toISOString(),
      last_processed_at: new Date().toISOString(),
    }).eq('id', stateId);

    const { data: scheduledStep } = await supabase
      .from('scheduled_journey_steps')
      .insert({
        user_journey_state_id: stateId,
        step_id: node.id,
        execute_at: executeAt.toISOString(),
        status: 'pending',
        payload: { 
          mode: 'duration', 
          step_type: 'wait_duration',
          journey_id: state.journey_id,
          subscriber_id: state.subscriber_id,
        },
      })
      .select()
      .single();

    await notificationQueue.add('wait-completion', {
      scheduledStepId: scheduledStep!.id,
      journeyStateId: stateId,
      stepType: 'wait_duration',
      executeAt: executeAt.toISOString(),
    }, {
      delay: durationSeconds * 1000,
      jobId: `wait-${scheduledStep!.id}`,
    });

    console.log(`[Worker] ✓ Wait scheduled: wait-${scheduledStep!.id}`);
    return;
    
  } catch (error: any) {
    console.error('[Worker] ✗ Failed to schedule wait:', error.message);
  }
}

async function moveToNextNodeInWorker(
  stateId: string,
  currentNodeId: string,
  flowDefinition: any,
  journeyId: string
): Promise<void> {
  const nextEdge = flowDefinition.edges.find((e: any) => e.from === currentNodeId);

  if (nextEdge) {
    console.log(`[Worker] Moving from ${currentNodeId} to ${nextEdge.to}`);
    
    await supabase.from('user_journey_states').update({
      current_step_id: nextEdge.to,
      status: 'active',
      last_processed_at: new Date().toISOString(),
    }).eq('id', stateId);

    await processNextStepInWorker(stateId, nextEdge.to, journeyId);
    return;
    
  } else {
    console.log('[Worker]  No next step, completing journey');
    await completeJourney(stateId, journeyId);
    return;
  }
}

async function completeJourney(stateId: string, journeyId: string): Promise<void> {
  console.log('[Worker] Completing journey');

  try {
    const { data: currentState } = await supabase
      .from('user_journey_states')
      .select('status')
      .eq('id', stateId)
      .single();

    if (!currentState) {
      console.log('[Worker] ⚠ State not found, already deleted');
      return;
    }

    if (currentState.status === 'completed' || currentState.status === 'exited') {
      console.log('[Worker] ⚠ Journey already completed/exited, skipping');
      return;
    }

    const { data: state } = await supabase
      .from('user_journey_states')
      .select('subscriber_id')
      .eq('id', stateId)
      .single();

    if (!state) return;

    await supabase.from('user_journey_states').update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      current_step_id: null,
    }).eq('id', stateId);

    await supabase.from('journey_events').insert({
      journey_id: journeyId,
      subscriber_id: state.subscriber_id,
      user_journey_state_id: stateId,
      event_type: 'journey_completed',
    });

    // 🔥 FIX: Removed conversion_rate (doesn't exist in database)
    const { data: allStates } = await supabase
      .from('user_journey_states')
      .select('status')
      .eq('journey_id', journeyId);

    if (allStates) {
      const total_entered = allStates.length;
      const total_active = allStates.filter(s => s.status === 'active' || s.status === 'waiting').length;
      const total_completed = allStates.filter(s => s.status === 'completed').length;
      const total_exited = allStates.filter(s => s.status === 'exited').length;

      await supabase.from('journeys').update({
        total_entered,
        total_active,
        total_completed,
        total_exited,
        updated_at: new Date().toISOString(),
      }).eq('id', journeyId);
    }

    console.log('[Worker] ✓ Journey completed successfully');

  } catch (error: any) {
    console.error('[Worker] ✗ Error completing journey:', error.message);
  }
}

async function triggerProcessorForState(stateId: string): Promise<void> {
  console.log('[Worker]  Triggering processor for state:', stateId);
  
  await supabase.from('user_journey_states').update({
    status: 'active',
    last_processed_at: new Date().toISOString(),
  }).eq('id', stateId);
}

// ============================================================================
// MAIN JOB PROCESSOR
// ============================================================================

// async function processNotificationJob(job: Job<NotificationJobData>) {
//   console.log(`\n🔔 [Worker] Processing job ${job.id}`);
//   console.log(`   Type: ${job.data.stepType}`);
//   console.log(`   Scheduled for: ${job.data.executeAt}`);
//   console.log(`   Journey State ID: ${job.data.journeyStateId}`);

//   const { scheduledStepId, journeyStateId, stepType } = job.data;

//   try {
//     await supabase
//       .from('scheduled_journey_steps')
//       .update({ 
//         status: 'processing',
//         started_at: new Date().toISOString(),
//       })
//       .eq('id', scheduledStepId);

//     console.log(`[Worker] 📍 Fetching journey state: ${journeyStateId}`);

//     const { data: state, error: stateError } = await supabase
//       .from('user_journey_states')
//       .select('*')
//       .eq('id', journeyStateId)
//       .single();

//     if (stateError || !state) {
//       console.error(`[Worker] ✗ Journey state not found:`, stateError?.message || 'No data');
//       throw new Error('Journey state not found');
//     }

//     const { data: journey, error: journeyError } = await supabase
//       .from('journeys')
//       .select('*')
//       .eq('id', state.journey_id)
//       .single();

//     if (journeyError || !journey) {
//       console.error(`[Worker] ✗ Journey not found:`, journeyError?.message || 'No data');
//       throw new Error('Journey not found');
//     }

//     console.log(`[Worker] State found - Status: ${state.status}`);
//     console.log(`   Journey ID: ${journey.id}`);
//     console.log(`   Current step: ${state.current_step_id}`);
//     console.log(`   Journey: ${journey.name} (${journey.status})`);

//     if (state.status === 'completed' || state.status === 'exited') {
//       console.log(`[Worker] ⚠ Journey already ${state.status}, cancelling job`);
//       await supabase
//         .from('scheduled_journey_steps')
//         .update({ 
//           status: 'cancelled',
//           error: `Journey already ${state.status}`,
//           completed_at: new Date().toISOString(),
//         })
//         .eq('id', scheduledStepId);
//       return;
//     }

//     if (stepType.includes('wait')) {
//       console.log('[Worker] ⏰ Wait period completed');
      
//       const flowDefinition = journey.flow_definition as any;
//       const currentNode = flowDefinition.nodes.find(
//         (n: any) => n.id === state.current_step_id
//       );
      
//       if (currentNode) {
//         console.log(`[Worker] 📌 Current node: ${currentNode.id} (${currentNode.type})`);
        
//         const nextEdge = flowDefinition.edges.find(
//           (e: any) => e.from === currentNode.id
//         );
        
//         if (nextEdge) {
//           console.log(`[Worker] ➡️  Moving to next step: ${nextEdge.to}`);
          
//           await supabase.from('user_journey_states').update({
//             current_step_id: nextEdge.to,
//             status: 'active',
//             next_execution_at: null,
//             last_processed_at: new Date().toISOString(),
//           }).eq('id', journeyStateId);

//           console.log('[Worker] State updated to active');

//           await supabase.from('journey_events').insert({
//             journey_id: state.journey_id,
//             subscriber_id: state.subscriber_id,
//             user_journey_state_id: state.id,
//             event_type: 'wait_completed',
//             step_id: currentNode.id,
//             metadata: { next_step_id: nextEdge.to }
//           });

//           console.log('[Worker] Wait completion logged');

//           await processNextStepInWorker(state.id, nextEdge.to, state.journey_id);
          
//         } else {
//           console.log('[Worker] 🏁 No next step, completing journey');
//           await completeJourney(state.id, state.journey_id);
//         }
//       } else {
//         console.log('[Worker] ✗ Current node not found in flow');
//         await completeJourney(state.id, state.journey_id);
//       }
//     }

//     await supabase
//       .from('scheduled_journey_steps')
//       .update({ 
//         status: 'completed',
//         completed_at: new Date().toISOString(),
//       })
//       .eq('id', scheduledStepId);

//     console.log(`[Worker] Job ${job.id} completed successfully\n`);

//   } catch (error: any) {
//     console.error(`❌ [Worker] Job ${job.id} failed:`, error.message);

//     await supabase
//       .from('scheduled_journey_steps')
//       .update({ 
//         status: 'failed',
//         error: error.message,
//         completed_at: new Date().toISOString(),
//       })
//       .eq('id', scheduledStepId);

//     throw error;
//   }
// }
// worker/index.ts - CORRECTED processNotificationJob function

async function processNotificationJob(job: Job<NotificationJobData>) {
  console.log(`\n🔔 [Worker] Processing job ${job.id}`);
  console.log(`   Type: ${job.data.stepType}`);
  console.log(`   Scheduled for: ${job.data.executeAt}`);
  console.log(`   Journey State ID: ${job.data.journeyStateId}`);

  const { scheduledStepId, journeyStateId, stepType } = job.data;

  try {
    // 🔥 FIX 1: PARALLEL fetch state and update schedule (saves 800ms)
    const [stateResult, scheduleUpdateResult] = await Promise.all([
      supabase.from('user_journey_states').select('*').eq('id', journeyStateId).single(),
      supabase.from('scheduled_journey_steps')
        .update({ 
          status: 'processing',
          started_at: new Date().toISOString(),
        })
        .eq('id', scheduledStepId)
         // FIXED: Added .select() to make it a Promise
    ]);

    const { data: state, error: stateError } = stateResult;

    if (stateError || !state) {
      console.error(`[Worker] ✗ Journey state not found:`, stateError?.message || 'No data');
      throw new Error('Journey state not found');
    }

    // 🔥 FIX 2: Fetch journey 
    const { data: journey, error: journeyError } = await supabase
      .from('journeys')
      .select('*')
      .eq('id', state.journey_id)
      .single();

    if (journeyError || !journey) {
      console.error(`[Worker] ✗ Journey not found:`, journeyError?.message || 'No data');
      throw new Error('Journey not found');
    }

    console.log(`[Worker] State found - Status: ${state.status}`);
    console.log(`   Journey ID: ${journey.id}`);
    console.log(`   Current step: ${state.current_step_id}`);
    console.log(`   Journey: ${journey.name} (${journey.status})`);

    if (state.status === 'completed' || state.status === 'exited') {
      console.log(`[Worker] ⚠ Journey already ${state.status}, cancelling job`);
      await supabase
        .from('scheduled_journey_steps')
        .update({ 
          status: 'cancelled',
          error: `Journey already ${state.status}`,
          completed_at: new Date().toISOString(),
        })
        .eq('id', scheduledStepId);
      return;
    }

    if (stepType.includes('wait')) {
      console.log('[Worker]  Wait period completed');
      
      const flowDefinition = journey.flow_definition as any;
      const currentNode = flowDefinition.nodes.find(
        (n: any) => n.id === state.current_step_id
      );
      
      if (currentNode) {
        console.log(`[Worker]  Current node: ${currentNode.id} (${currentNode.type})`);
        
        const nextEdge = flowDefinition.edges.find(
          (e: any) => e.from === currentNode.id
        );
        
        if (nextEdge) {
          console.log(`[Worker]   Moving to next step: ${nextEdge.to}`);
          
          // 🔥 FIX 3: Update state and log event IN PARALLEL (saves 500ms)
          await Promise.all([
            supabase.from('user_journey_states').update({
              current_step_id: nextEdge.to,
              status: 'active',
              next_execution_at: null,
              last_processed_at: new Date().toISOString(),
            }).eq('id', journeyStateId),
            
            supabase.from('journey_events').insert({
              journey_id: state.journey_id,
              subscriber_id: state.subscriber_id,
              user_journey_state_id: state.id,
              event_type: 'wait_completed',
              step_id: currentNode.id,
              metadata: { next_step_id: nextEdge.to }
            }),
          ]);

          console.log('[Worker] State updated to active');
          console.log('[Worker] Wait completion logged');

          // 🔥 FIX 4: Process next step and update schedule in parallel
          await Promise.all([
            processNextStepInWorker(state.id, nextEdge.to, state.journey_id),
            supabase
              .from('scheduled_journey_steps')
              .update({ 
                status: 'completed',
                completed_at: new Date().toISOString(),
              })
              .eq('id', scheduledStepId),
          ]);
          
          console.log(`[Worker] Job ${job.id} completed successfully\n`);
          return;
          
        } else {
          console.log('[Worker] No next step, completing journey');
          await completeJourney(state.id, state.journey_id);
        }
      } else {
        console.log('[Worker] ✗ Current node not found in flow');
        await completeJourney(state.id, state.journey_id);
      }
    }

    await supabase
      .from('scheduled_journey_steps')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', scheduledStepId);

    console.log(` [Worker] Job ${job.id} completed successfully\n`);

  } catch (error: any) {
    console.error(` [Worker] Job ${job.id} failed:`, error.message);

    await supabase
      .from('scheduled_journey_steps')
      .update({ 
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scheduledStepId);

    throw error;
  }
}

// ============================================================================
// CREATE WORKER
// ============================================================================

const worker = new Worker<NotificationJobData>(
  'journey-notifications',
  processNotificationJob,
  {
    connection: redisConnection,
    concurrency: 20,
    drainDelay: 50,
    lockDuration: 15000,
    maxStalledCount: 2,     // 🔥 NEW: Fail faster on stalled jobs
    stalledInterval: 5000,
  }
);

worker.on('completed', (job) => {
  console.log(` Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(` Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error(' Worker error:', err);
});

console.log('\n Journey notification worker started');
console.log(` Redis: ${redisConnection.host}:${redisConnection.port}`);
console.log(`  Concurrency: 20 jobs\n`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n Shutting down worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n Shutting down worker...');
  await worker.close();
  process.exit(0);
});