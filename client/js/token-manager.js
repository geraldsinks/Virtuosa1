// Token Manager - Automatic Token Refresh and Reconnection
// API_BASE is provided by config.js

class TokenManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.refreshPromise = null;
        this.refreshTimeout = null;
        this.socket = null;
        this.isRefreshing = false;

        // Auto-refresh 5 minutes before expiration
        this.REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes

        this.init();
    }

    init() {
        console.log('🔧 Token manager init called, token present:', !!this.token);
        if (this.token) {
            console.log('🔧 Scheduling token refresh and monitoring...');
            this.scheduleTokenRefresh();
            this.startTokenMonitoring();
            console.log('✅ Token manager initialization complete');
        } else {
            console.log('⚠️ No token found during initialization');
        }
    }

    // Parse JWT token to get expiration time
    parseToken(token) {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return {
                userId: payload.userId,
                email: payload.email,
                role: payload.role,
                isAdmin: payload.isAdmin,
                exp: payload.exp * 1000, // Convert to milliseconds
                iat: payload.iat * 1000
            };
        } catch (error) {
            console.error('Error parsing token:', error);
            return null;
        }
    }

    // Get time until token expires
    getTimeUntilExpiration() {
        const tokenData = this.parseToken(this.token);
        if (!tokenData) return 0;

        return tokenData.exp - Date.now();
    }

    // Schedule automatic token refresh
    scheduleTokenRefresh() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }

        const timeUntilExpiration = this.getTimeUntilExpiration();
        console.log('⏰ Time until expiration:', Math.round(timeUntilExpiration / 1000), 'seconds');

        if (timeUntilExpiration <= 0) {
            console.log('🚨 Token already expired, refreshing immediately');
            this.refreshToken();
            return;
        }

        // Refresh 5 minutes before expiration
        const refreshTime = Math.max(timeUntilExpiration - this.REFRESH_BUFFER, 0);
        console.log('⏰ Scheduling refresh in', Math.round(refreshTime / 1000), 'seconds');

        this.refreshTimeout = setTimeout(() => {
            console.log('⏰ Scheduled refresh triggered');
            this.refreshToken();
        }, refreshTime);
    }

    // Refresh the token
    async refreshToken() {
        if (this.isRefreshing) {
            console.log('Token refresh already in progress, waiting...');
            return this.refreshPromise;
        }

        this.isRefreshing = true;
        console.log('Starting automatic token refresh...');

        this.refreshPromise = new Promise(async (resolve, reject) => {
            try {
                const response = await fetch(`${API_BASE}/auth/refresh`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();

                    // Update token and user data
                    this.token = data.token;
                    localStorage.setItem('token', data.token);

                    // Update user data if available
                    if (data.user) {
                        localStorage.setItem('user', JSON.stringify(data.user));
                        localStorage.setItem('userId', data.user.id);
                    }

                    console.log('✅ Token refreshed successfully');

                    // Reconnect socket if available
                    if (this.socket) {
                        this.reconnectSocket();
                    }

                    // Schedule next refresh
                    this.scheduleTokenRefresh();

                    resolve(data);
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    console.error('Token refresh failed:', errorData.message || 'Unknown error');

                    // If refresh fails, redirect to login
                    this.handleRefreshFailure(errorData.message || 'Token refresh failed');

                    reject(new Error(errorData.message || 'Token refresh failed'));
                }
            } catch (error) {
                console.error('Token refresh error:', error);
                this.handleRefreshFailure('Network error during token refresh');
                reject(error);
            } finally {
                this.isRefreshing = false;
                this.refreshPromise = null;
            }
        });

        return this.refreshPromise;
    }

    // Handle token refresh failure
    handleRefreshFailure(message) {
        console.error('Token refresh failed:', message);

        // Show user notification
        this.showNotification('Session Expired', message, 'error', () => {
            // Redirect to login
            window.location.href = '/login.html';
        });

        // Clear all storage on session expiration
        localStorage.clear();
        sessionStorage.clear();

        // Clear refresh timeout
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
    }

    // Reconnect socket with new token
    reconnectSocket() {
        if (this.socket && this.socket.connected) {
            console.log('Re-authenticating socket with new token...');
            this.socket.emit('authenticate', this.token);
        } else if (this.socket) {
            console.log('Reconnecting socket with new token...');
            this.socket.disconnect();
            this.socket.connect();
        }
    }

    // Start monitoring token expiration
    startTokenMonitoring() {
        // Check token every minute
        setInterval(() => {
            const timeUntilExpiration = this.getTimeUntilExpiration();

            if (timeUntilExpiration <= 0) {
                console.log('Token expired during monitoring, refreshing...');
                this.refreshToken();
            } else if (timeUntilExpiration <= this.REFRESH_BUFFER) {
                console.log(`Token expires in ${Math.round(timeUntilExpiration / 1000)} seconds, refresh scheduled`);
            }
        }, 60000); // Check every minute
    }

    // Show notification to user
    showNotification(title, message, type = 'info', actionCallback = null) {
        const colors = {
            info: 'bg-blue-100 border-blue-500 text-blue-700',
            success: 'bg-green-100 border-green-500 text-green-700',
            warning: 'bg-yellow-100 border-yellow-500 text-yellow-700',
            error: 'bg-red-100 border-red-500 text-red-700'
        };

        const notificationDiv = document.createElement('div');
        notificationDiv.className = `fixed top-4 right-4 ${colors[type]} border-l-4 p-4 rounded shadow-lg z-50 max-w-md`;
        notificationDiv.innerHTML = `
            <div class="flex">
                <div class="py-1">
                    <div class="text-lg font-bold">${title}</div>
                    <p class="text-sm mt-1">${message}</p>
                    ${actionCallback ? `
                        <button onclick="this.parentElement.parentElement.parentElement.parentElement.remove(); ${actionCallback.name}()" 
                                class="mt-2 bg-${type === 'error' ? 'red' : 'blue'}-500 text-white px-3 py-1 rounded text-sm hover:bg-${type === 'error' ? 'red' : 'blue'}-600">
                            ${type === 'error' ? 'Login Again' : 'Continue'}
                        </button>
                    ` : ''}
                </div>
                <div class="ml-auto">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            class="text-gray-400 hover:text-gray-600">
                        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                        </svg>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(notificationDiv);

        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (notificationDiv.parentNode) {
                notificationDiv.parentNode.removeChild(notificationDiv);
            }
        }, 10000);
    }

    // Get current token (refresh if needed)
    async getCurrentToken() {
        if (!this.token) {
            return null;
        }

        const timeUntilExpiration = this.getTimeUntilExpiration();

        // If token expires within 5 minutes, refresh it
        if (timeUntilExpiration <= this.REFRESH_BUFFER) {
            try {
                await this.refreshToken();
            } catch (error) {
                console.error('Failed to refresh token:', error);
                return null;
            }
        }

        return this.token;
    }

    // Set socket instance for reconnection
    setSocket(socket) {
        this.socket = socket;
    }

    // Cleanup
    destroy() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
        }
        this.isRefreshing = false;
        this.refreshPromise = null;
    }
}

// Global token manager instance
if (typeof window !== 'undefined') {
    window.tokenManager = new TokenManager();
    console.log('✅ Token manager initialized globally');
}
