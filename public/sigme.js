
// ============================================
// FILE: public/sigme.js
// Universal Client Script (NO MODULES)
// ============================================

(function () {
  'use strict';

  console.log('[Sigme] Universal script loading...');

  // =====================================================
  // CONFIGURATION (IMPORTANT)
  // =====================================================
  // You can inject this from HTML:
  // window.SIGME_API_URL = "https://your-backend.com";
  // <script src="https://cdn.yoursite.com/sigme.js"></script>
  const API_BASE_URL =
    window.SIGME_API_URL || 'http://localhost:3000';

  const SIGME_API = API_BASE_URL;
  const SW_PATH = '/sigme-universal-sw.js';

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
      if (!config) return;

      console.log('[Sigme] Registering service worker...');
      const registration = await navigator.serviceWorker.register(SW_PATH);
      await navigator.serviceWorker.ready;

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
        console.log('[Sigme] Notifications denied');
      }
    } catch (err) {
      console.error('[Sigme] Initialization failed:', err);
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
        max-width: 400px;
        background: white;
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        padding: 20px;
        z-index: 999999;
        font-family: ${branding.font_family || 'system-ui'};
        border-top: 4px solid ${branding.primary_color || '#3b82f6'};
      ">
        <div style="display:flex;gap:12px;">
          ${branding.logo_url ? `<img src="${branding.logo_url}" style="width:48px;height:48px;border-radius:8px;">` : ''}
          <div style="flex:1">
            <h3 style="margin:0 0 6px 0;">Get notifications from ${config.websiteName}</h3>
            <p style="margin:0 0 12px 0;font-size:14px;color:#666;">
              Stay updated with the latest news and offers
            </p>
            <button id="sigme-allow" style="padding:10px 16px;background:${branding.primary_color || '#3b82f6'};color:white;border:none;border-radius:8px;cursor:pointer;">
              Allow
            </button>
            <button id="sigme-deny" style="padding:10px 16px;margin-left:8px;">Not Now</button>
          </div>
        </div>
      </div>
    `;

    const div = document.createElement('div');
    div.innerHTML = promptHtml;
    document.body.appendChild(div);

    document.getElementById('sigme-allow').onclick = async () => {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') subscribeUser(registration);
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
      registration.active.postMessage({ type: 'SIGME_SUBSCRIBE' });
    }
  }

  // =====================================================
  // SERVICE WORKER MESSAGES
  // =====================================================
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'SIGME_SUBSCRIBED') {
      event.data.success
        ? console.log('[Sigme] Subscribed!')
        : console.warn('[Sigme] Subscription failed:', event.data.error);
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
      position:fixed;
      top:20px;right:20px;
      background:white;
      padding:16px;
      border-radius:12px;
      box-shadow:0 10px 40px rgba(0,0,0,.2);
      z-index:999999;
      cursor:pointer;
    `;
    div.innerHTML = `<strong>${notification.title}</strong><p>${notification.body}</p>`;
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
})();
