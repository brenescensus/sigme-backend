
// // // // ============================================
// // // // FILE: public/sigme.js
// // // // Universal Client Script (NO MODULES)
// // // // ============================================

// // // (function () {
// // //   'use strict';

// // //   console.log('[Sigme] Universal script loading...');

// // //   // =====================================================
// // //   // CONFIGURATION (IMPORTANT)
// // //   // =====================================================
// // //   // You can inject this from HTML:
// // //   // window.SIGME_API_URL = "https://your-backend.com";
// // //   // <script src="https://cdn.yoursite.com/sigme.js"></script>
// // //   const API_BASE_URL =
// // //     window.SIGME_API_URL || 'http://localhost:3000';

// // //   const SIGME_API = API_BASE_URL;
// // //   const SW_PATH = '/sigme-universal-sw.js';

// // //   // =====================================================
// // //   // ENV CHECKS
// // //   // =====================================================
// // //   const currentDomain = window.location.hostname;
// // //   console.log('[Sigme] Current domain:', currentDomain);

// // //   if (!('serviceWorker' in navigator)) {
// // //     console.warn('[Sigme] Service workers not supported');
// // //     return;
// // //   }

// // //   if (!('PushManager' in window)) {
// // //     console.warn('[Sigme] Push notifications not supported');
// // //     return;
// // //   }

// // //   // =====================================================
// // //   // DETECT WEBSITE
// // //   // =====================================================
// // //   async function detectWebsite() {
// // //     try {
// // //       console.log('[Sigme] Detecting website configuration...');

// // //       const response = await fetch(
// // //         `${SIGME_API}/api/websites/detect?domain=${encodeURIComponent(currentDomain)}`
// // //       );

// // //       const data = await response.json();

// // //       if (!data.success) {
// // //         console.error('[Sigme] Website not found:', data.error);
// // //         return null;
// // //       }

// // //       console.log('[Sigme] Configuration loaded:', data.config.websiteName);
// // //       return data.config;
// // //     } catch (error) {
// // //       console.error('[Sigme] Failed to detect website:', error);
// // //       return null;
// // //     }
// // //   }

// // //   // =====================================================
// // //   // INITIALIZE
// // //   // =====================================================
// // //   async function initialize() {
// // //     try {
// // //       const config = await detectWebsite();
// // //       if (!config) return;

// // //       console.log('[Sigme] Registering service worker...');
// // //       const registration = await navigator.serviceWorker.register(SW_PATH);
// // //       await navigator.serviceWorker.ready;

// // //       if (registration.active) {
// // //         registration.active.postMessage({
// // //           type: 'SIGME_INIT',
// // //           config
// // //         });
// // //       }

// // //       if (Notification.permission === 'granted') {
// // //         subscribeUser(registration);
// // //       } else if (Notification.permission === 'default') {
// // //         showSubscribePrompt(config, registration);
// // //       } else {
// // //         console.log('[Sigme] Notifications denied');
// // //       }
// // //     } catch (err) {
// // //       console.error('[Sigme] Initialization failed:', err);
// // //     }
// // //   }

// // //   // =====================================================
// // //   // PROMPT UI
// // //   // =====================================================
// // //   function showSubscribePrompt(config, registration) {
// // //     const branding = config.branding || {};

// // //     const promptHtml = `
// // //       <div id="sigme-prompt" style="
// // //         position: fixed;
// // //         bottom: 20px;
// // //         right: 20px;
// // //         max-width: 400px;
// // //         background: white;
// // //         border-radius: 16px;
// // //         box-shadow: 0 10px 40px rgba(0,0,0,0.2);
// // //         padding: 20px;
// // //         z-index: 999999;
// // //         font-family: ${branding.font_family || 'system-ui'};
// // //         border-top: 4px solid ${branding.primary_color || '#3b82f6'};
// // //       ">
// // //         <div style="display:flex;gap:12px;">
// // //           ${branding.logo_url ? `<img src="${branding.logo_url}" style="width:48px;height:48px;border-radius:8px;">` : ''}
// // //           <div style="flex:1">
// // //             <h3 style="margin:0 0 6px 0;">Get notifications from ${config.websiteName}</h3>
// // //             <p style="margin:0 0 12px 0;font-size:14px;color:#666;">
// // //               Stay updated with the latest news and offers
// // //             </p>
// // //             <button id="sigme-allow" style="padding:10px 16px;background:${branding.primary_color || '#3b82f6'};color:white;border:none;border-radius:8px;cursor:pointer;">
// // //               Allow
// // //             </button>
// // //             <button id="sigme-deny" style="padding:10px 16px;margin-left:8px;">Not Now</button>
// // //           </div>
// // //         </div>
// // //       </div>
// // //     `;

