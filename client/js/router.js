/**
 * Virtuosa Production Router - v202604081000
 * Progressive SPA with unified navigation coordination
 * Single source of truth for routing, navigation, and script management
 */
console.log('Virtuosa Router v202604081000 - Production-grade unified navigation');

// Initialize unified script registry at the earliest stage
if (!window.loadedScripts) {
    window.loadedScripts = new Set();
    // Track all initially loaded scripts
    document.querySelectorAll('script[src]').forEach(script => {
        window.loadedScripts.add(script.src);
    });
}

if (typeof FallbackManager === 'undefined') {
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
                if (userRole === 'seller' && (context.includes('admin') || context.includes('seller'))) {
                    return '/seller-dashboard';
                } else if (userRole === 'admin' && context.includes('admin')) {
                    return '/admin';
                } else if (userRole === 'buyer') {
                    return '/dashboard';
                }
            }
            return this.fallbackRoutes.default;
        }

        async executeFallback(context, options = {}) {
            const {
                userRole = null,
                showMessage = false,
                delay = 1000,
                clearStorage = false
            } = options;

            try {
                // Get the fallback route from the fallbackRoutes map
                const fallbackRoute = this.getFallback(context, userRole);
                
                setTimeout(() => {
                    this.navigate(fallbackRoute);
                }, delay);
            } catch (error) {
                console.error('Fallback execution error:', error);
            }
        }
    }

    class CleanRouter {
        constructor() {
            this.fallbackManager = new FallbackManager(this);
            this.routes = {
                '': '/index.html',
                'login': '/pages/login.html',
                'signup': '/pages/signup.html',
                'products': '/pages/products.html',
                'product': '/product-detail',
                'cart': '/pages/cart.html',
                'orders': '/pages/orders.html',
                'order': '/pages/order-details.html',
                'seller': '/pages/seller.html',
                'seller-shop': '/pages/seller-shop.html',
                'dashboard': '/pages/buyer-dashboard.html',
                'seller-dashboard': '/pages/seller-dashboard.html',
                'admin': '/pages/admin-dashboard.html',
                'messages': '/pages/messages.html',
                'profile': '/pages/profile.html',
                'settings': '/pages/settings.html',
                'verify-email': '/pages/verify-email.html',
                'contact': '/pages/contact-support.html',
                'faq': '/pages/faq.html',
                'reviews': '/pages/reviews.html',
                'create-product': '/pages/create-product.html',
                'edit-product': '/pages/edit-product.html',
                'my-products': '/pages/my-products.html',
                'mobile-money-payment': '/pages/mobile-money-payment.html',
                'cash-on-delivery': '/pages/cash-on-delivery.html',
                'seller-verification': '/pages/seller-verification.html',
                'notifications': '/pages/notifications.html',
                'transactions': '/pages/transactions.html',
                'payment-options': '/pages/payment-options.html',
                'live-chat': '/pages/live-chat.html',
                'terms': '/pages/terms.html',
                'refund-policy': '/pages/refund-policy.html',
                'secure-transactions': '/pages/secure-transactions.html',
                'seller-benefits': '/pages/seller-benefits.html',
                'seller-guide': '/pages/seller-guide.html',
                'admin-users': '/pages/admin-users.html',
                'admin-seller-applications': '/pages/admin-seller-applications.html',
                'admin-account-deletions': '/pages/admin-account-deletions.html',
                'admin-mass-messaging': '/pages/admin-mass-messaging.html',
                'admin-retention': '/pages/admin-retention.html',
                'admin-asset-library': '/pages/admin-asset-library.html',
                'strategic-analytics': '/pages/strategic-analytics.html',
                'admin-cookie-data': '/pages/admin-cookie-data.html',
                'admin-maintenance': '/pages/admin-maintenance.html',
                'admin-transactions': '/pages/admin-transactions.html',
                'admin-disputes': '/pages/admin-disputes.html',
                'admin-support': '/pages/admin-support.html',
                'admin-live-chat': '/pages/admin-live-chat.html',
                'admin-maintenance-reports': '/pages/admin-maintenance-reports.html',
                'admin-ui-queries': '/pages/admin-ui-queries.html',
                'admin-transaction-reports': '/pages/admin-transaction-reports.html',
                'admin-risk-management': '/pages/admin-risk-management.html',
                'admin-analytics-reports': '/pages/admin-analytics-reports.html',
                'admin-growth-metrics': '/pages/admin-growth-metrics.html',
                'admin-about': '/pages/admin-dashboard.html?tab=about',
                'marketing-dashboard': '/pages/marketing-dashboard.html',
                'marketing': '/pages/marketing.html',
                'seller-analytics': '/pages/seller-analytics.html',
                'seller-orders': '/pages/seller-orders.html',
                'order-details': '/pages/order-details.html'
            };

            this.protectedRoutes = [
                'dashboard', 'seller-dashboard', 'admin', 'profile', 'settings',
                'orders', 'order', 'messages', 'notifications', 'transactions',
                'cart', 'checkout', 'create-product', 'edit-product', 'my-products',
                'seller-analytics', 'seller-orders'
            ];

            this.dynamicRoutes = {
                '/product/:id': '/pages/product-detail.html',
                '/order/:id': '/pages/order-details.html',
                '/seller/:shop': '/pages/seller-shop.html',
                '/products/:category': '/pages/products.html'
            };

            this.loadingIndicators = new Set();
            this.pendingRequests = new Map();
            this.redirectHistory = [];
            this.maxRedirectHistory = 10;
            this.errorConfig = {
                showUserErrors: true,
                errorTimeout: 5000,
                maxErrors: 3,
                errorHistory: []
            };
            this.pageCache = new Map();
            this.setupClickInterceptor();
        }

        setupClickInterceptor() {
            // Click interception is now handled by NavigationStateManager
            // This method is kept for compatibility but does nothing
        }

        setupMobileMenuInterception() {
            // Mobile menu interception is now handled by NavigationStateManager
            // This method is kept for compatibility but does nothing
        }

        parseDynamicRoute(path) {
            if (!path || typeof path !== 'string') return null;
            const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
            for (const [pattern, destination] of Object.entries(this.dynamicRoutes)) {
                const patternParts = pattern.startsWith('/') ? pattern.substring(1).split('/') : pattern.split('/');
                const pathParts = normalizedPath.split('/');
                if (patternParts.length !== pathParts.length) continue;
                const params = {};
                let isMatch = true;
                for (let i = 0; i < patternParts.length; i++) {
                    if (patternParts[i].startsWith(':')) {
                        const paramName = patternParts[i].substring(1);
                        params[paramName] = decodeURIComponent(pathParts[i]);
                    } else if (patternParts[i] !== pathParts[i]) {
                        isMatch = false;
                        break;
                    }
                }
                if (isMatch) return { destination, params };
            }
            return null;
        }

        showLoading() {
            this.hideLoading();
            const indicator = document.createElement('div');
            indicator.className = 'router-loading-indicator';
            indicator.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:4px;background:linear-gradient(90deg,#007bff,#28a745);z-index:9999;animation:loading 1s infinite;';
            document.body.appendChild(indicator);
            this.loadingIndicators.add(indicator);
        }

        hideLoading() {
            this.loadingIndicators.forEach(i => i.remove());
            this.loadingIndicators.clear();
        }

        navigate(path, params = {}) {
            // Normalize the path
            let normalizedPath = path;
            if (normalizedPath.startsWith('/')) {
                normalizedPath = normalizedPath.substring(1);
            }
            
            const pageFile = this.routes[normalizedPath] || '/index.html';
            let url = path;
            const queryString = new URLSearchParams(params).toString();
            if (queryString) url += '?' + queryString;
            
            // Normalize URL for history state
            let normalizedUrl = url;
            if (normalizedUrl.startsWith('/')) {
                // Already normalized
            } else {
                normalizedUrl = '/' + normalizedUrl;
            }
            
            // Prevent duplicate history states
            const currentState = history.state;
            if (currentState && currentState.url === normalizedUrl) {
                // Same state, just load the page
                this.loadPage(normalizedPath, params);
                return;
            }
            
            history.pushState({}, '', normalizedUrl);
            this.loadPage(normalizedPath, params);
        }

        async loadPage(path, params = {}) {
            this.showLoading();
            const pathClean = path.split('?')[0].replace(/^\//, '').replace(/\.html$/, '');
            
            // Get coordinator for route checking
            const coordinator = window.NavigationCoordinator?.getInstance?.();
            
            // Check if this is a protected route
            if (coordinator && coordinator.isProtectedRoute(`/${pathClean}`)) {
                // Check authentication
                const token = localStorage.getItem('token');
                if (!token) {
                    console.log('Protected route requires authentication, redirecting to login');
                    this.navigate('/login');
                    this.hideLoading();
                    return;
                }
                
                // Check role-based access if role manager is ready
                if (window.roleManager && window.roleManager.canAccessRoute) {
                    try {
                        const canAccess = await window.roleManager.canAccessRoute(`/${pathClean}`);
                        if (!canAccess) {
                            console.log('Access denied to route:', pathClean);
                            this.navigate('/dashboard');
                            this.hideLoading();
                            return;
                        }
                    } catch (e) {
                        console.warn('Role check failed:', e);
                        // Continue - allow fallback to API permission check
                    }
                }
            }

            try {
                const dynamicMatch = this.parseDynamicRoute(path);
                const pageFile = dynamicMatch ? dynamicMatch.destination : (this.routes[pathClean] || '/index.html');
                const allParams = { ...(dynamicMatch?.params || {}), ...params };
                await this.loadContentDynamically(pageFile, allParams);
            } catch (error) {
                console.error('Load error:', error);
                // Fallback to homepage on load error
                if (path !== '/' && path !== '') {
                    console.log('Falling back to homepage after load error');
                    this.navigate('/');
                }
            } finally {
                this.hideLoading();
            }
        }

        async loadContentDynamically(pageFile, params) {
            const response = await fetch(pageFile);
            const html = await response.text();
            this.renderPageContent(html, pageFile, params);
        }

        renderPageContent(html, pageFile, params) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const newContent = doc.querySelector('main') || doc.body;
            const currentContent = document.querySelector('main') || document.body;
            if (newContent && currentContent) {
                currentContent.innerHTML = newContent.innerHTML;
                window.scrollTo(0, 0);
                
                // Execute scripts and wait for completion
                this.executeScripts(doc).then(() => {
                    // After all scripts loaded, fire pageNavigationReady
                    // This allows inline scripts and listeners to initialize
                    window.dispatchEvent(new CustomEvent('pageNavigationReady', {
                        detail: { pageFile, params, timestamp: Date.now() }
                    }));
                    console.log('🔄 pageNavigationReady event fired for:', pageFile);
                });
            }
        }

        async executeScripts(doc) {
            // Get coordinator for script management
            const coordinator = window.NavigationCoordinator?.getInstance?.();
            
            // Ensure global registry exists
            if (!window.loadedScripts) {
                window.loadedScripts = new Set();
            }

            // Provide a safe fallback for page initialization if the bootstrap helper is not present yet.
            if (typeof window.onPageReady !== 'function') {
                window.onPageReady = function(callback, runImmediately = true) {
                    if (typeof callback !== 'function') {
                        console.error('onPageReady: callback must be a function');
                        return;
                    }

                    if (document.readyState === 'interactive' || document.readyState === 'complete') {
                        if (runImmediately) {
                            Promise.resolve().then(callback);
                        } else {
                            callback();
                        }
                    } else {
                        document.addEventListener('DOMContentLoaded', callback, { once: true });
                    }

                    window.addEventListener('pageNavigationReady', () => {
                        Promise.resolve().then(callback);
                    });
                };
            }

            const scripts = Array.from(doc.querySelectorAll('script'));
            console.log(`Executing ${scripts.length} scripts from new page`);

            // Track promises for external scripts
            const scriptPromises = [];

            scripts.forEach((oldScript, index) => {
                try {
                    const scriptSrc = oldScript.getAttribute('src');

                    if (scriptSrc) {
                        // Check if script is already loaded using coordinator
                        let isAlreadyLoaded = false;
                        
                        if (coordinator) {
                            isAlreadyLoaded = coordinator.isScriptLoaded(scriptSrc);
                        } else {
                            // Fallback check
                            isAlreadyLoaded = window.loadedScripts.has(scriptSrc) || 
                                            document.querySelector(`script[src="${scriptSrc}"]`) !== null;
                        }

                        if (isAlreadyLoaded) {
                            console.log(`Script ${scriptSrc} already loaded, skipping`);
                            return;
                        }
                    }

                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });

                    if (oldScript.innerHTML.trim()) {
                        // Inline scripts - execute immediately
                        newScript.innerHTML = oldScript.innerHTML;
                    } else if (scriptSrc) {
                        // External scripts - track loading with Promise
                        const scriptPromise = new Promise((resolve, reject) => {
                            newScript.onload = () => {
                                // Register as loaded
                                if (coordinator) {
                                    coordinator.registerScriptLoaded(scriptSrc);
                                } else {
                                    window.loadedScripts.add(scriptSrc);
                                }
                                
                                const scriptName = scriptSrc.split('/').pop().split('.')[0] + 'Loaded';
                                window[scriptName] = true;
                                console.log(`✓ External script loaded: ${scriptSrc}`);
                                resolve();
                            };
                            
                            newScript.onerror = (e) => {
                                console.error(`✗ Failed to load script: ${scriptSrc}`, e);
                                resolve(); // Resolve anyway to continue
                            };
                        });
                        scriptPromises.push(scriptPromise);
                    }

                    // Add to document head for better loading order
                    document.head.appendChild(newScript);
                    
                    // Register as loaded immediately if external
                    if (scriptSrc && !oldScript.innerHTML.trim()) {
                        if (coordinator) {
                            coordinator.registerScriptLoaded(scriptSrc);
                        } else {
                            window.loadedScripts.add(scriptSrc);
                        }
                    }
                    
                    console.log(`Added script ${index + 1}/${scripts.length}: ${scriptSrc || 'inline'}`);

                } catch (error) {
                    console.error('Error creating/executing script:', error);
                }
            });

            // Wait for all external scripts to load
            if (scriptPromises.length > 0) {
                await Promise.all(scriptPromises);
            }
            
            // Wait a brief moment for inline scripts to settle
            await new Promise(resolve => setTimeout(resolve, 100));
            console.log('✓ All page scripts loaded and executed');
        }

        init() {
            // Initialize global script tracking registry
            if (!window.loadedScripts) {
                window.loadedScripts = new Set();
            }
            
            // Track all currently loaded scripts
            document.querySelectorAll('script[src]').forEach(script => {
                window.loadedScripts.add(script.src);
            });
            
            const style = document.createElement('style');
            style.textContent = '@keyframes loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }';
            document.head.appendChild(style);
            window.addEventListener('popstate', () => {
                const path = window.location.pathname.substring(1);
                this.loadPage(path);
            });
        }
    }

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        if (!window.router) {
            window.router = new CleanRouter();
            window.router.init();
        }
    });
}