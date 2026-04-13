/**
 * Navigation Coordinator - v202604081100
 * Single source of truth for route definitions and script tracking.
 * 
 * In the hybrid architecture, this provides:
 *  - Route table lookup (used by router.js and other scripts)
 *  - Script registry (prevents double-loading of external scripts)
 *  - URL normalization
 *  - Protected route checking
 * 
 * It does NOT handle navigation itself — that's the router's job.
 */

(function() {
    'use strict';

    // Prevent duplicate initialization
    if (window.NavigationCoordinator) {
        return;
    }

    class NavigationCoordinator {
        constructor() {
            this.isInitialized = false;
            this.currentUrl = window.location.pathname;
            
            // URL normalization cache
            this.urlCache = new Map();
            
            // Route definitions
            this.routes = this._getBaseRoutes();
            
            // Script tracking (synced with global registry)
            this.loadedScripts = new Set();
            this._syncScriptRegistry();
        }

        /**
         * Base routes — single source of truth for route → file mapping.
         * This mirrors the route table in router.js. Both must stay in sync.
         */
        _getBaseRoutes() {
            return {
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
                'cash-on-delivery':         '/pages/cash-on-delivery.html',
                'seller-verification':      '/pages/seller-verification.html',
                'notifications':            '/pages/notifications.html',
                'transactions':             '/pages/transactions.html',
                'payment-options':          '/pages/payment-options.html',
                'live-chat':                '/pages/live-chat.html',
                'admin-users':              '/pages/admin-users.html',
                'admin-seller-applications':'/pages/admin-seller-applications.html',
                'admin-mass-messaging':     '/pages/admin-mass-messaging.html',
                'marketing-dashboard':      '/pages/marketing-dashboard.html',
                'marketing':                '/pages/marketing.html',
                'seller-analytics':         '/pages/seller-analytics.html',
                'seller-orders':            '/pages/seller-orders.html',
                'wishlist':                 '/pages/wishlist.html'
            };
        }

        /**
         * Sync local script registry with global window.loadedScripts
         */
        _syncScriptRegistry() {
            if (!window.loadedScripts) {
                window.loadedScripts = new Set();
                document.querySelectorAll('script[src]').forEach(function(script) {
                    window.loadedScripts.add(script.src);
                });
            }
            
            var self = this;
            window.loadedScripts.forEach(function(src) {
                self.loadedScripts.add(src);
            });
        }

        /**
         * Normalize a URL for consistent comparison
         */
        normalizeUrl(url) {
            if (!url || typeof url !== 'string') return '/';
            
            if (this.urlCache.has(url)) {
                return this.urlCache.get(url);
            }

            var normalized = url.trim();

            // Strip to pathname only for internal URLs
            try {
                if (normalized.startsWith('http')) {
                    var urlObj = new URL(normalized);
                    if (urlObj.origin !== window.location.origin) {
                        this.urlCache.set(url, url);
                        return url;
                    }
                    normalized = urlObj.pathname;
                }
            } catch (e) {
                // Continue with basic normalization
            }
            
            // Remove trailing slash (except root)
            if (normalized !== '/' && normalized.endsWith('/')) {
                normalized = normalized.slice(0, -1);
            }
            
            // Ensure leading slash
            if (!normalized.startsWith('/')) {
                normalized = '/' + normalized;
            }

            this.urlCache.set(url, normalized);
            return normalized;
        }

        /**
         * Get the HTML file for a given route
         */
        getPageFile(route) {
            var routeKey = (route || '').replace(/^\//, '').split('?')[0];
            return this.routes[routeKey] || this.routes[''];
        }

        /**
         * Check if a script is already loaded
         */
        isScriptLoaded(scriptSrc) {
            if (!scriptSrc) return false;

            // Check exact match first
            if (this.loadedScripts.has(scriptSrc)) return true;
            if (window.loadedScripts && window.loadedScripts.has(scriptSrc)) return true;

            // Check via absolute URL comparison
            try {
                var absoluteUrl = new URL(scriptSrc, window.location.origin).href;
                if (this.loadedScripts.has(absoluteUrl)) return true;
                if (window.loadedScripts && window.loadedScripts.has(absoluteUrl)) return true;
            } catch (e) {
                // Ignore
            }

            // Check if script tag exists in DOM
            return document.querySelector('script[src="' + scriptSrc + '"]') !== null;
        }

        /**
         * Register a script as loaded
         */
        registerScriptLoaded(scriptSrc) {
            if (!scriptSrc) return;
            
            this.loadedScripts.add(scriptSrc);
            if (window.loadedScripts) {
                window.loadedScripts.add(scriptSrc);
            }

            try {
                var absoluteUrl = new URL(scriptSrc, window.location.origin).href;
                this.loadedScripts.add(absoluteUrl);
                if (window.loadedScripts) {
                    window.loadedScripts.add(absoluteUrl);
                }
            } catch (e) {
                // Ignore
            }
        }

        /**
         * Protected routes that require authentication
         */
        getProtectedRoutes() {
            return [
                'dashboard', 'seller-dashboard', 'admin', 'profile', 'settings',
                'orders', 'order', 'messages', 'notifications', 'transactions',
                'cart', 'checkout', 'create-product', 'edit-product', 'my-products',
                'seller-analytics', 'seller-orders', 'wishlist'
            ];
        }

        /**
         * Check if a route is protected
         */
        isProtectedRoute(route) {
            var routeKey = (route || '').replace(/^\//, '').split('?')[0];
            return this.getProtectedRoutes().indexOf(routeKey) !== -1;
        }

        /**
         * Initialize the coordinator
         */
        init() {
            if (this.isInitialized) return;
            this._syncScriptRegistry();
            this.currentUrl = this.normalizeUrl(window.location.pathname);
            this.isInitialized = true;
            window.dispatchEvent(new CustomEvent('navigationCoordinatorReady'));
        }

        /**
         * Singleton access
         */
        static getInstance() {
            if (!window._navigationCoordinatorInstance) {
                window._navigationCoordinatorInstance = new NavigationCoordinator();
            }
            return window._navigationCoordinatorInstance;
        }

        static initialize() {
            var instance = NavigationCoordinator.getInstance();
            instance.init();
            return instance;
        }
    }

    // Export globally
    window.NavigationCoordinator = NavigationCoordinator;

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            NavigationCoordinator.initialize();
        }, { once: true });
    } else {
        NavigationCoordinator.initialize();
    }

})();