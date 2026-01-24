// // // // // ============================================
// // // // // FILE: BACKEND/public/sigme-sw-core.js
// // // // // Core Service Worker Logic (imported by client proxies)
// // // // // ============================================

// // // // console.log('[Sigme SW Core] Loading...');

// // // // // Global config store
// // // // let websiteConfig = null;

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

// // // // // Listen for messages from the client
// // // // self.addEventListener('message', async (event) => {
// // // //   const { type, config } = event.data;

// // // //   if (type === 'SIGME_INIT') {
// // // //     console.log('[Sigme SW Core] Received configuration:', config);
// // // //     websiteConfig = config;
// // // //   }

// // // //   if (type === 'SIGME_SUBSCRIBE') {
// // // //     console.log('[Sigme SW Core] Subscribe request');
// // // //     await handleSubscribe(event);
// // // //   }
// // // // });

// // // // // Handle subscription
// // // // async function handleSubscribe(event) {
// // // //   try {
// // // //     if (!websiteConfig) {
// // // //       throw new Error('Configuration not loaded');
// // // //     }

// // // //     // Get VAPID public key from config
// // // //     const vapidPublicKey = websiteConfig.vapidPublicKey;
    
// // // //     if (!vapidPublicKey) {
// // // //       throw new Error('VAPID public key not found in configuration');
// // // //     }

// // // //     // Subscribe to push notifications
// // // //     const subscription = await self.registration.pushManager.subscribe({
// // // //       userVisibleOnly: true,
// // // //       applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
// // // //     });

// // // //     console.log('[Sigme SW Core] Subscription obtained');

// // // //     // Extract keys from subscription
// // // //     const subscriptionJSON = subscription.toJSON();
// // // //     const endpoint = subscriptionJSON.endpoint;
// // // //     const keys = subscriptionJSON.keys || {};
    
// // // //     const p256dh = keys.p256dh;
// // // //     const auth = keys.auth;

// // // //     if (!endpoint || !p256dh || !auth) {
// // // //       throw new Error('Invalid subscription format - missing keys');
// // // //     }

// // // //     // Detect browser and platform info
// // // //     const userAgent = self.navigator.userAgent || '';
// // // //     let browser = 'Unknown';
// // // //     let os = 'Unknown';

// // // //     // Browser detection
// // // //     if (userAgent.includes('Chrome')) browser = 'Chrome';
// // // //     else if (userAgent.includes('Firefox')) browser = 'Firefox';
// // // //     else if (userAgent.includes('Safari')) browser = 'Safari';
// // // //     else if (userAgent.includes('Edge')) browser = 'Edge';

// // // //     // OS detection
// // // //     if (userAgent.includes('Windows')) os = 'Windows';
// // // //     else if (userAgent.includes('Mac')) os = 'macOS';
// // // //     else if (userAgent.includes('Linux')) os = 'Linux';
// // // //     else if (userAgent.includes('Android')) os = 'Android';
// // // //     else if (userAgent.includes('iOS')) os = 'iOS';

// // // //     // Get API URL from config
// // // //     const apiUrl = websiteConfig.apiUrl || 'https://sigme-backend-fkde.vercel.app';
    
// // // //     console.log('[Sigme SW Core] Registering with API:', apiUrl);

// // // //     // Register with backend
// // // //     const response = await fetch(`${apiUrl}/api/subscribers/register`, {
// // // //       method: 'POST',
// // // //       headers: {
// // // //         'Content-Type': 'application/json',
// // // //       },
// // // //       body: JSON.stringify({
// // // //         websiteId: websiteConfig.websiteId,
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
// // // //       console.error('[Sigme SW Core] API Error:', errorText);
// // // //       throw new Error(`HTTP ${response.status}: ${errorText}`);
// // // //     }

// // // //     const result = await response.json();

// // // //     if (!result.success) {
// // // //       throw new Error(result.error || 'Registration failed');
// // // //     }

// // // //     console.log('[Sigme SW Core] Registration successful:', result);

// // // //     // Notify client of success
// // // //     const clients = await self.clients.matchAll();
// // // //     clients.forEach(client => {
// // // //       client.postMessage({
// // // //         type: 'SIGME_SUBSCRIBED',
// // // //         success: true,
// // // //         data: result
// // // //       });
// // // //     });

