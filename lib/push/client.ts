// //  lib/push/client.ts
// // Client-side push notification subscription handler

// /**
//  * Convert VAPID key from base64 to Uint8Array
//  */
// function urlBase64ToUint8Array(base64String: string): BufferSource {
//   const padding = '='.repeat((4 - base64String.length % 4) % 4);
//   const base64 = (base64String + padding)
//     .replace(/\-/g, '+')
//     .replace(/_/g, '/');
  
//   const rawData = window.atob(base64);
//   const buffer = new ArrayBuffer(rawData.length);
//   const outputArray = new Uint8Array(buffer);
  
//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
  
//   return outputArray;
// }

// /**
//  * Get browser and OS information
//  */
// function getBrowserInfo() {
//   const ua = navigator.userAgent;
  
//   let browser = 'Unknown';
//   if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
//   else if (ua.includes('Firefox')) browser = 'Firefox';
//   else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
//   else if (ua.includes('Edge')) browser = 'Edge';
  
//   let os = 'Unknown';
//   if (ua.includes('Windows')) os = 'Windows';
//   else if (ua.includes('Mac')) os = 'macOS';
//   else if (ua.includes('Linux')) os = 'Linux';
//   else if (ua.includes('Android')) os = 'Android';
//   else if (ua.includes('iOS')) os = 'iOS';
  
//   return { browser, os };
// }

// /**
//  * Get device type
//  */
// function getDeviceType(): string {
//   const ua = navigator.userAgent;
//   if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
//     return 'tablet';
//   }
//   if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
//     return 'mobile';
//   }
//   return 'desktop';
// }

// /**
//  * Register service worker
//  */
// async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
//   if (!('serviceWorker' in navigator)) {
//     throw new Error('Service Worker not supported in this browser');
//   }

//   try {
//     // Check if service worker is already registered
//     const existingRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
    
//     if (existingRegistration) {
//       await navigator.serviceWorker.ready;
//       return existingRegistration;
//     }

//     // Register new service worker
//     const registration = await navigator.serviceWorker.register('/sw.js', {
//       scope: '/',
//     });
    
//     console.log('[Push Client] Service Worker registered successfully');
    
//     // Wait for service worker to be ready
//     await navigator.serviceWorker.ready;
    
//     return registration;
//   } catch (error) {
//     console.error('[Push Client] Service Worker registration failed:', error);
//     throw new Error('Failed to register Service Worker');
//   }
// }

// /**
//  * Request notification permission
//  */
// async function requestNotificationPermission(): Promise<NotificationPermission> {
//   if (!('Notification' in window)) {
//     throw new Error('Notifications not supported in this browser');
//   }

//   // Check current permission
//   if (Notification.permission === 'granted') {
//     return 'granted';
//   }

//   if (Notification.permission === 'denied') {
//     throw new Error('Notification permission denied. Please enable notifications in your browser settings.');
//   }

//   // Request permission
//   const permission = await Notification.requestPermission();
  
//   if (permission !== 'granted') {
//     throw new Error('Notification permission not granted');
//   }

//   console.log('[Push Client] Notification permission granted');
//   return permission;
// }

// /**
//  * Subscribe to push notifications
//  */
// export async function subscribeToPushNotifications(
//   websiteId: string,
//   options: {
//     apiEndpoint?: string;
//     vapidPublicKey?: string;
//   } = {}
// ): Promise<{ success: boolean; subscriber?: any; error?: string }> {
//   try {
//     console.log('[Push Client] Starting subscription process...');

//     // Get VAPID public key from options or environment
//     const vapidPublicKey = options.vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    
//     if (!vapidPublicKey) {
//       throw new Error('VAPID public key not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable.');
//     }

//     // Request notification permission
//     await requestNotificationPermission();

//     // Register service worker
//     const registration = await registerServiceWorker();

//     // Check for existing subscription
//     let subscription = await registration.pushManager.getSubscription();

//     // If subscription exists, unsubscribe first to get fresh keys
//     if (subscription) {
//       console.log('[Push Client] Existing subscription found, refreshing...');
//       await subscription.unsubscribe();
//     }

//     // Create new subscription with VAPID key
//     console.log('[Push Client] Creating new push subscription...');
//     subscription = await registration.pushManager.subscribe({
//       userVisibleOnly: true,
//       applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
//     });

//     // Get subscription details
//     const subscriptionJson = subscription.toJSON();
    
//     if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
//       throw new Error('Invalid subscription format - missing required fields');
//     }

//     const { browser, os } = getBrowserInfo();
//     const deviceType = getDeviceType();

