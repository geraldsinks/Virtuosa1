/**
 * Virtuosa Navigation Bootstrap - v202604081100
 * 
 * Global initialization script. Must load FIRST on every page.
 * Responsibilities:
 *  1. Intercept clicks on internal <a> links → convert to clean URLs
 *  2. Provide window.navigateTo() API (until router.js loads and overrides it)
 *  3. Provide window.onPageReady() for SPA-compatible page init
 *  4. Track loaded scripts to prevent double-loading
 */

(function() {
    'use strict';

    // Prevent double-initialization
    if (window._navigationBootstrapInitialized) {
        return;
    }
    window._navigationBootstrapInitialized = true;

    // =========================================================================
    // 1. GLOBAL SCRIPT REGISTRY
    // =========================================================================

    if (!window.loadedScripts) {
        window.loadedScripts = new Set();
        document.querySelectorAll('script[src]').forEach(function(script) {
            window.loadedScripts.add(script.src);
        });
    }

    // =========================================================================
    // 2. NAVIGATION STATE
    // =========================================================================

    window.navigationState = {
        isReady: false,
        _waiters: [],

        waitForReady: function() {
            if (this.isReady) return Promise.resolve();
            return new Promise(function(resolve) {
                window.navigationState._waiters.push(resolve);
            });
        },

        markReady: function() {
            if (this.isReady) return;
            this.isReady = true;
            this._waiters.forEach(function(resolve) { resolve(); });
            this._waiters = [];
            window.dispatchEvent(new CustomEvent('navigationSystemReady'));
        }
    };

    // =========================================================================
    // 3. CLEAN URL CONVERSION (lightweight version for before router loads)
    // =========================================================================

    /**
     * Quick check if a URL is internal and should be intercepted.
     * The full conversion happens in router.js's toCleanUrl().
     */
    function isInternalNavUrl(href) {
        if (!href || typeof href !== 'string') return false;
        
        // Skip special protocols
        if (href.startsWith('mailto:') || href.startsWith('tel:') ||
            href.startsWith('javascript:') || href.startsWith('data:') ||
            href.startsWith('#')) {
            return false;
        }

        // Skip external URLs
        if (href.startsWith('http://') || href.startsWith('https://')) {
            try {
                return new URL(href).origin === window.location.origin;
            } catch (e) {
                return false;
            }
        }

        // Relative or absolute internal paths
        return true;
    }

    /**
     * Lightweight clean URL conversion for before router.js loads.
     * Router.js provides the full version via window.toCleanUrl().
     */
    function quickCleanUrl(href) {
        // If the full router is loaded, use its converter
        if (window.toCleanUrl) {
            return window.toCleanUrl(href);
        }

        let url = href.trim();

        // Strip ../ and ./
        url = url.replace(/^(\.\.\/)+/, '/').replace(/^\.\//, '/');
        if (!url.startsWith('/')) url = '/' + url;

        // Separate query/hash
        let suffix = '';
        const hashIdx = url.indexOf('#');
        if (hashIdx !== -1) {
            suffix = url.substring(hashIdx);
            url = url.substring(0, hashIdx);
        }
        const queryIdx = url.indexOf('?');
        if (queryIdx !== -1) {
            suffix = url.substring(queryIdx) + suffix;
            url = url.substring(0, queryIdx);
        }

        // /index.html → /
        if (url === '/index.html') return '/' + suffix;

        console.log('🔍 BOOTSTRAP - Normalizing path:', { original: href, url, suffix });

        // /pages/X.html → /X (with special case mapping)
        const pagesMatch = url.match(/^\/pages\/(.+?)\.html$/);
        if (pagesMatch) {
            const name = pagesMatch[1];
            const specialMap = {
                'buyer-dashboard': 'dashboard',
                'admin-dashboard': 'admin',
                'product-detail': 'product',
                'contact-support': 'contact'
            };
            return '/' + (specialMap[name] || name) + suffix;
        }

        // Strip .html from any path
        if (url.endsWith('.html')) {
            url = url.replace(/\.html$/, '');
        }

        return url + suffix;
    }

    // =========================================================================
    // 4. GLOBAL CLICK INTERCEPTION
    // =========================================================================

    function handleNavClick(e) {
        var link = e.target.closest('a');
        if (!link) return;

        var href = link.getAttribute('href');
        if (!href) return;

        // Skip links that shouldn't be intercepted
        if (link.hasAttribute('download') ||
            link.getAttribute('target') === '_blank' ||
            link.getAttribute('data-no-navigate') === 'true') {
            return;
        }

        // Only intercept internal navigation URLs
        if (!isInternalNavUrl(href)) return;

        // Convert to clean URL
        var cleanUrl = quickCleanUrl(href);
        
        // If the clean URL is the same as the current page, do nothing
        var currentPath = window.location.pathname + window.location.search;
        if (cleanUrl === currentPath || cleanUrl === quickCleanUrl(currentPath)) {
            e.preventDefault();
            return;
        }

        // Prevent default and navigate via clean URL (full page reload)
        e.preventDefault();

        // If router is loaded, use it (it handles auth checks, etc.)
        if (window.router && typeof window.router.navigate === 'function') {
            console.log('🚀 BOOTSTRAP - Handoff to router:', cleanUrl);
            window.router.navigate(href);
        } else {
            // Router not yet loaded, navigate directly with clean URL
            console.log('🚀 BOOTSTRAP - Fallback navigation:', cleanUrl);
            window.location.href = cleanUrl;
        }
    }

    // Attach click interception - use capture phase so it fires before
    // any other click handlers on the page
    document.addEventListener('click', handleNavClick, true);

    // =========================================================================
    // 5. EARLY navigateTo() (before router.js loads)
    // =========================================================================

    if (typeof window.navigateTo !== 'function') {
        window.navigateTo = function(url) {
            if (window.router && typeof window.router.navigate === 'function') {
                return window.router.navigate(url);
            }
            // Fallback: convert to clean URL and navigate
            var cleanUrl = quickCleanUrl(url);
            window.location.href = cleanUrl || url;
        };
    }

    // =========================================================================
    // 6. onPageReady() — Works on initial load (replaces DOMContentLoaded)
    // =========================================================================

    /**
     * Register a callback to run when the page is ready.
     * In this hybrid architecture (full page reloads), this is just a
     * DOMContentLoaded wrapper. It's kept for API compatibility so existing
     * page code using window.onPageReady() continues to work.
     */
    window.onPageReady = function(callback) {
        if (typeof callback !== 'function') {
            console.error('onPageReady: callback must be a function');
            return;
        }

        var safeCall = function() {
            try {
                callback();
            } catch (err) {
                console.error('onPageReady callback error:', err);
            }
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', safeCall, { once: true });
        } else {
            // DOM already ready — run on next microtask
            Promise.resolve().then(safeCall);
        }
    };

    // =========================================================================
    // 7. HELPER APIS (for backward compatibility)
    // =========================================================================

    window.getNavigator = function() {
        if (window.NavigationCoordinator && window.NavigationCoordinator.getInstance) {
            return window.NavigationCoordinator.getInstance();
        }
        return null;
    };

    window.isProtectedRoute = function(route) {
        if (window.router && window.router.isProtectedRoute) {
            return window.router.isProtectedRoute(route);
        }
        return false;
    };

    window.getCurrentUrl = function() {
        return window.location.pathname;
    };

    // =========================================================================
    // 8. READY STATE CHECK
    // =========================================================================

    function checkReady() {
        // Router loaded? Mark as ready
        if (window.router && typeof window.router.navigate === 'function') {
            window.navigationState.markReady();
            return true;
        }
        return false;
    }

    // Check periodically until router loads
    var readyAttempts = 0;
    var readyInterval = setInterval(function() {
        readyAttempts++;
        if (checkReady() || readyAttempts >= 50) {
            clearInterval(readyInterval);
            // Even if router didn't load in time, mark ready to unblock waiters
            if (!window.navigationState.isReady) {
                window.navigationState.markReady();
            }
        }
    }, 100);

    // =========================================================================
    // 9. EXPOSE BOOTSTRAP STATUS
    // =========================================================================

    window.navigationBootstrap = {
        version: 'v202604081100',
        isReady: function() { return window.navigationState.isReady; },
        waitForReady: function() { return window.navigationState.waitForReady(); },
        navigateTo: window.navigateTo,
        getNavigator: window.getNavigator,
        isProtectedRoute: window.isProtectedRoute,
        getCurrentUrl: window.getCurrentUrl,
        onPageReady: window.onPageReady
    };

})();
