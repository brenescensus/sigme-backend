// lib/push/sender.ts

import { sendWebPushNotification, WebPushSubscription, NotificationPayload } from './web-push';
import { sendFCMNotification } from './fcm';
import type { Database } from '@/types/database';

type Subscriber = Database['public']['Tables']['subscribers']['Row'];

/**
 * Validate that a string is valid URL-safe Base64
 */
function isValidBase64(str: string): boolean {
  // URL-safe Base64 alphabet (RFC 4648)
  const base64UrlSafeRegex = /^[A-Za-z0-9_-]*$/;
  return base64UrlSafeRegex.test(str);
}

/**
 * Convert URL-safe Base64 to standard Base64
 */
function urlSafeBase64ToBase64(str: string): string {
  // Replace URL-safe characters with standard Base64 characters
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  
  return base64;
}

/**
 * Validate and normalize web push subscription keys
 */
function validateAndNormalizeKeys(p256dh: string, auth: string): {
  valid: boolean;
  normalized?: { p256dh: string; auth: string };
  error?: string;
} {
  try {
    // Check if keys are valid Base64 (URL-safe or standard)
    if (!isValidBase64(p256dh)) {
      return {
        valid: false,
        error: 'p256dh key contains invalid characters (not Base64 URL-safe)'
      };
    }

    if (!isValidBase64(auth)) {
      return {
        valid: false,
        error: 'auth key contains invalid characters (not Base64 URL-safe)'
      };
    }

    // Convert to standard Base64 if needed
    const normalizedP256dh = urlSafeBase64ToBase64(p256dh);
    const normalizedAuth = urlSafeBase64ToBase64(auth);

    // Validate the decoded lengths
    const p256dhBuffer = Buffer.from(normalizedP256dh, 'base64');
    const authBuffer = Buffer.from(normalizedAuth, 'base64');

    if (p256dhBuffer.length !== 65) {
      return {
        valid: false,
        error: `Invalid p256dh key length: ${p256dhBuffer.length} bytes (expected 65)`
      };
    }

    if (authBuffer.length !== 16) {
      return {
        valid: false,
        error: `Invalid auth key length: ${authBuffer.length} bytes (expected 16)`
      };
    }

    return {
      valid: true,
      normalized: {
        p256dh: normalizedP256dh,
        auth: normalizedAuth,
      }
    };
  } catch (error: any) {
    return {
      valid: false,
      error: `Base64 decoding error: ${error.message}`
    };
  }
}

/**
 * Send notification to a single subscriber
 */
