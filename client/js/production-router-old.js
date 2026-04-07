/**
 * Production-Grade Routing System for Virtuosa
 * Handles clean URLs, redirects, and proper page routing
 * 
 * Features:
 * - Consistent URL handling
 * - Smart redirects based on auth state
 * - Query parameter preservation
 * - Performance optimized
 * - SEO friendly
 */

class ProductionRouter {
    constructor() {
        if (window.productionRouterInitialized) return;
        window.productionRouterInitialized = true;

        this.currentPage = this.getCurrentPage();
        this.isAuthenticated = !!localStorage.getItem('token');
        
        // Initialize on ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        // Fix all internal links to use clean URLs
        this.fixInternalLinks();
        
        // Check if redirect is needed based on auth/role
        this.checkAccessControl();
        
        // Listen for auth changes
        document.addEventListener('authStateChanged', () => {
            this.isAuthenticated = !!localStorage.getItem('token');
            this.checkAccessControl();
        });

        console.log('✓ Production routing system initialized');
    }

    /**
     * Get current page name from URL or document
     */
    getCurrentPage() {
        const pathname = window.location.pathname;
        const filename = pathname.split('/').pop() || 'index';
        return filename.replace('.html', '');
    }

    /**
     * Fix all internal links to use proper URLs
     */
    fixInternalLinks() {
        const links = document.querySelectorAll('a[href]');
        
        links.forEach(link => {
            let href = link.getAttribute('href');
            if (!href) return;

            // Skip external links, anchors, and special links
            if (href.startsWith('http') || href.startsWith('//') || href.startsWith('#') || 
                href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
                return;
            }

            // Convert .html links to clean URLs
            if (href.includes('.html')) {
                const cleanUrl = this.convertToCleanUrl(href);
                link.setAttribute('href', cleanUrl);
            }
            
            // Handle relative path issues
            if (href.startsWith('../pages/')) {
                href = href.replace('../pages/', '/pages/');
                let cleanUrl = this.convertToCleanUrl(href);
                link.setAttribute('href', cleanUrl);
            } else if (href.startsWith('./pages/')) {
                href = href.replace('./pages/', '/pages/');
                let cleanUrl = this.convertToCleanUrl(href);
                link.setAttribute('href', cleanUrl);
            } else if (href.startsWith('./')) {
                href = href.replace('./', '/pages/');
                let cleanUrl = this.convertToCleanUrl(href);
                link.setAttribute('href', cleanUrl);
            }
        });
    }

