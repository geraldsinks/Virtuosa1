/**
 * Virtuosa PWA Registration
 * 
 * Registers the service worker globally on every page,
 * independent of authentication status.
 * Handles SW updates with a user-facing reload prompt.
 */
(function () {
  'use strict';

  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const swUrl = '/sw.js?apiBase=' + encodeURIComponent(window.API_BASE || '');
      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: '/'
      });

      console.log('[PWA] Service Worker registered with scope:', registration.scope);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          // New SW is installed and waiting — prompt user to reload
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateBanner(registration);
          }
        });
      });

      // If the SW is already waiting when the page loads, show the banner
      if (registration.waiting) {
        showUpdateBanner(registration);
      }

      // Check for updates every 60 minutes
      setInterval(() => {
        registration.update().catch(() => { /* ignore update errors */ });
      }, 60 * 60 * 1000);

    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  });

  // Reload the page when the new SW takes control
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });

  /**
   * Show a non-intrusive banner prompting the user to reload for the update.
   */
  function showUpdateBanner(registration) {
    // Avoid duplicate banners
    if (document.getElementById('pwa-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.setAttribute('role', 'alert');
    banner.style.cssText = `
      position: fixed;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #0A1128, #1a2332);
      color: #fff;
      padding: 0.875rem 1.5rem;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,215,0,0.15);
      z-index: 100000;
      display: flex;
      align-items: center;
      gap: 1rem;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.875rem;
      max-width: 90vw;
      animation: pwa-slide-up 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    `;

    banner.innerHTML = `
      <span style="flex:1">A new version of Virtuosa is available.</span>
      <button id="pwa-update-btn" style="
        background: linear-gradient(135deg, #FFD700, #C19A6B);
        color: #0A1128;
        border: none;
        padding: 0.5rem 1.25rem;
        border-radius: 8px;
        font-weight: 700;
        font-size: 0.8rem;
        cursor: pointer;
        white-space: nowrap;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        transition: transform 0.2s, box-shadow 0.2s;
      ">Update</button>
      <button id="pwa-dismiss-btn" style="
        background: none;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        font-size: 1.25rem;
        padding: 0.25rem;
        line-height: 1;
      " aria-label="Dismiss">&times;</button>
    `;

    // Add slide-up animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pwa-slide-up {
        from { transform: translateX(-50%) translateY(100%); opacity: 0; }
        to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(banner);

    document.getElementById('pwa-update-btn').addEventListener('click', () => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      banner.remove();
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      banner.remove();
    });
  }
})();
