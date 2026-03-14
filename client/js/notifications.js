// Notifications logic
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    const API_BASE = 'https://virtuosa-server.onrender.com/api';
    const container = document.getElementById('notifications-container');

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
                <div class="p-4 sm:p-6 hover:bg-gray-50 cursor-pointer transition-colors ${statusClass}" onclick="markAsRead('${notif._id}', '${notif.link}')">
                    <div class="flex items-start">
                        <div class="flex-shrink-0 mt-1">
                            ${icon}
                        </div>
                        <div class="ml-4 flex-1">
                            <h4 class="text-sm font-semibold text-gray-900">${notif.title}</h4>
                            <p class="mt-1 text-sm text-gray-600">${notif.message}</p>
                            <p class="mt-1 text-xs text-gray-400">${timeAgo}</p>
                        </div>
                        ${!notif.isRead ? '<div class="ml-4 flex-shrink-0"><span class="inline-block w-2.5 h-2.5 bg-blue-600 rounded-full"></span></div>' : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

        // Update header badge dynamically if necessary
        updateHeaderBadge(notifications.filter(n => !n.isRead).length);
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

    window.markAsRead = async (id, link) => {
        try {
            await fetch(`${API_BASE}/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (link && link !== 'null' && link !== 'undefined') {
                window.location.href = link;
            } else {
                loadNotifications(); // Reload to update UI
            }
        } catch (error) {
            console.error('Error marking as read:', error);
            if (link && link !== 'null' && link !== 'undefined') {
                window.location.href = link;
            }
        }
    };

    function updateHeaderBadge(unreadCount) {
        const badge = document.getElementById('notification-badge-count');
        if (badge) {
            badge.textContent = unreadCount;
            if (unreadCount > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    }

    loadNotifications();
});
