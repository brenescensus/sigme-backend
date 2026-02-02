// // // // // // // ============================================
// // // // // // // FILE: BACKEND/public/sigme.js
// // // // // // // ============================================
// // // // // // (function () {
// // // // // //   'use strict';

// // // // // //   console.log('[Sigme] Universal script loading...');
  

// // // // // //    const getCurrentScriptUrl = () => {
// // // // // //     const scripts = document.getElementsByTagName('script');
// // // // // //     for (let script of scripts) {
// // // // // //       if (script.src && script.src.includes('sigme.js')) {
// // // // // //         const url = new URL(script.src);
// // // // // //         console.log('[Sigme] Detected script URL:', url.origin);
// // // // // //         return url.origin;
// // // // // //       }
// // // // // //     }


// // // // // //     // Fallback to production backend
// // // // // //     console.log('[Sigme] Could not detect script URL, using default');
// // // // // //     return 'http://localhost:3000';
// // // // // //   };

// // // // // //   const API_BASE_URL = window.SIGME_API_URL || getCurrentScriptUrl();
// // // // // //   const SIGME_API = API_BASE_URL;


// // // // // //   // current_step_id Service worker must be on same origin as the website
// // // // // //   const SW_PATH = '/sigme-universal-sw.js';

// // // // // //   console.log('[Sigme] API URL:', SIGME_API);
// // // // // //   console.log('[Sigme] SW Path:', SW_PATH);

// // // // // //   // ===================================================== 
// // // // // //   // CONFIGURATION
// // // // // //   // ===================================================== 
// // // // // //   // const API_BASE_URL = window.SIGME_API_URL || 'https://sigme-backend-fkde.vercel.app';
// // // // // //   // const SIGME_API = API_BASE_URL;
  
// // // // // //   // // current_step_id Service worker must be on same origin as the website
// // // // // //   // const SW_PATH = '/sigme-universal-sw.js';

// // // // // //   // console.log('[Sigme] API URL:', SIGME_API);
// // // // // //   // console.log('[Sigme] SW Path:', SW_PATH);

// // // // // //   // ===================================================== 
// // // // // //   // ENV CHECKS
// // // // // //   // ===================================================== 
// // // // // //   const currentDomain = window.location.hostname;
// // // // // //   console.log('[Sigme] Current domain:', currentDomain);

// // // // // //   if (!('serviceWorker' in navigator)) {
// // // // // //     console.warn('[Sigme] Service workers not supported');
// // // // // //     return;
// // // // // //   }

// // // // // //   if (!('PushManager' in window)) {
// // // // // //     console.warn('[Sigme] Push notifications not supported');
// // // // // //     return;
// // // // // //   }

// // // // // //   // ===================================================== 
// // // // // //   // DETECT WEBSITE
// // // // // //   // ===================================================== 
// // // // // //   async function detectWebsite() {
// // // // // //     try {
// // // // // //       console.log('[Sigme] Detecting website configuration...');
      
// // // // // //       const response = await fetch(
// // // // // //         `${SIGME_API}/api/websites/detect?domain=${encodeURIComponent(currentDomain)}`
// // // // // //       );

// // // // // //       if (!response.ok) {
// // // // // //         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
// // // // // //       }

// // // // // //       const data = await response.json();

// // // // // //       if (!data.success) {
// // // // // //         console.error('[Sigme] Website not found:', data.error);
// // // // // //         return null;
// // // // // //       }

// // // // // //       console.log('[Sigme] Configuration loaded:', data.config.websiteName);
// // // // // //       return data.config;
// // // // // //     } catch (error) {
// // // // // //       console.error('[Sigme] Failed to detect website:', error);
// // // // // //       return null;
// // // // // //     }
// // // // // //   }

// // // // // //   // ===================================================== 
// // // // // //   // INITIALIZE
// // // // // //   // ===================================================== 
// // // // // //   async function initialize() {
// // // // // //     try {
// // // // // //       const config = await detectWebsite();
// // // // // //       if (!config) {
// // // // // //         console.warn('[Sigme] Could not load configuration - aborting');
// // // // // //         return;
// // // // // //       }

// // // // // //       // Add API URL to config so service worker knows where to send requests
// // // // // //       config.apiUrl = SIGME_API;

// // // // // //       console.log('[Sigme] Registering service worker...');
      
// // // // // //       // Check if service worker file exists
// // // // // //       try {
// // // // // //         const swCheck = await fetch(SW_PATH, { method: 'HEAD' });
// // // // // //         if (!swCheck.ok) {
// // // // // //           console.error('[Sigme] Service worker file not found. Please add sigme-universal-sw.js to your /public folder.');
// // // // // //           console.error('[Sigme] Download from: https://sigme-backend-fkde.vercel.app/sigme-universal-sw.js');
// // // // // //           return;
// // // // // //         }
// // // // // //       } catch (e) {
// // // // // //         console.error('[Sigme] Could not verify service worker file:', e.message);
// // // // // //         return;
// // // // // //       }

// // // // // //       const registration = await navigator.serviceWorker.register(SW_PATH, {
// // // // // //         scope: '/'
// // // // // //       });
      
// // // // // //       await navigator.serviceWorker.ready;
// // // // // //       console.log('[Sigme] Service worker registered successfully');

// // // // // //       if (registration.active) {
// // // // // //         registration.active.postMessage({
// // // // // //           type: 'SIGME_INIT',
// // // // // //           config
// // // // // //         });
// // // // // //       }

// // // // // //       if (Notification.permission === 'granted') {
// // // // // //         subscribeUser(registration);
// // // // // //       } else if (Notification.permission === 'default') {
// // // // // //         showSubscribePrompt(config, registration);
// // // // // //       } else {
// // // // // //         console.log('[Sigme] Notifications denied by user');
// // // // // //       }
// // // // // //     } catch (err) {
// // // // // //       console.error('[Sigme] Initialization failed:', err);
      
// // // // // //       if (err.message.includes('ServiceWorker')) {
// // // // // //         console.error('[Sigme] Make sure sigme-universal-sw.js exists in your /public folder');
// // // // // //         console.error('[Sigme] Download from: https://sigme-backend-fkde.vercel.app/sigme-universal-.js');
// // // // // //       }
// // // // // //     }
// // // // // //   }

// // // // // //   // ===================================================== 
// // // // // //   // PROMPT UI
// // // // // //   // ===================================================== 
// // // // // //   function showSubscribePrompt(config, registration) {
// // // // // //     const branding = config.branding || {};
    
// // // // // //     const promptHtml = `
// // // // // //       <div id="sigme-prompt" style="
// // // // // //         position: fixed;
// // // // // //         bottom: 20px;
// // // // // //         right: 20px;
// // // // // //         background: white;
// // // // // //         border-radius: 12px;
// // // // // //         box-shadow: 0 10px 40px rgba(0,0,0,0.2);
// // // // // //         padding: 20px;
// // // // // //         max-width: 380px;
// // // // // //         z-index: 999999;
// // // // // //         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
// // // // // //       ">
// // // // // //         <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
// // // // // //           ${branding.logo_url 
// // // // // //             ? `<img src="${branding.logo_url}" alt="Logo" style="width: 40px; height: 40px; border-radius: 8px;">` 
// // // // // //             : ''
// // // // // //           }
// // // // // //           <div>
// // // // // //             <div style="font-weight: 600; font-size: 16px; color: #1a1a1a;">
// // // // // //               Get notifications from ${config.websiteName}
// // // // // //             </div>
// // // // // //             <div style="font-size: 14px; color: #666; margin-top: 2px;">
// // // // // //               Stay updated with the latest news and offers
// // // // // //             </div>
// // // // // //           </div>
// // // // // //         </div>
// // // // // //         <div style="display: flex; gap: 8px; margin-top: 16px;">
// // // // // //           <button id="sigme-allow" style="
// // // // // //             flex: 1;
// // // // // //             background: ${branding.primary_color || '#3b82f6'};
// // // // // //             color: white;
// // // // // //             border: none;
// // // // // //             padding: 10px 16px;
// // // // // //             border-radius: 8px;
// // // // // //             font-weight: 600;
// // // // // //             cursor: pointer;
// // // // // //             font-size: 14px;
// // // // // //           ">
// // // // // //             Allow
// // // // // //           </button>
// // // // // //           <button id="sigme-deny" style="
// // // // // //             flex: 1;
// // // // // //             background: #f3f4f6;
// // // // // //             color: #6b7280;
// // // // // //             border: none;
// // // // // //             padding: 10px 16px;
// // // // // //             border-radius: 8px;
// // // // // //             font-weight: 600;
// // // // // //             cursor: pointer;
// // // // // //             font-size: 14px;
// // // // // //           ">
// // // // // //             Not Now
// // // // // //           </button>
// // // // // //         </div>
// // // // // //       </div>
// // // // // //     `;

// // // // // //     const div = document.createElement('div');
// // // // // //     div.innerHTML = promptHtml;
// // // // // //     document.body.appendChild(div);

// // // // // //     document.getElementById('sigme-allow').onclick = async () => {
// // // // // //       try {
// // // // // //         const permission = await Notification.requestPermission();
// // // // // //         if (permission === 'granted') {
// // // // // //           subscribeUser(registration);
// // // // // //         }
// // // // // //       } catch (error) {
// // // // // //         console.error('[Sigme] Permission request failed:', error);
// // // // // //       }
// // // // // //       div.remove();
// // // // // //     };

// // // // // //     document.getElementById('sigme-deny').onclick = () => {
// // // // // //       localStorage.setItem('sigme_prompt_dismissed', Date.now());
// // // // // //       div.remove();
// // // // // //     };
// // // // // //   }

// // // // // //   // ===================================================== 
// // // // // //   // SUBSCRIBE
// // // // // //   // ===================================================== 
// // // // // //   function subscribeUser(registration) {
// // // // // //     if (registration.active) {
// // // // // //       registration.active.postMessage({
// // // // // //         type: 'SIGME_SUBSCRIBE'
// // // // // //       });
// // // // // //     }
// // // // // //   }

// // // // // //   // ===================================================== 
// // // // // //   // SERVICE WORKER MESSAGES
// // // // // //   // ===================================================== 
// // // // // //   navigator.serviceWorker.addEventListener('message', (event) => {
// // // // // //     if (event.data?.type === 'SIGME_SUBSCRIBED') {
// // // // // //       if (event.data.success) {
// // // // // //         console.log('[Sigme] Subscribed successfully!');
// // // // // //       } else {
// // // // // //         console.warn('[Sigme] Subscription failed:', event.data.error);
// // // // // //       }
// // // // // //     }

// // // // // //     if (event.data?.type === 'SIGME_SHOW_NOTIFICATION') {
// // // // // //       showInPageNotification(event.data.notification);
// // // // // //     }
// // // // // //   });

// // // // // //   // ===================================================== 
// // // // // //   // IN-PAGE NOTIFICATION
// // // // // //   // ===================================================== 
// // // // // //   function showInPageNotification(notification) {
// // // // // //     const div = document.createElement('div');
// // // // // //     div.style.cssText = `
// // // // // //       position: fixed;
// // // // // //       top: 20px;
// // // // // //       right: 20px;
// // // // // //       background: white;
// // // // // //       padding: 16px;
// // // // // //       border-radius: 12px;
// // // // // //       box-shadow: 0 10px 40px rgba(0,0,0,0.2);
// // // // // //       z-index: 999999;
// // // // // //       cursor: pointer;
// // // // // //       max-width: 350px;
// // // // // //       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
// // // // // //     `;

// // // // // //     div.innerHTML = `
// // // // // //       <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">
// // // // // //         ${notification.title}
// // // // // //       </div>
// // // // // //       <div style="font-size: 14px; color: #666;">
// // // // // //         ${notification.body}
// // // // // //       </div>
// // // // // //     `;

// // // // // //     document.body.appendChild(div);

// // // // // //     div.onclick = () => {
// // // // // //       if (notification.url) window.open(notification.url, '_blank');
// // // // // //       div.remove();
// // // // // //     };

// // // // // //     setTimeout(() => div.remove(), 5000);
// // // // // //   }

// // // // // //   // ===================================================== 
// // // // // //   // AUTO INIT
// // // // // //   // ===================================================== 
// // // // // //   const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
// // // // // //   const sevenDays = 7 * 24 * 60 * 60 * 1000;

// // // // // //   if (!lastDismissed || Date.now() - lastDismissed > sevenDays) {
// // // // // //     if (document.readyState === 'loading') {
// // // // // //       document.addEventListener('DOMContentLoaded', initialize);
// // // // // //     } else {
// // // // // //       initialize();
// // // // // //     }
// // // // // //   }

// // // // // //   // ===================================================== 
// // // // // //   // PUBLIC API
// // // // // //   // ===================================================== 
// // // // // //   window.Sigme = {
// // // // // //     subscribe: initialize,
// // // // // //     getPermission: () => Notification.permission
// // // // // //   };

// // // // // //   console.log('[Sigme] Script ready');
// // // // // // })();









// // // // // // ============================================
// // // // // // FILE: BACKEND/public/sigme.js
// // // // // // ============================================
// // // // // (function () {
// // // // //   'use strict';

// // // // //   console.log('[Sigme] Universal script loading...');
  
// // // // //   // ... [Keep all your existing code until the PUBLIC API section] ...

// // // // //   // ===================================================== 
// // // // //   //  NEW: PAGE VIEW TRACKING
// // // // //   // ===================================================== 
// // // // //   let pageTrackingInitialized = false;
// // // // //   let lastTrackedUrl = null;

// // // // //   /**
// // // // //    * Initialize automatic page view tracking
// // // // //    */
// // // // //   function initPageTracking() {
// // // // //     if (pageTrackingInitialized) {
// // // // //       console.log('[Sigme] Page tracking already initialized');
// // // // //       return;
// // // // //     }

// // // // //     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
// // // // //     if (!subscriberId) {
// // // // //       console.log('[Sigme] No subscriber ID yet, page tracking will start after subscription');
// // // // //       return;
// // // // //     }

// // // // //     console.log('[Sigme]  Initializing page tracking...');
// // // // //     pageTrackingInitialized = true;

// // // // //     // Track initial page view
// // // // //     trackPageView(subscriberId);

// // // // //     // Track page views on navigation (for SPAs)
// // // // //     setInterval(() => {
// // // // //       const currentUrl = window.location.href;
// // // // //       if (currentUrl !== lastTrackedUrl) {
// // // // //         trackPageView(subscriberId);
// // // // //       }
// // // // //     }, 1000);

// // // // //     // Track on popstate (back/forward navigation)
// // // // //     window.addEventListener('popstate', () => {
// // // // //       trackPageView(subscriberId);
// // // // //     });

// // // // //     console.log('[Sigme]  Page tracking initialized');
// // // // //   }

// // // // //   /**
// // // // //    * Track page view event
// // // // //    */
// // // // //   async function trackPageView(subscriberId) {
// // // // //     const pageUrl = window.location.href;
    
// // // // //     // Don't track the same URL twice in a row
// // // // //     if (pageUrl === lastTrackedUrl) {
// // // // //       return;
// // // // //     }
    
// // // // //     lastTrackedUrl = pageUrl;
// // // // //     const pageTitle = document.title;
// // // // //     const pagePath = window.location.pathname;

// // // // //     console.log('[Sigme]  Tracking page view:', pagePath);

// // // // //     try {
// // // // //       const response = await fetch(`${SIGME_API}/api/events/track`, {
// // // // //         method: 'POST',
// // // // //         headers: {
// // // // //           'Content-Type': 'application/json',
// // // // //         },
// // // // //         body: JSON.stringify({
// // // // //           subscriber_id: subscriberId,
// // // // //           website_id: window.SigmeConfig?.websiteId,
// // // // //           event_name: 'page_view',
// // // // //           properties: {
// // // // //             url: pageUrl,
// // // // //             title: pageTitle,
// // // // //             path: pagePath,
// // // // //             referrer: document.referrer || null,
// // // // //             timestamp: new Date().toISOString(),
// // // // //           },
// // // // //         }),
// // // // //       });

// // // // //       if (response.ok) {
// // // // //         const result = await response.json();
// // // // //         console.log('[Sigme]  Page view tracked:', result);
// // // // //       } else {
// // // // //         const errorText = await response.text();
// // // // //         console.error('[Sigme]  Page view tracking failed:', errorText);
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error('[Sigme]  Page view tracking error:', error);
// // // // //     }
// // // // //   }

// // // // //   /**
// // // // //    *  NEW: Track custom events
// // // // //    */
// // // // //   async function trackCustomEvent(eventName, properties = {}) {
// // // // //     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
// // // // //     if (!subscriberId) {
// // // // //       console.warn('[Sigme]  Cannot track event - no subscriber ID');
// // // // //       return { success: false, error: 'No subscriber ID' };
// // // // //     }

// // // // //     console.log(`[Sigme]  Tracking custom event: ${eventName}`);

// // // // //     try {
// // // // //       const response = await fetch(`${SIGME_API}/api/events/track`, {
// // // // //         method: 'POST',
// // // // //         headers: {
// // // // //           'Content-Type': 'application/json',
// // // // //         },
// // // // //         body: JSON.stringify({
// // // // //           subscriber_id: subscriberId,
// // // // //           website_id: window.SigmeConfig?.websiteId,
// // // // //           event_name: eventName,
// // // // //           properties: properties,
// // // // //         }),
// // // // //       });

// // // // //       if (response.ok) {
// // // // //         const result = await response.json();
// // // // //         console.log(`[Sigme]  Event tracked:`, result);
// // // // //         return { success: true, data: result };
// // // // //       } else {
// // // // //         const errorText = await response.text();
// // // // //         console.error(`[Sigme]  Event tracking failed:`, errorText);
// // // // //         return { success: false, error: errorText };
// // // // //       }
// // // // //     } catch (error) {
// // // // //       console.error(`[Sigme]  Event tracking error:`, error);
// // // // //       return { success: false, error: error.message };
// // // // //     }
// // // // //   }

// // // // //   // ===================================================== 
// // // // //   // SERVICE WORKER MESSAGES (UPDATE THIS SECTION)
// // // // //   // ===================================================== 
// // // // //   navigator.serviceWorker.addEventListener('message', (event) => {
// // // // //     if (event.data?.type === 'SIGME_SUBSCRIBED') {
// // // // //       if (event.data.success) {
// // // // //         console.log('[Sigme]  Subscribed successfully!');
        
// // // // //         //  SAVE SUBSCRIBER ID
// // // // //         if (event.data.data?.subscriber_id) {
// // // // //           localStorage.setItem('sigme_subscriber_id', event.data.data.subscriber_id);
// // // // //           console.log('[Sigme]  Subscriber ID saved:', event.data.data.subscriber_id);
          
