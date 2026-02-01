// // backend/public/sigme-advanced-tracking.js
// // Enhanced tracking capabilities for Sigme SDK
// // Add this to your existing sigme.js or include separately

// (function() {
//   'use strict';

//   // ==========================================
//   // 1. SPECIFIC PAGE LANDING TRACKING
//   // ==========================================
  
//   function trackPageLanding() {
//     const currentUrl = window.location.href;
//     const currentPath = window.location.pathname;
    
//     console.log('[Sigme]  Tracking page landing:', currentPath);
    
//     // Track page_landed event with full URL details
//     window.Sigme.trackEvent('page_landed', {
//       url: currentUrl,
//       path: currentPath,
//       search: window.location.search,
//       hash: window.location.hash,
//       referrer: document.referrer || null,
//       timestamp: new Date().toISOString(),
//     });
//   }

//   // ==========================================
//   // 2. SCROLL DEPTH TRACKING
//   // ==========================================
  
//   let scrollTracked = {
//     '25': false,
//     '50': false,
//     '75': false,
//     '100': false
//   };

//   function trackScrollDepth() {
//     const scrollPercentage = Math.round(
//       (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100
//     );

//     // Track milestones: 25%, 50%, 75%, 100%
//     ['25', '50', '75', '100'].forEach(milestone => {
//       const milestoneNum = parseInt(milestone);
      
//       if (scrollPercentage >= milestoneNum && !scrollTracked[milestone]) {
//         scrollTracked[milestone] = true;
        
//         console.log(`[Sigme]  Scroll depth: ${milestone}%`);
        
//         window.Sigme.trackEvent('scroll_depth', {
//           percentage: milestoneNum,
//           url: window.location.href,
//           path: window.location.pathname,
//           timestamp: new Date().toISOString(),
//         });
//       }
//     });
//   }

//   // Throttle scroll events
//   let scrollTimeout;
//   window.addEventListener('scroll', () => {
//     if (scrollTimeout) clearTimeout(scrollTimeout);
//     scrollTimeout = setTimeout(trackScrollDepth, 200);
//   });

//   // ==========================================
//   // 3. PAGE ABANDONMENT TRACKING
//   // ==========================================
  
//   let pageLoadTime = Date.now();
//   let isPageAbandoned = false;

//   function trackPageAbandonment() {
//     if (isPageAbandoned) return;
//     isPageAbandoned = true;

//     const timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000); // seconds
    
//     console.log('[Sigme] Page abandonment detected. Time on page:', timeOnPage, 'seconds');

//     // Send beacon to ensure tracking even if page is closing
//     const data = {
//       event_name: 'page_abandoned',
//       properties: {
//         url: window.location.href,
//         path: window.location.pathname,
//         time_on_page_seconds: timeOnPage,
//         scroll_depth: getCurrentScrollPercentage(),
//         timestamp: new Date().toISOString(),
//       }
//     };

//     // Use sendBeacon for reliable tracking during page unload
//     if (navigator.sendBeacon) {
//       const subscriberId = localStorage.getItem('sigme_subscriber_id');
//       const websiteId = window.Sigme?.config?.websiteId;
      
//       if (subscriberId && websiteId) {
//         const blob = new Blob([JSON.stringify({
//           subscriber_id: subscriberId,
//           website_id: websiteId,
//           ...data
//         })], { type: 'application/json' });
        
//         navigator.sendBeacon(
//           `${window.Sigme.config.apiUrl}/api/events/track`,
//           blob
//         );
//       }
//     } else {
//       // Fallback to sync XHR (not recommended but works)
//       window.Sigme.trackEvent('page_abandoned', data.properties);
//     }
//   }

//   function getCurrentScrollPercentage() {
//     return Math.round(
//       (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100
//     );
//   }

//   // Track abandonment on:
//   // 1. Before page unload
//   window.addEventListener('beforeunload', trackPageAbandonment);
  
//   // 2. Visibility change (tab hidden)
//   document.addEventListener('visibilitychange', () => {
//     if (document.hidden) {
//       trackPageAbandonment();
//     }
//   });

//   // ==========================================
//   // 4. TIME ON PAGE TRACKING
//   // ==========================================
  
