// ============================================
// BACKEND/public/sigme-sw-core.js

// ============================================

console.log('[Sigme SW Core] Loading...');

// ============================================
// GLOBAL STATE
// ============================================
let websiteConfig = null;

// ============================================
// LIFECYCLE EVENTS
// ============================================

// Install event
self.addEventListener('install', (event) => {
  console.log('[Sigme SW Core] Installing...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[Sigme SW Core] Activating...');
  event.waitUntil(
    (async () => {
      await self.clients.claim();

      // Load config from IndexedDB on activation
      try {
        const db = await openConfigDB();
        const config = await loadConfig(db);
        if (config) {
          websiteConfig = config;
          console.log('[Sigme SW Core] Config loaded......', {
            apiUrl: config.apiUrl,
            websiteId: config.websiteId
          });
        } else {
          console.warn('[Sigme SW Core]  No config found');
        }
      } catch (err) {
        console.warn('[Sigme SW Core]  Could not load config', err);
      }
    })()
  );
});

// ============================================
// MESSAGE HANDLING
// ============================================

// Listen for messages from the client
self.addEventListener('message', async (event) => {
  const { type, config } = event.data;

  if (type === 'SIGME_INIT') {
    websiteConfig = config;

    // Store config in IndexedDB for persistence
    try {
      const db = await openConfigDB();
      await saveConfig(db, config);
      console.log('[Sigme SW Core] Config saved....');
    } catch (err) {
      console.warn('[Sigme SW Core] Could not save config', err);
    }
  }

  if (type === 'SIGME_SUBSCRIBE') {
    console.log('[Sigme SW Core] Subscribe request received');
    await handleSubscribe(event);
  }
});

// ============================================
// INDEXEDDB HELPERS (Config Persistence)
// ============================================

function openConfigDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('SigmeConfig', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config');
      }
    };
  });
}

function saveConfig(db, config) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['config'], 'readwrite');
    const store = transaction.objectStore('config');
    const request = store.put(config, 'websiteConfig');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

function loadConfig(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['config'], 'readonly');
    const store = transaction.objectStore('config');
    const request = store.get('websiteConfig');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Load config from IndexedDB if not in memory
async function getConfig() {
  if (websiteConfig) {
    return websiteConfig;
  }

  try {
    const db = await openConfigDB();
    const config = await loadConfig(db);
    if (config) {
      websiteConfig = config;
      return config;
    }
  } catch (err) {
    console.warn('[Sigme SW Core] Could not load config ', err);
  }

  return null;
}

// Get API URL - with fallback to current origin
function getApiUrl() {
  // CRITICAL: Always use configured apiUrl first (set during SIGME_INIT)
  if (websiteConfig && websiteConfig.apiUrl) {
    return websiteConfig.apiUrl;
  }

  // Fallback: Development default (should never reach here in production)
  return 'http://localhost:3000'; // Development fallback
}

// ============================================
// SUBSCRIPTION HANDLING
// ============================================