// // // // //           //  START PAGE TRACKING AFTER SUBSCRIPTION
// // // // //           setTimeout(() => {
// // // // //             console.log('[Sigme] Starting page tracking after subscription...');
// // // // //             initPageTracking();
// // // // //           }, 1000);
// // // // //         }
// // // // //       } else {
// // // // //         console.warn('[Sigme]  Subscription failed:', event.data.error);
// // // // //       }
// // // // //     }

// // // // //     if (event.data?.type === 'SIGME_SHOW_NOTIFICATION') {
// // // // //       showInPageNotification(event.data.notification);
// // // // //     }
// // // // //   });

// // // // //   // ... [Keep your existing IN-PAGE NOTIFICATION function] ...

// // // // //   // ===================================================== 
// // // // //   // AUTO INIT (UPDATE THIS SECTION)
// // // // //   // ===================================================== 
// // // // //   const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
// // // // //   const sevenDays = 7 * 24 * 60 * 60 * 1000;

// // // // //   if (!lastDismissed || Date.now() - lastDismissed > sevenDays) {
// // // // //     if (document.readyState === 'loading') {
// // // // //       document.addEventListener('DOMContentLoaded', () => {
// // // // //         initialize();
// // // // //         //  START PAGE TRACKING IF ALREADY SUBSCRIBED
// // // // //         initPageTracking();
// // // // //       });
// // // // //     } else {
// // // // //       initialize();
// // // // //       //  START PAGE TRACKING IF ALREADY SUBSCRIBED
// // // // //       initPageTracking();
// // // // //     }
// // // // //   } else {
// // // // //     // Even if prompt was dismissed, still track pages if user is subscribed
// // // // //     if (document.readyState === 'loading') {
// // // // //       document.addEventListener('DOMContentLoaded', initPageTracking);
// // // // //     } else {
// // // // //       initPageTracking();
// // // // //     }
// // // // //   }

// // // // //   // ===================================================== 
// // // // //   // PUBLIC API (UPDATE THIS SECTION)
// // // // //   // ===================================================== 
// // // // //   window.Sigme = {
// // // // //     subscribe: initialize,
// // // // //     getPermission: () => Notification.permission,
// // // // //     //  NEW: Custom event tracking API
// // // // //     track: trackCustomEvent,
// // // // //     //  NEW: Manual page tracking (if needed)
// // // // //     trackPageView: () => {
// // // // //       const subscriberId = localStorage.getItem('sigme_subscriber_id');
// // // // //       if (subscriberId) {
// // // // //         trackPageView(subscriberId);
// // // // //       } else {
// // // // //         console.warn('[Sigme] Cannot track page - no subscriber ID');
// // // // //       }
// // // // //     }
// // // // //   };

// // // // //   console.log('[Sigme] Script ready');
// // // // // })();





// // // // // ============================================
// // // // // FILE: BACKEND/public/sigme.js
// // // // // Universal Sigme SDK - Client-Side Script
// // // // // ============================================

// // // // (function () {
// // // //   'use strict';

// // // //   console.log('[Sigme] Universal script loading...');
  
// // // //   // ============================================
// // // //   // API URL DETECTION
// // // //   // ============================================
  
// // // //   const getCurrentScriptUrl = () => {
// // // //     const scripts = document.getElementsByTagName('script');
// // // //     for (let script of scripts) {
// // // //       if (script.src && script.src.includes('sigme.js')) {
// // // //         const url = new URL(script.src);
// // // //         console.log('[Sigme]  Detected script URL:');
// // // //         return url.origin;
// // // //       }
// // // //     }

// // // //     // Fallback to default
// // // //     console.log('[Sigme]  Could not detect script URL, using default');
// // // //     return 'http://localhost:3000';
// // // //   };

// // // //   const API_BASE_URL = window.SIGME_API_URL || getCurrentScriptUrl();
// // // //   const SIGME_API = API_BASE_URL;

// // // //   //  Service worker MUST be on same origin as the website
// // // //   const SW_PATH = '/sigme-universal-sw.js';

// // // //   // console.log('[Sigme] API URL:', SIGME_API);
// // // //   // console.log('[Sigme] SW Path:', SW_PATH);

// // // //   // ============================================
// // // //   // ENVIRONMENT CHECKS
// // // //   // ============================================
  
// // // //   const currentDomain = window.location.hostname;
// // // //   console.log('[Sigme]  Current domain:', currentDomain);

// // // //   if (!('serviceWorker' in navigator)) {
// // // //     console.warn('[Sigme]  Service workers not supported');
// // // //     return;
// // // //   }

// // // //   if (!('PushManager' in window)) {
// // // //     console.warn('[Sigme]  Push notifications not supported');
// // // //     return;
// // // //   }

// // // //   // ============================================
// // // //   // GLOBAL STATE
// // // //   // ============================================
  
// // // //   let pageTrackingInitialized = false;
// // // //   let lastTrackedUrl = null;
// // // //   let websiteConfig = null;

// // // //   // ============================================
// // // //   // WEBSITE DETECTION
// // // //   // ============================================
  
// // // //   async function detectWebsite() {
// // // //     try {
// // // //       console.log('[Sigme] Detecting website configuration...');
      
// // // //       const response = await fetch(
// // // //         `${SIGME_API}/api/websites/detect?domain=${encodeURIComponent(currentDomain)}`
// // // //       );

// // // //       if (!response.ok) {
// // // //         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
// // // //       }

// // // //       const data = await response.json();

// // // //       if (!data.success) {
// // // //         console.error('[Sigme]  Website not found:', data.error);
// // // //         return null;
// // // //       }

// // // //       console.log('[Sigme]  Configuration loaded:', data.config.websiteName);
// // // //       return data.config;
// // // //     } catch (error) {
// // // //       console.error('[Sigme]  Failed to detect website:', error);
// // // //       return null;
// // // //     }
// // // //   }

// // // //   // ============================================
// // // //   // PAGE VIEW TRACKING
// // // //   // ============================================
  
// // // //   /**
// // // //    * Initialize automatic page view tracking
// // // //    */
// // // //   function initPageTracking() {
// // // //     if (pageTrackingInitialized) {
// // // //       console.log('[Sigme] ℹ Page tracking already initialized');
// // // //       return;
// // // //     }

// // // //     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
// // // //     if (!subscriberId) {
// // // //       console.log('[Sigme] ℹ No subscriber ID yet, page tracking will start after subscription');
// // // //       return;
// // // //     }

// // // //     console.log('[Sigme]  Initializing page tracking...');
// // // //     pageTrackingInitialized = true;

// // // //     // Track initial page view
// // // //     trackPageView(subscriberId);

// // // //     // Track page views on navigation (for SPAs)
// // // //     setInterval(() => {
// // // //       const currentUrl = window.location.href;
// // // //       if (currentUrl !== lastTrackedUrl) {
// // // //         trackPageView(subscriberId);
// // // //       }
// // // //     }, 1000);

// // // //     // Track on popstate (back/forward navigation)
// // // //     window.addEventListener('popstate', () => {
// // // //       const subscriberId = localStorage.getItem('sigme_subscriber_id');
// // // //       if (subscriberId) {
// // // //         trackPageView(subscriberId);
// // // //       }
// // // //     });

// // // //     console.log('[Sigme]  Page tracking initialized');
// // // //   }

// // // //   /**
// // // //    * Track page view event
// // // //    */
// // // //   async function trackPageView(subscriberId) {
// // // //     const pageUrl = window.location.href;
    
// // // //     // Don't track the same URL twice in a row
// // // //     if (pageUrl === lastTrackedUrl) {
// // // //       return;
// // // //     }
    
// // // //     lastTrackedUrl = pageUrl;
// // // //     const pageTitle = document.title;
// // // //     const pagePath = window.location.pathname;

// // // //     console.log('[Sigme]  Tracking page view:', pagePath);

// // // //     try {
// // // //       const response = await fetch(`${SIGME_API}/api/events/track`, {
// // // //         method: 'POST',
// // // //         headers: {
// // // //           'Content-Type': 'application/json',
// // // //         },
// // // //         body: JSON.stringify({
// // // //           subscriber_id: subscriberId,
// // // //           website_id: websiteConfig?.websiteId || window.SigmeConfig?.websiteId,
// // // //           event_name: 'page_view',
// // // //           properties: {
// // // //             url: pageUrl,
// // // //             title: pageTitle,
// // // //             path: pagePath,
// // // //             referrer: document.referrer || null,
// // // //             timestamp: new Date().toISOString(),
// // // //           },
// // // //         }),
// // // //       });

// // // //       if (response.ok) {
// // // //         const result = await response.json();
// // // //         console.log('[Sigme]  Page view tracked:', result);
// // // //       } else {
// // // //         const errorText = await response.text();
// // // //         console.error('[Sigme]  Page view tracking failed:', errorText);
// // // //       }
// // // //     } catch (error) {
// // // //       console.error('[Sigme]  Page view tracking error:', error);
// // // //     }
// // // //   }

// // // //   /**
// // // //    * Track custom events
// // // //    */
// // // //   async function trackCustomEvent(eventName, properties = {}) {
// // // //     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
// // // //     if (!subscriberId) {
// // // //       console.warn('[Sigme]  Cannot track event - no subscriber ID');
// // // //       return { success: false, error: 'No subscriber ID' };
// // // //     }

// // // //     console.log(`[Sigme]  Tracking custom event: ${eventName}`);

// // // //     try {
// // // //       const response = await fetch(`${SIGME_API}/api/events/track`, {
// // // //         method: 'POST',
// // // //         headers: {
// // // //           'Content-Type': 'application/json',
// // // //         },
// // // //         body: JSON.stringify({
// // // //           subscriber_id: subscriberId,
// // // //           website_id: websiteConfig?.websiteId || window.SigmeConfig?.websiteId,
// // // //           event_name: eventName,
// // // //           properties: properties,
// // // //         }),
// // // //       });

// // // //       if (response.ok) {
// // // //         const result = await response.json();
// // // //         console.log(`[Sigme]  Event tracked:`, result);
// // // //         return { success: true, data: result };
// // // //       } else {
// // // //         const errorText = await response.text();
// // // //         console.error(`[Sigme]  Event tracking failed:`, errorText);
// // // //         return { success: false, error: errorText };
// // // //       }
// // // //     } catch (error) {
// // // //       console.error(`[Sigme]  Event tracking error:`, error);
// // // //       return { success: false, error: error.message };
// // // //     }
// // // //   }

// // // //   // ============================================
// // // //   // INITIALIZATION
// // // //   // ============================================
  
// // // //   async function initialize() {
// // // //     try {
// // // //       const config = await detectWebsite();
// // // //       if (!config) {
// // // //         console.warn('[Sigme]  Could not load configuration - aborting');
// // // //         return;
// // // //       }

// // // //       // Store config globally
// // // //       websiteConfig = config;

// // // //       // Add API URL to config so service worker knows where to send requests
// // // //       config.apiUrl = SIGME_API;

// // // //       console.log('[Sigme]  Registering service worker...');
      
// // // //       // Check if service worker file exists
// // // //       try {
// // // //         const swCheck = await fetch(SW_PATH, { method: 'HEAD' });
// // // //         if (!swCheck.ok) {
// // // //           console.error('[Sigme]  Service worker file not found. Please add sigme-universal-sw.js to your /public folder.');
// // // //           console.error('[Sigme]  Download from: ' + SIGME_API + '/sigme-universal-sw.js');
// // // //           return;
// // // //         }
// // // //       } catch (e) {
// // // //         console.error('[Sigme]  Could not verify service worker file:', e.message);
// // // //         return;
// // // //       }

// // // //       const registration = await navigator.serviceWorker.register(SW_PATH, {
// // // //         scope: '/'
// // // //       });
      
// // // //       await navigator.serviceWorker.ready;
// // // //       console.log('[Sigme]  Service worker registered successfully');

// // // //       // Send config to service worker
// // // //       if (registration.active) {
// // // //         registration.active.postMessage({
// // // //           type: 'SIGME_INIT',
// // // //           config
// // // //         });
// // // //       }

// // // //       // Handle notification permission state
// // // //       if (Notification.permission === 'granted') {
// // // //         console.log('[Sigme]  Notification permission already granted');
// // // //         subscribeUser(registration);
// // // //       } else if (Notification.permission === 'default') {
// // // //         console.log('[Sigme] Notification permission not requested yet');
// // // //         showSubscribePrompt(config, registration);
// // // //       } else {
// // // //         console.log('[Sigme]  Notifications denied by user');
// // // //       }

// // // //       //  START PAGE TRACKING IF ALREADY SUBSCRIBED
// // // //       const subscriberId = localStorage.getItem('sigme_subscriber_id');
// // // //       if (subscriberId) {
// // // //         console.log('[Sigme]  Subscriber found, starting page tracking...');
// // // //         initPageTracking();
// // // //       }

// // // //     } catch (err) {
// // // //       console.error('[Sigme]  Initialization failed:', err);
      
// // // //       if (err.message.includes('ServiceWorker')) {
// // // //         console.error('[Sigme]  Make sure sigme-universal-sw.js exists in your /public folder');
// // // //         console.error('[Sigme]  Download from: ' + SIGME_API + '/sigme-universal-sw.js');
// // // //       }
// // // //     }
// // // //   }

// // // //   // ============================================
// // // //   // SUBSCRIPTION PROMPT UI
// // // //   // ============================================
  
// // // //   function showSubscribePrompt(config, registration) {
// // // //     const branding = config.branding || {};
    
// // // //     const promptHtml = `
// // // //       <div id="sigme-prompt" style="
// // // //         position: fixed;
// // // //         bottom: 20px;
// // // //         right: 20px;
// // // //         background: white;
// // // //         border-radius: 12px;
// // // //         box-shadow: 0 10px 40px rgba(0,0,0,0.2);
// // // //         padding: 20px;
// // // //         max-width: 380px;
// // // //         z-index: 999999;
// // // //         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
// // // //         animation: slideIn 0.3s ease-out;
// // // //       ">
// // // //         <style>
// // // //           @keyframes slideIn {
// // // //             from {
// // // //               transform: translateY(100px);
// // // //               opacity: 0;
// // // //             }
// // // //             to {
// // // //               transform: translateY(0);
// // // //               opacity: 1;
// // // //             }
// // // //           }
// // // //         </style>
// // // //         <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
// // // //           ${branding.logo_url 
// // // //             ? `<img src="${branding.logo_url}" alt="Logo" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` 
// // // //             : '<div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;"></div>'
// // // //           }
// // // //           <div style="flex: 1;">
// // // //             <div style="font-weight: 600; font-size: 16px; color: #1a1a1a;">
// // // //               Get notifications from ${config.websiteName}
// // // //             </div>
// // // //             <div style="font-size: 14px; color: #666; margin-top: 2px;">
// // // //               Stay updated with the latest news and offers
// // // //             </div>
// // // //           </div>
// // // //         </div>
// // // //         <div style="display: flex; gap: 8px; margin-top: 16px;">
// // // //           <button id="sigme-allow" style="
// // // //             flex: 1;
// // // //             background: ${branding.primary_color || '#667eea'};
// // // //             color: white;
// // // //             border: none;
// // // //             padding: 10px 16px;
// // // //             border-radius: 8px;
// // // //             font-weight: 600;
// // // //             cursor: pointer;
// // // //             font-size: 14px;
// // // //             transition: all 0.2s;
// // // //           ">
// // // //             Allow
// // // //           </button>
// // // //           <button id="sigme-deny" style="
// // // //             flex: 1;
// // // //             background: #f3f4f6;
// // // //             color: #6b7280;
// // // //             border: none;
// // // //             padding: 10px 16px;
// // // //             border-radius: 8px;
// // // //             font-weight: 600;
// // // //             cursor: pointer;
// // // //             font-size: 14px;
// // // //             transition: all 0.2s;
// // // //           ">
// // // //             Not Now
// // // //           </button>
// // // //         </div>
// // // //       </div>
// // // //     `;

// // // //     const div = document.createElement('div');
// // // //     div.innerHTML = promptHtml;
// // // //     document.body.appendChild(div);

// // // //     // Add hover effects
// // // //     const allowBtn = document.getElementById('sigme-allow');
// // // //     const denyBtn = document.getElementById('sigme-deny');

// // // //     allowBtn.onmouseover = () => {
// // // //       allowBtn.style.opacity = '0.9';
// // // //       allowBtn.style.transform = 'translateY(-1px)';
// // // //     };
// // // //     allowBtn.onmouseout = () => {
// // // //       allowBtn.style.opacity = '1';
// // // //       allowBtn.style.transform = 'translateY(0)';
// // // //     };

// // // //     denyBtn.onmouseover = () => {
// // // //       denyBtn.style.background = '#e5e7eb';
// // // //     };
// // // //     denyBtn.onmouseout = () => {
// // // //       denyBtn.style.background = '#f3f4f6';
// // // //     };

// // // //     // Handle allow button
// // // //     allowBtn.onclick = async () => {
// // // //       try {
// // // //         const permission = await Notification.requestPermission();
// // // //         if (permission === 'granted') {
// // // //           console.log('[Sigme]  Permission granted');
// // // //           subscribeUser(registration);
// // // //         } else {
// // // //           console.log('[Sigme] Permission denied');
// // // //         }
// // // //       } catch (error) {
// // // //         console.error('[Sigme]  Permission request failed:', error);
// // // //       }
// // // //       div.remove();
// // // //     };

// // // //     // Handle deny button
// // // //     denyBtn.onclick = () => {
// // // //       console.log('[Sigme User dismissed prompt');
// // // //       localStorage.setItem('sigme_prompt_dismissed', Date.now());
// // // //       div.remove();
// // // //     };
// // // //   }

// // // //   // ============================================
// // // //   // SUBSCRIBE USER
// // // //   // ============================================
  
// // // //   function subscribeUser(registration) {
// // // //     console.log('[Sigme]  Initiating subscription...');
    
// // // //     if (registration.active) {
// // // //       registration.active.postMessage({
// // // //         type: 'SIGME_SUBSCRIBE'
// // // //       });
// // // //     } else {
// // // //       console.warn('[Sigme]  No active service worker found');
// // // //     }
// // // //   }

// // // //   // ============================================
// // // //   // SERVICE WORKER MESSAGES
// // // //   // ============================================
  
// // // //   navigator.serviceWorker.addEventListener('message', (event) => {
// // // //     if (event.data?.type === 'SIGME_SUBSCRIBED') {
// // // //       if (event.data.success) {
// // // //         console.log('[Sigme]  Subscribed successfully!');
        
// // // //         //  SAVE SUBSCRIBER ID
// // // //         if (event.data.data?.subscriber_id) {
// // // //           localStorage.setItem('sigme_subscriber_id', event.data.data.subscriber_id);
// // // //           // console.log('[Sigme]  Subscriber ID saved:', event.data.data.subscriber_id);
          
