// // // // // // ============================================
// // // // // //  BACKEND/public/sigme-sw-core.js
// // // // // // Core Service Worker Logic (imported by client proxies)
// // // // // // ============================================

// // // // // console.log('[Sigme SW Core] Loading...');

// // // // // // Global config store
// // // // // let websiteConfig = null;

// // // // // // Install event
// // // // // self.addEventListener('install', (event) => {
// // // // //   console.log('[Sigme SW Core] Installing...');
// // // // //   self.skipWaiting();
// // // // // });

// // // // // // Activate event
// // // // // self.addEventListener('activate', (event) => {
// // // // //   console.log('[Sigme SW Core] Activating...');
// // // // //   event.waitUntil(self.clients.claim());
// // // // // });

// // // // // // Listen for messages from the client
// // // // // self.addEventListener('message', async (event) => {
// // // // //   const { type, config } = event.data;

// // // // //   if (type === 'SIGME_INIT') {
// // // // //     console.log('[Sigme SW Core] Received configuration:', config);
// // // // //     websiteConfig = config;
    
// // // // //     // Store config in IndexedDB for persistence
// // // // //     try {
// // // // //       const db = await openConfigDB();
// // // // //       await saveConfig(db, config);
// // // // //       console.log('[Sigme SW Core] Config saved to IndexedDB');
// // // // //     } catch (err) {
// // // // //       console.warn('[Sigme SW Core] Could not save config to IndexedDB:', err);
// // // // //     }
// // // // //   }

// // // // //   if (type === 'SIGME_SUBSCRIBE') {
// // // // //     console.log('[Sigme SW Core] Subscribe request');
// // // // //     await handleSubscribe(event);
// // // // //   }
// // // // // });

// // // // // // ============================================
// // // // // // IndexedDB helpers for config persistence
// // // // // // ============================================
// // // // // function openConfigDB() {
// // // // //   return new Promise((resolve, reject) => {
// // // // //     const request = indexedDB.open('SigmeConfig', 1);
    
// // // // //     request.onerror = () => reject(request.error);
// // // // //     request.onsuccess = () => resolve(request.result);
    
// // // // //     request.onupgradeneeded = (event) => {
// // // // //       const db = event.target.result;
// // // // //       if (!db.objectStoreNames.contains('config')) {
// // // // //         db.createObjectStore('config');
// // // // //       }
// // // // //     };
// // // // //   });
// // // // // }

// // // // // function saveConfig(db, config) {
// // // // //   return new Promise((resolve, reject) => {
// // // // //     const transaction = db.transaction(['config'], 'readwrite');
// // // // //     const store = transaction.objectStore('config');
// // // // //     const request = store.put(config, 'websiteConfig');
    
// // // // //     request.onerror = () => reject(request.error);
// // // // //     request.onsuccess = () => resolve();
// // // // //   });
// // // // // }

// // // // // function loadConfig(db) {
// // // // //   return new Promise((resolve, reject) => {
// // // // //     const transaction = db.transaction(['config'], 'readonly');
// // // // //     const store = transaction.objectStore('config');
// // // // //     const request = store.get('websiteConfig');
    
// // // // //     request.onerror = () => reject(request.error);
// // // // //     request.onsuccess = () => resolve(request.result);
// // // // //   });
// // // // // }

// // // // // // Load config from IndexedDB if not in memory
// // // // // async function getConfig() {
// // // // //   if (websiteConfig) {
// // // // //     return websiteConfig;
// // // // //   }
  
// // // // //   try {
// // // // //     const db = await openConfigDB();
// // // // //     const config = await loadConfig(db);
// // // // //     if (config) {
// // // // //       websiteConfig = config;
// // // // //       console.log('[Sigme SW Core] Config loaded from IndexedDB');
// // // // //       return config;
// // // // //     }
// // // // //   } catch (err) {
// // // // //     console.warn('[Sigme SW Core] Could not load config from IndexedDB:', err);
// // // // //   }
  
// // // // //   return null;
// // // // // }

// // // // // // Get API URL - with fallback to current origin
// // // // // function getApiUrl() {
// // // // //   if (websiteConfig && websiteConfig.apiUrl) {
// // // // //     return websiteConfig.apiUrl;
// // // // //   }
  
// // // // //   try {
// // // // //     const scriptUrl = new URL(self.location.href);
// // // // //     const apiUrl = scriptUrl.origin;
// // // // //     console.log('[Sigme SW Core] Using API URL from origin:', apiUrl);
// // // // //     return apiUrl;
// // // // //   } catch (e) {
// // // // //     console.error('[Sigme SW Core] Could not determine API URL:', e);
// // // // //     return 'http://localhost:3000'; // Development fallback
// // // // //   }
// // // // // }

// // // // // // ============================================
// // // // // // Handle subscription
// // // // // // ============================================
// // // // // async function handleSubscribe(event) {
// // // // //   try {
// // // // //     const config = await getConfig();
    
// // // // //     if (!config) {
// // // // //       throw new Error('Configuration not loaded');
// // // // //     }

// // // // //     const vapidPublicKey = config.vapidPublicKey;
    
// // // // //     if (!vapidPublicKey) {
// // // // //       throw new Error('VAPID public key not found in configuration');
// // // // //     }

// // // // //     const subscription = await self.registration.pushManager.subscribe({
// // // // //       userVisibleOnly: true,
// // // // //       applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
// // // // //     });

// // // // //     console.log('[Sigme SW Core] Subscription obtained');

// // // // //     const subscriptionJSON = subscription.toJSON();
// // // // //     const endpoint = subscriptionJSON.endpoint;
// // // // //     const keys = subscriptionJSON.keys || {};
    
// // // // //     const p256dh = keys.p256dh;
// // // // //     const auth = keys.auth;

// // // // //     if (!endpoint || !p256dh || !auth) {
// // // // //       throw new Error('Invalid subscription format - missing keys');
// // // // //     }

// // // // //     const userAgent = self.navigator.userAgent || '';
// // // // //     let browser = 'Unknown';
// // // // //     let os = 'Unknown';

// // // // //     if (userAgent.includes('Chrome')) browser = 'Chrome';
// // // // //     else if (userAgent.includes('Firefox')) browser = 'Firefox';
// // // // //     else if (userAgent.includes('Safari')) browser = 'Safari';
// // // // //     else if (userAgent.includes('Edge')) browser = 'Edge';

// // // // //     if (userAgent.includes('Windows')) os = 'Windows';
// // // // //     else if (userAgent.includes('Mac')) os = 'macOS';
// // // // //     else if (userAgent.includes('Linux')) os = 'Linux';
// // // // //     else if (userAgent.includes('Android')) os = 'Android';
// // // // //     else if (userAgent.includes('iOS')) os = 'iOS';

// // // // //     const apiUrl = getApiUrl();
    
// // // // //     console.log('[Sigme SW Core] Registering with API:', apiUrl);

// // // // //     const response = await fetch(`${apiUrl}/api/subscribers/register`, {
// // // // //       method: 'POST',
// // // // //       headers: {
// // // // //         'Content-Type': 'application/json',
// // // // //       },
// // // // //       body: JSON.stringify({
// // // // //         websiteId: config.websiteId,
// // // // //         endpoint: endpoint,
// // // // //         p256dh: p256dh,
// // // // //         auth: auth,
// // // // //         platform: 'web',
// // // // //         browser: browser,
// // // // //         os: os
// // // // //       })
// // // // //     });

// // // // //     if (!response.ok) {
// // // // //       const errorText = await response.text();
// // // // //       console.error('[Sigme SW Core] API Error:', errorText);
// // // // //       throw new Error(`HTTP ${response.status}: ${errorText}`);
// // // // //     }

// // // // //     const result = await response.json();

// // // // //     if (!result.success) {
// // // // //       throw new Error(result.error || 'Registration failed');
// // // // //     }

// // // // //     console.log('[Sigme SW Core] Registration successful:', result);

// // // // //     const clients = await self.clients.matchAll();
// // // // //     clients.forEach(client => {
// // // // //       client.postMessage({
// // // // //         type: 'SIGME_SUBSCRIBED',
// // // // //         success: true,
// // // // //         data: result
// // // // //       });
// // // // //     });

// // // // //   } catch (error) {
// // // // //     console.error('[Sigme SW Core] Registration failed:', error.message);

// // // // //     const clients = await self.clients.matchAll();
// // // // //     clients.forEach(client => {
// // // // //       client.postMessage({
// // // // //         type: 'SIGME_SUBSCRIBED',
// // // // //         success: false,
// // // // //         error: error.message
// // // // //       });
// // // // //     });
// // // // //   }
// // // // // }

// // // // // // ============================================
// // // // // // Handle push notifications
// // // // // // ============================================
// // // // // self.addEventListener('push', (event) => {
// // // // //   console.log('[Sigme SW Core]  Push received');

// // // // //   let notification = {
// // // // //     title: 'New Notification',
// // // // //     body: 'You have a new message',
// // // // //     icon: '/icon.png',
// // // // //     badge: '/badge.png',
// // // // //     data: {}
// // // // //   };

// // // // //   if (event.data) {
// // // // //     try {
// // // // //       const data = event.data.json();
// // // // //       console.log('[Sigme SW Core]  Push data:', data);
// // // // //         if (data.data) {
// // // // //         console.log('[Sigme SW Core] current_step_id Data object exists:', data.data);
// // // // //         console.log('[Sigme SW Core] subscriber_id:', data.data.subscriber_id);
// // // // //         console.log('[Sigme SW Core] campaign_id:', data.data.campaign_id);
// // // // //       } else {
// // // // //         console.error('[Sigme SW Core]  NO DATA OBJECT IN PUSH!');
// // // // //         console.error('[Sigme SW Core]  Push payload:', JSON.stringify(data));
// // // // //       }
// // // // //       notification = {
// // // // //         title: data.title || notification.title,
// // // // //         body: data.body || notification.body,
// // // // //         icon: data.icon || notification.icon,
// // // // //         badge: data.badge || notification.badge,
// // // // //         image: data.image,
// // // // //         tag: data.tag,
// // // // //         data: data.data || {},
// // // // //       };
      
// // // // //       console.log('[Sigme SW Core] Notification data:', notification.data);
// // // // //     } catch (e) {
// // // // //       console.error('[Sigme SW Core] Failed to parse push data:', e);
// // // // //     }
// // // // //   }

// // // // //   // Track notification received event
// // // // //   if (notification.data && notification.data.subscriber_id) {
// // // // //     console.log('[Sigme SW Core]  Tracking received event');
// // // // //     event.waitUntil(
// // // // //       trackEvent('notification_received', notification.data.subscriber_id, {
// // // // //         title: notification.title,
// // // // //         campaign_id: notification.data.campaign_id || null,
// // // // //         journey_id: notification.data.journey_id || null,
// // // // //         received_at: new Date().toISOString()
// // // // //       })
// // // // //     );
// // // // //   }

// // // // //   const options = {
// // // // //     body: notification.body,
// // // // //     icon: notification.icon,
// // // // //     badge: notification.badge,
// // // // //     image: notification.image,
// // // // //     tag: notification.tag,
// // // // //     data: notification.data,
// // // // //     requireInteraction: false,
// // // // //     vibrate: [200, 100, 200]
// // // // //   };

// // // // //   event.waitUntil(
// // // // //     self.registration.showNotification(notification.title, options)
// // // // //   );
// // // // // });

// // // // // // ============================================
// // // // // // Handle notification clicks
// // // // // // ============================================
// // // // // self.addEventListener('notificationclick', (event) => {
// // // // //   console.log('[Sigme SW Core]  Notification clicked');
// // // // //   console.log('[Sigme SW Core] Full notification:', event.notification);
// // // // //   console.log('[Sigme SW Core] Notification data:', event.notification.data);
  
// // // // //   event.notification.close();

// // // // //   const notificationData = event.notification.data || {};
// // // // //   const urlToOpen = notificationData.url || '/';

// // // // //   console.log('[Sigme SW Core]  URL to open:', urlToOpen);
// // // // //   console.log('[Sigme SW Core]  Subscriber ID:', notificationData.subscriber_id);
// // // // //   console.log('[Sigme SW Core]  Campaign ID:', notificationData.campaign_id);

// // // // //   // Track notification click event
// // // // //   if (notificationData.subscriber_id) {
// // // // //     console.log('[Sigme SW Core] current_step_id Tracking click event');
    
