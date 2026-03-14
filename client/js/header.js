// Navigation Header and Authentication Logic for Virtuosa
const API_BASE = 'https://virtuosa-server.onrender.com/api';

document.addEventListener('DOMContentLoaded', () => {
    // Only run this script if it hasn't been initialized yet
    if (window.isHeaderScriptRunning) return;
    window.isHeaderScriptRunning = true;

    const loginLink = document.getElementById('login-link');
    const userGreeting = document.getElementById('user-greeting');
    const logoutButton = document.getElementById('logout-button');
    const menuToggle = document.getElementById('menu-toggle');
    const categoriesDropdown = document.getElementById('categories-dropdown');

    async function updateUserUI() {
        const userFullName = localStorage.getItem('userFullName');
        const userEmail = localStorage.getItem('userEmail');
        const token = localStorage.getItem('token');

        if (userFullName && token) {
            if (loginLink) {
                loginLink.classList.add('hidden');
                loginLink.classList.remove('md:block'); // Remove responsive block class that overrides 'hidden'
            }
            if (userGreeting) {
                userGreeting.textContent = `Hello, ${userFullName}`;
                userGreeting.classList.remove('hidden');
            }
            if (logoutButton) logoutButton.classList.remove('hidden');

            // Show user menu
            const userMenu = document.getElementById('user-menu');
            if (userMenu) {
                userMenu.classList.remove('hidden');
            }

            // Fetch user data to get role
            try {
                const response = await fetch(`${API_BASE}/user/profile`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const userData = await response.json();
                    const sellerLinks = document.getElementById('seller-links');
                    const adminLink = document.getElementById('admin-link');

                    // Show seller links if user is seller
                    if (userData.isSeller && sellerLinks) {
                        sellerLinks.classList.remove('hidden');
                    } else if (sellerLinks) {
                        sellerLinks.classList.add('hidden');
                    }

                    // Show admin link if user is admin
                    if ((userEmail === 'admin@virtuosa.com' || userData.role === 'admin' || userData.isAdmin === 'true' || userData.isAdmin === true) && adminLink) {
                        adminLink.classList.remove('hidden');
                    } else if (adminLink) {
                        adminLink.classList.add('hidden');
                    }

                    // Always point to buyer dashboard as requested
                    const dashboardLink = document.querySelector('#user-dropdown a[href="/pages/dashboard.html"]');
                    if (dashboardLink) {
                        dashboardLink.href = '/pages/buyer-dashboard.html';
                    }

                    // Dynamically add Messages link if not present
                    const userDropdown = document.getElementById('user-dropdown');
                    if (userDropdown && !document.getElementById('messages-link')) {
                        const messagesLink = document.createElement('a');
                        messagesLink.id = 'messages-link';
                        messagesLink.href = '/pages/messages.html';
                        messagesLink.className = 'block px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors';
                        messagesLink.innerHTML = '<i class="fas fa-envelope mr-2"></i>Messages';

                        // Find the logout button to insert before
                        const logoutBtn = userDropdown.querySelector('button[onclick*="logout"]');
                        if (logoutBtn) {
                            userDropdown.insertBefore(messagesLink, logoutBtn.previousElementSibling || logoutBtn);
                        } else {
                            userDropdown.appendChild(messagesLink);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching user data:', error);
                // Fallback: show seller links if user has seller data in localStorage
                const isSeller = localStorage.getItem('isSeller') === 'true';
                const sellerLinks = document.getElementById('seller-links');
                if (isSeller && sellerLinks) {
                    sellerLinks.classList.remove('hidden');
                }
            }

            // Fetch notifications
            try {
                const notificationsResponse = await fetch(`${API_BASE}/notifications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (notificationsResponse.ok) {
                    const notifications = await notificationsResponse.json();
                    const unreadCount = notifications.filter(n => !n.isRead).length;

                    // Update notification badge if it exists
                    const notificationBadge = document.getElementById('notification-badge-count');
                    if (notificationBadge) {
                        notificationBadge.textContent = unreadCount;
                        if (unreadCount > 0) {
                            notificationBadge.classList.remove('hidden');
                        } else {
                            notificationBadge.classList.add('hidden');
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching notifications:', error);
            }

            // Fetch message conversations for badge
            try {
                const messagesResponse = await fetch(`${API_BASE}/messages/conversations`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (messagesResponse.ok) {
                    const conversations = await messagesResponse.json();
                    const unreadMessageCount = conversations.reduce((total, conv) => total + (conv.unreadCount || 0), 0);

                    // Update message badge if it exists
                    const messageBadges = document.querySelectorAll('.message-badge-count, a[href*="messages.html"] span');
                    messageBadges.forEach(badge => {
                        const parent = badge.closest('a');
                        const isMessageRelated = parent && parent.href?.includes('messages.html');

                        if (isMessageRelated || badge.classList.contains('message-badge-count')) {
                            badge.textContent = unreadMessageCount;
                            if (unreadMessageCount > 0) {
                                badge.classList.remove('hidden');
                            } else {
                                badge.classList.add('hidden');
                            }
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching message conversations:', error);
            }
        } else {
            if (loginLink) loginLink.classList.remove('hidden');
            if (userGreeting) userGreeting.classList.add('hidden');
            if (logoutButton) logoutButton.classList.add('hidden');

            // Hide user menu
            const userMenu = document.getElementById('user-menu');
            if (userMenu) {
                userMenu.classList.add('hidden');
            }
        }
    }

    // Attach to window object to be called from HTML onclick attributes
    window.toggleUserMenu = function () {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('hidden');
        }
    };

    window.logout = async function (event) {
        if (event) event.preventDefault();
        try {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            // Full storage cleanup
            localStorage.clear();
            sessionStorage.clear();

            console.log('✅ Logout successful, storage cleared');
            window.location.href = '/pages/login.html';
        } catch (error) {
            console.error('Logout error:', error);
            // Fallback: Clear storage anyway and redirect
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/pages/login.html';
        }
    };

    updateUserUI();

    if (logoutButton) {
        logoutButton.addEventListener('click', window.logout);
    }

    if (menuToggle && categoriesDropdown) {
        menuToggle.addEventListener('click', () => {
            categoriesDropdown.classList.toggle('hidden');
        });
    }

    document.addEventListener('click', (event) => {
        // Close categories dropdown
        if (menuToggle && categoriesDropdown && !menuToggle.contains(event.target) && !categoriesDropdown.contains(event.target)) {
            categoriesDropdown.classList.add('hidden');
        }

        // Close user dropdown
        const userDropdown = document.getElementById('user-dropdown');
        const userMenu = document.getElementById('user-menu');
        if (userDropdown && userMenu && !userMenu.contains(event.target)) {
            userDropdown.classList.add('hidden');
        }
    });
});
