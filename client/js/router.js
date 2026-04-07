// Standardized fallback behavior system
if (typeof FallbackManager === 'undefined') {
class FallbackManager {
    constructor(router) {
        this.router = router;
        this.fallbackRoutes = {
            // Authentication-related fallbacks
            'auth': '/login',
            'session-expired': '/login',
            'unauthorized': '/login',
            'forbidden': '/login',
            
            // User role-based fallbacks
            'seller-required': '/seller-verification',
            'admin-required': '/admin',
            'buyer-required': '/dashboard',
            
            // Content fallbacks
            'not-found': '/',
            'server-error': '/',
            'network-error': '/',
            
            // Application-specific fallbacks
            'cart-empty': '/products',
            'checkout-error': '/cart',
            'payment-error': '/cart',
            
            // Default safe fallback
            'default': '/'
        };
    }
    
    // Get appropriate fallback based on context
    getFallback(context, userRole = null) {
        // Context-specific fallback
        if (this.fallbackRoutes[context]) {
            return this.fallbackRoutes[context];
        }
        
        // Role-based fallbacks
        if (userRole) {
            if (userRole === 'seller' && (context.includes('admin') || context.includes('seller'))) {
                return '/seller-dashboard';
            } else if (userRole === 'admin' && context.includes('admin')) {
                return '/admin';
            } else if (userRole === 'buyer') {
                return '/dashboard';
            }
        }
        
        // Default fallback
        return this.fallbackRoutes.default;
    }
    
    // Execute standardized fallback
    async executeFallback(context, options = {}) {
        const {
            userRole = null,
            showMessage = null,
            delay = 0,
            clearStorage = false
        } = options;
        
        try {
            // Clear storage if requested
            if (clearStorage) {
                localStorage.clear();
                sessionStorage.clear();
            }
            
            // Show message if provided
            if (showMessage) {
                if (typeof showMessage === 'string') {
                    console.info('Fallback redirect:', showMessage);
                } else if (typeof showMessage === 'function') {
                    showMessage();
                }
            }
            
            // Get appropriate fallback route
            const fallbackRoute = this.getFallback(context, userRole);
            
            // Execute redirect with delay if specified
            if (delay > 0) {
                setTimeout(() => {
                    window.location.href = fallbackRoute;
                }, delay);
            } else {
                window.location.href = fallbackRoute;
            }
            
            return true;
        } catch (error) {
            console.error('Fallback execution failed:', error);
            // Ultimate safety fallback
            window.location.href = '/';
            return false;
        }
    }
}
}