// // // //   } catch (error) {
// // // //     console.error('[Sigme SW Core] Registration failed:', error.message);

// // // //     // Notify client of failure
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

// // // // // Handle push notifications
// // // // self.addEventListener('push', (event) => {
// // // //   console.log('[Sigme SW Core] Push received');

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
// // // //       notification = {
// // // //         title: data.title || notification.title,
// // // //         body: data.body || notification.body,
// // // //         icon: data.icon || notification.icon,
// // // //         badge: data.badge || notification.badge,
// // // //         image: data.image,
// // // //         tag: data.tag,
// // // //         data: data.data || {},
// // // //       };
// // // //     } catch (e) {
// // // //       console.error('[Sigme SW Core] Failed to parse push data:', e);
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

// // // //   event.waitUntil(
// // // //     self.registration.showNotification(notification.title, options)
// // // //   );
// // // // });

// // // // // Handle notification clicks
// // // // self.addEventListener('notificationclick', (event) => {
// // // //   console.log('[Sigme SW Core] Notification clicked');
// // // //   event.notification.close();

// // // //   const urlToOpen = event.notification.data?.url || '/';

// // // //   event.waitUntil(
// // // //     self.clients.matchAll({ type: 'window', includeUncontrolled: true })
// // // //       .then((clientList) => {
// // // //         // Check if there's already a window open
// // // //         for (const client of clientList) {
// // // //           if (client.url === urlToOpen && 'focus' in client) {
// // // //             return client.focus();
// // // //           }
// // // //         }
// // // //         // Open new window
// // // //         if (self.clients.openWindow) {
// // // //           return self.clients.openWindow(urlToOpen);
// // // //         }
// // // //       })
// // // //   );
// // // // });

// // // // // Helper function to convert VAPID key
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

// // // // console.log('[Sigme SW Core] Ready');



// // // // ============================================
// // // // FILE: BACKEND/public/sigme-sw-core.js
// // // // Core Service Worker Logic (imported by client proxies)
// // // // ============================================

// // // console.log('[Sigme SW Core] Loading...');

// // // // Global config store
// // // let websiteConfig = null;

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

// // // // Listen for messages from the client
// // // self.addEventListener('message', async (event) => {
// // //   const { type, config } = event.data;

// // //   if (type === 'SIGME_INIT') {
// // //     console.log('[Sigme SW Core] Received configuration:', config);
// // //     websiteConfig = config;
// // //   }

// // //   if (type === 'SIGME_SUBSCRIBE') {
// // //     console.log('[Sigme SW Core] Subscribe request');
// // //     await handleSubscribe(event);
// // //   }
// // // });

// // // // Handle subscription
// // // async function handleSubscribe(event) {
// // //   try {
// // //     if (!websiteConfig) {
// // //       throw new Error('Configuration not loaded');
// // //     }

// // //     // Get VAPID public key from config
// // //     const vapidPublicKey = websiteConfig.vapidPublicKey;
    
// // //     if (!vapidPublicKey) {
// // //       throw new Error('VAPID public key not found in configuration');
// // //     }

// // //     // Subscribe to push notifications
// // //     const subscription = await self.registration.pushManager.subscribe({
// // //       userVisibleOnly: true,
// // //       applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
// // //     });

// // //     console.log('[Sigme SW Core] Subscription obtained');

// // //     // Extract keys from subscription
// // //     const subscriptionJSON = subscription.toJSON();
// // //     const endpoint = subscriptionJSON.endpoint;
// // //     const keys = subscriptionJSON.keys || {};
    
// // //     const p256dh = keys.p256dh;
// // //     const auth = keys.auth;

// // //     if (!endpoint || !p256dh || !auth) {
// // //       throw new Error('Invalid subscription format - missing keys');
// // //     }

// // //     // Detect browser and platform info
// // //     const userAgent = self.navigator.userAgent || '';
// // //     let browser = 'Unknown';
// // //     let os = 'Unknown';

// // //     // Browser detection
// // //     if (userAgent.includes('Chrome')) browser = 'Chrome';
// // //     else if (userAgent.includes('Firefox')) browser = 'Firefox';
// // //     else if (userAgent.includes('Safari')) browser = 'Safari';
// // //     else if (userAgent.includes('Edge')) browser = 'Edge';

