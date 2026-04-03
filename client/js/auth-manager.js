// Shared Authentication Utility
// Provides consistent authentication checking across all components

class AuthManager {
    constructor() {
        this.cachedUserData = null;
        this.cacheExpiry = 0;
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        this.pendingRequest = null; // Track ongoing request
    }

    // Get fresh user data from API with caching
    async getUserData(forceRefresh = false) {
        const token = localStorage.getItem('token');
        
        if (!token) {
            return null;
        }

        // Check cache first
        if (!forceRefresh && this.cachedUserData && Date.now() < this.cacheExpiry) {
            return this.cachedUserData;
        }

        // If there's already a pending request, return it
        if (this.pendingRequest && !forceRefresh) {
            return this.pendingRequest;
        }

        // Validate API_BASE is available
        if (typeof API_BASE === 'undefined') {
            console.error('API_BASE is not defined. Make sure config.js is loaded.');
            return this.cachedUserData || null;
        }

        // Create and track the request
        this.pendingRequest = (async () => {
            try {
                const response = await fetch(`${API_BASE}/user/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const userData = await response.json();
                    
                    // Update cache
                    this.cachedUserData = userData;
                    this.cacheExpiry = Date.now() + this.CACHE_DURATION;
                    
                    // Update localStorage for fallback
                    this.updateLocalStorage(userData);
                    
                    return userData;
                } else {
                    // Token invalid, clear auth
                    this.clearAuth();
                    return null;
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                // Return cached data if available, even if expired
                return this.cachedUserData || null;
            } finally {
                // Clear pending request when done
                this.pendingRequest = null;
            }
        })();

        return this.pendingRequest;
    }

    // Update localStorage with fresh user data
    updateLocalStorage(userData) {
        const isAdmin = userData.isAdmin === true || userData.isAdmin === 'true' || userData.role === 'admin';
        const isSeller = userData.isSeller === true || userData.isSeller === 'true';
        
        localStorage.setItem('isAdmin', isAdmin.toString());
        localStorage.setItem('isSeller', isSeller.toString());
        localStorage.setItem('userRole', userData.role || 'user');
        localStorage.setItem('userFullName', userData.fullName || '');
        localStorage.setItem('userEmail', userData.email || '');
    }

    // Check if user is admin
    async isAdmin() {
        const userData = await this.getUserData();
        if (!userData) return false;
        
        return userData.isAdmin === true || userData.isAdmin === 'true' || userData.role === 'admin';
    }

    // Check if user is seller
    async isSeller() {
        const userData = await this.getUserData();
        if (!userData) return false;
        
        return userData.isSeller === true || userData.isSeller === 'true';
    }

    // Check if user is authenticated
    isAuthenticated() {
        const token = localStorage.getItem('token');
        if (!token) return false;
        
        // Basic token format validation (JWT tokens have 3 parts separated by dots)
        const parts = token.split('.');
        if (parts.length !== 3) return false;
        
        // Check if token is expired (for JWT tokens)
        try {
            const payload = JSON.parse(atob(parts[1]));
            const currentTime = Math.floor(Date.now() / 1000);
            return payload.exp > currentTime;
        } catch (e) {
            // If token parsing fails, assume it's invalid
            console.warn('Token validation failed:', e);
            return false;
        }
    }

    // Clear authentication data
    clearAuth() {
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('isSeller');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userFullName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        
        // Clear cache
        this.cachedUserData = null;
        this.cacheExpiry = 0;
    }

    // Logout user
    async logout() {
        this.clearAuth();
        window.location.href = '/login';
    }

    // Force refresh user data
    async refreshUserData() {
        return await this.getUserData(true);
    }

    // Get user display name
    async getDisplayName() {
        const userData = await this.getUserData();
        return userData?.fullName || userData?.email || 'User';
    }

    // Get token balance
    async getTokenBalance() {
        const userData = await this.getUserData();
        return userData?.tokenBalance || 0;
    }
}

// Create global instance
window.authManager = new AuthManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
}
