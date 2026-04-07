/**
 * Navigation Coordinator - Production-grade unified navigation
 * Single source of truth for all navigation in the application
 * Version: v202604081000
 */

console.log('Navigation Coordinator v202604081000 - Initializing unified navigation system');

// Prevent duplicate initialization
if (window.NavigationCoordinator) {
    console.log('NavigationCoordinator already initialized');
} else {

class NavigationCoordinator {
    constructor() {
        this.isInitialized = false;
        this.navigationInProgress = false;
        this.currentUrl = window.location.pathname;
        this.navigationHistory = [];
        this.maxHistorySize = 50;
        
        // URL normalization cache
        this.urlCache = new Map();
        
        // Route definitions (single source of truth)
        this.routes = this._getBaseRoutes();
        
        // Script tracking
        this.loadedScripts = new Set();
        this.scriptMap = new Map();
        
        // Initialize script registry
        this._initializeScriptRegistry();
        
        console.log('NavigationCoordinator instance created');
    }

    /**
     * Get base routes - single source of truth
     */
    _getBaseRoutes() {
        return {
            '': '/index.html',
            'login': '/pages/login.html',
            'signup': '/pages/signup.html',
            'products': '/pages/products.html',
            'product': '/pages/product-detail.html',
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
            'cash-on-delivery': '/pages/cash-on-delivery.html',
            'seller-verification': '/pages/seller-verification.html',
            'notifications': '/pages/notifications.html',
            'transactions': '/pages/transactions.html',
            'payment-options': '/pages/payment-options.html',
            'live-chat': '/pages/live-chat.html',
            'admin-users': '/pages/admin-users.html',
            'admin-seller-applications': '/pages/admin-seller-applications.html',
            'admin-mass-messaging': '/pages/admin-mass-messaging.html',
            'marketing-dashboard': '/pages/marketing-dashboard.html',
            'seller-analytics': '/pages/seller-analytics.html',
            'seller-orders': '/pages/seller-orders.html'
        };
    }

    /**
     * Initialize the script registry from currently loaded scripts
     */
    _initializeScriptRegistry() {
        // Ensure global registry exists
        if (!window.loadedScripts) {
            window.loadedScripts = new Set();
        }
        
        // Track all currently loaded scripts
        document.querySelectorAll('script[src]').forEach(script => {
            const src = script.src;
            this.loadedScripts.add(src);
            window.loadedScripts.add(src);
            
            // Extract script name for tracking
            const scriptName = src.split('/').pop().split('?')[0];
            this.scriptMap.set(scriptName, src);
        });
        
        console.log(`✓ Script registry initialized with ${this.loadedScripts.size} scripts`);
    }

    /**
     * Normalize a URL for consistent comparison
     */
    normalizeUrl(url) {
        if (!url || typeof url !== 'string') return '/';
        
        // Check cache first
        if (this.urlCache.has(url)) {
            return this.urlCache.get(url);
        }
        
        try {
            let normalized = url.trim();
            
            // Handle protocol-relative URLs
            if (normalized.startsWith('//')) {
                normalized = window.location.protocol + normalized;
            }
            
            // Skip external URLs
            if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
                if (!normalized.startsWith(window.location.origin)) {
                    this.urlCache.set(url, url);
                    return url;
                }
            }
            
            // Parse as URL if possible
            try {
                const urlObj = new URL(normalized, window.location.origin);
                normalized = urlObj.pathname + urlObj.search;
            } catch (e) {
                // Continue with basic normalization
            }
            
            // Remove trailing slash except for root
            if (normalized !== '/' && normalized.endsWith('/')) {
                normalized = normalized.slice(0, -1);
            }
            
            // Ensure starts with /
            if (!normalized.startsWith('/')) {
                normalized = '/' + normalized;
            }
            
            this.urlCache.set(url, normalized);
            return normalized;
        } catch (e) {
            console.warn('URL normalization error:', e);
            this.urlCache.set(url, '/');
            return '/';
        }
    }

    /**
     * Get the page file for a given route
     */
    getPageFile(route) {
        // Normalize route
        let routeKey = route.replace(/^\//, '').split('?')[0];
        
        // Check direct route match
        if (this.routes[routeKey]) {
            return this.routes[routeKey];
        }
        
        // Check for index
        if (routeKey === '' || routeKey === '/') {
            return this.routes[''];
        }
        
        // Fallback to homepage
        console.warn(`No route found for ${route}, defaulting to homepage`);
        return this.routes[''];
    }

    /**
     * Check if a script is already loaded
     */
    isScriptLoaded(scriptSrc) {
        if (!scriptSrc) return false;
        
        try {
            // Check absolute URL
            let absoluteUrl = scriptSrc;
            if (!scriptSrc.startsWith('http')) {
                absoluteUrl = new URL(scriptSrc, window.location.origin).href;
            }
            
            // Check in registry (handles both versions)
            for (let loaded of this.loadedScripts) {
                if (loaded === scriptSrc || loaded === absoluteUrl) {
                    return true;
                }
                // Try URL comparison
                try {
                    if (new URL(loaded, window.location.origin).href === absoluteUrl) {
                        return true;
                    }
                } catch (e) {
                    // Ignore comparison errors
                }
            }
            
            // Check if in DOM
            if (document.querySelector(`script[src="${scriptSrc}"]`)) {
                return true;
            }
            
            return false;
        } catch (e) {
            console.warn('Script check error:', e);
            return false;
        }
    }

    /**
     * Register a script as loaded
     */
    registerScriptLoaded(scriptSrc) {
        if (!scriptSrc) return;
        
        try {
            let absoluteUrl = scriptSrc;
            if (!scriptSrc.startsWith('http')) {
                absoluteUrl = new URL(scriptSrc, window.location.origin).href;
            }
            
            this.loadedScripts.add(scriptSrc);
            this.loadedScripts.add(absoluteUrl);
            window.loadedScripts.add(scriptSrc);
            window.loadedScripts.add(absoluteUrl);
        } catch (e) {
            console.warn('Error registering script:', e);
        }
    }

    /**
     * Add navigation history entry
     */
    addToHistory(url) {
        this.navigationHistory.push({
            url,
            timestamp: Date.now()
        });
        
        // Limit history size
        if (this.navigationHistory.length > this.maxHistorySize) {
            this.navigationHistory.shift();
        }
    }

    /**
     * Get current navigation history
     */
    getHistory() {
        return [...this.navigationHistory];
    }

    /**
     * Clear navigation history
     */
    clearHistory() {
        this.navigationHistory = [];
    }

    /**
     * Initialize the coordinator
     */
    async init() {
        if (this.isInitialized) {
            console.log('NavigationCoordinator already initialized');
            return;
        }
        
        try {
            // Initialize script registry
            this._initializeScriptRegistry();
            
            // Setup navigation event handlers
            this._setupEventHandlers();
            
            // Setup URL tracking
            this._setupUrlTracking();
            
            this.isInitialized = true;
            console.log('✓ NavigationCoordinator fully initialized');
            
            // Dispatch ready event
            window.dispatchEvent(new CustomEvent('navigationCoordinatorReady'));
        } catch (e) {
            console.error('Failed to initialize NavigationCoordinator:', e);
        }
    }

    /**
     * Setup event handlers for navigation
     */
    _setupEventHandlers() {
        // Handle popstate for browser back/forward
        window.addEventListener('popstate', (e) => {
            const newUrl = window.location.pathname;
            if (newUrl !== this.currentUrl) {
                console.log('Browser navigation detected:', newUrl);
                this.currentUrl = newUrl;
                this.addToHistory(newUrl);
                
                // Notify subscribers
                window.dispatchEvent(new CustomEvent('navigationStateChanged', {
                    detail: { url: newUrl, type: 'popstate' }
                }));
            }
        });
    }

    /**
     * Setup URL tracking
     */
    _setupUrlTracking() {
        this.currentUrl = this.normalizeUrl(window.location.pathname);
        this.addToHistory(this.currentUrl);
    }

    /**
     * Get protected routes that require authentication
     */
    getProtectedRoutes() {
        return [
            'dashboard', 'seller-dashboard', 'admin', 'profile', 'settings',
            'orders', 'order', 'messages', 'notifications', 'transactions',
            'cart', 'checkout', 'create-product', 'edit-product', 'my-products',
            'seller-analytics', 'seller-orders'
        ];
    }

    /**
     * Check if a route is protected
     */
    isProtectedRoute(route) {
        const routeKey = route.replace(/^\//, '').split('?')[0];
        return this.getProtectedRoutes().includes(routeKey);
    }

    /**
     * Public static method for coordinate access
     */
    static getInstance() {
        if (!window.navigationCoordinator) {
            window.navigationCoordinator = new NavigationCoordinator();
        }
        return window.navigationCoordinator;
    }

    /**
     * Initialize static instance
     */
    static initialize() {
        const instance = this.getInstance();
        return instance.init();
    }
}

// Export globally
window.NavigationCoordinator = NavigationCoordinator;

// Initialize automatically
document.addEventListener('DOMContentLoaded', () => {
    NavigationCoordinator.initialize();
}, { once: true });

} // End conditional class declaration