// // // // //     const trackingPromise = trackEvent(
// // // // //       'notification_clicked',
// // // // //       notificationData.subscriber_id,
// // // // //       {
// // // // //         url: urlToOpen,
// // // // //         campaign_id: notificationData.campaign_id || null,
// // // // //         journey_id: notificationData.journey_id || null,
// // // // //         node_id: notificationData.node_id || null,
// // // // //         title: event.notification.title,
// // // // //         clicked_at: new Date().toISOString()
// // // // //       }
// // // // //     );

// // // // //     event.waitUntil(trackingPromise);
// // // // //   } else {
// // // // //     console.error('[Sigme SW Core]  Cannot track click - missing subscriber_id');
// // // // //     console.error('[Sigme SW Core] Available data:', notificationData);
// // // // //   }

// // // // //   // Open the URL
// // // // //   event.waitUntil(
// // // // //     self.clients.matchAll({ type: 'window', includeUncontrolled: true })
// // // // //       .then((clientList) => {
// // // // //         for (const client of clientList) {
// // // // //           if (client.url === urlToOpen && 'focus' in client) {
// // // // //             return client.focus();
// // // // //           }
// // // // //         }
// // // // //         if (self.clients.openWindow) {
// // // // //           return self.clients.openWindow(urlToOpen);
// // // // //         }
// // // // //       })
// // // // //   );
// // // // // });

// // // // // // ============================================
// // // // // // Centralized event tracking function
// // // // // // ============================================
// // // // // // async function trackEvent(eventName, subscriberId, properties = {}) {
// // // // // //   try {
// // // // // //     const apiUrl = getApiUrl();
// // // // // //     const trackingUrl = `${apiUrl}/api/events/track`;
    
// // // // // //     console.log(`[Sigme SW Core]  Tracking: ${eventName}`);
// // // // // //     console.log(`[Sigme SW Core] API URL: ${trackingUrl}`);
// // // // // //     console.log(`[Sigme SW Core]  Subscriber: ${subscriberId}`);
// // // // // //     console.log(`[Sigme SW Core]  Properties:`, properties);

// // // // // //     const payload = {
// // // // // //       subscriber_id: subscriberId,
// // // // // //       event_name: eventName,
// // // // // //       properties: properties
// // // // // //     };

// // // // // //     console.log(`[Sigme SW Core]  Sending payload:`, JSON.stringify(payload, null, 2));

// // // // // //     const response = await fetch(trackingUrl, {
// // // // // //       method: 'POST',
// // // // // //       headers: {
// // // // // //         'Content-Type': 'application/json',
// // // // // //       },
// // // // // //       body: JSON.stringify(payload)
// // // // // //     });

// // // // // //     console.log(`[Sigme SW Core]  Response status: ${response.status}`);

// // // // // //     if (response.ok) {
// // // // // //       const result = await response.json();
// // // // // //       console.log(`[Sigme SW Core] current_step_id Event tracked successfully:`, result);
// // // // // //       return result;
// // // // // //     } else {
// // // // // //       const errorText = await response.text();
// // // // // //       console.error(`[Sigme SW Core]  Tracking failed (${response.status}):`, errorText);
// // // // // //     }
// // // // // //   } catch (err) {
// // // // // //     console.error(`[Sigme SW Core]  Tracking error:`, err);
// // // // // //   }
// // // // // // }


// // // // // // backend/public/sigme-sw-core.js - Update trackEvent function (line ~380)

// // // // // async function trackEvent(eventName, subscriberId, properties = {}) {
// // // // //   try {
// // // // //     const apiUrl = getApiUrl();
// // // // //     const trackingUrl = `${apiUrl}/api/events/track`;
    
// // // // //     console.log(`[Sigme SW Core]  Tracking: ${eventName}`);
// // // // //     console.log(`[Sigme SW Core] API URL: ${trackingUrl}`);
// // // // //     console.log(`[Sigme SW Core]  Subscriber: ${subscriberId}`);
// // // // //     console.log(`[Sigme SW Core]  Properties:`, properties);

// // // // //     //  CRITICAL: Include website_id from config
// // // // //     const config = await getConfig();
// // // // //     const payload = {
// // // // //       subscriber_id: subscriberId,
// // // // //       event_name: eventName,
// // // // //       properties: properties,
// // // // //       website_id: config?.websiteId || null, //  ADD THIS
// // // // //     };

// // // // //     console.log(`[Sigme SW Core]  Sending payload:`, JSON.stringify(payload, null, 2));

// // // // //     const response = await fetch(trackingUrl, {
// // // // //       method: 'POST',
// // // // //       headers: {
// // // // //         'Content-Type': 'application/json',
// // // // //       },
// // // // //       body: JSON.stringify(payload)
// // // // //     });

// // // // //     console.log(`[Sigme SW Core]  Response status: ${response.status}`);

// // // // //     if (response.ok) {
// // // // //       const result = await response.json();
// // // // //       console.log(`[Sigme SW Core]  Event tracked successfully:`, result);
// // // // //       return result;
// // // // //     } else {
// // // // //       const errorText = await response.text();
// // // // //       console.error(`[Sigme SW Core]  Tracking failed (${response.status}):`, errorText);
// // // // //     }
// // // // //   } catch (err) {
// // // // //     console.error(`[Sigme SW Core]  Tracking error:`, err);
// // // // //   }
// // // // // }

// // // // // // ============================================
// // // // // // Helper function to convert VAPID key
// // // // // // ============================================
// // // // // function urlBase64ToUint8Array(base64String) {
// // // // //   const padding = '='.repeat((4 - base64String.length % 4) % 4);
// // // // //   const base64 = (base64String + padding)
// // // // //     .replace(/\-/g, '+')
// // // // //     .replace(/_/g, '/');

// // // // //   const rawData = atob(base64);
// // // // //   const outputArray = new Uint8Array(rawData.length);

// // // // //   for (let i = 0; i < rawData.length; ++i) {
// // // // //     outputArray[i] = rawData.charCodeAt(i);
// // // // //   }
// // // // //   return outputArray;
// // // // // }

// // // // // console.log('[Sigme SW Core] Readyt');















// // // // // ============================================
// // // // // BACKEND/public/sigme-sw-core.js
// // // // // Core Service Worker Logic (imported by client proxies)
// // // // // ============================================

// // // // console.log('[Sigme SW Core] Loading...');

// // // // // ============================================
// // // // // GLOBAL STATE
// // // // // ============================================
// // // // let websiteConfig = null;

// // // // // ============================================
// // // // // LIFECYCLE EVENTS
// // // // // ============================================

// // // // // Install event
// // // // self.addEventListener('install', (event) => {
// // // //   console.log('[Sigme SW Core] Installing...');
// // // //   self.skipWaiting();
// // // // });

// // // // // Activate event
// // // // self.addEventListener('activate', (event) => {
// // // //   console.log('[Sigme SW Core] Activating...');
// // // //   event.waitUntil(self.clients.claim());
// // // // });

// // // // // ============================================
// // // // // MESSAGE HANDLING
// // // // // ============================================

// // // // // Listen for messages from the client
// // // // self.addEventListener('message', async (event) => {
// // // //   const { type, config } = event.data;

// // // //   if (type === 'SIGME_INIT') {
// // // //     // console.log('[Sigme SW Core]  Received configuration:', config);
// // // //     websiteConfig = config;
    
// // // //     // Store config in IndexedDB for persistence
// // // //     try {
// // // //       const db = await openConfigDB();
// // // //       await saveConfig(db, config);
// // // //       console.log('[Sigme SW Core]  Config saved to IndexedDB');
// // // //     } catch (err) {
// // // //       console.warn('[Sigme SW Core]  Could not save config to IndexedDB:', err);
// // // //     }
// // // //   }

// // // //   if (type === 'SIGME_SUBSCRIBE') {
// // // //     console.log('[Sigme SW Core]  Subscribe request received');
// // // //     await handleSubscribe(event);
// // // //   }
// // // // });

// // // // // ============================================
// // // // // INDEXEDDB HELPERS (Config Persistence)
// // // // // ============================================

// // // // function openConfigDB() {
// // // //   return new Promise((resolve, reject) => {
// // // //     const request = indexedDB.open('SigmeConfig', 1);
    
// // // //     request.onerror = () => reject(request.error);
// // // //     request.onsuccess = () => resolve(request.result);
    
// // // //     request.onupgradeneeded = (event) => {
// // // //       const db = event.target.result;
// // // //       if (!db.objectStoreNames.contains('config')) {
// // // //         db.createObjectStore('config');
// // // //       }
// // // //     };
// // // //   });
// // // // }

// // // // function saveConfig(db, config) {
// // // //   return new Promise((resolve, reject) => {
// // // //     const transaction = db.transaction(['config'], 'readwrite');
// // // //     const store = transaction.objectStore('config');
// // // //     const request = store.put(config, 'websiteConfig');
    
// // // //     request.onerror = () => reject(request.error);
// // // //     request.onsuccess = () => resolve();
// // // //   });
// // // // }

// // // // function loadConfig(db) {
// // // //   return new Promise((resolve, reject) => {
// // // //     const transaction = db.transaction(['config'], 'readonly');
// // // //     const store = transaction.objectStore('config');
// // // //     const request = store.get('websiteConfig');
    
// // // //     request.onerror = () => reject(request.error);
// // // //     request.onsuccess = () => resolve(request.result);
// // // //   });
// // // // }

// // // // // Load config from IndexedDB if not in memory
// // // // async function getConfig() {
// // // //   if (websiteConfig) {
// // // //     return websiteConfig;
// // // //   }
  
// // // //   try {
// // // //     const db = await openConfigDB();
// // // //     const config = await loadConfig(db);
// // // //     if (config) {
// // // //       websiteConfig = config;
// // // //       console.log('[Sigme SW Core] Config loaded from IndexedDB');
// // // //       return config;
// // // //     }
// // // //   } catch (err) {
// // // //     console.warn('[Sigme SW Core]  Could not load config from IndexedDB:', err);
// // // //   }
  
// // // //   return null;
// // // // }

// // // // // Get API URL - with fallback to current origin
// // // // function getApiUrl() {
// // // //   if (websiteConfig && websiteConfig.apiUrl) {
// // // //     return websiteConfig.apiUrl;
// // // //   }
  
// // // //   // Fallback: try to determine from the script location
// // // //   try {
// // // //     const scriptUrl = new URL(self.location.href);
// // // //     const apiUrl = scriptUrl.origin;
// // // //     console.log('[Sigme SW Core] Using API URL from origin:', apiUrl);
// // // //     return apiUrl;
// // // //   } catch (e) {
// // // //     console.error('[Sigme SW Core]  Could not determine API URL:', e);
// // // //     return 'http://localhost:3000'; // Development fallback
// // // //   }
// // // // }

// // // // // ============================================
// // // // // SUBSCRIPTION HANDLING
// // // // // ============================================

// // // // async function handleSubscribe(event) {
// // // //   try {
// // // //     const config = await getConfig();
    
// // // //     if (!config) {
// // // //       throw new Error('Configuration not loaded');
// // // //     }

// // // //     const vapidPublicKey = config.vapidPublicKey;
    
// // // //     if (!vapidPublicKey) {
// // // //       throw new Error('VAPID public key not found in configuration');
// // // //     }

// // // //     console.log('[Sigme SW Core]  Subscribing with VAPID key...');

// // // //     const subscription = await self.registration.pushManager.subscribe({
// // // //       userVisibleOnly: true,
// // // //       applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
// // // //     });

// // // //     console.log('[Sigme SW Core]  Subscription obtained');

// // // //     const subscriptionJSON = subscription.toJSON();
// // // //     const endpoint = subscriptionJSON.endpoint;
// // // //     const keys = subscriptionJSON.keys || {};
    
// // // //     const p256dh = keys.p256dh;
// // // //     const auth = keys.auth;

// // // //     if (!endpoint || !p256dh || !auth) {
// // // //       throw new Error('Invalid subscription format - missing keys');
// // // //     }

// // // //     // Detect browser and OS
// // // //     const userAgent = self.navigator.userAgent || '';
// // // //     let browser = 'Unknown';
// // // //     let os = 'Unknown';

// // // //     if (userAgent.includes('Chrome')) browser = 'Chrome';
// // // //     else if (userAgent.includes('Firefox')) browser = 'Firefox';
// // // //     else if (userAgent.includes('Safari')) browser = 'Safari';
// // // //     else if (userAgent.includes('Edge')) browser = 'Edge';