// // //     // OS detection
// // //     if (userAgent.includes('Windows')) os = 'Windows';
// // //     else if (userAgent.includes('Mac')) os = 'macOS';
// // //     else if (userAgent.includes('Linux')) os = 'Linux';
// // //     else if (userAgent.includes('Android')) os = 'Android';
// // //     else if (userAgent.includes('iOS')) os = 'iOS';

// // //     // Get API URL from config
// // //     const apiUrl = websiteConfig.apiUrl || 'https://sigme-backend-fkde.vercel.app';
    
// // //     console.log('[Sigme SW Core] Registering with API:', apiUrl);

// // //     // Register with backend
// // //     const response = await fetch(`${apiUrl}/api/subscribers/register`, {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //       },
// // //       body: JSON.stringify({
// // //         websiteId: websiteConfig.websiteId,
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
// // //       console.error('[Sigme SW Core] API Error:', errorText);
// // //       throw new Error(`HTTP ${response.status}: ${errorText}`);
// // //     }

// // //     const result = await response.json();

// // //     if (!result.success) {
// // //       throw new Error(result.error || 'Registration failed');
// // //     }

// // //     console.log('[Sigme SW Core] Registration successful:', result);

// // //     // Notify client of success
// // //     const clients = await self.clients.matchAll();
// // //     clients.forEach(client => {
// // //       client.postMessage({
// // //         type: 'SIGME_SUBSCRIBED',
// // //         success: true,
// // //         data: result
// // //       });
// // //     });

// // //   } catch (error) {
// // //     console.error('[Sigme SW Core] Registration failed:', error.message);

// // //     // Notify client of failure
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
// // // // 🔥 UPDATED: Handle push notifications with event tracking
// // // // ============================================
// // // self.addEventListener('push', (event) => {
// // //   console.log('[Sigme SW Core] Push received');

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
// // //       notification = {
// // //         title: data.title || notification.title,
// // //         body: data.body || notification.body,
// // //         icon: data.icon || notification.icon,
// // //         badge: data.badge || notification.badge,
// // //         image: data.image,
// // //         tag: data.tag,
// // //         data: data.data || {},
// // //       };
// // //     } catch (e) {
// // //       console.error('[Sigme SW Core] Failed to parse push data:', e);
// // //     }
// // //   }

// // //   // 🔥 NEW: Track notification received event
// // //   if (notification.data && notification.data.subscriber_id && websiteConfig) {
// // //     const apiUrl = websiteConfig.apiUrl || 'https://sigme-backend-fkde.vercel.app';
    
// // //     fetch(`${apiUrl}/api/events/track`, {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //       },
// // //       body: JSON.stringify({
// // //         subscriber_id: notification.data.subscriber_id,
// // //         event_name: 'notification_received',
// // //         properties: {
// // //           title: notification.title,
// // //           campaign_id: notification.data.campaign_id || null,
// // //           journey_id: notification.data.journey_id || null,
// // //           received_at: new Date().toISOString()
// // //         }
// // //       })
// // //     }).catch(err => {
// // //       console.error('[Sigme SW Core] Error tracking received event:', err);
// // //     });
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

// // //   event.waitUntil(
// // //     self.registration.showNotification(notification.title, options)
// // //   );
// // // });

// // // // ============================================
// // // // 🔥 UPDATED: Handle notification clicks with event tracking
// // // // ============================================
// // // self.addEventListener('notificationclick', (event) => {
// // //   console.log('[Sigme SW Core] Notification clicked');
// // //   event.notification.close();

// // //   const notificationData = event.notification.data || {};
// // //   const urlToOpen = notificationData.url || '/';

// // //   // 🔥 NEW: Track notification click event
// // //   if (notificationData.subscriber_id && websiteConfig) {
// // //     const apiUrl = websiteConfig.apiUrl || 'http://localhost:3000';
    
// // //     const trackingPromise = fetch(`${apiUrl}/api/events/track`, {
// // //       method: 'POST',
// // //       headers: {
// // //         'Content-Type': 'application/json',
// // //       },
// // //       body: JSON.stringify({
// // //         subscriber_id: notificationData.subscriber_id,
// // //         event_name: 'notification_clicked',
// // //         event_data: {
// // //           url: urlToOpen,
// // //           node_id: notificationData.node_id || null,
// // //           title: event.notification.title,
// // //           clicked_at: new Date().toISOString()
// // //         },
// // //         campaign_id: notificationData.campaign_id || null,
// // //         journey_id: notificationData.journey_id || null
// // //       })
// // //     })
// // //     .then(response => {
// // //       if (response.ok) {
// // //         console.log('[Sigme SW Core] Click event tracked successfully');
// // //       } else {
// // //         console.error('[Sigme SW Core] Failed to track click event:', response.status);
// // //       }
// // //     })
// // //     .catch(err => {
// // //       console.error('[Sigme SW Core] Error tracking click event:', err);
// // //     });