// // // //           //  START PAGE TRACKING AFTER SUBSCRIPTION
// // // //           setTimeout(() => {
// // // //             console.log('[Sigme] Starting page tracking after subscription...');
// // // //             initPageTracking();
// // // //           }, 1000);
// // // //         }
// // // //       } else {
// // // //         console.warn('[Sigme]  Subscription failed:', event.data.error);
// // // //       }
// // // //     }

// // // //     if (event.data?.type === 'SIGME_SHOW_NOTIFICATION') {
// // // //       showInPageNotification(event.data.notification);
// // // //     }
// // // //   });

// // // //   // ============================================
// // // //   // IN-PAGE NOTIFICATION (Fallback)
// // // //   // ============================================
  
// // // //   function showInPageNotification(notification) {
// // // //     const div = document.createElement('div');
// // // //     div.style.cssText = `
// // // //       position: fixed;
// // // //       top: 20px;
// // // //       right: 20px;
// // // //       background: white;
// // // //       padding: 16px;
// // // //       border-radius: 12px;
// // // //       box-shadow: 0 10px 40px rgba(0,0,0,0.2);
// // // //       z-index: 999999;
// // // //       cursor: pointer;
// // // //       max-width: 350px;
// // // //       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
// // // //       animation: slideIn 0.3s ease-out;
// // // //     `;

// // // //     div.innerHTML = `
// // // //       <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #1a1a1a;">
// // // //         ${notification.title}
// // // //       </div>
// // // //       <div style="font-size: 14px; color: #666;">
// // // //         ${notification.body}
// // // //       </div>
// // // //     `;

// // // //     document.body.appendChild(div);

// // // //     div.onclick = () => {
// // // //       if (notification.url) window.open(notification.url, '_blank');
// // // //       div.remove();
// // // //     };

// // // //     setTimeout(() => {
// // // //       div.style.opacity = '0';
// // // //       div.style.transform = 'translateX(400px)';
// // // //       div.style.transition = 'all 0.3s ease-out';
// // // //       setTimeout(() => div.remove(), 300);
// // // //     }, 5000);
// // // //   }

// // // //   // ============================================
// // // //   // AUTO INITIALIZATION
// // // //   // ============================================
  
// // // //   const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
// // // //   const sevenDays = 7 * 24 * 60 * 60 * 1000;

// // // //   if (!lastDismissed || Date.now() - Number(lastDismissed) > sevenDays) {
// // // //     // Show prompt and initialize
// // // //     if (document.readyState === 'loading') {
// // // //       document.addEventListener('DOMContentLoaded', () => {
// // // //         initialize();
// // // //         initPageTracking();
// // // //       });
// // // //     } else {
// // // //       initialize();
// // // //       initPageTracking();
// // // //     }
// // // //   } else {
// // // //     // Prompt was dismissed, but still track pages if user is subscribed
// // // //     console.log('[Sigme Prompt dismissed recently, skipping initialization');
    
// // // //     if (document.readyState === 'loading') {
// // // //       document.addEventListener('DOMContentLoaded', initPageTracking);
// // // //     } else {
// // // //       initPageTracking();
// // // //     }
// // // //   }

// // // //   // ============================================
// // // //   // PUBLIC API
// // // //   // ============================================
  
// // // //   window.Sigme = {
// // // //     /**
// // // //      * Manually trigger subscription prompt
// // // //      */
// // // //     subscribe: initialize,
    
// // // //     /**
// // // //      * Get current notification permission status
// // // //      * @returns {string} 'granted', 'denied', or 'default'
// // // //      */
// // // //     getPermission: () => Notification.permission,
    
// // // //     /**
// // // //      * Track custom events
// // // //      * @param {string} eventName - Name of the event
// // // //      * @param {Object} properties - Event properties
// // // //      * @returns {Promise<Object>} Result object
// // // //      */
// // // //     track: trackCustomEvent,
    
// // // //     /**
// // // //      * Manually track current page view
// // // //      */
// // // //     trackPageView: () => {
// // // //       const subscriberId = localStorage.getItem('sigme_subscriber_id');
// // // //       if (subscriberId) {
// // // //         trackPageView(subscriberId);
// // // //       } else {
// // // //         console.warn('[Sigme]  Cannot track page - no subscriber ID');
// // // //       }
// // // //     },

// // // //     /**
// // // //      * Get subscriber ID
// // // //      * @returns {string|null} Subscriber ID or null
// // // //      */
// // // //     getSubscriberId: () => {
// // // //       return localStorage.getItem('sigme_subscriber_id');
// // // //     },

// // // //     /**
// // // //      * Check if user is subscribed
// // // //      * @returns {boolean} True if subscribed
// // // //      */
// // // //     isSubscribed: () => {
// // // //       return !!localStorage.getItem('sigme_subscriber_id') && Notification.permission === 'granted';
// // // //     },

// // // //     /**
// // // //      * Get current configuration
// // // //      * @returns {Object|null} Website configuration
// // // //      */
// // // //     getConfig: () => {
// // // //       return websiteConfig;
// // // //     }
// // // //   };

// // // //   console.log('[Sigme]  Script ready');





// // // //   // backend/public/sigme.js - Add at the very end, before closing })();

// // // // //  FORCE CHECK FOR SUBSCRIBER ID AND START TRACKING
// // // // setTimeout(() => {
// // // //   console.log('[Sigme] Force-checking if page tracking should start...');
// // // //   const subscriberId = localStorage.getItem('sigme_subscriber_id');
  
// // // //   if (subscriberId) {
// // // //     // console.log('[Sigme]  Subscriber ID found:', subscriberId);
    
// // // //     if (!pageTrackingInitialized) {
// // // //       console.log('[Sigme] Force-starting page tracking...');
// // // //       initPageTracking();
// // // //     } else {
// // // //       console.log('[Sigme Page tracking already initialized');
// // // //     }
// // // //   } else {
// // // //     // console.log('[Sigme]  No subscriber ID found in localStorage');
// // // //     console.log('[Sigme]  Try subscribing firstto continue');
// // // //   }
// // // // }, 3000); // Wait 3 seconds after page load

// // // // console.log('[Sigme]  Script ready');






// // // // })();








































// // // // ============================================
// // // // FILE: BACKEND/public/sigme.js
// // // // Universal Sigme SDK - Client-Side Script
// // // // FIXED: Prevents re-subscription on navigation + handles click URLs
// // // // ============================================

// // // (function () {
// // //   'use strict';

// // //   console.log('[Sigme]  Scripts loading...');
  
// // //   // ============================================
// // //   // API URL DETECTION
// // //   // ============================================
  
// // //   const getCurrentScriptUrl = () => {
// // //     const scripts = document.getElementsByTagName('script');
// // //     for (let script of scripts) {
// // //       if (script.src && script.src.includes('sigme.js')) {
// // //         const url = new URL(script.src);
// // //         console.log('[Sigme]  Detected script URL:');
// // //         return url.origin;
// // //       }
// // //     }

// // //     // Fallback to default
// // //     console.log('[Sigme]  Could not detect script URL, using default');
// // //     return 'http://localhost:3000';
// // //   };

// // //   const API_BASE_URL = window.SIGME_API_URL || getCurrentScriptUrl();
// // //   const SIGME_API = API_BASE_URL;

// // //   //  Service worker MUST be on same origin as the website
// // //   const SW_PATH = '/sigme-universal-sw.js';

// // //   // console.log('[Sigme] API URL:', SIGME_API);
// // //   // console.log('[Sigme] SW Path:', SW_PATH);

// // //   // ============================================
// // //   // ENVIRONMENT CHECKS
// // //   // ============================================
  
// // //   const currentDomain = window.location.hostname;
// // //   console.log('[Sigme]  Current domain:', currentDomain);

// // //   if (!('serviceWorker' in navigator)) {
// // //     console.warn('[Sigme]  Service workers not supported');
// // //     return;
// // //   }

// // //   if (!('PushManager' in window)) {
// // //     console.warn('[Sigme]  Push notifications not supported');
// // //     return;
// // //   }

// // //   // ============================================
// // //   // GLOBAL STATE
// // //   // ============================================
  
// // //   let pageTrackingInitialized = false;
// // //   let lastTrackedUrl = null;
// // //   let websiteConfig = null;
// // //   let isInitializing = false; //  NEW: Prevent duplicate initialization

// // //   // ============================================
// // //   // WEBSITE DETECTION
// // //   // ============================================
  
// // //   async function detectWebsite() {
// // //     try {
// // //       console.log('[Sigme] Detecting website configuration...');
      
// // //       const response = await fetch(
// // //         `${SIGME_API}/api/websites/detect?domain=${encodeURIComponent(currentDomain)}`
// // //       );

// // //       if (!response.ok) {
// // //         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
// // //       }

// // //       const data = await response.json();

// // //       if (!data.success) {
// // //         console.error('[Sigme]  Website not found:', data.error);
// // //         return null;
// // //       }

// // //       console.log('[Sigme]  Configuration loaded:', data.config.websiteName);
// // //       return data.config;
// // //     } catch (error) {
// // //       console.error('[Sigme]  Failed to detect website:', error);
// // //       return null;
// // //     }
// // //   }

// // //   // ============================================
// // //   // PAGE VIEW TRACKING
// // //   // ============================================
  
// // //   /**
// // //    * Initialize automatic page view tracking
// // //    */
// // //   function initPageTracking() {
// // //     if (pageTrackingInitialized) {
// // //       console.log('[Sigme] ℹ Page tracking already initialized');
// // //       return;
// // //     }

// // //     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
// // //     if (!subscriberId) {
// // //       console.log('[Sigme] ℹ No subscriber ID yet, page tracking will start after subscription');
// // //       return;
// // //     }

// // //     console.log('[Sigme]  Initializing page tracking...');
// // //     pageTrackingInitialized = true;

// // //     // Track initial page view
// // //     trackPageView(subscriberId);

// // //     // Track page views on navigation (for SPAs)
// // //     setInterval(() => {
// // //       const currentUrl = window.location.href;
// // //       if (currentUrl !== lastTrackedUrl) {
// // //         trackPageView(subscriberId);
// // //       }
// // //     }, 1000);

// // //     // Track on popstate (back/forward navigation)
// // //     window.addEventListener('popstate', () => {
// // //       const subscriberId = localStorage.getItem('sigme_subscriber_id');
// // //       if (subscriberId) {
// // //         trackPageView(subscriberId);
// // //       }
// // //     });

// // //     console.log('[Sigme]  Page tracking initialized');
// // //   }

// // //   /**
// // //    * Track page view event
// // //    */
// // //   async function trackPageView(subscriberId) {
// // //     const pageUrl = window.location.href;
    
// // //     // Don't track the same URL twice in a row
// // //     if (pageUrl === lastTrackedUrl) {
// // //       return;
// // //     }
    
// // //     lastTrackedUrl = pageUrl;
// // //     const pageTitle = document.title;
// // //     const pagePath = window.location.pathname;

// // //     console.log('[Sigme]  Tracking page view:', pagePath);

// // //     try {
// // //       const response = await fetch(`${SIGME_API}/api/events/track`, {
// // //         method: 'POST',
// // //         headers: {
// // //           'Content-Type': 'application/json',
// // //         },
// // //         body: JSON.stringify({
// // //           subscriber_id: subscriberId,
// // //           website_id: websiteConfig?.websiteId || window.SigmeConfig?.websiteId,
// // //           event_name: 'page_view',
// // //           properties: {
// // //             url: pageUrl,
// // //             title: pageTitle,
// // //             path: pagePath,
// // //             referrer: document.referrer || null,
// // //             timestamp: new Date().toISOString(),
// // //           },
// // //         }),
// // //       });

// // //       if (response.ok) {
// // //         const result = await response.json();
// // //         console.log('[Sigme]  Page view tracked:', result);
// // //       } else {
// // //         const errorText = await response.text();
// // //         console.error('[Sigme]  Page view tracking failed:', errorText);
// // //       }
// // //     } catch (error) {
// // //       console.error('[Sigme]  Page view tracking error:', error);
// // //     }
// // //   }

// // //   /**
// // //    * Track custom events
// // //    */
// // //   async function trackCustomEvent(eventName, properties = {}) {
// // //     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
// // //     if (!subscriberId) {
// // //       console.warn('[Sigme]  Cannot track event - no subscriber ID');
// // //       return { success: false, error: 'No subscriber ID' };
// // //     }

// // //     console.log(`[Sigme]  Tracking custom event: ${eventName}`);

// // //     try {
// // //       const response = await fetch(`${SIGME_API}/api/events/track`, {
// // //         method: 'POST',
// // //         headers: {
// // //           'Content-Type': 'application/json',
// // //         },
// // //         body: JSON.stringify({
// // //           subscriber_id: subscriberId,
// // //           website_id: websiteConfig?.websiteId || window.SigmeConfig?.websiteId,
// // //           event_name: eventName,
// // //           properties: properties,
// // //         }),
// // //       });

// // //       if (response.ok) {
// // //         const result = await response.json();
// // //         console.log(`[Sigme]  Event tracked: successfully`);
// // //         return { success: true, data: result };
// // //       } else {
// // //         const errorText = await response.text();
// // //         console.error(`[Sigme]  Event tracking failed:`, errorText);
// // //         return { success: false, error: errorText };
// // //       }
// // //     } catch (error) {
// // //       console.error(`[Sigme]  Event tracking error:`, error);
// // //       return { success: false, error: error.message };
// // //     }
// // //   }

// // //   // ============================================
// // //   // INITIALIZATION - FIXED
// // //   // ============================================
  
// // //   async function initialize() {
// // //     //  FIX: Prevent duplicate initialization
// // //     if (isInitializing) {
// // //       console.log('[Sigme] ℹ Already initializing, skipping duplicate call');
// // //       return;
// // //     }

// // //     //  FIX: Check if already subscribed
// // //     const subscriberId = localStorage.getItem('sigme_subscriber_id');
// // //     if (subscriberId && Notification.permission === 'granted') {
// // //       console.log('[Sigme] ℹ Already subscribed, skipping initialization');
      
// // //       // Still ensure page tracking is initialized
// // //       if (!pageTrackingInitialized) {
// // //         initPageTracking();
// // //       }
// // //       return;
// // //     }

// // //     isInitializing = true;

// // //     try {
// // //       const config = await detectWebsite();
// // //       if (!config) {
// // //         console.warn('[Sigme]  Could not load configuration - aborting');
// // //         return;
// // //       }

// // //       // Store config globally
// // //       websiteConfig = config;

// // //       // Add API URL to config so service worker knows where to send requests
// // //       config.apiUrl = SIGME_API;

// // //       console.log('[Sigme]  Registering service worker...');
      
// // //       // Check if service worker file exists
// // //       try {
// // //         const swCheck = await fetch(SW_PATH, { method: 'HEAD' });
// // //         if (!swCheck.ok) {
// // //           console.error('[Sigme]  Service worker file not found. Please add sigme-universal-sw.js to your /public folder.');
// // //           console.error('[Sigme]  Download from: ' + SIGME_API + '/sigme-universal-sw.js');
// // //           return;
// // //         }
// // //       } catch (e) {
// // //         console.error('[Sigme]  Could not verify service worker file:', e.message);
// // //         return;
// // //       }

// // //       const registration = await navigator.serviceWorker.register(SW_PATH, {
// // //         scope: '/'
// // //       });
      
// // //       await navigator.serviceWorker.ready;
// // //       console.log('[Sigme]  Service worker registered successfully');

// // //       // Send config to service worker
// // //       if (registration.active) {
// // //         registration.active.postMessage({
// // //           type: 'SIGME_INIT',
// // //           config
// // //         });
// // //       }

// // //       // Handle notification permission state
// // //       if (Notification.permission === 'granted') {
// // //         console.log('[Sigme]  Notification permission already granted');
// // //         subscribeUser(registration);
// // //       } else if (Notification.permission === 'default') {
// // //         console.log('[Sigme] Notification permission not requested yet');
// // //         showSubscribePrompt(config, registration);
// // //       } else {
// // //         console.log('[Sigme]  Notifications denied by user');
// // //       }

// // //       //  START PAGE TRACKING IF ALREADY SUBSCRIBED
// // //       if (subscriberId) {
// // //         console.log('[Sigme]  Subscriber found, starting page tracking...');
// // //         initPageTracking();
// // //       }

// // //     } catch (err) {
// // //       console.error('[Sigme]  Initialization failed:', err);
      
// // //       if (err.message.includes('ServiceWorker')) {
// // //         console.error('[Sigme]  Make sure sigme-universal-sw.js exists in your /public folder');
// // //         console.error('[Sigme]  Download from: ' + SIGME_API + '/sigme-universal-sw.js');
// // //       }
// // //     } finally {
// // //       isInitializing = false;
// // //     }
// // //   }

// // //   // ============================================
// // //   // SUBSCRIPTION PROMPT UI
// // //   // ============================================
  
// // //   function showSubscribePrompt(config, registration) {
// // //     const branding = config.branding || {};
    
// // //     const promptHtml = `
// // //       <div id="sigme-prompt" style="
// // //         position: fixed;
// // //         bottom: 20px;
// // //         right: 20px;
// // //         background: white;
// // //         border-radius: 12px;
// // //         box-shadow: 0 10px 40px rgba(0,0,0,0.2);
// // //         padding: 20px;
// // //         max-width: 380px;
// // //         z-index: 999999;
// // //         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
// // //         animation: slideIn 0.3s ease-out;
// // //       ">
// // //         <style>
// // //           @keyframes slideIn {
// // //             from {
// // //               transform: translateY(100px);
// // //               opacity: 0;
// // //             }
// // //             to {
// // //               transform: translateY(0);
// // //               opacity: 1;
// // //             }
// // //           }
// // //         </style>
// // //         <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
// // //           ${branding.logo_url 
// // //             ? `<img src="${branding.logo_url}" alt="Logo" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` 
// // //             : '<div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;"></div>'
// // //           }
// // //           <div style="flex: 1;">
// // //             <div style="font-weight: 600; font-size: 16px; color: #1a1a1a;">
// // //               Get notifications from ${config.websiteName}
// // //             </div>
// // //             <div style="font-size: 14px; color: #666; margin-top: 2px;">
// // //               Stay updated with the latest news and offers
// // //             </div>
// // //           </div>
// // //         </div>
// // //         <div style="display: flex; gap: 8px; margin-top: 16px;">
// // //           <button id="sigme-allow" style="
// // //             flex: 1;
// // //             background: ${branding.primary_color || '#667eea'};
// // //             color: white;
// // //             border: none;
// // //             padding: 10px 16px;
// // //             border-radius: 8px;
// // //             font-weight: 600;
// // //             cursor: pointer;
// // //             font-size: 14px;
// // //             transition: all 0.2s;
// // //           ">
// // //             Allow
// // //           </button>
// // //           <button id="sigme-deny" style="
// // //             flex: 1;
// // //             background: #f3f4f6;
// // //             color: #6b7280;
// // //             border: none;
// // //             padding: 10px 16px;
// // //             border-radius: 8px;
// // //             font-weight: 600;
// // //             cursor: pointer;
// // //             font-size: 14px;
// // //             transition: all 0.2s;
// // //           ">
// // //             Not Now
// // //           </button>
// // //         </div>
// // //       </div>
// // //     `;

