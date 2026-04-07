// Standardized fallback behavior system
console.log('Virtuosa Router v202604071953 - Enhanced script handling for SPA');

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
                setTimeout(() => {
                    this.router.navigate(fallbackRoute);
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
            document.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (!link) return;
                const href = link.getAttribute('href');
                if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) return;
                if (link.hasAttribute('download') || link.getAttribute('target') === '_blank') return;
                e.preventDefault();
                this.navigate(href);
            });
        }

        setupMobileMenuInterception() {
            const mobileMenuContent = document.getElementById('mobile-menu-content');
            if (!mobileMenuContent) return;
            const newMobileMenuContent = mobileMenuContent.cloneNode(true);
            mobileMenuContent.parentNode.replaceChild(newMobileMenuContent, mobileMenuContent);
            newMobileMenuContent.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (!link) return;
                const href = link.getAttribute('href');
                if (!href || href.startsWith('http') || href.startsWith('#')) return;
                newMobileMenuContent.classList.add('-translate-x-full');
                const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
                if (mobileMenuOverlay) mobileMenuOverlay.classList.add('hidden');
                e.preventDefault();
                this.navigate(href);
            });
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
            const pageFile = this.routes[path.replace(/^\//, '')] || '/index.html';
            let url = path;
            const queryString = new URLSearchParams(params).toString();
            if (queryString) url += '?' + queryString;
            history.pushState({}, '', url);
            this.loadPage(path, params);
        }

        async loadPage(path, params = {}) {
            this.showLoading();
            const pathClean = path.split('?')[0].replace(/^\//, '').replace(/\.html$/, '');
            if (this.protectedRoutes.includes(pathClean) && !localStorage.getItem('token')) {
                setTimeout(() => this.navigate('/login'), 500);
                this.hideLoading();
                return;
            }

            try {
                const dynamicMatch = this.parseDynamicRoute(path);
                const pageFile = dynamicMatch ? dynamicMatch.destination : (this.routes[pathClean] || '/index.html');
                const allParams = { ...(dynamicMatch?.params || {}), ...params };
                await this.loadContentDynamically(pageFile, allParams);
            } catch (error) {
                console.error('Load error:', error);
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
                this.executeScripts(doc);
                window.scrollTo(0, 0);
            }
        }

        executeScripts(doc) {
            const scripts = Array.from(doc.querySelectorAll('script'));
            console.log(`Executing ${scripts.length} scripts from new page`);

            scripts.forEach((oldScript, index) => {
                try {
                    const scriptSrc = oldScript.getAttribute('src');

                    if (scriptSrc) {
                        // External scripts - check if already loaded by src
                        const existingScript = document.querySelector(`script[src="${scriptSrc}"]`);
                        if (existingScript) {
                            console.log(`Script ${scriptSrc} already loaded, skipping`);
                            return;
                        }

                        // Also check if the script content indicates it's already been loaded
                        const scriptId = scriptSrc.split('/').pop().split('.')[0];
                        if (window[scriptId + 'Loaded'] === true) {
                            console.log(`Script ${scriptId} content already loaded, skipping`);
                            return;
                        }
                    }

                    const newScript = document.createElement('script');
                    Array.from(oldScript.attributes).forEach(attr => {
                        newScript.setAttribute(attr.name, attr.value);
                    });

                    if (oldScript.innerHTML.trim()) {
                        // Inline scripts - wrap in try-catch to handle redeclaration errors
                        const originalCode = oldScript.innerHTML.trim();
                        const wrappedCode = `
                            try {
                                ${originalCode}
                                // Mark as loaded if it defines a global
                                if (typeof window !== 'undefined') {
                                    const scriptName = '${scriptSrc || 'inline'}_loaded';
                                    window[scriptName] = true;
                                }
                            } catch (e) {
                                if (e.message.includes('has already been declared') ||
                                    e.message.includes('already exists')) {
                                    console.log('Script redeclaration handled for:', '${scriptSrc || 'inline'}', e.message);
                                } else {
                                    console.error('Script execution error for:', '${scriptSrc || 'inline'}', e);
                                }
                            }
                        `;
                        newScript.appendChild(document.createTextNode(wrappedCode));
                    } else if (scriptSrc) {
                        // External scripts - add load event to mark as loaded
                        newScript.onload = () => {
                            const scriptName = scriptSrc.split('/').pop().split('.')[0] + 'Loaded';
                            window[scriptName] = true;
                            console.log(`External script loaded: ${scriptSrc}`);
                        };
                        newScript.onerror = (e) => {
                            console.error(`Failed to load script: ${scriptSrc}`, e);
                        };
                    }

                    // Add to document head instead of body for better loading order
                    document.head.appendChild(newScript);
                    console.log(`Added script ${index + 1}/${scripts.length}: ${scriptSrc || 'inline'}`);

                } catch (error) {
                    console.error('Error creating/executing script:', error);
                }
            });
        }

        init() {
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