// // // //     if (userAgent.includes('Windows')) os = 'Windows';
// // // //     else if (userAgent.includes('Mac')) os = 'macOS';
// // // //     else if (userAgent.includes('Linux')) os = 'Linux';
// // // //     else if (userAgent.includes('Android')) os = 'Android';
// // // //     else if (userAgent.includes('iOS')) os = 'iOS';

// // // //     const apiUrl = getApiUrl();
    
// // // //     console.log('[Sigme SW Core]  Registering with API:', apiUrl);

// // // //     const response = await fetch(`${apiUrl}/api/subscribers/register`, {
// // // //       method: 'POST',
// // // //       headers: {
// // // //         'Content-Type': 'application/json',
// // // //       },
// // // //       body: JSON.stringify({
// // // //         websiteId: config.websiteId,
// // // //         endpoint: endpoint,
// // // //         p256dh: p256dh,
// // // //         auth: auth,
// // // //         platform: 'web',
// // // //         browser: browser,
// // // //         os: os
// // // //       })
// // // //     });

// // // //     if (!response.ok) {
// // // //       const errorText = await response.text();
// // // //       console.error('[Sigme SW Core]  API Error:', errorText);
// // // //       throw new Error(`HTTP ${response.status}: ${errorText}`);
// // // //     }

// // // //     const result = await response.json();

// // // //     if (!result.success) {
// // // //       throw new Error(result.error || 'Registration failed');
// // // //     }

// // // //     console.log('[Sigme SW Core]  Registration successful:', result);

// // // //     // Notify all clients
// // // //     const clients = await self.clients.matchAll();
// // // //     clients.forEach(client => {
// // // //       client.postMessage({
// // // //         type: 'SIGME_SUBSCRIBED',
// // // //         success: true,
// // // //         data: result
// // // //       });
// // // //     });

// // // //   } catch (error) {
// // // //     console.error('[Sigme SW Core]  Registration failed:', error.message);

// // // //     const clients = await self.clients.matchAll();
// // // //     clients.forEach(client => {
// // // //       client.postMessage({
// // // //         type: 'SIGME_SUBSCRIBED',
// // // //         success: false,
// // // //         error: error.message
// // // //       });
// // // //     });
// // // //   }
// // // // }

// // // // // ============================================
// // // // // PUSH NOTIFICATION HANDLING
// // // // // ============================================

// // // // self.addEventListener('push', (event) => {
// // // //   console.log('[Sigme SW Core]  Push received');

// // // //   let notification = {
// // // //     title: 'New Notification',
// // // //     body: 'You have a new message',
// // // //     icon: '/icon.png',
// // // //     badge: '/badge.png',
// // // //     data: {}
// // // //   };

// // // //   if (event.data) {
// // // //     try {
// // // //       const data = event.data.json();
// // // //       console.log('[Sigme SW Core]  Push data:', data);
      
// // // //       if (data.data) {
// // // //         console.log('[Sigme SW Core]  Data object exists:', data.data);
// // // //         console.log('[Sigme SW Core] subscriber_id:', data.data.subscriber_id);
// // // //         console.log('[Sigme SW Core] campaign_id:', data.data.campaign_id);
// // // //         console.log('[Sigme SW Core] journey_id:', data.data.journey_id);
// // // //       } else {
// // // //         console.error('[Sigme SW Core]  NO DATA OBJECT IN PUSH!');
// // // //         console.error('[Sigme SW Core]  Push payload:', JSON.stringify(data));
// // // //       }
      
// // // //       notification = {
// // // //         title: data.title || notification.title,
// // // //         body: data.body || notification.body,
// // // //         icon: data.icon || notification.icon,
// // // //         badge: data.badge || notification.badge,
// // // //         image: data.image,
// // // //         tag: data.tag, // notification_log.id
// // // //         data: data.data || {},
// // // //       };
      
// // // //       console.log('[Sigme SW Core] Notification data:', notification.data);
// // // //     } catch (e) {
// // // //       console.error('[Sigme SW Core]  Failed to parse push data:', e);
// // // //     }
// // // //   }

// // // //   const options = {
// // // //     body: notification.body,
// // // //     icon: notification.icon,
// // // //     badge: notification.badge,
// // // //     image: notification.image,
// // // //     tag: notification.tag,
// // // //     data: notification.data,
// // // //     requireInteraction: false,
// // // //     vibrate: [200, 100, 200]
// // // //   };

// // // //   //  SHOW NOTIFICATION AND TRACK DELIVERY
// // // //   const showAndTrackPromise = self.registration.showNotification(notification.title, options)
// // // //     .then(() => {
// // // //       console.log('[Sigme SW Core]  Notification shown successfully');
      
// // // //       //  TRACK DELIVERY
// // // //       if (notification.tag && notification.data && notification.data.subscriber_id) {
// // // //         console.log('[Sigme SW Core]  Tracking delivery...');
        
// // // //         return trackDelivery(
// // // //           notification.tag, // notification_log.id
// // // //           notification.data.subscriber_id,
// // // //           notification.data.journey_id
// // // //         );
// // // //       } else {
// // // //         console.warn('[Sigme SW Core]  Cannot track delivery - missing required data');
// // // //         // console.warn('[Sigme SW Core] tag:', notification.tag);
// // // //         // console.warn('[Sigme SW Core] subscriber_id:', notification.data?.subscriber_id);
// // // //       }
// // // //     })
// // // //     .catch((error) => {
// // // //       console.error('[Sigme SW Core]  Error showing notification:', error);
// // // //     });

// // // //   event.waitUntil(showAndTrackPromise);
// // // // });

// // // // // ============================================
// // // // // NOTIFICATION CLICK HANDLING
// // // // // ============================================

// // // // self.addEventListener('notificationclick', (event) => {
// // // //   console.log('[Sigme SW Core]  Notification clicked');
// // // //   console.log('[Sigme SW Core] Full notification:', event.notification);
// // // //   console.log('[Sigme SW Core] Notification data:', event.notification.data);
  
// // // //   event.notification.close();

// // // //   const notificationData = event.notification.data || {};
// // // //   const urlToOpen = notificationData.url || '/';

// // // //   // console.log('[Sigme SW Core]  URL to open:', urlToOpen);
// // // //   // console.log('[Sigme SW Core]  Subscriber ID:', notificationData.subscriber_id);
// // // //   // console.log('[Sigme SW Core]  Campaign ID:', notificationData.campaign_id);
// // // //   // console.log('[Sigme SW Core] Journey ID:', notificationData.journey_id);

// // // //   //  TRACK NOTIFICATION CLICK
// // // //   if (notificationData.subscriber_id) {
// // // //     console.log('[Sigme SW Core]  Tracking click event...');
    
// // // //     const trackingPromise = trackEvent(
// // // //       'notification_clicked',
// // // //       notificationData.subscriber_id,
// // // //       {
// // // //         url: urlToOpen,
// // // //         campaign_id: notificationData.campaign_id || null,
// // // //         journey_id: notificationData.journey_id || null,
// // // //         journey_step_id: notificationData.journey_step_id || null,
// // // //         user_journey_state_id: notificationData.user_journey_state_id || null,
// // // //         title: event.notification.title,
// // // //         clicked_at: new Date().toISOString()
// // // //       }
// // // //     );

// // // //     event.waitUntil(trackingPromise);
// // // //   } else {
// // // //     console.error('[Sigme SW Core]  Cannot track click - missing subscriber_id');
// // // //     console.error('[Sigme SW Core] Available data:', notificationData);
// // // //   }

// // // //   //  OPEN THE URL
// // // //   event.waitUntil(
// // // //     self.clients.matchAll({ type: 'window', includeUncontrolled: true })
// // // //       .then((clientList) => {
// // // //         // Check if a window with this URL is already open
// // // //         for (const client of clientList) {
// // // //           if (client.url === urlToOpen && 'focus' in client) {
// // // //             return client.focus();
// // // //           }
// // // //         }
// // // //         // Otherwise, open a new window
// // // //         if (self.clients.openWindow) {
// // // //           return self.clients.openWindow(urlToOpen);
// // // //         }
// // // //       })
// // // //   );
// // // // });

// // // // // ============================================
// // // // // EVENT TRACKING
// // // // // ============================================

// // // // /**
// // // //  *  Track custom events
// // // //  */
// // // // async function trackEvent(eventName, subscriberId, properties = {}) {
// // // //   try {
// // // //     const apiUrl = getApiUrl();
// // // //     const trackingUrl = `${apiUrl}/api/events/track`;
    
// // // //     // console.log(`[Sigme SW Core]  Tracking: ${eventName}`);
// // // //     // console.log(`[Sigme SW Core] API URL: ${trackingUrl}`);
// // // //     // console.log(`[Sigme SW Core]  Subscriber: ${subscriberId}`);
// // // //     // console.log(`[Sigme SW Core]  Properties:`, properties);

// // // //     //  INCLUDE WEBSITE_ID FROM CONFIG
// // // //     const config = await getConfig();
// // // //     const payload = {
// // // //       subscriber_id: subscriberId,
// // // //       event_name: eventName,
// // // //       properties: properties,
// // // //       website_id: config?.websiteId || null,
// // // //     };

// // // //     console.log(`[Sigme SW Core]  Sending payload:`, JSON.stringify(payload, null, 2));

// // // //     const response = await fetch(trackingUrl, {
// // // //       method: 'POST',
// // // //       headers: {
// // // //         'Content-Type': 'application/json',
// // // //       },
// // // //       body: JSON.stringify(payload)
// // // //     });

// // // //     console.log(`[Sigme SW Core]  Response status: ${response.status}`);

// // // //     if (response.ok) {
// // // //       const result = await response.json();
// // // //       console.log(`[Sigme SW Core]  Event tracked successfully:`, result);
// // // //       return result;
// // // //     } else {
// // // //       const errorText = await response.text();
// // // //       console.error(`[Sigme SW Core]  Tracking failed (${response.status}):`, errorText);
// // // //     }
// // // //   } catch (err) {
// // // //     console.error(`[Sigme SW Core]  Tracking error:`, err);
// // // //   }
// // // // }

// // // // /**
// // // //  *  Track notification delivery
// // // //  */
// // // // async function trackDelivery(notificationId, subscriberId, journeyId) {
// // // //   try {
// // // //     const apiUrl = getApiUrl();
// // // //     const deliveryUrl = `${apiUrl}/api/notifications/track-delivery`;
    
// // // //     console.log('[Sigme SW Core]  Tracking delivery for notification:', notificationId);

// // // //     const payload = {
// // // //       notification_id: notificationId,
// // // //       subscriber_id: subscriberId,
// // // //       journey_id: journeyId || null,
// // // //       delivered_at: new Date().toISOString(),
// // // //     };

// // // //     console.log('[Sigme SW Core]  Delivery payload:', JSON.stringify(payload, null, 2));

// // // //     const response = await fetch(deliveryUrl, {
// // // //       method: 'POST',
// // // //       headers: {
// // // //         'Content-Type': 'application/json',
// // // //       },
// // // //       body: JSON.stringify(payload)
// // // //     });

// // // //     console.log('[Sigme SW Core]  Delivery response status:', response.status);

// // // //     if (response.ok) {
// // // //       const result = await response.json();
// // // //       console.log('[Sigme SW Core]  Delivery tracked successfully:', result);
// // // //       return result;
// // // //     } else {
// // // //       const errorText = await response.text();
// // // //       console.error('[Sigme SW Core]  Delivery tracking failed:', errorText);
// // // //     }
// // // //   } catch (err) {
// // // //     console.error('[Sigme SW Core]  Delivery tracking error:', err);
// // // //   }
// // // // }

// // // // // ============================================
// // // // // UTILITY FUNCTIONS
// // // // // ============================================

// // // // /**
// // // //  * Convert VAPID key from base64 to Uint8Array
// // // //  */
// // // // function urlBase64ToUint8Array(base64String) {
// // // //   const padding = '='.repeat((4 - base64String.length % 4) % 4);
// // // //   const base64 = (base64String + padding)
// // // //     .replace(/\-/g, '+')
// // // //     .replace(/_/g, '/');

// // // //   const rawData = atob(base64);
// // // //   const outputArray = new Uint8Array(rawData.length);

