/**
 * Virtuosa Production Router - v202604081100
 * Hybrid navigation: clean URLs + full page reloads
 * 
 * WHY FULL RELOADS: Each page is a standalone HTML document with its own
 * <head>, styles, body classes, fonts, and inline scripts. SPA-loading between
 * them causes: (1) let/const redeclaration crashes, (2) lost page styles,
 * (3) zombie event listeners, (4) broken inline script initialization.
 * 
 * Full reloads with clean URLs (handled by Vercel rewrites) give reliable
 * navigation with zero script conflicts. Vercel's CDN + browser caching
 * makes reloads fast (~100-200ms for cached pages).
 */

(function() {
    'use strict';

    // Prevent double-initialization (script may be included in <head> and also
    // dynamically loaded by navigation-bootstrap.js)
    if (window._virtuosaRouterInitialized) {
        return;
    }
    window._virtuosaRouterInitialized = true;

    console.log('Virtuosa Router v202604081100 - Hybrid navigation (clean URLs + full reload)');

    // =========================================================================
    // ROUTE TABLE — Single source of truth
    // Maps clean route keys to actual HTML file paths.
    // Vercel rewrites also map these, but the router needs them for:
    //   (1) Converting old /pages/*.html links to clean URLs
    //   (2) Knowing which routes are protected
    //   (3) Resolving dynamic route patterns
    // =========================================================================

    const ROUTES = {
        '':                         '/index.html',
        'login':                    '/pages/login.html',
        'signup':                   '/pages/signup.html',
        'products':                 '/pages/products.html',
        'product':                  '/pages/product-detail.html',
        'cart':                     '/pages/cart.html',
        'orders':                   '/pages/orders.html',
        'order':                    '/pages/order-details.html',
        'seller':                   '/pages/seller.html',
        'seller-shop':              '/pages/seller-shop.html',
        'dashboard':                '/pages/buyer-dashboard.html',
        'seller-dashboard':         '/pages/seller-dashboard.html',
        'admin':                    '/pages/admin-dashboard.html',
        'messages':                 '/pages/messages.html',
        'profile':                  '/pages/profile.html',
        'settings':                 '/pages/settings.html',
        'verify-email':             '/pages/verify-email.html',
        'contact':                  '/pages/contact-support.html',
        'faq':                      '/pages/faq.html',
        'reviews':                  '/pages/reviews.html',
        'create-product':           '/pages/create-product.html',
        'edit-product':             '/pages/edit-product.html',
        'my-products':              '/pages/my-products.html',
        'mobile-money-payment':     '/pages/mobile-money-payment.html',
        'cash-on-delivery':         '/pages/cash-on-delivery.html',
        'seller-verification':      '/pages/seller-verification.html',
        'notifications':            '/pages/notifications.html',
        'transactions':             '/pages/transactions.html',
        'payment-options':          '/pages/payment-options.html',
        'live-chat':                '/pages/live-chat.html',
        'terms':                    '/pages/terms.html',
        'refund-policy':            '/pages/refund-policy.html',
        'secure-transactions':      '/pages/secure-transactions.html',
        'seller-benefits':          '/pages/seller-benefits.html',
        'seller-guide':             '/pages/seller-guide.html',
        'admin-users':              '/pages/admin-users.html',
        'admin-seller-applications':'/pages/admin-seller-applications.html',
        'admin-account-deletions':  '/pages/admin-account-deletions.html',
        'admin-mass-messaging':     '/pages/admin-mass-messaging.html',
        'admin-retention':          '/pages/admin-retention.html',
        'admin-asset-library':      '/pages/admin-asset-library.html',
        'strategic-analytics':      '/pages/strategic-analytics.html',
        'admin-cookie-data':        '/pages/admin-cookie-data.html',
        'admin-maintenance':        '/pages/admin-maintenance.html',
        'admin-transactions':       '/pages/admin-transactions.html',
        'admin-disputes':           '/pages/admin-disputes.html',
        'admin-support':            '/pages/admin-support.html',
        'admin-live-chat':          '/pages/admin-live-chat.html',
        'admin-test-dashboard':     '/pages/admin-test-dashboard.html',
        'admin-maintenance-reports':'/pages/admin-maintenance-reports.html',
        'admin-ui-queries':         '/pages/admin-ui-queries.html',
        'admin-transaction-reports':'/pages/admin-transaction-reports.html',
        'admin-risk-management':    '/pages/admin-risk-management.html',
        'admin-analytics-reports':  '/pages/admin-analytics-reports.html',
        'admin-growth-metrics':     '/pages/admin-growth-metrics.html',
        'marketing-dashboard':      '/pages/marketing-dashboard.html',
        'marketing':                '/pages/marketing.html',
        'seller-analytics':         '/pages/seller-analytics.html',
        'seller-orders':            '/pages/seller-orders.html',
        'order-details':            '/pages/order-details.html',
        'about':                    '/pages/about.html',
        'privacy':                  '/pages/privacy.html',
        'wishlist':                 '/pages/wishlist.html'
    };

    // Reverse map: file path → clean route (built once, used for URL conversion)
    const FILE_TO_ROUTE = {};
    for (const [route, file] of Object.entries(ROUTES)) {
        FILE_TO_ROUTE[file] = '/' + route;
    }

    // Dynamic route patterns (e.g. /product/abc123)
    const DYNAMIC_PATTERNS = [
        { pattern: /^\/product\/([^/?]+)/, route: 'product', param: 'id' },
        { pattern: /^\/order\/([^/?]+)/,   route: 'order',   param: 'id' },
        { pattern: /^\/seller\/([^/?]+)/,  route: 'seller-shop', param: 'shop' },
        { pattern: /^\/products\/([^/?]+)/,route: 'products', param: 'category' }
    ];

    const PROTECTED_ROUTES = new Set([
        'dashboard', 'seller-dashboard', 'admin', 'profile', 'settings',
        'orders', 'order', 'messages', 'notifications', 'transactions',
        'cart', 'checkout', 'create-product', 'edit-product', 'my-products',
        'seller-analytics', 'seller-orders', 'order-details'
    ]);

    // =========================================================================
    // URL CONVERSION — Convert any URL format to a clean URL
    // =========================================================================

    /**
     * Convert any internal URL to its clean form.
     * Examples:
     *   /pages/login.html        → /login
     *   /pages/products.html     → /products
     *   /index.html              → /
     *   ../pages/cart.html       → /cart
     *   /login                   → /login  (already clean)
     *   /product/abc123          → /product/abc123 (dynamic, keep as-is)
     *   https://external.com/... → null (external URL, don't convert)
     */
    function toCleanUrl(rawUrl) {
        if (!rawUrl || typeof rawUrl !== 'string') return '/';

        let url = rawUrl.trim();

        // Skip external URLs, mailto, tel, hash-only, javascript
        if (url.startsWith('http://') || url.startsWith('https://')) {
            try {
                const parsed = new URL(url);
                if (parsed.origin !== window.location.origin) {
                    return null; // External — don't handle
                }
                url = parsed.pathname + parsed.search + parsed.hash;
            } catch (e) {
                return null;
            }
        }

        if (url.startsWith('mailto:') || url.startsWith('tel:') ||
            url.startsWith('javascript:') || url.startsWith('data:') ||
            url === '#') {
            return null;
        }

        // Strip leading ../ or ./ for relative paths
        url = url.replace(/^(\.\.\/)+/, '/').replace(/^\.\//, '/');

        // Ensure leading slash
        if (!url.startsWith('/')) {
            url = '/' + url;
        }

        // Separate path, query, and hash
        let hash = '';
        let query = '';
        const hashIdx = url.indexOf('#');
        if (hashIdx !== -1) {
            hash = url.substring(hashIdx);
            url = url.substring(0, hashIdx);
        }
        const queryIdx = url.indexOf('?');
        if (queryIdx !== -1) {
            query = url.substring(queryIdx);
            url = url.substring(0, queryIdx);
        }

        // Check if this is a known file path → convert to clean route
        if (FILE_TO_ROUTE[url]) {
            return FILE_TO_ROUTE[url] + query + hash;
        }

        // Handle /pages/X.html format
        const pagesMatch = url.match(/^\/pages\/(.+?)\.html$/);
        if (pagesMatch) {
            const pageName = pagesMatch[1];
            // Check if there's a clean route for this page name
            if (ROUTES[pageName] !== undefined) {
                return '/' + pageName + query + hash;
            }
            // Special cases where page filename differs from route
            const fileNameMap = {
                'buyer-dashboard': 'dashboard',
                'admin-dashboard': 'admin',
                'product-detail': 'product',
                'contact-support': 'contact'
            };
            if (fileNameMap[pageName]) {
                return '/' + fileNameMap[pageName] + query + hash;
            }
            // Fallback: use the page name as the route
            return '/' + pageName + query + hash;
        }

        // Handle /index.html
        if (url === '/index.html') {
            return '/' + query + hash;
        }

        // Handle .html extension on any path
        if (url.endsWith('.html')) {
            url = url.replace(/\.html$/, '');
        }

        // Already a clean URL
        return url + query + hash;
    }

    // =========================================================================
    // ROUTER CLASS
    // =========================================================================

    class CleanRouter {
        constructor() {
            this.routes = ROUTES;
            this.dynamicRoutes = {
                '/product/:id':      '/pages/product-detail.html',
                '/order/:id':        '/pages/order-details.html',
                '/seller/:shop':     '/pages/seller-shop.html',
                '/products/:category': '/pages/products.html'
            };
            this.protectedRoutes = [...PROTECTED_ROUTES];
        }

        /**
         * Navigate to a URL. Converts to clean URL and does a full page load.
         * @param {string} path - Any URL format (clean, file path, relative)
         * @param {object} params - Optional query parameters
         */
        navigate(path, params = {}) {
            if (!path && path !== '') return;

            let cleanUrl = toCleanUrl(path);

            // External URL or special protocol — use direct navigation
            if (cleanUrl === null) {
                window.location.href = path;
                return;
            }

            // Add query params if provided
            if (params && Object.keys(params).length > 0) {
                const separator = cleanUrl.includes('?') ? '&' : '?';
                const queryString = new URLSearchParams(params).toString();
                cleanUrl += separator + queryString;
            }

            // Check if protected route needs auth
            const routeKey = cleanUrl.replace(/^\//, '').split('?')[0].split('/')[0];
            if (PROTECTED_ROUTES.has(routeKey)) {
                const token = localStorage.getItem('token');
                if (!token) {
                    console.log('Protected route requires auth, redirecting to login');
                    window.location.href = '/login';
                    return;
                }
            }

            // If we're already on this exact URL, don't navigate
            const currentClean = toCleanUrl(window.location.pathname + window.location.search);
            if (cleanUrl === currentClean) {
                console.log('Already on this page:', cleanUrl);
                return;
            }

            console.log('🔀 Navigating to:', cleanUrl);
            
            // Full page reload via clean URL
            // Vercel rewrites will serve the correct HTML file
            window.location.href = cleanUrl;
        }

        /**
         * Parse a dynamic route and extract parameters
         */
        parseDynamicRoute(path) {
            if (!path || typeof path !== 'string') return null;

            for (const { pattern, route, param } of DYNAMIC_PATTERNS) {
                const match = path.match(pattern);
                if (match) {
                    return {
                        destination: ROUTES[route],
                        params: { [param]: decodeURIComponent(match[1]) }
                    };
                }
            }
            return null;
        }

        /**
         * Check if a route is protected
         */
        isProtectedRoute(route) {
            const routeKey = (route || '').replace(/^\//, '').split('?')[0];
            return PROTECTED_ROUTES.has(routeKey);
        }

        /**
         * Get the file path for a clean route
         */
        getPageFile(route) {
            const routeKey = (route || '').replace(/^\//, '').split('?')[0];
            return ROUTES[routeKey] || ROUTES[''];
        }
    }

    // =========================================================================
    // FALLBACK MANAGER (kept for API compatibility)
    // =========================================================================

    class FallbackManager {
        constructor(router) {
            this.router = router;
            this.fallbackRoutes = {
                'auth': '/login',
                'session-expired': '/login',
                'unauthorized': '/login',
                'forbidden': '/login',
                'seller-required': '/seller-verification',
                'admin-required': '/admin',
                'buyer-required': '/dashboard',
                'not-found': '/',
                'server-error': '/',
                'network-error': '/',
                'cart-empty': '/products',
                'checkout-error': '/cart',
                'payment-error': '/cart',
                'default': '/'
            };
        }

        getFallback(context, userRole = null) {
            if (this.fallbackRoutes[context]) {
                return this.fallbackRoutes[context];
            }
            if (userRole) {
                if (userRole === 'seller') return '/seller-dashboard';
                if (userRole === 'admin') return '/admin';
                if (userRole === 'buyer') return '/dashboard';
            }
            return this.fallbackRoutes.default;
        }

        async executeFallback(context, options = {}) {
            const { userRole = null, delay = 1000 } = options;
            const fallbackRoute = this.getFallback(context, userRole);
            setTimeout(() => {
                window.location.href = fallbackRoute;
            }, delay);
        }
    }

    // =========================================================================
    // INITIALIZATION
    // =========================================================================

    const router = new CleanRouter();
    router.fallbackManager = new FallbackManager(router);

    // Expose globally
    window.router = router;

    // Expose navigateTo as a simple function (overrides bootstrap's version)
    window.navigateTo = function(url, params) {
        return router.navigate(url, params);
    };

    // Expose utility for other scripts
    window.toCleanUrl = toCleanUrl;

    // Mark navigation system as ready
    if (window.navigationState && typeof window.navigationState.markReady === 'function') {
        window.navigationState.markReady();
    }

    // Fire ready event for any listeners
    window.dispatchEvent(new CustomEvent('routerReady'));

    console.log('✓ Router initialized with', Object.keys(ROUTES).length, 'routes');

})();