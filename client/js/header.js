// Navigation Header and Authentication Logic for Virtuosa
// API_BASE is provided by config.js

document.addEventListener('DOMContentLoaded', () => {
    // Only run this script if it hasn't been initialized yet
    if (window.isHeaderScriptRunning) return;
    window.isHeaderScriptRunning = true;

    const loginLink = document.getElementById('login-link');
    const userGreeting = document.getElementById('user-greeting');
    const logoutButton = document.getElementById('logout-button');
    const menuToggle = document.getElementById('menu-toggle');
    const categoriesDropdown = document.getElementById('categories-dropdown');

    // Initialize desktop search
    initializeDesktopSearch();

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

            // Update mobile menu sign link to show Sign Out
            const mobileMenuSignLink = document.getElementById('mobile-menu-sign-link');
            const mobileMenuSignText = document.getElementById('mobile-menu-sign-text');
            if (mobileMenuSignLink && mobileMenuSignText) {
                mobileMenuSignLink.href = '#';
                mobileMenuSignLink.onclick = window.logout;
                mobileMenuSignText.textContent = 'Sign Out';
                const icon = mobileMenuSignLink.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-sign-out-alt';
                }
            }

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

                    // Show mobile seller section
                    const mobileSellerSection = document.getElementById('mobile-seller-section');
                    if (userData.isSeller && mobileSellerSection) {
                        mobileSellerSection.style.display = 'block';
                    } else if (mobileSellerSection) {
                        mobileSellerSection.style.display = 'none';
                    }

                    // Show admin link if user is admin
                    if ((userEmail === 'admin@virtuosa.com' || userData.role === 'admin' || userData.isAdmin === 'true' || userData.isAdmin === true) && adminLink) {
                        adminLink.classList.remove('hidden');
                    } else if (adminLink) {
                        adminLink.classList.add('hidden');
                    }

                    // Show mobile admin section
                    const mobileAdminSection = document.getElementById('mobile-admin-section');
                    const isAdmin = userEmail === 'admin@virtuosa.com' || userData.role === 'admin' || userData.isAdmin === 'true' || userData.isAdmin === true;
                    if (isAdmin && mobileAdminSection) {
                        mobileAdminSection.style.display = 'block';
                    } else if (mobileAdminSection) {
                        mobileAdminSection.style.display = 'none';
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
                        if (logoutBtn && userDropdown.contains(logoutBtn)) {
                            userDropdown.insertBefore(messagesLink, logoutBtn);
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

                    // Update notification badge if it exists (combined for mobile)
                    const notificationBadge = document.getElementById('notification-badge-count');
                    const mobileNotificationBadge = document.getElementById('mobile-notification-badge');
                    if (notificationBadge) {
                        notificationBadge.textContent = unreadCount;
                        if (unreadCount > 0) {
                            notificationBadge.classList.remove('hidden');
                        } else {
                            notificationBadge.classList.add('hidden');
                        }
                    }
                    if (mobileNotificationBadge) {
                        mobileNotificationBadge.textContent = unreadCount;
                        if (unreadCount > 0) {
                            mobileNotificationBadge.classList.remove('hidden');
                        } else {
                            mobileNotificationBadge.classList.add('hidden');
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

                    // Update message badge if it exists (desktop only)
                    const messageBadges = document.querySelectorAll('.message-badge-count, a[href*="messages.html"] span');
                    messageBadges.forEach(badge => {
                        const parent = badge.closest('a');
                        const isMessageRelated = parent && parent.href?.includes('messages.html');
                        const isMobileBadge = badge.id === 'mobile-message-badge';

                        if (isMessageRelated || badge.classList.contains('message-badge-count')) {
                            badge.textContent = unreadMessageCount;
                            if (unreadMessageCount > 0) {
                                badge.classList.remove('hidden');
                            } else {
                                badge.classList.add('hidden');
                            }
                        }
                    });

                    // Combine message count with notification count for mobile
                    const mobileNotificationBadge = document.getElementById('mobile-notification-badge');
                    if (mobileNotificationBadge) {
                        const currentNotificationCount = parseInt(mobileNotificationBadge.textContent) || 0;
                        const totalCount = currentNotificationCount + unreadMessageCount;
                        mobileNotificationBadge.textContent = totalCount;
                        if (totalCount > 0) {
                            mobileNotificationBadge.classList.remove('hidden');
                        } else {
                            mobileNotificationBadge.classList.add('hidden');
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching message conversations:', error);
            }
        } else {
            if (loginLink) loginLink.classList.remove('hidden');
            if (userGreeting) userGreeting.classList.add('hidden');
            if (logoutButton) logoutButton.classList.add('hidden');

            // Update mobile menu sign link to show Sign In
            const mobileMenuSignLink = document.getElementById('mobile-menu-sign-link');
            const mobileMenuSignText = document.getElementById('mobile-menu-sign-text');
            if (mobileMenuSignLink && mobileMenuSignText) {
                mobileMenuSignLink.href = '/pages/login.html';
                mobileMenuSignLink.onclick = null;
                mobileMenuSignText.textContent = 'Sign In';
                const icon = mobileMenuSignLink.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-sign-in-alt';
                }
            }

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

    /**
     * Unified Search Logic
     */
    window.performSearch = function (query) {
        const trimmedQuery = (query || "").trim();
        if (!trimmedQuery) return;

        console.log('Performing search for:', trimmedQuery);
        console.log('Current pathname:', window.location.pathname);

        // If we're already on the products page, we can update the list dynamically
        // instead of a full page reload if the products.js is set up to listen
        if (window.location.pathname.includes('products.html')) {
            const searchEvent = new CustomEvent('virtuosaSearch', { detail: { query: trimmedQuery } });
            window.dispatchEvent(searchEvent);
        } else {
            // Build correct path to products.html from any location
            let productsPath = 'pages/products.html';
            
            // Check if we're in a subdirectory and adjust path accordingly
            const pathname = window.location.pathname;
            
            // If we're already in /pages/ directory, use relative path
            if (pathname.includes('/pages/')) {
                productsPath = 'products.html';
            }
            
            console.log('Final search path:', productsPath);
            window.location.href = `${productsPath}?q=${encodeURIComponent(trimmedQuery)}`;
        }
    };

    /**
     * Unified Category Navigation
     */
    window.handleCategoryClick = function (category) {
        if (!category) return;

        console.log('Category clicked:', category);
        console.log('Current pathname:', window.location.pathname);

        if (window.location.pathname.includes('products.html')) {
            const categoryEvent = new CustomEvent('virtuosaCategory', { detail: { category: category } });
            window.dispatchEvent(categoryEvent);
        } else {
            // Build correct path to products.html from any location
            let productsPath = 'pages/products.html';
            
            // Check if we're in a subdirectory and adjust path accordingly
            const pathname = window.location.pathname;
            
            // If we're already in /pages/ directory, use relative path
            if (pathname.includes('/pages/')) {
                productsPath = 'products.html';
            }
            
            console.log('Final products path:', productsPath);
            window.location.href = `${productsPath}?category=${encodeURIComponent(category)}`;
        }
    };

    // Global listeners for search inputs in all headers
    document.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.id === 'home-search-input' || activeElement.id === 'mobile-search-input' || activeElement.classList.contains('search-input'))) {
                window.performSearch(activeElement.value);
            }
        }
    });

    // Handle search button clicks if they have ID patterns
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('#home-search-button, #mobile-search-button, .search-button');
        if (btn) {
            const container = btn.closest('.v-header-search, .mobile-search-container, .search-container');
            const input = container ? container.querySelector('input') : null;
            if (input) {
                window.performSearch(input.value);
            }
        }
    });

    // Desktop Search Initialization
    function initializeDesktopSearch() {
        const desktopSearchInput = document.getElementById('home-search-input');
        const desktopSearchButton = document.getElementById('home-search-button');
        const desktopSearchSuggestions = document.getElementById('home-search-suggestions');
        
        if (!desktopSearchInput || !desktopSearchSuggestions) return;
        
        let searchTimeout;
        let allProducts = [];
        
        // Load products for search suggestions
        loadProductsForDesktopSearch();
        
        // Search input events
        desktopSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    showDesktopSearchSuggestions(query);
                }, 300);
            } else {
                hideDesktopSearchSuggestions();
            }
        });
        
        // Keep focus on input when clicking suggestions
        desktopSearchSuggestions.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });
        
        // Click outside to close suggestions
        document.addEventListener('click', function(e) {
            if (!e.target.closest('.v-header-search')) {
                hideDesktopSearchSuggestions();
            }
        });
    }
    
    async function loadProductsForDesktopSearch() {
        try {
            const response = await fetch(`${API_BASE}/products`);
            if (response.ok) {
                const data = await response.json();
                window.desktopAllProducts = data.products || [];
            }
        } catch (error) {
            console.error('Error loading products for desktop search:', error);
            window.desktopAllProducts = [];
        }
    }
    
    function showDesktopSearchSuggestions(query) {
        const desktopSearchSuggestions = document.getElementById('home-search-suggestions');
        const suggestions = getDesktopSearchSuggestions(query, window.desktopAllProducts || []);
        
        if (suggestions.length > 0) {
            desktopSearchSuggestions.innerHTML = suggestions.map(product => {
                const imageUrl = product.images && product.images[0] 
                    ? (product.images[0].startsWith('http') ? product.images[0] : fixServerUrl(product.images[0]))
                    : 'https://placehold.co/40x40?text=No+Image';
                
                return `
                <div class="desktop-search-suggestion-item px-4 py-3 hover:bg-gray-800 cursor-pointer border-b border-gray-700 last:border-b-0" 
                     onclick="selectDesktopSearchSuggestion('${product.name}', '${product._id}')">
                    <div class="flex items-center space-x-3">
                        <img src="${imageUrl}" 
                             alt="${product.name}" 
                             class="w-10 h-10 object-cover rounded">
                        <div class="flex-1 min-w-0">
                            <div class="text-sm font-medium text-white truncate">${product.name}</div>
                            <div class="text-xs text-gray-400">${product.category}</div>
                        </div>
                        <div class="text-sm font-bold text-gold">K${product.price}</div>
                    </div>
                </div>
            `;
            }).join('');
            desktopSearchSuggestions.classList.remove('hidden');
        } else {
            desktopSearchSuggestions.innerHTML = `
                <div class="px-4 py-3 text-gray-400 text-sm">
                    No products found for "${query}"
                </div>
            `;
            desktopSearchSuggestions.classList.remove('hidden');
        }
    }
    
    function hideDesktopSearchSuggestions() {
        const desktopSearchSuggestions = document.getElementById('home-search-suggestions');
        if (desktopSearchSuggestions) {
            desktopSearchSuggestions.classList.add('hidden');
        }
    }
    
    function getDesktopSearchSuggestions(query, products) {
        const lowerQuery = query.toLowerCase();
        return products
            .filter(product => 
                product.name.toLowerCase().includes(lowerQuery) ||
                product.category.toLowerCase().includes(lowerQuery) ||
                product.description.toLowerCase().includes(lowerQuery)
            )
            .slice(0, 5); // Limit to 5 suggestions
    }
    
    function selectDesktopSearchSuggestion(productName, productId) {
        const desktopSearchInput = document.getElementById('home-search-input');
        desktopSearchInput.value = productName;
        hideDesktopSearchSuggestions();
        
        console.log('Desktop search suggestion clicked:', productName);
        console.log('Current pathname:', window.location.pathname);
        
        // Build correct path to product-detail.html from any location
        let productDetailPath = 'pages/product-detail.html';
        
        // Check if we're in a subdirectory and adjust path accordingly
        const pathname = window.location.pathname;
        
        // If we're already in /pages/ directory, use relative path
        if (pathname.includes('/pages/')) {
            productDetailPath = 'product-detail.html';
        }
        
        console.log('Final desktop suggestion path:', productDetailPath);
        // Redirect to product detail page
        window.location.href = `${productDetailPath}?id=${productId}`;
    }
});
