

// lib/push/web-push.ts
// Updated to include branding in payload

import webpush from 'web-push';
import { NotificationBranding, DEFAULT_BRANDING } from '@/types/branding';

// Configure VAPID details
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:noreply@yourdomain.com';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error(' VAPID keys not configured. Web push notifications will not work.');
} else {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

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
  click_url?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  //  Use the imported type
  branding?: NotificationBranding;
  subscriber_id?: string | null;
  notification_id?: string | null;
  journey_id?: string | null;
  campaign_id?: string | null;
  data?: {
    url?: string;
    click_url?: string;
    subscriber_id?: string | null;
    notification_id?: string | null;
    journey_id?: string | null;
    campaign_id?: string | null;
  };
}

/**
 * Send a web push notification
 */
export async function sendWebPushNotification(
  subscription: WebPushSubscription,
  notification: NotificationPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      throw new Error('VAPID keys not configured');
    }

    //  Build complete payload including branding
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192.png',
      badge: notification.badge || '/badge-72.png',
      image: notification.image,
      url: notification.url || '/',
      click_url: notification.url || '/',
      tag: notification.tag || `notification-${Date.now()}`,
      requireInteraction: notification.requireInteraction || false,
      actions: notification.actions || [],
      //  Include branding data so service worker can use it
      branding: notification.branding || DEFAULT_BRANDING,
      //  Add timestamp for debugging
      timestamp: Date.now(),

      // CRITICAL: Pass through ALL tracking data
  subscriber_id: (notification as any).subscriber_id,
  notification_id: (notification as any).notification_id,
  journey_id: (notification as any).journey_id,
  campaign_id: (notification as any).campaign_id,
  data: {
    url: notification.url || '/',
    click_url: notification.url || '/',
    subscriber_id: (notification as any).subscriber_id,
    notification_id: (notification as any).notification_id,
    journey_id: (notification as any).journey_id,
    campaign_id: (notification as any).campaign_id,
  },
    });

    console.log('[Web Push] Sending notification with branding:', {
      endpoint: subscription.endpoint.substring(0, 50) + '...',
      title: notification.title,
      hasBranding: !!notification.branding,
      brandingColors: notification.branding ? 
        `${notification.branding.primary_color} / ${notification.branding.secondary_color}` : 
        'default',
    });

    await webpush.sendNotification(subscription, payload, {
      TTL: 86400, // 24 hours
      urgency: 'normal',
    });

    console.log('[Web Push] Notification sent successfully');

    return { success: true };
  } catch (error: any) {
    console.error('[Web Push] Send error:', {
      message: error.message,
      statusCode: error.statusCode,
      endpoint: subscription.endpoint.substring(0, 50) + '...',
    });

    // Handle specific error codes
    if (error.statusCode === 410 || error.statusCode === 404) {
      return {
        success: false,
        error: 'SUBSCRIPTION_EXPIRED: The push subscription has expired or is no longer valid',
      };
    }

    if (error.statusCode === 401) {
      return {
        success: false,
        error: 'UNAUTHORIZED: Invalid VAPID keys or subscription',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to send web push notification',
    };
  }
}

/**
 * Validate a web push subscription
 */
export function validateWebPushSubscription(subscription: any): boolean {
  if (!subscription || typeof subscription !== 'object') {
    return false;
  }

  if (!subscription.endpoint || typeof subscription.endpoint !== 'string') {
    return false;
  }

  if (!subscription.keys || typeof subscription.keys !== 'object') {
    return false;
  }

  if (!subscription.keys.p256dh || !subscription.keys.auth) {
    return false;
  }

  return true;
}


// Add this to your existing lib/push/web-push.ts

/**
 * Legacy sendNotification function for backward compatibility
 * Wraps the new sendWebPushNotification with simpler parameters
 */
export async function sendNotification(
  endpoint: string,
  p256dh: string,
  auth: string,
  notificationData: {
    title: string;
    body: string;
    icon?: string;
    url?: string;
  },
  websiteId: string
): Promise<void> {
  const subscription: WebPushSubscription = {
    endpoint,
    keys: {
      p256dh,
      auth,
    },
  };

  const payload: NotificationPayload = {
    title: notificationData.title,
    body: notificationData.body,
    icon: notificationData.icon,
    url: notificationData.url,
  };

  const result = await sendWebPushNotification(subscription, payload);
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to send notification');
  }
}