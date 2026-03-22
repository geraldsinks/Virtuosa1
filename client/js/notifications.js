// Notifications logic
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    // API_BASE is provided by config.js
    const container = document.getElementById('notifications-container');

    // Only proceed if the container exists (for pages that have notifications)
    if (!container) {
        console.log('Notifications container not found, skipping notifications load');
        return;
    }

    // Initialize socket connection for real-time updates
    let socket;
    try {
        socket = io();
        
        // Authenticate socket
        socket.emit('authenticate', token);

        // Listen for new notifications
        socket.on('new_notification', (notification) => {
            console.log('New notification received:', notification);
            loadNotifications(); // Reload notifications to show the new one
            
            // Show toast notification if not on notifications page
            if (window.location.pathname !== '/pages/notifications.html') {
                showNotificationToast(notification);
            }
        });

        // Listen for order status updates
        socket.on('order_status_updated', (data) => {
            console.log('Order status updated:', data);
            loadNotifications(); // Reload to show order updates
            
            // Show toast for order updates
            if (window.location.pathname !== '/pages/notifications.html') {
                showOrderUpdateToast(data);
            }
        });

    } catch (error) {
        console.error('Socket connection error:', error);
    }

    async function loadNotifications() {
        try {
            const response = await fetch(`${API_BASE}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to load notifications');
            }

            const notifications = await response.json();
            displayNotifications(notifications);
            updateHeaderBadge(notifications.filter(n => !n.isRead).length);
        } catch (error) {
            console.error('Error:', error);
            container.innerHTML = `
                <div class="p-8 text-center text-red-500">
                    <i class="fas fa-exclamation-circle text-3xl mb-4"></i>
                    <p>Failed to load notifications. Please try again later.</p>
                </div>
            `;
        }
    }

    function displayNotifications(notifications) {
        if (!notifications || notifications.length === 0) {
            container.innerHTML = `
                <div class="p-8 text-center text-gray-500">
                    <i class="far fa-bell text-4xl mb-4 text-gray-300"></i>
                    <p class="text-lg">You don't have any notifications yet</p>
                </div>
            `;
            return;
        }

        let html = '<div class="divide-y divide-gray-200">';

        notifications.forEach(notif => {
            const icon = getIconForType(notif.type);
            const statusClass = notif.isRead ? 'notification-read' : 'notification-unread';
            const date = new Date(notif.createdAt);
            const timeAgo = getTimeAgo(date);

            html += `
                <div class="p-4 sm:p-6 hover:bg-gray-50 cursor-pointer transition-colors ${statusClass}" onclick="handleNotificationClick('${notif._id}', '${notif.link || ''}')">
                    <div class="flex items-start">
                        <div class="flex-shrink-0 mt-1">
                            ${icon}
                        </div>
                        <div class="ml-4 flex-1">
                            <h4 class="text-sm font-semibold text-gray-900">${notif.title}</h4>
                            <p class="mt-1 text-sm text-gray-600">${notif.message}</p>
                            <p class="mt-1 text-xs text-gray-400">${timeAgo}</p>
                        </div>
                        <div class="ml-4 flex items-center space-x-2">
                            ${!notif.isRead ? '<div class="w-2.5 h-2.5 bg-blue-600 rounded-full"></div>' : ''}
                            <button onclick="event.stopPropagation(); deleteNotification('${notif._id}')" 
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
        container.innerHTML = html;
    }

    function getIconForType(type) {
        switch (type) {
            case 'Transaction':
                return '<div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><i class="fas fa-exchange-alt text-green-600"></i></div>';
            case 'Account':
                return '<div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center"><i class="fas fa-user-circle text-purple-600"></i></div>';
            case 'Promotion':
                return '<div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center"><i class="fas fa-bullhorn text-yellow-600"></i></div>';
            case 'System':
            default:
                return '<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><i class="fas fa-info-circle text-blue-600"></i></div>';
        }
    }

    function getTimeAgo(date) {
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

    // Handle notification click
    window.handleNotificationClick = async (id, link) => {
        try {
            // Mark as read
            await fetch(`${API_BASE}/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Navigate if link exists
            if (link && link !== 'null' && link !== 'undefined') {
                window.location.href = link;
            } else {
                loadNotifications(); // Reload to update UI
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
            if (link && link !== 'null' && link !== 'undefined') {
                window.location.href = link;
            }
        }
    };

    // Delete notification
    window.deleteNotification = async (id) => {
        if (!confirm('Are you sure you want to delete this notification?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/notifications/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                loadNotifications(); // Reload to update UI
                showToast('Notification deleted successfully', 'success');
            } else {
                throw new Error('Failed to delete notification');
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            showToast('Failed to delete notification', 'error');
        }
    };

    function updateHeaderBadge(unreadCount) {
        const badges = document.querySelectorAll('.notification-badge, #notification-badge-count, #mobile-notification-badge');
        badges.forEach(badge => {
            badge.textContent = unreadCount;
            if (unreadCount > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    }

    function showNotificationToast(notification) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-50 transform translate-x-full transition-transform duration-300 border-l-4 border-blue-500';
        toast.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0">
                    ${getIconForType(notification.type)}
                </div>
                <div class="flex-1">
                    <h4 class="text-sm font-semibold text-gray-900">${notification.title}</h4>
                    <p class="text-sm text-gray-600 mt-1">${notification.message}</p>
                    <p class="text-xs text-gray-400 mt-1">${getTimeAgo(new Date(notification.createdAt))}</p>
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

    function showOrderUpdateToast(data) {
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
                    <h4 class="text-sm font-semibold text-gray-900">${data.notification.title}</h4>
                    <p class="text-sm text-gray-600 mt-1">${data.notification.message}</p>
                    <p class="text-xs text-gray-400 mt-1">${getTimeAgo(new Date(data.timestamp))}</p>
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

    function showToast(message, type = 'info') {
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

    // Initial load
    loadNotifications();
});
