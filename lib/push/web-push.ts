// Web Push notification sender
//lib\push\web-push.ts
// ============================================================

import webpush from 'web-push';

// Configure VAPID details
webpush.setVapidDetails(
  `mailto:noreply@${new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').hostname}`,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export interface WebPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string }>;
}

export async function sendWebPushNotification(
  subscription: WebPushSubscription,
  payload: NotificationPayload
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const response = await webpush.sendNotification(
      subscription,
      JSON.stringify({
        ...payload,
        timestamp: Date.now(),
      }),
      {
        TTL: 86400, // 24 hours
        urgency: 'high',
        topic: payload.tag,
      }
    );

    return {
      success: true,
      statusCode: response.statusCode,
    };
  } catch (error: any) {
    console.error('[Web Push] Send error:', error);

    // Check for subscription expiration
    if (error.statusCode === 404 || error.statusCode === 410) {
      return {
        success: false,
        statusCode: error.statusCode,
        error: 'SUBSCRIPTION_EXPIRED',
      };
    }

    // Check for authentication failure
    if (error.statusCode === 401 || error.statusCode === 403) {
      return {
        success: false,
        statusCode: error.statusCode,
        error: 'VAPID_AUTH_FAILED',
      };
    }

    return {
      success: false,
      statusCode: error.statusCode || 0,
      error: error.message || 'Unknown error',
    };
  }
}