// // //     const div = document.createElement('div');
// // //     div.innerHTML = promptHtml;
// // //     document.body.appendChild(div);

// // //     document.getElementById('sigme-allow').onclick = async () => {
// // //       const permission = await Notification.requestPermission();
// // //       if (permission === 'granted') subscribeUser(registration);
// // //       div.remove();
// // //     };

// // //     document.getElementById('sigme-deny').onclick = () => {
// // //       localStorage.setItem('sigme_prompt_dismissed', Date.now());
// // //       div.remove();
// // //     };
// // //   }

// // //   // =====================================================
// // //   // SUBSCRIBE
// // //   // =====================================================
// // //   function subscribeUser(registration) {
// // //     if (registration.active) {
// // //       registration.active.postMessage({ type: 'SIGME_SUBSCRIBE' });
// // //     }
// // //   }

// // //   // =====================================================
// // //   // SERVICE WORKER MESSAGES
// // //   // =====================================================
// // //   navigator.serviceWorker.addEventListener('message', (event) => {
// // //     if (event.data?.type === 'SIGME_SUBSCRIBED') {
// // //       event.data.success
// // //         ? console.log('[Sigme] Subscribed!')
// // //         : console.warn('[Sigme] Subscription failed:', event.data.error);
// // //     }

// // //     if (event.data?.type === 'SIGME_SHOW_NOTIFICATION') {
// // //       showInPageNotification(event.data.notification);
// // //     }
// // //   });

// // //   // =====================================================
// // //   // IN-PAGE NOTIFICATION
// // //   // =====================================================
// // //   function showInPageNotification(notification) {
// // //     const div = document.createElement('div');
// // //     div.style.cssText = `
// // //       position:fixed;
// // //       top:20px;right:20px;
// // //       background:white;
// // //       padding:16px;
// // //       border-radius:12px;
// // //       box-shadow:0 10px 40px rgba(0,0,0,.2);
// // //       z-index:999999;
// // //       cursor:pointer;
// // //     `;
// // //     div.innerHTML = `<strong>${notification.title}</strong><p>${notification.body}</p>`;
// // //     document.body.appendChild(div);

// // //     div.onclick = () => {
// // //       if (notification.url) window.open(notification.url, '_blank');
// // //       div.remove();
// // //     };

// // //     setTimeout(() => div.remove(), 5000);
// // //   }

// // //   // =====================================================
// // //   // AUTO INIT
// // //   // =====================================================
// // //   const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
// // //   const sevenDays = 7 * 24 * 60 * 60 * 1000;

// // //   if (!lastDismissed || Date.now() - lastDismissed > sevenDays) {
// // //     if (document.readyState === 'loading') {
// // //       document.addEventListener('DOMContentLoaded', initialize);
// // //     } else {
// // //       initialize();
// // //     }
// // //   }

// // //   // =====================================================
// // //   // PUBLIC API
// // //   // =====================================================
// // //   window.Sigme = {
// // //     subscribe: initialize,
// // //     getPermission: () => Notification.permission
// // //   };
// // // })();


// // // ============================================
// // // FILE: BACKEND/public/sigme.js

// // // ============================================
// // (function () {
// //   'use strict';

// //   console.log('[Sigme] Universal script loading...');

// //   // ===================================================== 
// //   // CONFIGURATION
// //   // ===================================================== 
// //   // Default to production backend, can be overridden by window.SIGME_API_URL
// //   const API_BASE_URL = window.SIGME_API_URL || 'https://sigme-backend-fkde.vercel.app';
// //   const SIGME_API = API_BASE_URL;
// //   const SW_PATH = '/sigme-universal-sw.js';

// //   console.log('[Sigme] API URL:', SIGME_API);

// //   // ===================================================== 
// //   // ENV CHECKS
// //   // ===================================================== 
// //   const currentDomain = window.location.hostname;
// //   console.log('[Sigme] Current domain:', currentDomain);

// //   if (!('serviceWorker' in navigator)) {
// //     console.warn('[Sigme] Service workers not supported');
// //     return;
// //   }

