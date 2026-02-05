// ============================================
// FILE: BACKEND/public/sigme-advanced-tracking.js (FIXED - NO SPAM)
// Enhanced tracking capabilities for Sigme SDK
// ============================================

(function() {
  'use strict';

  // ==========================================
  // CONFIGURATION
  // ==========================================
  
  const CONFIG = {
    SCROLL_MILESTONES: [25, 50, 75, 100],
    TIME_MILESTONES: [10,20,30,40,50,60,70,80,90,100,120, 150,300], // seconds
    ABANDONMENT_DELAY: 2000, // 2 seconds delay before considering abandonment
    MIN_TIME_FOR_ABANDONMENT: 5, // Minimum 5 seconds on page before tracking abandonment
  };

  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  
  let pageLoadTime = Date.now();
  let isPageAbandoned = false;
  let abandonmentTimeout = null;
  let trackingInitialized = false;
  let isUserActive = true; // Track if user is actively on the page

  // ==========================================
  // 1. SPECIFIC PAGE LANDING TRACKING
  // ==========================================
  
  function trackPageLanding() {
    const currentUrl = window.location.href;
    const currentPath = window.location.pathname;
    
    console.log('[Sigme]  Tracking page landing:', currentPath);
    
    window.Sigme.track('page_landing', {
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

    ['25', '50', '75', '100'].forEach(milestone => {
      const milestoneNum = parseInt(milestone);
      
      if (scrollPercentage >= milestoneNum && !scrollTracked[milestone]) {
        scrollTracked[milestone] = true;
        
        console.log(`[Sigme]  Scroll depth: ${milestone}%`);
        
        window.Sigme.track('scroll_depth', {
          percentage: milestoneNum,
          url: window.location.href,
          path: window.location.pathname,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (!trackingInitialized) return;
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(trackScrollDepth, 200);
  });

  // ==========================================
  // 3. PAGE ABANDONMENT TRACKING (FIXED)
  // ==========================================
  
  function getCurrentScrollPercentage() {
    try {
      return Math.round(
        (window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100
      );
    } catch (e) {
      return 0;
    }
  }

  function getTimeOnPage() {
    return Math.round((Date.now() - pageLoadTime) / 1000);
  }

  function trackPageAbandonment() {
    if (!trackingInitialized) {
      console.log('[Sigme]  Tracking not initialized');
      return;
    }
    
    //  FIX: Check if already tracked
    if (isPageAbandoned) {
      console.log('[Sigme]   Abandonment already tracked, skipping');
      return;
    }
    
    const timeOnPage = getTimeOnPage();
    
    //  FIX: Only track if user was on page for minimum time
    if (timeOnPage < CONFIG.MIN_TIME_FOR_ABANDONMENT) {
      console.log(`[Sigme]   Only ${timeOnPage}s on page (min ${CONFIG.MIN_TIME_FOR_ABANDONMENT}s), skipping abandonment`);
      return;
    }
    
    //  Mark as abandoned BEFORE sending to prevent duplicates
    isPageAbandoned = true;
    
    const scrollDepth = getCurrentScrollPercentage();
    
    console.log('[Sigme]  Page abandonment detected');
    console.log(`[Sigme]    Time on page: ${timeOnPage}s`);
    console.log(`[Sigme]    Scroll depth: ${scrollDepth}%`);

    const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
    if (!subscriberId) {
      console.log('[Sigme]  No subscriber , skipping  tracking');
      return;
    }

    const websiteId = window.Sigme?.getConfig?.()?.websiteId;
    const apiUrl = window.Sigme?.getConfig?.()?.apiUrl || window.location.origin;
    
    if (!websiteId) {
      console.log('[Sigme]  No website , skipping tracking');
      return;
    }

    const eventData = {
      url: window.location.href,
      path: window.location.pathname,
      time_on_page_seconds: timeOnPage,
      scroll_depth: scrollDepth,
      timestamp: new Date().toISOString(),
    };

    const payload = {
      subscriber_id: subscriberId,
      website_id: websiteId,
      event_name: 'page_abandoned',
      properties: eventData
    };

    //  METHOD 1: Use fetch with keepalive (works during page unload)
    const endpoint = `${apiUrl}/api/events/track`;
    
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,      
      credentials: 'omit',  
    })
    .then(() => {
      console.log('[Sigme]  Page abandonment tracked successfully');
    })
    .catch(error => {
      console.error('[Sigme] Failed to track abandonment:', error);
      
      //  Fallback: Try sendBeacon if fetch fails
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const sent = navigator.sendBeacon(endpoint, blob);
        console.log('[Sigme]  Beacon fallback:', sent ? 'sent' : 'failed');
      }
    });
  }

  //  FIX: Better abandonment scheduling with debounce
  function scheduleAbandonment() {
    // Clear any existing timeout
    if (abandonmentTimeout) {
      clearTimeout(abandonmentTimeout);
      abandonmentTimeout = null;
    }
    
    // Don't schedule if already tracked
    if (isPageAbandoned) {
      return;
    }
    
    // Mark user as inactive
    isUserActive = false;
    
    // Schedule abandonment after delay
    abandonmentTimeout = setTimeout(() => {
      // Only track if user is still inactive
      if (!isUserActive && !isPageAbandoned) {
        trackPageAbandonment();
      }
    }, CONFIG.ABANDONMENT_DELAY);
  }

  //  FIX: Cancel abandonment when user returns
  function cancelAbandonment() {
    if (abandonmentTimeout) {
      clearTimeout(abandonmentTimeout);
      abandonmentTimeout = null;
    }
    
    // Mark user as active again
    isUserActive = true;
  }

  // ==========================================
  // ABANDONMENT EVENT LISTENERS (FIXED)
  // ==========================================

  //  Track on page unload (most reliable)
  window.addEventListener('beforeunload', () => {
    if (trackingInitialized && !isPageAbandoned) {
      console.log('[Sigme] beforeunload - tracking abandonment');
      trackPageAbandonment();
    }
  });

  window.addEventListener('pagehide', () => {
    if (trackingInitialized && !isPageAbandoned) {
      console.log('[Sigme]  pagehide - tracking abandonment');
      trackPageAbandonment();
    }
  });

  //  FIX: Visibility change with debounce
  document.addEventListener('visibilitychange', () => {
    if (!trackingInitialized) return;
    
    if (document.hidden) {
      // User switched tabs/minimized - schedule abandonment
      console.log('[Sigme]   Tab hidden - scheduling abandonment');
      scheduleAbandonment();
    } else {
      // User came back - cancel abandonment
      console.log('[Sigme]   Tab visible - canceling abandonment');
      cancelAbandonment();
    }
  });

  //  FIX: Window blur with longer delay
  let blurTimeout;
  window.addEventListener('blur', () => {
    if (!trackingInitialized) return;
    
    // Wait longer before considering blur as abandonment
    blurTimeout = setTimeout(() => {
      console.log('[Sigme]  Window blur (5s) - scheduling abandonment');
      scheduleAbandonment();
    }, 5000); // 5 seconds
  });

  window.addEventListener('focus', () => {
    if (blurTimeout) {
      clearTimeout(blurTimeout);
      blurTimeout = null;
    }
    cancelAbandonment();
  });

  //  Also track user activity to reset abandonment timer
  let activityTimeout;
  function resetActivityTimer() {
    if (!trackingInitialized) return;
    
    isUserActive = true;
    
    // Cancel any pending abandonment
    if (abandonmentTimeout) {
      clearTimeout(abandonmentTimeout);
      abandonmentTimeout = null;
    }
  }

  // Track various user activities
  ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
    document.addEventListener(event, () => {
      if (activityTimeout) clearTimeout(activityTimeout);
      activityTimeout = setTimeout(resetActivityTimer, 100);
    }, { passive: true });
  });

  // ==========================================
  // 4. TIME ON PAGE TRACKING
  // ==========================================
  
  function startTimeTracking() {
    const milestones = CONFIG.TIME_MILESTONES;
    let trackedMilestones = new Set();

    setInterval(() => {
      if (!trackingInitialized) return;
      
      const timeOnPage = Math.round((Date.now() - pageLoadTime) / 1000);
      
      milestones.forEach(milestone => {
        if (timeOnPage >= milestone && !trackedMilestones.has(milestone)) {
          trackedMilestones.add(milestone);
          
          console.log(`[Sigme]   Time on page: ${milestone}s`);
          
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
      if (!trackingInitialized) return;
      
      const link = e.target.closest('a');
      
      if (link && link.href) {
        const href = link.href;
        const isExternal = !href.startsWith(window.location.origin);
        
        console.log('[Sigme]  Link clicked:', href);
        
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
      if (!trackingInitialized) {
        console.warn('[Sigme]  Advanced tracking not initialized yet');
        return;
      }
      
      console.log('[Sigme]  Cart abandoned:', cartData);
      
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
      if (!trackingInitialized) {
        console.warn('[Sigme]   Advanced tracking not initialized yet');
        return;
      }
      
      console.log('[Sigme]  Purchase completed:', purchaseData);
      
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
    document.addEventListener('focusin', (e) => {
      if (!trackingInitialized) return;
      
      const form = e.target.closest('form');
      if (form && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        const formId = form.id || form.name || 'unnamed-form';
        
        if (!form.dataset.sigmeTracked) {
          form.dataset.sigmeTracked = 'true';
          
          console.log('[Sigme]  Form interaction started:', formId);
          
          window.Sigme.track('form_started', {
            form_id: formId,
            url: window.location.href,
            timestamp: new Date().toISOString(),
          });
        }
      }
    });

    document.addEventListener('submit', (e) => {
      if (!trackingInitialized) return;
      
      const form = e.target;
      const formId = form.id || form.name || 'unnamed-form';
      
      console.log('[Sigme]  Form submitted:', formId);
      
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
    // Prevent double initialization
    if (trackingInitialized) {
      console.log('[Sigme] Advanced tracking already initialized');
      return;
    }

    console.log('[Sigme]  Checking if advanced tracking should start...');

    // Wait for Sigme to be ready
    if (!window.Sigme || typeof window.Sigme.track !== 'function') {
      console.warn('[Sigme]  waiting...');
      setTimeout(initAdvancedTracking, 500);
      return;
    }

    // Only start tracking if user is subscribed
    const subscriberId = localStorage.getItem('sigme_subscriber_id');
    
    if (!subscriberId) {
      console.log('[Sigme]   No subscriber . Advanced tracking will start after subscription.');
      return;
    }

    console.log('[Sigme]  Subscriber found, initializing advanced tracking...');

    // Mark as initialized
    trackingInitialized = true;
    isUserActive = true;
    isPageAbandoned = false; // Reset state

    // Initialize all tracking features
    trackPageLanding();
    startTimeTracking();
    trackLinkClicks();
    setupCartTracking();
    setupPurchaseTracking();
    trackFormInteractions();

    // Store device info
    const deviceInfo = getDeviceInfo();
    window.Sigme.deviceInfo = deviceInfo;

    console.log('[Sigme]  Advanced tracking initialized successfully');
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdvancedTracking);
  } else {
    setTimeout(initAdvancedTracking, 100);
  }

  // Listen for subscription events to start tracking
  window.addEventListener('sigme-subscribed', () => {
    console.log('[Sigme]  Subscribed successfully, starting tracking...');
    initAdvancedTracking();
  });

  // ==========================================
  // RESET TRACKING ON PAGE NAVIGATION (SPA)
  // ==========================================
  
  window.addEventListener('popstate', () => {
    if (!trackingInitialized) return;
    
    console.log('[Sigme]  Page navigation detected');
    
    // Reset tracking state for new page
    scrollTracked = { '25': false, '50': false, '75': false, '100': false };
    isPageAbandoned = false;
    isUserActive = true;
    pageLoadTime = Date.now();
    
    // Clear any pending abandonment
    if (abandonmentTimeout) {
      clearTimeout(abandonmentTimeout);
      abandonmentTimeout = null;
    }
    
    // Track new page landing
    if (window.Sigme && typeof window.Sigme.track === 'function') {
      trackPageLanding();
    }
  });

  console.log('[Sigme]  Advanced tracking  loaded......');

})();