// // //     const div = document.createElement('div');
// // //     div.innerHTML = promptHtml;
// // //     document.body.appendChild(div);

// // //     // Add hover effects
// // //     const allowBtn = document.getElementById('sigme-allow');
// // //     const denyBtn = document.getElementById('sigme-deny');

// // //     allowBtn.onmouseover = () => {
// // //       allowBtn.style.opacity = '0.9';
// // //       allowBtn.style.transform = 'translateY(-1px)';
// // //     };
// // //     allowBtn.onmouseout = () => {
// // //       allowBtn.style.opacity = '1';
// // //       allowBtn.style.transform = 'translateY(0)';
// // //     };

// // //     denyBtn.onmouseover = () => {
// // //       denyBtn.style.background = '#e5e7eb';
// // //     };
// // //     denyBtn.onmouseout = () => {
// // //       denyBtn.style.background = '#f3f4f6';
// // //     };

// // //     // Handle allow button
// // //     allowBtn.onclick = async () => {
// // //       try {
// // //         const permission = await Notification.requestPermission();
// // //         if (permission === 'granted') {
// // //           console.log('[Sigme]  Permission granted');
// // //           subscribeUser(registration);
// // //         } else {
// // //           console.log('[Sigme] Permission denied');
// // //         }
// // //       } catch (error) {
// // //         console.error('[Sigme]  Permission request failed:', error);
// // //       }
// // //       div.remove();
// // //     };

// // //     // Handle deny button
// // //     denyBtn.onclick = () => {
// // //       console.log('[Sigme User dismissed prompt');
// // //       localStorage.setItem('sigme_prompt_dismissed', Date.now());
// // //       div.remove();
// // //     };
// // //   }

// // //   // ============================================
// // //   // SUBSCRIBE USER
// // //   // ============================================
  
// // //   function subscribeUser(registration) {
// // //     console.log('[Sigme]  Initiating subscription...');
    
// // //     if (registration.active) {
// // //       registration.active.postMessage({
// // //         type: 'SIGME_SUBSCRIBE'
// // //       });
// // //     } else {
// // //       console.warn('[Sigme]  No active service worker found');
// // //     }
// // //   }

// // //   // ============================================
// // //   // SERVICE WORKER MESSAGES
// // //   // ============================================
  
// // //   navigator.serviceWorker.addEventListener('message', (event) => {
// // //     if (event.data?.type === 'SIGME_SUBSCRIBED') {
// // //       if (event.data.success) {
// // //         console.log('[Sigme]  Subscribed successfully!');
        
// // //         //  SAVE SUBSCRIBER ID
// // //         if (event.data.data?.subscriber_id) {
// // //           localStorage.setItem('sigme_subscriber_id', event.data.data.subscriber_id);
// // //           // console.log('[Sigme]  Subscriber ID saved:', event.data.data.subscriber_id);
          
// // //           //  START PAGE TRACKING AFTER SUBSCRIPTION
// // //           setTimeout(() => {
// // //             console.log('[Sigme] Starting page tracking after subscription...');
// // //             initPageTracking();
// // //           }, 1000);
// // //         }
// // //       } else {
// // //         console.warn('[Sigme]  Subscription failed:', event.data.error);
// // //       }
// // //     }

// // //     if (event.data?.type === 'SIGME_SHOW_NOTIFICATION') {
// // //       showInPageNotification(event.data.notification);
// // //     }
// // //   });

// // //   // ============================================
// // //   // IN-PAGE NOTIFICATION (Fallback)
// // //   // ============================================
  
// // //   function showInPageNotification(notification) {
// // //     const div = document.createElement('div');
// // //     div.style.cssText = `
// // //       position: fixed;
// // //       top: 20px;
// // //       right: 20px;
// // //       background: white;
// // //       padding: 16px;
// // //       border-radius: 12px;
// // //       box-shadow: 0 10px 40px rgba(0,0,0,0.2);
// // //       z-index: 999999;
// // //       cursor: pointer;
// // //       max-width: 350px;
// // //       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
// // //       animation: slideIn 0.3s ease-out;
// // //     `;

// // //     div.innerHTML = `
// // //       <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #1a1a1a;">
// // //         ${notification.title}
// // //       </div>
// // //       <div style="font-size: 14px; color: #666;">
// // //         ${notification.body}
// // //       </div>
// // //     `;

// // //     document.body.appendChild(div);

// // //     div.onclick = () => {
// // //       if (notification.url) window.open(notification.url, '_blank');
// // //       div.remove();
// // //     };

// // //     setTimeout(() => {
// // //       div.style.opacity = '0';
// // //       div.style.transform = 'translateX(400px)';
// // //       div.style.transition = 'all 0.3s ease-out';
// // //       setTimeout(() => div.remove(), 300);
// // //     }, 5000);
// // //   }

// // //   // ============================================
// // //   // AUTO INITIALIZATION - FIXED
// // //   // ============================================
  
// // //   const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
// // //   const sevenDays = 7 * 24 * 60 * 60 * 1000;

// // //   //  FIX: Only initialize if NOT already subscribed
// // //   const shouldInitialize = () => {
// // //     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
// // //     // Already subscribed - just start tracking
// // //     if (subscriberId && Notification.permission === 'granted') {
// // //       console.log('[Sigme] Already subscribed, starting tracking only');
// // //       if (document.readyState === 'loading') {
// // //         document.addEventListener('DOMContentLoaded', initPageTracking);
// // //       } else {
// // //         initPageTracking();
// // //       }
// // //       return false; // Don't run full initialization
// // //     }
    
// // //     // Not subscribed and prompt not recently dismissed
// // //     if (!lastDismissed || Date.now() - Number(lastDismissed) > sevenDays) {
// // //       return true;
// // //     }
    
// // //     return false;
// // //   };

// // //   if (shouldInitialize()) {
// // //     if (document.readyState === 'loading') {
// // //       document.addEventListener('DOMContentLoaded', () => {
// // //         initialize();
// // //       });
// // //     } else {
// // //       initialize();
// // //     }
// // //   }

// // //   // ============================================
// // //   // PUBLIC API
// // //   // ============================================
  
// // //   window.Sigme = {
// // //     /**
// // //      * Manually trigger subscription prompt
// // //      */
// // //     subscribe: initialize,
    
// // //     /**
// // //      * Get current notification permission status
// // //      * @returns {string} 'granted', 'denied', or 'default'
// // //      */
// // //     getPermission: () => Notification.permission,
    
// // //     /**
// // //      * Track custom events
// // //      * @param {string} eventName - Name of the event
// // //      * @param {Object} properties - Event properties
// // //      * @returns {Promise<Object>} Result object
// // //      */
// // //     track: trackCustomEvent,
    
// // //     /**
// // //      * Manually track current page view
// // //      */
// // //     trackPageView: () => {
// // //       const subscriberId = localStorage.getItem('sigme_subscriber_id');
// // //       if (subscriberId) {
// // //         trackPageView(subscriberId);
// // //       } else {
// // //         console.warn('[Sigme]  Cannot track page - no subscriber ID');
// // //       }
// // //     },

// // //     /**
// // //      * Get subscriber ID
// // //      * @returns {string|null} Subscriber ID or null
// // //      */
// // //     getSubscriberId: () => {
// // //       return localStorage.getItem('sigme_subscriber_id');
// // //     },

// // //     /**
// // //      * Check if user is subscribed
// // //      * @returns {boolean} True if subscribed
// // //      */
// // //     isSubscribed: () => {
// // //       return !!localStorage.getItem('sigme_subscriber_id') && Notification.permission === 'granted';
// // //     },

// // //     /**
// // //      * Get current configuration
// // //      * @returns {Object|null} Website configuration
// // //      */
// // //     getConfig: () => {
// // //       return websiteConfig;
// // //     }
// // //   };

// // //   console.log('[Sigme]  Script ready');

// // // })();



// // // ============================================
// // // FILE: BACKEND/public/sigme.js
// // // Universal Sigme SDK - Client-Side Script
// // // FIXED: Chrome/Edge subscription reliability
// // // ============================================

// // (function () {
// //   'use strict';

// //   console.log('[Sigme]  Scripts loading...');
  
// //   // ============================================
// //   // API URL DETECTION
// //   // ============================================
  
// //   const getCurrentScriptUrl = () => {
// //     const scripts = document.getElementsByTagName('script');
// //     for (let script of scripts) {
// //       if (script.src && script.src.includes('sigme.js')) {
// //         const url = new URL(script.src);
// //         console.log('[Sigme]  Detected script URL:', url.origin);
// //         return url.origin;
// //       }
// //     }

// //     console.log('[Sigme]  Could not detect script URL, using default');
// //     return 'http://localhost:3000';
// //   };

// //   const API_BASE_URL = window.SIGME_API_URL || getCurrentScriptUrl();
// //   const SIGME_API = API_BASE_URL;
// //   const SW_PATH = '/sigme-universal-sw.js';

// //   // ============================================
// //   // ENVIRONMENT CHECKS
// //   // ============================================
  
// //   const currentDomain = window.location.hostname;
// //   console.log('[Sigme]  Current domain:', currentDomain);

// //   if (!('serviceWorker' in navigator)) {
// //     console.warn('[Sigme] Service workers not supported');
// //     return;
// //   }

// //   if (!('PushManager' in window)) {
// //     console.warn('[Sigme]  Push notifications not supported');
// //     return;
// //   }

// //   // ============================================
// //   // GLOBAL STATE
// //   // ============================================
  
// //   let pageTrackingInitialized = false;
// //   let lastTrackedUrl = null;
// //   let websiteConfig = null;
// //   let isInitializing = false;
// //   let serviceWorkerRegistration = null; // Store registration globally

// //   // ============================================
// //   // WEBSITE DETECTION
// //   // ============================================
  
// //   async function detectWebsite() {
// //     try {
// //       console.log('[Sigme]  Detecting website configuration...');
      
// //       const response = await fetch(
// //         `${SIGME_API}/api/websites/detect?domain=${encodeURIComponent(currentDomain)}`
// //       );

// //       if (!response.ok) {
// //         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
// //       }

// //       const data = await response.json();

// //       if (!data.success) {
// //         console.error('[Sigme]  Website not found:', data.error);
// //         return null;
// //       }

// //       console.log('[Sigme] Configuration loaded:', data.config.websiteName);
// //       return data.config;
// //     } catch (error) {
// //       console.error('[Sigme]  Failed to detect website:', error);
// //       return null;
// //     }
// //   }

// //   // ============================================
// //   // PAGE VIEW TRACKING
// //   // ============================================
  
// //   function initPageTracking() {
// //     if (pageTrackingInitialized) {
// //       console.log('[Sigme]  Page tracking already initialized');
// //       return;
// //     }

// //     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
// //     if (!subscriberId) {
// //       console.log('[Sigme]  No subscriber ID yet, page tracking will start after subscription');
// //       return;
// //     }

// //     console.log('[Sigme]  Initializing page tracking...');
// //     pageTrackingInitialized = true;

// //     trackPageView(subscriberId);

// //     setInterval(() => {
// //       const currentUrl = window.location.href;
// //       if (currentUrl !== lastTrackedUrl) {
// //         trackPageView(subscriberId);
// //       }
// //     }, 1000);

// //     window.addEventListener('popstate', () => {
// //       const subscriberId = localStorage.getItem('sigme_subscriber_id');
// //       if (subscriberId) {
// //         trackPageView(subscriberId);
// //       }
// //     });

// //     console.log('[Sigme]  Page tracking initialized');
// //   }

// //   async function trackPageView(subscriberId) {
// //     const pageUrl = window.location.href;
    
// //     if (pageUrl === lastTrackedUrl) {
// //       return;
// //     }
    
// //     lastTrackedUrl = pageUrl;
// //     const pageTitle = document.title;
// //     const pagePath = window.location.pathname;

// //     console.log('[Sigme] Tracking page view:', pagePath);

// //     try {
// //       const response = await fetch(`${SIGME_API}/api/events/track`, {
// //         method: 'POST',
// //         headers: {
// //           'Content-Type': 'application/json',
// //         },
// //         body: JSON.stringify({
// //           subscriber_id: subscriberId,
// //           website_id: websiteConfig?.websiteId || window.SigmeConfig?.websiteId,
// //           event_name: 'page_view',
// //           properties: {
// //             url: pageUrl,
// //             title: pageTitle,
// //             path: pagePath,
// //             referrer: document.referrer || null,
// //             timestamp: new Date().toISOString(),
// //           },
// //         }),
// //       });

// //       if (response.ok) {
// //         const result = await response.json();
// //         console.log('[Sigme] Page view tracked');
// //       } else {
// //         const errorText = await response.text();
// //         console.error('[Sigme]  Page view tracking failed:', errorText);
// //       }
// //     } catch (error) {
// //       console.error('[Sigme]  Page view tracking error:', error);
// //     }
// //   }

// //   async function trackCustomEvent(eventName, properties = {}) {
// //     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
// //     if (!subscriberId) {
// //       console.warn('[Sigme]  Cannot track event - no subscriber ID');
// //       return { success: false, error: 'No subscriber ID' };
// //     }

// //     console.log(`[Sigme]  Tracking custom event: ${eventName}`);

// //     try {
// //       const response = await fetch(`${SIGME_API}/api/events/track`, {
// //         method: 'POST',
// //         headers: {
// //           'Content-Type': 'application/json',
// //         },
// //         body: JSON.stringify({
// //           subscriber_id: subscriberId,
// //           website_id: websiteConfig?.websiteId || window.SigmeConfig?.websiteId,
// //           event_name: eventName,
// //           properties: properties,
// //         }),
// //       });

// //       if (response.ok) {
// //         const result = await response.json();
// //         console.log(`[Sigme] Event tracked successfully`);
// //         return { success: true, data: result };
// //       } else {
// //         const errorText = await response.text();
// //         console.error(`[Sigme]  Event tracking failed:`, errorText);
// //         return { success: false, error: errorText };
// //       }
// //     } catch (error) {
// //       console.error(`[Sigme]  Event tracking error:`, error);
// //       return { success: false, error: error.message };
// //     }
// //   }

// //   // ============================================
// //   //  FIX: WAIT FOR SERVICE WORKER ACTIVATION
// //   // ============================================
  
// //   /**
// //    * Ensures service worker is fully active and ready
// //    * Chrome/Edge need this explicit wait
// //    */
// //   async function waitForServiceWorkerReady(registration, timeoutMs = 10000) {
// //     console.log('[Sigme]  Waiting for service worker to be ready...');
    
// //     const startTime = Date.now();
    
// //     while (Date.now() - startTime < timeoutMs) {
// //       // Check if we have an active worker
// //       if (registration.active && registration.active.state === 'activated') {
// //         console.log('[Sigme]  Service worker is active and ready');
// //         return true;
// //       }
      
// //       // Check if we have an installing worker that will become active
// //       if (registration.installing) {
// //         console.log('[Sigme] Service worker is installing...');
// //         await new Promise(resolve => {
// //           registration.installing.addEventListener('statechange', function handler(e) {
// //             if (e.target.state === 'activated') {
// //               e.target.removeEventListener('statechange', handler);
// //               resolve();
// //             }
// //           });
// //         });
// //         continue;
// //       }
      
// //       // Wait a bit and check again
// //       await new Promise(resolve => setTimeout(resolve, 100));
// //     }
    
// //     console.warn('[Sigme]  Service worker readiness timeout');
// //     return false;
// //   }

// //   // ============================================
// //   // INITIALIZATION
// //   // ============================================
  
// //   async function initialize() {
// //     if (isInitializing) {
// //       console.log('[Sigme]  Already initializing, skipping duplicate call');
// //       return;
// //     }

// //     const subscriberId = localStorage.getItem('sigme_subscriber_id');
// //     if (subscriberId && Notification.permission === 'granted') {
// //       console.log('[Sigme]  Already subscribed, skipping initialization');
      
// //       if (!pageTrackingInitialized) {
// //         initPageTracking();
// //       }
// //       return;
// //     }

// //     isInitializing = true;

// //     try {
// //       const config = await detectWebsite();
// //       if (!config) {
// //         console.warn('[Sigme]  Could not load configuration - aborting');
// //         return;
// //       }

// //       websiteConfig = config;
// //       config.apiUrl = SIGME_API;

// //       console.log('[Sigme]  Registering service worker...');
      
// //       // Check if service worker file exists
// //       try {
// //         const swCheck = await fetch(SW_PATH, { method: 'HEAD' });
// //         if (!swCheck.ok) {
// //           console.error('[Sigme]  Service worker file not found. Please add sigme-universal-sw.js to your /public folder.');
// //           console.error('[Sigme]  Download from: ' + SIGME_API + '/sigme-universal-sw.js');
// //           return;
// //         }
// //       } catch (e) {
// //         console.error('[Sigme]  Could not verify service worker file:', e.message);
// //         return;
// //       }

// //       const registration = await navigator.serviceWorker.register(SW_PATH, {
// //         scope: '/'
// //       });
      
// //       //  FIX: Store registration globally
// //       serviceWorkerRegistration = registration;
      
// //       //  FIX: Wait for service worker to be fully ready
// //       await waitForServiceWorkerReady(registration);
      
// //       console.log('[Sigme]  Service worker registered and ready');

// //       // Send config to service worker
// //       if (registration.active) {
// //         registration.active.postMessage({
// //           type: 'SIGME_INIT',
// //           config
// //         });
        
// //         // FIX: Wait a bit for service worker to process config
// //         await new Promise(resolve => setTimeout(resolve, 200));
// //       }

// //       // Handle notification permission state
// //       if (Notification.permission === 'granted') {
// //         console.log('[Sigme] Notification permission already granted');
// //         await subscribeUser(registration);
// //       } else if (Notification.permission === 'default') {
// //         console.log('[Sigme]  Notification permission not requested yet');
// //         showSubscribePrompt(config, registration);
// //       } else {
// //         console.log('[Sigme]  Notifications denied by user');
// //       }

// //       if (subscriberId) {
// //         console.log('[Sigme]  Subscriber found, starting page tracking...');
// //         initPageTracking();
// //       }

// //     } catch (err) {
// //       console.error('[Sigme] Initialization failed:', err);
      
// //       if (err.message.includes('ServiceWorker')) {
// //         console.error('[Sigme] Make sure sigme-universal-sw.js exists in your /public folder');
// //         console.error('[Sigme]  Download from: ' + SIGME_API + '/sigme-universal-sw.js');
// //       }
// //     } finally {
// //       isInitializing = false;
// //     }
// //   }