// //   if (!('PushManager' in window)) {
// //     console.warn('[Sigme] Push notifications not supported');
// //     return;
// //   }

// //   // ===================================================== 
// //   // DETECT WEBSITE
// //   // ===================================================== 
// //   async function detectWebsite() {
// //     try {
// //       console.log('[Sigme] Detecting website configuration...');
      
// //       const response = await fetch(
// //         `${SIGME_API}/api/websites/detect?domain=${encodeURIComponent(currentDomain)}`
// //       );

// //       if (!response.ok) {
// //         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
// //       }

// //       const data = await response.json();

// //       if (!data.success) {
// //         console.error('[Sigme] Website not found:', data.error);
// //         return null;
// //       }

// //       console.log('[Sigme] Configuration loaded:', data.config.websiteName);
// //       return data.config;
// //     } catch (error) {
// //       console.error('[Sigme] Failed to detect website:', error);
// //       return null;
// //     }
// //   }

// //   // ===================================================== 
// //   // INITIALIZE
// //   // ===================================================== 
// //   async function initialize() {
// //     try {
// //       const config = await detectWebsite();
// //       if (!config) {
// //         console.warn('[Sigme] Could not load configuration - aborting');
// //         return;
// //       }

// //       console.log('[Sigme] Registering service worker...');
// //       const registration = await navigator.serviceWorker.register(SW_PATH);
// //       await navigator.serviceWorker.ready;

// //       if (registration.active) {
// //         registration.active.postMessage({
// //           type: 'SIGME_INIT',
// //           config
// //         });
// //       }

// //       if (Notification.permission === 'granted') {
// //         subscribeUser(registration);
// //       } else if (Notification.permission === 'default') {
// //         showSubscribePrompt(config, registration);
// //       } else {
// //         console.log('[Sigme] Notifications denied by user');
// //       }
// //     } catch (err) {
// //       console.error('[Sigme] Initialization failed:', err);
// //     }
// //   }

// //   // ===================================================== 
// //   // PROMPT UI
// //   // ===================================================== 
// //   function showSubscribePrompt(config, registration) {
// //     const branding = config.branding || {};
    
// //     const promptHtml = `
// //       <div id="sigme-prompt" style="
// //         position: fixed;
// //         bottom: 20px;
// //         right: 20px;
// //         background: white;
// //         border-radius: 12px;
// //         box-shadow: 0 10px 40px rgba(0,0,0,0.2);
// //         padding: 20px;
// //         max-width: 380px;
// //         z-index: 999999;
// //         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
// //       ">
// //         <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
// //           ${branding.logo_url 
// //             ? `<img src="${branding.logo_url}" alt="Logo" style="width: 40px; height: 40px; border-radius: 8px;">` 
// //             : '🔔'
// //           }
// //           <div>
// //             <div style="font-weight: 600; font-size: 16px; color: #1a1a1a;">
// //               Get notifications from ${config.websiteName}
// //             </div>
// //             <div style="font-size: 14px; color: #666; margin-top: 2px;">
// //               Stay updated with the latest news and offers
// //             </div>
// //           </div>
// //         </div>
// //         <div style="display: flex; gap: 8px; margin-top: 16px;">
// //           <button id="sigme-allow" style="
// //             flex: 1;
// //             background: ${branding.primary_color || '#3b82f6'};
// //             color: white;
// //             border: none;
// //             padding: 10px 16px;
// //             border-radius: 8px;
// //             font-weight: 600;
// //             cursor: pointer;
// //             font-size: 14px;
// //           ">
// //             Allow
// //           </button>
// //           <button id="sigme-deny" style="
// //             flex: 1;
// //             background: #f3f4f6;
// //             color: #6b7280;
// //             border: none;
// //             padding: 10px 16px;
// //             border-radius: 8px;
// //             font-weight: 600;
// //             cursor: pointer;
// //             font-size: 14px;
// //           ">
// //             Not Now
// //           </button>
// //         </div>
// //       </div>
// //     `;

// //     const div = document.createElement('div');
// //     div.innerHTML = promptHtml;
// //     document.body.appendChild(div);

// //     document.getElementById('sigme-allow').onclick = async () => {
// //       try {
// //         const permission = await Notification.requestPermission();
// //         if (permission === 'granted') {
// //           subscribeUser(registration);
// //         }
// //       } catch (error) {
// //         console.error('[Sigme] Permission request failed:', error);
// //       }
// //       div.remove();
// //     };