//     console.log('[Push Client] Subscription created:', {
//       endpoint: subscriptionJson.endpoint.substring(0, 50) + '...',
//       browser,
//       os,
//       deviceType,
//     });

//     // Send to backend
//     const apiEndpoint = options.apiEndpoint || '/api/subscribers/register';
//     console.log('[Push Client] Registering with backend:', apiEndpoint);

//     const response = await fetch(apiEndpoint, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         websiteId,
//         subscription: subscriptionJson,
//         platform: 'web',
//         browser,
//         os,
//         deviceType,
//       }),
//     });

//     if (!response.ok) {
//       const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
//       throw new Error(errorData.error || `Server error: ${response.status}`);
//     }

//     const result = await response.json();
    
//     console.log('[Push Client] Successfully registered with backend');

//     return {
//       success: true,
//       subscriber: result.subscriber,
//     };

//   } catch (error: any) {
//     console.error('[Push Client] Subscription error:', error);
//     return {
//       success: false,
//       error: error.message || 'Failed to subscribe to push notifications',
//     };
//   }
// }

// /**
//  * Unsubscribe from push notifications
//  */
// export async function unsubscribeFromPushNotifications(
//   websiteId: string,
//   options: {
//     apiEndpoint?: string;
//   } = {}
// ): Promise<{ success: boolean; error?: string }> {
//   try {
//     console.log('[Push Client] Starting unsubscribe process...');

//     if (!('serviceWorker' in navigator)) {
//       throw new Error('Service Worker not supported in this browser');
//     }

//     const registration = await navigator.serviceWorker.ready;
//     const subscription = await registration.pushManager.getSubscription();

//     if (!subscription) {
//       console.log('[Push Client] No active subscription found');
//       return { success: true }; // Already unsubscribed
//     }

//     const subscriptionJson = subscription.toJSON();

//     // Unsubscribe from browser
//     await subscription.unsubscribe();
//     console.log('[Push Client] Unsubscribed from browser push manager');

//     // Notify backend
//     const apiEndpoint = options.apiEndpoint || '/api/subscribers/register';
    
//     try {
//       await fetch(apiEndpoint, {
//         method: 'DELETE',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           websiteId,
//           endpoint: subscriptionJson.endpoint,
//         }),
//       });
//       console.log('[Push Client] Notified backend of unsubscription');
//     } catch (error) {
//       console.warn('[Push Client] Failed to notify backend, but local unsubscription successful');
//     }

//     return { success: true };

//   } catch (error: any) {
//     console.error('[Push Client] Unsubscribe error:', error);
//     return {
//       success: false,
//       error: error.message || 'Failed to unsubscribe from push notifications',
//     };
//   }
// }

// /**
//  * Check if user is currently subscribed
//  */
// export async function isSubscribed(): Promise<boolean> {
//   try {
//     if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
//       return false;
//     }

//     const registration = await navigator.serviceWorker.ready;
//     const subscription = await registration.pushManager.getSubscription();

//     return subscription !== null;
//   } catch (error) {
//     console.error('[Push Client] Check subscription error:', error);
//     return false;
//   }
// }

// /**
//  * Get current push subscription
//  */
// export async function getCurrentSubscription(): Promise<PushSubscription | null> {
//   try {
//     if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
//       return null;
//     }

//     const registration = await navigator.serviceWorker.ready;
//     return await registration.pushManager.getSubscription();
//   } catch (error) {
//     console.error('[Push Client] Get subscription error:', error);
//     return null;
//   }
// }

// /**
//  * Check if push notifications are supported
//  */
// export function isPushSupported(): boolean {
//   return (
//     'serviceWorker' in navigator &&
//     'PushManager' in window &&
//     'Notification' in window
//   );
// }

// /**
//  * Get current notification permission status
//  */
// export function getNotificationPermission(): NotificationPermission {
//   if (!('Notification' in window)) {
//     return 'denied';
//   }
//   return Notification.permission;
// }

// lib/push/client.ts
// Client-side push notification subscription handler with JWT authentication

import { createClient } from '@/lib/supabase/client';

/**
 * Get the current auth token
 */
async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  
  return outputArray;
}

/**
 * Get browser and OS information
 */
function getBrowserInfo() {
  const ua = navigator.userAgent;
  
  let browser = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS')) os = 'iOS';
  
  return { browser, os };
}

/**
 * Get device type
 */
function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