// //   // ============================================
// //   // SUBSCRIPTION PROMPT UI
// //   // ============================================
  
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
// //         animation: slideIn 0.3s ease-out;
// //       ">
// //         <style>
// //           @keyframes slideIn {
// //             from {
// //               transform: translateY(100px);
// //               opacity: 0;
// //             }
// //             to {
// //               transform: translateY(0);
// //               opacity: 1;
// //             }
// //           }
// //         </style>
// //         <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
// //           ${branding.logo_url 
// //             ? `<img src="${branding.logo_url}" alt="Logo" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` 
// //             : '<div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🔔</div>'
// //           }
// //           <div style="flex: 1;">
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
// //             background: ${branding.primary_color || '#667eea'};
// //             color: white;
// //             border: none;
// //             padding: 10px 16px;
// //             border-radius: 8px;
// //             font-weight: 600;
// //             cursor: pointer;
// //             font-size: 14px;
// //             transition: all 0.2s;
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
// //             transition: all 0.2s;
// //           ">
// //             Not Now
// //           </button>
// //         </div>
// //       </div>
// //     `;

// //     const div = document.createElement('div');
// //     div.innerHTML = promptHtml;
// //     document.body.appendChild(div);

// //     const allowBtn = document.getElementById('sigme-allow');
// //     const denyBtn = document.getElementById('sigme-deny');

// //     allowBtn.onmouseover = () => {
// //       allowBtn.style.opacity = '0.9';
// //       allowBtn.style.transform = 'translateY(-1px)';
// //     };
// //     allowBtn.onmouseout = () => {
// //       allowBtn.style.opacity = '1';
// //       allowBtn.style.transform = 'translateY(0)';
// //     };

// //     denyBtn.onmouseover = () => {
// //       denyBtn.style.background = '#e5e7eb';
// //     };
// //     denyBtn.onmouseout = () => {
// //       denyBtn.style.background = '#f3f4f6';
// //     };

// //     //  FIX: Handle allow button with proper waiting
// //     allowBtn.onclick = async () => {
// //       console.log('[Sigme]  User clicked Allow');
      
// //       try {
// //         // Disable button to prevent double-clicks
// //         allowBtn.disabled = true;
// //         allowBtn.textContent = 'Please wait...';
// //         allowBtn.style.opacity = '0.6';
        
// //         // Request permission
// //         const permission = await Notification.requestPermission();
        
// //         if (permission === 'granted') {
// //           console.log('[Sigme] Permission granted');
          
// //           // FIX: Ensure service worker is ready before subscribing
// //           const isReady = await waitForServiceWorkerReady(registration, 5000);
          
// //           if (!isReady) {
// //             console.error('[Sigme]  Service worker not ready, retrying...');
// //             // Retry after a delay
// //             await new Promise(resolve => setTimeout(resolve, 1000));
// //           }
          
// //           // Subscribe user
// //           await subscribeUser(registration);
// //         } else {
// //           console.log('[Sigme]  Permission denied');
// //         }
// //       } catch (error) {
// //         console.error('[Sigme]  Permission request failed:', error);
        
// //         // Show error to user
// //         allowBtn.textContent = 'Error - Try Again';
// //         allowBtn.style.background = '#ef4444';
        
// //         setTimeout(() => {
// //           allowBtn.disabled = false;
// //           allowBtn.textContent = 'Allow';
// //           allowBtn.style.background = branding.primary_color || '#667eea';
// //           allowBtn.style.opacity = '1';
// //         }, 2000);
        
// //         return; // Don't remove prompt on error
// //       }
      
// //       div.remove();
// //     };

// //     denyBtn.onclick = () => {
// //       console.log('[Sigme]  User dismissed prompt');
// //       localStorage.setItem('sigme_prompt_dismissed', Date.now());
// //       div.remove();
// //     };
// //   }

// //   // ============================================
// //   //  FIX: SUBSCRIBE USER WITH RETRY LOGIC
// //   // ============================================
  
// //   async function subscribeUser(registration, retries = 3) {
// //     console.log('[Sigme]  Initiating subscription...');
    
// //     for (let attempt = 1; attempt <= retries; attempt++) {
// //       try {
// //         // Ensure we have an active worker
// //         if (!registration.active) {
// //           console.warn(`[Sigme]  No active service worker (attempt ${attempt}/${retries})`);
          
// //           if (attempt < retries) {
// //             await new Promise(resolve => setTimeout(resolve, 1000));
// //             continue;
// //           } else {
// //             throw new Error('No active service worker after retries');
// //           }
// //         }

// //         // FIX: Double-check the worker is really active
// //         if (registration.active.state !== 'activated') {
// //           console.log(`[Sigme]  Service worker state: ${registration.active.state}, waiting...`);
// //           await waitForServiceWorkerReady(registration, 3000);
// //         }

// //         console.log(`[Sigme]  Sending subscription message (attempt ${attempt}/${retries})`);
        
// //         // Send subscription message
// //         registration.active.postMessage({
// //           type: 'SIGME_SUBSCRIBE'
// //         });
        
// //         console.log('[Sigme] Subscription message sent');
// //         return; // Success
        
// //       } catch (error) {
// //         console.error(`[Sigme]  Subscription attempt ${attempt} failed:`, error);
        
// //         if (attempt < retries) {
// //           console.log(`[Sigme]  Retrying in 1 second...`);
// //           await new Promise(resolve => setTimeout(resolve, 1000));
// //         } else {
// //           console.error('[Sigme]  All subscription attempts failed');
// //           throw error;
// //         }
// //       }
// //     }
// //   }

// //   // ============================================
// //   // SERVICE WORKER MESSAGES
// //   // ============================================
  
// //   navigator.serviceWorker.addEventListener('message', (event) => {
// //     if (event.data?.type === 'SIGME_SUBSCRIBED') {
// //       if (event.data.success) {
// //         console.log('[Sigme]  Subscribed successfully!');
        
// //         if (event.data.data?.subscriber_id) {
// //           localStorage.setItem('sigme_subscriber_id', event.data.data.subscriber_id);
// //           console.log('[Sigme]  Subscriber ID saved');
          
// //           setTimeout(() => {
// //             console.log('[Sigme] Starting page tracking after subscription...');
// //             initPageTracking();
// //           }, 1000);
// //         }
// //       } else {
// //         console.warn('[Sigme]  Subscription failed:', event.data.error);
// //       }
// //     }

// //     if (event.data?.type === 'SIGME_SHOW_NOTIFICATION') {
// //       showInPageNotification(event.data.notification);
// //     }
// //   });

// //   // ============================================
// //   // IN-PAGE NOTIFICATION (Fallback)
// //   // ============================================
  
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
// //       animation: slideIn 0.3s ease-out;
// //     `;

// //     div.innerHTML = `
// //       <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #1a1a1a;">
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

// //     setTimeout(() => {
// //       div.style.opacity = '0';
// //       div.style.transform = 'translateX(400px)';
// //       div.style.transition = 'all 0.3s ease-out';
// //       setTimeout(() => div.remove(), 300);
// //     }, 5000);
// //   }

// //   // ============================================
// //   // AUTO INITIALIZATION
// //   // ============================================
  
// //   const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
// //   const sevenDays = 7 * 24 * 60 * 60 * 1000;

// //   const shouldInitialize = () => {
// //     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
// //     if (subscriberId && Notification.permission === 'granted') {
// //       console.log('[Sigme]  Already subscribed, starting tracking only');
// //       if (document.readyState === 'loading') {
// //         document.addEventListener('DOMContentLoaded', initPageTracking);
// //       } else {
// //         initPageTracking();
// //       }
// //       return false;
// //     }
    
// //     if (!lastDismissed || Date.now() - Number(lastDismissed) > sevenDays) {
// //       return true;
// //     }
    
// //     return false;
// //   };

// //   if (shouldInitialize()) {
// //     if (document.readyState === 'loading') {
// //       document.addEventListener('DOMContentLoaded', () => {
// //         initialize();
// //       });
// //     } else {
// //       initialize();
// //     }
// //   }

// //   // ============================================
// //   // PUBLIC API
// //   // ============================================
  
// //   window.Sigme = {
// //     subscribe: initialize,
// //     getPermission: () => Notification.permission,
// //     track: trackCustomEvent,
// //     trackPageView: () => {
// //       const subscriberId = localStorage.getItem('sigme_subscriber_id');
// //       if (subscriberId) {
// //         trackPageView(subscriberId);
// //       } else {
// //         console.warn('[Sigme]  Cannot track page - no subscriber ID');
// //       }
// //     },
// //     getSubscriberId: () => localStorage.getItem('sigme_subscriber_id'),
// //     isSubscribed: () => !!localStorage.getItem('sigme_subscriber_id') && Notification.permission === 'granted',
// //     getConfig: () => websiteConfig,
    
// //     // NEW: Manual retry for debugging
// //     retrySubscription: async () => {
// //       if (!serviceWorkerRegistration) {
// //         console.error('[Sigme]  No service worker registration found');
// //         return;
// //       }
// //       console.log('[Sigme]  Retrying subscription manually...');
// //       await subscribeUser(serviceWorkerRegistration);
// //     }
// //   };

// //   console.log('[Sigme] Script ready');

// // })();




// // ============================================
// // FILE: BACKEND/public/sigme.js (FIXED VERSION)
// // Universal Sigme SDK - Client-Side Script
// // FIXES:
// // 1. Prompt won't disappear when user tries to click
// // 2. No duplicate initialization
// // 3. Better Chrome/Edge compatibility
// // 4. Prompt stays visible until user interacts
// // ============================================

// (function () {
//   'use strict';

//   console.log('[Sigme]  Scripts loading...');
  
//   // ============================================
//   // API URL DETECTION
//   // ============================================
  
//   const getCurrentScriptUrl = () => {
//     const scripts = document.getElementsByTagName('script');
//     for (let script of scripts) {
//       if (script.src && script.src.includes('sigme.js')) {
//         const url = new URL(script.src);
//         console.log('[Sigme] Detected script URL:', url.origin);
//         return url.origin;
//       }
//     }

//     console.log('[Sigme] Could not detect script URL, using default');
//     return 'http://localhost:3000';
//   };

//   const API_BASE_URL = window.SIGME_API_URL || getCurrentScriptUrl();
//   const SIGME_API = API_BASE_URL;
//   const SW_PATH = '/sigme-universal-sw.js';

//   // ============================================
//   // ENVIRONMENT CHECKS
//   // ============================================
  
//   const currentDomain = window.location.hostname;
//   console.log('[Sigme] 🌐 Current domain:', currentDomain);

//   if (!('serviceWorker' in navigator)) {
//     console.warn('[Sigme]  Service workers not supported');
//     return;
//   }

//   if (!('PushManager' in window)) {
//     console.warn('[Sigme]  Push notifications not supported');
//     return;
//   }

//   // ============================================
//   // GLOBAL STATE
//   // ============================================
  
//   let pageTrackingInitialized = false;
//   let lastTrackedUrl = null;
//   let websiteConfig = null;
//   let isInitializing = false;
//   let hasInitialized = false; // NEW: Track if we've already initialized
//   let serviceWorkerRegistration = null;
//   let subscriptionInProgress = false;
//   let promptElement = null; // NEW: Track the prompt DOM element

//   // ============================================
//   // WEBSITE DETECTION
//   // ============================================
  
//   async function detectWebsite() {
//     try {
//       console.log('[Sigme]  Detecting website configuration...');
      
//       const response = await fetch(
//         `${SIGME_API}/api/websites/detect?domain=${encodeURIComponent(currentDomain)}`
//       );

//       if (!response.ok) {
//         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//       }

//       const data = await response.json();

//       if (!data.success) {
//         console.error('[Sigme]  Website not found:', data.error);
//         return null;
//       }

//       console.log('[Sigme] Configuration loaded:', data.config.websiteName);
//       return data.config;
//     } catch (error) {
//       console.error('[Sigme]  Failed to detect website:', error);
//       return null;
//     }
//   }

//   // ============================================
//   // PAGE VIEW TRACKING
//   // ============================================
  
//   function initPageTracking() {
//     if (pageTrackingInitialized) {
//       console.log('[Sigme]  Page tracking already initialized');
//       return;
//     }

//     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
//     if (!subscriberId) {
//       console.log('[Sigme]  No subscriber ID yet, page tracking will start after subscription');
//       return;
//     }

//     console.log('[Sigme]  Initializing page tracking...');
//     pageTrackingInitialized = true;

//     trackPageView(subscriberId);

//     setInterval(() => {
//       const currentUrl = window.location.href;
//       if (currentUrl !== lastTrackedUrl) {
//         trackPageView(subscriberId);
//       }
//     }, 1000);

//     window.addEventListener('popstate', () => {
//       const subscriberId = localStorage.getItem('sigme_subscriber_id');
//       if (subscriberId) {
//         trackPageView(subscriberId);
//       }
//     });

//     console.log('[Sigme] Page tracking initialized');
//   }

//   async function trackPageView(subscriberId) {
//     const pageUrl = window.location.href;
    
//     if (pageUrl === lastTrackedUrl) {
//       return;
//     }
    
//     lastTrackedUrl = pageUrl;
//     const pageTitle = document.title;
//     const pagePath = window.location.pathname;

//     console.log('[Sigme] 📄 Tracking page view:', pagePath);

//     try {
//       const response = await fetch(`${SIGME_API}/api/events/track`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           subscriber_id: subscriberId,
//           website_id: websiteConfig?.websiteId || window.SigmeConfig?.websiteId,
//           event_name: 'page_view',
//           properties: {
//             url: pageUrl,
//             title: pageTitle,
//             path: pagePath,
//             referrer: document.referrer || null,
//             timestamp: new Date().toISOString(),
//           },
//         }),
//       });

//       if (response.ok) {
//         const result = await response.json();
//         console.log('[Sigme] Page view tracked');
//       } else {
//         const errorText = await response.text();
//         console.error('[Sigme]  Page view tracking failed:', errorText);
//       }
//     } catch (error) {
//       console.error('[Sigme]  Page view tracking error:', error);
//     }
//   }

//   async function trackCustomEvent(eventName, properties = {}) {
//     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
//     if (!subscriberId) {
//       console.warn('[Sigme] Cannot track event - no subscriber ID');
//       return { success: false, error: 'No subscriber ID' };
//     }

//     console.log(`[Sigme]  Tracking custom event: ${eventName}`);

//     try {
//       const response = await fetch(`${SIGME_API}/api/events/track`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           subscriber_id: subscriberId,
//           website_id: websiteConfig?.websiteId || window.SigmeConfig?.websiteId,
//           event_name: eventName,
//           properties: properties,
//         }),
//       });

//       if (response.ok) {
//         const result = await response.json();
//         console.log(`[Sigme] Event tracked successfully`);
//         return { success: true, data: result };
//       } else {
//         const errorText = await response.text();
//         console.error(`[Sigme]  Event tracking failed:`, errorText);
//         return { success: false, error: errorText };
//       }
//     } catch (error) {
//       console.error(`[Sigme]  Event tracking error:`, error);
//       return { success: false, error: error.message };
//     }
//   }

//   // ============================================
//   // FIX: IMPROVED SERVICE WORKER READY CHECK
//   // ============================================
  
//   async function waitForServiceWorkerReady(registration, timeoutMs = 15000) {
//     console.log('[Sigme] ⏳ Waiting for service worker to be ready...');
    
//     const startTime = Date.now();
    
//     return new Promise((resolve, reject) => {
//       const checkReady = () => {
//         // Check if we've timed out
//         if (Date.now() - startTime > timeoutMs) {
//           reject(new Error('Service worker readiness timeout'));
//           return;
//         }
        
//         // Check if we have an active worker
//         if (registration.active && registration.active.state === 'activated') {
//           console.log('[Sigme] Service worker is active and ready');
//           resolve(true);
//           return;
//         }
        
//         // Check if we have an installing worker
//         if (registration.installing) {
//           console.log('[Sigme] 🔄 Service worker is installing...');
//           registration.installing.addEventListener('statechange', function handler(e) {
//             if (e.target.state === 'activated') {
//               console.log('[Sigme] Service worker activated');
//               e.target.removeEventListener('statechange', handler);
//               resolve(true);
//             } else if (e.target.state === 'redundant') {
//               e.target.removeEventListener('statechange', handler);
//               reject(new Error('Service worker became redundant'));
//             }
//           });
//           return;
//         }
        
//         // Check if we have a waiting worker
//         if (registration.waiting) {
//           console.log('[Sigme] ⏸️ Service worker is waiting...');
//           // Skip waiting and activate
//           registration.waiting.postMessage({ type: 'SKIP_WAITING' });
//           registration.waiting.addEventListener('statechange', function handler(e) {
//             if (e.target.state === 'activated') {
//               console.log('[Sigme] Waiting worker activated');
//               e.target.removeEventListener('statechange', handler);
//               resolve(true);
//             }
//           });
//           return;
//         }
        
//         // If none of the above, check again
//         setTimeout(checkReady, 100);
//       };
      
//       checkReady();
//     });
//   }

//   // ============================================
//   // INITIALIZATION - FIXED TO PREVENT DUPLICATES
//   // ============================================
  
//   // async function initialize() {
//   //   // FIX 1: Prevent ANY duplicate initialization
//   //   if (isInitializing) {
//   //     console.log('[Sigme]  Already initializing, skipping duplicate call');
//   //     return;
//   //   }

//   //   // FIX 2: Check if already initialized this session
//   //   if (hasInitialized) {
//   //     console.log('[Sigme]  Already initialized this session, skipping');
//   //     return;
//   //   }

//   //   const subscriberId = localStorage.getItem('sigme_subscriber_id');
//   //   if (subscriberId && Notification.permission === 'granted') {
//   //     console.log('[Sigme]  Already subscribed, skipping initialization');
//   //     hasInitialized = true; // Mark as initialized
      
//   //     if (!pageTrackingInitialized) {
//   //       initPageTracking();
//   //     }
//   //     return;
//   //   }

//   //   isInitializing = true;

//   //   try {
//   //     const config = await detectWebsite();
//   //     if (!config) {
//   //       console.warn('[Sigme] Could not load configuration - aborting');
//   //       return;
//   //     }

//   //     websiteConfig = config;
//   //     config.apiUrl = SIGME_API;

//   //     console.log('[Sigme]  Registering service worker...');
      
//   //     // Check if service worker file exists
//   //     try {
//   //       const swCheck = await fetch(SW_PATH, { method: 'HEAD' });
//   //       if (!swCheck.ok) {
//   //         console.error('[Sigme]  Service worker file not found. Please add sigme-universal-sw.js to your /public folder.');
//   //         console.error('[Sigme] 📥 Download from: ' + SIGME_API + '/sigme-universal-sw.js');
//   //         return;
//   //       }
//   //     } catch (e) {
//   //       console.error('[Sigme]  Could not verify service worker file:', e.message);
//   //       return;
//   //     }

