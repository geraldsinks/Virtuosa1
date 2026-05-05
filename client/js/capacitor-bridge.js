/**
 * Virtuosa — Mobile Capacitor Bridge Script
 * 
 * Add this to your web app's HTML pages (client/index.html and key pages)
 * BEFORE your other scripts. It detects when running inside the Capacitor
 * native wrapper and applies mobile-appropriate behaviour.
 * 
 * Deployment: This file should be added to client/js/capacitor-bridge.js
 * and referenced in index.html + key page templates.
 */

(function () {
  'use strict';

  // ─── Detect Capacitor Environment ──────────────────────────────────────────
  const isCapacitor = !!(window.Capacitor) ||
    /VirtuosaApp\//.test(navigator.userAgent);

  const isAndroid = isCapacitor && /Android/.test(navigator.userAgent);
  const isIOS = isCapacitor && /iOS/.test(navigator.userAgent);

  if (!isCapacitor) return; // Not running in the native wrapper — do nothing

  // Add marker class to <html> for CSS targeting
  document.documentElement.classList.add('is-native-app');
  if (isAndroid) document.documentElement.classList.add('is-android');
  if (isIOS) document.documentElement.classList.add('is-ios');

  // ─── Expose global flag for other scripts ──────────────────────────────────
  window.VIRTUOSA_IS_APP = true;
  window.VIRTUOSA_PLATFORM = isAndroid ? 'android' : isIOS ? 'ios' : 'native';

  // ─── Apply mobile CSS overrides ────────────────────────────────────────────
  const style = document.createElement('style');
  style.id = 'capacitor-mobile-overrides';
  style.textContent = `
    /* ── GLOBAL APP RESETS ── */
    html.is-native-app body {
      /* Prevent rubber-band / over-scroll bounce (iOS & Android) */
      overscroll-behavior: none;
      -webkit-overflow-scrolling: touch;
    }

    /* Disable text selection on non-editable UI elements */
    html.is-native-app *:not(input):not(textarea):not([contenteditable]) {
      -webkit-user-select: none;
      user-select: none;
    }

    /* Disable long-press context menu on images and links */
    html.is-native-app img,
    html.is-native-app a {
      -webkit-touch-callout: none;
    }

    /* Remove the blue tap flash on touch */
    html.is-native-app * {
      -webkit-tap-highlight-color: transparent;
    }

    /* Prevent pinch-to-zoom from jarring the UI
       (viewport meta handles this too, but belt-and-suspenders) */
    html.is-native-app {
      touch-action: pan-x pan-y;
    }
    html.is-native-app input,
    html.is-native-app textarea {
      touch-action: auto; /* Allow zoom on inputs for accessibility */
    }

    /* ── iOS SPECIFIC ── */

    /* Safe area insets — ensures content isn't hidden under the notch,
       Dynamic Island, or home indicator */
    html.is-ios body {
      padding-top: env(safe-area-inset-top);
      padding-bottom: env(safe-area-inset-bottom);
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }

    /* Fix the iOS "sticky hover" bug — CSS :hover states get stuck after tap */
    @media (hover: none) {
      html.is-ios a:hover,
      html.is-ios button:hover {
        /* Reset hover styles inherited from desktop */
        background: revert;
        color: revert;
        transform: none;
        box-shadow: none;
      }
    }

    /* iOS: Prevent white flash on dark-themed pages */
    html.is-ios {
      background-color: #0A1128;
    }

    /* ── ANDROID SPECIFIC ── */

    /* Android: Add bottom nav safe area for gesture navigation bar */
    html.is-android body {
      padding-bottom: env(safe-area-inset-bottom, 16px);
    }

    /* Fix font rendering on Android WebView */
    html.is-android body {
      -webkit-font-smoothing: antialiased;
      text-rendering: optimizeLegibility;
    }

    /* ── NATIVE APP LAYOUT TWEAKS ── */

    /* Hide elements that only make sense on the web (browser install prompt etc.) */
    html.is-native-app .pwa-install-banner,
    html.is-native-app .browser-only {
      display: none !important;
    }

    /* Ensure modals / bottom-sheets sit above the OS navigation bar */
    html.is-native-app .modal-overlay,
    html.is-native-app .bottom-sheet {
      padding-bottom: calc(env(safe-area-inset-bottom) + 1rem);
    }
  `;

  // Insert as the first child of <head> so it can be overridden by page styles
  document.head.insertBefore(style, document.head.firstChild);

  // ─── Status Bar ────────────────────────────────────────────────────────────
  // Set dark status bar to match Virtuosa's navy header
  if (window.Capacitor?.Plugins?.StatusBar) {
    window.Capacitor.Plugins.StatusBar.setStyle({ style: 'DARK' });
    window.Capacitor.Plugins.StatusBar.setBackgroundColor({ color: '#0A1128' });
  }

  // ─── Hardware Back Button (Android) ────────────────────────────────────────
  if (isAndroid && window.Capacitor?.Plugins?.App) {
    window.Capacitor.Plugins.App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        // Exit the app if there's no history (mimic native behaviour)
        window.Capacitor.Plugins.App.exitApp();
      }
    });
  }

  // ─── Network Detection ─────────────────────────────────────────────────────
  // Show a native-feeling offline toast when connection is lost
  if (window.Capacitor?.Plugins?.Network) {
    window.Capacitor.Plugins.Network.addListener('networkStatusChange', (status) => {
      if (!status.connected) {
        showNativeToast('No internet connection', 'warning');
      }
    });
  }

  // ─── Simple toast helper ───────────────────────────────────────────────────
  function showNativeToast(message, type = 'info') {
    const existing = document.getElementById('cap-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'cap-toast';
    const colors = { info: '#1a2e5e', warning: '#7c3a1e', success: '#1a3e2a' };
    toast.style.cssText = `
      position: fixed;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 80px);
      left: 50%;
      transform: translateX(-50%);
      background: ${colors[type] || colors.info};
      color: #fff;
      padding: 0.65rem 1.4rem;
      border-radius: 50px;
      font-size: 0.85rem;
      font-weight: 500;
      z-index: 999999;
      white-space: nowrap;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      transition: opacity 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  console.log('[Virtuosa App] Capacitor bridge loaded. Platform:', window.VIRTUOSA_PLATFORM);
})();
