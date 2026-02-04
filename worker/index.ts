// worker/index.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { Worker, Job } from 'bullmq';
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

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Configure VAPID for web push
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:noreply@yourdomain.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log(' VAPID configured');
} else {
  console.warn('⚠️  VAPID keys not configured - web push will not work');
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

// Web Push notification sender
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
      TTL: 86400, // 24 hours
      urgency: 'normal',
    });

    return { success: true };
  } catch (error: any) {
    console.error('[Web Push] Send error:', {
      message: error.message,
      statusCode: error.statusCode,
    });

    if (error.statusCode === 410 || error.statusCode === 404) {
      return {
        success: false,
        error: 'SUBSCRIPTION_EXPIRED: The push subscription has expired',
      };
    }

    if (error.statusCode === 401) {
      return {
        success: false,
        error: 'UNAUTHORIZED: Invalid VAPID keys',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to send web push notification',
    };
  }
}

// Notification sender that handles different platforms
async function sendNotificationToSubscriber(
  subscriber: any,
  payload: NotificationPayload
): Promise<{ success: boolean; error?: string; platform?: string }> {
  const platform = subscriber.platform || 'web';

  try {
    // Web platform with web push credentials
    if (platform === 'web' && subscriber.endpoint && subscriber.p256dh_key && subscriber.auth_key) {
      console.log('[Worker] Sending web push notification');

      const subscription: WebPushSubscription = {
        endpoint: subscriber.endpoint,
        keys: {
          p256dh: subscriber.p256dh_key,
          auth: subscriber.auth_key,
        },
      };

      const result = await sendWebPushNotification(subscription, payload);

      return {
        ...result,
        platform: 'web',
      };
    }

    // No valid credentials found
    console.error('[Worker] No valid push credentials');
    return {
      success: false,
      error: 'No valid push credentials found',
      platform,
    };

  } catch (error: any) {
    console.error('[Worker] Error sending notification:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      platform,
    };
  }
}