// // //     // Don't block opening the URL - track in parallel
// // //     event.waitUntil(trackingPromise);
// // //   }

// // //   // Open the URL
// // //   event.waitUntil(
// // //     self.clients.matchAll({ type: 'window', includeUncontrolled: true })
// // //       .then((clientList) => {
// // //         // Check if there's already a window open
// // //         for (const client of clientList) {
// // //           if (client.url === urlToOpen && 'focus' in client) {
// // //             return client.focus();
// // //           }
// // //         }
// // //         // Open new window
// // //         if (self.clients.openWindow) {
// // //           return self.clients.openWindow(urlToOpen);
// // //         }
// // //       })
// // //   );
// // // });

// // // // Helper function to convert VAPID key
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

// // // console.log('[Sigme SW Core] Ready');






































// // // BACKEND/public/sigme-sw-core.js

// // // ... existing code ...

// // // ============================================
// // // 🔥 FIXED: Handle notification clicks with event tracking
// // // ============================================
// // self.addEventListener('notificationclick', (event) => {
// //   console.log('[Sigme SW Core] Notification clicked');
// //   event.notification.close();

// //   const notificationData = event.notification.data || {};
// //   const urlToOpen = notificationData.url || '/';

// //   // 🔥 Track notification click event
// //   if (notificationData.subscriber_id && websiteConfig) {
// //     const apiUrl = websiteConfig.apiUrl || 'http://localhost:3000';
    
// //     console.log('[Sigme SW Core] Tracking click event to:', `${apiUrl}/api/events/track`);
    
// //     const trackingPromise = fetch(`${apiUrl}/api/events/track`, {
// //       method: 'POST',
// //       headers: {
// //         'Content-Type': 'application/json',
// //       },
// //       body: JSON.stringify({
// //         subscriber_id: notificationData.subscriber_id,
// //         event_name: 'notification_clicked',
// //         event_data: {
// //           url: urlToOpen,
// //           node_id: notificationData.node_id || null,
// //           title: event.notification.title,
// //           clicked_at: new Date().toISOString(),
// //         },
// //         campaign_id: notificationData.campaign_id || null,
// //         journey_id: notificationData.journey_id || null,
// //       })
// //     })
// //     .then(response => {
// //       console.log('[Sigme SW Core] Tracking response status:', response.status);
// //       return response.json();
// //     })
// //     .then(data => {
// //       console.log('[Sigme SW Core] Click event tracked successfully:', data);
// //     })
// //     .catch(err => {
// //       console.error('[Sigme SW Core] Error tracking click event:', err);
// //     });

// //     // Wait for tracking to complete
// //     event.waitUntil(trackingPromise);
// //   } else {
// //     console.warn('[Sigme SW Core] Missing subscriber_id or config, cannot track click');
// //   }

// //   // Open the URL
// //   event.waitUntil(
// //     self.clients.matchAll({ type: 'window', includeUncontrolled: true })
// //       .then((clientList) => {
// //         // Check if there's already a window open
// //         for (const client of clientList) {
// //           if (client.url === urlToOpen && 'focus' in client) {
// //             return client.focus();
// //           }
// //         }
// //         // Open new window
// //         if (self.clients.openWindow) {
// //           return self.clients.openWindow(urlToOpen);
// //         }
// //       })
// //   );
// // });

// // // Optional: Track notification dismissals
// // self.addEventListener('notificationclose', (event) => {
// //   console.log('[Sigme SW Core] Notification dismissed');
  
// //   const notificationData = event.notification.data || {};
  
// //   if (notificationData.subscriber_id && websiteConfig) {
// //     const apiUrl = websiteConfig.apiUrl || 'http://localhost:3000';
    
