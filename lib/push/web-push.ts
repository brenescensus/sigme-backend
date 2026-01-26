

// // // Web Push notification sender
// // // lib/push/web-push.ts

// // import webpush from 'web-push';

// // // current_step_id FIX: Use a short, static VAPID subject (max 32 chars)
// // // The subject should be a URL or mailto, but keep it SHORT
// // const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:push@notify.app';

// // // Validate VAPID subject length
// // if (VAPID_SUBJECT.length > 32) {
// //   console.warn(
// //     `[Web Push] VAPID subject too long (${VAPID_SUBJECT.length} chars). Using fallback.`
// //   );
// // }

// // // Configure VAPID details
// // webpush.setVapidDetails(
// //   VAPID_SUBJECT,
// //   process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
// //   process.env.VAPID_PRIVATE_KEY!
// // );

// // export interface WebPushSubscription {
// //   endpoint: string;
// //   keys: {
// //     p256dh: string;
// //     auth: string;
// //   };
// // }

// // export interface NotificationPayload {
// //   title: string;
// //   body: string;
// //   icon?: string;
// //   badge?: string;
// //   image?: string;
// //   url?: string;
// //   tag?: string;
// //   requireInteraction?: boolean;
// //   actions?: Array<{ action: string; title: string }>;
// // }

// // export async function sendWebPushNotification(
// //   subscription: WebPushSubscription,
// //   payload: NotificationPayload
// // ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
// //   try {
// //     // current_step_id FIX: Truncate topic to max 32 chars (web-push requirement)
// //     const topic = payload.tag 
// //       ? payload.tag.substring(0, 32) 
// //       : undefined;

// //     const response = await webpush.sendNotification(
// //       subscription,
// //       JSON.stringify({
// //         ...payload,
// //         timestamp: Date.now(),
// //       }),
// //       {
// //         TTL: 86400, // 24 hours
// //         urgency: 'high',
// //         topic, // current_step_id Use truncated topic
// //       }
// //     );

// //     return {
// //       success: true,
// //       statusCode: response.statusCode,
// //     };
// //   } catch (error: any) {
// //     console.error('[Web Push] Send error:', error);

// //     // Check for subscription expiration
// //     if (error.statusCode === 404 || error.statusCode === 410) {
// //       return {
// //         success: false,
// //         statusCode: error.statusCode,
// //         error: 'SUBSCRIPTION_EXPIRED',
// //       };
// //     }

// //     // Check for authentication failure
// //     if (error.statusCode === 401 || error.statusCode === 403) {
// //       return {
// //         success: false,
// //         statusCode: error.statusCode,
// //         error: 'VAPID_AUTH_FAILED',
// //       };
// //     }

// //     return {
// //       success: false,
// //       statusCode: error.statusCode || 0,
// //       error: error.message || 'Unknown error',
// //     };
// //   }
// // }

// // lib/push/web-push.ts
// // Updated to include branding in payload

// import webpush from 'web-push';

// // Configure VAPID details
// const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
// const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
// const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:noreply@yourdomain.com';

// if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
//   console.error('⚠️ VAPID keys not configured. Web push notifications will not work.');
// } else {
//   webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
// }

// export interface WebPushSubscription {
//   endpoint: string;
//   keys: {
//     p256dh: string;
//     auth: string;
//   };
// }

// export interface NotificationPayload {
//   title: string;
//   body: string;
//   icon?: string;
//   badge?: string;
//   image?: string;
//   url?: string;
//   tag?: string;
//   requireInteraction?: boolean;
//   actions?: Array<{
//     action: string;
//     title: string;
//     icon?: string;
//   }>;
//   // current_step_id Add branding to the payload interface
//   branding?: {
//     primary_color: string;
//     secondary_color: string;
//     logo_url?: string | null;
//     font_family: string;
//     button_style: 'rounded' | 'square' | 'pill';
//     notification_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
//     animation_style: 'slide' | 'fade' | 'bounce';
//     show_logo: boolean;
//     show_branding: boolean;
//   };
// }