//   let timeCheckInterval;

//   function startTimeTracking() {
//     // Track time milestones: 10s, 30s, 1min, 2min, 5min
//     const milestones = [10, 30, 60, 120, 300]; // seconds
//     let trackedMilestones = new Set();

//     timeCheckInterval = setInterval(() => {
//       const timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000);
      
//       milestones.forEach(milestone => {
//         if (timeOnPage >= milestone && !trackedMilestones.has(milestone)) {
//           trackedMilestones.add(milestone);
          
//           console.log(`[Sigme]  Time on page: ${milestone}s`);
          
//           window.Sigme.trackEvent('time_on_page', {
//             seconds: milestone,
//             url: window.location.href,
//             path: window.location.pathname,
//             timestamp: new Date().toISOString(),
//           });
//         }
//       });
//     }, 1000); // Check every second
//   }

//   // ==========================================
//   // 5. URL INTERACTION TRACKING
//   // ==========================================
  
//   function trackLinkClicks() {
//     document.addEventListener('click', (e) => {
//       // Find closest link element
//       const link = e.target.closest('a');
      
//       if (link && link.href) {
//         const href = link.href;
//         const isExternal = !href.startsWith(window.location.origin);
        
//         console.log('[Sigme]  Link clicked:', href);
        
//         window.Sigme.trackEvent('link_clicked', {
//           url: href,
//           text: link.textContent?.trim() || '',
//           is_external: isExternal,
//           current_page: window.location.href,
//           timestamp: new Date().toISOString(),
//         });
//       }
//     });
//   }

//   // ==========================================
//   // 6. ABANDONED CART TRACKING
//   // ==========================================
  
//   function trackCartAbandonment() {
//     // This should be called by your e-commerce platform
//     window.Sigme.trackCartAbandonment = function(cartData) {
//       console.log('[Sigme] 🛒 Cart abandoned:', cartData);
      
//       window.Sigme.trackEvent('cart_abandoned', {
//         cart_id: cartData.cart_id || null,
//         items: cartData.items || [],
//         total_value: cartData.total || 0,
//         currency: cartData.currency || 'USD',
//         item_count: cartData.items?.length || 0,
//         timestamp: new Date().toISOString(),
//       });
//     };
//   }

//   // ==========================================
//   // 7. PRODUCT PURCHASE TRACKING
//   // ==========================================
  
//   function trackProductPurchase() {
//     // This should be called by your e-commerce platform
//     window.Sigme.trackPurchase = function(purchaseData) {
//       console.log('[Sigme]  Purchase completed:', purchaseData);
      
//       window.Sigme.trackEvent('product_purchased', {
//         order_id: purchaseData.order_id,
//         items: purchaseData.items || [],
//         total_value: purchaseData.total,
//         currency: purchaseData.currency || 'USD',
//         payment_method: purchaseData.payment_method || null,
//         timestamp: new Date().toISOString(),
//       });
//     };
//   }

//   // ==========================================
//   // 8. FORM INTERACTION TRACKING
//   // ==========================================
  
//   function trackFormInteractions() {
//     // Track form starts
//     document.addEventListener('focusin', (e) => {
//       const form = e.target.closest('form');
//       if (form && e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
//         const formId = form.id || form.name || 'unnamed-form';
        
//         if (!form.dataset.sigmeTracked) {
//           form.dataset.sigmeTracked = 'true';
          
//           console.log('[Sigme]  Form interaction started:', formId);
          
//           window.Sigme.trackEvent('form_started', {
//             form_id: formId,
//             url: window.location.href,
//             timestamp: new Date().toISOString(),
//           });
//         }
//       }
//     });

//     // Track form submissions
//     document.addEventListener('submit', (e) => {
//       const form = e.target;
//       const formId = form.id || form.name || 'unnamed-form';
      
//       console.log('[Sigme]  Form submitted:', formId);
      
//       window.Sigme.trackEvent('form_submitted', {
//         form_id: formId,
//         url: window.location.href,
//         timestamp: new Date().toISOString(),
//       });
//     });
//   }

//   // ==========================================
//   // 9. DEVICE & BROWSER DETECTION
//   // ==========================================
  