export async function sendNotificationToSubscriber(
  subscriber: Subscriber,
  notification: NotificationPayload
): Promise<{ success: boolean; error?: string; platform: string }> {
  const platform = subscriber.platform || 'unknown';

  try {
    // Priority 1: Mobile platforms with FCM token
    if ((platform === 'android' || platform === 'ios') && subscriber.fcm_token) {
      console.log(`[Sender] Sending FCM notification to subscriber ${subscriber.id} (${platform})`);
      
      const result = await sendFCMNotification(subscriber.fcm_token, {
        title: notification.title,
        body: notification.body,
        image: notification.image,
        url: notification.url,
      });

      return {
        ...result,
        platform,
      };
    }

    // Priority 2: Web platform with web push credentials
    if (platform === 'web' && subscriber.endpoint && subscriber.p256dh_key && subscriber.auth_key) {
      console.log(`[Sender] Sending web push notification to subscriber ${subscriber.id}`);

      // Validate and normalize keys
      const validation = validateAndNormalizeKeys(subscriber.p256dh_key, subscriber.auth_key);
      
      if (!validation.valid) {
        console.error(`[Sender] Invalid web push keys for subscriber ${subscriber.id}:`, validation.error);
        return {
          success: false,
          error: validation.error || 'Invalid subscription keys',
          platform: 'web',
        };
      }

      // Use normalized keys
      const subscription: WebPushSubscription = {
        endpoint: subscriber.endpoint,
        keys: {
          p256dh: validation.normalized!.p256dh,
          auth: validation.normalized!.auth,
        },
      };

      const result = await sendWebPushNotification(subscription, notification);

      return {
        ...result,
        platform: 'web',
      };
    }

    // Fallback: Try FCM if token exists
    if (subscriber.fcm_token) {
      console.log(`[Sender] Fallback to FCM for subscriber ${subscriber.id}`);
      
      const result = await sendFCMNotification(subscriber.fcm_token, {
        title: notification.title,
        body: notification.body,
        image: notification.image,
        url: notification.url,
      });

      return {
        ...result,
        platform: platform || 'fcm',
      };
    }

    // Fallback: Try web push if credentials exist
    if (subscriber.endpoint && subscriber.p256dh_key && subscriber.auth_key) {
      console.log(`[Sender] Fallback to web push for subscriber ${subscriber.id}`);

      // Validate and normalize keys
      const validation = validateAndNormalizeKeys(subscriber.p256dh_key, subscriber.auth_key);
      
      if (!validation.valid) {
        console.error(`[Sender] Invalid web push keys:`, validation.error);
        return {
          success: false,
          error: validation.error || 'Invalid subscription keys',
          platform,
        };
      }

      const subscription: WebPushSubscription = {
        endpoint: subscriber.endpoint,
        keys: {
          p256dh: validation.normalized!.p256dh,
          auth: validation.normalized!.auth,
        },
      };

      const result = await sendWebPushNotification(subscription, notification);

      return {
        ...result,
        platform: platform || 'web',
      };
    }

    // No valid credentials found
    console.error(`[Sender] No valid push credentials for subscriber ${subscriber.id}`);
    return {
      success: false,
      error: 'No valid push credentials found',
      platform,
    };

  } catch (error: any) {
    console.error(`[Sender] Error sending to subscriber ${subscriber.id}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      platform,
    };
  }
}

/**
 * Send notification to multiple subscribers in batches
 */
export async function sendBatchNotifications(
  subscribers: Subscriber[],
  notification: NotificationPayload,
  batchSize: number = 50
): Promise<{
  sent: number;
  failed: number;
  total: number;
  errors: Array<{ subscriberId: string; error: string; platform: string }>;
  expiredSubscriptions: string[];
}> {
  let sent = 0;
  let failed = 0;
  const errors: Array<{ subscriberId: string; error: string; platform: string }> = [];
  const expiredSubscriptions: string[] = [];

  console.log(`[Sender] Sending to ${subscribers.length} subscribers in batches of ${batchSize}`);

  for (let i = 0; i < subscribers.length; i += batchSize) {
    const batch = subscribers.slice(i, i + batchSize);
    console.log(`[Sender] Processing batch ${Math.floor(i / batchSize) + 1} (${batch.length} subscribers)`);

    const results = await Promise.allSettled(
      batch.map(sub => sendNotificationToSubscriber(sub, notification))
    );

    results.forEach((result, index) => {
      const subscriber = batch[index];

      if (result.status === 'fulfilled' && result.value.success) {
        sent++;
      } else {
        failed++;
        const error = result.status === 'rejected'
          ? result.reason?.message || 'Unknown error'
          : result.value.error || 'Unknown error';

        const platform = result.status === 'fulfilled' 
          ? result.value.platform
          : subscriber.platform || 'unknown';

        errors.push({
          subscriberId: subscriber.id,
          error,
          platform,
        });

        // Track expired subscriptions
        if (error.includes('SUBSCRIPTION_EXPIRED') || error.includes('410') || error.includes('404')) {
          expiredSubscriptions.push(subscriber.id);
        }
      }
    });
  }

  console.log(`[Sender] Batch complete: ${sent} sent, ${failed} failed, ${expiredSubscriptions.length} expired`);

  return {
    sent,
    failed,
    total: subscribers.length,
    errors,
    expiredSubscriptions,
  };
}