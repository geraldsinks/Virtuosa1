/**
 * Unified Header System for Virtuosa
 * Production-grade centralized header management
 * 
 * Features:
 * - Single initialization point
 * - Proper auth state management
 * - Smooth transitions
 * - Performance optimized
 * - Mobile-friendly
 */

class UnifiedHeader {
    constructor() {
        // Prevent multiple initializations
        if (window.unifiedHeaderInitialized) {
            console.log('Unified header already initialized');
            return;
        }
        
        this.initialized = false;
        this.authCheckInProgress = false;
        this.userData = null;
        this.observers = new Set();
        
        // Store event listeners for cleanup
        this.eventListeners = [];
        
        // Initialize on DOM ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        if (this.initialized) return;
        this.initialized = true;
        window.unifiedHeaderInitialized = true;

        try {
            // 1. Ensure header HTML exists
            this.ensureHeaderExists();
            
            // 2. Initialize all components
            await this.initializeAuthState();
            this.initializeSearch();
            this.initializeMobileMenu();
            this.initializeNotifications();
            this.initializeUserDropdown();
            
            // 3. Set up observers for real-time updates
            this.setupAuthStateObserver();
            
            console.log('✓ Unified header system initialized');
        } catch (error) {
            console.error('Failed to initialize unified header:', error);
            // Fallback to basic functionality
            this.initializeBasicFunctionality();
        }
    }

    /**
     * Ensure header HTML structure exists (insert if missing)
     */
    ensureHeaderExists() {
        let header = document.querySelector('header.bg-navy');
        
        if (!header) {
            const headerHTML = this.getUnifiedHeaderHTML();
            const body = document.body;
            body.insertAdjacentHTML('afterbegin', headerHTML);
            header = document.querySelector('header.bg-navy');
        }
        
        return header;
    }

