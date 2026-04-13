// Enhanced Notifications System with Real-time Updates and Push Notifications
class NotificationManager {
    constructor() {
        this.socket = null;
        this.token = localStorage.getItem('token');
        this.unreadCount = 0;
        this.isOnline = navigator.onLine;
        this.pushSubscription = null;
        this.notificationContainer = document.getElementById('notifications-container');
        this.isInitialized = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        
        // Ensure singleton pattern
        if (window.notificationManager) {
            console.warn('NotificationManager already exists, cleaning up previous instance');
            window.notificationManager.cleanup();
        }
        
        window.notificationManager = this;
        this.init();
    }

    async init() {
        if (this.isInitialized) {
            console.log('NotificationManager already initialized');
            return;
        }

        if (!this.token) {
            const pathname = window.location.pathname || '';
            // Check if route is public or protected
            let isProtected = false;
            
            if (window.NavigationCoordinator && typeof window.NavigationCoordinator.getInstance === 'function') {
                const nav = window.NavigationCoordinator.getInstance();
                isProtected = nav.isProtectedRoute(pathname);
            } else {
                // Fallback list of public paths if coordinator not available
                const publicPaths = ['', '/', '/index.html', '/login', '/signup', '/products', '/search', '/about', '/contact', '/faq', '/privacy', '/terms', '/refund-policy', '/seller-shop', '/reviews'];
                const normalizedPath = pathname.replace(/^\/pages\//, '/').split('?')[0];
                
                isProtected = !publicPaths.includes(normalizedPath) && 
                             !pathname.startsWith('/product/') && 
                             !pathname.startsWith('/category/') &&
                             !pathname.startsWith('/seller/');
            }

            if (isProtected) {
                console.log('NotificationManager: Redirecting unauthenticated user from protected route:', pathname);
                window.location.href = '/login';
            }
            return;
        }

        // Only proceed if container exists or we're on a page that needs notifications
        if (!this.notificationContainer && !this.shouldShowNotifications()) {
            console.log('Notifications not needed on this page');
            return;
        }

        await this.initSocketConnection();
        await this.initPushNotifications();
        this.setupOnlineStatusListeners();
        this.loadInitialNotifications();
        this.isInitialized = true;
    }

    shouldShowNotifications() {
        // Show notification badge on pages with user menu/dropdown or any notification identifier
        return document.getElementById('user-menu') || 
               document.getElementById('notification-badge') ||
               document.querySelector('.notification-badge') ||
               document.getElementById('mobile-notification-badge') ||
               window.location.pathname.includes('notifications');
    }

    async initSocketConnection() {
        // Clean up existing socket if any
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }

        try {
            this.socket = io(window.SOCKET_URL, {
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true,
                timeout: 10000,
                forceNew: true
            });
            
            // Reset reconnect attempts on successful connection
            this.socket.on('connect', () => {
                console.log('Socket connected successfully');
                this.reconnectAttempts = 0;
                this.authenticateSocket();
            });

            // Handle connection errors with reconnection logic
            this.socket.on('connect_error', (error) => {
                console.error('Socket connection error:', error);
                this.handleConnectionError(error);
            });

            // Handle disconnection
            this.socket.on('disconnect', (reason) => {
                console.log('Socket disconnected:', reason);
                this.handleDisconnection(reason);
            });

            // Authenticate socket
            this.authenticateSocket();

            // Socket event listeners
            this.socket.on('authenticated', () => {
                console.log('Socket authenticated successfully');
                this.socket.emit('get_notification_counts');
            });

            this.socket.on('token_expired', (data) => {
                console.log('Token expired:', data);
                this.handleTokenExpired();
            });

            this.socket.on('auth_error', (data) => {
                console.error('Socket auth error:', data);
                this.handleAuthError();
            });

            // Real-time notification events
            this.socket.on('new_notification', (notification) => {
                try {
                    console.log('New notification received:', notification);
                    this.handleNewNotification(notification);
                } catch (error) {
                    console.error('Error handling new notification:', error);
                    // Continue handling other events even if this one fails
                }
            });

            this.socket.on('notification_count_updated', (data) => {
                try {
                    console.log('Notification count updated:', data);
                    this.updateNotificationCounts(data);
                } catch (error) {
                    console.error('Error handling notification count update:', error);
                    // Fallback: refresh counts from server
                    this.loadNotificationCounts();
                }
            });

            this.socket.on('notifications_data', (data) => {
                try {
                    console.log('Notifications data received:', data);
                    this.displayNotifications(data.notifications);
                } catch (error) {
                    console.error('Error handling notifications data:', error);
                    // Show error state in UI
                    this.showNotificationError();
                }
            });

            this.socket.on('notifications_marked_read', (data) => {
                try {
                    console.log('Notifications marked as read:', data);
                    this.loadNotificationCounts();
                    // Refresh notifications list if on notifications page
                    if (this.notificationContainer) {
                        this.loadNotifications();
                    }
                } catch (error) {
                    console.error('Error handling notifications marked read:', error);
                    // Fallback: refresh manually
                    this.loadNotificationCounts();
                }
            });

            this.socket.on('notification_counts_updated', (counts) => {
                try {
                    console.log('Notification counts updated:', counts);
                    this.updateNotificationCounts(counts);
                } catch (error) {
                    console.error('Error handling notification counts update:', error);
                }
            });

            this.socket.on('order_status_updated', (data) => {
                try {
                    console.log('Order status updated:', data);
                    this.handleOrderUpdate(data);
                } catch (error) {
                    console.error('Error handling order status update:', error);
                }
            });

        } catch (error) {
            console.error('Socket initialization error:', error);
            this.handleConnectionError(error);
        }
    }