// // // //   for (let i = 0; i < rawData.length; ++i) {
// // // //     outputArray[i] = rawData.charCodeAt(i);
// // // //   }
// // // //   return outputArray;
// // // // }

// // // // // ============================================
// // // // // READY
// // // // // ============================================

// // // // console.log('[Sigme SW Core]  Ready');


















// // // // ============================================
// // // // BACKEND/public/sigme-sw-core.js
// // // // Core Service Worker Logic (imported by client proxies)
// // // // FIXED: Notification click now properly navigates to specified URL
// // // // ============================================

// // // console.log('[Sigme SW Core] Loading...');

// // // // ============================================
// // // // GLOBAL STATE
// // // // ============================================
// // // let websiteConfig = null;

// // // // ============================================
// // // // LIFECYCLE EVENTS
// // // // ============================================

// // // // Install event
// // // self.addEventListener('install', (event) => {
// // //   console.log('[Sigme SW Core] Installing...');
// // //   self.skipWaiting();
// // // });

// // // // Activate event
// // // self.addEventListener('activate', (event) => {
// // //   console.log('[Sigme SW Core] Activating...');
// // //   event.waitUntil(self.clients.claim());
// // // });

// // // // ============================================
// // // // MESSAGE HANDLING
// // // // ============================================

// // // // Listen for messages from the client
// // // self.addEventListener('message', async (event) => {
// // //   const { type, config } = event.data;

// // //   if (type === 'SIGME_INIT') {
// // //     // console.log('[Sigme SW Core]  Received configuration:', config);
// // //     websiteConfig = config;
    
// // //     // Store config in IndexedDB for persistence
// // //     try {
// // //       const db = await openConfigDB();
// // //       await saveConfig(db, config);
// // //       console.log('[Sigme SW Core]  Config saved to IndexedDB');
// // //     } catch (err) {
// // //       console.warn('[Sigme SW Core]  Could not save config to IndexedDB:', err);
// // //     }
// // //   }

// // //   if (type === 'SIGME_SUBSCRIBE') {
// // //     console.log('[Sigme SW Core]  Subscribe request received');
// // //     await handleSubscribe(event);
// // //   }
// // // });

// // // // ============================================
// // // // INDEXEDDB HELPERS (Config Persistence)
// // // // ============================================

// // // function openConfigDB() {
// // //   return new Promise((resolve, reject) => {
// // //     const request = indexedDB.open('SigmeConfig', 1);
    
// // //     request.onerror = () => reject(request.error);
// // //     request.onsuccess = () => resolve(request.result);
    
// // //     request.onupgradeneeded = (event) => {
// // //       const db = event.target.result;
// // //       if (!db.objectStoreNames.contains('config')) {
// // //         db.createObjectStore('config');
// // //       }
// // //     };
// // //   });
// // // }

// // // function saveConfig(db, config) {
// // //   return new Promise((resolve, reject) => {
// // //     const transaction = db.transaction(['config'], 'readwrite');
// // //     const store = transaction.objectStore('config');
// // //     const request = store.put(config, 'websiteConfig');
    
// // //     request.onerror = () => reject(request.error);
// // //     request.onsuccess = () => resolve();
// // //   });
// // // }

// // // function loadConfig(db) {
// // //   return new Promise((resolve, reject) => {
// // //     const transaction = db.transaction(['config'], 'readonly');
// // //     const store = transaction.objectStore('config');
// // //     const request = store.get('websiteConfig');
    
// // //     request.onerror = () => reject(request.error);
// // //     request.onsuccess = () => resolve(request.result);
// // //   });
// // // }

// // // // Load config from IndexedDB if not in memory
// // // async function getConfig() {
// // //   if (websiteConfig) {
// // //     return websiteConfig;
// // //   }
  
// // //   try {
// // //     const db = await openConfigDB();
// // //     const config = await loadConfig(db);
// // //     if (config) {
// // //       websiteConfig = config;
// // //       console.log('[Sigme SW Core]  Config loaded from IndexedDB');
// // //       return config;
// // //     }
// // //   } catch (err) {
// // //     console.warn('[Sigme SW Core]  Could not load config from IndexedDB:', err);
// // //   }
  
// // //   return null;
// // // }

// // // // Get API URL - with fallback to current origin
// // // function getApiUrl() {
// // //   if (websiteConfig && websiteConfig.apiUrl) {
// // //     return websiteConfig.apiUrl;
// // //   }
  
// // //   // Fallback: try to determine from the script location
// // //   try {
// // //     const scriptUrl = new URL(self.location.href);
// // //     const apiUrl = scriptUrl.origin;
// // //     console.log('[Sigme SW Core] Using API URL from origin:', apiUrl);
// // //     return apiUrl;
// // //   } catch (e) {
// // //     console.error('[Sigme SW Core]  Could not determine API URL:', e);
// // //     return 'http://localhost:3000'; // Development fallback
// // //   }
// // // }

// // // // ============================================
// // // // SUBSCRIPTION HANDLING
// // // // ============================================

// // // async function handleSubscribe(event) {
// // //   try {
// // //     const config = await getConfig();
    
// // //     if (!config) {
// // //       throw new Error('Configuration not loaded');
// // //     }

// // //     const vapidPublicKey = config.vapidPublicKey;
    
// // //     if (!vapidPublicKey) {
// // //       throw new Error('VAPID public key not found in configuration');
// // //     }

// // //     console.log('[Sigme SW Core]  Subscribing with VAPID key...');

// // //     const subscription = await self.registration.pushManager.subscribe({
// // //       userVisibleOnly: true,
// // //       applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
// // //     });

// // //     console.log('[Sigme SW Core]  Subscription obtained');

// // //     const subscriptionJSON = subscription.toJSON();
// // //     const endpoint = subscriptionJSON.endpoint;
// // //     const keys = subscriptionJSON.keys || {};
    
// // //     const p256dh = keys.p256dh;
// // //     const auth = keys.auth;

// // //     if (!endpoint || !p256dh || !auth) {
// // //       throw new Error('Invalid subscription format - missing keys');
// // //     }

// // //     // Detect browser and OS
// // //     const userAgent = self.navigator.userAgent || '';
// // //     let browser = 'Unknown';
// // //     let os = 'Unknown';

// // //     if (userAgent.includes('Chrome')) browser = 'Chrome';
// // //     else if (userAgent.includes('Firefox')) browser = 'Firefox';
// // //     else if (userAgent.includes('Safari')) browser = 'Safari';
// // //     else if (userAgent.includes('Edge')) browser = 'Edge';

// // //     if (userAgent.includes('Windows')) os = 'Windows';
// // //     else if (userAgent.includes('Mac')) os = 'macOS';
// // //     else if (userAgent.includes('Linux')) os = 'Linux';
// // //     else if (userAgent.includes('Android')) os = 'Android';
// // //     else if (userAgent.includes('iOS')) os = 'iOS';

// // //     const apiUrl = getApiUrl();
    
// // //     console.log('[Sigme SW Core]  Registering with API:', apiUrl);

// // //     const response = await fetch(`${apiUrl}/api/subscribers/register`, {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //       },
// // //       body: JSON.stringify({
// // //         websiteId: config.websiteId,
// // //         endpoint: endpoint,
// // //         p256dh: p256dh,
// // //         auth: auth,
// // //         platform: 'web',
// // //         browser: browser,
// // //         os: os
// // //       })
// // //     });

// // //     if (!response.ok) {
// // //       const errorText = await response.text();
// // //       console.error('[Sigme SW Core]  API Error:', errorText);
// // //       throw new Error(`HTTP ${response.status}: ${errorText}`);
// // //     }

// // //     const result = await response.json();

// // //     if (!result.success) {
// // //       throw new Error(result.error || 'Registration failed');
// // //     }

// // //     console.log('[Sigme SW Core]  Registration successful:', result);

// // //     // Notify all clients
// // //     const clients = await self.clients.matchAll();
// // //     clients.forEach(client => {
// // //       client.postMessage({
// // //         type: 'SIGME_SUBSCRIBED',
// // //         success: true,
// // //         data: result
// // //       });
// // //     });

// // //   } catch (error) {
// // //     console.error('[Sigme SW Core]  Registration failed:', error.message);

// // //     const clients = await self.clients.matchAll();
// // //     clients.forEach(client => {
// // //       client.postMessage({
// // //         type: 'SIGME_SUBSCRIBED',
// // //         success: false,
// // //         error: error.message
// // //       });
// // //     });
// // //   }
// // // }

// // // // ============================================
// // // // PUSH NOTIFICATION HANDLING
// // // // ============================================

// // // self.addEventListener('push', (event) => {
// // //   console.log('[Sigme SW Core]  Push received');

// // //   let notification = {
// // //     title: 'New Notification',
// // //     body: 'You have a new message',
// // //     icon: '/icon.png',
// // //     badge: '/badge.png',
// // //     data: {}
// // //   };

// // //   if (event.data) {
// // //     try {
// // //       const data = event.data.json();
// // //       console.log('[Sigme SW Core]  Push data:', data);
      
// // //       if (data.data) {
// // //         console.log('[Sigme SW Core]  Data object exists:', data.data);
// // //         console.log('[Sigme SW Core] subscriber_id:', data.data.subscriber_id);
// // //         console.log('[Sigme SW Core] campaign_id:', data.data.campaign_id);
// // //         console.log('[Sigme SW Core] journey_id:', data.data.journey_id);
// // //       } else {
// // //         console.error('[Sigme SW Core]  NO DATA OBJECT IN PUSH!');
// // //         console.error('[Sigme SW Core]  Push payload:', JSON.stringify(data));
// // //       }
      
// // //       notification = {
// // //         title: data.title || notification.title,
// // //         body: data.body || notification.body,
// // //         icon: data.icon || notification.icon,
// // //         badge: data.badge || notification.badge,
// // //         image: data.image,
// // //         tag: data.tag, // notification_log.id
// // //         data: data.data || {},
// // //       };
      
// // //       console.log('[Sigme SW Core] Notification data:', notification.data);
// // //     } catch (e) {
// // //       console.error('[Sigme SW Core]  Failed to parse push data:', e);
// // //     }
// // //   }

// // //   const options = {
// // //     body: notification.body,
// // //     icon: notification.icon,
// // //     badge: notification.badge,
// // //     image: notification.image,
// // //     tag: notification.tag,
// // //     data: notification.data,
// // //     requireInteraction: false,
// // //     vibrate: [200, 100, 200]
// // //   };

// // //   //  SHOW NOTIFICATION AND TRACK DELIVERY
// // //   const showAndTrackPromise = self.registration.showNotification(notification.title, options)
// // //     .then(() => {
// // //       console.log('[Sigme SW Core]  Notification shown successfully');
      
// // //       //  TRACK DELIVERY
// // //       if (notification.tag && notification.data && notification.data.subscriber_id) {
// // //         console.log('[Sigme SW Core]  Tracking delivery...');
        
// // //         return trackDelivery(
// // //           notification.tag, // notification_log.id
// // //           notification.data.subscriber_id,
// // //           notification.data.journey_id
// // //         );
// // //       } else {
// // //         console.warn('[Sigme SW Core]  Cannot track delivery - missing required data');
// // //         // console.warn('[Sigme SW Core] tag:', notification.tag);
// // //         // console.warn('[Sigme SW Core] subscriber_id:', notification.data?.subscriber_id);
// // //       }
// // //     })
// // //     .catch((error) => {
// // //       console.error('[Sigme SW Core]  Error showing notification:', error);
// // //     });

// // //   event.waitUntil(showAndTrackPromise);
// // // });

// // // // ============================================
// // // // NOTIFICATION CLICK HANDLING - FIXED
// // // // ============================================

// // // self.addEventListener('notificationclick', (event) => {
// // //   console.log('[Sigme SW Core] Notification clicked');
// // //   console.log('[Sigme SW Core]  Notification data:', event.notification.data);
  
// // //   event.notification.close();

// // //   const notificationData = event.notification.data || {};
// // //   let urlToOpen = notificationData.url || notificationData.click_url || '/';

// // //   if (!urlToOpen.startsWith('http')) {
// // //     const origin = self.location.origin;
// // //     urlToOpen = origin + (urlToOpen.startsWith('/') ? '' : '/') + urlToOpen;
// // //   }


// // //   console.log('[Sigme SW Core]  Final URL (absolute):', urlToOpen);

