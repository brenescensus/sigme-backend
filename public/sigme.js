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