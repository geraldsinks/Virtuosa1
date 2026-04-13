// Client-side Role Management Helper
// This standardizes role checking across the application

// Prevent duplicate class declarations
if (window.RoleManager) {
    console.log('RoleManager class already exists, skipping declaration');
} else {

class RoleManager {
    constructor() {
        this.currentRole = null;
        this.roleInfo = null;
        this.isInitialized = false;
        this.initializationPromise = null;
        this.accessCheckCache = new Map(); // Cache access checks to prevent race conditions
        this.initializationLock = false; // Prevent concurrent initialization
        this.initQueue = []; // Queue for initialization requests
        this.cacheMaxSize = 50; // Limit cache size
        this.cacheCleanupInterval = 5 * 60 * 1000; // 5 minutes
        this.startCacheCleanup();
    }

    // Initialize role manager with user data
    async initialize() {
        // Return existing promise if initialization is in progress
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        // If already initialized, return resolved promise
        if (this.isInitialized) {
            return Promise.resolve(this.roleInfo);
        }

        // If initialization is in progress, queue the request
        if (this.initializationLock) {
            return new Promise((resolve, reject) => {
                this.initQueue.push({ resolve, reject });
            });
        }

        // Start initialization with proper error handling
        this.initializationLock = true;
        this.initializationPromise = this._doInitialize().catch(error => {
            // Ensure lock is always released even on error
            this.initializationLock = false;
            this.initializationPromise = null;
            throw error;
        });
        
        try {
            const result = await this.initializationPromise;
            // Resolve all queued requests
            this.initQueue.forEach(({ resolve }) => resolve(result));
            this.initQueue = [];
            return result;
        } catch (error) {
            // Reject all queued requests
            this.initQueue.forEach(({ reject }) => reject(error));
            this.initQueue = [];
            throw error;
        } finally {
            this.initializationLock = false;
            this.initializationPromise = null;
        }
    }

    async _doInitialize() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('No authentication token found');
            }

            // Validate token format (basic JWT validation)
            if (!this._isValidTokenFormat(token)) {
                throw new Error('Invalid token format');
            }

            // Try to get role info from API first
            try {
                const response = await fetch(`${API_BASE}/user/role-info`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    this.roleInfo = await response.json();
                    this.currentRole = this.roleInfo.effectiveRole;
                    this.isInitialized = true;
                    
                    console.log('🔐 Role Manager initialized from API:', {
                        effectiveRole: this.currentRole,
                        title: this.roleInfo.title,
                        level: this.roleInfo.level,
                        isSeller: this.roleInfo.isSeller,
                        isAdmin: this.roleInfo.isAdmin
                    });

                    // Clear access cache when role changes
                    this.clearAccessCache();

                    return this.roleInfo;
                } else {
                    // Handle specific HTTP errors
                    if (response.status === 401) {
                        throw new Error('Authentication expired');
                    } else if (response.status === 403) {
                        throw new Error('Access forbidden');
                    } else {
                        throw new Error(`Server error: ${response.status}`);
                    }
                }
            } catch (apiError) {
                console.warn('⚠️ API role info failed, using fallback:', apiError);
                
                // If auth expired, clear token and redirect to login
                // ONLY redirect if we're on a page that actually REQUIRES a role
                if (apiError.message === 'Authentication expired') {
                    this.clearAllData();
                    
                    const currentPath = window.location.pathname;
                    const isPublic = ['', '/', '/index.html', '/login', '/signup', '/search', '/about', '/contact', '/privacy', '/terms'].includes(currentPath);
                    const isProduct = currentPath.startsWith('/product/') || currentPath.startsWith('/category/');

                    if (!isPublic && !isProduct) {
                        console.log('🚪 Auth expired on protected page, redirecting to login');
                        if (window.router) {
                            window.router.navigate('/login');
                        } else {
                            window.location.href = '/login';
                        }
                    }
                    throw apiError;
                }
            }

            // Fallback: Check login response data (security: only for UI, not access control)
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                try {
                    const userData = JSON.parse(storedUser);
                    
                    // If login response has effectiveRole, use it
                    if (userData.effectiveRole) {
                        this.currentRole = userData.effectiveRole;
                        console.log('🔄 Role Manager using login response effectiveRole:', this.currentRole);
                    } else {
                        // Fallback to role detection
                        this.currentRole = this.detectRole(userData);
                        console.log('🔄 Role Manager using fallback detection:', this.currentRole);
                    }
                    
                    // Create basic roleInfo for fallback (UI only)
                    this.roleInfo = {
                        effectiveRole: this.currentRole,
                        title: this.getUserTitle(),
                        level: this.currentRole === 'admin' ? 3 : this.currentRole === 'seller' ? 2 : 1,
                        isBuyer: true,
                        isSeller: this.currentRole === 'seller' || this.currentRole === 'admin',
                        isAdmin: this.currentRole === 'admin',
                        permissions: this.getFallbackPermissions(this.currentRole)
                    };
                    
                    // Don't store role info in localStorage for security
                    this.isInitialized = true;
                    
                    return this.roleInfo;
                } catch (error) {
                    console.error('❌ Fallback role detection failed:', error);
                    // Don't default to buyer - require proper initialization
                    this.currentRole = null;
                    throw error;
                }
            } else {
                // No user data available
                this.currentRole = null;
                throw new Error('No user data available');
            }
        } catch (error) {
            console.error('❌ Role Manager initialization failed:', error);
            this.currentRole = null;
            this.isInitialized = false;
            throw error;
        }
    }

    // Basic JWT token format validation
    _isValidTokenFormat(token) {
        if (!token || typeof token !== 'string') return false;
        
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        try {
            // Try to decode header and payload (basic validation)
            // Use try-catch for each decode to handle malformed tokens
            const header = JSON.parse(atob(parts[0]));
            const payload = JSON.parse(atob(parts[1]));
            
            // Basic structure validation
            return header && payload && typeof header === 'object' && typeof payload === 'object';
        } catch (e) {
            console.warn('Invalid JWT token format:', e.message);
            return false;
        }
    }

    // Get fallback permissions for basic functionality
    getFallbackPermissions(role) {
        switch (role) {
            case 'admin':
                return ['*'];
            case 'seller':
                return ['buy_products', 'view_orders', 'write_reviews', 'manage_cart', 'view_profile', 
                        'sell_products', 'manage_products', 'view_sales_analytics', 'manage_orders', 
                        'view_seller_dashboard', 'seller_verification'];
            case 'buyer':
            default:
                return ['buy_products', 'view_orders', 'write_reviews', 'manage_cart', 'view_profile'];
        }
    }

    // Detect role from user data (legacy compatibility) - matches server logic
    detectRole(userData) {
        console.log('🔍 DETECT ROLE - Input userData:', userData);
        
        // Use same logic as server getEffectiveRole function
        if (userData.isAdmin === true || userData.isAdmin === 'true' || 
            userData.role === 'admin' || userData.role === 'CEO') {
            console.log('✅ Detected: ADMIN role');
            return 'admin';
        }
        
        if (userData.isSeller === true || userData.isSeller === 'true' || 
            userData.role === 'seller') {
            console.log('✅ Detected: SELLER role');
            return 'seller';
        }
        
        console.log('✅ Detected: BUYER role (default)');
        return 'buyer';
    }

    // Check if user can access specific dashboard
    canAccessDashboard(dashboardType) {
        switch (dashboardType) {
            case 'buyer':
                return ['buyer', 'seller', 'admin'].includes(this.currentRole);
            case 'seller':
                return ['seller', 'admin'].includes(this.currentRole);
            case 'admin':
                return this.currentRole === 'admin';
            default:
                return false;
        }
    }

    // Check if user has specific permission
    hasPermission(permission) {
        if (!this.roleInfo || !this.roleInfo.permissions) {
            return false;
        }
        
        return this.roleInfo.permissions.includes('*') || 
               this.roleInfo.permissions.includes(permission);
    }

    /**
     * Check if user can access a specific route
     * @param {string} route - The route to check (e.g., '/dashboard', '/admin')
     * @returns {Promise<boolean>} True if user can access the route
     */
    async canAccessRoute(route) {
        // Wait for initialization if not ready
        if (!this.isInitialized) {
            if (this.initializationLock) {
                // Wait for existing initialization to complete
                try {
                    await this.initializationPromise;
                } catch (error) {
                    console.error('❌ Failed to initialize for access check:', error);
                    return false;
                }
            } else {
                try {
                    this.initializationLock = true;
                    await this.initialize();
                } catch (error) {
                    console.error('❌ Failed to initialize for access check:', error);
                    return false;
                } finally {
                    this.initializationLock = false;
                }
            }
        }
        
        // Remove leading slash for comparison
        const cleanRoute = route.startsWith('/') ? route.substring(1) : route;
        
        // Define route access rules
        const publicRoutes = ['', 'login', 'signup', 'products', 'product', 'faq', 'contact', 'about'];
        const buyerRoutes = [...publicRoutes, 'dashboard', 'orders', 'order', 'cart', 'profile', 'settings', 'messages', 'notifications', 'transactions', 'create-product', 'edit-product', 'my-products', 'seller-verification'];
        const sellerRoutes = [...buyerRoutes, 'seller', 'seller-dashboard', 'seller-shop', 'seller-analytics', 'seller-orders'];
        const adminRoutes = [...sellerRoutes, 'admin', 'admin-users', 'admin-seller-applications', 'admin-account-deletions', 'admin-mass-messaging', 'admin-retention', 'admin-asset-library', 'marketing-dashboard', 'marketing', 'admin-transactions', 'admin-disputes', 'admin-support', 'admin-live-chat', 'admin-maintenance', 'admin-maintenance-reports', 'admin-ui-queries', 'admin-transaction-reports', 'admin-risk-management', 'admin-analytics-reports', 'admin-growth-metrics', 'admin-about'];
        
        // Check access based on role
        return (() => {
            switch (this.currentRole) {
                case 'admin':
                    return adminRoutes.includes(cleanRoute);
                case 'seller':
                    return sellerRoutes.includes(cleanRoute);
                case 'buyer':
                    return buyerRoutes.includes(cleanRoute);
                default:
                    // Not logged in, only public routes accessible
                    return publicRoutes.includes(cleanRoute);
            }
        })();
    }

    // Get user display title
    getUserTitle() {
        return this.roleInfo?.title || 'User';
    }

    // Get current role
    getCurrentRole() {
        return this.currentRole;
    }

    // Check if user is admin
    isAdmin() {
        return this.currentRole === 'admin';
    }

    // Check if user is seller (or admin)
    isSeller() {
        return ['seller', 'admin'].includes(this.currentRole);
    }

    // Check if user is buyer (all roles)
    isBuyer() {
        return true; // All users are buyers at minimum
    }

    // Update UI elements based on role
    updateUI() {
        // Update navigation elements
        this.updateNavigation();
        
        // Update dashboard access
        this.updateDashboardAccess();
        
        // Update role-specific UI elements
        this.updateRoleSpecificUI();
    }

    // Update navigation menus
    updateNavigation() {
        // Seller navigation
        const sellerElements = document.querySelectorAll('[data-require-seller]');
        sellerElements.forEach(element => {
            element.style.display = this.isSeller() ? '' : 'none';
        });

        // Admin navigation
        const adminElements = document.querySelectorAll('[data-require-admin]');
        adminElements.forEach(element => {
            element.style.display = this.isAdmin() ? '' : 'none';
        });

        // Buyer navigation (always visible)
        const buyerElements = document.querySelectorAll('[data-require-buyer]');
        buyerElements.forEach(element => {
            element.style.display = this.isBuyer() ? '' : 'none';
        });
    }

    // Update dashboard access
    updateDashboardAccess() {
        // Show/hide dashboard links based on access
        const buyerDashboardLink = document.querySelector('[data-dashboard="buyer"]');
        const sellerDashboardLink = document.querySelector('[data-dashboard="seller"]');
        const adminDashboardLink = document.querySelector('[data-dashboard="admin"]');

        if (buyerDashboardLink) {
            buyerDashboardLink.style.display = this.canAccessDashboard('buyer') ? '' : 'none';
        }

        if (sellerDashboardLink) {
            sellerDashboardLink.style.display = this.canAccessDashboard('seller') ? '' : 'none';
        }

        if (adminDashboardLink) {
            adminDashboardLink.style.display = this.canAccessDashboard('admin') ? '' : 'none';
        }
    }

    // Update role-specific UI elements
    updateRoleSpecificUI() {
        // Update user role display
        const roleDisplays = document.querySelectorAll('[data-role-display]');
        roleDisplays.forEach(element => {
            element.textContent = this.getUserTitle();
        });

        // Update role badges
        const roleBadges = document.querySelectorAll('[data-role-badge]');
        roleBadges.forEach(badge => {
            badge.className = `role-badge role-${this.currentRole}`;
            badge.textContent = this.getUserTitle();
        });
    }

    // Redirect if user doesn't have access
    async requireDashboardAccess(dashboardType) {
        // Prevent infinite redirect loops
        const cacheKey = `dashboard_access_${dashboardType}`;
        if (this.accessCheckCache.has(cacheKey)) {
            const cachedResult = this.accessCheckCache.get(cacheKey);
            if (!cachedResult) {
                console.warn(`🚫 Access denied (cached): ${dashboardType} dashboard`);
                this._performSafeRedirect(dashboardType);
            }
            return cachedResult;
        }

        // Wait for initialization if not ready, with proper locking
        if (!this.isInitialized) {
            if (this.initializationLock) {
                // Wait for existing initialization to complete
                try {
                    await this.initializationPromise;
                } catch (error) {
                    console.error('❌ Failed to initialize for access check:', error);
                    this.accessCheckCache.set(cacheKey, false);
                    
                    const currentPath = window.location.pathname;
                    const isPublic = ['', '/', '/index.html', '/login', '/signup'].includes(currentPath);
                    
                    if (!isPublic && !currentPath.startsWith('/product/') && !currentPath.startsWith('/category/')) {
                        if (window.router) {
                            window.router.navigate('/login');
                        } else {
                            window.location.href = '/login';
                        }
                    }
                    return false;
                }
            } else {
                try {
                    this.initializationLock = true;
                    await this.initialize();
                } catch (error) {
                    console.error('❌ Failed to initialize for access check:', error);
                    this.accessCheckCache.set(cacheKey, false);

                    const currentPath = window.location.pathname;
                    const isPublic = ['', '/', '/index.html', '/login', '/signup'].includes(currentPath);

                    if (!isPublic && !currentPath.startsWith('/product/') && !currentPath.startsWith('/category/')) {
                        if (window.router) {
                            window.router.navigate('/login');
                        } else {
                            window.location.href = '/login';
                        }
                    }
                    return false;
                } finally {
                    this.initializationLock = false;
                }
            }
        }

        const hasAccess = this.canAccessDashboard(dashboardType);
        this.accessCheckCache.set(cacheKey, hasAccess);

        if (!hasAccess) {
            console.warn(`🚫 Access denied: ${dashboardType} dashboard`);
            this._performSafeRedirect(dashboardType);
            return false;
        }
        return true;
    }

    _performSafeRedirect(dashboardType) {
        // Prevent redirect loops by checking current page and redirect history
        const currentPath = window.location.pathname;
        
        // Track redirect attempts to prevent loops
        if (!this.redirectAttempts) {
            this.redirectAttempts = new Map();
        }
        
        const attemptKey = `${dashboardType}_${currentPath}`;
        const attempts = this.redirectAttempts.get(attemptKey) || 0;
        
        if (attempts >= 1) {
            console.error('🚫 Redirect loop detected, stopping redirects');
            if (window.router) {
                window.router.navigate('/');
            } else {
                window.location.href = '/login';
            }
            return;
        }
        
        this.redirectAttempts.set(attemptKey, attempts + 1);
        
        // Don't redirect to same page
        if (dashboardType === 'buyer' && currentPath.includes('dashboard')) {
            return;
        }
        if (dashboardType === 'seller' && currentPath.includes('seller-dashboard')) {
            return;
        }
        if (dashboardType === 'admin' && currentPath.includes('admin')) {
            return;
        }

        // Smart redirect logic - redirect to the highest privilege dashboard user can access
        if (this.canAccessDashboard('admin') && !currentPath.includes('admin')) {
            if (window.router) window.router.navigate('/admin');
            else window.location.href = '/admin';
        } else if (this.canAccessDashboard('seller') && !currentPath.includes('seller-dashboard')) {
            if (window.router) window.router.navigate('/seller-dashboard');
            else window.location.href = '/seller-dashboard';
        } else if (this.canAccessDashboard('buyer') && !currentPath.includes('dashboard')) {
            if (window.router) window.router.navigate('/dashboard');
            else window.location.href = '/dashboard';
        } else if (!currentPath.includes('login')) {
            if (window.router) window.router.navigate('/login');
            else window.location.href = '/login';
        }
    }

    // Cache cleanup methods
    startCacheCleanup() {
        // Clear any existing interval first
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        // Remove existing event listener to prevent duplicates
        if (this._beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this._beforeUnloadHandler);
        }
        
        // Create new cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanupCache();
        }, this.cacheCleanupInterval);
        
        // Create and store event handler reference
        this._beforeUnloadHandler = () => {
            this.clearCaches();
        };
        
        // Add cleanup on page unload to prevent memory leaks
        window.addEventListener('beforeunload', this._beforeUnloadHandler);
    }

    cleanupCache() {
        // Remove oldest entries if cache is too large - use more efficient approach
        if (this.accessCheckCache.size > this.cacheMaxSize) {
            const entriesToDelete = this.accessCheckCache.size - this.cacheMaxSize;
            const keys = this.accessCheckCache.keys();
            
            // Delete oldest entries using iterator (more efficient than creating array)
            for (let i = 0; i < entriesToDelete; i++) {
                const key = keys.next().value;
                if (key) {
                    this.accessCheckCache.delete(key);
                }
            }
        }
        
        // Clear redirect attempts periodically
        if (this.redirectAttempts && this.redirectAttempts.size > 20) {
            this.redirectAttempts.clear();
        }
    }

    // Clear access cache only (for role changes)
    clearAccessCache() {
        this.accessCheckCache.clear();
    }

    // Clear all authentication data
    clearAllData() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        localStorage.removeItem('roleInfo');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('isSeller');
        localStorage.removeItem('isBuyer');
        sessionStorage.clear();
    }

    // Clear all caches (useful for logout)
    clearCaches() {
        this.accessCheckCache.clear();
        if (this.redirectAttempts) {
            this.redirectAttempts.clear();
        }
        
        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        // Remove event listener
        if (this._beforeUnloadHandler) {
            window.removeEventListener('beforeunload', this._beforeUnloadHandler);
            this._beforeUnloadHandler = null;
        }
    }
}

// Create global instance
window.roleManager = new RoleManager();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await window.roleManager.initialize();
        window.roleManager.updateUI();
    } catch (error) {
        console.error('❌ Failed to initialize role manager:', error);
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoleManager;
}

// Close the conditional class declaration block
}