// // //    //  FIX: Track click AFTER opening window to avoid CORS during navigation
// // //   const openWindowPromise = self.clients.matchAll({ 
// // //     type: 'window', 
// // //     includeUncontrolled: true 
// // //   })
// // //   .then((clientList) => {
// // //     console.log('[Sigme SW Core]  Found', clientList.length, 'open windows');
    
// // //     const targetUrlObj = new URL(urlToOpen);
    
// // //     // Try to find an existing window from the same origin
// // //     for (const client of clientList) {
// // //       try {
// // //         const clientUrlObj = new URL(client.url);
        
// // //         if (clientUrlObj.origin === targetUrlObj.origin) {
// // //           console.log('[Sigme SW Core]  Navigating existing window');
// // //           return client.focus().then(() => client.navigate(urlToOpen));
// // //         }
// // //       } catch (e) {
// // //         console.warn('[Sigme SW Core]  Error parsing client URL:', e);
// // //       }
// // //     }
    
// // //     // Open new window
// // //     console.log('[Sigme SW Core]  Opening new window');
// // //     if (self.clients.openWindow) {
// // //       return self.clients.openWindow(urlToOpen);
// // //     }
// // //   })
// // //   .then(() => {
// // //     if (notificationData.subscriber_id) {
// // //       console.log('[Sigme SW Core] Tracking click event...');
      
// // //       return trackEvent(
// // //         'notification_clicked',
// // //         notificationData.subscriber_id,
// // //         {
// // //           url: urlToOpen,
// // //           campaign_id: notificationData.campaign_id || null,
// // //           journey_id: notificationData.journey_id || null,
// // //           journey_step_id: notificationData.journey_step_id || null,
// // //           user_journey_state_id: notificationData.user_journey_state_id || null,
// // //           title: event.notification.title,
// // //           clicked_at: new Date().toISOString()
// // //         }
// // //       );
// // //     }
// // //   })
// // //   .catch((error) => {
// // //     console.error('[Sigme SW Core]  Error handling click:', error);
// // //   });

// // //   event.waitUntil(openWindowPromise);
// // // });
// // //   //  TRACK NOTIFICATION CLICK
// // // //   if (notificationData.subscriber_id) {
// // // //     console.log('[Sigme SW Core]  Tracking click event...');
    
// // // //     const trackingPromise = trackEvent(
// // // //       'notification_clicked',
// // // //       notificationData.subscriber_id,
// // // //       {
// // // //         url: urlToOpen,
// // // //         campaign_id: notificationData.campaign_id || null,
// // // //         journey_id: notificationData.journey_id || null,
// // // //         journey_step_id: notificationData.journey_step_id || null,
// // // //         user_journey_state_id: notificationData.user_journey_state_id || null,
// // // //         title: event.notification.title,
// // // //         clicked_at: new Date().toISOString()
// // // //       }
// // // //     );

// // // //     event.waitUntil(trackingPromise);
// // // //   } else {
// // // //     console.error('[Sigme SW Core]  Cannot track click - missing subscriber_id');
// // // //     console.error('[Sigme SW Core]  Available data:', notificationData);
// // // //   }

// // // //   //  OPEN THE URL (FIXED: Navigate existing window or open new one)
// // // //   event.waitUntil(
// // // //     self.clients.matchAll({ type: 'window', includeUncontrolled: true })
// // // //       .then((clientList) => {
// // // //         console.log('[Sigme SW Core]  Found', clientList.length, 'open windows');
        
// // // //         const targetUrlObj = new URL(urlToOpen);
        
// // // //         // Try to find an existing window from the same origin to navigate
// // // //         for (const client of clientList) {
// // // //           try {
// // // //             const clientUrlObj = new URL(client.url);
            
// // // //             // If same origin, navigate this window
// // // //             if (clientUrlObj.origin === targetUrlObj.origin) {
// // // //               console.log('[Sigme SW Core]  Navigating existing window to:', urlToOpen);
// // // //               return client.focus().then(() => client.navigate(urlToOpen));
// // // //             }
// // // //           } catch (e) {
// // // //             console.warn('[Sigme SW Core]  Error parsing client URL:', e);
// // // //           }
// // // //         }
        
// // // //         // No suitable window found, open a new one
// // // //         console.log('[Sigme SW Core]  Opening new window:', urlToOpen);
// // // //         if (self.clients.openWindow) {
// // // //           return self.clients.openWindow(urlToOpen);
// // // //         }
// // // //       })
// // // //       .catch((error) => {
// // // //         console.error('[Sigme SW Core]  Error handling notification click:', error);
// // // //       })
// // // //   );
// // // // });

// // // // ============================================
// // // // EVENT TRACKING
// // // // ============================================

// // // /**
// // //  *  Track custom events
// // //  */
// // // async function trackEvent(eventName, subscriberId, properties = {}) {
// // //   try {
// // //     const apiUrl = getApiUrl();
// // //     const trackingUrl = `${apiUrl}/api/events/track`;
    
// // //     // console.log(`[Sigme SW Core]  Tracking: ${eventName}`);
// // //     // console.log(`[Sigme SW Core] API URL: ${trackingUrl}`);
// // //     // console.log(`[Sigme SW Core]  Subscriber: ${subscriberId}`);
// // //     // console.log(`[Sigme SW Core]  Properties:`, properties);

// // //     //  INCLUDE WEBSITE_ID FROM CONFIG
// // //     const config = await getConfig();
// // //     const payload = {
// // //       subscriber_id: subscriberId,
// // //       event_name: eventName,
// // //       properties: properties,
// // //       website_id: config?.websiteId || null,
// // //     };

// // //     console.log(`[Sigme SW Core]  Sending payload:`, JSON.stringify(payload, null, 2));

// // //     const response = await fetch(trackingUrl, {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //       },
// // //       body: JSON.stringify(payload)
// // //     });

// // //     console.log(`[Sigme SW Core]  Response status: ${response.status}`);

// // //     if (response.ok) {
// // //       const result = await response.json();
// // //       console.log(`[Sigme SW Core]  Event tracked successfully:`, result);
// // //       return result;
// // //     } else {
// // //       const errorText = await response.text();
// // //       console.error(`[Sigme SW Core]  Tracking failed (${response.status}):`, errorText);
// // //     }
// // //   } catch (err) {
// // //     console.error(`[Sigme SW Core]  Tracking error:`, err);
// // //   }
// // // }

// // // /**
// // //  *  Track notification delivery
// // //  */
// // // async function trackDelivery(notificationId, subscriberId, journeyId) {
// // //   try {
// // //     const apiUrl = getApiUrl();
// // //     const deliveryUrl = `${apiUrl}/api/notifications/track-delivery`;
    
// // //     console.log('[Sigme SW Core]  Tracking delivery for notification:', notificationId);

// // //     const payload = {
// // //       notification_id: notificationId,
// // //       subscriber_id: subscriberId,
// // //       journey_id: journeyId || null,
// // //       delivered_at: new Date().toISOString(),
// // //     };

// // //     console.log('[Sigme SW Core]  Delivery payload:', JSON.stringify(payload, null, 2));

// // //     const response = await fetch(deliveryUrl, {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //       },
// // //       body: JSON.stringify(payload)
// // //     });

// // //     console.log('[Sigme SW Core]  Delivery response status:', response.status);

// // //     if (response.ok) {
// // //       const result = await response.json();
// // //       console.log('[Sigme SW Core]  Delivery tracked successfully:', result);
// // //       return result;
// // //     } else {
// // //       const errorText = await response.text();
// // //       console.error('[Sigme SW Core]  Delivery tracking failed:', errorText);
// // //     }
// // //   } catch (err) {
// // //     console.error('[Sigme SW Core]  Delivery tracking error:', err);
// // //   }
// // // }

// // // // ============================================
// // // // UTILITY FUNCTIONS
// // // // ============================================

// // // /**
// // //  * Convert VAPID key from base64 to Uint8Array
// // //  */
// // // function urlBase64ToUint8Array(base64String) {
// // //   const padding = '='.repeat((4 - base64String.length % 4) % 4);
// // //   const base64 = (base64String + padding)
// // //     .replace(/\-/g, '+')
// // //     .replace(/_/g, '/');

// // //   const rawData = atob(base64);
// // //   const outputArray = new Uint8Array(rawData.length);

// // //   for (let i = 0; i < rawData.length; ++i) {
// // //     outputArray[i] = rawData.charCodeAt(i);
// // //   }
// // //   return outputArray;
// // // }

// // // // ============================================
// // // // READY
// // // // ============================================

// // // console.log('[Sigme SW Core]  Ready');









































// // // ============================================
// // // BACKEND/public/sigme-sw-core.js
// // // Core Service Worker Logic (imported by client proxies)
// // // FIXED: Notification click now uses sendBeacon to avoid CORS errors
// // // ============================================

// // console.log('[Sigme SW Core] Loading...');

// // // ============================================
// // // GLOBAL STATE
// // // ============================================
// // let websiteConfig = null;

// // // ============================================
// // // LIFECYCLE EVENTS
// // // ============================================

// // // Install event
// // self.addEventListener('install', (event) => {
// //   console.log('[Sigme SW Core] Installing...');
// //   self.skipWaiting();
// // });

// // // Activate event
// // self.addEventListener('activate', (event) => {
// //   console.log('[Sigme SW Core] Activating...');
// //   event.waitUntil(self.clients.claim());
// // });

// // // ============================================
// // // MESSAGE HANDLING
// // // ============================================

// // // Listen for messages from the client
// // self.addEventListener('message', async (event) => {
// //   const { type, config } = event.data;

// //   if (type === 'SIGME_INIT') {
// //     // console.log('[Sigme SW Core]  Received configuration:', config);
// //     websiteConfig = config;
    
// //     // Store config in IndexedDB for persistence
// //     try {
// //       const db = await openConfigDB();
// //       await saveConfig(db, config);
// //       console.log('[Sigme SW Core]  Config saved to IndexedDB');
// //     } catch (err) {
// //       console.warn('[Sigme SW Core]  Could not save config to IndexedDB:', err);
// //     }
// //   }

// //   if (type === 'SIGME_SUBSCRIBE') {
// //     console.log('[Sigme SW Core]  Subscribe request received');
// //     await handleSubscribe(event);
// //   }
// // });

// // // ============================================
// // // INDEXEDDB HELPERS (Config Persistence)
// // // ============================================

// // function openConfigDB() {
// //   return new Promise((resolve, reject) => {
// //     const request = indexedDB.open('SigmeConfig', 1);
    
// //     request.onerror = () => reject(request.error);
// //     request.onsuccess = () => resolve(request.result);
    
// //     request.onupgradeneeded = (event) => {
// //       const db = event.target.result;
// //       if (!db.objectStoreNames.contains('config')) {
// //         db.createObjectStore('config');
// //       }
// //     };
// //   });
// // }

// // function saveConfig(db, config) {
// //   return new Promise((resolve, reject) => {
// //     const transaction = db.transaction(['config'], 'readwrite');
// //     const store = transaction.objectStore('config');
// //     const request = store.put(config, 'websiteConfig');
    
// //     request.onerror = () => reject(request.error);
// //     request.onsuccess = () => resolve();
// //   });
// // }

// // function loadConfig(db) {
// //   return new Promise((resolve, reject) => {
// //     const transaction = db.transaction(['config'], 'readonly');
// //     const store = transaction.objectStore('config');
// //     const request = store.get('websiteConfig');
    
// //     request.onerror = () => reject(request.error);
// //     request.onsuccess = () => resolve(request.result);
// //   });
// // }

// // // Load config from IndexedDB if not in memory
// // async function getConfig() {
// //   if (websiteConfig) {
// //     return websiteConfig;
// //   }
  
// //   try {
// //     const db = await openConfigDB();
// //     const config = await loadConfig(db);
// //     if (config) {
// //       websiteConfig = config;
// //       // console.log('[Sigme SW Core]  Config loaded from IndexedDB');
// //       return config;
// //     }
// //   } catch (err) {
// //     console.warn('[Sigme SW Core]  Could not load config from IndexedDB:', err);
// //   }
  
// //   return null;
// // }

// // // Get API URL - with fallback to current origin
// // function getApiUrl() {
// //   if (websiteConfig && websiteConfig.apiUrl) {
// //     return websiteConfig.apiUrl;
// //   }
  
