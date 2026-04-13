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
            window.virtuosaUpdateAvailable = true;
            showUpdateBanner(registration);
          }
        });
      });

      // If the SW is already waiting when the page loads, show the banner
      if (registration.waiting) {
        window.virtuosaUpdateAvailable = true;
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
   * Show a premium update banner and dispatch event for header badge
   */
  function showUpdateBanner(registration) {
    // Dispatch global event so the header can show a subtle badge
    window.dispatchEvent(new CustomEvent('virtuosaUpdateAvailable'));
    
    // Avoid duplicate banners
    if (document.getElementById('pwa-update-banner')) return;

    // If the user already dismissed it this session, don't show the full banner again
    if (sessionStorage.getItem('pwa-update-dismissed')) return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    // Create banner container
    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.setAttribute('role', 'alert');
    
    // Premium styling with Standalone/iPhone Safe Area support
    banner.style.cssText = `
      position: fixed;
      bottom: ${isStandalone ? '2rem' : '1.5rem'};
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #0A1128 0%, #1a2332 100%);
      color: #fff;
      padding: 1rem 1.75rem;
      border-radius: 16px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,215,0,0.3);
      z-index: 100000;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      font-family: 'Montserrat', sans-serif;
      font-size: 0.9rem;
      max-width: 95vw;
      width: max-content;
      animation: pwa-slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
      backdrop-filter: blur(8px);
    `;

    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <div style="background: rgba(255,215,0,0.1); width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </div>
        <div style="display: flex; flex-direction: column;">
          <span style="font-weight: 700; color: #FFD700; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">Update Available</span>
          <span style="color: #e5e7eb; font-weight: 500;">New version of Virtuosa is ready.</span>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 0.5rem;">
        <button id="pwa-update-btn" style="
          background: linear-gradient(135deg, #FFD700, #C19A6B);
          color: #0A1128;
          border: none;
          padding: 0.6rem 1.25rem;
          border-radius: 10px;
          font-weight: 800;
          font-size: 0.8rem;
          cursor: pointer;
          white-space: nowrap;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          transition: transform 0.2s, box-shadow 0.2s;
          box-shadow: 0 4px 12px rgba(255,215,0,0.2);
        ">Reload Now</button>
        <button id="pwa-dismiss-btn" style="
          background: rgba(255,255,255,0.05);
          border: none;
          color: #9ca3af;
          cursor: pointer;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        " aria-label="Dismiss">&times;</button>
      </div>
    `;

    // Add style for animation if not present
    if (!document.getElementById('pwa-update-styles')) {
      const style = document.createElement('style');
      style.id = 'pwa-update-styles';
      style.textContent = `
        @keyframes pwa-slide-up {
          from { transform: translateX(-50%) translateY(120%); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        #pwa-update-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(255,215,0,0.3); }
        #pwa-update-btn:active { transform: translateY(0); }
        #pwa-dismiss-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(banner);

    document.getElementById('pwa-update-btn').addEventListener('click', () => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      } else {
        // Fallback for edge cases
        window.location.reload();
      }
      banner.remove();
    });

    document.getElementById('pwa-dismiss-btn').addEventListener('click', () => {
      // Remember dismissal for this session to avoid annoying the user on every navigation
      sessionStorage.setItem('pwa-update-dismissed', 'true');
      banner.remove();
    });
  }
})();