// //     document.getElementById('sigme-deny').onclick = () => {
// //       localStorage.setItem('sigme_prompt_dismissed', Date.now());
// //       div.remove();
// //     };
// //   }

// //   // ===================================================== 
// //   // SUBSCRIBE
// //   // ===================================================== 
// //   function subscribeUser(registration) {
// //     if (registration.active) {
// //       registration.active.postMessage({
// //         type: 'SIGME_SUBSCRIBE'
// //       });
// //     }
// //   }

// //   // ===================================================== 
// //   // SERVICE WORKER MESSAGES
// //   // ===================================================== 
// //   navigator.serviceWorker.addEventListener('message', (event) => {
// //     if (event.data?.type === 'SIGME_SUBSCRIBED') {
// //       if (event.data.success) {
// //         console.log('[Sigme] Subscribed successfully!');
// //       } else {
// //         console.warn('[Sigme] Subscription failed:', event.data.error);
// //       }
// //     }

// //     if (event.data?.type === 'SIGME_SHOW_NOTIFICATION') {
// //       showInPageNotification(event.data.notification);
// //     }
// //   });

// //   // ===================================================== 
// //   // IN-PAGE NOTIFICATION
// //   // ===================================================== 
// //   function showInPageNotification(notification) {
// //     const div = document.createElement('div');
// //     div.style.cssText = `
// //       position: fixed;
// //       top: 20px;
// //       right: 20px;
// //       background: white;
// //       padding: 16px;
// //       border-radius: 12px;
// //       box-shadow: 0 10px 40px rgba(0,0,0,0.2);
// //       z-index: 999999;
// //       cursor: pointer;
// //       max-width: 350px;
// //       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
// //     `;

// //     div.innerHTML = `
// //       <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">
// //         ${notification.title}
// //       </div>
// //       <div style="font-size: 14px; color: #666;">
// //         ${notification.body}
// //       </div>
// //     `;

// //     document.body.appendChild(div);

// //     div.onclick = () => {
// //       if (notification.url) window.open(notification.url, '_blank');
// //       div.remove();
// //     };

// //     setTimeout(() => div.remove(), 5000);
// //   }

// //   // ===================================================== 
// //   // AUTO INIT
// //   // ===================================================== 
// //   const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
// //   const sevenDays = 7 * 24 * 60 * 60 * 1000;

// //   if (!lastDismissed || Date.now() - lastDismissed > sevenDays) {
// //     if (document.readyState === 'loading') {
// //       document.addEventListener('DOMContentLoaded', initialize);
// //     } else {
// //       initialize();
// //     }
// //   }

// //   // ===================================================== 
// //   // PUBLIC API
// //   // ===================================================== 
// //   window.Sigme = {
// //     subscribe: initialize,
// //     getPermission: () => Notification.permission
// //   };

// //   console.log('[Sigme] Script ready');
// // })();

// // ============================================
// // FILE: BACKEND/public/sigme.js
// // ============================================
// (function () {
//   'use strict';

//   console.log('[Sigme] Universal script loading...');

//   // ===================================================== 
//   // CONFIGURATION
//   // ===================================================== 
//   const API_BASE_URL = window.SIGME_API_URL || 'https://sigme-backend-fkde.vercel.app';
//   const SIGME_API = API_BASE_URL;
  
//   // 🔥 FIX: Load service worker from backend (absolute URL)
//   const SW_PATH = `${API_BASE_URL}/sigme-universal-sw.js`;

//   console.log('[Sigme] API URL:', SIGME_API);
//   console.log('[Sigme] SW Path:', SW_PATH);

//   // ===================================================== 
//   // ENV CHECKS
//   // ===================================================== 
//   const currentDomain = window.location.hostname;
//   console.log('[Sigme] Current domain:', currentDomain);

//   if (!('serviceWorker' in navigator)) {
//     console.warn('[Sigme] Service workers not supported');
//     return;
//   }

//   if (!('PushManager' in window)) {
//     console.warn('[Sigme] Push notifications not supported');
//     return;
//   }

//   // ===================================================== 
//   // DETECT WEBSITE
//   // ===================================================== 
//   async function detectWebsite() {
//     try {
//       console.log('[Sigme] Detecting website configuration...');
      
//       const response = await fetch(
//         `${SIGME_API}/api/websites/detect?domain=${encodeURIComponent(currentDomain)}`
//       );