// //   // Fallback: try to determine from the script location
// //   try {
// //     const scriptUrl = new URL(self.location.href);
// //     const apiUrl = scriptUrl.origin;
// //     console.log('[Sigme SW Core] Using API URL from origin:', apiUrl);
// //     return apiUrl;
// //   } catch (e) {
// //     console.error('[Sigme SW Core]  Could not determine API URL:', e);
// //     return 'http://localhost:3000'; // Development fallback
// //   }
// // }

// // // ============================================
// // // SUBSCRIPTION HANDLING
// // // ============================================

// // async function handleSubscribe(event) {
// //   try {
// //     const config = await getConfig();
    
// //     if (!config) {
// //       throw new Error('Configuration not loaded');
// //     }

// //     const vapidPublicKey = config.vapidPublicKey;
    
// //     if (!vapidPublicKey) {
// //       throw new Error('VAPID public key not found in configuration');
// //     }

// //     console.log('[Sigme SW Core]  Subscribing with VAPID key...');

// //     const subscription = await self.registration.pushManager.subscribe({
// //       userVisibleOnly: true,
// //       applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
// //     });

// //     console.log('[Sigme SW Core]  Subscription obtained');

// //     const subscriptionJSON = subscription.toJSON();
// //     const endpoint = subscriptionJSON.endpoint;
// //     const keys = subscriptionJSON.keys || {};
    
// //     const p256dh = keys.p256dh;
// //     const auth = keys.auth;

// //     if (!endpoint || !p256dh || !auth) {
// //       throw new Error('Invalid subscription format - missing keys');
// //     }

// //     // Detect browser and OS
// //     const userAgent = self.navigator.userAgent || '';
// //     let browser = 'Unknown';
// //     let os = 'Unknown';

// //     if (userAgent.includes('Chrome')) browser = 'Chrome';
// //     else if (userAgent.includes('Firefox')) browser = 'Firefox';
// //     else if (userAgent.includes('Safari')) browser = 'Safari';
// //     else if (userAgent.includes('Edge')) browser = 'Edge';

// //     if (userAgent.includes('Windows')) os = 'Windows';
// //     else if (userAgent.includes('Mac')) os = 'macOS';
// //     else if (userAgent.includes('Linux')) os = 'Linux';
// //     else if (userAgent.includes('Android')) os = 'Android';
// //     else if (userAgent.includes('iOS')) os = 'iOS';

// //     const apiUrl = getApiUrl();
    
// //     console.log('[Sigme SW Core]  Registering with API:', apiUrl);

// //     const response = await fetch(`${apiUrl}/api/subscribers/register`, {
// //       method: 'POST',
// //       headers: {
// //         'Content-Type': 'application/json',
// //       },
// //       body: JSON.stringify({
// //         websiteId: config.websiteId,
// //         endpoint: endpoint,
// //         p256dh: p256dh,
// //         auth: auth,
// //         platform: 'web',
// //         browser: browser,
// //         os: os
// //       })
// //     });

// //     if (!response.ok) {
// //       const errorText = await response.text();
// //       console.error('[Sigme SW Core]  API Error:', errorText);
// //       throw new Error(`HTTP ${response.status}: ${errorText}`);
// //     }

// //     const result = await response.json();

// //     if (!result.success) {
// //       throw new Error(result.error || 'Registration failed');
// //     }

// //     console.log('[Sigme SW Core]  Registration successful:', result);

// //     // Notify all clients
// //     const clients = await self.clients.matchAll();
// //     clients.forEach(client => {
// //       client.postMessage({
// //         type: 'SIGME_SUBSCRIBED',
// //         success: true,
// //         data: result
// //       });
// //     });

// //   } catch (error) {
// //     console.error('[Sigme SW Core]  Registration failed:', error.message);

// //     const clients = await self.clients.matchAll();
// //     clients.forEach(client => {
// //       client.postMessage({
// //         type: 'SIGME_SUBSCRIBED',
// //         success: false,
// //         error: error.message
// //       });
// //     });
// //   }
// // }

// // // ============================================
// // // PUSH NOTIFICATION HANDLING
// // // ============================================

// // // self.addEventListener('push', (event) => {
// // //   console.log('[Sigme SW Core]  Push received');

// // //   let notification = {
// // //     title: 'New Notification',
// // //     body: 'You have a new message',
// // //     icon: '/icon.png',
// // //     badge: '/badge.png',
// // //     data: {}
// // //   };

// // //   if (event.data) {
// // //     try {
// // //       const data = event.data.json();
// // //       console.log('[Sigme SW Core]  Push data:', data);
      
// // //       if (data.data) {
// // //         console.log('[Sigme SW Core]  Data object exists:', data.data);
// // //         console.log('[Sigme SW Core] subscriber_id:', data.data.subscriber_id);
// // //         console.log('[Sigme SW Core] campaign_id:', data.data.campaign_id);
// // //         console.log('[Sigme SW Core] journey_id:', data.data.journey_id);
// // //       } else {
// // //         console.error('[Sigme SW Core]  NO DATA OBJECT IN PUSH!');
// // //         console.error('[Sigme SW Core]  Push payload:', JSON.stringify(data));
// // //       }
      
// // //       notification = {
// // //         title: data.title || notification.title,
// // //         body: data.body || notification.body,
// // //         icon: data.icon || notification.icon,
// // //         badge: data.badge || notification.badge,
// // //         image: data.image,
// // //         tag: data.tag, // notification_log.id
// // //         data: data.data || {},
// // //       };
      
// // //       console.log('[Sigme SW Core] Notification data:', notification.data);
// // //     } catch (e) {
// // //       console.error('[Sigme SW Core]  Failed to parse push data:', e);
// // //     }
// // //   }

// // //   const options = {
// // //     body: notification.body,
// // //     icon: notification.icon,
// // //     badge: notification.badge,
// // //     image: notification.image,
// // //     tag: notification.tag,
// // //     data: notification.data,
// // //     requireInteraction: false,
// // //     vibrate: [200, 100, 200]
// // //   };

// // //   //  SHOW NOTIFICATION AND TRACK DELIVERY
// // //   const showAndTrackPromise = self.registration.showNotification(notification.title, options)
// // //     .then(() => {
// // //       console.log('[Sigme SW Core]  Notification shown successfully');
      
// // //       //  TRACK DELIVERY
// // //       if (notification.tag && notification.data && notification.data.subscriber_id) {
// // //         console.log('[Sigme SW Core]  Tracking delivery...');
        
// // //         return trackDelivery(
// // //           notification.tag, // notification_log.id
// // //           notification.data.subscriber_id,
// // //           notification.data.journey_id
// // //         );
// // //       } else {
// // //         console.warn('[Sigme SW Core]  Cannot track delivery - missing required data');
// // //         // console.warn('[Sigme SW Core] tag:', notification.tag);
// // //         // console.warn('[Sigme SW Core] subscriber_id:', notification.data?.subscriber_id);
// // //       }
// // //     })
// // //     .catch((error) => {
// // //       console.error('[Sigme SW Core]  Error showing notification:', error);
// // //     });

// // //   event.waitUntil(showAndTrackPromise);
// // // });


// // // ============================================
// // // PUSH NOTIFICATION HANDLING - FIXED
// // // ============================================

// // self.addEventListener('push', (event) => {
// //   console.log('[Sigme SW Core] Push received');

// //   let notification = {
// //     title: 'New Notification',
// //     body: 'You have a new message',
// //     icon: '/icon.png',
// //     badge: '/badge.png',
// //     data: {}
// //   };

// //   if (event.data) {
// //     try {
// //       const data = event.data.json();
// //       console.log('[Sigme SW Core] Push data:', data);
      
// //       if (data.data) {
// //         console.log('[Sigme SW Core] Data object exists');
// //         console.log('[Sigme SW Core]   - subscriber_id:', data.data.subscriber_id);
// //         console.log('[Sigme SW Core]   - campaign_id:', data.data.campaign_id);
// //         console.log('[Sigme SW Core]   - notification_id:', data.data.notification_id);
// //       } else {
// //         console.error('[Sigme SW Core]  NO DATA OBJECT IN PUSH!');
// //       }
      
// //       notification = {
// //         title: data.title || notification.title,
// //         body: data.body || notification.body,
// //         icon: data.icon || notification.icon,
// //         badge: data.badge || notification.badge,
// //         image: data.image,
// //         tag: data.tag,
// //         data: data.data || {},
// //       };
      
// //       console.log('[Sigme SW Core]  Notification data:', notification.data);
// //     } catch (e) {
// //       console.error('[Sigme SW Core]  Failed to parse push data:', e);
// //     }
// //   }

// //   const options = {
// //     body: notification.body,
// //     icon: notification.icon,
// //     badge: notification.badge,
// //     image: notification.image,
// //     tag: notification.tag,
// //     data: notification.data,
// //     requireInteraction: false,
// //     vibrate: [200, 100, 200]
// //   };

// //   // FIX: Track delivery FIRST, then show notification
// //   // This ensures tracking completes even if service worker terminates
// //   const trackAndShowPromise = (async () => {
// //     try {
// //       // 1️ Track delivery FIRST
// //       if (notification.tag && notification.data && notification.data.subscriber_id) {
// //         console.log('[Sigme SW Core]  Tracking delivery...');
        
// //         await trackDelivery(
// //           notification.tag, // notification_log.id
// //           notification.data.subscriber_id,
// //           notification.data.journey_id
// //         );
        
// //         console.log('[Sigme SW Core]  Delivery tracked successfully');
// //       } else {
// //         console.warn('[Sigme SW Core]   Cannot track delivery - missing data');
// //         console.warn('[Sigme SW Core]   - tag:', notification.tag);
// //         console.warn('[Sigme SW Core]   - subscriber_id:', notification.data?.subscriber_id);
// //       }
      
// //       // 2️⃣ Show notification AFTER tracking
// //       await self.registration.showNotification(notification.title, options);
// //       console.log('[Sigme SW Core]  Notification shown');
      
// //     } catch (error) {
// //       console.error('[Sigme SW Core]  Error in track/show:', error);
      
// //       // Even if tracking fails, still show the notification
// //       try {
// //         await self.registration.showNotification(notification.title, options);
// //         console.log('[Sigme SW Core]  Notification shown (despite tracking error)');
// //       } catch (showError) {
// //         console.error('[Sigme SW Core]  Failed to show notification:', showError);
// //       }
// //     }
// //   })();

// //   event.waitUntil(trackAndShowPromise);
// // });

// // // ============================================
// // // NOTIFICATION CLICK HANDLING - FIXED
// // // ============================================

// // self.addEventListener('notificationclick', (event) => {
// //   console.log('[Sigme SW Core] Notification clicked');
// //   console.log('[Sigme SW Core]  Notification data:', event.notification.data);
  
// //   event.notification.close();

// //   const notificationData = event.notification.data || {};
// //   let urlToOpen = notificationData.url || notificationData.click_url || '/';

// //   if (!urlToOpen.startsWith('http')) {
// //     const origin = self.location.origin;
// //     urlToOpen = origin + (urlToOpen.startsWith('/') ? '' : '/') + urlToOpen;
// //   }

// //   console.log('[Sigme SW Core]  Final URL (absolute):', urlToOpen);

// //   //  FIX: Track click using sendBeacon BEFORE navigation to avoid CORS issues
// //   // sendBeacon is fire-and-forget and doesn't interfere with navigation
// //   if (notificationData.subscriber_id) {
// //     try {
// //       const apiUrl = getApiUrl();
// //       const trackingUrl = `${apiUrl}/api/events/track`;
      
// //       const payload = JSON.stringify({
// //         subscriber_id: notificationData.subscriber_id,
// //         event_name: 'notification_clicked',
// //         website_id: notificationData.website_id || null,
// //         properties: {
// //           url: urlToOpen,

// //           campaign_id: notificationData.campaign_id || null,
// //           journey_id: notificationData.journey_id || null,
// //           journey_step_id: notificationData.journey_step_id || null,
// //           user_journey_state_id: notificationData.user_journey_state_id || null,
// //           title: event.notification.title,
// //           clicked_at: new Date().toISOString()
// //         }
// //       });

// //       // Use sendBeacon for reliable tracking during navigation
// //       const blob = new Blob([payload], { type: 'application/json' });
// //       const sent = self.navigator.sendBeacon(trackingUrl, blob);
      
// //       console.log('[Sigme SW Core] Click tracking sent via beacon:', sent);
// //     } catch (beaconError) {
// //       console.warn('[Sigme SW Core]  Beacon tracking failed:', beaconError);
// //     }
// //   }

