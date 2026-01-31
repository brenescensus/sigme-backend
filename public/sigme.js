// // // ============================================
// // // FILE: BACKEND/public/sigme.js
// // // ============================================
// // (function () {
// //   'use strict';

// //   console.log('[Sigme] Universal script loading...');
  

// //    const getCurrentScriptUrl = () => {
// //     const scripts = document.getElementsByTagName('script');
// //     for (let script of scripts) {
// //       if (script.src && script.src.includes('sigme.js')) {
// //         const url = new URL(script.src);
// //         console.log('[Sigme] Detected script URL:', url.origin);
// //         return url.origin;
// //       }
// //     }


// //     // Fallback to production backend
// //     console.log('[Sigme] Could not detect script URL, using default');
// //     return 'http://localhost:3000';
// //   };

// //   const API_BASE_URL = window.SIGME_API_URL || getCurrentScriptUrl();
// //   const SIGME_API = API_BASE_URL;


// //   // current_step_id Service worker must be on same origin as the website
// //   const SW_PATH = '/sigme-universal-sw.js';

// //   console.log('[Sigme] API URL:', SIGME_API);
// //   console.log('[Sigme] SW Path:', SW_PATH);

// //   // ===================================================== 
// //   // CONFIGURATION
// //   // ===================================================== 
// //   // const API_BASE_URL = window.SIGME_API_URL || 'https://sigme-backend-fkde.vercel.app';
// //   // const SIGME_API = API_BASE_URL;
  
// //   // // current_step_id Service worker must be on same origin as the website
// //   // const SW_PATH = '/sigme-universal-sw.js';

// //   // console.log('[Sigme] API URL:', SIGME_API);
// //   // console.log('[Sigme] SW Path:', SW_PATH);

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

// //       // Add API URL to config so service worker knows where to send requests
// //       config.apiUrl = SIGME_API;

// //       console.log('[Sigme] Registering service worker...');
      
// //       // Check if service worker file exists
// //       try {
// //         const swCheck = await fetch(SW_PATH, { method: 'HEAD' });
// //         if (!swCheck.ok) {
// //           console.error('[Sigme] Service worker file not found. Please add sigme-universal-sw.js to your /public folder.');
// //           console.error('[Sigme] Download from: https://sigme-backend-fkde.vercel.app/sigme-universal-sw.js');
// //           return;
// //         }
// //       } catch (e) {
// //         console.error('[Sigme] Could not verify service worker file:', e.message);
// //         return;
// //       }

// //       const registration = await navigator.serviceWorker.register(SW_PATH, {
// //         scope: '/'
// //       });
      
// //       await navigator.serviceWorker.ready;
// //       console.log('[Sigme] Service worker registered successfully');

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
      
// //       if (err.message.includes('ServiceWorker')) {
// //         console.error('[Sigme] Make sure sigme-universal-sw.js exists in your /public folder');
// //         console.error('[Sigme] Download from: https://sigme-backend-fkde.vercel.app/sigme-universal-.js');
// //       }
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
  
//   // ... [Keep all your existing code until the PUBLIC API section] ...

//   // ===================================================== 
//   //  NEW: PAGE VIEW TRACKING
//   // ===================================================== 
//   let pageTrackingInitialized = false;
//   let lastTrackedUrl = null;

//   /**
//    * Initialize automatic page view tracking
//    */
//   function initPageTracking() {
//     if (pageTrackingInitialized) {
//       console.log('[Sigme] Page tracking already initialized');
//       return;
//     }

//     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
//     if (!subscriberId) {
//       console.log('[Sigme] No subscriber ID yet, page tracking will start after subscription');
//       return;
//     }

//     console.log('[Sigme]  Initializing page tracking...');
//     pageTrackingInitialized = true;

//     // Track initial page view
//     trackPageView(subscriberId);

//     // Track page views on navigation (for SPAs)
//     setInterval(() => {
//       const currentUrl = window.location.href;
//       if (currentUrl !== lastTrackedUrl) {
//         trackPageView(subscriberId);
//       }
//     }, 1000);

//     // Track on popstate (back/forward navigation)
//     window.addEventListener('popstate', () => {
//       trackPageView(subscriberId);
//     });

//     console.log('[Sigme]  Page tracking initialized');
//   }

