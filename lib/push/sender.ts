// FILE: lib/push/sender.ts
// Main notification sender that handles all platforms
// ============================================================

import { sendWebPushNotification, WebPushSubscription, NotificationPayload } from './web-push';
import { sendFCMNotification } from './fcm';
import type { Database } from '@/types/database';

type Subscriber = Database['public']['Tables']['subscribers']['Row'];

export async function sendNotificationToSubscriber(
  subscriber: Subscriber,
  notification: NotificationPayload
): Promise<{ success: boolean; error?: string; platform: string }> {
  // const platform = subscriber.platform;
  const platform = subscriber.platform || 'unknown';


  try {
    // Android/iOS via FCM
    if (platform !== 'web' && subscriber.fcm_token) {
      const result = await sendFCMNotification(subscriber.fcm_token, {
        title: notification.title,
        body: notification.body,
        image: notification.image,
        url: notification.url,
      });

      return {
        ...result,
        platform: platform,
      };
    }

    // Web Push
    if (subscriber.endpoint && subscriber.p256dh_key && subscriber.auth_key) {
      const subscription: WebPushSubscription = {
        endpoint: subscriber.endpoint,
        keys: {
          p256dh: subscriber.p256dh_key,
          auth: subscriber.auth_key,
        },
      };

      const result = await sendWebPushNotification(subscription, notification);

      return {
        ...result,
        platform: 'web',
      };
    }

    return {
      success: false,
      error: 'No valid push credentials found',
      platform: platform,
    };
  } catch (error: any) {
    console.error('[Sender] Error:', error);
    return {
      success: false,
      error: error.message,
      platform: platform,
    };
  }
}