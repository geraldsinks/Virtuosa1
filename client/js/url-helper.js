// URL Helper for updating existing navigation to clean URLs

// Prevent duplicate class declarations
if (window.URLHelper) {
    console.log('URLHelper class already exists, skipping declaration');
} else {

class URLHelper {
    static updatePageLinks() {
        // Update all anchor tags to use clean URLs
        const links = document.querySelectorAll('a[href]');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            // Skip empty hrefs, javascript:, mailto:, tel:, etc.
            if (!href || 
                href.startsWith('javascript:') || 
                href.startsWith('mailto:') || 
                href.startsWith('tel:') || 
                href.startsWith('#')) {
                return;
            }
            
            const cleanUrl = this.getCleanUrl(href);
            
            if (cleanUrl !== href) {
                link.setAttribute('href', cleanUrl);
            }
        });
    }

    static getCleanUrl(filePath) {
        // Validate and sanitize input
        if (!filePath || typeof filePath !== 'string') {
            return '/';
        }
        
        // Comprehensive path traversal and injection prevention
        const dangerousPatterns = [
            /\.\.\//g,           // Directory traversal
            /\.\.\\/g,           // Windows directory traversal
            /[<>\x00-\x1f\x7f-\x9f]/g,  // HTML injection and control characters (removed quotes)
            /javascript:/gi,     // JavaScript protocol
            /data:/gi,           // Data protocol
            /vbscript:/gi,       // VBScript protocol
            /file:/gi,           // File protocol
            /ftp:/gi,            // FTP protocol
            /http:/gi,           // HTTP protocol (external)
            /https:/gi,          // HTTPS protocol (external)
            /\/\/\//g,           // Protocol bypass attempts
            /\\\\/g             // Windows UNC path attempts
        ];
        
        // Check for dangerous patterns
        for (const pattern of dangerousPatterns) {
            if (pattern.test(filePath)) {
                console.warn('Potentially malicious file path detected:', filePath);
                return '/';
            }
        }
        
        // Normalize path to prevent encoded attacks
        let normalizedPath = filePath;
        try {
            // Decode URL components to catch encoded attacks
            normalizedPath = decodeURIComponent(normalizedPath);
            // Remove null bytes and other dangerous characters
            normalizedPath = normalizedPath.replace(/\0/g, '');
            // Normalize multiple slashes
            normalizedPath = normalizedPath.replace(/\/+/g, '/');
        } catch (error) {
            console.warn('Path normalization failed:', error);
            return '/';
        }
        
        // Re-check after normalization
        for (const pattern of dangerousPatterns) {
            if (pattern.test(normalizedPath)) {
                console.warn('Dangerous pattern detected after normalization:', normalizedPath);
                return '/';
            }
        }
        
        // Use router's routes as the single source of truth
        if (window.router && window.router.routes) {
            // First check static routes
            for (const [cleanPath, actualPath] of Object.entries(window.router.routes)) {
                if (actualPath === normalizedPath) {
                    return '/' + cleanPath;
                }
            }
            
            // Then check dynamic routes
            if (window.router.dynamicRoutes) {
                for (const [pattern, destination] of Object.entries(window.router.dynamicRoutes)) {
                    if (destination === normalizedPath) {
                        // Convert pattern like '/product/:id' to a regex
                        const regexPattern = pattern.replace(/:(\w+)/g, '([^/]+)');
                        const regex = new RegExp('^' + regexPattern + '$');
                        const match = normalizedPath.match(regex);
                        if (match) {
                            // Extract the clean path (first part before any parameters)
                            const cleanPath = pattern.split('/')[1]; // Gets 'product' from '/product/:id'
                            return '/' + cleanPath;
                        }
                    }
                }
            }
        }
        
        // Fallback mapping when router is not available
        const fallbackRoutes = {
            '/pages/login.html': '/login',
            '/pages/signup.html': '/signup',
            '/pages/products.html': '/products',
            '/pages/product-detail.html': '/product',
            '/pages/cart.html': '/cart',
            '/pages/orders.html': '/orders',
            '/pages/order-details.html': '/order',
            '/pages/seller.html': '/seller',
            '/pages/seller-shop.html': '/seller-shop',
            '/pages/buyer-dashboard.html': '/dashboard',
            '/pages/seller-dashboard.html': '/seller-dashboard',
            '/pages/admin-dashboard.html': '/admin',
            '/pages/messages.html': '/messages',
            '/pages/profile.html': '/profile',
            '/pages/settings.html': '/settings',
            '/pages/verify-email.html': '/verify-email',
            '/pages/contact-support.html': '/contact',
            '/pages/faq.html': '/faq',
            '/pages/reviews.html': '/reviews',
            '/pages/create-product.html': '/create-product',
            '/pages/edit-product.html': '/edit-product',
            '/pages/cash-on-delivery.html': '/cash-on-delivery',
            '/pages/seller-verification.html': '/seller-verification',
            '/pages/notifications.html': '/notifications',
            '/pages/transactions.html': '/transactions',
            '/pages/payment-options.html': '/payment-options',
            '/pages/live-chat.html': '/live-chat',
            '/pages/terms.html': '/terms',
            '/pages/refund-policy.html': '/refund-policy',
            '/pages/secure-transactions.html': '/secure-transactions',
            '/pages/seller-benefits.html': '/seller-benefits',
            '/pages/seller-guide.html': '/seller-guide',
            '/pages/admin-users.html': '/admin-users',
            '/pages/admin-seller-applications.html': '/admin-seller-applications',
            '/pages/admin-mass-messaging.html': '/admin-mass-messaging',
            '/pages/admin-retention.html': '/admin-retention',
            '/pages/admin-asset-library.html': '/admin-asset-library',
            '/pages/marketing-dashboard.html': '/marketing-dashboard',
            '/pages/marketing.html': '/marketing',
            '/pages/seller-analytics.html': '/seller-analytics',
            '/pages/seller-orders.html': '/seller-orders',
            '/pages/order-details.html': '/order-details'
        };
        
        // Check fallback routes
        if (fallbackRoutes[normalizedPath]) {
            return fallbackRoutes[normalizedPath];
        }
        
        // Handle relative paths safely
        if (!normalizedPath.startsWith('/')) {
            normalizedPath = '/' + normalizedPath;
        }
        
        // Allow legitimate paths that contain /pages/ but are actual route mappings
        // Check if this is a direct request for a known page
        if (normalizedPath.includes('/pages/')) {
            // If it's a direct HTML file request, try to find a clean URL mapping
            const pageName = normalizedPath.split('/').pop().replace('.html', '');
            
            if (window.router && window.router.routes && window.router.routes[pageName]) {
                return '/' + pageName;
            }
            
            // Check if it matches any dynamic route pattern from fallback
            const dynamicMatches = {
                'product-detail': 'product',
                'order-details': 'order',
                'seller-shop': 'seller-shop',
                'buyer-dashboard': 'dashboard',
                'seller-dashboard': 'seller-dashboard'
            };
            
            if (dynamicMatches[pageName]) {
                return '/' + dynamicMatches[pageName];
            }
            
            // If no mapping found, it might be a direct file access
            // Log it but don't block it entirely
            console.debug('Unmapped /pages/ path:', filePath);
            return normalizedPath; // Return as-is instead of blocking
        }
        
        // For other unmapped paths, return normalized version
        if (normalizedPath.includes('.html')) {
            // Try to extract a meaningful clean URL from HTML file names
            const htmlFile = normalizedPath.split('/').pop();
            const cleanName = htmlFile.replace('.html', '');
            
            // Only return clean URL if it looks reasonable
            if (cleanName && !cleanName.includes('.') && cleanName.length > 0 && /^[a-zA-Z0-9_-]+$/.test(cleanName)) {
                return '/' + cleanName;
            }
        }
        
        return normalizedPath;
    }

    static updateWindowLocation(cleanPath, params = {}) {
        try {
            // Validate the clean path
            if (typeof cleanPath !== 'string' || !cleanPath.startsWith('/')) {
                throw new Error('Invalid path format');
            }
            
            const url = new URL(cleanPath, window.location.origin);
            
            // Add query parameters with validation
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    url.searchParams.set(key, String(params[key]));
                }
            });

            window.location.href = url.toString();
        } catch (error) {
            console.error('URL update error:', error);
            // Fallback to simple redirect
            window.location.href = cleanPath;
        }
    }

    static init() {
        // Wait for router to be available before updating links
        const updateLinksWhenReady = () => {
            if (window.router && window.router.routes) {
                this.updatePageLinks();
            } else {
                // If router not ready yet, try again after a short delay
                setTimeout(updateLinksWhenReady, 100);
            }
        };

        // Update links when DOM is ready and router is available
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', updateLinksWhenReady);
        } else {
            updateLinksWhenReady();
        }
    }
}

// Auto-initialize
URLHelper.init();

// Export for use in other scripts
window.URLHelper = URLHelper;

// Also provide a global function to manually update links after dynamic content loads
window.updateCleanLinks = () => {
    URLHelper.updatePageLinks();
};

// Close the conditional class declaration block
}