// //   //  Now navigate to the URL
// //   const openWindowPromise = self.clients.matchAll({ 
// //     type: 'window', 
// //     includeUncontrolled: true 
// //   })
// //   .then((clientList) => {
// //     console.log('[Sigme SW Core]  Found', clientList.length, 'open windows');
    
// //     const targetUrlObj = new URL(urlToOpen);
    
// //     // Try to find an existing window from the same origin
// //     for (const client of clientList) {
// //       try {
// //         const clientUrlObj = new URL(client.url);
        
// //         if (clientUrlObj.origin === targetUrlObj.origin) {
// //           console.log('[Sigme SW Core]  Navigating existing window');
// //           return client.focus().then(() => client.navigate(urlToOpen));
// //         }
// //       } catch (e) {
// //         console.warn('[Sigme SW Core]  Error parsing client URL:', e);
// //       }
// //     }
    
// //     // Open new window
// //     console.log('[Sigme SW Core]  Opening new window');
// //     if (self.clients.openWindow) {
// //       return self.clients.openWindow(urlToOpen);
// //     }
// //   })
// //   .catch((error) => {
// //     console.error('[Sigme SW Core]  Error handling click:', error);
// //   });

// //   event.waitUntil(openWindowPromise);
// // });

// // // ============================================
// // // EVENT TRACKING
// // // ============================================

// // /**
// //  *  Track custom events
// //  */
// // async function trackEvent(eventName, subscriberId, properties = {}) {
// //   try {
// //     const apiUrl = getApiUrl();
// //     const trackingUrl = `${apiUrl}/api/events/track`;
    
// //     // console.log(`[Sigme SW Core]  Tracking: ${eventName}`);
// //     // console.log(`[Sigme SW Core] API URL: ${trackingUrl}`);
// //     // console.log(`[Sigme SW Core]  Subscriber: ${subscriberId}`);
// //     // console.log(`[Sigme SW Core]  Properties:`, properties);

// //     //  INCLUDE WEBSITE_ID FROM CONFIG
// //     const config = await getConfig();
// //     const payload = {
// //       subscriber_id: subscriberId,
// //       event_name: eventName,
// //       properties: properties,
// //       website_id: config?.websiteId || null,
// //     };

// //     console.log(`[Sigme SW Core]  Sending payload:`, JSON.stringify(payload, null, 2));

// //     const response = await fetch(trackingUrl, {
// //       method: 'POST',
// //       headers: {
// //         'Content-Type': 'application/json',
// //       },
// //       body: JSON.stringify(payload)
// //     });

// //     console.log(`[Sigme SW Core]  Response status: ${response.status}`);

// //     if (response.ok) {
// //       const result = await response.json();
// //       console.log(`[Sigme SW Core]  Event tracked successfully:`, result);
// //       return result;
// //     } else {
// //       const errorText = await response.text();
// //       console.error(`[Sigme SW Core]  Tracking failed (${response.status}):`, errorText);
// //     }
// //   } catch (err) {
// //     console.error(`[Sigme SW Core]  Tracking error:`, err);
// //   }
// // }

// // /**
// //  *  Track notification delivery
// //  */
// // // async function trackDelivery(notificationId, subscriberId, journeyId) {
// // //   try {
// // //     const apiUrl = getApiUrl();
// // //     const deliveryUrl = `${apiUrl}/api/notifications/track-delivery`;
    
// // //     console.log('[Sigme SW Core]  Tracking delivery for notification:', notificationId);

// // //     const payload = {
// // //       notification_id: notificationId,
// // //       subscriber_id: subscriberId,
// // //       journey_id: journeyId || null,
// // //       delivered_at: new Date().toISOString(),
// // //     };

// // //     console.log('[Sigme SW Core]  Delivery payload:', JSON.stringify(payload, null, 2));

// // //     const response = await fetch(deliveryUrl, {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //       },
// // //       body: JSON.stringify(payload)
// // //     });

// // //     console.log('[Sigme SW Core]  Delivery response status:', response.status);

// // //     if (response.ok) {
// // //       const result = await response.json();
// // //       console.log('[Sigme SW Core]  Delivery tracked successfully:', result);
// // //       return result;
// // //     } else {
// // //       const errorText = await response.text();
// // //       console.error('[Sigme SW Core]  Delivery tracking failed:', errorText);
// // //     }
// // //   } catch (err) {
// // //     console.error('[Sigme SW Core]  Delivery tracking error:', err);
// // //   }
// // // }

// // // ============================================
// // // UTILITY FUNCTIONS
// // // ============================================


// // /**
// //  * Track notification delivery
// //  */
// // async function trackDelivery(notificationId, subscriberId, journeyId) {
// //   try {
// //     const apiUrl = getApiUrl();
// //     const deliveryUrl = `${apiUrl}/api/notifications/track-delivery`;
    
// //     console.log('[Sigme SW Core] Tracking delivery');
// //     console.log('[Sigme SW Core]   - Notification ID:', notificationId);
// //     console.log('[Sigme SW Core]   - Subscriber ID:', subscriberId);
// //     console.log('[Sigme SW Core]   - Journey ID:', journeyId);

// //     // Validate required fields
// //     if (!notificationId) {
// //       console.error('[Sigme SW Core]  Missing notification_id - cannot track');
// //       return null;
// //     }
    
// //     if (!subscriberId) {
// //       console.error('[Sigme SW Core]  Missing subscriber_id - cannot track');
// //       return null;
// //     }

// //     const payload = {
// //       notification_id: notificationId,
// //       subscriber_id: subscriberId,
// //       journey_id: journeyId || null,
// //       delivered_at: new Date().toISOString(),
// //     };

// //     console.log('[Sigme SW Core]  Sending payload:', JSON.stringify(payload, null, 2));

// //     const response = await fetch(deliveryUrl, {
// //       method: 'POST',
// //       headers: {
// //         'Content-Type': 'application/json',
// //       },
// //       body: JSON.stringify(payload)
// //     });

// //     console.log('[Sigme SW Core]  Response status:', response.status);

// //     if (response.ok) {
// //       const result = await response.json();
// //       console.log('[Sigme SW Core]  Delivery tracked successfully:', result);
// //       return result;
// //     } else {
// //       const errorText = await response.text();
// //       console.error('[Sigme SW Core]  Delivery tracking failed:', errorText);
// //       return null;
// //     }
// //   } catch (err) {
// //     console.error('[Sigme SW Core]  Delivery tracking error:', err);
// //     return null;
// //   }
// // }
// // /**
// //  * Convert VAPID key from base64 to Uint8Array
// //  */
// // function urlBase64ToUint8Array(base64String) {
// //   const padding = '='.repeat((4 - base64String.length % 4) % 4);
// //   const base64 = (base64String + padding)
// //     .replace(/\-/g, '+')
// //     .replace(/_/g, '/');

// //   const rawData = atob(base64);
// //   const outputArray = new Uint8Array(rawData.length);

// //   for (let i = 0; i < rawData.length; ++i) {
// //     outputArray[i] = rawData.charCodeAt(i);
// //   }
// //   return outputArray;
// // }

// // // ============================================
// // // READY
// // // ============================================

// // console.log('[Sigme SW Core]  Ready');

























// // ============================================
// // BACKEND/public/sigme-sw-core.js
// // Core Service Worker Logic (imported by client proxies)
// // FIXED: Removed duplicate delivery tracking - only handles click tracking now
// // ============================================

// console.log('[Sigme SW Core] Loading...');

// // ============================================
// // GLOBAL STATE
// // ============================================
// let websiteConfig = null;

// // ============================================
// // LIFECYCLE EVENTS
// // ============================================

// // Install event
// self.addEventListener('install', (event) => {
//   console.log('[Sigme SW Core] Installing...');
//   self.skipWaiting();
// });

// // Activate event
// self.addEventListener('activate', (event) => {
//   console.log('[Sigme SW Core] Activating...');
//   event.waitUntil(self.clients.claim());
// });

// // ============================================
// // MESSAGE HANDLING
// // ============================================

// // Listen for messages from the client
// self.addEventListener('message', async (event) => {
//   const { type, config } = event.data;

//   if (type === 'SIGME_INIT') {
//     websiteConfig = config;
    
//     // Store config in IndexedDB for persistence
//     try {
//       const db = await openConfigDB();
//       await saveConfig(db, config);
//       console.log('[Sigme SW Core] Config saved to IndexedDB');
//     } catch (err) {
//       console.warn('[Sigme SW Core] Could not save config to IndexedDB:', err);
//     }
//   }

//   if (type === 'SIGME_SUBSCRIBE') {
//     console.log('[Sigme SW Core] Subscribe request received');
//     await handleSubscribe(event);
//   }
// });

// // ============================================
// // INDEXEDDB HELPERS (Config Persistence)
// // ============================================

// function openConfigDB() {
//   return new Promise((resolve, reject) => {
//     const request = indexedDB.open('SigmeConfig', 1);
    
//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => resolve(request.result);
    
//     request.onupgradeneeded = (event) => {
//       const db = event.target.result;
//       if (!db.objectStoreNames.contains('config')) {
//         db.createObjectStore('config');
//       }
//     };
//   });
// }

// function saveConfig(db, config) {
//   return new Promise((resolve, reject) => {
//     const transaction = db.transaction(['config'], 'readwrite');
//     const store = transaction.objectStore('config');
//     const request = store.put(config, 'websiteConfig');
    
//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => resolve();
//   });
// }

// function loadConfig(db) {
//   return new Promise((resolve, reject) => {
//     const transaction = db.transaction(['config'], 'readonly');
//     const store = transaction.objectStore('config');
//     const request = store.get('websiteConfig');
    
//     request.onerror = () => reject(request.error);
//     request.onsuccess = () => resolve(request.result);
//   });
// }

// // Load config from IndexedDB if not in memory
// async function getConfig() {
//   if (websiteConfig) {
//     return websiteConfig;
//   }
  
//   try {
//     const db = await openConfigDB();
//     const config = await loadConfig(db);
//     if (config) {
//       websiteConfig = config;
//       return config;
//     }
//   } catch (err) {
//     console.warn('[Sigme SW Core] Could not load config from IndexedDB:', err);
//   }
  
//   return null;
// }

// // Get API URL - with fallback to current origin
// function getApiUrl() {
//   if (websiteConfig && websiteConfig.apiUrl) {
//     return websiteConfig.apiUrl;
//   }
  
//   try {
//     const scriptUrl = new URL(self.location.href);
//     const apiUrl = scriptUrl.origin;
//     console.log('[Sigme SW Core] Using API URL from origin:', apiUrl);
//     return apiUrl;
//   } catch (e) {
//     console.error('[Sigme SW Core] Could not determine API URL:', e);
//     return 'http://localhost:3000'; // Development fallback
//   }
// }

// // ============================================
// // SUBSCRIPTION HANDLING
// // ============================================

// async function handleSubscribe(event) {
//   try {
//     const config = await getConfig();
    
//     if (!config) {
//       throw new Error('Configuration not loaded');
//     }

//     const vapidPublicKey = config.vapidPublicKey;
    
//     if (!vapidPublicKey) {
//       throw new Error('VAPID public key not found in configuration');
//     }

//     console.log('[Sigme SW Core] Subscribing with VAPID key...');

//     const subscription = await self.registration.pushManager.subscribe({
//       userVisibleOnly: true,
//       applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
//     });

//     console.log('[Sigme SW Core] Subscription obtained');

//     const subscriptionJSON = subscription.toJSON();
//     const endpoint = subscriptionJSON.endpoint;
//     const keys = subscriptionJSON.keys || {};
    
//     const p256dh = keys.p256dh;
//     const auth = keys.auth;

//     if (!endpoint || !p256dh || !auth) {
//       throw new Error('Invalid subscription format - missing keys');
//     }

//     // Detect browser and OS
//     const userAgent = self.navigator.userAgent || '';
//     let browser = 'Unknown';
//     let os = 'Unknown';

//     if (userAgent.includes('Chrome')) browser = 'Chrome';
//     else if (userAgent.includes('Firefox')) browser = 'Firefox';
//     else if (userAgent.includes('Safari')) browser = 'Safari';
//     else if (userAgent.includes('Edge')) browser = 'Edge';