//   function getDeviceInfo() {
//     const ua = navigator.userAgent;
    
//     let deviceType = 'desktop';
//     if (/Mobile|Android|iP(hone|od)|BlackBerry|IEMobile/.test(ua)) {
//       deviceType = 'mobile';
//     } else if (/Tablet|iPad/.test(ua)) {
//       deviceType = 'tablet';
//     }

//     let browser = 'Unknown';
//     if (ua.includes('Chrome')) browser = 'Chrome';
//     else if (ua.includes('Safari')) browser = 'Safari';
//     else if (ua.includes('Firefox')) browser = 'Firefox';
//     else if (ua.includes('Edge')) browser = 'Edge';

//     let os = 'Unknown';
//     if (ua.includes('Windows')) os = 'Windows';
//     else if (ua.includes('Mac')) os = 'macOS';
//     else if (ua.includes('Linux')) os = 'Linux';
//     else if (ua.includes('Android')) os = 'Android';
//     else if (ua.includes('iOS')) os = 'iOS';

//     return { deviceType, browser, os };
//   }

//   // ==========================================
//   // 10. GEOGRAPHY DETECTION (IP-based)
//   // ==========================================
  
//   async function detectGeography() {
//     try {
//       // This is handled by the backend during subscriber registration
//       // But we can also get it client-side for immediate use
//       const response = await fetch('https://ipapi.co/json/');
//       const data = await response.json();
      
//       return {
//         country: data.country_name,
//         country_code: data.country_code,
//         city: data.city,
//         region: data.region,
//         timezone: data.timezone,
//       };
//     } catch (error) {
//       console.error('[Sigme] Failed to detect geography:', error);
//       return null;
//     }
//   }

//   // ==========================================
//   // INITIALIZE ALL TRACKING
//   // ==========================================
  
//   function initAdvancedTracking() {
//     console.log('[Sigme] Initializing advanced tracking...');

//     // Wait for Sigme to be ready
//     if (!window.Sigme) {
//       console.warn('[Sigme] Main SDK not loaded yet, waiting...');
//       setTimeout(initAdvancedTracking, 500);
//       return;
//     }

//     // Initialize all tracking features
//     trackPageLanding();
//     startTimeTracking();
//     trackLinkClicks();
//     trackCartAbandonment();
//     trackProductPurchase();
//     trackFormInteractions();

//     // Store device info for filtering
//     const deviceInfo = getDeviceInfo();
//     window.Sigme.deviceInfo = deviceInfo;

//     console.log('[Sigme]  Advanced tracking initialized');
//     console.log('[Sigme] Device:', deviceInfo);
//   }

//   // Auto-initialize when DOM is ready
//   if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initAdvancedTracking);
//   } else {
//     initAdvancedTracking();
//   }

//   // ==========================================
//   // RESET TRACKING ON PAGE NAVIGATION (SPA)
//   // ==========================================
  
//   window.addEventListener('popstate', () => {
//     // Reset tracking state for new page
//     scrollTracked = { '25': false, '50': false, '75': false, '100': false };
//     isPageAbandoned = false;
//     pageLoadTime = Date.now();
    
//     // Track new page landing
//     trackPageLanding();
//   });

// })();



















// backend/public/sigme-advanced-tracking.js 
// Enhanced tracking capabilities for Sigme SDK