//   //     const registration = await navigator.serviceWorker.register(SW_PATH, {
//   //       scope: '/'
//   //     });
      
//   //     serviceWorkerRegistration = registration;
      
//   //     // FIX: Wait for service worker to be fully ready
//   //     try {
//   //       await waitForServiceWorkerReady(registration);
//   //     } catch (error) {
//   //       console.error('[Sigme]  Service worker failed to activate:', error);
//   //       throw error;
//   //     }
      
//   //     console.log('[Sigme] Service worker registered and ready');

//   //     // Send config to service worker
//   //     if (registration.active) {
//   //       registration.active.postMessage({
//   //         type: 'SIGME_INIT',
//   //         config
//   //       });
        
//   //       // Wait for config to be processed
//   //       await new Promise(resolve => setTimeout(resolve, 300));
//   //     }

//   //     // Handle notification permission state
//   //     if (Notification.permission === 'granted') {
//   //       console.log('[Sigme] Notification permission already granted');
//   //       await subscribeUser(registration);
//   //     } else if (Notification.permission === 'default') {
//   //       console.log('[Sigme] 🔔 Notification permission not requested yet');
//   //       showSubscribePrompt(config, registration);
//   //     } else {
//   //       console.log('[Sigme] 🔕 Notifications denied by user');
//   //     }

//   //     if (subscriberId) {
//   //       console.log('[Sigme] 👤 Subscriber found, starting page tracking...');
//   //       initPageTracking();
//   //     }

//   //     // FIX 3: Mark as successfully initialized
//   //     hasInitialized = true;

//   //   } catch (err) {
//   //     console.error('[Sigme]  Initialization failed:', err);
      
//   //     if (err.message.includes('ServiceWorker')) {
//   //       console.error('[Sigme]  Make sure sigme-universal-sw.js exists in your /public folder');
//   //       console.error('[Sigme] 📥 Download from: ' + SIGME_API + '/sigme-universal-sw.js');
//   //     }
//   //   } finally {
//   //     isInitializing = false;
//   //   }
//   // }

//   // // ============================================
//   // // FIX: PROMPT UI THAT NEVER DISAPPEARS UNEXPECTEDLY
//   // // ============================================
  
//   // function showSubscribePrompt(config, registration) {
//   //   // FIX 4: Don't create duplicate prompts
//   //   if (promptElement && document.body.contains(promptElement)) {
//   //     console.log('[Sigme]  Prompt already visible, not creating duplicate');
//   //     return;
//   //   }

//   //   const branding = config.branding || {};
    
//   //   const promptHtml = `
//   //     <div id="sigme-prompt" style="
//   //       position: fixed;
//   //       bottom: 20px;
//   //       right: 20px;
//   //       background: white;
//   //       border-radius: 12px;
//   //       box-shadow: 0 10px 40px rgba(0,0,0,0.2);
//   //       padding: 20px;
//   //       max-width: 380px;
//   //       z-index: 999999;
//   //       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//   //       animation: slideIn 0.3s ease-out;
//   //       pointer-events: auto;
//   //     ">
//   //       <style>
//   //         @keyframes slideIn {
//   //           from {
//   //             transform: translateY(100px);
//   //             opacity: 0;
//   //           }
//   //           to {
//   //             transform: translateY(0);
//   //             opacity: 1;
//   //           }
//   //         }
//   //         @keyframes spin {
//   //           to { transform: rotate(360deg); }
//   //         }
//   //         #sigme-prompt * {
//   //           pointer-events: auto;
//   //         }
//   //       </style>
//   //       <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
//   //         ${branding.logo_url 
//   //           ? `<img src="${branding.logo_url}" alt="Logo" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` 
//   //           : '<div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🔔</div>'
//   //         }
//   //         <div style="flex: 1;">
//   //           <div style="font-weight: 600; font-size: 16px; color: #1a1a1a;">
//   //             Get notifications from ${config.websiteName}
//   //           </div>
//   //           <div style="font-size: 14px; color: #666; margin-top: 2px;">
//   //             Stay updated with the latest news and offers
//   //           </div>
//   //         </div>
//   //       </div>
//   //       <div style="display: flex; gap: 8px; margin-top: 16px;">
//   //         <button id="sigme-allow" style="
//   //           flex: 1;
//   //           background: ${branding.primary_color || '#667eea'};
//   //           color: white;
//   //           border: none;
//   //           padding: 10px 16px;
//   //           border-radius: 8px;
//   //           font-weight: 600;
//   //           cursor: pointer;
//   //           font-size: 14px;
//   //           transition: all 0.2s;
//   //           position: relative;
//   //         ">
//   //           <span id="sigme-allow-text">Allow</span>
//   //           <span id="sigme-allow-spinner" style="display: none;">
//   //             <span style="
//   //               display: inline-block;
//   //               width: 14px;
//   //               height: 14px;
//   //               border: 2px solid #ffffff;
//   //               border-top-color: transparent;
//   //               border-radius: 50%;
//   //               animation: spin 0.6s linear infinite;
//   //             "></span>
//   //           </span>
//   //         </button>
//   //         <button id="sigme-deny" style="
//   //           flex: 1;
//   //           background: #f3f4f6;
//   //           color: #6b7280;
//   //           border: none;
//   //           padding: 10px 16px;
//   //           border-radius: 8px;
//   //           font-weight: 600;
//   //           cursor: pointer;
//   //           font-size: 14px;
//   //           transition: all 0.2s;
//   //         ">
//   //           Not Now
//   //         </button>
//   //       </div>
//   //       <div id="sigme-error" style="
//   //         display: none;
//   //         margin-top: 12px;
//   //         padding: 8px;
//   //         background: #fee;
//   //         color: #c00;
//   //         border-radius: 6px;
//   //         font-size: 13px;
//   //       "></div>
//   //     </div>
//   //   `;

//   //   const div = document.createElement('div');
//   //   div.innerHTML = promptHtml;
//   //   document.body.appendChild(div);

//   //   // FIX 5: Store reference to prevent duplicate creation
//   //   promptElement = document.getElementById('sigme-prompt');

//   //   const allowBtn = document.getElementById('sigme-allow');
//   //   const denyBtn = document.getElementById('sigme-deny');
//   //   const allowText = document.getElementById('sigme-allow-text');
//   //   const allowSpinner = document.getElementById('sigme-allow-spinner');
//   //   const errorDiv = document.getElementById('sigme-error');

//   //   // FIX 6: Prevent any accidental removal
//   //   const preventRemoval = (e) => {
//   //     e.stopPropagation();
//   //   };
//   //   promptElement.addEventListener('click', preventRemoval);

//   //   allowBtn.onmouseover = () => {
//   //     if (!allowBtn.disabled) {
//   //       allowBtn.style.opacity = '0.9';
//   //       allowBtn.style.transform = 'translateY(-1px)';
//   //     }
//   //   };
//   //   allowBtn.onmouseout = () => {
//   //     if (!allowBtn.disabled) {
//   //       allowBtn.style.opacity = '1';
//   //       allowBtn.style.transform = 'translateY(0)';
//   //     }
//   //   };

//   //   denyBtn.onmouseover = () => {
//   //     denyBtn.style.background = '#e5e7eb';
//   //   };
//   //   denyBtn.onmouseout = () => {
//   //     denyBtn.style.background = '#f3f4f6';
//   //   };

//   //   // FIX 7: Improved allow button handler
//   //   allowBtn.onclick = async (e) => {
//   //     e.preventDefault();
//   //     e.stopPropagation();
      
//   //     console.log('[Sigme] 👆 User clicked Allow');
      
//   //     // Prevent double-clicks
//   //     if (subscriptionInProgress) {
//   //       console.log('[Sigme] Subscription already in progress');
//   //       return;
//   //     }
      
//   //     subscriptionInProgress = true;
      
//   //     // Disable button and show loading
//   //     allowBtn.disabled = true;
//   //     denyBtn.disabled = true;
//   //     allowText.style.display = 'none';
//   //     allowSpinner.style.display = 'inline-block';
//   //     allowBtn.style.opacity = '0.7';
//   //     allowBtn.style.cursor = 'not-allowed';
//   //     errorDiv.style.display = 'none';
      
//   //     try {
//   //       console.log('[Sigme] 🔔 Requesting notification permission...');
        
//   //       // Request permission
//   //       const permission = await Notification.requestPermission();
        
//   //       console.log('[Sigme] 📋 Permission result:', permission);
        
//   //       if (permission === 'granted') {
//   //         console.log('[Sigme] Permission granted, subscribing...');
          
//   //         // Ensure service worker is ready
//   //         try {
//   //           await waitForServiceWorkerReady(registration, 5000);
//   //         } catch (swError) {
//   //           console.error('[Sigme]  Service worker not ready:', swError);
//   //           throw new Error('Service worker not ready. Please refresh the page and try again.');
//   //         }
          
//   //         // Subscribe user
//   //         await subscribeUser(registration);
          
//   //         console.log('[Sigme] Subscription successful');
          
//   //         // FIX 8: Only remove prompt after confirmed successful subscription
//   //         let attempts = 0;
//   //         const checkSubscription = setInterval(() => {
//   //           attempts++;
//   //           if (localStorage.getItem('sigme_subscriber_id')) {
//   //             clearInterval(checkSubscription);
//   //             console.log('[Sigme] Subscriber ID confirmed, removing prompt');
//   //             promptElement.remove();
//   //             promptElement = null;
//   //           } else if (attempts > 30) { // 3 seconds max
//   //             clearInterval(checkSubscription);
//   //             console.warn('[Sigme] Subscriber ID not set yet, but removing prompt anyway');
//   //             promptElement.remove();
//   //             promptElement = null;
//   //           }
//   //         }, 100);
          
//   //       } else if (permission === 'denied') {
//   //         throw new Error('You blocked notifications. To enable them later, click the 🔔 icon in your browser address bar.');
//   //       } else {
//   //         throw new Error('Please click "Allow" in the browser prompt to enable notifications.');
//   //       }
        
//   //     } catch (error) {
//   //       console.error('[Sigme]  Subscription failed:', error);
        
//   //       // Show error to user
//   //       errorDiv.textContent = error.message || 'Failed to enable notifications. Please try again.';
//   //       errorDiv.style.display = 'block';
        
//   //       // Re-enable button
//   //       allowBtn.disabled = false;
//   //       denyBtn.disabled = false;
//   //       allowText.style.display = 'inline';
//   //       allowSpinner.style.display = 'none';
//   //       allowBtn.style.opacity = '1';
//   //       allowBtn.style.cursor = 'pointer';
        
//   //       subscriptionInProgress = false;
        
//   //       // CRITICAL: Don't remove prompt on error - keep it visible
//   //       return;
//   //     }
      
//   //     subscriptionInProgress = false;
//   //   };

//   //   // FIX 9: Deny button with proper cleanup
//   //   denyBtn.onclick = (e) => {
//   //     e.preventDefault();
//   //     e.stopPropagation();
      
//   //     console.log('[Sigme] 👤 User dismissed prompt');
//   //     localStorage.setItem('sigme_prompt_dismissed', Date.now());
      
//   //     if (promptElement && document.body.contains(promptElement)) {
//   //       promptElement.remove();
//   //       promptElement = null;
//   //     }
//   //   };
//   // }

//   // ============================================
// // FIXED INITIALIZATION
// // ============================================

// async function initialize() {
//   console.log('[Sigme]  Starting initialization...');
  
//   // FIX: Check flags AFTER logging, for debugging
//   if (isInitializing) {
//     console.log('[Sigme] Already initializing, skipping duplicate call');
//     return;
//   }

//   if (hasInitialized) {
//     console.log('[Sigme]  Already initialized this session');
//     return;
//   }

//   const subscriberId = localStorage.getItem('sigme_subscriber_id');
//   if (subscriberId && Notification.permission === 'granted') {
//     console.log('[Sigme] Already subscribed, skipping initialization');
//     hasInitialized = true;
    
//     if (!pageTrackingInitialized) {
//       initPageTracking();
//     }
//     return;
//   }

//   isInitializing = true;
//   console.log('[Sigme] 🔄 Setting isInitializing = true');

//   try {
//     const config = await detectWebsite();
//     if (!config) {
//       console.warn('[Sigme] Could not load configuration - aborting');
//       return;
//     }

//     websiteConfig = config;
//     config.apiUrl = SIGME_API;

//     console.log('[Sigme]  Registering service worker...');
    
//     // ... service worker registration code ...
    
//     const registration = await navigator.serviceWorker.register(SW_PATH, {
//       scope: '/'
//     });
    
//     serviceWorkerRegistration = registration;
    
//     await waitForServiceWorkerReady(registration);
    
//     console.log('[Sigme] Service worker registered and ready');

//     // Send config to service worker
//     if (registration.active) {
//       registration.active.postMessage({
//         type: 'SIGME_INIT',
//         config
//       });
      
//       await new Promise(resolve => setTimeout(resolve, 300));
//     }

//     // CRITICAL FIX: Handle notification permission CORRECTLY
//     console.log('[Sigme] 🔔 Checking notification permission:', Notification.permission);
    
//     if (Notification.permission === 'granted') {
//       console.log('[Sigme] Permission already granted - subscribing...');
//       await subscribeUser(registration);
      
//     } else if (Notification.permission === 'default') {
//       console.log('[Sigme] 📋 Permission not requested - showing prompt...');
      
//       // FIX: Ensure config and registration are valid before calling
//       if (!config || !registration) {
//         console.error('[Sigme]  Cannot show prompt - missing config or registration');
//         return;
//       }
      
//       // FIX: Call with explicit logging
//       console.log('[Sigme] Calling showSubscribePrompt()...');
//       try {
//         showSubscribePrompt(config, registration);
//         console.log('[Sigme] showSubscribePrompt() completed');
//       } catch (promptError) {
//         console.error('[Sigme]  Error in showSubscribePrompt:', promptError);
//         throw promptError;
//       }
      
//     } else {
//       console.log('[Sigme] 🔕 Notifications denied by user');
//     }

//     if (subscriberId) {
//       console.log('[Sigme] 👤 Subscriber found, starting page tracking...');
//       initPageTracking();
//     }

//     hasInitialized = true;
//     console.log('[Sigme] Initialization complete - hasInitialized = true');

//   } catch (err) {
//     console.error('[Sigme]  Initialization failed:', err);
//     console.error('[Sigme] 📋 Error stack:', err.stack);
    
//     if (err.message && err.message.includes('ServiceWorker')) {
//       console.error('[Sigme]  Make sure sigme-universal-sw.js exists in your /public folder');
//       console.error('[Sigme] 📥 Download from: ' + SIGME_API + '/sigme-universal-sw.js');
//     }
//   } finally {
//     isInitializing = false;
//     console.log('[Sigme] 🔄 Setting isInitializing = false');
//   }
// }

// // ============================================
// // FIXED PROMPT CREATION
// // ============================================

// // function showSubscribePrompt(config, registration) {
// //   console.log('[Sigme] 📋 showSubscribePrompt() called');
// //   console.log('[Sigme] 📋 Config:', config ? 'valid' : 'MISSING');
// //   console.log('[Sigme] 📋 Registration:', registration ? 'valid' : 'MISSING');
  
// //   // FIX: Validate inputs
// //   if (!config) {
// //     console.error('[Sigme]  Cannot show prompt - config is null/undefined');
// //     return;
// //   }
  
// //   if (!registration) {
// //     console.error('[Sigme]  Cannot show prompt - registration is null/undefined');
// //     return;
// //   }
  
// //   // FIX: Check for existing prompt MORE CAREFULLY
// //   console.log('[Sigme]  Checking for existing prompt...');
// //   console.log('[Sigme]  promptElement:', promptElement);
// //   console.log('[Sigme]  promptElement in DOM:', promptElement ? document.body.contains(promptElement) : false);
  
// //   if (promptElement && document.body.contains(promptElement)) {
// //     console.log('[Sigme] Prompt already visible, not creating duplicate');
// //     return;
// //   }
  
// //   console.log('[Sigme] No existing prompt found, creating new one...');

// //   const branding = config.branding || {};
  
// //   console.log('[Sigme] 🎨 Branding:', {
// //     logo: branding.logo_url ? 'has logo' : 'no logo',
// //     primaryColor: branding.primary_color || 'default'
// //   });
  
// //   const promptHtml = `
// //     <div id="sigme-prompt" style="
// //       position: fixed;
// //       bottom: 20px;
// //       right: 20px;
// //       background: white;
// //       border-radius: 12px;
// //       box-shadow: 0 10px 40px rgba(0,0,0,0.2);
// //       padding: 20px;
// //       max-width: 380px;
// //       z-index: 999999;
// //       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
// //       animation: slideIn 0.3s ease-out;
// //       pointer-events: auto;
// //     ">
// //       <style>
// //         @keyframes slideIn {
// //           from {
// //             transform: translateY(100px);
// //             opacity: 0;
// //           }
// //           to {
// //             transform: translateY(0);
// //             opacity: 1;
// //           }
// //         }
// //         @keyframes spin {
// //           to { transform: rotate(360deg); }
// //         }
// //         #sigme-prompt * {
// //           pointer-events: auto;
// //         }
// //       </style>
// //       <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
// //         ${branding.logo_url 
// //           ? `<img src="${branding.logo_url}" alt="Logo" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` 
// //           : '<div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🔔</div>'
// //         }
// //         <div style="flex: 1;">
// //           <div style="font-weight: 600; font-size: 16px; color: #1a1a1a;">
// //             Get notifications from ${config.websiteName}
// //           </div>
// //           <div style="font-size: 14px; color: #666; margin-top: 2px;">
// //             Stay updated with the latest news and offers
// //           </div>
// //         </div>
// //       </div>
// //       <div style="display: flex; gap: 8px; margin-top: 16px;">
// //         <button id="sigme-allow" style="
// //           flex: 1;
// //           background: ${branding.primary_color || '#667eea'};
// //           color: white;
// //           border: none;
// //           padding: 10px 16px;
// //           border-radius: 8px;
// //           font-weight: 600;
// //           cursor: pointer;
// //           font-size: 14px;
// //           transition: all 0.2s;
// //           position: relative;
// //         ">
// //           <span id="sigme-allow-text">Allow</span>
// //           <span id="sigme-allow-spinner" style="display: none;">
// //             <span style="
// //               display: inline-block;
// //               width: 14px;
// //               height: 14px;
// //               border: 2px solid #ffffff;
// //               border-top-color: transparent;
// //               border-radius: 50%;
// //               animation: spin 0.6s linear infinite;
// //             "></span>
// //           </span>
// //         </button>
// //         <button id="sigme-deny" style="
// //           flex: 1;
// //           background: #f3f4f6;
// //           color: #6b7280;
// //           border: none;
// //           padding: 10px 16px;
// //           border-radius: 8px;
// //           font-weight: 600;
// //           cursor: pointer;
// //           font-size: 14px;
// //           transition: all 0.2s;
// //         ">
// //           Not Now
// //         </button>
// //       </div>
// //       <div id="sigme-error" style="
// //         display: none;
// //         margin-top: 12px;
// //         padding: 8px;
// //         background: #fee;
// //         color: #c00;
// //         border-radius: 6px;
// //         font-size: 13px;
// //       "></div>
// //     </div>
// //   `;