    authenticateSocket() {
        if (this.socket && this.token) {
            this.socket.emit('authenticate', this.token);
        }
    }

    handleConnectionError(error) {
        console.error('Connection error:', error);
        if (!this.isOnline) {
            this.showToast('You are offline. Notifications will sync when you reconnect.', 'error');
        } else {
            // Attempt to reconnect with exponential backoff
            this.attemptReconnection();
        }
    }

    attemptReconnection() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.showToast('Connection failed. Please refresh the page.', 'error');
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Max 30 seconds
        
        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        setTimeout(() => {
            if (!this.socket?.connected) {
                this.initSocketConnection();
            }
        }, delay);
    }

    handleDisconnection(reason) {
        console.log('Disconnected:', reason);
        if (reason === 'io server disconnect') {
            // Server disconnected, reconnect manually
            this.attemptReconnection();
        }
    }

    async initPushNotifications() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log('Push notifications not supported');
            return;
        }

        try {
            // Get VAPID public key from server
            const vapidResponse = await fetch(`${API_BASE}/notifications/vapid-public-key`);
            if (!vapidResponse.ok) {
                throw new Error(`Failed to get VAPID public key: ${vapidResponse.status}`);
            }
            
            const vapidData = await vapidResponse.json();

            if (!vapidData.publicKey) {
                console.error('Failed to get VAPID public key - missing in response');
                return;
            }

            // Request notification permission first
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('Notification permission denied:', permission);
                this.showToast('Please enable notifications to stay updated', 'info');
                return;
            }

            // Register service worker
            let registration;
            try {
                const swUrl = '/sw.js?apiBase=' + encodeURIComponent(window.API_BASE || '');
                registration = await navigator.serviceWorker.register(swUrl);
                console.log('Service Worker registered successfully');
            } catch (error) {
                console.error('Service Worker registration failed:', error);
                this.showToast('Failed to enable background notifications', 'error');
                return;
            }

            // Check existing subscription
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                try {
                    // Subscribe to push notifications
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: this.urlBase64ToUint8Array(vapidData.publicKey)
                    });
                    console.log('Push subscription created successfully');
                } catch (subscribeError) {
                    console.error('Push subscription failed:', subscribeError);
                    
                    // Handle specific subscription errors
                    if (subscribeError.name === 'NotAllowedError') {
                        this.showToast('Notifications are blocked in your browser', 'error');
                    } else if (subscribeError.name === 'AbortError') {
                        this.showToast('Notification setup was cancelled', 'error');
                    } else {
                        this.showToast('Failed to enable push notifications', 'error');
                    }
                    return;
                }
            } else {
                console.log('Using existing push subscription');
            }

            this.pushSubscription = subscription;
            
            // Send subscription to server
            try {
                await this.sendPushSubscriptionToServer(subscription);
                console.log('Push subscription sent to server successfully');
            } catch (serverError) {
                console.error('Failed to send push subscription to server:', serverError);
                this.showToast('Failed to save notification preferences', 'error');
            }

        } catch (error) {
            console.error('Push notification setup error:', error);
            this.showToast('Failed to set up notifications', 'error');
        }
    }

    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    async sendPushSubscriptionToServer(subscription) {
        try {
            await fetch(`${API_BASE}/notifications/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ subscription })
            });
        } catch (error) {
            console.error('Failed to send push subscription:', error);
        }
    }

    setupOnlineStatusListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Back online');
            if (this.socket && !this.socket.connected) {
                this.reconnectAttempts = 0;
                this.attemptReconnection();
            }
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Gone offline');
        });

        // Add page unload cleanup
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });

        // Add visibility change handling
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                // Page is hidden, consider cleanup
                this.cleanup();
            } else if (document.visibilityState === 'visible' && !this.socket?.connected && this.token) {
                // Page is visible and socket is disconnected, reconnect
                this.reconnectAttempts = 0;
                this.initSocketConnection();
            }
        });
    }

    async loadInitialNotifications() {
        if (this.notificationContainer) {
            await this.loadNotifications();
        }
        await this.loadNotificationCounts();
    }

    async loadNotifications(page = 1, status = 'all') {
        try {
            const response = await fetch(`${API_BASE}/notifications?page=${page}&status=${status}`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load notifications');
            }

            const data = await response.json();
            this.displayNotifications(data.notifications);
            this.updateHeaderBadge(data.unreadCount || 0);
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.showNotificationError();
        }
    }

    async loadNotificationCounts() {
        try {
            const response = await fetch(`${API_BASE}/notifications/counts`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const counts = await response.json();
                this.updateNotificationCounts(counts);
            }
        } catch (error) {
            console.error('Error loading notification counts:', error);
        }
    }

    displayNotifications(data) {
        if (!this.notificationContainer) return;

        const notifications = data?.notifications || data || [];
        
        if (!notifications || notifications.length === 0) {
            this.notificationContainer.innerHTML = `
                <div class="p-8 text-center text-gray-500">
                    <i class="far fa-bell text-4xl mb-4 text-gray-300"></i>
                    <p class="text-lg">You don't have any notifications yet</p>
                </div>
            `;
            return;
        }

        let html = '<div class="divide-y divide-gray-200">';

        notifications.forEach(notif => {
            const icon = this.getIconForType(notif.type);
            const statusClass = notif.status === 'unread' ? 'notification-unread' : 'notification-read';
            const date = new Date(notif.createdAt);
            const timeAgo = this.getTimeAgo(date);

            html += `
                <div class="p-4 sm:p-6 hover:bg-gray-50 cursor-pointer transition-colors ${statusClass}" 
                     data-notification-id="${this.escapeHtml(notif._id)}" 
                     data-action-url="${this.escapeHtml(notif.data?.actionUrl || '')}"
                     onclick="notificationManager.handleNotificationClick(this.dataset.notificationId, this.dataset.actionUrl)">
                    <div class="flex items-start">
                        <div class="flex-shrink-0 mt-1">
                            ${this.getIconForType(notif.type)}
                        </div>
                        <div class="ml-4 flex-1">
                            <h4 class="text-sm font-semibold text-gray-900">${this.escapeHtml(notif.title)}</h4>
                            <p class="mt-1 text-sm text-gray-600">${this.escapeHtml(notif.message)}</p>
                            ${notif.data?.actionText && notif.data?.actionUrl ? 
                                `<button class="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors"
                                        data-action-url="${this.escapeHtml(notif.data.actionUrl)}"
                                        onclick="window.location.href=this.dataset.actionUrl">
                                    ${this.escapeHtml(notif.data.actionText)}
                                </button>` : ''
                            }
                            <p class="mt-2 text-xs text-gray-400">${this.getTimeAgo(new Date(notif.createdAt))}</p>
                        </div>
                        <div class="ml-4 flex items-center space-x-2">
                            ${notif.status === 'unread' ? '<div class="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse"></div>' : ''}
                            <button onclick="event.stopPropagation(); notificationManager.deleteNotification('${this.escapeHtml(notif._id)}')" 
                                    class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete notification">
                                <i class="fas fa-trash text-sm"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        this.notificationContainer.innerHTML = html;
    }

    getIconForType(type) {
        const iconMap = {
            'new_order': '<div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><i class="fas fa-shopping-cart text-green-600"></i></div>',
            'order_confirmed': '<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><i class="fas fa-check-circle text-blue-600"></i></div>',
            'order_shipped': '<div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"><i class="fas fa-truck text-purple-600"></i></div>',
            'order_delivered': '<div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center"><i class="fas fa-box text-yellow-600"></i></div>',
            'delivery_confirmed': '<div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><i class="fas fa-check-double text-green-600"></i></div>',
            'payment_received': '<div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><i class="fas fa-money-bill-wave text-green-600"></i></div>',
            'payment_failed': '<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><i class="fas fa-exclamation-triangle text-red-600"></i></div>',
            'product_approved': '<div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><i class="fas fa-check-circle text-green-600"></i></div>',
            'product_rejected': '<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><i class="fas fa-times-circle text-red-600"></i></div>',
            'account_verified': '<div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"><i class="fas fa-user-check text-purple-600"></i></div>',
            'promotion': '<div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center"><i class="fas fa-bullhorn text-yellow-600"></i></div>',
            'system': '<div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><i class="fas fa-info-circle text-gray-600"></i></div>',
            'message': '<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><i class="fas fa-envelope text-blue-600"></i></div>',
            'review_received': '<div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center"><i class="fas fa-star text-yellow-600"></i></div>',
            'token_earned': '<div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center"><i class="fas fa-coins text-yellow-600"></i></div>'
        };

        return iconMap[type] || iconMap['system'];
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + ' years ago';

        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + ' months ago';

        interval = seconds / 86400;
        if (interval > 1) {
            if (Math.floor(interval) === 1) return 'Yesterday';
            return Math.floor(interval) + ' days ago';
        }

        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + ' hours ago';

        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + ' minutes ago';

        return 'Just now';
    }

    handleNewNotification(notification) {
        // Update counts
        this.loadNotificationCounts();
        
        // Show toast if not on notifications page
        if (window.location.pathname !== '/notifications') {
            this.showNotificationToast(notification);
        }

        // Show browser notification if permission granted
        this.showBrowserNotification(notification);

        // Reload notifications if on notifications page
        if (this.notificationContainer) {
            this.loadNotifications();
        }
    }

    handleOrderUpdate(data) {
        this.loadNotificationCounts();
        
        if (window.location.pathname !== '/notifications') {
            this.showOrderUpdateToast(data);
        }

        if (this.notificationContainer) {
            this.loadNotifications();
        }
    }

    async handleNotificationClick(id, link) {
        try {
            // Mark as read via socket for real-time update
            if (this.socket) {
                this.socket.emit('mark_notifications_read', [id]);
            } else {
                // Fallback to HTTP
                await fetch(`${API_BASE}/notifications/${id}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
            }

            // Navigate if link exists
            if (link && link !== 'null' && link !== 'undefined' && link !== '') {
                window.location.href = link;
            } else if (this.notificationContainer) {
                this.loadNotifications(); // Reload to update UI
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
            if (link && link !== 'null' && link !== 'undefined' && link !== '') {
                window.location.href = link;
            }
        }
    }

    async deleteNotification(id) {
        if (!confirm('Are you sure you want to delete this notification?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                if (this.notificationContainer) {
                    this.loadNotifications();
                }
                this.loadNotificationCounts();
                this.showToast('Notification deleted successfully', 'success');
            } else {
                throw new Error('Failed to delete notification');
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            this.showToast('Failed to delete notification', 'error');
        }
    }

    async markAllAsRead() {
        try {
            if (this.socket) {
                this.socket.emit('mark_notifications_read'); // Mark all as read
            } else {
                // Fallback to HTTP
                await fetch(`${API_BASE}/notifications/read`, {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    }
                });
            }
            
            this.loadNotificationCounts();
            if (this.notificationContainer) {
                this.loadNotifications();
            }
        } catch (error) {
            console.error('Error marking all as read:', error);
        }
    }

    updateNotificationCounts(counts) {
        this.unreadCount = counts.unreadCount || counts.unread || counts.count || 0;
        this.updateHeaderBadge(this.unreadCount);
    }

    updateHeaderBadge(unreadCount) {
        const badges = document.querySelectorAll('.notification-badge, #notification-badge, #notification-badge-count, #mobile-notification-badge');
        badges.forEach(badge => {
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('hidden');
                badge.classList.add('animate-pulse');
                setTimeout(() => badge.classList.remove('animate-pulse'), 2000);
            } else {
                badge.textContent = '0';
                badge.classList.add('hidden');
            }
        });
    }

    showNotificationToast(notification) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50 transform translate-x-full transition-transform duration-300 border-l-4 border-blue-500';
        toast.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    ${this.getIconForType(notification.type)}
                </div>
                <div class="flex-1">
                    <h4 class="text-sm font-semibold text-gray-900">${notification.title}</h4>
                    <p class="text-sm text-gray-600 mt-1">${notification.message}</p>
                    <p class="text-xs text-gray-400 mt-1">${this.getTimeAgo(new Date(notification.createdAt))}</p>
                    ${notification.data?.actionText ? 
                        `<button onclick="window.location.href='${notification.data.actionUrl}'" class="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded-full hover:bg-blue-700 transition-colors">
                            ${notification.data.actionText}
                        </button>` : ''
                    }
                </div>
                <button class="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    showOrderUpdateToast(data) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50 transform translate-x-full transition-transform duration-300 border-l-4 border-green-500';
        toast.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    <div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <i class="fas fa-truck text-green-600"></i>
                    </div>
                </div>
                <div class="flex-1">
                    <h4 class="text-sm font-semibold text-gray-900">${this.escapeHtml(data.notification.title)}</h4>
                    <p class="text-sm text-gray-600 mt-1">${this.escapeHtml(data.notification.message)}</p>
                    <p class="text-xs text-gray-400 mt-1">${this.getTimeAgo(new Date(data.timestamp))}</p>
                </div>
                <button class="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    showBrowserNotification(notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const browserNotif = new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: notification._id,
                requireInteraction: notification.priority === 'high' || notification.priority === 'critical'
            });

            browserNotif.onclick = () => {
                window.focus();
                if (notification.data?.actionUrl) {
                    window.location.href = notification.data.actionUrl;
                }
                browserNotif.close();
            };

            // Auto close after 5 seconds for normal notifications
            if (notification.priority !== 'critical') {
                setTimeout(() => browserNotif.close(), 5000);
            }
        }
    }

    showNotificationError() {
        if (this.notificationContainer) {
            this.notificationContainer.innerHTML = `
                <div class="p-8 text-center text-red-500">
                    <i class="fas fa-exclamation-circle text-3xl mb-4"></i>
                    <p>Failed to load notifications. Please try again later.</p>
                    <button onclick="notificationManager.loadNotifications()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Retry
                    </button>
                </div>
            `;
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
        
        toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-y-full transition-transform duration-300`;
        toast.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-y-full');
        }, 100);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-y-full');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    cleanup() {
        console.log('🧹 Cleaning up NotificationManager');
        
        // Clean up socket connection
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
            console.log('🔌 Socket connection cleaned up');
        }
        
        // Reset state
        this.isInitialized = false;
        this.reconnectAttempts = 0;
        
        // Clear any pending timeouts or intervals
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        
        console.log('✅ NotificationManager cleanup complete');
    }

    handleTokenExpired() {
        this.showToast('Your session has expired. Please log in again.', 'error');
        setTimeout(() => {
            localStorage.removeItem('token');
            this.cleanup();
            window.location.href = '/login';
        }, 2000);
    }

    handleAuthError() {
        this.showToast('Authentication error. Please log in again.', 'error');
        setTimeout(() => {
            localStorage.removeItem('token');
            this.cleanup();
            window.location.href = '/login';
        }, 2000);
    }
}

// Initialize notification manager
let notificationManager;
document.addEventListener('DOMContentLoaded', () => {
    notificationManager = new NotificationManager();
    
    // Make notification manager available globally for click handlers
    window.notificationManager = notificationManager;
});

// Request notification permission on page load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
    });
}