    /**
     * Get unified header HTML template
     */
    getUnifiedHeaderHTML() {
        return `
<header class="bg-navy text-white shadow-lg sticky top-0 z-50" role="banner">
    <!-- Mobile Header Row 1 (Hamburger, Logo, Actions) -->
    <div class="v-container mobile-header-row-1 md:hidden">
        <div class="flex items-center justify-between py-3">
            <!-- Hamburger Menu -->
            <button id="mobile-menu-toggle" class="v-touch text-white hover:text-gold transition-colors" 
                    aria-label="Toggle menu" aria-controls="mobile-menu-overlay" aria-expanded="false">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            <!-- Brand Logo -->
            <div class="flex-1 text-center">
                <a href="/" class="text-2xl font-bold text-gold hover:text-yellow-300 transition-colors mobile-logo">Virtuosa</a>
            </div>

            <!-- Mobile Actions -->
            <div class="flex items-center space-x-3">
                <!-- Notifications -->
                <a href="/pages/notifications.html" class="relative v-touch text-white hover:text-gold transition-colors" 
                   aria-label="Notifications">
                    <i class="fas fa-bell text-lg"></i>
                    <span id="mobile-notification-badge" class="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full hidden">0</span>
                </a>
                
                <!-- Cart -->
                <a href="/pages/cart.html" class="relative v-touch text-white hover:text-gold transition-colors" 
                   aria-label="Shopping cart">
                    <i class="fas fa-shopping-cart text-lg"></i>
                    <span class="cart-badge-count absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full hidden">0</span>
                </a>
            </div>
        </div>
    </div>

    <!-- Mobile Header Row 2 (Search) -->
    <div class="v-container mobile-header-row-2 pb-3 md:hidden">
        <div class="relative mobile-search-container">
            <input id="mobile-search-input" type="text" 
                placeholder="Search products..." 
                class="w-full pl-4 pr-12 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-gray-800 text-gray-200 placeholder-gray-400"
                autocomplete="off" aria-label="Search products">
            <button id="mobile-search-button" 
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gold transition-colors"
                aria-label="Search">
                <i class="fas fa-search"></i>
            </button>
            <!-- Search Suggestions -->
            <div id="mobile-search-suggestions" class="absolute top-full left-0 right-0 mt-1 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-xl max-h-72 overflow-y-auto hidden z-50" role="listbox">
            </div>
        </div>
    </div>

    <!-- Desktop Header (768px+) -->
    <div class="v-container v-header-row desktop-header hidden md:flex md:items-center md:justify-between">
        <!-- Logo -->
        <div class="v-header-logo flex-shrink-0">
            <a href="/" class="text-2xl font-bold text-gold hover:text-yellow-300 transition-colors">Virtuosa</a>
        </div>

        <!-- Search -->
        <div class="v-header-search flex-1 mx-6">
            <div class="relative">
                <input id="desktop-search-input" type="text" 
                    placeholder="Search campus marketplace..."
                    class="w-full px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-gray-800 text-white placeholder-gray-400"
                    autocomplete="off" aria-label="Search products">
                <button id="desktop-search-button" 
                    class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gold transition-colors"
                    aria-label="Search">
                    <i class="fas fa-search"></i>
                </button>
            </div>
            <!-- Desktop Search Suggestions -->
            <div id="home-search-suggestions" class="absolute top-full left-0 right-0 mt-2 w-full bg-gray-900 border border-gray-700 rounded-xl shadow-xl max-h-72 overflow-y-auto hidden z-50" role="listbox">
            </div>
        </div>

        <!-- Desktop Actions -->
        <div id="user-info-container" class="v-header-actions flex items-center space-x-6">
            <!-- Messages -->
            <a href="/pages/messages.html" class="relative v-touch text-white hover:text-gold transition-colors flex flex-col items-center"
               aria-label="Messages">
                <i class="fas fa-envelope text-lg"></i>
                <span class="message-badge-count badge hidden text-xs font-bold">0</span>
            </a>

            <!-- Notifications -->
            <a href="/pages/notifications.html" class="relative v-touch text-white hover:text-gold transition-colors flex flex-col items-center"
               aria-label="Notifications">
                <i class="fas fa-bell text-lg"></i>
                <span id="notification-badge-count" class="badge hidden text-xs font-bold">0</span>
            </a>

            <!-- Cart -->
            <a href="/pages/cart.html" class="relative v-touch text-white hover:text-gold transition-colors flex flex-col items-center"
               aria-label="Shopping cart">
                <i class="fas fa-shopping-cart text-lg"></i>
                <span class="cart-badge-count badge text-xs font-bold">0</span>
            </a>

            <!-- User Menu / Login -->
            <div id="user-profile-section" class="flex items-center space-x-4">
                <a href="/pages/login.html" id="login-link"
                    class="text-white hover:text-gold transition-colors font-medium">
                    Sign In
                </a>
            </div>

            <!-- User Dropdown (hidden until logged in) -->
            <div id="user-dropdown-container" class="hidden">
                <button id="user-dropdown-button" onclick="toggleUserMenu()"
                    class="text-white hover:text-gold transition-colors font-medium flex items-center space-x-2"
                    aria-label="User menu" aria-expanded="false">
                    <i class="fas fa-user-circle text-lg"></i>
                    <span id="user-greeting-short" class="text-sm"></span>
                </button>
                
                <div id="user-dropdown"
                    class="absolute right-0 top-full mt-2 w-56 bg-navy rounded-xl shadow-2xl z-[60] py-4 text-white hidden border border-gray-800"
                    role="menu">
                    <div class="px-4 pb-4 border-b border-gray-800 mb-2">
                        <a href="/pages/profile.html" class="bg-button-gold text-white text-center py-2 px-4 rounded-lg text-sm block font-semibold hover:bg-gold transition-colors" role="menuitem">My Profile</a>
                    </div>
                    <div class="px-2">
                        <a href="/pages/buyer-dashboard.html" class="flex items-center px-3 py-2 text-xs rounded-lg hover:bg-gray-800 transition-colors" role="menuitem">
                            <i class="fas fa-th-large mr-3 text-gray-400"></i>Dashboard
                        </a>
                        <a href="/pages/orders.html" class="flex items-center px-3 py-2 text-xs rounded-lg hover:bg-gray-800 transition-colors" role="menuitem">
                            <i class="fas fa-shopping-bag mr-3 text-gray-400"></i>My Orders
                        </a>
                        <a href="/pages/transactions.html" class="flex items-center px-3 py-2 text-xs rounded-lg hover:bg-gray-800 transition-colors" role="menuitem">
                            <i class="fas fa-exchange-alt mr-3 text-gray-400"></i>Transactions
                        </a>
                        <a href="/pages/reviews.html" class="flex items-center px-3 py-2 text-xs rounded-lg hover:bg-gray-800 transition-colors" role="menuitem">
                            <i class="fas fa-star mr-3 text-gray-400"></i>Reviews
                        </a>
                        
                        <!-- Seller Section (conditional) -->
                        <div id="seller-section" class="hidden">
                            <div class="border-t border-gray-800 my-2"></div>
                            <a href="/pages/seller-dashboard.html" class="flex items-center px-3 py-2 text-xs rounded-lg hover:bg-gray-800 transition-colors text-green-400" role="menuitem">
                                <i class="fas fa-store mr-3"></i>Seller Dashboard
                            </a>
                        </div>
                        
                        <!-- Admin Section (conditional) -->
                        <div id="admin-section" class="hidden">
                            <div class="border-t border-gray-800 my-2"></div>
                            <a href="/pages/admin-dashboard.html" class="flex items-center px-3 py-2 text-xs rounded-lg hover:bg-gray-800 transition-colors text-red-400" role="menuitem">
                                <i class="fas fa-cog mr-3"></i>Admin Panel
                            </a>
                        </div>
                        
                        <div class="border-t border-gray-800 my-2"></div>
                        <button id="logout-button" onclick="logout()" class="flex items-center w-full px-3 py-2 text-xs rounded-lg hover:bg-gray-800 transition-colors text-gray-300" role="menuitem">
                            <i class="fas fa-sign-out-alt mr-3"></i>Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</header>

<!-- Mobile Menu Overlay -->
<div id="mobile-menu-overlay" class="fixed inset-0 bg-black bg-opacity-50 hidden z-40 transition-opacity" 
     aria-hidden="true" onclick="closeMobileMenu()"></div>

<!-- Mobile Menu Content -->
<div id="mobile-menu-content" class="mobile-menu-content fixed top-0 left-0 w-80 max-w-[90vw] h-screen bg-navy text-white shadow-2xl z-50 overflow-y-auto transform -translate-x-full transition-transform duration-300 ease-out" role="navigation" aria-label="Main menu">
    
    <!-- Menu Header -->
    <div class="sticky top-0 bg-navy border-b border-gray-800 p-4 flex items-center justify-between">
        <h2 class="text-lg font-bold text-gold">Menu</h2>
        <button id="mobile-menu-close" class="text-white hover:text-gold transition-colors" aria-label="Close menu">
            <i class="fas fa-times text-2xl"></i>
        </button>
    </div>

    <!-- Menu Sections -->
    <div class="py-4">
        <!-- Account Section -->
        <div class="mobile-menu-section">
            <div class="mobile-menu-title px-4 py-2 text-xs font-bold text-gold uppercase tracking-widest">Account</div>
            <a href="/pages/login.html" id="mobile-menu-sign-link" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-sign-in-alt mr-3 w-5 text-center"></i>
                <span id="mobile-menu-sign-text">Sign In</span>
            </a>
            <a href="/pages/profile.html" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-user mr-3 w-5 text-center"></i>
                <span>My Profile</span>
            </a>
            <a href="/pages/buyer-dashboard.html" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-th-large mr-3 w-5 text-center"></i>
                <span>Dashboard</span>
            </a>
            <a href="/pages/orders.html" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-shopping-bag mr-3 w-5 text-center"></i>
                <span>My Orders</span>
            </a>
            <a href="/pages/transactions.html" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-exchange-alt mr-3 w-5 text-center"></i>
                <span>Transactions</span>
            </a>
        </div>

        <!-- Shopping Section -->
        <div class="mobile-menu-section border-t border-gray-800">
            <div class="mobile-menu-title px-4 py-2 text-xs font-bold text-gold uppercase tracking-widest">Shopping</div>
            <a href="/" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-home mr-3 w-5 text-center"></i>
                <span>Home</span>
            </a>
            <a href="/pages/products.html" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-th-large mr-3 w-5 text-center"></i>
                <span>All Products</span>
            </a>
            <a href="/pages/products.html?category=Hot%20Deals" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-tag mr-3 w-5 text-center"></i>
                <span>Hot Deals</span>
            </a>
        </div>

        <!-- Seller Section (conditional) -->
        <div id="mobile-seller-section" class="mobile-menu-section border-t border-gray-800 hidden">
            <div class="mobile-menu-title px-4 py-2 text-xs font-bold text-gold uppercase tracking-widest">Selling</div>
            <a href="/pages/seller-dashboard.html" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-store mr-3 w-5 text-center"></i>
                <span>My Shop</span>
            </a>
            <a href="/pages/create-product.html" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-plus mr-3 w-5 text-center"></i>
                <span>Create Product</span>
            </a>
        </div>

        <!-- Admin Section (conditional) -->
        <div id="mobile-admin-section" class="mobile-menu-section border-t border-gray-800 hidden">
            <div class="mobile-menu-title px-4 py-2 text-xs font-bold text-gold uppercase tracking-widest">Administration</div>
            <a href="/pages/admin-dashboard.html" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-cog mr-3 w-5 text-center"></i>
                <span>Admin Dashboard</span>
            </a>
        </div>

        <!-- Support Section -->
        <div class="mobile-menu-section border-t border-gray-800">
            <div class="mobile-menu-title px-4 py-2 text-xs font-bold text-gold uppercase tracking-widest">Support</div>
            <a href="/pages/faq.html" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-question-circle mr-3 w-5 text-center"></i>
                <span>Help Center</span>
            </a>
            <a href="/pages/contact-support.html" class="mobile-menu-link px-4 py-2 flex items-center text-gray-200 hover:text-gold hover:bg-gray-800 transition-colors" role="menuitem">
                <i class="fas fa-envelope mr-3 w-5 text-center"></i>
                <span>Contact Us</span>
            </a>
        </div>
    </div>
</div>
        `;
    }