    /**
     * Convert .html file path to clean URL
     */
    convertToCleanUrl(filePath) {
        if (!filePath) return '/';

        // Remove protocol and domain if present
        let path = filePath;
        if (path.includes('://')) {
            try {
                path = new URL(path).pathname;
            } catch (e) {
                return '/';
            }
        }

        // Remove .html extension
        path = path.replace(/\.html$/, '');

        // Clean up paths
        path = path.replace(/\/pages\//g, '/');
        path = path.replace(/\/pages/g, '');
        path = path.replace(/\/\//g, '/');
        
        // Remove index suffix
        if (path === '/index' || path === 'index') {
            path = '/';
        }

        // Ensure leading slash for absolute paths
        if (path && !path.startsWith('/')) {
            path = '/' + path;
        }

        return path || '/';
    }

    /**
     * Check if user has access to current page
     */
    checkAccessControl() {
        const requiredAuth = {
            // Pages requiring authentication
            'buyer-dashboard': true,
            'orders': true,
            'transactions': true,
            'cart': true,
            'profile': true,
            'seller-dashboard': true,
            'create-product': true,
            'edit-product': true,
            'seller-analytics': true,
            'seller-orders': true,
            'seller-shop': true,
            'messages': true,
            'notifications': true,
            // Admin pages requiring authentication
            'admin-dashboard': true,
            'admin-account-deletions': true,
            'admin-asset-library': true,
            'admin-cookie-data': true,
            'admin-disputes': true,
            'admin-live-chat': true,
            'admin-maintenance': true,
            'admin-mass-messaging': true,
            'admin-retention': true,
            'admin-seller-applications': true,
            'admin-support': true,
            'admin-test-dashboard': true,
            'admin-transactions': true,
            'admin-users': true,
        };

        const requiredRoles = {
            // Pages requiring specific roles
            'seller-dashboard': 'seller',
            'create-product': 'seller',
            'edit-product': 'seller',
            'seller-analytics': 'seller',
            'seller-orders': 'seller',
            'seller-shop': 'seller',
            // Admin pages requiring admin role
            'admin-dashboard': 'admin',
            'admin-account-deletions': 'admin',
            'admin-asset-library': 'admin',
            'admin-cookie-data': 'admin',
            'admin-disputes': 'admin',
            'admin-live-chat': 'admin',
            'admin-maintenance': 'admin',
            'admin-mass-messaging': 'admin',
            'admin-retention': 'admin',
            'admin-seller-applications': 'admin',
            'admin-support': 'admin',
            'admin-test-dashboard': 'admin',
            'admin-transactions': 'admin',
            'admin-users': 'admin',
        };

        // Check if current page requires auth
        if (requiredAuth[this.currentPage] && !this.isAuthenticated) {
            console.log(`Access denied to ${this.currentPage} - redirecting to login`);
            window.location.href = '/pages/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            return;
        }

        // Check if current page requires specific role
        const requiredRole = requiredRoles[this.currentPage];
        if (requiredRole) {
            this.checkRole(requiredRole);
        }
    }

    /**
     * Check if user has required role
     */
    async checkRole(requiredRole) {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/pages/login.html';
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch user role');
            }

            const userData = await response.json();
            const hasRole = this.userHasRole(userData, requiredRole);

            if (!hasRole) {
                console.log(`User does not have required role: ${requiredRole}`);
                this.redirectBasedOnRole(userData);
            }
        } catch (error) {
            console.error('Role check failed:', error);
            window.location.href = '/';
        }
    }

    /**
     * Check if user has specific role
     */
    userHasRole(userData, requiredRole) {
        if (requiredRole === 'admin') {
            return userData.role === 'admin' || userData.isAdmin === 'true' || userData.isAdmin === true;
        } else if (requiredRole === 'seller') {
            return userData.isSeller || userData.role === 'seller';
        } else if (requiredRole === 'buyer') {
            return true; // All authenticated users are buyers
        }
        return false;
    }

    /**
     * Redirect based on user role
     */
    redirectBasedOnRole(userData) {
        if (userData.role === 'admin' || userData.isAdmin === 'true' || userData.isAdmin === true) {
            window.location.href = '/pages/admin-dashboard.html';
        } else if (userData.isSeller || userData.role === 'seller') {
            window.location.href = '/pages/seller-dashboard.html';
        } else {
            window.location.href = '/pages/buyer-dashboard.html';
        }
    }

    /**
     * Perform client-side redirect with proper state preservation
     */
    static redirect(url, options = {}) {
        const { preserveScroll = false, delay = 0 } = options;

        const doRedirect = () => {
            if (preserveScroll) {
                sessionStorage.setItem('scrollPosition', window.scrollY);
            }
            window.location.href = url;
        };

        if (delay > 0) {
            setTimeout(doRedirect, delay);
        } else {
            doRedirect();
        }
    }

    /**
     * Get URL parameters
     */
    static getParam(paramName) {
        const params = new URLSearchParams(window.location.search);
        return params.get(paramName);
    }

    /**
     * Get all URL parameters
     */
    static getAllParams() {
        return new URLSearchParams(window.location.search);
    }

    /**
     * Check if on specific page
     */
    static isPage(pageName) {
        const router = window.productionRouter;
        return router && router.currentPage === pageName;
    }
}

// Global access
window.ProductionRouter = ProductionRouter;

// Initialize on load
if (typeof document !== 'undefined') {
    window.productionRouter = new ProductionRouter();
}
