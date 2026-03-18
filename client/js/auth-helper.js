// Global Authentication Helper - Auto-loads token manager on all pages
(function() {
    'use strict';

    // Check if token manager is available and initialize it
    function initializeTokenManager() {
        if (window.TokenManager && !window.tokenManager) {
            console.log('� Initializing token manager...');
            window.tokenManager = new window.TokenManager();
            console.log('✅ Token manager initialized');
        }
    }

    // Load token manager if user is authenticated
    function loadTokenManager() {
        const token = localStorage.getItem('token');
        
        if (token) {
            console.log('� User authenticated, initializing token manager...');
            initializeTokenManager();
        } else {
            console.log('👤 No token found, user not authenticated');
        }
    }

    // Load token manager when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadTokenManager);
    } else {
        loadTokenManager();
    }

    // Export helper functions
    window.authHelper = {
        // Get current token (refreshes if needed)
        async getCurrentToken() {
            if (window.tokenManager) {
                return await window.tokenManager.getCurrentToken();
            }
            return localStorage.getItem('token');
        },
        
        // Check if user is authenticated
        isAuthenticated() {
            return !!localStorage.getItem('token');
        },
        
        // Logout user
        logout() {
            if (window.tokenManager) {
                window.tokenManager.destroy();
            }
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userId');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userFullName');
            
            window.location.href = '/login.html';
        },
        
        // Make authenticated API call with auto-refresh
        async authenticatedFetch(url, options = {}) {
            const token = await this.getCurrentToken();
            
            if (!token) {
                throw new Error('No authentication token available');
            }
            
            // Ensure URL is absolute using API_BASE
            const fullUrl = url.startsWith('http') ? url : url.startsWith('/api/') ? `${API_BASE.replace('/api', '')}${url}` : `${API_BASE}${url}`;
            
            const authOptions = {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`
                }
            };
            
            return fetch(fullUrl, authOptions);
        }
    };

})();