async function processNotificationJob(job: Job<NotificationJobData>) {
  console.log(`\n🔔 [Worker] Processing job ${job.id}`);
  console.log(`   Type: ${job.data.stepType}`);
  console.log(`   Scheduled for: ${job.data.executeAt}`);

  const { scheduledStepId, journeyStateId, stepType } = job.data;

  try {
    // Mark as processing
    await supabase
      .from('scheduled_journey_steps')
      .update({ 
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', scheduledStepId);

    // Get journey state with journey details
    const { data: state, error: stateError } = await supabase
      .from('user_journey_states')
      .select(`
        *,
        journey:journeys(
          id,
          name,
          flow_definition,
          website_id
        )
      `)
      .eq('id', journeyStateId)
      .single();

    if (stateError || !state) {
      throw new Error('Journey state not found');
    }

    console.log(`   Journey: ${state.journey.name}`);
    console.log(`   Current step: ${state.current_step_id}`);

    // Handle wait completion
    if (stepType.includes('wait')) {
      console.log('   ⏰ Wait period completed');
      
      const flowDefinition = state.journey.flow_definition as any;
      const currentNode = flowDefinition.nodes.find(
        (n: any) => n.id === state.current_step_id
      );
      
      if (currentNode) {
        const nextEdge = flowDefinition.edges.find(
          (e: any) => e.from === currentNode.id
        );
        
        if (nextEdge) {
          console.log(`   ➡️  Moving to next step: ${nextEdge.to}`);
          
          // Update state
          await supabase
            .from('user_journey_states')
            .update({
              current_step_id: nextEdge.to,
              status: 'active',
              next_execution_at: null,
              last_processed_at: new Date().toISOString(),
            })
            .eq('id', journeyStateId);

          // Log event
          await supabase.from('journey_events').insert({
            journey_id: state.journey_id,
            subscriber_id: state.subscriber_id,
            user_journey_state_id: state.id,
            event_type: 'wait_completed',
            step_id: currentNode.id,
            metadata: { next_step_id: nextEdge.to }
          });

          // Process next step
          await processNextStep(state.id, nextEdge.to, state.journey);
        } else {
          console.log('   ✓ No next step - completing journey');
          await completeJourney(state.id, state.journey_id, state.subscriber_id);
        }
      }
    }

    // Mark as completed
    await supabase
      .from('scheduled_journey_steps')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', scheduledStepId);

    console.log(` [Worker] Job ${job.id} completed successfully\n`);

  } catch (error: any) {
    console.error(`❌ [Worker] Job ${job.id} failed:`, error.message);

    await supabase
      .from('scheduled_journey_steps')
      .update({ 
        status: 'failed',
        error: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', scheduledStepId);

    throw error; // Re-throw for BullMQ retry logic
  }
}

// Helper: Process next step
async function processNextStep(stateId: string, nextStepId: string, journey: any) {
  const flowDefinition = journey.flow_definition as any;
  const nextNode = flowDefinition.nodes.find((n: any) => n.id === nextStepId);

  if (!nextNode) {
    console.log('[Worker] No next node found');
    return;
  }

  console.log(`[Worker] Next step type: ${nextNode.type}`);

  // Get fresh state
  const { data: state } = await supabase
    .from('user_journey_states')
    .select('*')
    .eq('id', stateId)
    .single();

  if (!state) return;

  switch (nextNode.type) {
    case 'send_notification':
      await sendNotificationStep(state, nextNode, flowDefinition, journey);
      break;
    
    case 'wait':
      await scheduleWaitStep(state, nextNode, flowDefinition);
      break;
    
    case 'condition':
      await processConditionStep(state, nextNode, flowDefinition, journey);
      break;
    
    case 'exit':
      await completeJourney(state.id, state.journey_id, state.subscriber_id);
      break;
    
    default:
      // Move to next
      const edge = flowDefinition.edges.find((e: any) => e.from === nextNode.id);
      if (edge) {
        await supabase.from('user_journey_states')
          .update({ current_step_id: edge.to })
          .eq('id', state.id);
        await processNextStep(state.id, edge.to, journey);
      }
  }
}

// Helper: Send notification
async function sendNotificationStep(state: any, node: any, flowDefinition: any, journey: any) {
  console.log(`[Worker] 📧 Sending notification: "${node.data.title}"`);

  const { data: subscriber } = await supabase
    .from('subscribers')
    .select('*')
    .eq('id', state.subscriber_id)
    .single();

  if (!subscriber || !subscriber.endpoint) {
    console.log('[Worker] ⚠️  Subscriber has no push subscription');
    
    // Log failure
    await supabase.from('notification_logs').insert({
      website_id: journey.website_id,
      subscriber_id: state.subscriber_id,
      journey_id: state.journey_id,
      journey_step_id: node.id,
      user_journey_state_id: state.id,
      status: 'failed',
      platform: 'web',
      sent_at: new Date().toISOString(),
      error_message: 'No push subscription',
    });

    // Move to next step anyway
    const edge = flowDefinition.edges.find((e: any) => e.from === node.id);
    if (edge) {
      await supabase.from('user_journey_states')
        .update({ current_step_id: edge.to })
        .eq('id', state.id);
      await processNextStep(state.id, edge.to, journey);
    }
    return;
  }

  const { data: website } = await supabase
    .from('websites')
    .select('*')
    .eq('id', subscriber.website_id)
    .single();

  const branding = (website?.notification_branding as any) || {};

  // Create log
  const { data: notificationLog } = await supabase
    .from('notification_logs')
    .insert({
      website_id: subscriber.website_id,
      subscriber_id: subscriber.id,
      journey_id: state.journey_id,
      journey_step_id: node.id,
      user_journey_state_id: state.id,
      status: 'sent',
      platform: subscriber.platform || 'web',
      sent_at: new Date().toISOString(),
    })
    .select()
    .single();

  // Send notification
  const result = await sendNotificationToSubscriber(subscriber, {
    title: node.data.title || 'Notification',
    body: node.data.body || '',
    icon: branding.logo_url || '/icon-192x192.png',
    image: node.data.image_url,
    url: node.data.url || '/',
    tag: notificationLog?.id,
    branding,
  });

  // Update log
  if (result.success) {
    await supabase.from('notification_logs').update({ 
      status: 'delivered',
      delivered_at: new Date().toISOString() 
    }).eq('id', notificationLog?.id);
    
    console.log('[Worker] ✓ Notification sent successfully');
  } else {
    await supabase.from('notification_logs').update({ 
      status: 'failed',
      error_message: result.error || 'Unknown error'
    }).eq('id', notificationLog?.id);
    
    console.log('[Worker] ✗ Notification failed:', result.error);
  }

  // Move to next step
  const edge = flowDefinition.edges.find((e: any) => e.from === node.id);
  if (edge) {
    await supabase.from('user_journey_states')
      .update({ current_step_id: edge.to })
      .eq('id', state.id);
    await processNextStep(state.id, edge.to, journey);
  } else {
    await completeJourney(state.id, state.journey_id, state.subscriber_id);
  }
}

// Helper: Schedule wait
async function scheduleWaitStep(state: any, node: any, flowDefinition: any) {
  const durationSeconds = node.data.duration || 86400;
  const executeAt = new Date(Date.now() + durationSeconds * 1000);

  console.log(`[Worker] ⏰ Scheduling new wait: ${durationSeconds}s`);

  await supabase.from('user_journey_states').update({
    status: 'waiting',
    next_execution_at: executeAt.toISOString(),
  }).eq('id', state.id);

  const { data: scheduledStep } = await supabase
    .from('scheduled_journey_steps')
    .insert({
      user_journey_state_id: state.id,
      step_id: node.id,
      execute_at: executeAt.toISOString(),
      status: 'pending',
      payload: { mode: 'duration', step_type: 'wait_duration' },
    })
    .select()
    .single();

  // Schedule in queue
  const { Queue } = await import('bullmq');
  const queue = new Queue('journey-notifications', { connection: redisConnection });
  
  await queue.add(
    'wait-completion',
    {
      scheduledStepId: scheduledStep!.id,
      journeyStateId: state.id,
      stepType: 'wait_duration',
      executeAt: executeAt.toISOString(),
    },
    {
      delay: durationSeconds * 1000,
      jobId: `wait-${scheduledStep!.id}`,
    }
  );
}

// Helper: Process condition
async function processConditionStep(state: any, node: any, flowDefinition: any, journey: any) {
  console.log(`[Worker]  Evaluating condition: ${node.data.check}`);
  
  const conditionType = node.data.check || node.data.condition_type;
  const lookbackSeconds = node.data.lookback || 86400;
  const lookbackDate = new Date(Date.now() - lookbackSeconds * 1000);
  
  let conditionMet = false;

  try {
    switch (conditionType) {
      case 'clicked_notification':
        const { data: clicks } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('subscriber_id', state.subscriber_id)
          .not('clicked_at', 'is', null)
          .gte('clicked_at', lookbackDate.toISOString())
          .limit(1);
        conditionMet = !!clicks && clicks.length > 0;
        break;

      case 'visited_page':
        const targetUrl = node.data.url;
        const { data: visits } = await supabase
          .from('subscriber_events')
          .select('id')
          .eq('subscriber_id', state.subscriber_id)
          .eq('event_name', 'page_view')
          .gte('created_at', lookbackDate.toISOString())
          .limit(1);
        conditionMet = !!visits && visits.length > 0;
        break;
      
      default:
        conditionMet = false;
    }

    console.log(`[Worker] Condition result: ${conditionMet ? 'YES' : 'NO'}`);

    await supabase.from('journey_events').insert({
      journey_id: state.journey_id,
      subscriber_id: state.subscriber_id,
      user_journey_state_id: state.id,
      event_type: 'condition_evaluated',
      step_id: node.id,
      metadata: { condition_type: conditionType, result: conditionMet }
    });

  } catch (error) {
    console.error('[Worker] Condition evaluation error:', error);
    conditionMet = false;
  }

  // Find next edge
  const branchType = conditionMet ? 'yes' : 'no';
  const nextEdge = flowDefinition.edges.find(
    (e: any) => e.from === node.id && (e.type === branchType || e.condition === branchType)
  );

  if (nextEdge) {
    await supabase.from('user_journey_states')
      .update({ current_step_id: nextEdge.to, status: 'active' })
      .eq('id', state.id);
    await processNextStep(state.id, nextEdge.to, journey);
  } else {
    console.log(`[Worker] No ${branchType} branch found`);
    await completeJourney(state.id, state.journey_id, state.subscriber_id);
  }
}

// Helper: Complete journey
async function completeJourney(stateId: string, journeyId: string, subscriberId: string) {
  console.log('[Worker] 🏁 Completing journey');

  await supabase.from('user_journey_states').update({
    status: 'completed',
    completed_at: new Date().toISOString(),
    current_step_id: null,
  }).eq('id', stateId);

  await supabase.from('journey_events').insert({
    journey_id: journeyId,
    subscriber_id: subscriberId,
    user_journey_state_id: stateId,
    event_type: 'journey_completed',
  });

  // Update counters
  await supabase.rpc('increment', {
    table_name: 'journeys',
    column_name: 'total_completed',
    row_id: journeyId,
  });

  await supabase.rpc('decrement', {
    table_name: 'journeys',
    column_name: 'total_active',
    row_id: journeyId,
  });
}

// Create and start worker
const worker = new Worker<NotificationJobData>(
  'journey-notifications',
  processNotificationJob,
  {
    connection: redisConnection,
    concurrency: 10,
  }
);

// Event handlers
worker.on('completed', (job) => {
  console.log(` Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('❌ Worker error:', err);
});

console.log('\n Journey notification worker started');
console.log(`📡 Redis: ${redisConnection.host}:${redisConnection.port}`);
console.log(`⚙️  Concurrency: 10 jobs\n`);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n👋 Shutting down worker...');
  await worker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n👋 Shutting down worker...');
  await worker.close();
  process.exit(0);
});