//   /**
//    * Track page view event
//    */
//   async function trackPageView(subscriberId) {
//     const pageUrl = window.location.href;
    
//     // Don't track the same URL twice in a row
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
//           website_id: window.SigmeConfig?.websiteId,
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
//         console.log('[Sigme]  Page view tracked:', result);
//       } else {
//         const errorText = await response.text();
//         console.error('[Sigme]  Page view tracking failed:', errorText);
//       }
//     } catch (error) {
//       console.error('[Sigme]  Page view tracking error:', error);
//     }
//   }

//   /**
//    *  NEW: Track custom events
//    */
//   async function trackCustomEvent(eventName, properties = {}) {
//     const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
//     if (!subscriberId) {
//       console.warn('[Sigme]  Cannot track event - no subscriber ID');
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
//           website_id: window.SigmeConfig?.websiteId,
//           event_name: eventName,
//           properties: properties,
//         }),
//       });

//       if (response.ok) {
//         const result = await response.json();
//         console.log(`[Sigme]  Event tracked:`, result);
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

//   // ===================================================== 
//   // SERVICE WORKER MESSAGES (UPDATE THIS SECTION)
//   // ===================================================== 
//   navigator.serviceWorker.addEventListener('message', (event) => {
//     if (event.data?.type === 'SIGME_SUBSCRIBED') {
//       if (event.data.success) {
//         console.log('[Sigme]  Subscribed successfully!');
        
//         //  SAVE SUBSCRIBER ID
//         if (event.data.data?.subscriber_id) {
//           localStorage.setItem('sigme_subscriber_id', event.data.data.subscriber_id);
//           console.log('[Sigme]  Subscriber ID saved:', event.data.data.subscriber_id);
          
//           //  START PAGE TRACKING AFTER SUBSCRIPTION
//           setTimeout(() => {
//             console.log('[Sigme] Starting page tracking after subscription...');
//             initPageTracking();
//           }, 1000);
//         }
//       } else {
//         console.warn('[Sigme]  Subscription failed:', event.data.error);
//       }
//     }

//     if (event.data?.type === 'SIGME_SHOW_NOTIFICATION') {
//       showInPageNotification(event.data.notification);
//     }
//   });

//   // ... [Keep your existing IN-PAGE NOTIFICATION function] ...

//   // ===================================================== 
//   // AUTO INIT (UPDATE THIS SECTION)
//   // ===================================================== 
//   const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
//   const sevenDays = 7 * 24 * 60 * 60 * 1000;

//   if (!lastDismissed || Date.now() - lastDismissed > sevenDays) {
//     if (document.readyState === 'loading') {
//       document.addEventListener('DOMContentLoaded', () => {
//         initialize();
//         //  START PAGE TRACKING IF ALREADY SUBSCRIBED
//         initPageTracking();
//       });
//     } else {
//       initialize();
//       //  START PAGE TRACKING IF ALREADY SUBSCRIBED
//       initPageTracking();
//     }
//   } else {
//     // Even if prompt was dismissed, still track pages if user is subscribed
//     if (document.readyState === 'loading') {
//       document.addEventListener('DOMContentLoaded', initPageTracking);
//     } else {
//       initPageTracking();
//     }
//   }

