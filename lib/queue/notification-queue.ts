// lib/queue/notification-queue.ts
import { Queue } from 'bullmq';
import { redisConnection } from './config';

export interface NotificationJobData {
  scheduledStepId: string;
  journeyStateId: string;
  stepType: string;
  executeAt: string;
}

let notificationQueue: Queue<NotificationJobData> | null = null;

export function getNotificationQueue(): Queue<NotificationJobData> {
  if (!notificationQueue) {
    notificationQueue = new Queue<NotificationJobData>('journey-notifications', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 1000,
        },
        removeOnComplete: {
          age: 86400, // 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 7200, // 48 hours
        },
        
      },
    });
  }
  
  return notificationQueue;
}