// //   console.log('[Sigme] 🏗️ Creating prompt DOM element...');
  
// //   const div = document.createElement('div');
// //   div.innerHTML = promptHtml;
  
// //   console.log('[Sigme] Appending to document.body...');
// //   document.body.appendChild(div);
  
// //   console.log('[Sigme]  Finding prompt element by ID...');
// //   promptElement = document.getElementById('sigme-prompt');
  
// //   if (!promptElement) {
// //     console.error('[Sigme]  CRITICAL: Prompt element not found after creation!');
// //     return;
// //   }
  
// //   console.log('[Sigme] Prompt element found:', promptElement);

// //   const allowBtn = document.getElementById('sigme-allow');
// //   const denyBtn = document.getElementById('sigme-deny');
// //   const allowText = document.getElementById('sigme-allow-text');
// //   const allowSpinner = document.getElementById('sigme-allow-spinner');
// //   const errorDiv = document.getElementById('sigme-error');
  
// //   if (!allowBtn || !denyBtn) {
// //     console.error('[Sigme]  CRITICAL: Buttons not found!');
// //     return;
// //   }
  
// //   console.log('[Sigme] All prompt elements found and ready');

// //   // Prevent accidental removal
// //   const preventRemoval = (e) => {
// //     e.stopPropagation();
// //   };
// //   promptElement.addEventListener('click', preventRemoval);

// //   // Hover effects
// //   allowBtn.onmouseover = () => {
// //     if (!allowBtn.disabled) {
// //       allowBtn.style.opacity = '0.9';
// //       allowBtn.style.transform = 'translateY(-1px)';
// //     }
// //   };
// //   allowBtn.onmouseout = () => {
// //     if (!allowBtn.disabled) {
// //       allowBtn.style.opacity = '1';
// //       allowBtn.style.transform = 'translateY(0)';
// //     }
// //   };

// //   denyBtn.onmouseover = () => {
// //     denyBtn.style.background = '#e5e7eb';
// //   };
// //   denyBtn.onmouseout = () => {
// //     denyBtn.style.background = '#f3f4f6';
// //   };

// //   // Allow button handler
// //   allowBtn.onclick = async (e) => {
// //     e.preventDefault();
// //     e.stopPropagation();
    
// //     console.log('[Sigme] 👆 User clicked Allow button');
    
// //     if (subscriptionInProgress) {
// //       console.log('[Sigme] Subscription already in progress, ignoring click');
// //       return;
// //     }
    
// //     subscriptionInProgress = true;
    
// //     // Disable buttons and show loading
// //     allowBtn.disabled = true;
// //     denyBtn.disabled = true;
// //     allowText.style.display = 'none';
// //     allowSpinner.style.display = 'inline-block';
// //     allowBtn.style.opacity = '0.7';
// //     allowBtn.style.cursor = 'not-allowed';
// //     errorDiv.style.display = 'none';
    
// //     try {
// //       console.log('[Sigme] 🔔 Requesting notification permission...');
      
// //       const permission = await Notification.requestPermission();
      
// //       console.log('[Sigme] 📋 Permission result:', permission);
      
// //       if (permission === 'granted') {
// //         console.log('[Sigme] Permission granted, subscribing...');
        
// //         try {
// //           await waitForServiceWorkerReady(registration, 5000);
// //         } catch (swError) {
// //           console.error('[Sigme]  Service worker not ready:', swError);
// //           throw new Error('Service worker not ready. Please refresh and try again.');
// //         }
        
// //         await subscribeUser(registration);
        
// //         console.log('[Sigme] Subscription successful, waiting for confirmation...');
        
// //         // Wait for subscriber_id before removing prompt
// //         let attempts = 0;
// //         const checkSubscription = setInterval(() => {
// //           attempts++;
// //           const subId = localStorage.getItem('sigme_subscriber_id');
          
// //           if (subId) {
// //             clearInterval(checkSubscription);
// //             console.log('[Sigme] Subscriber ID confirmed, removing prompt');
// //             if (promptElement && document.body.contains(promptElement)) {
// //               promptElement.remove();
// //               promptElement = null;
// //             }
// //           } else if (attempts > 30) {
// //             clearInterval(checkSubscription);
// //             console.warn('[Sigme] Timeout waiting for subscriber ID');
// //             if (promptElement && document.body.contains(promptElement)) {
// //               promptElement.remove();
// //               promptElement = null;
// //             }
// //           }
// //         }, 100);
        
// //       } else if (permission === 'denied') {
// //         throw new Error('You blocked notifications. To enable them, click the 🔔 icon in your browser address bar.');
// //       } else {
// //         throw new Error('Please click "Allow" in the browser prompt.');
// //       }
      
// //     } catch (error) {
// //       console.error('[Sigme]  Subscription failed:', error);
      
// //       errorDiv.textContent = error.message || 'Failed to enable notifications. Please try again.';
// //       errorDiv.style.display = 'block';
      
// //       // Re-enable buttons
// //       allowBtn.disabled = false;
// //       denyBtn.disabled = false;
// //       allowText.style.display = 'inline';
// //       allowSpinner.style.display = 'none';
// //       allowBtn.style.opacity = '1';
// //       allowBtn.style.cursor = 'pointer';
      
// //       subscriptionInProgress = false;
// //       return;
// //     }
    
// //     subscriptionInProgress = false;
// //   };

// //   // Deny button handler
// //   denyBtn.onclick = (e) => {
// //     e.preventDefault();
// //     e.stopPropagation();
    
// //     console.log('[Sigme] 👤 User clicked Not Now');
// //     localStorage.setItem('sigme_prompt_dismissed', Date.now());
    
// //     if (promptElement && document.body.contains(promptElement)) {
// //       promptElement.remove();
// //       promptElement = null;
// //     }
// //   };
  
// //   console.log('[Sigme] Prompt creation complete and visible!');
// // }

// function showSubscribePrompt(config, registration) {
//     console.log('[Sigme] 📋 showSubscribePrompt() called');
    
//     if (!config || !registration) {
//       console.error('[Sigme]  Missing config or registration');
//       return;
//     }
    
//     if (promptElement && document.body.contains(promptElement)) {
//       console.log('[Sigme] Prompt already visible');
//       return;
//     }
    
//     console.log('[Sigme] Creating hydration-proof prompt...');

//     const branding = config.branding || {};
    
//     // FIX 1: Create a dedicated container that React won't touch
//     const portalContainer = document.createElement('div');
//     portalContainer.id = 'sigme-portal-container';
//     portalContainer.setAttribute('data-sigme-portal', 'true'); // Mark it
//     portalContainer.style.cssText = `
//       position: fixed;
//       top: 0;
//       left: 0;
//       width: 0;
//       height: 0;
//       z-index: 2147483647;
//       pointer-events: none;
//     `;
    
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
//         z-index: 2147483647;
//         font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
//         animation: slideIn 0.3s ease-out;
//         pointer-events: auto;
//       ">
//         <style>
//           @keyframes slideIn {
//             from {
//               transform: translateY(100px);
//               opacity: 0;
//             }
//             to {
//               transform: translateY(0);
//               opacity: 1;
//             }
//           }
//           @keyframes spin {
//             to { transform: rotate(360deg); }
//           }
//           #sigme-prompt * {
//             pointer-events: auto !important;
//             user-select: none;
//           }
//         </style>
//         <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
//           ${branding.logo_url 
//             ? `<img src="${branding.logo_url}" alt="Logo" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` 
//             : '<div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🔔</div>'
//           }
//           <div style="flex: 1;">
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
//             background: ${branding.primary_color || '#667eea'};
//             color: white;
//             border: none;
//             padding: 10px 16px;
//             border-radius: 8px;
//             font-weight: 600;
//             cursor: pointer;
//             font-size: 14px;
//             transition: all 0.2s;
//             position: relative;
//           ">
//             <span id="sigme-allow-text">Allow</span>
//             <span id="sigme-allow-spinner" style="display: none;">
//               <span style="
//                 display: inline-block;
//                 width: 14px;
//                 height: 14px;
//                 border: 2px solid #ffffff;
//                 border-top-color: transparent;
//                 border-radius: 50%;
//                 animation: spin 0.6s linear infinite;
//               "></span>
//             </span>
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
//             transition: all 0.2s;
//           ">
//             Not Now
//           </button>
//         </div>
//         <div id="sigme-error" style="
//           display: none;
//           margin-top: 12px;
//           padding: 8px;
//           background: #fee;
//           color: #c00;
//           border-radius: 6px;
//           font-size: 13px;
//         "></div>
//       </div>
//     `;

//     portalContainer.innerHTML = promptHtml;
    
//     // FIX 2: Append to body AND set up mutation observer
//     document.body.appendChild(portalContainer);
    
//     promptElement = document.getElementById('sigme-prompt');
    
//     if (!promptElement) {
//       console.error('[Sigme]  Prompt element not found');
//       return;
//     }
    
//     console.log('[Sigme] Prompt created and appended');

//     // FIX 3: Protect prompt from React hydration removal
//     const protectPrompt = () => {
//       if (!document.body.contains(portalContainer)) {
//         console.warn('[Sigme] Prompt was removed, re-adding...');
//         document.body.appendChild(portalContainer);
//       }
//     };

//     // FIX 4: Watch for hydration interference
//     const observer = new MutationObserver((mutations) => {
//       for (const mutation of mutations) {
//         if (mutation.type === 'childList') {
//           mutation.removedNodes.forEach((node) => {
//             if (node === portalContainer || node.contains?.(portalContainer)) {
//               console.warn('[Sigme] Detected removal, restoring prompt...');
//               setTimeout(protectPrompt, 0);
//             }
//           });
//         }
//       }
//     });

//     observer.observe(document.body, {
//       childList: true,
//       subtree: false
//     });

//     // FIX 5: Also check periodically during first 5 seconds (hydration window)
//     let protectionChecks = 0;
//     const protectionInterval = setInterval(() => {
//       protectionChecks++;
//       protectPrompt();
      
//       if (protectionChecks >= 50) { // 5 seconds (50 * 100ms)
//         clearInterval(protectionInterval);
//         observer.disconnect(); // Stop watching after hydration should be done
//         console.log('[Sigme] Hydration protection period complete');
//       }
//     }, 100);

//     const allowBtn = document.getElementById('sigme-allow');
//     const denyBtn = document.getElementById('sigme-deny');
//     const allowText = document.getElementById('sigme-allow-text');
//     const allowSpinner = document.getElementById('sigme-allow-spinner');
//     const errorDiv = document.getElementById('sigme-error');
    
//     if (!allowBtn || !denyBtn) {
//       console.error('[Sigme]  Buttons not found');
//       return;
//     }

//     // Prevent event bubbling
//     const stopPropagation = (e) => {
//       e.stopPropagation();
//       e.stopImmediatePropagation();
//     };
    
//     promptElement.addEventListener('click', stopPropagation, true);
//     promptElement.addEventListener('mousedown', stopPropagation, true);
//     promptElement.addEventListener('mouseup', stopPropagation, true);

//     // Hover effects
//     allowBtn.onmouseover = () => {
//       if (!allowBtn.disabled) {
//         allowBtn.style.opacity = '0.9';
//         allowBtn.style.transform = 'translateY(-1px)';
//       }
//     };
//     allowBtn.onmouseout = () => {
//       if (!allowBtn.disabled) {
//         allowBtn.style.opacity = '1';
//         allowBtn.style.transform = 'translateY(0)';
//       }
//     };

//     denyBtn.onmouseover = () => {
//       denyBtn.style.background = '#e5e7eb';
//     };
//     denyBtn.onmouseout = () => {
//       denyBtn.style.background = '#f3f4f6';
//     };

//     // Allow button handler
//     allowBtn.onclick = async (e) => {
//       e.preventDefault();
//       e.stopPropagation();
//       e.stopImmediatePropagation();
      
//       console.log('[Sigme] 👆 User clicked Allow');
      
//       if (subscriptionInProgress) {
//         console.log('[Sigme] Already in progress');
//         return;
//       }
      
//       subscriptionInProgress = true;
      
//       // Disable buttons
//       allowBtn.disabled = true;
//       denyBtn.disabled = true;
//       allowText.style.display = 'none';
//       allowSpinner.style.display = 'inline-block';
//       allowBtn.style.opacity = '0.7';
//       allowBtn.style.cursor = 'not-allowed';
//       errorDiv.style.display = 'none';
      
//       try {
//         console.log('[Sigme] 🔔 Requesting permission...');
        
//         const permission = await Notification.requestPermission();
        
//         console.log('[Sigme] 📋 Permission:', permission);
        
//         if (permission === 'granted') {
//           console.log('[Sigme] Permission granted');
          
//           try {
//             await waitForServiceWorkerReady(registration, 5000);
//           } catch (swError) {
//             console.error('[Sigme]  SW not ready:', swError);
//             throw new Error('Service worker not ready. Please refresh and try again.');
//           }
          
//           await subscribeUser(registration);
          
//           console.log('[Sigme] Subscription sent');
          
//           // Wait for confirmation
//           let attempts = 0;
//           const checkSubscription = setInterval(() => {
//             attempts++;
//             const subId = localStorage.getItem('sigme_subscriber_id');
            
//             if (subId) {
//               clearInterval(checkSubscription);
//               clearInterval(protectionInterval); // Stop protection
//               observer.disconnect(); // Stop watching
//               console.log('[Sigme] Confirmed, removing prompt');
              
//               if (portalContainer && document.body.contains(portalContainer)) {
//                 portalContainer.remove();
//               }
//               promptElement = null;
//             } else if (attempts > 30) {
//               clearInterval(checkSubscription);
//               clearInterval(protectionInterval);
//               observer.disconnect();
//               console.warn('[Sigme] Timeout');
              
//               if (portalContainer && document.body.contains(portalContainer)) {
//                 portalContainer.remove();
//               }
//               promptElement = null;
//             }
//           }, 100);
          
//         } else if (permission === 'denied') {
//           throw new Error('You blocked notifications. Click the 🔔 icon in your browser to enable them.');
//         } else {
//           throw new Error('Please click "Allow" in the browser prompt.');
//         }
        
//       } catch (error) {
//         console.error('[Sigme]  Failed:', error);
        
//         errorDiv.textContent = error.message || 'Failed to enable notifications. Please try again.';
//         errorDiv.style.display = 'block';
        
//         // Re-enable
//         allowBtn.disabled = false;
//         denyBtn.disabled = false;
//         allowText.style.display = 'inline';
//         allowSpinner.style.display = 'none';
//         allowBtn.style.opacity = '1';
//         allowBtn.style.cursor = 'pointer';
        
//         subscriptionInProgress = false;
//         return;
//       }
      
//       subscriptionInProgress = false;
//     };

//     // Deny button handler
//     denyBtn.onclick = (e) => {
//       e.preventDefault();
//       e.stopPropagation();
//       e.stopImmediatePropagation();
      
//       console.log('[Sigme] 👤 User dismissed');
//       localStorage.setItem('sigme_prompt_dismissed', Date.now());
      
//       clearInterval(protectionInterval);
//       observer.disconnect();
      
//       if (portalContainer && document.body.contains(portalContainer)) {
//         portalContainer.remove();
//       }
//       promptElement = null;
//     };
    
//     console.log('[Sigme] Prompt ready and protected from hydration!');
//   }
//   // ============================================
//   // FIX: IMPROVED SUBSCRIBE USER WITH RETRIES
//   // ============================================
  
//   async function subscribeUser(registration, retries = 3) {
//     console.log('[Sigme] 🔄 Initiating subscription...');
    
//     for (let attempt = 1; attempt <= retries; attempt++) {
//       try {
//         // Ensure we have an active worker
//         if (!registration.active) {
//           console.warn(`[Sigme] No active service worker (attempt ${attempt}/${retries})`);
          
//           if (attempt < retries) {
//             await new Promise(resolve => setTimeout(resolve, 1000));
//             continue;
//           } else {
//             throw new Error('No active service worker after retries');
//           }
//         }

//         // Double-check the worker is really active
//         if (registration.active.state !== 'activated') {
//           console.log(`[Sigme] ⏳ Service worker state: ${registration.active.state}, waiting...`);
//           await waitForServiceWorkerReady(registration, 3000);
//         }

//         console.log(`[Sigme]  Sending subscription message (attempt ${attempt}/${retries})`);
        
//         // Send subscription message
//         registration.active.postMessage({
//           type: 'SIGME_SUBSCRIBE'
//         });
        
//         console.log('[Sigme] Subscription message sent');
//         return; // Success
        
//       } catch (error) {
//         console.error(`[Sigme]  Subscription attempt ${attempt} failed:`, error);
        
//         if (attempt < retries) {
//           console.log(`[Sigme] 🔄 Retrying in 1 second...`);
//           await new Promise(resolve => setTimeout(resolve, 1000));
//         } else {
//           console.error('[Sigme]  All subscription attempts failed');
//           throw error;
//         }
//       }
//     }
//   }

//   // ============================================
//   // SERVICE WORKER MESSAGES
//   // ============================================
  
//   navigator.serviceWorker.addEventListener('message', (event) => {
//     if (event.data?.type === 'SIGME_SUBSCRIBED') {
//       if (event.data.success) {
//         console.log('[Sigme] Subscribed successfully!');
        
//         if (event.data.data?.subscriber_id) {
//           localStorage.setItem('sigme_subscriber_id', event.data.data.subscriber_id);
//           console.log('[Sigme] 💾 Subscriber ID saved');
          
//           // Dispatch custom event for advanced tracking
//           window.dispatchEvent(new CustomEvent('sigme-subscribed', {
//             detail: { subscriber_id: event.data.data.subscriber_id }
//           }));
          
//           setTimeout(() => {
//             console.log('[Sigme]  Starting page tracking after subscription...');
//             initPageTracking();
//           }, 1000);
//         }
//       } else {
//         console.warn('[Sigme] Subscription failed:', event.data.error);
//       }
//     }

//     if (event.data?.type === 'SIGME_SHOW_NOTIFICATION') {
//       showInPageNotification(event.data.notification);
//     }
//   });

//   // ============================================
//   // IN-PAGE NOTIFICATION (Fallback)
//   // ============================================
  
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
//       animation: slideIn 0.3s ease-out;
//     `;

//     div.innerHTML = `
//       <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #1a1a1a;">
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

//     setTimeout(() => {
//       div.style.opacity = '0';
//       div.style.transform = 'translateX(400px)';
//       div.style.transition = 'all 0.3s ease-out';
//       setTimeout(() => div.remove(), 300);
//     }, 5000);
//   }