//       if (!response.ok) {
//         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//       }

//       const data = await response.json();

//       if (!data.success) {
//         console.error('[Sigme] Website not found:', data.error);
//         return null;
//       }

//       console.log('[Sigme] Configuration loaded:', data.config.websiteName);
//       return data.config;
//     } catch (error) {
//       console.error('[Sigme] Failed to detect website:', error);
//       return null;
//     }
//   }

//   // ===================================================== 
//   // INITIALIZE
//   // ===================================================== 
//   async function initialize() {
//     try {
//       const config = await detectWebsite();
//       if (!config) {
//         console.warn('[Sigme] Could not load configuration - aborting');
//         return;
//       }

//       // Add API URL to config so service worker knows where to send requests
//       config.apiUrl = SIGME_API;

//       console.log('[Sigme] Registering service worker...');
//       const registration = await navigator.serviceWorker.register(SW_PATH, {
//         scope: '/' // Important: Set scope to root
//       });
      
//       await navigator.serviceWorker.ready;

//       if (registration.active) {
//         registration.active.postMessage({
//           type: 'SIGME_INIT',
//           config
//         });
//       }

//       if (Notification.permission === 'granted') {
//         subscribeUser(registration);
//       } else if (Notification.permission === 'default') {
//         showSubscribePrompt(config, registration);
//       } else {
//         console.log('[Sigme] Notifications denied by user');
//       }
//     } catch (err) {
//       console.error('[Sigme] Initialization failed:', err);
//     }
//   }

//   // ===================================================== 
//   // PROMPT UI
//   // ===================================================== 
//   function showSubscribePrompt(config, registration) {
//     const branding = config.branding || {};
    
//     const promptHtml = `
//       <div id="sigme-prompt" style="
//         position: fixed;
//         bottom: 20px;
//         right: 20px;
//         background: white;
//         border-radius: 12px;
//         box-shadow: 0 10px 40px rgba(0,0,0,0.2);
//         padding: 20px;
//         max-width: 380px;
//         z-index: 999999;
//         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//       ">
//         <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
//           ${branding.logo_url 
//             ? `<img src="${branding.logo_url}" alt="Logo" style="width: 40px; height: 40px; border-radius: 8px;">` 
//             : '🔔'
//           }
//           <div>
//             <div style="font-weight: 600; font-size: 16px; color: #1a1a1a;">
//               Get notifications from ${config.websiteName}
//             </div>
//             <div style="font-size: 14px; color: #666; margin-top: 2px;">
//               Stay updated with the latest news and offers
//             </div>
//           </div>
//         </div>
//         <div style="display: flex; gap: 8px; margin-top: 16px;">
//           <button id="sigme-allow" style="
//             flex: 1;
//             background: ${branding.primary_color || '#3b82f6'};
//             color: white;
//             border: none;
//             padding: 10px 16px;
//             border-radius: 8px;
//             font-weight: 600;
//             cursor: pointer;
//             font-size: 14px;
//           ">
//             Allow
//           </button>
//           <button id="sigme-deny" style="
//             flex: 1;
//             background: #f3f4f6;
//             color: #6b7280;
//             border: none;
//             padding: 10px 16px;
//             border-radius: 8px;
//             font-weight: 600;
//             cursor: pointer;
//             font-size: 14px;
//           ">
//             Not Now
//           </button>
//         </div>
//       </div>
//     `;

//     const div = document.createElement('div');
//     div.innerHTML = promptHtml;
//     document.body.appendChild(div);

//     document.getElementById('sigme-allow').onclick = async () => {
//       try {
//         const permission = await Notification.requestPermission();
//         if (permission === 'granted') {
//           subscribeUser(registration);
//         }
//       } catch (error) {
//         console.error('[Sigme] Permission request failed:', error);
//       }
//       div.remove();
//     };

//     document.getElementById('sigme-deny').onclick = () => {
//       localStorage.setItem('sigme_prompt_dismissed', Date.now());
//       div.remove();
//     };
//   }

//   // ===================================================== 
//   // SUBSCRIBE
//   // ===================================================== 
//   function subscribeUser(registration) {
//     if (registration.active) {
//       registration.active.postMessage({
//         type: 'SIGME_SUBSCRIBE'
//       });
//     }
//   }