// //     const trackingPromise = fetch(`${apiUrl}/api/events/track`, {
// //       method: 'POST',
// //       headers: {
// //         'Content-Type': 'application/json',
// //       },
// //       body: JSON.stringify({
// //         subscriber_id: notificationData.subscriber_id,
// //         event_name: 'notification_dismissed',
// //         event_data: {
// //           title: event.notification.title,
// //           dismissed_at: new Date().toISOString(),
// //         },
// //         campaign_id: notificationData.campaign_id || null,
// //         journey_id: notificationData.journey_id || null,
// //       })
// //     })
// //     .catch(err => {
// //       console.error('[Sigme SW Core] Error tracking dismissal:', err);
// //     });
    
// //     event.waitUntil(trackingPromise);
// //   }
// // });


// // ============================================
// // FILE: BACKEND/public/sigme-sw-core.js
// // Core Service Worker Logic (imported by client proxies)
// // ============================================

// console.log('[Sigme SW Core] Loading...');

// // Global config store
// let websiteConfig = null;

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

// // Listen for messages from the client
// self.addEventListener('message', async (event) => {
//   const { type, config } = event.data;

//   if (type === 'SIGME_INIT') {
//     console.log('[Sigme SW Core] Received configuration:', config);
//     websiteConfig = config;
//   }

//   if (type === 'SIGME_SUBSCRIBE') {
//     console.log('[Sigme SW Core] Subscribe request');
//     await handleSubscribe(event);
//   }
// });

// // Handle subscription
// async function handleSubscribe(event) {
//   try {
//     if (!websiteConfig) {
//       throw new Error('Configuration not loaded');
//     }

//     // Get VAPID public key from config
//     const vapidPublicKey = websiteConfig.vapidPublicKey;
    
//     if (!vapidPublicKey) {
//       throw new Error('VAPID public key not found in configuration');
//     }

//     // Subscribe to push notifications
//     const subscription = await self.registration.pushManager.subscribe({
//       userVisibleOnly: true,
//       applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
//     });

//     console.log('[Sigme SW Core] Subscription obtained');

//     // Extract keys from subscription
//     const subscriptionJSON = subscription.toJSON();
//     const endpoint = subscriptionJSON.endpoint;
//     const keys = subscriptionJSON.keys || {};
    
//     const p256dh = keys.p256dh;
//     const auth = keys.auth;

//     if (!endpoint || !p256dh || !auth) {
//       throw new Error('Invalid subscription format - missing keys');
//     }

//     // Detect browser and platform info
//     const userAgent = self.navigator.userAgent || '';
//     let browser = 'Unknown';
//     let os = 'Unknown';

//     // Browser detection
//     if (userAgent.includes('Chrome')) browser = 'Chrome';
//     else if (userAgent.includes('Firefox')) browser = 'Firefox';
//     else if (userAgent.includes('Safari')) browser = 'Safari';
//     else if (userAgent.includes('Edge')) browser = 'Edge';

//     // OS detection
//     if (userAgent.includes('Windows')) os = 'Windows';
//     else if (userAgent.includes('Mac')) os = 'macOS';
//     else if (userAgent.includes('Linux')) os = 'Linux';
//     else if (userAgent.includes('Android')) os = 'Android';
//     else if (userAgent.includes('iOS')) os = 'iOS';

//     // Get API URL from config
//     const apiUrl = websiteConfig.apiUrl || 'https://sigme-backend-fkde.vercel.app';
    
//     console.log('[Sigme SW Core] Registering with API:', apiUrl);

//     // Register with backend
//     const response = await fetch(`${apiUrl}/api/subscribers/register`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         websiteId: websiteConfig.websiteId,
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

//     // Notify client of success
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

//     // Notify client of failure
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
// // 🔥 UPDATED: Handle push notifications with event tracking
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
//       notification = {
//         title: data.title || notification.title,
//         body: data.body || notification.body,
//         icon: data.icon || notification.icon,
//         badge: data.badge || notification.badge,
//         image: data.image,
//         tag: data.tag,
//         data: data.data || {},
//       };
//     } catch (e) {
//       console.error('[Sigme SW Core] Failed to parse push data:', e);
//     }
//   }

//   // 🔥 NEW: Track notification received event
//   if (notification.data && notification.data.subscriber_id && websiteConfig) {
//     const apiUrl = websiteConfig.apiUrl || 'https://sigme-backend-fkde.vercel.app';
    