//   // ============================================
//   // FIX: AUTO INITIALIZATION - SINGLE CALL ONLY
//   // ============================================
  
//   const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
//   const sevenDays = 7 * 24 * 60 * 60 * 1000;

//   const shouldInitialize = () => {
//     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
//     if (subscriberId && Notification.permission === 'granted') {
//       console.log('[Sigme]  Already subscribed, starting tracking only');
//       // FIX 10: Use immediate execution, not event listener
//       initPageTracking();
//       return false;
//     }
    
//     if (!lastDismissed || Date.now() - Number(lastDismissed) > sevenDays) {
//       return true;
//     }
    
//     return false;
//   };

//   // FIX 11: Single initialization point - no race conditions
//   if (shouldInitialize()) {
//     // Wait for DOM to be ready, then initialize ONCE
//     if (document.readyState === 'loading') {
//       document.addEventListener('DOMContentLoaded', initialize, { once: true });
//     } else {
//       // DOM already ready, initialize immediately
//       initialize();
//     }
//   }

//   // ============================================
//   // PUBLIC API
//   // ============================================
  
//   window.Sigme = {
//     subscribe: () => {
//       // Reset initialization flags to allow manual trigger
//       hasInitialized = false;
//       isInitializing = false;
//       initialize();
//     },
//     getPermission: () => Notification.permission,
//     track: trackCustomEvent,
//     trackPageView: () => {
//       const subscriberId = localStorage.getItem('sigme_subscriber_id');
//       if (subscriberId) {
//         trackPageView(subscriberId);
//       } else {
//         console.warn('[Sigme] Cannot track page - no subscriber ID');
//       }
//     },
//     getSubscriberId: () => localStorage.getItem('sigme_subscriber_id'),
//     isSubscribed: () => !!localStorage.getItem('sigme_subscriber_id') && Notification.permission === 'granted',
//     getConfig: () => websiteConfig,
    
//     // Debugging helpers
//     retrySubscription: async () => {
//       if (!serviceWorkerRegistration) {
//         console.error('[Sigme]  No service worker registration found');
//         return;
//       }
//       console.log('[Sigme] 🔄 Retrying subscription manually...');
//       subscriptionInProgress = false;
//       await subscribeUser(serviceWorkerRegistration);
//     },
    
//     // NEW: Force show prompt (for debugging)
//     showPrompt: () => {
//       if (websiteConfig && serviceWorkerRegistration) {
//         showSubscribePrompt(websiteConfig, serviceWorkerRegistration);
//       } else {
//         console.error('[Sigme]  Config or registration not available');
//       }
//     }
//   };

//   console.log('[Sigme] Script ready');

// })();




// ============================================
// FILE: BACKEND/public/sigme.js
// Universal Sigme SDK - Client-Side Script
// ============================================

(function () {
  'use strict';

  console.log('[Sigme]  Loading ...');
  
  // ============================================
  // API URL DETECTION
  // ============================================
  
  const getCurrentScriptUrl = () => {
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
      if (script.src && script.src.includes('sigme.js')) {
        const url = new URL(script.src);
        return url.origin;
      }
    }
    return 'http://localhost:3000';
  };

  const API_BASE_URL = window.SIGME_API_URL || getCurrentScriptUrl();
  const SIGME_API = API_BASE_URL;
  const SW_PATH = '/sigme-universal-sw.js';

  // ============================================
  // ENVIRONMENT CHECKS
  // ============================================
  
  const currentDomain = window.location.hostname;

  if (!('serviceWorker' in navigator)) {
    console.warn('[Sigme]Service workers not supported');
    return;
  }

  if (!('PushManager' in window)) {
    console.warn('[Sigme]  Push notifications not supported');
    return;
  }

  // ============================================
  // GLOBAL STATE
  // ============================================
  
  let pageTrackingInitialized = false;
  let lastTrackedUrl = null;
  let websiteConfig = null;
  let isInitializing = false;
  let hasInitialized = false;
  let serviceWorkerRegistration = null;
  let subscriptionInProgress = false;
  let promptContainer = null; 
  let mutationObserver = null;
  let protectionInterval = null;

  // ============================================
  // WEBSITE DETECTION
  // ============================================
  
  async function detectWebsite() {
    try {
      const response = await fetch(
        `${SIGME_API}/api/websites/detect?domain=${encodeURIComponent(currentDomain)}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        console.error('[Sigme]  Website not found:', data.error);
        return null;
      }

      return data.config;
    } catch (error) {
      console.error('[Sigme]  Failed to detect website:', error);
      return null;
    }
  }

  // ============================================
  // PAGE VIEW TRACKING
  // ============================================
  
  function initPageTracking() {
    if (pageTrackingInitialized) return;

    const subscriberId = localStorage.getItem('sigme_subscriber_id');
    if (!subscriberId) return;

    pageTrackingInitialized = true;
    trackPageView(subscriberId);

    setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastTrackedUrl) {
        trackPageView(subscriberId);
      }
    }, 1000);

    window.addEventListener('popstate', () => {
      const subscriberId = localStorage.getItem('sigme_subscriber_id');
      if (subscriberId) {
        trackPageView(subscriberId);
      }
    });
  }

  async function trackPageView(subscriberId) {
    const pageUrl = window.location.href;
    if (pageUrl === lastTrackedUrl) return;
    
    lastTrackedUrl = pageUrl;
    const pageTitle = document.title;
    const pagePath = window.location.pathname;

    try {
      const response = await fetch(`${SIGME_API}/api/events/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriber_id: subscriberId,
          website_id: websiteConfig?.websiteId,
          event_name: 'page_view',
          properties: {
            url: pageUrl,
            title: pageTitle,
            path: pagePath,
            referrer: document.referrer || null,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (response.ok) {
        console.log('[Sigme] Page view tracked');
      }
    } catch (error) {
      console.error('[Sigme]  Page view tracking error:', error);
    }
  }

  async function trackCustomEvent(eventName, properties = {}) {
    const subscriberId = localStorage.getItem('sigme_subscriber_id');
    if (!subscriberId) {
      return { success: false, error: 'No subscriber' };
    }

    try {
      const response = await fetch(`${SIGME_API}/api/events/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriber_id: subscriberId,
          website_id: websiteConfig?.websiteId,
          event_name: eventName,
          properties: properties,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        return { success: true, data: result };
      } else {
        const errorText = await response.text();
        return { success: false, error: errorText };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // SERVICE WORKER READY CHECK
  // ============================================
  
  async function waitForServiceWorkerReady(registration, timeoutMs = 15000) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const checkReady = () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Service worker readiness timeout'));
          return;
        }
        
        if (registration.active && registration.active.state === 'activated') {
          resolve(true);
          return;
        }
        
        if (registration.installing) {
          registration.installing.addEventListener('statechange', function handler(e) {
            if (e.target.state === 'activated') {
              e.target.removeEventListener('statechange', handler);
              resolve(true);
            }
          });
          return;
        }
        
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          registration.waiting.addEventListener('statechange', function handler(e) {
            if (e.target.state === 'activated') {
              e.target.removeEventListener('statechange', handler);
              resolve(true);
            }
          });
          return;
        }
        
        setTimeout(checkReady, 100);
      };
      
      checkReady();
    });
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  
  async function initialize() {
    if (isInitializing || hasInitialized) {
      return;
    }

    const subscriberId = localStorage.getItem('sigme_subscriber_id');
    if (subscriberId && Notification.permission === 'granted') {
      hasInitialized = true;
      if (!pageTrackingInitialized) {
        initPageTracking();
      }
      return;
    }

    isInitializing = true;

    try {
      const config = await detectWebsite();
      if (!config) {
        return;
      }

      websiteConfig = config;
      config.apiUrl = SIGME_API;

      const registration = await navigator.serviceWorker.register(SW_PATH, {
        scope: '/'
      });
      
      serviceWorkerRegistration = registration;
      
      await waitForServiceWorkerReady(registration);

      if (registration.active) {
        registration.active.postMessage({
          type: 'SIGME_INIT',
          config
        });
        
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (Notification.permission === 'granted') {
        await subscribeUser(registration);
      } else if (Notification.permission === 'default') {
        showSubscribePrompt(config, registration);
      }

      if (subscriberId) {
        initPageTracking();
      }

      hasInitialized = true;

    } catch (err) {
      console.error('[Sigme]  Initialization failed:', err);
    } finally {
      isInitializing = false;
    }
  }

  // ============================================
  // HYDRATION-PROOF PROMPT CREATION
  // ============================================
  
  function showSubscribePrompt(config, registration) {
    // Prevent duplicates
    if (promptContainer && document.body.contains(promptContainer)) {
      // console.log('[Sigme] Prompt already visible');
       console.log('[Sigme] Click on the button to allow notifications');

      return;
    }

    const branding = config.branding || {};
    
    // FIX 1: Create isolated container outside React's control
    promptContainer = document.createElement('div');
    promptContainer.id = 'sigme-root-portal';
    promptContainer.setAttribute('data-sigme-ignore', 'true');
    
    // FIX 2: Use Shadow DOM for complete isolation
    const shadowRoot = promptContainer.attachShadow({ mode: 'open' });
    
    // FIX 3: Create styles and content inside shadow DOM
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes sigme-slideIn {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @keyframes sigme-spin {
        to { transform: rotate(360deg); }
      }
      
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }
      
      .sigme-prompt {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        padding: 20px;
        max-width: 380px;
        z-index: 2147483647;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        animation: sigme-slideIn 0.3s ease-out;
        pointer-events: auto;
      }
      
      .sigme-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }
      
      .sigme-logo {
        width: 40px;
        height: 40px;
        border-radius: 8px;
        object-fit: cover;
      }
      
      .sigme-logo-placeholder {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }
      
      .sigme-content {
        flex: 1;
      }
      
      .sigme-title {
        font-weight: 600;
        font-size: 16px;
        color: #1a1a1a;
      }
      
      .sigme-subtitle {
        font-size: 14px;
        color: #666;
        margin-top: 2px;
      }
      
      .sigme-buttons {
        display: flex;
        gap: 8px;
        margin-top: 16px;
      }
      
      .sigme-button {
        flex: 1;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        position: relative;
        user-select: none;
      }
      
      .sigme-button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
      
      .sigme-allow {
        background: ${branding.primary_color || '#667eea'};
        color: white;
      }
      
      .sigme-allow:not(:disabled):hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
      
      .sigme-deny {
        background: #f3f4f6;
        color: #6b7280;
      }
      
      .sigme-deny:not(:disabled):hover {
        background: #e5e7eb;
      }
      
      .sigme-spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid #ffffff;
        border-top-color: transparent;
        border-radius: 50%;
        animation: sigme-spin 0.6s linear infinite;
      }
      
      .sigme-error {
        margin-top: 12px;
        padding: 8px;
        background: #fee;
        color: #c00;
        border-radius: 6px;
        font-size: 13px;
        display: none;
      }
      
      .sigme-error.visible {
        display: block;
      }
    `;
    
    const promptHTML = `
      <div class="sigme-prompt">
        <div class="sigme-header">
          ${branding.logo_url 
            ? `<img src="${branding.logo_url}" alt="Logo" class="sigme-logo">` 
            : '<div class="sigme-logo-placeholder">🔔</div>'
          }
          <div class="sigme-content">
            <div class="sigme-title">
              Get notifications from ${config.websiteName}
            </div>
            <div class="sigme-subtitle">
              Stay updated with the latest news and offers
            </div>
          </div>
        </div>
        <div class="sigme-buttons">
          <button id="sigme-allow-btn" class="sigme-button sigme-allow">
            <span id="sigme-allow-text">Allow</span>
            <span id="sigme-allow-spinner" style="display: none;">
              <span class="sigme-spinner"></span>
            </span>
          </button>
          <button id="sigme-deny-btn" class="sigme-button sigme-deny">
            Not Now
          </button>
        </div>
        <div id="sigme-error" class="sigme-error"></div>
      </div>
    `;
    
    shadowRoot.appendChild(styleSheet);
    
    const promptElement = document.createElement('div');
    promptElement.innerHTML = promptHTML;
    shadowRoot.appendChild(promptElement);
    
    // FIX 4: Append to body
    document.body.appendChild(promptContainer);
    
    // FIX 5: Get button references from shadow DOM
    const allowBtn = shadowRoot.getElementById('sigme-allow-btn');
    const denyBtn = shadowRoot.getElementById('sigme-deny-btn');
    const allowText = shadowRoot.getElementById('sigme-allow-text');
    const allowSpinner = shadowRoot.getElementById('sigme-allow-spinner');
    const errorDiv = shadowRoot.getElementById('sigme-error');
    
    if (!allowBtn || !denyBtn) {
      console.error('[Sigme]  Buttons not found ');
      return;
    }
    
    // FIX 6: Protect from removal with MutationObserver
    mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node === promptContainer) {
              // console.warn('[Sigme] Prompt removed by external code, restoring...');
              // Re-append immediately
              setTimeout(() => {
                if (!document.body.contains(promptContainer)) {
                  document.body.appendChild(promptContainer);
                }
              }, 0);
            }
          });
        }
      }
    });
    
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: false
    });
    
    // FIX 7: Additional periodic check (during hydration window)
    let checkCount = 0;
    protectionInterval = setInterval(() => {
      checkCount++;
      
      if (!document.body.contains(promptContainer)) {
        console.warn('[Sigme] Prompt missing, restoring...');
        document.body.appendChild(promptContainer);
      }
      
      // Stop after 5 seconds (hydration should be done)
      if (checkCount >= 50) {
        clearInterval(protectionInterval);
        protectionInterval = null;
        mutationObserver.disconnect();
        mutationObserver = null;
        // console.log('[Sigme] Protection period complete');
      }
    }, 100);
    
    // FIX 8: Allow button handler
    allowBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (subscriptionInProgress) {
        return;
      }
      
      subscriptionInProgress = true;
      
      // Update UI
      allowBtn.disabled = true;
      denyBtn.disabled = true;
      allowText.style.display = 'none';
      allowSpinner.style.display = 'inline-block';
      errorDiv.classList.remove('visible');
      
      try {
        const permission = await Notification.requestPermission();
        
        if (permission === 'granted') {
          try {
            await waitForServiceWorkerReady(registration, 5000);
          } catch (swError) {
            throw new Error('Service worker not ready. Please refresh and try again.');
          }
          
          await subscribeUser(registration);
          
          // Wait for subscriber ID confirmation
          let attempts = 0;
          const checkSubscription = setInterval(() => {
            attempts++;
            const subId = localStorage.getItem('sigme_subscriber_id');
            
            if (subId) {
              clearInterval(checkSubscription);
              cleanupPrompt();
            } else if (attempts > 30) {
              clearInterval(checkSubscription);
              cleanupPrompt();
            }
          }, 100);
          
        } else if (permission === 'denied') {
          throw new Error('You blocked notifications. Click the 🔔 icon in your browser to enable them.');
        } else {
          throw new Error('Please click "Allow" in the browser prompt.');
        }
        
      } catch (error) {
        console.error('[Sigme]  Subscription failed:', error);
        
        errorDiv.textContent = error.message || 'Failed to enable notifications. Please try again.';
        errorDiv.classList.add('visible');
        
        // Re-enable buttons
        allowBtn.disabled = false;
        denyBtn.disabled = false;
        allowText.style.display = 'inline';
        allowSpinner.style.display = 'none';
        
        subscriptionInProgress = false;
        return;
      }
      
      subscriptionInProgress = false;
    };
    
    // FIX 9: Deny button handler
    denyBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      localStorage.setItem('sigme_prompt_dismissed', Date.now());
      cleanupPrompt();
    };
    
    // console.log('[Sigme] Hydration-proof prompt created!');
  }
  
  // ============================================
  // CLEANUP PROMPT
  // ============================================
  
  function cleanupPrompt() {
    // Stop protection
    if (protectionInterval) {
      clearInterval(protectionInterval);
      protectionInterval = null;
    }
    
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    
    // Remove prompt
    if (promptContainer && document.body.contains(promptContainer)) {
      promptContainer.remove();
    }
    
    promptContainer = null;
  }

  // ============================================
  // SUBSCRIBE USER
  // ============================================
  
  async function subscribeUser(registration, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (!registration.active) {
          if (attempt < retries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
          } else {
            throw new Error('No active service worker');
          }
        }

        if (registration.active.state !== 'activated') {
          await waitForServiceWorkerReady(registration, 3000);
        }

        registration.active.postMessage({
          type: 'SIGME_SUBSCRIBE'
        });
        
        return;
        
      } catch (error) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          throw error;
        }
      }
    }
  }

  // ============================================
  // SERVICE WORKER MESSAGES
  // ============================================
  
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SIGME_SUBSCRIBED') {
      if (event.data.success && event.data.data?.subscriber_id) {
        localStorage.setItem('sigme_subscriber_id', event.data.data.subscriber_id);
        
        window.dispatchEvent(new CustomEvent('sigme-subscribed', {
          detail: { subscriber_id: event.data.data.subscriber_id }
        }));
        
        setTimeout(() => {
          initPageTracking();
        }, 1000);
      }
    }
  });

  // ============================================
  // AUTO INITIALIZATION
  // ============================================
  
  const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  const shouldInitialize = () => {
    const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
    if (subscriberId && Notification.permission === 'granted') {
      initPageTracking();
      return false;
    }
    
    if (!lastDismissed || Date.now() - Number(lastDismissed) > sevenDays) {
      return true;
    }
    
    return false;
  };

  if (shouldInitialize()) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initialize, { once: true });
    } else {
      initialize();
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================
  
  window.Sigme = {
    subscribe: () => {
      hasInitialized = false;
      isInitializing = false;
      initialize();
    },
    getPermission: () => Notification.permission,
    track: trackCustomEvent,
    trackPageView: () => {
      const subscriberId = localStorage.getItem('sigme_subscriber_id');
      if (subscriberId) {
        trackPageView(subscriberId);
      }
    },
    getSubscriberId: () => localStorage.getItem('sigme_subscriber_id'),
    isSubscribed: () => !!localStorage.getItem('sigme_subscriber_id') && Notification.permission === 'granted',
    getConfig: () => websiteConfig,
    
    // Debug helpers
    retrySubscription: async () => {
      if (!serviceWorkerRegistration) {
        console.error('[Sigme]  No service worker registration');
        return;
      }
      subscriptionInProgress = false;
      await subscribeUser(serviceWorkerRegistration);
    },
    
    showPrompt: () => {
      if (websiteConfig && serviceWorkerRegistration) {
        cleanupPrompt(); 
        showSubscribePrompt(websiteConfig, serviceWorkerRegistration);
      }
    },
    
    hidePrompt: () => {
      cleanupPrompt();
    }
  };

  console.log('[Sigme]  Ready.....');

})();