//   // ===================================================== 
//   // SERVICE WORKER MESSAGES
//   // ===================================================== 
//   navigator.serviceWorker.addEventListener('message', (event) => {
//     if (event.data?.type === 'SIGME_SUBSCRIBED') {
//       if (event.data.success) {
//         console.log('[Sigme] Subscribed successfully!');
//       } else {
//         console.warn('[Sigme] Subscription failed:', event.data.error);
//       }
//     }

//     if (event.data?.type === 'SIGME_SHOW_NOTIFICATION') {
//       showInPageNotification(event.data.notification);
//     }
//   });

//   // ===================================================== 
//   // IN-PAGE NOTIFICATION
//   // ===================================================== 
//   function showInPageNotification(notification) {
//     const div = document.createElement('div');
//     div.style.cssText = `
//       position: fixed;
//       top: 20px;
//       right: 20px;
//       background: white;
//       padding: 16px;
//       border-radius: 12px;
//       box-shadow: 0 10px 40px rgba(0,0,0,0.2);
//       z-index: 999999;
//       cursor: pointer;
//       max-width: 350px;
//       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//     `;

//     div.innerHTML = `
//       <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">
//         ${notification.title}
//       </div>
//       <div style="font-size: 14px; color: #666;">
//         ${notification.body}
//       </div>
//     `;

//     document.body.appendChild(div);

//     div.onclick = () => {
//       if (notification.url) window.open(notification.url, '_blank');
//       div.remove();
//     };

//     setTimeout(() => div.remove(), 5000);
//   }

//   // ===================================================== 
//   // AUTO INIT
//   // ===================================================== 
//   const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
//   const sevenDays = 7 * 24 * 60 * 60 * 1000;

//   if (!lastDismissed || Date.now() - lastDismissed > sevenDays) {
//     if (document.readyState === 'loading') {
//       document.addEventListener('DOMContentLoaded', initialize);
//     } else {
//       initialize();
//     }
//   }

//   // ===================================================== 
//   // PUBLIC API
//   // ===================================================== 
//   window.Sigme = {
//     subscribe: initialize,
//     getPermission: () => Notification.permission
//   };

//   console.log('[Sigme] Script ready');
// })();