/**
 * Register service worker
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service Worker not supported in this browser');
  }

  try {
    // Check if service worker is already registered
    const existingRegistration = await navigator.serviceWorker.getRegistration('/sw.js');
    
    if (existingRegistration) {
      await navigator.serviceWorker.ready;
      return existingRegistration;
    }

    // Register new service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    
    console.log('[Push Client] Service Worker registered successfully');
    
    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;
    
    return registration;
  } catch (error) {
    console.error('[Push Client] Service Worker registration failed:', error);
    throw new Error('Failed to register Service Worker');
  }
}

/**
 * Request notification permission
 */
async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    throw new Error('Notifications not supported in this browser');
  }

  // Check current permission
  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    throw new Error('Notification permission denied. Please enable notifications in your browser settings.');
  }

  // Request permission
  const permission = await Notification.requestPermission();
  
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted');
  }

  console.log('[Push Client] Notification permission granted');
  return permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  websiteId: string,
  options: {
    apiEndpoint?: string;
    vapidPublicKey?: string;
  } = {}
): Promise<{ success: boolean; subscriber?: any; error?: string }> {
  try {
    console.log('[Push Client] Starting subscription process...');

    //  Check authentication first
    const token = await getAuthToken();
    if (!token) {
      throw new Error('Not authenticated. Please sign in to subscribe to notifications.');
    }

    // Get VAPID public key from options or environment
    const vapidPublicKey = options.vapidPublicKey || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not configured. Please set NEXT_PUBLIC_VAPID_PUBLIC_KEY environment variable.');
    }

    // Request notification permission
    await requestNotificationPermission();

    // Register service worker
    const registration = await registerServiceWorker();

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    // If subscription exists, unsubscribe first to get fresh keys
    if (subscription) {
      console.log('[Push Client] Existing subscription found, refreshing...');
      await subscription.unsubscribe();
    }

    // Create new subscription with VAPID key
    console.log('[Push Client] Creating new push subscription...');
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    // Get subscription details
    const subscriptionJson = subscription.toJSON();
    
    if (!subscriptionJson.endpoint || !subscriptionJson.keys?.p256dh || !subscriptionJson.keys?.auth) {
      throw new Error('Invalid subscription format - missing required fields');
    }

    const { browser, os } = getBrowserInfo();
    const deviceType = getDeviceType();

    console.log('[Push Client] Subscription created:', {
      endpoint: subscriptionJson.endpoint.substring(0, 50) + '...',
      browser,
      os,
      deviceType,
    });

    //  Send to backend with JWT token
    const apiEndpoint = options.apiEndpoint || '/api/subscribers/register';
    console.log('[Push Client] Registering with backend:', apiEndpoint);

    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`, //  Include JWT token
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        websiteId,
        subscription: subscriptionJson,
        platform: 'web',
        browser,
        os,
        deviceType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('[Push Client] Successfully registered with backend');

    return {
      success: true,
      subscriber: result.subscriber,
    };

  } catch (error: any) {
    console.error('[Push Client] Subscription error:', error);
    return {
      success: false,
      error: error.message || 'Failed to subscribe to push notifications',
    };
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(
  websiteId: string,
  options: {
    apiEndpoint?: string;
  } = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[Push Client] Starting unsubscribe process...');

    //  Get auth token
    const token = await getAuthToken();
    if (!token) {
      console.warn('[Push Client] Not authenticated, continuing with unsubscribe...');
    }

    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported in this browser');
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('[Push Client] No active subscription found');
      return { success: true }; // Already unsubscribed
    }

    const subscriptionJson = subscription.toJSON();

    // Unsubscribe from browser
    await subscription.unsubscribe();
    console.log('[Push Client] Unsubscribed from browser push manager');

    //  Notify backend with JWT token (if authenticated)
    if (token) {
      const apiEndpoint = options.apiEndpoint || '/api/subscribers/register';
      
      try {
        await fetch(apiEndpoint, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`, //  Include JWT token
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            websiteId,
            endpoint: subscriptionJson.endpoint,
          }),
        });
        console.log('[Push Client] Notified backend of unsubscription');
      } catch (error) {
        console.warn('[Push Client] Failed to notify backend, but local unsubscription successful');
      }
    }

    return { success: true };

  } catch (error: any) {
    console.error('[Push Client] Unsubscribe error:', error);
    return {
      success: false,
      error: error.message || 'Failed to unsubscribe from push notifications',
    };
  }
}

/**
 * Check if user is currently subscribed
 */
export async function isSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return subscription !== null;
  } catch (error) {
    console.error('[Push Client] Check subscription error:', error);
    return false;
  }
}

/**
 * Get current push subscription
 */
export async function getCurrentSubscription(): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('[Push Client] Get subscription error:', error);
    return null;
  }
}

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}