//   // ===================================================== 
//   // PUBLIC API (UPDATE THIS SECTION)
//   // ===================================================== 
//   window.Sigme = {
//     subscribe: initialize,
//     getPermission: () => Notification.permission,
//     //  NEW: Custom event tracking API
//     track: trackCustomEvent,
//     //  NEW: Manual page tracking (if needed)
//     trackPageView: () => {
//       const subscriberId = localStorage.getItem('sigme_subscriber_id');
//       if (subscriberId) {
//         trackPageView(subscriberId);
//       } else {
//         console.warn('[Sigme] Cannot track page - no subscriber ID');
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

  console.log('[Sigme] Universal script loading...');
  
  // ============================================
  // API URL DETECTION
  // ============================================
  
  const getCurrentScriptUrl = () => {
    const scripts = document.getElementsByTagName('script');
    for (let script of scripts) {
      if (script.src && script.src.includes('sigme.js')) {
        const url = new URL(script.src);
        console.log('[Sigme]  Detected script URL:');
        return url.origin;
      }
    }

    // Fallback to default
    console.log('[Sigme]  Could not detect script URL, using default');
    return 'http://localhost:3000';
  };

  const API_BASE_URL = window.SIGME_API_URL || getCurrentScriptUrl();
  const SIGME_API = API_BASE_URL;

  //  Service worker MUST be on same origin as the website
  const SW_PATH = '/sigme-universal-sw.js';

  // console.log('[Sigme] API URL:', SIGME_API);
  // console.log('[Sigme] SW Path:', SW_PATH);

  // ============================================
  // ENVIRONMENT CHECKS
  // ============================================
  
  const currentDomain = window.location.hostname;
  console.log('[Sigme]  Current domain:', currentDomain);

  if (!('serviceWorker' in navigator)) {
    console.warn('[Sigme]  Service workers not supported');
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

  // ============================================
  // WEBSITE DETECTION
  // ============================================
  
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
        console.error('[Sigme]  Website not found:', data.error);
        return null;
      }

      console.log('[Sigme]  Configuration loaded:', data.config.websiteName);
      return data.config;
    } catch (error) {
      console.error('[Sigme]  Failed to detect website:', error);
      return null;
    }
  }

  // ============================================
  // PAGE VIEW TRACKING
  // ============================================
  
  /**
   * Initialize automatic page view tracking
   */
  function initPageTracking() {
    if (pageTrackingInitialized) {
      console.log('[Sigme] ℹ Page tracking already initialized');
      return;
    }

    const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
    if (!subscriberId) {
      console.log('[Sigme] ℹ No subscriber ID yet, page tracking will start after subscription');
      return;
    }

    console.log('[Sigme]  Initializing page tracking...');
    pageTrackingInitialized = true;

    // Track initial page view
    trackPageView(subscriberId);

    // Track page views on navigation (for SPAs)
    setInterval(() => {
      const currentUrl = window.location.href;
      if (currentUrl !== lastTrackedUrl) {
        trackPageView(subscriberId);
      }
    }, 1000);

    // Track on popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
      const subscriberId = localStorage.getItem('sigme_subscriber_id');
      if (subscriberId) {
        trackPageView(subscriberId);
      }
    });

    console.log('[Sigme]  Page tracking initialized');
  }

  /**
   * Track page view event
   */
  async function trackPageView(subscriberId) {
    const pageUrl = window.location.href;
    
    // Don't track the same URL twice in a row
    if (pageUrl === lastTrackedUrl) {
      return;
    }
    
    lastTrackedUrl = pageUrl;
    const pageTitle = document.title;
    const pagePath = window.location.pathname;

    console.log('[Sigme]  Tracking page view:', pagePath);

    try {
      const response = await fetch(`${SIGME_API}/api/events/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriber_id: subscriberId,
          website_id: websiteConfig?.websiteId || window.SigmeConfig?.websiteId,
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
        const result = await response.json();
        console.log('[Sigme]  Page view tracked:', result);
      } else {
        const errorText = await response.text();
        console.error('[Sigme]  Page view tracking failed:', errorText);
      }
    } catch (error) {
      console.error('[Sigme]  Page view tracking error:', error);
    }
  }

  /**
   * Track custom events
   */
  async function trackCustomEvent(eventName, properties = {}) {
    const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
    if (!subscriberId) {
      console.warn('[Sigme]  Cannot track event - no subscriber ID');
      return { success: false, error: 'No subscriber ID' };
    }

    console.log(`[Sigme]  Tracking custom event: ${eventName}`);

    try {
      const response = await fetch(`${SIGME_API}/api/events/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriber_id: subscriberId,
          website_id: websiteConfig?.websiteId || window.SigmeConfig?.websiteId,
          event_name: eventName,
          properties: properties,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`[Sigme]  Event tracked:`, result);
        return { success: true, data: result };
      } else {
        const errorText = await response.text();
        console.error(`[Sigme]  Event tracking failed:`, errorText);
        return { success: false, error: errorText };
      }
    } catch (error) {
      console.error(`[Sigme]  Event tracking error:`, error);
      return { success: false, error: error.message };
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  
  async function initialize() {
    try {
      const config = await detectWebsite();
      if (!config) {
        console.warn('[Sigme]  Could not load configuration - aborting');
        return;
      }

      // Store config globally
      websiteConfig = config;

      // Add API URL to config so service worker knows where to send requests
      config.apiUrl = SIGME_API;

      console.log('[Sigme]  Registering service worker...');
      
      // Check if service worker file exists
      try {
        const swCheck = await fetch(SW_PATH, { method: 'HEAD' });
        if (!swCheck.ok) {
          console.error('[Sigme]  Service worker file not found. Please add sigme-universal-sw.js to your /public folder.');
          console.error('[Sigme]  Download from: ' + SIGME_API + '/sigme-universal-sw.js');
          return;
        }
      } catch (e) {
        console.error('[Sigme]  Could not verify service worker file:', e.message);
        return;
      }

      const registration = await navigator.serviceWorker.register(SW_PATH, {
        scope: '/'
      });
      
      await navigator.serviceWorker.ready;
      console.log('[Sigme]  Service worker registered successfully');

      // Send config to service worker
      if (registration.active) {
        registration.active.postMessage({
          type: 'SIGME_INIT',
          config
        });
      }

      // Handle notification permission state
      if (Notification.permission === 'granted') {
        console.log('[Sigme]  Notification permission already granted');
        subscribeUser(registration);
      } else if (Notification.permission === 'default') {
        console.log('[Sigme] Notification permission not requested yet');
        showSubscribePrompt(config, registration);
      } else {
        console.log('[Sigme]  Notifications denied by user');
      }

      //  START PAGE TRACKING IF ALREADY SUBSCRIBED
      const subscriberId = localStorage.getItem('sigme_subscriber_id');
      if (subscriberId) {
        console.log('[Sigme]  Subscriber found, starting page tracking...');
        initPageTracking();
      }

    } catch (err) {
      console.error('[Sigme]  Initialization failed:', err);
      
      if (err.message.includes('ServiceWorker')) {
        console.error('[Sigme]  Make sure sigme-universal-sw.js exists in your /public folder');
        console.error('[Sigme]  Download from: ' + SIGME_API + '/sigme-universal-sw.js');
      }
    }
  }

  // ============================================
  // SUBSCRIPTION PROMPT UI
  // ============================================
  
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
        animation: slideIn 0.3s ease-out;
      ">
        <style>
          @keyframes slideIn {
            from {
              transform: translateY(100px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        </style>
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
          ${branding.logo_url 
            ? `<img src="${branding.logo_url}" alt="Logo" style="width: 40px; height: 40px; border-radius: 8px; object-fit: cover;">` 
            : '<div style="width: 40px; height: 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">🔔</div>'
          }
          <div style="flex: 1;">
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
            background: ${branding.primary_color || '#667eea'};
            color: white;
            border: none;
            padding: 10px 16px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
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
            transition: all 0.2s;
          ">
            Not Now
          </button>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = promptHtml;
    document.body.appendChild(div);

    // Add hover effects
    const allowBtn = document.getElementById('sigme-allow');
    const denyBtn = document.getElementById('sigme-deny');

    allowBtn.onmouseover = () => {
      allowBtn.style.opacity = '0.9';
      allowBtn.style.transform = 'translateY(-1px)';
    };
    allowBtn.onmouseout = () => {
      allowBtn.style.opacity = '1';
      allowBtn.style.transform = 'translateY(0)';
    };

    denyBtn.onmouseover = () => {
      denyBtn.style.background = '#e5e7eb';
    };
    denyBtn.onmouseout = () => {
      denyBtn.style.background = '#f3f4f6';
    };

    // Handle allow button
    allowBtn.onclick = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          console.log('[Sigme]  Permission granted');
          subscribeUser(registration);
        } else {
          console.log('[Sigme] 🚫 Permission denied');
        }
      } catch (error) {
        console.error('[Sigme]  Permission request failed:', error);
      }
      div.remove();
    };

    // Handle deny button
    denyBtn.onclick = () => {
      console.log('[Sigme User dismissed prompt');
      localStorage.setItem('sigme_prompt_dismissed', Date.now());
      div.remove();
    };
  }

  // ============================================
  // SUBSCRIBE USER
  // ============================================
  
  function subscribeUser(registration) {
    console.log('[Sigme]  Initiating subscription...');
    
    if (registration.active) {
      registration.active.postMessage({
        type: 'SIGME_SUBSCRIBE'
      });
    } else {
      console.warn('[Sigme]  No active service worker found');
    }
  }

  // ============================================
  // SERVICE WORKER MESSAGES
  // ============================================
  
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SIGME_SUBSCRIBED') {
      if (event.data.success) {
        console.log('[Sigme]  Subscribed successfully!');
        
        //  SAVE SUBSCRIBER ID
        if (event.data.data?.subscriber_id) {
          localStorage.setItem('sigme_subscriber_id', event.data.data.subscriber_id);
          console.log('[Sigme]  Subscriber ID saved:', event.data.data.subscriber_id);
          
          //  START PAGE TRACKING AFTER SUBSCRIPTION
          setTimeout(() => {
            console.log('[Sigme] Starting page tracking after subscription...');
            initPageTracking();
          }, 1000);
        }
      } else {
        console.warn('[Sigme]  Subscription failed:', event.data.error);
      }
    }

    if (event.data?.type === 'SIGME_SHOW_NOTIFICATION') {
      showInPageNotification(event.data.notification);
    }
  });

  // ============================================
  // IN-PAGE NOTIFICATION (Fallback)
  // ============================================
  
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
      animation: slideIn 0.3s ease-out;
    `;

    div.innerHTML = `
      <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px; color: #1a1a1a;">
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

    setTimeout(() => {
      div.style.opacity = '0';
      div.style.transform = 'translateX(400px)';
      div.style.transition = 'all 0.3s ease-out';
      setTimeout(() => div.remove(), 300);
    }, 5000);
  }

  // ============================================
  // AUTO INITIALIZATION
  // ============================================
  
  const lastDismissed = localStorage.getItem('sigme_prompt_dismissed');
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  if (!lastDismissed || Date.now() - Number(lastDismissed) > sevenDays) {
    // Show prompt and initialize
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initialize();
        initPageTracking();
      });
    } else {
      initialize();
      initPageTracking();
    }
  } else {
    // Prompt was dismissed, but still track pages if user is subscribed
    console.log('[Sigme Prompt dismissed recently, skipping initialization');
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initPageTracking);
    } else {
      initPageTracking();
    }
  }

  // ============================================
  // PUBLIC API
  // ============================================
  
  window.Sigme = {
    /**
     * Manually trigger subscription prompt
     */
    subscribe: initialize,
    
    /**
     * Get current notification permission status
     * @returns {string} 'granted', 'denied', or 'default'
     */
    getPermission: () => Notification.permission,
    
    /**
     * Track custom events
     * @param {string} eventName - Name of the event
     * @param {Object} properties - Event properties
     * @returns {Promise<Object>} Result object
     */
    track: trackCustomEvent,
    
    /**
     * Manually track current page view
     */
    trackPageView: () => {
      const subscriberId = localStorage.getItem('sigme_subscriber_id');
      if (subscriberId) {
        trackPageView(subscriberId);
      } else {
        console.warn('[Sigme]  Cannot track page - no subscriber ID');
      }
    },

    /**
     * Get subscriber ID
     * @returns {string|null} Subscriber ID or null
     */
    getSubscriberId: () => {
      return localStorage.getItem('sigme_subscriber_id');
    },

    /**
     * Check if user is subscribed
     * @returns {boolean} True if subscribed
     */
    isSubscribed: () => {
      return !!localStorage.getItem('sigme_subscriber_id') && Notification.permission === 'granted';
    },

    /**
     * Get current configuration
     * @returns {Object|null} Website configuration
     */
    getConfig: () => {
      return websiteConfig;
    }
  };

  console.log('[Sigme]  Script ready');





  // backend/public/sigme.js - Add at the very end, before closing })();

//  FORCE CHECK FOR SUBSCRIBER ID AND START TRACKING
setTimeout(() => {
  console.log('[Sigme] Force-checking if page tracking should start...');
  const subscriberId = localStorage.getItem('sigme_subscriber_id');
  
  if (subscriberId) {
    console.log('[Sigme]  Subscriber ID found:', subscriberId);
    
    if (!pageTrackingInitialized) {
      console.log('[Sigme] Force-starting page tracking...');
      initPageTracking();
    } else {
      console.log('[Sigme Page tracking already initialized');
    }
  } else {
    console.log('[Sigme]  No subscriber ID found in localStorage');
    console.log('[Sigme] 💡 Try subscribing first: Sigme.subscribe()');
  }
}, 3000); // Wait 3 seconds after page load

console.log('[Sigme]  Script ready');

})();