(function() {
  'use strict';

  // ==========================================
  // 1. SPECIFIC PAGE LANDING TRACKING
  // ==========================================
  
  function trackPageLanding() {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    
    console.log('[Sigme]  Tracking page landing:', currentPath);
    
    //  FIXED: Use .track() not .trackEvent()
    window.Sigme.track('page_landed', {
      url: currentUrl,
      path: currentPath,
      search: window.location.search,
      hash: window.location.hash,
      referrer: document.referrer || null,
      timestamp: new Date().toISOString(),
    });
  }

  // ==========================================
  // 2. SCROLL DEPTH TRACKING
  // ==========================================
  
  let scrollTracked = {
    '25': false,
    '50': false,
    '75': false,
    '100': false
  };

  function trackScrollDepth() {
    const scrollPercentage = Math.round(
      (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100
    );

    // Track milestones: 25%, 50%, 75%, 100%
    ['25', '50', '75', '100'].forEach(milestone => {
      const milestoneNum = parseInt(milestone);
      
      if (scrollPercentage >= milestoneNum && !scrollTracked[milestone]) {
        scrollTracked[milestone] = true;
        
        console.log(`[Sigme]  Scroll depth: ${milestone}%`);
        
        //  FIXED: Use .track() not .trackEvent()
        window.Sigme.track('scroll_depth', {
          percentage: milestoneNum,
          url: window.location.href,
          path: window.location.pathname,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // Throttle scroll events
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(trackScrollDepth, 200);
  });

  // ==========================================
  // 3. PAGE ABANDONMENT TRACKING
  // ==========================================
  
  let pageLoadTime = Date.now();
  let isPageAbandoned = false;

  function trackPageAbandonment() {
    if (isPageAbandoned) return;
    isPageAbandoned = true;

    const timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000);
    
    console.log('[Sigme]  Page abandonment detected. Time on page:', timeOnPage, 'seconds');

    // Use sendBeacon for reliable tracking during page unload
    if (navigator.sendBeacon) {
      const subscriberId = localStorage.getItem('sigme_subscriber_id');
      const websiteId = window.Sigme?.getConfig?.()?.websiteId;
      
      if (subscriberId && websiteId) {
        const apiUrl = window.Sigme.getConfig?.()?.apiUrl || window.location.origin;
        
        const blob = new Blob([JSON.stringify({
          subscriber_id: subscriberId,
          website_id: websiteId,
          event_name: 'page_abandoned',
          properties: {
            url: window.location.href,
            path: window.location.pathname,
            time_on_page_seconds: timeOnPage,
            scroll_depth: getCurrentScrollPercentage(),
            timestamp: new Date().toISOString(),
          }
        })], { type: 'application/json' });
        
        navigator.sendBeacon(`${apiUrl}/api/events/track`, blob);
      }
    } else {
      // Fallback
      window.Sigme.track('page_abandoned', {
        url: window.location.href,
        path: window.location.pathname,
        time_on_page_seconds: timeOnPage,
        scroll_depth: getCurrentScrollPercentage(),
        timestamp: new Date().toISOString(),
      });
    }
  }

  function getCurrentScrollPercentage() {
    return Math.round(
      (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100
    );
  }

  // Track abandonment on beforeunload and visibility change
  window.addEventListener('beforeunload', trackPageAbandonment);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      trackPageAbandonment();
    }
  });

  // ==========================================
  // 4. TIME ON PAGE TRACKING
  // ==========================================
  
  function startTimeTracking() {
    const milestones = [10, 30, 60, 120, 300]; // seconds
    let trackedMilestones = new Set();

    setInterval(() => {
      const timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000);
      
      milestones.forEach(milestone => {
        if (timeOnPage >= milestone && !trackedMilestones.has(milestone)) {
          trackedMilestones.add(milestone);
          
          console.log(`[Sigme]  Time on page: ${milestone}s`);
          
          //  FIXED: Use .track() not .trackEvent()
          window.Sigme.track('time_on_page', {
            seconds: milestone,
            url: window.location.href,
            path: window.location.pathname,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }, 1000);
  }

  // ==========================================
  // 5. LINK INTERACTION TRACKING
  // ==========================================
  
  function trackLinkClicks() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      
      if (link && link.href) {
        const href = link.href;
        const isExternal = !href.startsWith(window.location.origin);
        
        console.log('[Sigme]  Link clicked:', href);
        
        //  FIXED: Use .track() not .trackEvent()
        window.Sigme.track('link_clicked', {
          url: href,
          text: link.textContent?.trim() || '',
          is_external: isExternal,
          current_page: window.location.href,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  // ==========================================
  // 6. CART ABANDONMENT TRACKING
  // ==========================================
  
  function setupCartTracking() {
    window.Sigme.trackCartAbandonment = function(cartData) {
      console.log('[Sigme] 🛒 Cart abandoned:', cartData);
      
      //  FIXED: Use .track() not .trackEvent()
      window.Sigme.track('cart_abandoned', {
        cart_id: cartData.cart_id || null,
        items: cartData.items || [],
        total_value: cartData.total || 0,
        currency: cartData.currency || 'USD',
        item_count: cartData.items?.length || 0,
        timestamp: new Date().toISOString(),
      });
    };
  }

  // ==========================================
  // 7. PRODUCT PURCHASE TRACKING
  // ==========================================
  
  function setupPurchaseTracking() {
    window.Sigme.trackPurchase = function(purchaseData) {
      console.log('[Sigme] 💰 Purchase completed:', purchaseData);
      
      //  FIXED: Use .track() not .trackEvent()
      window.Sigme.track('product_purchased', {
        order_id: purchaseData.order_id,
        items: purchaseData.items || [],
        total_value: purchaseData.total,
        currency: purchaseData.currency || 'USD',
        payment_method: purchaseData.payment_method || null,
        timestamp: new Date().toISOString(),
      });
    };
  }

  // ==========================================
  // 8. FORM INTERACTION TRACKING
  // ==========================================
  
  function trackFormInteractions() {
    // Track form starts
    document.addEventListener('focusin', (e) => {
      const form = e.target.closest('form');
      if (form && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        const formId = form.id || form.name || 'unnamed-form';
        
        if (!form.dataset.sigmeTracked) {
          form.dataset.sigmeTracked = 'true';
          
          console.log('[Sigme]  Form interaction started:', formId);
          
          //  FIXED: Use .track() not .trackEvent()
          window.Sigme.track('form_started', {
            form_id: formId,
            url: window.location.href,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    // Track form submissions
    document.addEventListener('submit', (e) => {
      const form = e.target;
      const formId = form.id || form.name || 'unnamed-form';
      
      console.log('[Sigme]  Form submitted:', formId);
      
      //  FIXED: Use .track() not .trackEvent()
      window.Sigme.track('form_submitted', {
        form_id: formId,
        url: window.location.href,
        timestamp: new Date().toISOString(),
      });
    });
  }

  // ==========================================
  // 9. DEVICE & BROWSER DETECTION
  // ==========================================
  
  function getDeviceInfo() {
    const ua = navigator.userAgent;
    
    let deviceType = 'desktop';
    if (/Mobile|Android|iP(hone|od)|BlackBerry|IEMobile/.test(ua)) {
      deviceType = 'mobile';
    } else if (/Tablet|iPad/.test(ua)) {
      deviceType = 'tablet';
    }

    let browser = 'Unknown';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Edge')) browser = 'Edge';

    let os = 'Unknown';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iOS')) os = 'iOS';

    return { deviceType, browser, os };
  }

  // ==========================================
  // INITIALIZE ALL TRACKING
  // ==========================================
  
  function initAdvancedTracking() {
    console.log('[Sigme]  Initializing advanced tracking...');

    // Wait for Sigme to be ready
    if (!window.Sigme || typeof window.Sigme.track !== 'function') {
      console.warn('[Sigme] ⏳ Main SDK not loaded yet, waiting...');
      setTimeout(initAdvancedTracking, 500);
      return;
    }

    // Initialize all tracking features
    trackPageLanding();
    startTimeTracking();
    trackLinkClicks();
    setupCartTracking();
    setupPurchaseTracking();
    trackFormInteractions();

    // Store device info for filtering
    const deviceInfo = getDeviceInfo();
    window.Sigme.deviceInfo = deviceInfo;

    console.log('[Sigme]  Advanced tracking initialized');
    // console.log('[Sigme]  Device:', deviceInfo);
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdvancedTracking);
  } else {
    initAdvancedTracking();
  }

  // ==========================================
  // RESET TRACKING ON PAGE NAVIGATION (SPA)
  // ==========================================
  
  window.addEventListener('popstate', () => {
    // Reset tracking state for new page
    scrollTracked = { '25': false, '50': false, '75': false, '100': false };
    isPageAbandoned = false;
    pageLoadTime = Date.now();
    
    // Track new page landing
    if (window.Sigme && typeof window.Sigme.track === 'function') {
      trackPageLanding();
    }
  });

})();