//     if (userAgent.includes('Windows')) os = 'Windows';
//     else if (userAgent.includes('Mac')) os = 'macOS';
//     else if (userAgent.includes('Linux')) os = 'Linux';
//     else if (userAgent.includes('Android')) os = 'Android';
//     else if (userAgent.includes('iOS')) os = 'iOS';

//     const apiUrl = getApiUrl();
    
//     console.log('[Sigme SW Core] Registering with API:', apiUrl);

//     const response = await fetch(`${apiUrl}/api/subscribers/register`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         websiteId: config.websiteId,
//         endpoint: endpoint,
//         p256dh: p256dh,
//         auth: auth,
//         platform: 'web',
//         browser: browser,
//         os: os
//       })
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('[Sigme SW Core] API Error:', errorText);
//       throw new Error(`HTTP ${response.status}: ${errorText}`);
//     }

//     const result = await response.json();

//     if (!result.success) {
//       throw new Error(result.error || 'Registration failed');
//     }

//     console.log('[Sigme SW Core] Registration successful:', result);

//     // Notify all clients
//     const clients = await self.clients.matchAll();
//     clients.forEach(client => {
//       client.postMessage({
//         type: 'SIGME_SUBSCRIBED',
//         success: true,
//         data: result
//       });
//     });

//   } catch (error) {
//     console.error('[Sigme SW Core] Registration failed:', error.message);

//     const clients = await self.clients.matchAll();
//     clients.forEach(client => {
//       client.postMessage({
//         type: 'SIGME_SUBSCRIBED',
//         success: false,
//         error: error.message
//       });
//     });
//   }
// }

// // ============================================
// // PUSH NOTIFICATION HANDLING
// // ============================================

// self.addEventListener('push', (event) => {
//   console.log('[Sigme SW Core] Push received');

//   let notification = {
//     title: 'New Notification',
//     body: 'You have a new message',
//     icon: '/icon.png',
//     badge: '/badge.png',
//     data: {}
//   };

//   if (event.data) {
//     try {
//       const data = event.data.json();
//       console.log('[Sigme SW Core] Push data:', data);
      
//       if (data.data) {
//         console.log('[Sigme SW Core] Data object exists');
//         console.log('[Sigme SW Core]   - subscriber_id:', data.data.subscriber_id);
//         console.log('[Sigme SW Core]   - campaign_id:', data.data.campaign_id);
//         console.log('[Sigme SW Core]   - notification_id:', data.data.notification_id);
//       } else {
//         console.error('[Sigme SW Core]  NO DATA OBJECT IN PUSH!');
//       }
      
//       notification = {
//         title: data.title || notification.title,
//         body: data.body || notification.body,
//         icon: data.icon || notification.icon,
//         badge: data.badge || notification.badge,
//         image: data.image,
//         tag: data.tag,
//         data: data.data || {},
//       };
      
//       console.log('[Sigme SW Core] Notification data:', notification.data);
//     } catch (e) {
//       console.error('[Sigme SW Core] Failed to parse push data:', e);
//     }
//   }

//   const options = {
//     body: notification.body,
//     icon: notification.icon,
//     badge: notification.badge,
//     image: notification.image,
//     tag: notification.tag,
//     data: notification.data,
//     requireInteraction: false,
//     vibrate: [200, 100, 200]
//   };

//   // FIXED: Just show the notification - delivery already tracked server-side
//   const showNotificationPromise = self.registration.showNotification(notification.title, options)
//     .then(() => {
//       console.log('[Sigme SW Core] Notification shown successfully');
//     })
//     .catch((error) => {
//       console.error('[Sigme SW Core]  Error showing notification:', error);
//     });

//   event.waitUntil(showNotificationPromise);
// });

// // ============================================
// // NOTIFICATION CLICK HANDLING
// // ============================================

// self.addEventListener('notificationclick', (event) => {
//   console.log('[Sigme SW Core] Notification clicked');
//   console.log('[Sigme SW Core] Notification data:', event.notification.data);
  
//   event.notification.close();

//   const notificationData = event.notification.data || {};
//   let urlToOpen = notificationData.url || notificationData.click_url || '/';

//   if (!urlToOpen.startsWith('http')) {
//     const origin = self.location.origin;
//     urlToOpen = origin + (urlToOpen.startsWith('/') ? '' : '/') + urlToOpen;
//   }

//   console.log('[Sigme SW Core] Final URL (absolute):', urlToOpen);

//   // Track click using sendBeacon BEFORE navigation to avoid CORS issues
//   if (notificationData.subscriber_id) {
//     try {
//       const apiUrl = getApiUrl();
//       const trackingUrl = `${apiUrl}/api/events/track-click`;
      
//       const payload = JSON.stringify({
//         subscriber_id: notificationData.subscriber_id,
//         event_name: 'notification_clicked',
//         website_id: notificationData.website_id || null,
//         properties: {
//           url: urlToOpen,
//           campaign_id: notificationData.campaign_id || null,
//           journey_id: notificationData.journey_id || null,
//           journey_step_id: notificationData.journey_step_id || null,
//           user_journey_state_id: notificationData.user_journey_state_id || null,
//           title: event.notification.title,
//           clicked_at: new Date().toISOString()
//         }
//       });

//       // Use sendBeacon for reliable tracking during navigation
//       const blob = new Blob([payload], { type: 'application/json' });
//       const sent = self.navigator.sendBeacon(trackingUrl, blob);
      
//       console.log('[Sigme SW Core] Click tracking sent via beacon:', sent);
//     } catch (beaconError) {
//       console.warn('[Sigme SW Core] Beacon tracking failed:', beaconError);
//     }
//   }

//   // Now navigate to the URL
//   const openWindowPromise = self.clients.matchAll({ 
//     type: 'window', 
//     includeUncontrolled: true 
//   })
//   .then((clientList) => {
//     console.log('[Sigme SW Core] Found', clientList.length, 'open windows');
    
//     const targetUrlObj = new URL(urlToOpen);
    
//     // Try to find an existing window from the same origin
//     for (const client of clientList) {
//       try {
//         const clientUrlObj = new URL(client.url);
        
//         if (clientUrlObj.origin === targetUrlObj.origin) {
//           console.log('[Sigme SW Core] Navigating existing window');
//           return client.focus().then(() => client.navigate(urlToOpen));
//         }
//       } catch (e) {
//         console.warn('[Sigme SW Core] Error parsing client URL:', e);
//       }
//     }
    
//     // Open new window
//     console.log('[Sigme SW Core] Opening new window');
//     if (self.clients.openWindow) {
//       return self.clients.openWindow(urlToOpen);
//     }
//   })
//   .catch((error) => {
//     console.error('[Sigme SW Core] Error handling click:', error);
//   });

//   event.waitUntil(openWindowPromise);
// });

// // ============================================
// // EVENT TRACKING
// // ============================================

// /**
//  * Track custom events (used for clicks, not delivery)
//  */
// async function trackEvent(eventName, subscriberId, properties = {}) {
//   try {
//     const apiUrl = getApiUrl();
//     const trackingUrl = `${apiUrl}/api/events/track`;
    
//     // Include website_id from config
//     const config = await getConfig();
//     const payload = {
//       subscriber_id: subscriberId,
//       event_name: eventName,
//       properties: properties,
//       website_id: config?.websiteId || null,
//     };

//     console.log(`[Sigme SW Core] Sending payload:`, JSON.stringify(payload, null, 2));

//     const response = await fetch(trackingUrl, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(payload)
//     });

//     console.log(`[Sigme SW Core] Response status: ${response.status}`);

//     if (response.ok) {
//       const result = await response.json();
//       console.log(`[Sigme SW Core] Event tracked successfully:`, result);
//       return result;
//     } else {
//       const errorText = await response.text();
//       console.error(`[Sigme SW Core]  Tracking failed (${response.status}):`, errorText);
//     }
//   } catch (err) {
//     console.error(`[Sigme SW Core]  Tracking error:`, err);
//   }
// }

// // ============================================
// // UTILITY FUNCTIONS
// // ============================================

// /**
//  * Convert VAPID key from base64 to Uint8Array
//  */
// function urlBase64ToUint8Array(base64String) {
//   const padding = '='.repeat((4 - base64String.length % 4) % 4);
//   const base64 = (base64String + padding)
//     .replace(/\-/g, '+')
//     .replace(/_/g, '/');

//   const rawData = atob(base64);
//   const outputArray = new Uint8Array(rawData.length);

//   for (let i = 0; i < rawData.length; ++i) {
//     outputArray[i] = rawData.charCodeAt(i);
//   }
//   return outputArray;
// }

// // ============================================
// // READY
// // ============================================

// console.log('[Sigme SW Core] Ready');













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
          console.log('[Sigme SW Core] Config loaded from IndexedDB:', {
            apiUrl: config.apiUrl,
            websiteId: config.websiteId
          });
        } else {
          console.warn('[Sigme SW Core]  No config found in IndexedDB');
        }
      } catch (err) {
        console.warn('[Sigme SW Core]  Could not load config from IndexedDB:', err);
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
      console.log('[Sigme SW Core] Config saved to IndexedDB');
    } catch (err) {
      console.warn('[Sigme SW Core] Could not save config to IndexedDB:', err);
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
    console.warn('[Sigme SW Core] Could not load config from IndexedDB:', err);
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
  console.warn('[Sigme SW Core]  No apiUrl in config, using fallback');
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

    console.log('[Sigme SW Core] Subscribing with VAPID key...');

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
    
    console.log('[Sigme SW Core] Registering with API:', apiUrl);

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
      console.error('[Sigme SW Core] API Error:', errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Registration failed');
    }

    console.log('[Sigme SW Core] Registration successful:', result);

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
    data: {}
  };

  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[Sigme SW Core] Push data:', data);
      
      if (data.data) {
        console.log('[Sigme SW Core] Data object exists');
        // console.log('[Sigme SW Core]   - subscriber_id:', data.data.subscriber_id);
        // console.log('[Sigme SW Core]   - campaign_id:', data.data.campaign_id);
        // console.log('[Sigme SW Core]   - notification_id:', data.data.notification_id);
      } else {
        console.error('[Sigme SW Core] NO DATA OBJECT IN PUSH!');
      }
      
      notification = {
        title: data.title || notification.title,
        body: data.body || notification.body,
        icon: data.icon || notification.icon,
        badge: data.badge || notification.badge,
        image: data.image,
        tag: data.tag,
        data: data.data || {},
      };
      
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
  // console.log('[Sigme SW Core]  Notification clicked');
  // console.log('[Sigme SW Core]  Notification data:', event.notification.data);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  let urlToOpen = notificationData.url || notificationData.click_url || '/';

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
    
    // Debug: Log config state
    // console.log('[Sigme SW Core]  Config state:', {
    //   hasConfig: !!websiteConfig,
    //   configApiUrl: websiteConfig?.apiUrl,
    //   resolvedApiUrl: apiUrl
    // });
    
    // FIX: Include notification_id for proper tracking
    const payload = {
      notification_id: event.notification.tag || notificationData.notification_id, // Use tag as fallback
      campaign_id: notificationData.campaign_id || null,
      subscriber_id: notificationData.subscriber_id,
      journey_id: notificationData.journey_id || null,
      url: urlToOpen,
      title: event.notification.title,
    };

    // console.log('[Sigme SW Core]  Sending click tracking:', {
    //   endpoint: trackingUrl,
    //   notification_id: payload.notification_id,
    //   campaign_id: payload.campaign_id,
    //   subscriber_id: payload.subscriber_id,
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
        // console.log('[Sigme SW Core] Click tracked successfully');
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
    // console.log('[Sigme SW Core] Found', clientList.length, 'open windows');
    
    const targetUrlObj = new URL(urlToOpen);
    
    // Try to find an existing window from the same origin
    for (const client of clientList) {
      try {
        const clientUrlObj = new URL(client.url);
        
        if (clientUrlObj.origin === targetUrlObj.origin) {
          console.log('[Sigme SW Core] Navigating existing window');
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      } catch (e) {
        console.warn('[Sigme SW Core]  Error parsing client URL:', e);
      }
    }
    
    // Open new window
    // console.log('[Sigme SW Core] Opening new window');
    if (self.clients.openWindow) {
      return self.clients.openWindow(urlToOpen);
    }
  })
  .catch((error) => {
    console.error('[Sigme SW Core]  Error opening window:', error);
  });

  event.waitUntil(openWindowPromise);
});

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