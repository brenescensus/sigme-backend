// // backend/lib/scheduler.ts

// interface ScheduleTaskParams {
//   type: string;
//   executeAt: string;
//   data: any;
// }

// /**
//  * Schedule a background task
//  * TODO: Implement with your preferred job queue (BullMQ, Inngest, etc.)
//  */
// export async function scheduleTask(params: ScheduleTaskParams): Promise<void> {
//   console.log('[Scheduler] Task scheduled:', params);
  
//   // TODO: Implement actual scheduling logic
//   // Examples:
//   // - Use BullMQ: await queue.add('journey_step', params.data, { delay: calculateDelay(params.executeAt) })
//   // - Use Inngest: await inngest.send({ name: params.type, data: params.data, ts: params.executeAt })
//   // - Use Vercel Cron + Database polling
  
//   // For now, just log it
//   console.warn('[Scheduler] WARNING: Task scheduling not implemented yet');
// }

// /**
//  * Cancel all scheduled tasks for a journey
//  */
// export async function cancelScheduledTasks(journeyId: string): Promise<void> {
//   console.log('[Scheduler] Cancelling tasks for journey:', journeyId);
  
//   // TODO: Implement task cancellation
//   // - Remove from job queue
//   // - Update database records
  
//   console.warn('[Scheduler] WARNING: Task cancellation not implemented yet');
// }









// lib/journeys/scheduler.ts
import { processDueSteps } from './processor';

let isRunning = false;
let intervalId: NodeJS.Timeout | null = null;
let isShuttingDown = false;

/**
 * Start the journey processor scheduler
 * Runs every 30 seconds automatically
 * Works in development, production, and GitHub Actions
 */
export function startScheduler() {
  // Prevent multiple schedulers
  if (intervalId) {
    console.log('⚠️ [Scheduler] Already running');
    return;
  }

  // Only run in server environment (not during build)
  if (typeof window !== 'undefined') {
    console.log('⚠️ [Scheduler] Skipping in browser environment');
    return;
  }

  console.log('🚀 [Scheduler] Starting journey processor (30s interval)...');
  console.log('🌍 [Scheduler] Environment:', process.env.NODE_ENV);
  console.log('🔧 [Scheduler] Platform:', process.platform);

  // Run immediately on start
  processDueSteps()
    .then(() => console.log('✅ [Scheduler] Initial run completed'))
    .catch(err => console.error('❌ [Scheduler] Initial run failed:', err));

  // Then run every 30 seconds
  intervalId = setInterval(async () => {
    if (isShuttingDown) {
      console.log('🛑 [Scheduler] Shutdown in progress, skipping run');
      return;
    }

    if (isRunning) {
      console.log('⏭️ [Scheduler] Previous run still in progress, skipping...');
      return;
    }

    try {
      isRunning = true;
      await processDueSteps();
    } catch (error: any) {
      console.error('❌ [Scheduler] Error:', error.message);
    } finally {
      isRunning = false;
    }
  }, 30000); // 30 seconds

  console.log('✅ [Scheduler] Journey processor started successfully');
}

/**
 * Stop the scheduler (for graceful shutdown)
 */
export function stopScheduler() {
  if (intervalId) {
    isShuttingDown = true;
    clearInterval(intervalId);
    intervalId = null;
    console.log('🛑 [Scheduler] Journey processor stopped');
  }
}

// Graceful shutdown handlers
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    console.log('📡 [Scheduler] Received SIGTERM, stopping scheduler...');
    stopScheduler();
  });

  process.on('SIGINT', () => {
    console.log('📡 [Scheduler] Received SIGINT, stopping scheduler...');
    stopScheduler();
  });
}