// /**
//  * Send a web push notification
//  */
// export async function sendWebPushNotification(
//   subscription: WebPushSubscription,
//   notification: NotificationPayload
// ): Promise<{ success: boolean; error?: string }> {
//   try {
//     if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
//       throw new Error('VAPID keys not configured');
//     }

//     // ✅ Build complete payload including branding
//     const payload = JSON.stringify({
//       title: notification.title,
//       body: notification.body,
//       icon: notification.icon || '/icon-192.png',
//       badge: notification.badge || '/badge-72.png',
//       image: notification.image,
//       url: notification.url || '/',
//       tag: notification.tag || `notification-${Date.now()}`,
//       requireInteraction: notification.requireInteraction || false,
//       actions: notification.actions || [],
//       // ✅ Include branding data so service worker can use it
//       branding: notification.branding || {
//         primary_color: '#667eea',
//         secondary_color: '#764ba2',
//         logo_url: null,
//         font_family: 'Inter',
//         button_style: 'rounded',
//         notification_position: 'top-right',
//         animation_style: 'slide',
//         show_logo: true,
//         show_branding: true,
//       },
//       // ✅ Add timestamp for debugging
//       timestamp: Date.now(),
//     });

//     console.log('[Web Push] Sending notification with branding:', {
//       endpoint: subscription.endpoint.substring(0, 50) + '...',
//       title: notification.title,
//       hasBranding: !!notification.branding,
//       brandingColors: notification.branding ? 
//         `${notification.branding.primary_color} / ${notification.branding.secondary_color}` : 
//         'default',
//     });

//     await webpush.sendNotification(subscription, payload, {
//       TTL: 86400, // 24 hours
//       urgency: 'normal',
//     });

//     console.log('[Web Push] Notification sent successfully');

//     return { success: true };
//   } catch (error: any) {
//     console.error('[Web Push] Send error:', {
//       message: error.message,
//       statusCode: error.statusCode,
//       endpoint: subscription.endpoint.substring(0, 50) + '...',
//     });

//     // Handle specific error codes
//     if (error.statusCode === 410 || error.statusCode === 404) {
//       return {
//         success: false,
//         error: 'SUBSCRIPTION_EXPIRED: The push subscription has expired or is no longer valid',
//       };
//     }

//     if (error.statusCode === 401) {
//       return {
//         success: false,
//         error: 'UNAUTHORIZED: Invalid VAPID keys or subscription',
//       };
//     }

//     return {
//       success: false,
//       error: error.message || 'Failed to send web push notification',
//     };
//   }
// }

// /**
//  * Validate a web push subscription
//  */
// export function validateWebPushSubscription(subscription: any): boolean {
//   if (!subscription || typeof subscription !== 'object') {
//     return false;
//   }

//   if (!subscription.endpoint || typeof subscription.endpoint !== 'string') {
//     return false;
//   }

//   if (!subscription.keys || typeof subscription.keys !== 'object') {
//     return false;
//   }

//   if (!subscription.keys.p256dh || !subscription.keys.auth) {
//     return false;
//   }

//   return true;
// }

// lib/push/web-push.ts
// Updated to include branding in payload

import webpush from 'web-push';
import { NotificationBranding, DEFAULT_BRANDING } from '@/types/branding';

// Configure VAPID details
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:noreply@yourdomain.com';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error('⚠️ VAPID keys not configured. Web push notifications will not work.');
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
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  // ✅ Use the imported type
  branding?: NotificationBranding;
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

    // ✅ Build complete payload including branding
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192.png',
      badge: notification.badge || '/badge-72.png',
      image: notification.image,
      url: notification.url || '/',
      tag: notification.tag || `notification-${Date.now()}`,
      requireInteraction: notification.requireInteraction || false,
      actions: notification.actions || [],
      // ✅ Include branding data so service worker can use it
      branding: notification.branding || DEFAULT_BRANDING,
      // ✅ Add timestamp for debugging
      timestamp: Date.now(),
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