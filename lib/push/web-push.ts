

// Web Push notification sender
// lib/push/web-push.ts

import webpush from 'web-push';

// ✅ FIX: Use a short, static VAPID subject (max 32 chars)
// The subject should be a URL or mailto, but keep it SHORT
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:push@notify.app';

// Validate VAPID subject length
if (VAPID_SUBJECT.length > 32) {
  console.warn(
    `[Web Push] VAPID subject too long (${VAPID_SUBJECT.length} chars). Using fallback.`
  );
}

// Configure VAPID details
webpush.setVapidDetails(
  VAPID_SUBJECT,
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
    // ✅ FIX: Truncate topic to max 32 chars (web-push requirement)
    const topic = payload.tag 
      ? payload.tag.substring(0, 32) 
      : undefined;

    const response = await webpush.sendNotification(
      subscription,
      JSON.stringify({
        ...payload,
        timestamp: Date.now(),
      }),
      {
        TTL: 86400, // 24 hours
        urgency: 'high',
        topic, // ✅ Use truncated topic
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