//     fetch(`${apiUrl}/api/events/track`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         subscriber_id: notification.data.subscriber_id,
//         event_name: 'notification_received',
//         properties: {
//           title: notification.title,
//           campaign_id: notification.data.campaign_id || null,
//           journey_id: notification.data.journey_id || null,
//           received_at: new Date().toISOString()
//         }
//       })
//     }).catch(err => {
//       console.error('[Sigme SW Core] Error tracking received event:', err);
//     });
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

//   event.waitUntil(
//     self.registration.showNotification(notification.title, options)
//   );
// });

// // ============================================
// // 🔥 UPDATED: Handle notification clicks with event tracking
// // ============================================
// self.addEventListener('notificationclick', (event) => {
//   console.log('[Sigme SW Core] Notification clicked');
//   event.notification.close();

//   const notificationData = event.notification.data || {};
//   const urlToOpen = notificationData.url || '/';

//   // 🔥 NEW: Track notification click event
//   if (notificationData.subscriber_id && websiteConfig) {
//     const apiUrl = websiteConfig.apiUrl || 'https://sigme-backend-fkde.vercel.app';
    
//     console.log('[Sigme SW Core] Tracking click to:', `${apiUrl}/api/events/track`);
//     console.log('[Sigme SW Core] Subscriber ID:', notificationData.subscriber_id);
//     console.log('[Sigme SW Core] Campaign ID:', notificationData.campaign_id);
    
//     const trackingPromise = fetch(`${apiUrl}/api/events/track`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         subscriber_id: notificationData.subscriber_id,
//         event_name: 'notification_clicked',
//         properties: {
//           url: urlToOpen,
//           campaign_id: notificationData.campaign_id || null,
//           journey_id: notificationData.journey_id || null,
//           node_id: notificationData.node_id || null,
//           title: event.notification.title,
//           clicked_at: new Date().toISOString()
//         }
//       })
//     })
//     .then(response => {
//       console.log('[Sigme SW Core] Tracking response status:', response.status);
//       if (response.ok) {
//         console.log('[Sigme SW Core] Click event tracked successfully');
//         return response.json();
//       } else {
//         console.error('[Sigme SW Core] Failed to track click event:', response.status);
//         return response.text().then(text => {
//           console.error('[Sigme SW Core] Error response:', text);
//         });
//       }
//     })
//     .catch(err => {
//       console.error('[Sigme SW Core] Error tracking click event:', err);
//     });

//     // Don't block opening the URL - track in parallel
//     event.waitUntil(trackingPromise);
//   } else {
//     console.warn('[Sigme SW Core] Cannot track click - missing data:', {
//       hasSubscriberId: !!notificationData.subscriber_id,
//       hasConfig: !!websiteConfig,
//       notificationData: notificationData
//     });
//   }

//   // Open the URL
//   event.waitUntil(
//     self.clients.matchAll({ type: 'window', includeUncontrolled: true })
//       .then((clientList) => {
//         // Check if there's already a window open
//         for (const client of clientList) {
//           if (client.url === urlToOpen && 'focus' in client) {
//             return client.focus();
//           }
//         }
//         // Open new window
//         if (self.clients.openWindow) {
//           return self.clients.openWindow(urlToOpen);
//         }
//       })
//   );
// });

// // Helper function to convert VAPID key
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

// console.log('[Sigme SW Core] Ready');

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
    console.log('[Sigme SW Core] Subscribe request');
    await handleSubscribe(event);
  }
});

// ============================================
// IndexedDB helpers for config persistence
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
      console.log('[Sigme SW Core] Config loaded from IndexedDB');
      return config;
    }
  } catch (err) {
    console.warn('[Sigme SW Core] Could not load config from IndexedDB:', err);
  }
  
  return null;
}

// Get API URL - with fallback to current origin
function getApiUrl() {
  if (websiteConfig && websiteConfig.apiUrl) {
    return websiteConfig.apiUrl;
  }
  
  // Fallback: try to determine from the script location
  // The sigme-sw-core.js is loaded from the backend, so we can use its origin
  try {
    const scriptUrl = new URL(self.location.href);
    const apiUrl = scriptUrl.origin;
    console.log('[Sigme SW Core] Using API URL from origin:', apiUrl);
    return apiUrl;
  } catch (e) {
    console.error('[Sigme SW Core] Could not determine API URL:', e);
    return 'http://localhost:3000'; // Development fallback
  }
}