async function handleSubscribe(event) {
  try {
    const config = await getConfig();

    if (!config) {
      throw new Error('Configuration not loaded');
    }

    const vapidPublicKey = config.vapidPublicKey;

    if (!vapidPublicKey) {
      throw new Error('VAPID public key not found in configuration');
    }

    console.log('[Sigme SW Core] Subscribing...');

    const subscription = await self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    console.log('[Sigme SW Core] Subscription obtained');

    const subscriptionJSON = subscription.toJSON();
    const endpoint = subscriptionJSON.endpoint;
    const keys = subscriptionJSON.keys || {};

    const p256dh = keys.p256dh;
    const auth = keys.auth;

    if (!endpoint || !p256dh || !auth) {
      throw new Error('Invalid subscription format - missing keys');
    }

    // Detect browser and OS
    const userAgent = self.navigator.userAgent || '';
    let browser = 'Unknown';
    let os = 'Unknown';

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    const apiUrl = getApiUrl();

    console.log('[Sigme SW Core] Registering......:', apiUrl);

    const response = await fetch(`${apiUrl}/api/subscribers/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        websiteId: config.websiteId,
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
      // console.error('[Sigme SW Core] API Error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Registration failed');
    }

    console.log('[Sigme SW Core] Registration successful......', result);

    // Notify all clients
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

// ============================================
// PUSH NOTIFICATION HANDLING
// ============================================

self.addEventListener('push', (event) => {
  console.log('[Sigme SW Core] Push received');

  let notification = {
    title: 'New Notification',
    body: 'You have a new message',
    icon: '/icon.png',
    badge: '/badge.png',
    url: '/',          
    click_url: '/',
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      // console.log('[Sigme SW Core] Push data:', data);

      // if (data.data) {
      //   console.log('[Sigme SW Core] Subscriber exists.....');
      //   // console.log('[Sigme SW Core]   - subscriber_id:', data.data.subscriber_id);
      //   // console.log('[Sigme SW Core]   - campaign_id:', data.data.campaign_id);
      //   // console.log('[Sigme SW Core]   - notification_id:', data.data.notification_id);
      // } else {
      //   console.error('[Sigme SW Core] NO DATA IN PUSH!');
      // }

      // notification = {
      //   title: data.title || notification.title,
      //   body: data.body || notification.body,
      //   icon: data.icon || notification.icon,
      //   badge: data.badge || notification.badge,
      //   image: data.image,
      //   tag: data.tag,
      //   data: data.data || {},
      // };

console.log("Notification received");
      // console.log('[Sigme SW Core] Push data received:', {
      //   hasTitle: !!data.title,
      //   hasBody: !!data.body,
      //   hasUrl: !!(data.url || data.click_url),
      //   hasTag: !!data.tag
      // });

       const targetUrl = 
        data.url ||                    
        data.click_url ||              
        data.data?.url ||              
        data.data?.click_url ||        
        '/';
      // FIX: Build data object from ALL possible sources
      const notificationData = {
        url:  targetUrl,
        click_url:  targetUrl,
        subscriber_id: data.subscriber_id || data.data?.subscriber_id,
        campaign_id: data.campaign_id || data.data?.campaign_id,
        journey_id: data.journey_id || data.data?.journey_id,
        notification_id: data.notification_id || data.tag || data.data?.notification_id,
      };

      // Log what we extracted (helpful for debugging)
      // console.log('[Sigme SW Core]  Extracted data:', {
      //   subscriber_id: notificationData.subscriber_id ? 'present' : 'missing',
      //   campaign_id: notificationData.campaign_id ? 'present' : 'missing',
      //   journey_id: notificationData.journey_id ? 'present' : 'missing',
      //   notification_id: notificationData.notification_id ? 'present' : 'missing',
      // });

      notification = {
        title: data.title || notification.title,
        body: data.body || notification.body,
        icon: data.icon || notification.icon,
        badge: data.badge || notification.badge,
        image: data.image,
        url: targetUrl,              
        click_url: targetUrl, 
        tag: data.tag || `notif-${Date.now()}`,
        data: notificationData, 
      };

      // console.log('[Sigme SW Core]  Final notification object:', {
      //   url: notification.url,
      //   click_url: notification.click_url,
      //   dataUrl: notification.data.url,
      //   dataClickUrl: notification.data.click_url,
      // });

      // console.log('[Sigme SW Core] Notification data:', notification.data);
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

   if (notification.url) {
    options.data = options.data || {};
    options.data.url = notification.url;
    options.data.click_url = notification.url;
  }
  // Just show the notification - delivery already tracked server-side
  const showNotificationPromise = self.registration.showNotification(notification.title, options)
    .then(() => {
      // console.log('[Sigme SW Core] Notification shown successfully');
    })
    .catch((error) => {
      console.error('[Sigme SW Core] Error showing notification:', error);
    });

  event.waitUntil(showNotificationPromise);
});

// ============================================
// FIXED: NOTIFICATION CLICK HANDLING
// ============================================

self.addEventListener('notificationclick', (event) => {

  event.notification.close();

  const notificationData = event.notification.data || {};
  let urlToOpen =
    notificationData.url ||
    notificationData.click_url ||
    event.notification.url ||
    event.notification.click_url ||
    '/';
  // let urlToOpen = notificationData.url || notificationData.click_url || '/';
  console.log('[Sigme SW Core]  Raw URL:', urlToOpen);

  // Ensure absolute URL
  if (!urlToOpen.startsWith('http')) {
    const origin = self.location.origin;
    urlToOpen = origin + (urlToOpen.startsWith('/') ? '' : '/') + urlToOpen;
  }

  // console.log('[Sigme SW Core]  Final URL:', urlToOpen);

  // FIX: Track click using the UNIFIED /api/notifications/track-click endpoint
  if (notificationData.subscriber_id) {
    const apiUrl = getApiUrl();
    const trackingUrl = `${apiUrl}/api/notifications/track-click`;

       // FIX: Include notification_id for proper tracking
    const payload = {
      notification_id: event.notification.tag || notificationData.notification_id, // Use tag as fallback
      campaign_id: notificationData.campaign_id || null,
      subscriber_id: notificationData.subscriber_id,
      journey_id: notificationData.journey_id || null,
      url: urlToOpen,
      title: event.notification.title,
    };
    // console.log('[Sigme SW Core]  Tracking click:', {
    //   notification_id: payload.notification_id ? '✓' : '✗',
    //   subscriber_id: payload.subscriber_id ? '✓' : '✗',
    //   journey_id: payload.journey_id || 'none',
    // });

      // FIX: Use fetch with keepalive (sendBeacon not available in service workers)
    const trackingPromise = fetch(trackingUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true, // Ensures request completes even if page closes
    })
      .then(response => {
        if (response.ok) {
          console.log('[Sigme SW Core] Click tracked successfully');
          return response.json();
        } else {
          // console.error('[Sigme SW Core]  Tracking failed:', response.status);
          return response.text().then(text => {
            console.error('[Sigme SW Core]  Error:', text);
          });
        }
      })
      .catch(err => {
        console.error('[Sigme SW Core]  Fetch tracking failed:', err);
      });

    // Wait for tracking to complete before navigation
    event.waitUntil(trackingPromise);
  } else {
    console.warn('[Sigme SW Core]  No subscriber_id - cannot track click');
  }

  // Now navigate to the URL

  const openWindowPromise = self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  })
    .then((clientList) => {
      console.log('[Sigme SW Core] Found', clientList.length, 'open window(s)');

      const targetUrlObj = new URL(urlToOpen);

      // Try to find an existing window from the same origin
      for (const client of clientList) {
        try {
          const clientUrlObj = new URL(client.url);

          if (clientUrlObj.origin === targetUrlObj.origin) {
            console.log('[Sigme SW Core]  Found matching window, sending navigation message');
            
            // Focus the window and send navigation message
            return client.focus().then(() => {
              client.postMessage({
                type: 'SIGME_NAVIGATE',
                url: urlToOpen
              });
              console.log('[Sigme SW Core]  Navigation message sent to client');
              return client;
            });
          }
        } catch (e) {
          console.warn('[Sigme SW Core]  Error checking client:', e);
        }
      }

      // No existing window found - open new one
      console.log('[Sigme SW Core]  Opening new window');
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      } else {
        console.error('[Sigme SW Core]  openWindow not available');
      }
    })
    .catch((error) => {
      console.error('[Sigme SW Core] Navigation error:', error);
    });

  event.waitUntil(openWindowPromise);
});
//   const openWindowPromise = self.clients.matchAll({
//     type: 'window',
//     includeUncontrolled: true
//   })
//     .then((clientList) => {
//       // console.log('[Sigme SW Core] Found', clientList.length, 'open windows');

//       const targetUrlObj = new URL(urlToOpen);

//       // Try to find an existing window from the same origin
//       for (const client of clientList) {
//         try {
//           const clientUrlObj = new URL(client.url);

//           if (clientUrlObj.origin === targetUrlObj.origin) {
//             console.log('[Sigme SW Core] Navigating existing window');
//             return client.focus().then(() => {
//               if ('navigate' in client) {
//                 return
//                 client.navigate(urlToOpen)
//               }
//               else {
//                 console.warn('[Sigme SW Core] ⚠️ Navigate not available, opening new window');
//                 return self.clients.openWindow(urlToOpen);
//               }
//           });
//           }
//         } catch (e) {
//           console.warn('[Sigme SW Core]  Error parsing client URL:', e);
//         }
//       }

//       // Open new window
//       // console.log('[Sigme SW Core] Opening new window');
//       if (self.clients.openWindow) {
//         return self.clients.openWindow(urlToOpen);
//       }
//     })
//     .catch((error) => {
//       console.error('[Sigme SW Core]  Error opening window:', error);
//     });

//   event.waitUntil(openWindowPromise);
// });

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Convert VAPID key from base64 to Uint8Array
 */
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

// ============================================
// READY
// ============================================

console.log('[Sigme SW Core] Ready..........');