if (typeof CleanRouter === 'undefined') {
class CleanRouter {
    constructor() {
        // Initialize fallback manager
        this.fallbackManager = new FallbackManager(this);
        
        this.routes = {
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

        // Protected routes that require authentication
        this.protectedRoutes = [
            'dashboard',
            'seller-dashboard',
            'admin',
            'profile',
            'settings',
            'orders',
            'order',
            'messages',
            'notifications',
            'transactions',
            'cart',
            'checkout',
            'create-product',
            'edit-product',
            'my-products',
            'seller-analytics',
            'seller-orders'
        ];
        
        // Dynamic route patterns
        this.dynamicRoutes = {
            '/product/:id': '/pages/product-detail.html',
            '/order/:id': '/pages/order-details.html',
            '/seller/:shop': '/pages/seller-shop.html',
            '/products/:category': '/pages/products.html'
        };
        
        // Loading state management
        this.loadingIndicator = null;
        this.loadingIndicators = new Set(); // Track all indicators for proper cleanup
        
        // Request cancellation for race condition prevention
        this.pendingRequests = new Map();
        
        // Redirect loop prevention
        this.redirectHistory = [];
        this.maxRedirectHistory = 10;
        
        // Error handling configuration
        this.errorConfig = {
            showUserErrors: true,
            errorTimeout: 5000,
            maxErrors: 3,
            errorHistory: []
        };

        // Cache for page fragments
        this.pageCache = new Map();
        
        // Navigation state tracking
        this.isRendering = false;
        this.navigationQueue = [];
        this.isNavigating = false;
        
        // Initial setup
        this.setupClickInterceptor();
    }

    // Intercept clicks on anchor tags for SPA navigation
    setupClickInterceptor() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            // Skip external links, mailto, tel, etc.
            if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
                return;
            }

            // Skip links that have download attribute or target="_blank"
            if (link.hasAttribute('download') || link.getAttribute('target') === '_blank') {
                return;
            }

            // If it's a relative internal link, route it through our SPA router
            e.preventDefault();
            this.navigate(href);
        });
    }

    // Special handling for mobile menu links that may be added dynamically
    setupMobileMenuInterception() {
        const mobileMenuContent = document.getElementById('mobile-menu-content');
        if (!mobileMenuContent) return;

        // Remove existing listener to avoid duplicates
        const newMobileMenuContent = mobileMenuContent.cloneNode(true);
        mobileMenuContent.parentNode.replaceChild(newMobileMenuContent, mobileMenuContent);

        // Add click delegation specifically for mobile menu
        newMobileMenuContent.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href) return;

            // Skip external links, mailto, tel, etc.
            if (href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
                return;
            }

            // Skip links that have download attribute or target="_blank"
            if (link.hasAttribute('download') || link.getAttribute('target') === '_blank') {
                return;
            }

            // Close mobile menu first
            newMobileMenuContent.classList.add('-translate-x-full');
            const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
            if (mobileMenuOverlay) {
                mobileMenuOverlay.classList.add('hidden');
            }

            // Then navigate
            e.preventDefault();
            this.navigate(href);
        });
    }

    // Parse dynamic route and extract parameters with improved validation
    parseDynamicRoute(path) {
        console.log('🔍 Parsing dynamic route for path:', path);
        
        if (!path || typeof path !== 'string') {
            console.warn('❌ Invalid path for dynamic route parsing');
            return null;
        }
        
        // Basic path validation - only block truly dangerous patterns
        if (path.includes('..') || path.includes('\\')) {
            console.warn('❌ Invalid path detected:', path);
            return null;
        }
        
        // Remove leading slash for consistent processing
        const normalizedPath = path.startsWith('/') ? path.substring(1) : path;
        console.log('📝 Normalized path:', normalizedPath);
        
        for (const [pattern, destination] of Object.entries(this.dynamicRoutes)) {
            console.log('🔎 Testing pattern:', pattern, 'against:', normalizedPath);
            
            const patternParts = pattern.split('/');
            const pathParts = normalizedPath.split('/');
            
            console.log('📊 Pattern parts:', patternParts, 'Path parts:', pathParts);
            
            if (patternParts.length !== pathParts.length) {
                console.log('❌ Length mismatch - skipping pattern');
                continue;
            }
            
            const params = {};
            let isMatch = true;
            
            for (let i = 0; i < patternParts.length; i++) {
                if (patternParts[i].startsWith(':')) {
                    const paramName = patternParts[i].substring(1);
                    const paramValue = decodeURIComponent(pathParts[i]);
                    
                    console.log('🔧 Processing param:', paramName, 'value:', paramValue);
                    
                    // Enhanced parameter validation
                    if (!this.validateParameter(paramValue, paramName)) {
                        console.debug('❌ Parameter validation failed:', paramName, paramValue);
                        isMatch = false;
                        break;
                    }
                    
                    params[paramName] = paramValue;
                } else if (patternParts[i] !== pathParts[i]) {
                    console.log('❌ Static part mismatch:', patternParts[i], '!==', pathParts[i]);
                    isMatch = false;
                    break;
                }
            }
            
            if (isMatch) {
                console.log('✅ Dynamic route matched:', pattern, 'params:', params);
                return { destination, params };
            }
        }
        
        console.log('❌ No dynamic route matched for:', path);
        return null;
    }
    
    // Enhanced parameter validation with type checking and range validation
    validateParameter(value, paramName = '') {
        if (!value || typeof value !== 'string') {
            return false;
        }
        
        // Length validation to prevent abuse
        if (value.length > 100) {
            console.warn('Parameter too long:', paramName, value.length);
            return false;
        }
        
        // Context-specific validation based on parameter name
        if (paramName === 'id') {
            // ID should be a valid MongoDB ObjectId or numeric ID
            return this.validateId(value);
        } else if (paramName === 'shop') {
            // Shop slug should be URL-friendly
            return this.validateShopSlug(value);
        }
        
        // General validation for other parameters
        return this.validateGeneralParameter(value);
    }
    
    // Validate ID parameters (MongoDB ObjectId or numeric)
    validateId(value) {
        // MongoDB ObjectId pattern (24 hex characters) - more permissive
        const objectIdPattern = /^[a-fA-F0-9]{24}$/;
        
        // Numeric ID pattern
        const numericPattern = /^\d+$/;
        
        console.log('🔍 Validating ID:', value, 'Length:', value.length);
        
        if (objectIdPattern.test(value)) {
            console.log('✅ Valid ObjectId:', value);
            return true;
        }
        
        if (numericPattern.test(value)) {
            // Additional validation for numeric IDs
            const numValue = parseInt(value, 10);
            const isValid = numValue > 0 && numValue <= 999999999; // Reasonable range
            console.log('✅ Valid numeric ID:', value, 'Result:', isValid);
            return isValid;
        }
        
        console.warn('❌ Invalid ID format:', value);
        console.warn('Expected ObjectId (24 hex chars) or positive number');
        return false;
    }
    
    // Validate shop slug parameters
    validateShopSlug(value) {
        // Shop slug should be URL-friendly: letters, numbers, hyphens, underscores
        const slugPattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]*[a-zA-Z0-9]$/;
        
        if (!slugPattern.test(value)) {
            console.warn('Invalid shop slug format:', value);
            return false;
        }
        
        // Length constraints for shop slugs
        if (value.length < 3 || value.length > 50) {
            console.warn('Shop slug length out of range:', value.length);
            return false;
        }
        
        return true;
    }
    
    // General parameter validation
    validateGeneralParameter(value) {
        // Allow reasonable characters for general parameters
        const validPattern = /^[a-zA-Z0-9\-_\.~!$&'()*+,;=:@%]+$/;
        
        // Block dangerous patterns
        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+=/i,
            /data:text\/html/i
        ];
        
        return validPattern.test(value) && !dangerousPatterns.some(pattern => pattern.test(value));
    }

    // Show loading indicator with improved memory management
    showLoading() {
        // Remove any existing loading indicators first (prevent memory leaks)
        this.hideLoading();
        
        this.loadingIndicator = document.createElement('div');
        this.loadingIndicator.id = 'router-loading-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9); // More unique ID
        this.loadingIndicator.className = 'router-loading-indicator';
        this.loadingIndicator.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, #007bff, #28a745);
            z-index: 9999;
            animation: loading 1s ease-in-out infinite;
        `;
        
        document.body.appendChild(this.loadingIndicator);
        this.loadingIndicators.add(this.loadingIndicator);
        
        // Manual cleanup tracking instead of deprecated DOMNodeRemoved
        this.loadingIndicator._routerManaged = true;
        this.loadingIndicator._createdAt = Date.now();
    }

    // Hide loading indicator with comprehensive cleanup
    hideLoading() {
        // Remove all tracked loading indicators
        this.loadingIndicators.forEach(indicator => {
            if (indicator && indicator.parentNode) {
                indicator.remove();
            }
        });
        this.loadingIndicators.clear();
        
        // Remove any remaining indicators by class name (fallback)
        const allIndicators = document.querySelectorAll('.router-loading-indicator');
        allIndicators.forEach(indicator => {
            if (indicator.parentNode) {
                indicator.remove();
            }
        });
        
        // Remove legacy indicators by ID
        const oldIndicator = document.getElementById('router-loading');
        if (oldIndicator && oldIndicator.parentNode) {
            oldIndicator.remove();
        }
        
        // Clear reference
        this.loadingIndicator = null;
        
        // Periodic cleanup of orphaned indicators (run every 30 seconds)
        if (!this._cleanupInterval) {
            this._cleanupInterval = setInterval(() => {
                this.cleanupOrphanedIndicators();
            }, 30000);
        }
    }
    
    // Cleanup orphaned loading indicators that weren't properly removed
    cleanupOrphanedIndicators() {
        const indicators = document.querySelectorAll('.router-loading-indicator');
        const now = Date.now();
        
        indicators.forEach(indicator => {
            // Remove indicators older than 10 seconds or orphaned ones
            const age = indicator._createdAt ? (now - indicator._createdAt) : 0;
            if (age > 10000 || !indicator._routerManaged) {
                if (indicator.parentNode) {
                    indicator.remove();
                }
            }
        });
    }

    // Navigate to clean URL with origin validation
    navigate(path, params = {}) {
        try {
            // Validate the path to prevent open redirects
            if (!this.isValidPath(path)) {
                console.error('Invalid navigation path detected:', path);
                return;
            }
            
            let url = path;
            
            // Add query parameters
            const queryString = new URLSearchParams(params).toString();
            if (queryString) {
                url += '?' + queryString;
            }
            
            // Ensure URL is relative to current origin
            if (url.startsWith('http') || url.startsWith('//')) {
                console.error('External URL navigation blocked:', url);
                return;
            }
            
            // Update browser history
            history.pushState({}, '', url);
            
            // Load the corresponding page
            this.loadPage(path, params);
        } catch (error) {
            const errorResult = this.handleNavigationError(error, 'navigation');
            if (errorResult.action === 'fallback') {
                this.fallbackToRedirect(path + '?' + new URLSearchParams(params).toString());
            }
        }
    }
    
    // Validate navigation path for security
    isValidPath(path) {
        if (!path || typeof path !== 'string') {
            return false;
        }
        
        // Block dangerous patterns
        const dangerousPatterns = [
            /^https?:\/\//,  // External URLs
            /^\/\//,         // Protocol-relative URLs
            /\.\.\//,        // Directory traversal
            /[<>\"'\\]/,     // HTML injection
            /javascript:/i,  // JavaScript URLs
            /data:/i         // Data URLs
        ];
        
        return !dangerousPatterns.some(pattern => pattern.test(path));
    }

    // Validate if route file exists before attempting to load with cancellation support
    async validateRoute(pageFile) {
        // Cancel any existing validation request for the same file
        const existingRequest = this.pendingRequests.get(pageFile);
        if (existingRequest) {
            existingRequest.abort();
        }
        
        try {
            // Skip validation for external URLs or data URLs
            if (pageFile.startsWith('http') || pageFile.startsWith('data:')) {
                return false;
            }
            
            // For relative paths, make them absolute relative to current origin
            const testUrl = pageFile.startsWith('/') ? pageFile : '/' + pageFile;
            
            // Create abort controller for this request
            const controller = new AbortController();
            this.pendingRequests.set(pageFile, controller);
            
            // Perform a lightweight HEAD request to check if file exists
            const response = await fetch(testUrl, {
                method: 'HEAD',
                cache: 'no-cache',
                signal: controller.signal,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });
            
            // Clean up the request reference
            this.pendingRequests.delete(pageFile);
            
            return response.ok;
        } catch (error) {
            // Clean up the request reference
            this.pendingRequests.delete(pageFile);
            
            if (error.name === 'AbortError') {
                console.debug('Route validation cancelled for:', pageFile);
                return false;
            }
            
            const errorResult = this.handleNavigationError(error, 'route-validation');
            return false;
        }
    }

    // Combined validation and content loading to prevent race conditions
    async validateAndLoadContent(pageFile, params = {}) {
        // Validate the page file path before processing
        if (!this.isValidRouteFile(pageFile)) {
            console.warn(`Invalid route file detected: ${pageFile}`);
            return { success: false, fallbackContext: 'not-found' };
        }
        
        // First validate the route exists
        const routeExists = await this.validateRoute(pageFile);
        if (!routeExists) {
            console.warn(`Route file not found: ${pageFile}`);
            return { success: false, fallbackContext: 'not-found' };
        }
        
        // If validation passes, proceed with content loading
        try {
            await this.loadContentDynamically(pageFile, params);
            return { success: true };
        } catch (error) {
            console.error('Content loading failed after validation:', error);
            
            // Determine appropriate fallback context based on error
            let fallbackContext = 'server-error';
            if (error.message.includes('404') || error.message.includes('not found')) {
                fallbackContext = 'not-found';
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                fallbackContext = 'network-error';
            }
            
            return { success: false, fallbackContext, error };
        }
    }
    
    // Validate route file path for security
    isValidRouteFile(pageFile) {
        if (!pageFile || typeof pageFile !== 'string') {
            return false;
        }
        
        // Must be an absolute path starting with /
        if (!pageFile.startsWith('/')) {
            return false;
        }
        
        // Check for dangerous patterns
        const dangerousPatterns = [
            /\.\.\//,           // Directory traversal
            /\.\.\\/,           // Windows traversal
            /[<>"'\x00-\x1f]/,  // HTML injection and control characters
            /javascript:/i,     // JavaScript protocol
            /data:/i,           // Data protocol
            /file:/i            // File protocol
        ];
        
        return !dangerousPatterns.some(pattern => pattern.test(pageFile));
    }

    // Load the actual HTML file with proper navigation
    async loadPage(path, params = {}) {
        console.log('🚀 ROUTER loadPage called with:', { path, params });
        
        // Faster Login Check
        const pathForMatching = path.split('?')[0];
        const normalizedPath = pathForMatching
            .replace(/^\//, '')
            .replace(/\.html$/, '')
            .replace(/^pages\//, '');

        if (this.protectedRoutes.includes(normalizedPath)) {
            const token = localStorage.getItem('token');
            if (!token) {
                console.warn('🔒 Protected route access denied (Faster Check):', normalizedPath);
                
                // Show premium "Login Required" toast immediately
                if (window.showToast) {
                    window.showToast('Authentication required. Redirecting to login...', 'auth', 2000);
                } else {
                    alert('Please login to access this page.');
                }
                
                // Stop navigation and redirect to login after a short delay
                setTimeout(() => {
                    this.navigate('/login');
                }, 1500);
                return;
            }
        }

        try {
            this.showLoading();
            
            // Check for dynamic routes first
            const dynamicMatch = this.parseDynamicRoute(path);
            console.log('🎯 Dynamic route result:', dynamicMatch);
            
            let pageFile;
            let routeParams = {};
            
            if (dynamicMatch) {
                pageFile = dynamicMatch.destination;
                routeParams = dynamicMatch.params;
                console.log('✅ Using dynamic route:', pageFile, 'params:', routeParams);
            } else {
                // Normalize path for matching (strip query string, leading slash, .html, and pages/ prefix)
                const pathForMatching = path.split('?')[0];
                const normalizedPath = pathForMatching
                    .replace(/^\//, '')
                    .replace(/\.html$/, '')
                    .replace(/^pages\//, '');
                
                pageFile = this.routes[normalizedPath] || this.routes[path] || '/index.html';
                console.log(`📄 Using static route: ${pageFile} (normalized: ${normalizedPath})`);
            }
            
            // Validate route
            if (!pageFile || typeof pageFile !== 'string') {
                console.error('❌ Invalid route:', { path, pageFile });
                throw new Error(`Invalid route: ${path}`);
            }
            
            // Combined params
            const allParams = { ...routeParams, ...params };
            
            // Build the final URL with parameters
            let finalUrl = pageFile;
            if (Object.keys(allParams).length > 0) {
                const searchParams = new URLSearchParams(allParams).toString();
                finalUrl += '?' + searchParams;
            }

            // If it's an SPA-compatible route, load it dynamically
            // We use dynamic loading if it's a known route and NOT a direct .html request (unless it's index)
            const isSPARoute = (this.routes[path] || this.parseDynamicRoute(path) || path === '/' || path === '' || path === 'index.html');

            if (isSPARoute) {
                console.log('✨ SPA navigation to:', path);
                this.loadContentDynamically(pageFile, allParams);
                return;
            }
            
            // Fallback for non-SPA routes
            console.log('🔄 Non-SPA route, doing full redirect to:', finalUrl);
            window.location.href = finalUrl;
            
        } catch (error) {
            console.error('❌ Router loadPage error:', error);
            window.location.href = path.endsWith('.html') ? path : '/pages/' + path + '.html';
        } finally {
            setTimeout(() => {
                this.hideLoading();
            }, 200);
        }
    }
    
    // Get current user role for context-aware fallbacks
    getCurrentUserRole() {
        try {
            const user = localStorage.getItem('user');
            if (user) {
                const userData = JSON.parse(user);
                if (userData.isAdmin) return 'admin';
                if (userData.isSeller) return 'seller';
                return 'buyer';
            }
        } catch (error) {
            console.debug('Could not determine user role:', error);
        }
        return null;
    }

    // Load content dynamically without full page reload with comprehensive error handling
    async loadContentDynamically(pageFile, params = {}) {
        // Prevent concurrent loads of the same page
        const loadKey = pageFile + JSON.stringify(params);
        if (this.pendingRequests.has(loadKey)) {
            console.warn('Content already loading:', pageFile);
            return;
        }
        
        const controller = new AbortController();
        this.pendingRequests.set(loadKey, controller);
        
        try {
            // Validate the page file path
            if (!this.isValidPath(pageFile)) {
                throw new Error(`Invalid page file path: ${pageFile}`);
            }
            
            // Try to get from cache first with version check
            if (this.pageCache.has(pageFile)) {
                const cached = this.pageCache.get(pageFile);
                // Check if cache is still valid (5 minutes)
                if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
                    console.log('⚡ Using cached page fragment for:', pageFile);
                    this.renderPageContent(cached.html, pageFile, params);
                    return;
                } else {
                    // Remove expired cache
                    this.pageCache.delete(pageFile);
                }
            }

            // Fetch the page content with timeout
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(pageFile, {
                signal: controller.signal,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-cache'
                }
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                // Handle different HTTP status codes
                switch (response.status) {
                    case 404:
                        throw new Error(`Page not found: ${pageFile}`);
                    case 403:
                        throw new Error(`Access denied: ${pageFile}`);
                    case 500:
                        throw new Error(`Server error loading: ${pageFile}`);
                    default:
                        throw new Error(`Failed to load ${pageFile}: ${response.status} ${response.statusText}`);
                }
            }
            
            const html = await response.text();
            
            // Validate HTML content
            if (!html || html.trim().length === 0) {
                throw new Error(`Empty content received for: ${pageFile}`);
            }
            
            // Cache the fragment with timestamp
            this.pageCache.set(pageFile, {
                html: html,
                timestamp: Date.now()
            });
            
            // Limit cache size
            if (this.pageCache.size > 50) {
                const oldestKey = this.pageCache.keys().next().value;
                this.pageCache.delete(oldestKey);
            }
            
            this.renderPageContent(html, pageFile, params);
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Content loading cancelled:', pageFile);
                return;
            }
            
            const errorResult = this.handleNavigationError(error, 'content-loading');
            if (errorResult.action === 'fallback') {
                this.fallbackToRedirect(pageFile + (Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : ''));
            }
        } finally {
            this.pendingRequests.delete(loadKey);
        }
    }
    
    // Render page content with transitions and race condition prevention
    renderPageContent(html, pageFile, params = {}) {
        // Prevent concurrent renders
        if (this.isRendering) {
            console.warn('Render already in progress, skipping:', pageFile);
            return;
        }
        
        this.isRendering = true;
        
        try {
            // Validate the HTML content
            if (!html || html.trim().length === 0) {
                throw new Error(`Empty content received for: ${pageFile}`);
            }
            
            // Parse the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Check for parsing errors
            const parserError = doc.querySelector('parsererror');
            if (parserError) {
                throw new Error(`HTML parsing error for: ${pageFile}`);
            }
            
            // Update the page title
            const newTitle = doc.querySelector('title');
            if (newTitle) {
                document.title = newTitle.textContent;
            }
            
            // Get the main content area
            const newContent = doc.querySelector('main, #main, .main, body');
            const currentContent = document.querySelector('main, #main, .main') || document.body;
            
            if (newContent && currentContent) {
                // Apply fade-out transition
                currentContent.style.transition = 'opacity 150ms ease-in-out';
                currentContent.style.opacity = '0';
                
                setTimeout(() => {
                    try {
                        currentContent.innerHTML = newContent.innerHTML;
                        
                        // Execute any scripts in the new content
                        this.executeScripts(doc);
                        
                        // Fade back in
                        currentContent.style.opacity = '1';
                        
                        // Scroll to top
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        
                        // Update URL with parameters (only if they've changed)
                        const queryString = Object.keys(params).length > 0 
                            ? '?' + new URLSearchParams(params).toString() 
                            : '';
                        
                        const currentQueryString = window.location.search;
                        if (queryString !== currentQueryString) {
                            history.replaceState({}, '', window.location.pathname + queryString);
                        }
                        
                        // Reinitialize URL helper for new content
                        if (window.URLHelper) {
                            setTimeout(() => {
                                window.URLHelper.updatePageLinks();
                            }, 100);
                        }
                        
                        // Reinitialize click interceptor for dynamically added content
                        setTimeout(() => {
                            this.setupClickInterceptor();
                        }, 150);
                        
                        // Also set up immediate delegation for mobile menu links
                        setTimeout(() => {
                            this.setupMobileMenuInterception();
                        }, 200);
                        
                        // Trigger content loaded event
                        document.dispatchEvent(new CustomEvent('contentLoaded', {
                            detail: { pageFile, params }
                        }));
                        
                    } catch (error) {
                        console.error('Error during content render:', error);
                        // Fallback to full page reload
                        window.location.reload();
                    }
                }, 150);
            } else {
                throw new Error(`No content area found in: ${pageFile}`);
            }
        } catch (error) {
            console.error('Render error:', error);
            throw error;
        } finally {
            setTimeout(() => {
                this.isRendering = false;
            }, 300);
        }
    }

    // Standardized error handling for navigation
    handleNavigationError(error, context = 'navigation') {
        const errorInfo = {
            message: error.message || 'Unknown error occurred',
            context: context,
            timestamp: Date.now(),
            stack: error.stack
        };
        
        // Add to error history
        this.errorConfig.errorHistory.push(errorInfo);
        
        // Limit error history size
        if (this.errorConfig.errorHistory.length > this.maxRedirectHistory) {
            this.errorConfig.errorHistory = this.errorConfig.errorHistory.slice(-this.maxRedirectHistory);
        }
        
        // Log to console with context
        console.error(`Navigation error [${context}]:`, errorInfo);
        
        // Show user-friendly error if enabled
        if (this.errorConfig.showUserErrors) {
            this.showUserError(errorInfo.message, context);
        }
        
        // Check for error patterns that might need special handling
        if (error.message.includes('404') || error.message.includes('not found')) {
            return { handled: true, action: 'fallback', target: '/' };
        }
        
        if (error.message.includes('network') || error.message.includes('fetch')) {
            return { handled: true, action: 'retry', context: context };
        }
        
        return { handled: true, action: 'fallback', target: '/' };
    }
    
    // Show standardized user error messages
    showUserError(message, context = 'navigation') {
        // Remove existing error messages
        const existingError = document.getElementById('router-error-message');
        if (existingError) {
            existingError.remove();
        }
        
        // Don't show too many errors in quick succession
        const recentErrors = this.errorConfig.errorHistory.filter(
            error => (Date.now() - error.timestamp) < this.errorConfig.errorTimeout
        );
        
        if (recentErrors.length >= this.errorConfig.maxErrors) {
            console.debug('Error throttled - too many recent errors');
            return;
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.id = 'router-error-message';
        errorDiv.className = 'router-error-toast';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
            z-index: 10000;
            max-width: 300px;
            font-family: system-ui, -apple-system, sans-serif;
            font-size: 14px;
            cursor: pointer;
        `;
        
        // Create user-friendly message based on context
        let userMessage = message;
        if (context === 'navigation') {
            userMessage = 'Navigation failed. Please try again.';
        } else if (context === 'route-validation') {
            userMessage = 'Page not found. Redirecting to home.';
        } else if (context === 'content-loading') {
            userMessage = 'Failed to load page content. Please refresh.';
        }
        
        errorDiv.textContent = userMessage;
        
        // Add click to dismiss
        errorDiv.addEventListener('click', () => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        });
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after timeout
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, this.errorConfig.errorTimeout);
    }

    // Execute scripts from loaded content with security validation
    executeScripts(doc) {
        const scripts = doc.querySelectorAll('script');
        const headScripts = [];
        const bodyScripts = [];
        
        // Separate head and body scripts to maintain execution order
        scripts.forEach(oldScript => {
            // Security validation: skip scripts with dangerous content
            const scriptContent = oldScript.innerHTML || oldScript.textContent;
            if (scriptContent && this.containsDangerousContent(scriptContent)) {
                console.warn('Blocked potentially dangerous script execution');
                return;
            }
            
            // Skip external scripts from untrusted sources
            if (oldScript.src && !this.isTrustedSource(oldScript.src)) {
                console.warn('Blocked script from untrusted source:', oldScript.src);
                return;
            }
            
            // Check if script was originally in head or body
            const isInHead = oldScript.parentNode && oldScript.parentNode.nodeName === 'HEAD';
            if (isInHead) {
                headScripts.push(oldScript);
            } else {
                bodyScripts.push(oldScript);
            }
        });
        
        // Execute head scripts first (in order)
        headScripts.forEach(oldScript => {
            this.executeScript(oldScript, 'head');
        });
        
        // Then execute body scripts (in order)
        bodyScripts.forEach(oldScript => {
            this.executeScript(oldScript, 'body');
        });
    }
    
    // Execute individual script with proper placement
    executeScript(oldScript, target) {
        const newScript = document.createElement('script');
        
        // Copy all attributes
        Array.from(oldScript.attributes).forEach(attr => {
            newScript.setAttribute(attr.name, attr.value);
        });
        
        // Copy script content
        if (oldScript.innerHTML || oldScript.textContent) {
            newScript.appendChild(document.createTextNode(oldScript.innerHTML || oldScript.textContent));
        }
        
        // Append to correct location
        if (target === 'head') {
            document.head.appendChild(newScript);
        } else {
            document.body.appendChild(newScript);
        }
    }
    
    // Check for dangerous script content with stricter security validation
    containsDangerousContent(content) {
        // Strict allowlist approach - only allow known safe patterns
        const safePatterns = [
            // Safe DOM manipulation
            /\.addEventListener\s*\(/,
            /\.removeEventListener\s*\(/,
            /\.querySelector\s*\(/,
            /\.querySelectorAll\s*\(/,
            /\.classList\.(add|remove|toggle|contains)/,
            /\.setAttribute\s*\(/,
            /\.getAttribute\s*\(/,
            
            // Safe timers with function expressions
            /setTimeout\s*\(\s*function\s*\(/,
            /setTimeout\s*\(\s*\([^)]*\)\s*=>/,
            /setInterval\s*\(\s*function\s*\(/,
            /setInterval\s*\(\s*\([^)]*\)\s*=>/,
            
            // Safe array/object methods
            /\.forEach\s*\(/,
            /\.map\s*\(/,
            /\.filter\s*\(/,
            /\.reduce\s*\(/,
            
            // Safe console methods
            /console\.(log|warn|error|debug|info)\s*\(/,
            
            // Safe fetch usage
            /fetch\s*\(/,
            /\.json\s*\(\)/,
            
            // Safe event handling
            /event\.(preventDefault|stopPropagation)/,
            /\.target\s*,?/,
            /\.currentTarget\s*,?/
        ];
        
        // High-risk patterns - always block
        const highRiskPatterns = [
            // Code execution patterns
            /eval\s*\([^)]*\)/i,
            /Function\s*\([^)]*\)/i,
            /new\s+Function\s*\(/i,
            
            // Dangerous protocols
            /javascript\s*:/i,
            /data\s*:\s*text\/html/i,
            /vbscript\s*:/i,
            
            // Script injection
            /<script[^>]*>.*?<\/script>/gis,
            /document\.write\s*\([^)]*\)/i,
            /document\.writeln\s*\([^)]*\)/i,
            
            // Dangerous event handlers
            /on\w+\s*=\s*["'][^"']*(?:javascript|eval|script)/i,
            
            // Direct code execution
            /setTimeout\s*\([^)]*eval[^)]*\)/i,
            /setInterval\s*\([^)]*eval[^)]*\)/i,
            
            // HTML injection
            /innerHTML\s*=\s*["'][^"']*(?:<script|javascript:|data:)/i,
            /outerHTML\s*=\s*["'][^"']*(?:<script|javascript:|data:)/i
        ];
        
        // First check if content matches any safe patterns
        const hasSafeContent = safePatterns.some(pattern => pattern.test(content));
        
        // If no safe patterns detected, be suspicious
        if (!hasSafeContent && content.length > 50) {
            console.warn('Script content contains no recognizable safe patterns');
            return true; // Block unknown content
        }
        
        // Block any high-risk patterns immediately
        if (highRiskPatterns.some(pattern => pattern.test(content))) {
            console.error('High-risk pattern detected in script content');
            return true;
        }
        
        // Additional checks for suspicious content
        const suspiciousPatterns = [
            /\b(?:eval|Function|setTimeout|setInterval)\s*\([^)]*["'][^"']*(?:javascript|data:|<)/i,
            /\bdocument\.(write|writeln|open|close)\s*\(/i,
            /\binnerHTML\s*=\s*["'][^"']*[<>]/i
        ];
        
        return suspiciousPatterns.some(pattern => pattern.test(content));
    }
    
    // Check if script source is trusted with SRI validation
    isTrustedSource(src) {
        try {
            const url = new URL(src, window.location.origin);
            const trustedDomains = [
                window.location.hostname,
                'cdn.jsdelivr.net',
                'cdnjs.cloudflare.com',
                'unpkg.com',
                'code.jquery.com',
                'stackpath.bootstrapcdn.com',
                'fonts.googleapis.com',
                'fonts.gstatic.com'
            ];
            
            // First check if domain is trusted
            if (!trustedDomains.includes(url.hostname)) {
                return false;
            }
            
            // For external CDNs, recommend SRI (but don't enforce for compatibility)
            if (url.hostname !== window.location.hostname) {
                console.info('External resource detected:', src, 'Consider adding SRI for better security');
            }
            
            return true;
        } catch (e) {
            return false;
        }
    }
    
    // Generate or validate SRI hash for external resources
    generateSRIHash(content) {
        // This is a placeholder for SRI hash generation
        // In production, you would pre-compute these hashes
        // and include them in your HTML
        try {
            // Simple hash generation (use crypto.subtle.digest in production)
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            return 'sha256-' + btoa(String.fromCharCode(...new Uint8Array(data)));
        } catch (e) {
            console.warn('SRI hash generation failed:', e);
            return null;
        }
    }

    // Fallback redirect method with improved infinite loop prevention
    fallbackToRedirect(url) {
        try {
            const now = Date.now();
            const currentUrl = window.location.href;
            const targetUrl = new URL(url, window.location.origin).href;
            
            // Check if we're trying to redirect to the same URL
            if (currentUrl === targetUrl) {
                console.warn('Prevented infinite redirect to same URL:', url);
                this.safeRedirect('/');
                return;
            }
            
            // Check redirect history for loops (more robust than sessionStorage)
            const recentRedirects = this.redirectHistory.filter(
                entry => (now - entry.timestamp) < 10000 // Last 10 seconds
            );
            
            // Count redirects to the same URL in recent history
            const sameUrlRedirects = recentRedirects.filter(
                entry => entry.url === targetUrl
            );
            
            // If we've redirected to the same URL 3+ times in 10 seconds, it's likely a loop
            if (sameUrlRedirects.length >= 3) {
                console.error('Detected redirect loop to:', targetUrl, 'History:', sameUrlRedirects);
                this.safeRedirect('/');
                return;
            }
            
            // Check for rapid redirects (5+ redirects in 5 seconds)
            if (recentRedirects.length >= 5) {
                console.error('Detected rapid redirect loop:', recentRedirects);
                this.safeRedirect('/');
                return;
            }
            
            // Add to redirect history
            this.redirectHistory.push({
                url: targetUrl,
                timestamp: now
            });
            
            // Keep history size manageable
            if (this.redirectHistory.length > this.maxRedirectHistory) {
                this.redirectHistory = this.redirectHistory.slice(-this.maxRedirectHistory);
            }
            
            // Perform the redirect
            window.location.href = url;
        } catch (error) {
            console.error('Fallback redirect failed:', error);
            this.safeRedirect('/');
        }
    }
    
    // Safe redirect to a known good location
    safeRedirect(path) {
        try {
            // Clear redirect history
            this.redirectHistory = [];
            
            // Redirect to a safe default
            if (path === '/' || this.routes[path.substring(1)]) {
                window.location.href = path;
            } else {
                window.location.href = '/';
            }
        } catch (error) {
            console.error('Safe redirect failed:', error);
            // Ultimate fallback
            window.location.href = '/';
        }
    }

    // Get clean URL from file path
    getCleanUrl(filePath) {
        for (const [cleanPath, actualPath] of Object.entries(this.routes)) {
            if (actualPath === filePath) {
                return '/' + cleanPath;
            }
        }
        return filePath;
    }

    // Initialize router
    init() {
        // Add loading animation styles
        const style = document.createElement('style');
        style.textContent = `
            @keyframes loading {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        `;
        document.head.appendChild(style);
        
        // Handle browser back/forward buttons
        window.addEventListener('popstate', (event) => {
            try {
                const path = window.location.pathname;
                const query = window.location.search;
                const params = Object.fromEntries(new URLSearchParams(query.substring(1)));
                this.loadPage(path.substring(1), params); // Remove leading slash
            } catch (error) {
                console.error('Router popstate error:', error);
                // Fallback to reload if routing fails
                window.location.reload();
            }
        });

        // Handle initial page load
        document.addEventListener('DOMContentLoaded', () => {
            const path = window.location.pathname;
            const query = window.location.search;
            const params = Object.fromEntries(new URLSearchParams(query.substring(1)));
            
            if (path !== '/' && !path.includes('.html')) {
                this.loadPage(path.substring(1), params);
            }
        });
    }

    // Get clean URL from file path
    getCleanUrl(filePath) {
        for (const [cleanPath, actualPath] of Object.entries(this.routes)) {
            if (actualPath === filePath) {
                return '/' + cleanPath;
            }
        }
        return '/' + filePath.replace(/^\//, '');
    }
}

// Global router instance
window.router = new CleanRouter();

}

// Global fallback helpers for consistent behavior across the application
window.handleAuthError = function(context = 'auth', options = {}) {
    if (window.router && window.router.fallbackManager) {
        return window.router.fallbackManager.executeFallback(context, {
            ...options,
            clearStorage: true,
            showMessage: options.showMessage || 'Authentication required, redirecting to login...'
        });
    }
    // Fallback if router not available
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/login';
};

window.handleAccessDenied = function(userRole = null, context = 'forbidden') {
    if (window.router && window.router.fallbackManager) {
        return window.router.fallbackManager.executeFallback(context, {
            userRole: userRole,
            showMessage: 'Access denied, redirecting to appropriate page...',
            delay: 2000
        });
    }
    // Fallback if router not available
    window.location.href = '/';
};

window.handleNotFound = function(context = 'not-found') {
    if (window.router && window.router.fallbackManager) {
        return window.router.fallbackManager.executeFallback(context, {
            showMessage: 'Page not found, redirecting to home...',
            delay: 1500
        });
    }
    // Fallback if router not available
    window.location.href = '/';
};

window.handleServerError = function(context = 'server-error') {
    if (window.router && window.router.fallbackManager) {
        return window.router.fallbackManager.executeFallback(context, {
            showMessage: 'Server error occurred, redirecting to safe page...',
            delay: 2000
        });
    }
    // Fallback if router not available
    window.location.href = '/';
};

// Helper functions for common navigation
window.navigateTo = (path, params = {}) => {
    if (window.router) {
        window.router.navigate(path, params);
    } else {
        console.error('Router not initialized');
        window.location.href = path + (Object.keys(params).length > 0 ? '?' + new URLSearchParams(params).toString() : '');
    }
};

// Standardized logout function
window.logout = function() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    if (window.router && window.router.fallbackManager) {
        window.router.fallbackManager.executeFallback('auth', {
            showMessage: 'Logged out successfully',
            delay: 500
        });
    } else {
        window.location.href = '/login';
    }
};

// Initialize router after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.router) {
        window.router.init();
        // Update links to clean URLs after router is initialized
        if (window.updateCleanLinks) {
            setTimeout(() => window.updateCleanLinks(), 50);
        }
    }
});