// ============================================
// Handle subscription
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
// Handle push notifications
// ============================================
self.addEventListener('push', (event) => {
  console.log('[Sigme SW Core] 📨 Push received');

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
      console.log('[Sigme SW Core] 📦 Push data:', data);
        if (data.data) {
        console.log('[Sigme SW Core] ✅ Data object exists:', data.data);
        console.log('[Sigme SW Core] 📋 subscriber_id:', data.data.subscriber_id);
        console.log('[Sigme SW Core] 📋 campaign_id:', data.data.campaign_id);
      } else {
        console.error('[Sigme SW Core] ❌ NO DATA OBJECT IN PUSH!');
        console.error('[Sigme SW Core] ❌ Push payload:', JSON.stringify(data));
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
      
      console.log('[Sigme SW Core] 📋 Notification data:', notification.data);
    } catch (e) {
      console.error('[Sigme SW Core] Failed to parse push data:', e);
    }
  }

  // Track notification received event
  if (notification.data && notification.data.subscriber_id) {
    console.log('[Sigme SW Core] 📊 Tracking received event');
    event.waitUntil(
      trackEvent('notification_received', notification.data.subscriber_id, {
        title: notification.title,
        campaign_id: notification.data.campaign_id || null,
        journey_id: notification.data.journey_id || null,
        received_at: new Date().toISOString()
      })
    );
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

// ============================================
// Handle notification clicks
// ============================================
self.addEventListener('notificationclick', (event) => {
  console.log('[Sigme SW Core] 🖱️ Notification clicked');
  console.log('[Sigme SW Core] 📋 Full notification:', event.notification);
  console.log('[Sigme SW Core] 📋 Notification data:', event.notification.data);
  
  event.notification.close();

  const notificationData = event.notification.data || {};
  const urlToOpen = notificationData.url || '/';

  console.log('[Sigme SW Core] 🔗 URL to open:', urlToOpen);
  console.log('[Sigme SW Core] 👤 Subscriber ID:', notificationData.subscriber_id);
  console.log('[Sigme SW Core] 📧 Campaign ID:', notificationData.campaign_id);

  // Track notification click event
  if (notificationData.subscriber_id) {
    console.log('[Sigme SW Core] ✅ Tracking click event');
    
    const trackingPromise = trackEvent(
      'notification_clicked',
      notificationData.subscriber_id,
      {
        url: urlToOpen,
        campaign_id: notificationData.campaign_id || null,
        journey_id: notificationData.journey_id || null,
        node_id: notificationData.node_id || null,
        title: event.notification.title,
        clicked_at: new Date().toISOString()
      }
    );

    event.waitUntil(trackingPromise);
  } else {
    console.error('[Sigme SW Core] ❌ Cannot track click - missing subscriber_id');
    console.error('[Sigme SW Core] 📋 Available data:', notificationData);
  }

  // Open the URL
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

// ============================================
// Centralized event tracking function
// ============================================
async function trackEvent(eventName, subscriberId, properties = {}) {
  try {
    const apiUrl = getApiUrl();
    const trackingUrl = `${apiUrl}/api/events/track`;
    
    console.log(`[Sigme SW Core] 📊 Tracking: ${eventName}`);
    console.log(`[Sigme SW Core] 🌐 API URL: ${trackingUrl}`);
    console.log(`[Sigme SW Core] 👤 Subscriber: ${subscriberId}`);
    console.log(`[Sigme SW Core] 📦 Properties:`, properties);

    const payload = {
      subscriber_id: subscriberId,
      event_name: eventName,
      properties: properties
    };

    console.log(`[Sigme SW Core] 📤 Sending payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch(trackingUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    console.log(`[Sigme SW Core] 📥 Response status: ${response.status}`);

    if (response.ok) {
      const result = await response.json();
      console.log(`[Sigme SW Core] ✅ Event tracked successfully:`, result);
      return result;
    } else {
      const errorText = await response.text();
      console.error(`[Sigme SW Core] ❌ Tracking failed (${response.status}):`, errorText);
    }
  } catch (err) {
    console.error(`[Sigme SW Core] ❌ Tracking error:`, err);
  }
}

// ============================================
// Helper function to convert VAPID key
// ============================================
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