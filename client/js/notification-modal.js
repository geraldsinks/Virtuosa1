// Notification Modal System
class NotificationModal {
    constructor() {
        this.modal = null;
        this.overlay = null;
        this.content = null;
        this.notifications = [];
        this.socket = null;
        this.unreadCount = 0;
        this.init();
    }

    init() {
        this.createModal();
        this.setupSocketListeners();
        this.setupEventListeners();
        this.loadNotifications();
    }

    createModal() {
        // Create modal overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'notification-modal-overlay';
        this.overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 hidden transition-opacity duration-300';
        this.overlay.innerHTML = `
            <div class="flex items-center justify-center min-h-screen p-4">
                <div id="notification-modal" class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden transform transition-all duration-300 scale-95 opacity-0">
                    <!-- Modal Header -->
                    <div class="bg-gradient-to-r from-navy to-blue-900 text-white p-6 flex justify-between items-center">
                        <div class="flex items-center space-x-3">
                            <i class="fas fa-bell text-2xl text-gold"></i>
                            <div>
                                <h2 class="text-xl font-bold">Notifications</h2>
                                <p class="text-sm text-gray-300">Stay updated with your order status</p>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2">
                            <button id="mark-all-read-btn" class="px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-colors">
                                Mark All Read
                            </button>
                            <button id="clear-read-btn" class="px-3 py-1 bg-red-500/80 hover:bg-red-600 rounded-lg text-sm transition-colors">
                                Clear Read
                            </button>
                            <button id="close-notification-modal" class="p-2 hover:bg-white/20 rounded-lg transition-colors">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>

                    <!-- Modal Content -->
                    <div class="flex flex-col h-[60vh]">
                        <!-- Notification List -->
                        <div id="notification-list" class="flex-1 overflow-y-auto p-4 space-y-3">
                            <div class="flex items-center justify-center py-12">
                                <i class="fas fa-spinner fa-spin text-3xl text-gold mr-3"></i>
                                <span class="text-gray-600">Loading notifications...</span>
                            </div>
                        </div>

                        <!-- Modal Footer -->
                        <div class="border-t border-gray-200 p-4 bg-gray-50">
                            <div class="flex justify-between items-center">
                                <div class="text-sm text-gray-600">
                                    <span id="notification-count">0</span> notifications
                                </div>
                                <button id="refresh-notifications-btn" class="px-4 py-2 bg-gold text-navy rounded-lg hover:bg-yellow-500 transition-colors font-medium">
                                    <i class="fas fa-sync-alt mr-2"></i>Refresh
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.overlay);
        this.modal = document.getElementById('notification-modal');
        this.content = document.getElementById('notification-list');
    }

    setupSocketListeners() {
        // Initialize socket connection
        this.socket = io();
        
        // Authenticate socket
        const token = localStorage.getItem('token');
        if (token) {
            this.socket.emit('authenticate', token);
        }

        // Listen for new notifications
        this.socket.on('new_notification', (notification) => {
            this.addNewNotification(notification);
            this.updateBadge();
            this.showNotificationToast(notification);
        });

        // Listen for order status updates
        this.socket.on('order_status_updated', (data) => {
            this.handleOrderStatusUpdate(data);
        });

        // Handle socket errors
        this.socket.on('order_update_error', (error) => {
            console.error('Order update error:', error);
            this.showErrorToast(error.message);
        });
    }

    setupEventListeners() {
        // Close modal events
        const closeBtn = document.getElementById('close-notification-modal');
        closeBtn.addEventListener('click', () => this.close());

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.close();
            }
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !this.overlay.classList.contains('hidden')) {
                this.close();
            }
        });

        // Action buttons
        document.getElementById('mark-all-read-btn').addEventListener('click', () => this.markAllAsRead());
        document.getElementById('clear-read-btn').addEventListener('click', () => this.clearReadNotifications());
        document.getElementById('refresh-notifications-btn').addEventListener('click', () => this.loadNotifications());

        // Notification badge clicks
        const notificationBadges = document.querySelectorAll('.notification-badge, #notification-badge-count, #mobile-notification-badge');
        notificationBadges.forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.preventDefault();
                this.open();
            });
        });
    }

    async loadNotifications() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${API_BASE}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                this.notifications = await response.json();
                this.renderNotifications();
                this.updateBadge();
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            this.content.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-exclamation-triangle text-3xl text-red-500 mb-3"></i>
                    <p class="text-gray-600">Failed to load notifications</p>
                </div>
            `;
        }
    }

    renderNotifications() {
        if (!this.notifications || this.notifications.length === 0) {
            this.content.innerHTML = `
                <div class="text-center py-12">
                    <i class="fas fa-bell-slash text-4xl text-gray-300 mb-4"></i>
                    <h3 class="text-lg font-semibold text-gray-600 mb-2">No notifications</h3>
                    <p class="text-gray-500">You're all caught up!</p>
                </div>
            `;
            return;
        }

        const html = this.notifications.map(notif => this.createNotificationHTML(notif)).join('');
        this.content.innerHTML = html;
        this.attachNotificationEventListeners();
        this.updateNotificationCount();
    }

    createNotificationHTML(notification) {
        const icon = this.getIconForType(notification.type);
        const statusClass = notification.isRead ? 'bg-white' : 'bg-blue-50 border-l-4 border-blue-500';
        const date = new Date(notification.createdAt).toLocaleDateString();
        const time = new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        return `
            <div class="notification-item ${statusClass} rounded-lg p-4 hover:shadow-md transition-all duration-200 cursor-pointer relative group" 
                 data-notification-id="${notification._id}">
                <div class="flex items-start space-x-3">
                    <div class="flex-shrink-0 mt-1">
                        ${icon}
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <h4 class="text-sm font-semibold text-gray-900 mb-1">${notification.title}</h4>
                                <p class="text-sm text-gray-600 mb-2">${notification.message}</p>
                                <div class="flex items-center space-x-3 text-xs text-gray-500">
                                    <span><i class="far fa-calendar mr-1"></i>${date}</span>
                                    <span><i class="far fa-clock mr-1"></i>${time}</span>
                                </div>
                            </div>
                            <div class="flex items-center space-x-2 ml-3">
                                ${!notification.isRead ? '<span class="w-2 h-2 bg-blue-600 rounded-full"></span>' : ''}
                                <button class="delete-notification opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded" 
                                        data-notification-id="${notification._id}" title="Delete notification">
                                    <i class="fas fa-trash text-red-500 text-sm"></i>
                                </button>
                            </div>
                        </div>
                        ${notification.link ? `
                            <div class="mt-3">
                                <a href="${notification.link}" class="inline-flex items-center text-gold hover:text-yellow-600 text-sm font-medium">
                                    View Details <i class="fas fa-arrow-right ml-1"></i>
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    getIconForType(type) {
        const icons = {
            'Transaction': '<div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><i class="fas fa-exchange-alt text-green-600"></i></div>',
            'Account': '<div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"><i class="fas fa-user-circle text-purple-600"></i></div>',
            'Promotion': '<div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center"><i class="fas fa-bullhorn text-yellow-600"></i></div>',
            'System': '<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><i class="fas fa-info-circle text-blue-600"></i></div>',
            'order_confirmed': '<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><i class="fas fa-check-circle text-blue-600"></i></div>',
            'order_declined': '<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center"><i class="fas fa-times-circle text-red-600"></i></div>',
            'default': '<div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><i class="fas fa-bell text-gray-600"></i></div>'
        };
        return icons[type] || icons['default'];
    }

    attachNotificationEventListeners() {
        // Notification item clicks
        const notificationItems = this.content.querySelectorAll('.notification-item');
        notificationItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // Don't trigger if clicking on delete button or link
                if (e.target.closest('.delete-notification') || e.target.closest('a')) return;
                
                const notificationId = item.dataset.notificationId;
                this.markAsRead(notificationId);
            });
        });

        // Delete button clicks
        const deleteButtons = this.content.querySelectorAll('.delete-notification');
        deleteButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const notificationId = btn.dataset.notificationId;
                this.deleteNotification(notificationId);
            });
        });
    }

    async markAsRead(notificationId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const notification = this.notifications.find(n => n._id === notificationId);
                if (notification) {
                    notification.isRead = true;
                    this.renderNotifications();
                    this.updateBadge();
                }
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    async markAllAsRead() {
        try {
            const token = localStorage.getItem('token');
            const unreadNotifications = this.notifications.filter(n => !n.isRead);
            
            for (const notification of unreadNotifications) {
                await fetch(`${API_BASE}/notifications/${notification._id}/read`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                notification.isRead = true;
            }

            this.renderNotifications();
            this.updateBadge();
            this.showSuccessToast('All notifications marked as read');
        } catch (error) {
            console.error('Error marking all as read:', error);
            this.showErrorToast('Failed to mark all as read');
        }
    }

    async deleteNotification(notificationId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                this.notifications = this.notifications.filter(n => n._id !== notificationId);
                this.renderNotifications();
                this.updateBadge();
                this.showSuccessToast('Notification deleted');
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            this.showErrorToast('Failed to delete notification');
        }
    }

    async clearReadNotifications() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/notifications/read`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                this.notifications = this.notifications.filter(n => !n.isRead);
                this.renderNotifications();
                this.updateBadge();
                this.showSuccessToast('Read notifications cleared');
            }
        } catch (error) {
            console.error('Error clearing read notifications:', error);
            this.showErrorToast('Failed to clear read notifications');
        }
    }

    addNewNotification(notification) {
        this.notifications.unshift(notification);
        this.renderNotifications();
        this.updateBadge();
    }

    handleOrderStatusUpdate(data) {
        // Add real-time order status update notification
        const notification = {
            _id: `realtime_${Date.now()}`,
            title: data.notification.title,
            message: data.notification.message,
            type: data.notification.type,
            createdAt: data.timestamp,
            isRead: false,
            link: '/orders'
        };
        
        this.addNewNotification(notification);
        this.showNotificationToast(notification);
    }

    updateBadge() {
        const unreadCount = this.notifications.filter(n => !n.isRead).length;
        
        // Update all notification badges
        const badges = document.querySelectorAll('.notification-badge, #notification-badge-count, #mobile-notification-badge');
        badges.forEach(badge => {
            badge.textContent = unreadCount;
            if (unreadCount > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });

        this.unreadCount = unreadCount;
    }

    updateNotificationCount() {
        const countElement = document.getElementById('notification-count');
        if (countElement) {
            countElement.textContent = this.notifications.length;
        }
    }

    showNotificationToast(notification) {
        // Create a toast notification for real-time updates
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50 transform translate-x-full transition-transform duration-300';
        toast.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    ${this.getIconForType(notification.type)}
                </div>
                <div class="flex-1">
                    <h4 class="text-sm font-semibold text-gray-900">${notification.title}</h4>
                    <p class="text-sm text-gray-600 mt-1">${notification.message}</p>
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

    showSuccessToast(message) {
        this.showToast(message, 'success');
    }

    showErrorToast(message) {
        this.showToast(message, 'error');
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

    open() {
        this.overlay.classList.remove('hidden');
        setTimeout(() => {
            this.modal.classList.remove('scale-95', 'opacity-0');
            this.modal.classList.add('scale-100', 'opacity-100');
        }, 10);
        
        // Load fresh notifications when opening
        this.loadNotifications();
    }

    close() {
        this.modal.classList.remove('scale-100', 'opacity-100');
        this.modal.classList.add('scale-95', 'opacity-0');
        
        setTimeout(() => {
            this.overlay.classList.add('hidden');
        }, 300);
    }
}

// Initialize notification modal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.notificationModal = new NotificationModal();
});

// Export for use in other files
window.NotificationModal = NotificationModal;