    /**
     * Initialize authentication state
     */
    async initializeAuthState() {
        const token = localStorage.getItem('token');
        const userFullName = localStorage.getItem('userFullName');

        if (token) {
            try {
                // Try to fetch latest user data
                await this.fetchAndUpdateUserData();
            } catch (error) {
                console.log('Using cached user data:', userFullName);
                this.updateUIForLoggedInUser(userFullName);
            }
        } else {
            this.updateUIForLoggedOutUser();
        }
    }

    /**
     * Fetch user data from server
     */
    async fetchAndUpdateUserData() {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token available');

        const response = await fetch(`${API_BASE}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch user profile');

        const userData = await response.json();
        
        // Update localStorage if needed
        if (userData.fullName) localStorage.setItem('userFullName', userData.fullName);
        if (userData.email) localStorage.setItem('userEmail', userData.email);
        
        this.userData = userData;
        this.updateUIForLoggedInUser(userData.fullName || localStorage.getItem('userFullName'));
        
        // Update UI for seller/admin status
        this.updateConditionalSections(userData);
    }

    /**
     * Update UI for logged-in user
     */
    updateUIForLoggedInUser(fullName) {
        // Hide login link, show user dropdown
        const loginLink = document.getElementById('login-link');
        const userDropdownContainer = document.getElementById('user-dropdown-container');
        const userGreetingShort = document.getElementById('user-greeting-short');

        if (loginLink) loginLink.classList.add('hidden');
        if (userDropdownContainer) userDropdownContainer.classList.remove('hidden');
        
        // Set user greeting
        const firstName = fullName?.split(' ')[0] || 'User';
        if (userGreetingShort) userGreetingShort.textContent = firstName;

        // Update mobile menu
        const mobileMenuSignLink = document.getElementById('mobile-menu-sign-link');
        const mobileMenuSignText = document.getElementById('mobile-menu-sign-text');
        
        if (mobileMenuSignLink && mobileMenuSignText) {
            mobileMenuSignLink.href = '#';
            mobileMenuSignLink.onclick = (e) => {
                e.preventDefault();
                window.logout?.();
            };
            mobileMenuSignText.textContent = 'Sign Out';
            const icon = mobileMenuSignLink.querySelector('i');
            if (icon) icon.className = 'fas fa-sign-out-alt';
        }
    }

    /**
     * Update UI for logged-out user
     */
    updateUIForLoggedOutUser() {
        const loginLink = document.getElementById('login-link');
        const userDropdownContainer = document.getElementById('user-dropdown-container');
        
        if (loginLink) loginLink.classList.remove('hidden');
        if (userDropdownContainer) userDropdownContainer.classList.add('hidden');

        // Hide conditional sections
        const sellerSection = document.getElementById('seller-section');
        const adminSection = document.getElementById('admin-section');
        const mobileSellerSection = document.getElementById('mobile-seller-section');
        const mobileAdminSection = document.getElementById('mobile-admin-section');

        [sellerSection, adminSection, mobileSellerSection, mobileAdminSection].forEach(el => {
            if (el) el.classList.add('hidden');
        });

        // Update mobile menu
        const mobileMenuSignLink = document.getElementById('mobile-menu-sign-link');
        const mobileMenuSignText = document.getElementById('mobile-menu-sign-text');
        
        if (mobileMenuSignLink && mobileMenuSignText) {
            mobileMenuSignLink.href = '/pages/login.html';
            mobileMenuSignLink.onclick = null;
            mobileMenuSignText.textContent = 'Sign In';
            const icon = mobileMenuSignLink.querySelector('i');
            if (icon) icon.className = 'fas fa-sign-in-alt';
        }
    }

    /**
     * Update conditional sections based on user role
     */
    updateConditionalSections(userData) {
        const isSeller = userData.isSeller || userData.role === 'seller';
        const isAdmin = userData.role === 'admin' || userData.isAdmin === 'true' || userData.isAdmin === true;

        // Desktop sections
        const sellerSection = document.getElementById('seller-section');
        const adminSection = document.getElementById('admin-section');

        if (sellerSection) {
            isSeller ? sellerSection.classList.remove('hidden') : sellerSection.classList.add('hidden');
        }
        if (adminSection) {
            isAdmin ? adminSection.classList.remove('hidden') : adminSection.classList.add('hidden');
        }

        // Mobile sections
        const mobileSellerSection = document.getElementById('mobile-seller-section');
        const mobileAdminSection = document.getElementById('mobile-admin-section');

        if (mobileSellerSection) {
            isSeller ? mobileSellerSection.classList.remove('hidden') : mobileSellerSection.classList.add('hidden');
        }
        if (mobileAdminSection) {
            isAdmin ? mobileAdminSection.classList.remove('hidden') : mobileAdminSection.classList.add('hidden');
        }
    }

    /**
     * Initialize search functionality
     */
    initializeSearch() {
        const mobileSearchInput = document.getElementById('mobile-search-input');
        const desktopSearchInput = document.getElementById('desktop-search-input');
        const mobileSearchButton = document.getElementById('mobile-search-button');
        const desktopSearchButton = document.getElementById('desktop-search-button');

        // Mobile search
        if (mobileSearchInput) {
            const handler = () => {
                const query = mobileSearchInput.value.trim();
                if (query) {
                    window.location.href = `/pages/products.html?search=${encodeURIComponent(query)}`;
                }
            };
            
            mobileSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handler();
            });
            if (mobileSearchButton) {
                mobileSearchButton.addEventListener('click', handler);
            }
        }

        // Desktop search
        if (desktopSearchInput) {
            const handler = () => {
                const query = desktopSearchInput.value.trim();
                if (query) {
                    window.location.href = `/pages/products.html?search=${encodeURIComponent(query)}`;
                }
            };
            
            desktopSearchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') handler();
            });
            if (desktopSearchButton) {
                desktopSearchButton.addEventListener('click', handler);
            }
        }
    }

    /**
     * Initialize mobile menu with best practices
     */
    initializeMobileMenu() {
        const menuToggle = document.getElementById('mobile-menu-toggle');
        const menuOverlay = document.getElementById('mobile-menu-overlay');
        const menuClose = document.getElementById('mobile-menu-close');
        const menuContent = document.getElementById('mobile-menu-content');

        if (!menuToggle) return;

        // Open menu
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openMobileMenu();
        });

        // Close menu on backdrop click
        if (menuOverlay) {
            menuOverlay.addEventListener('click', () => this.closeMobileMenu());
        }

        // Close button
        if (menuClose) {
            menuClose.addEventListener('click', () => this.closeMobileMenu());
        }

        // Close on menu link click
        if (menuContent) {
            menuContent.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', (e) => {
                    // Don't close for hash links
                    if (!link.getAttribute('href').startsWith('#')) {
                        this.closeMobileMenu();
                    }
                });
            });

            // Prevent overlay scroll when menu is open
            menuContent.addEventListener('touchmove', (e) => {
                e.stopPropagation();
            });
        }

        // Keyboard: Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeMobileMenu();
            }
        });

        // Store this instance for global access
        window.mobileMenuManager = this;
    }

    /**
     * Open mobile menu
     */
    openMobileMenu() {
        const menuOverlay = document.getElementById('mobile-menu-overlay');
        const menuContent = document.getElementById('mobile-menu-content');
        const menuToggle = document.getElementById('mobile-menu-toggle');

        if (menuOverlay) menuOverlay.classList.remove('hidden');
        if (menuContent) menuContent.classList.remove('-translate-x-full');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'true');

        // Prevent body scroll
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        const menuOverlay = document.getElementById('mobile-menu-overlay');
        const menuContent = document.getElementById('mobile-menu-content');
        const menuToggle = document.getElementById('mobile-menu-toggle');

        if (menuOverlay) menuOverlay.classList.add('hidden');
        if (menuContent) menuContent.classList.add('-translate-x-full');
        if (menuToggle) menuToggle.setAttribute('aria-expanded', 'false');

        // Restore body scroll
        document.body.style.overflow = '';
    }

    /**
     * Initialize notification badge updates
     */
    initializeNotifications() {
        // Fetch and update notification count periodically
        this.updateNotificationBadges();
        
        // Refresh every 30 seconds
        setInterval(() => this.updateNotificationBadges(), 30000);
    }

    /**
     * Update notification badges
     */
    async updateNotificationBadges() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const response = await fetch(`${API_BASE}/notifications/unread-count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                const count = data.unreadCount || 0;

                // Update all badge elements
                document.querySelectorAll('#notification-badge-count, #mobile-notification-badge').forEach(badge => {
                    badge.textContent = count;
                    if (count > 0) {
                        badge.classList.remove('hidden');
                    } else {
                        badge.classList.add('hidden');
                    }
                });
            }
        } catch (error) {
            console.log('Failed to update notification badges:', error);
        }
    }

    /**
     * Initialize user dropdown
     */
    initializeUserDropdown() {
        const dropdownButton = document.getElementById('user-dropdown-button');
        const dropdown = document.getElementById('user-dropdown');

        if (dropdownButton && dropdown) {
            dropdownButton.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('hidden');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!dropdownButton.contains(e.target) && !dropdown.contains(e.target)) {
                    dropdown.classList.add('hidden');
                }
            });
        }
    }

    /**
     * Setup observer for auth state changes
     */
    setupAuthStateObserver() {
        // Listen for storage changes (token updates from other tabs)
        window.addEventListener('storage', (e) => {
            if (e.key === 'token' || e.key === 'userFullName') {
                console.log('Auth state changed in another tab, updating...');
                this.initializeAuthState();
            }
        });

        // Listen for custom auth change events
        document.addEventListener('authStateChanged', () => {
            console.log('Auth state changed, updating header...');
            this.initializeAuthState();
        });
    }

    /**
     * Initialization fallback for basic functionality
     */
    initializeBasicFunctionality() {
        console.warn('Running in basic functionality mode');
        
        // Still initialize mobile menu even if auth fails
        this.initializeMobileMenu();
        
        // Still initialize search
        this.initializeSearch();
    }
}

// Make global functions
window.closeMobileMenu = function() {
    window.mobileMenuManager?.closeMobileMenu();
};

window.toggleUserMenu = function() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.toggle('hidden');
};

// Initialize on load
if (typeof document !== 'undefined') {
    new UnifiedHeader();
}
