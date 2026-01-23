// ============================================
// FILE: BACKEND/public/sigme-sw-core.js
// Core Service Worker Logic (imported by client proxies)
// ============================================

console.log('[Sigme SW Core] Loading...');

// Global config store
let websiteConfig = null;

// Install event
self.addEventListener('install', (event) => {
  console.log('[Sigme SW Core] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Sigme SW Core] Activating...');
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the client
self.addEventListener('message', async (event) => {
  const { type, config } = event.data;

  if (type === 'SIGME_INIT') {
    console.log('[Sigme SW Core] Received configuration:', config);
    websiteConfig = config;
  }

  if (type === 'SIGME_SUBSCRIBE') {
    console.log('[Sigme SW Core] Subscribe request');
    await handleSubscribe(event);
  }
});

// Handle subscription
async function handleSubscribe(event) {
  try {
    if (!websiteConfig) {
      throw new Error('Configuration not loaded');
    }

    // Get VAPID public key from config
    const vapidPublicKey = websiteConfig.vapidPublicKey;
    
    if (!vapidPublicKey) {
      throw new Error('VAPID public key not found in configuration');
    }

    // Subscribe to push notifications
    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    console.log('[Sigme SW Core] Subscription obtained');

    // Extract keys from subscription
    const subscriptionJSON = subscription.toJSON();
    const endpoint = subscriptionJSON.endpoint;
    const keys = subscriptionJSON.keys || {};
    
    const p256dh = keys.p256dh;
    const auth = keys.auth;

    if (!endpoint || !p256dh || !auth) {
      throw new Error('Invalid subscription format - missing keys');
    }

    // Detect browser and platform info
    const userAgent = self.navigator.userAgent || '';
    let browser = 'Unknown';
    let os = 'Unknown';

    // Browser detection
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    // OS detection
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    // Get API URL from config
    const apiUrl = websiteConfig.apiUrl || 'https://sigme-backend-fkde.vercel.app';
    
    console.log('[Sigme SW Core] Registering with API:', apiUrl);

    // Register with backend
    const response = await fetch(`${apiUrl}/api/subscribers/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        websiteId: websiteConfig.websiteId,
        endpoint: endpoint,
        p256dh: p256dh,
        auth: auth,
        platform: 'web',
        browser: browser,
        os: os
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Sigme SW Core] API Error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Registration failed');
    }

    console.log('[Sigme SW Core] Registration successful:', result);

    // Notify client of success
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SIGME_SUBSCRIBED',
        success: true,
        data: result
      });
    });

  } catch (error) {
    console.error('[Sigme SW Core] Registration failed:', error.message);

    // Notify client of failure
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SIGME_SUBSCRIBED',
        success: false,
        error: error.message
      });
    });
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('[Sigme SW Core] Push received');

  let notification = {
    title: 'New Notification',
    body: 'You have a new message',
    icon: '/icon.png',
    badge: '/badge.png',
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notification = {
        title: data.title || notification.title,
        body: data.body || notification.body,
        icon: data.icon || notification.icon,
        badge: data.badge || notification.badge,
        image: data.image,
        tag: data.tag,
        data: data.data || {},
      };
    } catch (e) {
      console.error('[Sigme SW Core] Failed to parse push data:', e);
    }
  }

  const options = {
    body: notification.body,
    icon: notification.icon,
    badge: notification.badge,
    image: notification.image,
    tag: notification.tag,
    data: notification.data,
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(notification.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[Sigme SW Core] Notification clicked');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

console.log('[Sigme SW Core] Ready');