// ============================================
// FILE: BACKEND/public/sigme.js
// ============================================
(function () {
  'use strict';

  console.log('[Sigme] Universal script loading...');

  // ===================================================== 
  // CONFIGURATION
  // ===================================================== 
  const API_BASE_URL = window.SIGME_API_URL || 'https://sigme-backend-fkde.vercel.app';
  const SIGME_API = API_BASE_URL;
  
  // ✅ Service worker must be on same origin as the website
  const SW_PATH = '/sigme-universal-sw.js';

  console.log('[Sigme] API URL:', SIGME_API);
  console.log('[Sigme] SW Path:', SW_PATH);

  // ===================================================== 
  // ENV CHECKS
  // ===================================================== 
  const currentDomain = window.location.hostname;
  console.log('[Sigme] Current domain:', currentDomain);

  if (!('serviceWorker' in navigator)) {
    console.warn('[Sigme] Service workers not supported');
    return;
  }

  if (!('PushManager' in window)) {
    console.warn('[Sigme] Push notifications not supported');
    return;
  }

  // ===================================================== 
  // DETECT WEBSITE
  // ===================================================== 
  async function detectWebsite() {
    try {
      console.log('[Sigme] Detecting website configuration...');
      
      const response = await fetch(
        `${SIGME_API}/api/websites/detect?domain=${encodeURIComponent(currentDomain)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        console.error('[Sigme] Website not found:', data.error);
        return null;
      }

      console.log('[Sigme] Configuration loaded:', data.config.websiteName);
      return data.config;
    } catch (error) {
      console.error('[Sigme] Failed to detect website:', error);
      return null;
    }
  }

  // ===================================================== 
  // INITIALIZE
  // ===================================================== 
  async function initialize() {
    try {
      const config = await detectWebsite();
      if (!config) {
        console.warn('[Sigme] Could not load configuration - aborting');
        return;
      }

      // Add API URL to config so service worker knows where to send requests
      config.apiUrl = SIGME_API;

      console.log('[Sigme] Registering service worker...');
      
      // Check if service worker file exists
      try {
        const swCheck = await fetch(SW_PATH, { method: 'HEAD' });
        if (!swCheck.ok) {
          console.error('[Sigme] Service worker file not found. Please add sigme-universal-sw.js to your /public folder.');
          console.error('[Sigme] Download from: https://sigme-backend-fkde.vercel.app/sigme-universal-sw.js');
          return;
        }
      } catch (e) {
        console.error('[Sigme] Could not verify service worker file:', e.message);
        return;
      }

      const registration = await navigator.serviceWorker.register(SW_PATH, {
        scope: '/'
      });
      
      await navigator.serviceWorker.ready;
      console.log('[Sigme] Service worker registered successfully');

      if (registration.active) {
        registration.active.postMessage({
          type: 'SIGME_INIT',
          config
        });
      }

      if (Notification.permission === 'granted') {
        subscribeUser(registration);
      } else if (Notification.permission === 'default') {
        showSubscribePrompt(config, registration);
      } else {
        console.log('[Sigme] Notifications denied by user');
      }
    } catch (err) {
      console.error('[Sigme] Initialization failed:', err);
      
      if (err.message.includes('ServiceWorker')) {
        console.error('[Sigme] Make sure sigme-universal-sw.js exists in your /public folder');
        console.error('[Sigme] Download from: https://sigme-backend-fkde.vercel.app/sigme-universal-sw.js');
      }
    }
  }

  // ===================================================== 
  // PROMPT UI
  // ===================================================== 
  function showSubscribePrompt(config, registration) {
    const branding = config.branding || {};
    
    const promptHtml = `
      <div id="sigme-prompt" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        padding: 20px;
        max-width: 380px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      ">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          ${branding.logo_url 
            ? `<img src="${branding.logo_url}" alt="Logo" style="width: 40px; height: 40px; border-radius: 8px;">` 
            : '🔔'
          }
          <div>
            <div style="font-weight: 600; font-size: 16px; color: #1a1a1a;">
              Get notifications from ${config.websiteName}
            </div>
            <div style="font-size: 14px; color: #666; margin-top: 2px;">
              Stay updated with the latest news and offers
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 16px;">
          <button id="sigme-allow" style="
            flex: 1;
            background: ${branding.primary_color || '#3b82f6'};
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
          ">
            Allow
          </button>
          <button id="sigme-deny" style="
            flex: 1;
            background: #f3f4f6;
            color: #6b7280;
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
          ">
            Not Now
          </button>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = promptHtml;
    document.body.appendChild(div);

    document.getElementById('sigme-allow').onclick = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          subscribeUser(registration);
        }
      } catch (error) {
        console.error('[Sigme] Permission request failed:', error);
      }
      div.remove();
    };

    document.getElementById('sigme-deny').onclick = () => {
      localStorage.setItem('sigme_prompt_dismissed', Date.now());
      div.remove();
    };
  }

  // ===================================================== 
  // SUBSCRIBE
  // ===================================================== 
  function subscribeUser(registration) {
    if (registration.active) {
      registration.active.postMessage({
        type: 'SIGME_SUBSCRIBE'
      });
    }
  }

  // ===================================================== 
  // SERVICE WORKER MESSAGES
  // ===================================================== 
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SIGME_SUBSCRIBED') {
      if (event.data.success) {
        console.log('[Sigme] Subscribed successfully!');
      } else {
        console.warn('[Sigme] Subscription failed:', event.data.error);
      }
    }

    if (event.data?.type === 'SIGME_SHOW_NOTIFICATION') {
      showInPageNotification(event.data.notification);
    }
  });

  // ===================================================== 
  // IN-PAGE NOTIFICATION
  // ===================================================== 
  function showInPageNotification(notification) {
    const div = document.createElement('div');
    div.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      padding: 16px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 999999;
      cursor: pointer;
      max-width: 350px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;

    div.innerHTML = `
      <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">
        ${notification.title}
      </div>
      <div style="font-size: 14px; color: #666;">
        ${notification.body}
      </div>
    `;

    document.body.appendChild(div);

    div.onclick = () => {
      if (notification.url) window.open(notification.url, '_blank');
      div.remove();
    };

    setTimeout(() => div.remove(), 5000);
  }

  // ===================================================== 
  // AUTO INIT
  // ===================================================== 
  const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  if (!lastDismissed || Date.now() - lastDismissed > sevenDays) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize);
    } else {
      initialize();
    }
  }

  // ===================================================== 
  // PUBLIC API
  // ===================================================== 
  window.Sigme = {
    subscribe: initialize,
    getPermission: () => Notification.permission
  };

  console.log('[Sigme] Script ready');
})();