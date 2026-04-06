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
        let header = document.querySelector('header.bg-gradient-to-r');
        
        if (!header) {
            const headerHTML = this.getUnifiedHeaderHTML();
            const body = document.body;
            body.insertAdjacentHTML('afterbegin', headerHTML);
            header = document.querySelector('header.bg-gradient-to-r');
        }
        
        // Inject horizontal category navigation if it doesn't exist
        this.ensureHorizontalNavigationExists();
        
        // Add enhanced CSS styles
        this.addEnhancedStyles();
        
        return header;
    }

    /**
     * Ensure horizontal category navigation exists
     */
    ensureHorizontalNavigationExists() {
        // Initialize mobile category scroller from mobile-header.js functionality
        this.initializeMobileCategoryScroller();
    }

    /**
     * Add enhanced CSS styles for the improved header
     */
    addEnhancedStyles() {
        if (document.getElementById('enhanced-header-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'enhanced-header-styles';
        style.textContent = `
            /* Enhanced Header Animations */
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
            
            @keyframes glow {
                0%, 100% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.3); }
                50% { box-shadow: 0 0 30px rgba(255, 215, 0, 0.6); }
            }
            
            /* Header hover effects */
            header:hover {
                animation: glow 2s ease-in-out infinite;
            }
            
            /* Search input focus enhancement */
            #mobile-search-input:focus,
            #desktop-search-input:focus {
                background: rgba(255, 255, 255, 0.15) !important;
                border-color: rgba(255, 215, 0, 0.5) !important;
                box-shadow: 0 0 20px rgba(255, 215, 0, 0.2) !important;
            }
            
            /* Button hover animations */
            .v-touch:hover {
                transform: translateY(-1px);
            }
            
            /* Mobile menu slide animation */
            .mobile-menu-content.active {
                animation: slideIn 0.3s ease-out;
            }
            
            @keyframes slideIn {
                from { transform: translateX(-100%); }
                to { transform: translateX(0); }
            }
            
            /* Badge pulse animation */
            .badge {
                animation: pulse 2s infinite;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            /* Gradient text animation */
            .bg-gradient-to-r.from-gold {
                background-size: 200% 200%;
                animation: gradientShift 3s ease infinite;
            }
            
            @keyframes gradientShift {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
            }
            
            /* Enhanced dropdown */
            #user-dropdown {
                backdrop-filter: blur(20px);
                border: 1px solid rgba(255, 215, 0, 0.2);
            }
            
            /* Mobile menu backdrop blur */
            #mobile-menu-overlay.active {
                backdrop-filter: blur(4px);
            }
            
            /* Quick action buttons */
            .bg-gradient-to-r.from-green-500,
            .bg-gradient-to-r.from-blue-500 {
                position: relative;
                overflow: hidden;
            }
            
            .bg-gradient-to-r.from-green-500::before,
            .bg-gradient-to-r.from-blue-500::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.5s;
            }
            
            .bg-gradient-to-r.from-green-500:hover::before,
            .bg-gradient-to-r.from-blue-500:hover::before {
                left: 100%;
            }
            
            /* Horizontal Category Navigation Styles */
            .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            
            .hide-scrollbar::-webkit-scrollbar {
                display: none;
            }
            
            .mobile-category-scroller {
                background: linear-gradient(to right, #0A1128, #1a1f35);
                border-bottom: 1px solid rgba(255, 215, 0, 0.1);
            }
            
            .mobile-category-item {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .mobile-category-item:hover {
                transform: translateY(-2px);
            }
            
            .mobile-category-icon {
                transition: all 0.3s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
            }
            
            .mobile-category-item:hover .mobile-category-icon {
                border-color: #FFD700 !important;
                box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
            }
            
            .mobile-category-text {
                transition: color 0.3s ease;
            }
            
            .mobile-category-item:hover .mobile-category-text {
                color: #FFD700 !important;
            }
            
            /* Mobile search suggestions */
            #mobile-search-suggestions {
                background: rgba(10, 17, 40, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 215, 0, 0.2);
                border-radius: 0.5rem;
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
                max-height: 300px;
                overflow-y: auto;
            }
            
            .mobile-search-suggestion-item:hover {
                background: rgba(255, 255, 255, 0.05);
            }
        `;
        document.head.appendChild(style);
    }

    /**
     * Get unified header HTML template
     */
    getUnifiedHeaderHTML() {
        return `
<header class="bg-gradient-to-r from-slate-900 via-navy to-slate-800 text-white shadow-2xl sticky top-0 z-50 backdrop-blur-sm bg-opacity-95 border-b border-gold/20" role="banner">
    <!-- Mobile Header Row 1 (Hamburger, Logo, Actions) -->
    <div class="v-container mobile-header-row-1 md:hidden">
        <div class="flex items-center justify-between py-4 px-2">
            <!-- Hamburger Menu -->
            <button id="mobile-menu-toggle" class="v-touch text-white hover:text-gold transition-all duration-300 p-2 rounded-lg hover:bg-white/10 group" 
                    aria-label="Toggle menu" aria-controls="mobile-menu-overlay" aria-expanded="false">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 group-hover:scale-110 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            <!-- Brand Logo -->
            <div class="flex-1 text-center">
                <a href="/" class="text-2xl font-bold bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent hover:from-yellow-300 hover:to-yellow-500 transition-all duration-300 mobile-logo transform hover:scale-105">
                    Virtuosa
                </a>
            </div>

            <!-- Mobile Actions -->
            <div class="flex items-center space-x-1">
                <!-- Quick Sell Button -->
                <a href="/pages/seller.html" class="v-touch bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl" 
                   aria-label="Start Selling">
                    <i class="fas fa-plus text-xs mr-1"></i>
                    Sell
                </a>

                <!-- Notifications -->
                <a href="/pages/notifications.html" class="relative v-touch text-white hover:text-gold transition-all duration-300 p-2 rounded-lg hover:bg-white/10 group" 
                   aria-label="Notifications">
                    <i class="fas fa-bell text-lg group-hover:scale-110 transition-transform duration-200"></i>
                    <span id="mobile-notification-badge" class="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-gradient-to-r from-red-500 to-pink-600 rounded-full shadow-lg animate-pulse hidden">0</span>
                </a>

                <!-- Cart -->
                <a href="/pages/cart.html" class="relative v-touch text-white hover:text-gold transition-all duration-300 p-2 rounded-lg hover:bg-white/10 group" 
                   aria-label="Shopping cart">
                    <i class="fas fa-shopping-cart text-lg group-hover:scale-110 transition-transform duration-200"></i>
                    <span class="cart-badge-count absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg hidden">0</span>
                </a>
            </div>
        </div>
    </div>

    <!-- Mobile Header Row 2 (Search) -->
    <div class="v-container mobile-header-row-2 pb-4 md:hidden px-4">
        <div class="relative mobile-search-container">
            <div class="relative">
                <input id="mobile-search-input" type="text" 
                    placeholder="Search campus marketplace..." 
                    class="w-full pl-12 pr-12 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 bg-white/10 backdrop-blur-md text-white placeholder-gray-300 border border-white/20 shadow-lg"
                    autocomplete="off" aria-label="Search products">
                <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gold">
                    <i class="fas fa-search"></i>
                </div>
                <button id="mobile-search-button" 
                    class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-gold transition-colors bg-white/10 rounded-lg p-1"
                    aria-label="Search">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            <!-- Search Suggestions -->
            <div id="mobile-search-suggestions" class="absolute top-full left-0 right-0 mt-2 w-full bg-slate-900/95 backdrop-blur-md border border-gold/20 rounded-2xl shadow-2xl max-h-72 overflow-y-auto hidden z-50" role="listbox">
            </div>
        </div>
    </div>

    <!-- Desktop Header (768px+) -->
    <div class="v-container v-header-row desktop-header hidden md:flex md:items-center md:justify-between py-4">
        <!-- Logo & Quick Actions -->
        <div class="flex items-center space-x-6">
            <!-- Logo -->
            <div class="v-header-logo flex-shrink-0">
                <a href="/" class="text-3xl font-bold bg-gradient-to-r from-gold via-yellow-400 to-gold bg-clip-text text-transparent hover:from-yellow-300 hover:to-yellow-500 transition-all duration-300 transform hover:scale-105">
                    Virtuosa
                </a>
            </div>

            <!-- Quick Navigation -->
            <nav class="hidden lg:flex items-center space-x-1">
                <a href="/" class="px-4 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 font-medium">Home</a>
                <a href="/pages/products.html" class="px-4 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 font-medium">Browse</a>
                <a href="/pages/products.html?category=Hot%20Deals" class="px-4 py-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300 font-medium relative">
                    Hot Deals
                    <span class="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                </a>
                <a href="/pages/seller.html" class="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                    Start Selling
                </a>
            </nav>
        </div>

        <!-- Search -->
        <div class="v-header-search flex-1 mx-6 max-w-2xl">
            <div class="relative">
                <input id="desktop-search-input" type="text" 
                    placeholder="Search for textbooks, electronics, and more..."
                    class="w-full px-6 py-3 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-gold/50 bg-white/10 backdrop-blur-md text-white placeholder-gray-300 border border-white/20 shadow-lg"
                    autocomplete="off" aria-label="Search products">
                <div class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gold">
                    <i class="fas fa-search"></i>
                </div>
                <button id="desktop-search-button" 
                    class="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-300 hover:text-gold transition-colors bg-white/10 rounded-lg p-2"
                    aria-label="Search">
                    <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            <!-- Desktop Search Suggestions -->
            <div id="home-search-suggestions" class="absolute top-full left-0 right-0 mt-2 w-full bg-slate-900/95 backdrop-blur-md border border-gold/20 rounded-2xl shadow-2xl max-h-72 overflow-y-auto hidden z-50" role="listbox">
            </div>
        </div>

        <!-- Desktop Actions -->
        <div id="user-info-container" class="v-header-actions flex items-center space-x-4">
            <!-- Messages -->
            <a href="/pages/messages.html" class="relative v-touch text-white hover:text-gold transition-all duration-300 p-3 rounded-xl hover:bg-white/10 group" 
               aria-label="Messages">
                <i class="fas fa-envelope text-lg group-hover:scale-110 transition-transform duration-200"></i>
                <span class="message-badge-count absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-gradient-to-r from-purple-500 to-pink-600 rounded-full shadow-lg hidden">0</span>
            </a>

            <!-- Notifications -->
            <a href="/pages/notifications.html" class="relative v-touch text-white hover:text-gold transition-all duration-300 p-3 rounded-xl hover:bg-white/10 group" 
               aria-label="Notifications">
                <i class="fas fa-bell text-lg group-hover:scale-110 transition-transform duration-200"></i>
                <span id="notification-badge-count" class="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-gradient-to-r from-red-500 to-pink-600 rounded-full shadow-lg animate-pulse hidden">0</span>
            </a>

            <!-- Cart -->
            <a href="/pages/cart.html" class="relative v-touch text-white hover:text-gold transition-all duration-300 p-3 rounded-xl hover:bg-white/10 group" 
               aria-label="Shopping cart">
                <i class="fas fa-shopping-cart text-lg group-hover:scale-110 transition-transform duration-200"></i>
                <span class="cart-badge-count absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg hidden">0</span>
            </a>

            <!-- User Menu / Login -->
            <div id="user-profile-section" class="flex items-center space-x-4">
                <a href="/pages/login.html" id="login-link"
                    class="bg-gradient-to-r from-gold to-yellow-500 hover:from-yellow-400 hover:to-yellow-600 text-navy px-6 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                    Sign In
                </a>
            </div>

            <!-- User Dropdown (hidden until logged in) -->
            <div id="user-dropdown-container" class="hidden">
                <button id="user-dropdown-button" onclick="toggleUserMenu()"
                    class="text-white hover:text-gold transition-all duration-300 p-2 rounded-xl hover:bg-white/10 flex items-center space-x-2 group"
                    aria-label="User menu" aria-expanded="false">
                    <div class="w-8 h-8 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-navy text-sm"></i>
                    </div>
                    <span id="user-greeting-short" class="text-sm font-medium hidden lg:block"></span>
                    <i class="fas fa-chevron-down text-xs group-hover:rotate-180 transition-transform duration-200"></i>
                </button>

                <div id="user-dropdown"
                    class="absolute right-0 top-full mt-3 w-64 bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl z-[60] py-4 text-white border border-gold/20"
                    role="menu">
                    <div class="px-4 pb-4 border-b border-gold/20 mb-2">
                        <div class="flex items-center space-x-3 mb-3">
                            <div class="w-12 h-12 bg-gradient-to-r from-gold to-yellow-500 rounded-full flex items-center justify-center">
                                <i class="fas fa-user text-navy text-lg"></i>
                            </div>
                            <div>
                                <p class="font-semibold text-white">Welcome back!</p>
                                <p id="user-greeting-full" class="text-sm text-gray-300"></p>
                            </div>
                        </div>
                        <a href="/pages/profile.html" class="bg-gradient-to-r from-gold to-yellow-500 text-navy text-center py-3 px-4 rounded-xl text-sm block font-semibold hover:from-yellow-400 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105" role="menuitem">My Profile</a>
                    </div>
                    <div class="px-2">
                        <a href="/pages/buyer-dashboard.html" class="flex items-center px-3 py-3 text-sm rounded-xl hover:bg-white/10 transition-all duration-300 group" role="menuitem">
                            <i class="fas fa-th-large mr-3 text-gold group-hover:scale-110 transition-transform duration-200"></i>
                            <span>Dashboard</span>
                        </a>
                        <a href="/pages/orders.html" class="flex items-center px-3 py-3 text-sm rounded-xl hover:bg-white/10 transition-all duration-300 group" role="menuitem">
                            <i class="fas fa-shopping-bag mr-3 text-gold group-hover:scale-110 transition-transform duration-200"></i>
                            <span>My Orders</span>
                        </a>
                        <a href="/pages/transactions.html" class="flex items-center px-3 py-3 text-sm rounded-xl hover:bg-white/10 transition-all duration-300 group" role="menuitem">
                            <i class="fas fa-exchange-alt mr-3 text-gold group-hover:scale-110 transition-transform duration-200"></i>
                            <span>Transactions</span>
                        </a>
                        <a href="/pages/reviews.html" class="flex items-center px-3 py-3 text-sm rounded-xl hover:bg-white/10 transition-all duration-300 group" role="menuitem">
                            <i class="fas fa-star mr-3 text-gold group-hover:scale-110 transition-transform duration-200"></i>
                            <span>Reviews</span>
                        </a>

                        <!-- Seller Section (conditional) -->
                        <div id="seller-section" class="hidden">
                            <div class="border-t border-gold/20 my-2"></div>
                            <a href="/pages/seller-dashboard.html" class="flex items-center px-3 py-3 text-sm rounded-xl hover:bg-white/10 transition-all duration-300 text-green-400 group" role="menuitem">
                                <i class="fas fa-store mr-3 group-hover:scale-110 transition-transform duration-200"></i>
                                <span>Seller Dashboard</span>
                            </a>
                        </div>

                        <!-- Admin Section (conditional) -->
                        <div id="admin-section" class="hidden">
                            <div class="border-t border-gold/20 my-2"></div>
                            <a href="/pages/admin-dashboard.html" class="flex items-center px-3 py-3 text-sm rounded-xl hover:bg-white/10 transition-all duration-300 text-red-400 group" role="menuitem">
                                <i class="fas fa-cog mr-3 group-hover:scale-110 transition-transform duration-200"></i>
                                <span>Admin Panel</span>
                            </a>
                        </div>

                        <div class="border-t border-gold/20 my-2"></div>
                        <button id="logout-button" onclick="logout()" class="flex items-center w-full px-3 py-3 text-sm rounded-xl hover:bg-white/10 transition-all duration-300 text-gray-300 group" role="menuitem">
                            <i class="fas fa-sign-out-alt mr-3 group-hover:scale-110 transition-transform duration-200"></i>
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</header>

<!-- Mobile Menu Overlay -->
<div id="mobile-menu-overlay" class="fixed inset-0 bg-black/60 backdrop-blur-sm hidden z-40 transition-all duration-300" 
     aria-hidden="true" onclick="closeMobileMenu()"></div>

<!-- Mobile Menu Content -->
<div id="mobile-menu-content" class="mobile-menu-content fixed top-0 left-0 w-80 max-w-[90vw] h-screen bg-gradient-to-b from-slate-900 via-navy to-slate-800 text-white shadow-2xl z-50 overflow-y-auto transform -translate-x-full transition-all duration-300 ease-out border-r border-gold/20" role="navigation" aria-label="Main menu">

    <!-- Menu Header -->
    <div class="sticky top-0 bg-gradient-to-r from-slate-900 to-navy border-b border-gold/20 p-4 flex items-center justify-between backdrop-blur-sm">
        <h2 class="text-lg font-bold bg-gradient-to-r from-gold to-yellow-400 bg-clip-text text-transparent">Menu</h2>
        <button id="mobile-menu-close" class="text-white hover:text-gold transition-all duration-300 p-2 rounded-lg hover:bg-white/10" aria-label="Close menu">
            <i class="fas fa-times text-xl"></i>
        </button>
    </div>

    <!-- Menu Sections -->
    <div class="py-4">
        <!-- Quick Actions -->
        <div class="mobile-menu-section px-4 mb-6">
            <div class="grid grid-cols-2 gap-3">
                <a href="/pages/seller.html" class="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white p-4 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                    <i class="fas fa-plus text-2xl mb-2 block"></i>
                    <span class="text-sm font-semibold">Start Selling</span>
                </a>
                <a href="/pages/products.html" class="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-400 hover:to-purple-500 text-white p-4 rounded-2xl text-center transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                    <i class="fas fa-search text-2xl mb-2 block"></i>
                    <span class="text-sm font-semibold">Browse</span>
                </a>
            </div>
        </div>

        <!-- Account Section -->
        <div class="mobile-menu-section">
            <div class="mobile-menu-title px-4 py-2 text-xs font-bold text-gold uppercase tracking-widest">Account</div>
            <a href="/pages/login.html" id="mobile-menu-sign-link" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2" role="menuitem">
                <i class="fas fa-sign-in-alt mr-3 w-5 text-center"></i>
                <span id="mobile-menu-sign-text">Sign In</span>
            </a>
            <a href="/pages/profile.html" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2" role="menuitem">
                <i class="fas fa-user mr-3 w-5 text-center"></i>
                <span>My Profile</span>
            </a>
            <a href="/pages/buyer-dashboard.html" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2" role="menuitem">
                <i class="fas fa-th-large mr-3 w-5 text-center"></i>
                <span>Dashboard</span>
            </a>
            <a href="/pages/orders.html" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2" role="menuitem">
                <i class="fas fa-shopping-bag mr-3 w-5 text-center"></i>
                <span>My Orders</span>
            </a>
            <a href="/pages/transactions.html" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2" role="menuitem">
                <i class="fas fa-exchange-alt mr-3 w-5 text-center"></i>
                <span>Transactions</span>
            </a>
        </div>

        <!-- Shopping Section -->
        <div class="mobile-menu-section border-t border-gold/20">
            <div class="mobile-menu-title px-4 py-2 text-xs font-bold text-gold uppercase tracking-widest">Shopping</div>
            <a href="/" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2" role="menuitem">
                <i class="fas fa-home mr-3 w-5 text-center"></i>
                <span>Home</span>
            </a>
            <a href="/pages/products.html" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2" role="menuitem">
                <i class="fas fa-th-large mr-3 w-5 text-center"></i>
                <span>All Products</span>
            </a>
            <a href="/pages/products.html?category=Hot%20Deals" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2 relative" role="menuitem">
                <i class="fas fa-tag mr-3 w-5 text-center"></i>
                <span>Hot Deals</span>
                <span class="absolute right-4 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
            </a>
        </div>

        <!-- Seller Section (conditional) -->
        <div id="mobile-seller-section" class="mobile-menu-section border-t border-gold/20 hidden">
            <div class="mobile-menu-title px-4 py-2 text-xs font-bold text-gold uppercase tracking-widest">Selling</div>
            <a href="/pages/seller-dashboard.html" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2" role="menuitem">
                <i class="fas fa-store mr-3 w-5 text-center"></i>
                <span>My Shop</span>
            </a>
            <a href="/pages/create-product.html" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2" role="menuitem">
                <i class="fas fa-plus mr-3 w-5 text-center"></i>
                <span>Create Product</span>
            </a>
        </div>

        <!-- Admin Section (conditional) -->
        <div id="mobile-admin-section" class="mobile-menu-section border-t border-gold/20 hidden">
            <div class="mobile-menu-title px-4 py-2 text-xs font-bold text-gold uppercase tracking-widest">Administration</div>
            <a href="/pages/admin-dashboard.html" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2" role="menuitem">
                <i class="fas fa-cog mr-3 w-5 text-center"></i>
                <span>Admin Dashboard</span>
            </a>
        </div>

        <!-- Support Section -->
        <div class="mobile-menu-section border-t border-gold/20">
            <div class="mobile-menu-title px-4 py-2 text-xs font-bold text-gold uppercase tracking-widest">Support</div>
            <a href="/pages/faq.html" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2" role="menuitem">
                <i class="fas fa-question-circle mr-3 w-5 text-center"></i>
                <span>Help Center</span>
            </a>
            <a href="/pages/contact-support.html" class="mobile-menu-link px-4 py-3 flex items-center text-gray-200 hover:text-gold hover:bg-white/10 transition-all duration-300 rounded-xl mx-2" role="menuitem">
                <i class="fas fa-envelope mr-3 w-5 text-center"></i>
                <span>Contact Us</span>
            </a>
        </div>
    </div>
</div>
        `;

    }

    /**
     * Initialize search functionality (adapted from mobile-header.js and header.js)
     */
    async initializeSearch() {
        // Initialize mobile search
        this.initializeMobileSearch();
        
        // Initialize desktop search
        this.initializeDesktopSearch();
    }

    /**
     * Initialize mobile search functionality
     */
    async initializeMobileSearch() {
        // Get mobile search elements
        const mobileSearchInput = document.getElementById('mobile-search-input');
        const mobileSearchButton = document.getElementById('mobile-search-button');
        const mobileSearchSuggestions = document.getElementById('mobile-search-suggestions');

        if (!mobileSearchInput || !mobileSearchButton || !mobileSearchSuggestions) {
            console.warn('Mobile search elements not found');
            return;
        }

        // Add event listeners for mobile search
        mobileSearchInput.addEventListener('input', (e) => {
            this.handleMobileSearchInput(e.target.value, mobileSearchSuggestions);
        });

        mobileSearchButton.addEventListener('click', () => {
            this.performMobileSearch(mobileSearchInput.value);
        });

        mobileSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.performMobileSearch(mobileSearchInput.value);
            }
        });
    }

    /**
     * Handle mobile search input
     */
    handleMobileSearchInput(query, suggestionsContainer) {
        // Implementation for mobile search input handling
    }

    /**
     * Initialize mobile category scroller (adapted from mobile-header.js)
     */
    async initializeMobileCategoryScroller() {
        // Check if we have the mobile header search row to append below
        const searchRow = document.querySelector('.mobile-header-row-2');
        if (!searchRow) return;
        
        // Prevent multiple scrollers
        if (document.querySelector('.mobile-category-scroller')) return;

        try {
            let activeCats = [];
            try {
                const mkResponse = await fetch(`${API_BASE}/public/marketing/category-cards`);
                if (mkResponse.ok) {
                    const categoryCards = await mkResponse.json();
                    activeCats = categoryCards.filter(c => c.active).sort((a,b) => a.displayOrder - b.displayOrder);
                }
            } catch (e) {
                console.warn('Could not load marketing categories for scroller:', e);
            }
            
            // Fallback to standard categories if marketing is empty
            if (activeCats.length === 0) {
                const fallbackResponse = await fetch(`${API_BASE}/categories`);
                if (fallbackResponse.ok) {
                    const categories = await fallbackResponse.json();
                    // Pick some commonly popular categories to ensure the mobile scroller has data
                    const fallbackNames = ['Hot Deals', 'Best Sellers', "Men's Clothing", "Women's Clothing", 'Electronics', 'Computers & Software', 'Shoes', 'Accessories'];
                    
                    activeCats = fallbackNames.map((name, index) => {
                        const found = categories.find(c => c.name === name);
                        return {
                            title: name,
                            link: `/products?category=${encodeURIComponent(name)}`,
                            image: found ? found.image : null,
                            active: true,
                            displayOrder: index
                        };
                    });
                }
            }
            
            if (activeCats.length === 0) return;
            
            const scrollerContainer = document.createElement('div');
            scrollerContainer.className = 'mobile-category-scroller md:hidden flex flex-row overflow-x-auto whitespace-nowrap hide-scrollbar items-center bg-[#0A1128] gap-4 border-gray-100 transition-all duration-300 ease-in-out origin-top overflow-y-hidden border-b shadow-sm'; 
            
            // Define initial visible styles
            scrollerContainer.style.maxHeight = '140px';
            scrollerContainer.style.paddingTop = '0.875rem';
            scrollerContainer.style.paddingBottom = '0.875rem';
            scrollerContainer.style.paddingLeft = '1.25rem';
            scrollerContainer.style.paddingRight = '1.25rem';
            scrollerContainer.style.opacity = '1';
            
            scrollerContainer.innerHTML = activeCats.map(cat => {
                let targetUrl = cat.link ? (cat.link.startsWith('/') ? cat.link : '/pages/' + cat.link) : `/pages/products.html?category=${encodeURIComponent(cat.title)}`;
                // Fix double /pages/ in URLs if present
                if (targetUrl.includes('/pages/pages/')) {
                    targetUrl = targetUrl.replace('/pages/pages/', '/pages/');
                }
                if (!targetUrl.startsWith('/') && !targetUrl.startsWith('http')) {
                     targetUrl = '/' + targetUrl; // Force absolute path to avoid missing products in nested folders
                }
                // Enhance cat object with cleaned URL for desktop reuse
                cat.targetUrl = targetUrl;
                
                const imageUrl = cat.image?.startsWith('http') ? cat.image : 
                                (cat.image ? `${API_BASE.replace('/api', '')}${cat.image}` : null);
                // Enhance cat object with cleaned image mapping for desktop reuse
                cat.imageUrl = imageUrl;
                
                return `
                    <a href="${targetUrl}" class="mobile-category-item flex flex-col items-center no-underline text-gray-400 hover:text-gold transition-all duration-300 shrink-0 hover:scale-105" style="min-width: 60px;">
                        <div class="mobile-category-icon w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-1.5 overflow-hidden border-2 border-transparent hover:border-gold transition-all shadow-sm">
                            ${imageUrl ? `<img src="${imageUrl}" class="w-full h-full object-cover rounded-full" alt="${cat.title}">` : `<i class="fas fa-search text-gray-400"></i>`}
                        </div>
                        <span class="mobile-category-text text-[10px] font-semibold truncate w-[68px] text-center">${cat.title}</span>
                    </a>
                `;
            }).join('');
            
            // Inject the mobile scroller OUTSIDE the sticky header so it scrolls away naturally
            // just like the desktop nav does natively.
            const mainHeader = document.querySelector('header');
            if (mainHeader) {
                mainHeader.insertAdjacentElement('afterend', scrollerContainer);
            } else {
                searchRow.insertAdjacentElement('afterend', scrollerContainer); // Fallback
            }
            
            // --- DESKTOP NAV INTEGRATION ---
            const desktopMenuContainer = document.querySelector('.nav-row-2-container');
            if (desktopMenuContainer) {
                // Find the scrolling flex container next to Explore button
                const desktopMenu = desktopMenuContainer.querySelector('.flex.items-center.overflow-x-auto');
                if (desktopMenu) {
                    // Clear out the static text links completely
                    desktopMenu.innerHTML = '';
                    // Adjust desktop menu styling class to fit circles better
                    desktopMenu.className = 'flex items-center overflow-x-auto hide-scrollbar py-2 w-full gap-6 pl-2';
                    
                    // 1. Manually add Sell Items 
                    const sellLinkHtml = `
                        <a href="/pages/seller.html" class="flex flex-col items-center no-underline text-gold hover:text-yellow-300 transition-all duration-300 shrink-0 group hover:scale-105" style="min-width: 70px;">
                            <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-1.5 overflow-hidden border-2 border-gold group-hover:bg-gray-700 transition-all shadow-md group-hover:shadow-lg group-hover:border-yellow-300">
                                <i class="fas fa-store-alt text-lg"></i>
                            </div>
                            <span class="text-[11px] font-bold text-center w-full truncate">Sell Items</span>
                        </a>
                        <div class="w-px h-10 bg-gray-700 mx-2 shrink-0"></div>
                    `;
                    
                    // 2. Map the activeCats to desktop cards
                    const dynamicLinksHtml = activeCats.map(cat => {
                        return `
                            <a href="${cat.targetUrl}" class="flex flex-col items-center no-underline text-gray-400 hover:text-gold transition-all duration-300 shrink-0 group hover:scale-105" style="min-width: 70px;">
                                <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-1.5 overflow-hidden border-2 border-transparent group-hover:border-gold transition-all shadow-sm group-hover:shadow-md">
                                    ${cat.imageUrl ? `<img src="${cat.imageUrl}" class="w-full h-full object-cover" alt="${cat.title}">` : `<i class="fas fa-tags text-gray-400"></i>`}
                                </div>
                                <span class="text-[11px] font-medium max-w-[84px] truncate text-center">${cat.title}</span>
                            </a>
                        `;
                    }).join('');
                    
                    desktopMenu.innerHTML = sellLinkHtml + dynamicLinksHtml;
                    
                    // Add mouse wheel horizontal scrolling support since desktops don't easily touch-drag
                    desktopMenu.addEventListener('wheel', (e) => {
                        if (e.deltaY !== 0) {
                            // Transform vertical wheel to horizontal
                            e.preventDefault();
                            desktopMenu.scrollLeft += e.deltaY;
                        }
                    }, { passive: false });
                }
            }
            // --- END DESKTOP NAV INTEGRATION ---
            
        } catch (error) {
            console.error('Error loading category scroller:', error);
        }
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
        const userGreetingFull = document.getElementById('user-greeting-full');

        if (loginLink) loginLink.classList.add('hidden');
        if (userDropdownContainer) userDropdownContainer.classList.remove('hidden');
        
        // Set user greeting
        const firstName = fullName?.split(' ')[0] || 'User';
        if (userGreetingShort) userGreetingShort.textContent = firstName;
        if (userGreetingFull) userGreetingFull.textContent = fullName || 'User';

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
     * Initialize search functionality (adapted from mobile-header.js)
     */
    initializeSearch() {
        const mobileSearchInput = document.getElementById('mobile-search-input');
        const desktopSearchInput = document.getElementById('desktop-search-input');
        const mobileSearchButton = document.getElementById('mobile-search-button');
        const desktopSearchButton = document.getElementById('desktop-search-button');

        // Initialize mobile search
        if (mobileSearchInput && mobileSearchButton) {
            this.initializeMobileSearch();
        }

        // Desktop search (adapted from header.js)
        if (desktopSearchInput) {
            this.initializeDesktopSearch();
        }
    }

    /**
     * Initialize mobile search (from mobile-header.js)
     */
    initializeMobileSearch() {
        const mobileSearchInput = document.getElementById('mobile-search-input');
        const mobileSearchButton = document.getElementById('mobile-search-button');
        const mobileSearchSuggestions = document.getElementById('mobile-search-suggestions');
        
        let searchTimeout;
        
        // Load products for search suggestions
        this.loadProductsForSearch();
        
        // Search input events
        mobileSearchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    this.showSearchSuggestions(query);
                }, 300);
            } else {
                this.hideSearchSuggestions();
            }
        });
        
        // Search button click
        mobileSearchButton.addEventListener('click', () => {
            this.performSearch();
        });
        
        // Enter key in search input
        mobileSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });
        
        // Click outside to close suggestions
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.mobile-search-container')) {
                this.hideSearchSuggestions();
            }
        });
        
        // Prevent input from losing focus when clicking suggestions
        if (mobileSearchSuggestions) {
            mobileSearchSuggestions.addEventListener('mousedown', (e) => {
                e.preventDefault();
            });

            // Delegate clicks to suggestion items
            mobileSearchSuggestions.addEventListener('click', (e) => {
                const suggestionItem = e.target.closest('.mobile-search-suggestion-item');
                if (!suggestionItem) return;

                const productId = suggestionItem.dataset.productId;
                const productName = suggestionItem.dataset.productName || '';
                if (!productId) return;

                this.selectMobileSearchSuggestion(productName, productId);
            });
        }
    }

    async loadProductsForSearch() {
        try {
            const response = await fetch(`${API_BASE}/products`);
            if (response.ok) {
                const data = await response.json();
                window.mobileAllProducts = data.products || [];
            }
        } catch (error) {
            console.error('Error loading products for mobile search:', error);
            window.mobileAllProducts = [];
        }
    }

    async fetchSuggestions(query) {
        try {
            const response = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const suggestions = await response.json();
                console.log('Mobile search suggestions received:', suggestions);
                return suggestions;
            } else {
                console.error('Mobile search suggestions failed:', response.status);
                return [];
            }
        } catch (error) {
            console.error('Error fetching search suggestions:', error);
            return [];
        }
    }

    showSearchSuggestions(query) {
        const mobileSearchSuggestions = document.getElementById('mobile-search-suggestions');
        
        this.fetchSuggestions(query)
            .then(suggestions => {
                if (suggestions.length === 0) {
                    mobileSearchSuggestions.innerHTML = `
                        <div class="px-4 py-3 text-gray-400 text-sm">
                            No suggestions found
                        </div>
                    `;
                    mobileSearchSuggestions.classList.remove('hidden');
                    return;
                }

                mobileSearchSuggestions.innerHTML = suggestions.map(item => {
                    const imageUrl = item.image ? 
                        (item.image.startsWith('/') ? `${API_BASE.replace('/api', '')}${item.image}` : item.image) : 
                        null;
                    
                    return `
                        <div class="mobile-search-suggestion-item px-4 py-3 hover:bg-gray-800 cursor-pointer border-b border-gray-700 last:border-b-0"
                             data-product-id="${item.id}"
                             data-product-name="${this.escapeHtmlAttribute(item.title)}">
                            <div class="flex items-center space-x-3">
                                ${imageUrl ? `
                                    <img src="${imageUrl}" alt="${item.title}" class="w-8 h-8 object-cover rounded" 
                                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                                    <div class="w-8 h-8 bg-gray-600 rounded flex items-center justify-center" style="display:none;">
                                        <i class="fas fa-box text-gray-400 text-xs"></i>
                                    </div>
                                ` : `
                                    <div class="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                                        <i class="fas fa-box text-gray-400 text-xs"></i>
                                    </div>
                                `}
                                <div class="flex-1 min-w-0">
                                    <p class="text-sm font-medium text-white truncate">${item.title}</p>
                                    ${item.category ? `<p class="text-xs text-gray-400 truncate">${item.category}</p>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                mobileSearchSuggestions.classList.remove('hidden');
            })
            .catch(error => {
                console.error('Error showing search suggestions:', error);
                this.hideSearchSuggestions();
            });
    }

    hideSearchSuggestions() {
        const mobileSearchSuggestions = document.getElementById('mobile-search-suggestions');
        if (mobileSearchSuggestions) {
            mobileSearchSuggestions.classList.add('hidden');
        }
    }

    performSearch() {
        const mobileSearchInput = document.getElementById('mobile-search-input');
        const query = mobileSearchInput.value.trim();
        if (query) {
            window.location.href = `/pages/products.html?search=${encodeURIComponent(query)}`;
        }
    }

    selectMobileSearchSuggestion(productName, productId) {
        // Navigate to product detail page
        window.location.href = `/pages/product-detail.html?id=${productId}`;
    }

    escapeHtmlAttribute(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /**
     * Initialize desktop search (from header.js)
     */
    initializeDesktopSearch() {
        const desktopSearchInput = document.getElementById('desktop-search-input');
        const desktopSearchButton = document.getElementById('desktop-search-button');
        const desktopSearchSuggestions = document.getElementById('home-search-suggestions');
        
        if (!desktopSearchInput || !desktopSearchSuggestions) return;
        
        let searchTimeout;
        
        // Load products for search suggestions
        this.loadProductsForDesktopSearch();
        
        // Search input events
        desktopSearchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => {
                    this.showDesktopSearchSuggestions(query);
                }, 300);
            } else {
                this.hideDesktopSearchSuggestions();
            }
        });
        
        // Search button click
        if (desktopSearchButton) {
            desktopSearchButton.addEventListener('click', () => {
                this.performDesktopSearch();
            });
        }
        
        // Enter key in search input
        desktopSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performDesktopSearch();
            }
        });
        
        // Keep focus on input when clicking suggestions
        desktopSearchSuggestions.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });

        // Delegate clicks to suggestion items
        desktopSearchSuggestions.addEventListener('click', (e) => {
            const suggestionItem = e.target.closest('.desktop-search-suggestion-item');
            if (!suggestionItem) return;

            const productId = suggestionItem.dataset.productId;
            const productName = suggestionItem.dataset.productName || '';
            if (!productId) return;

            this.selectDesktopSearchSuggestion(productName, productId);
        });
        
        // Click outside to close suggestions
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.v-header-search')) {
                this.hideDesktopSearchSuggestions();
            }
        });
    }

    async loadProductsForDesktopSearch() {
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

    showDesktopSearchSuggestions(query) {
        const desktopSearchSuggestions = document.getElementById('home-search-suggestions');
        const suggestions = this.getDesktopSearchSuggestions(query, window.desktopAllProducts || []);
        
        if (suggestions.length > 0) {
            desktopSearchSuggestions.innerHTML = suggestions.map(product => {
                const imageUrl = product.images && product.images[0] 
                    ? (product.images[0].startsWith('http') ? product.images[0] : this.fixServerUrl(product.images[0]))
                    : 'https://placehold.co/40x40?text=No+Image';
                
                return `
                <div class="desktop-search-suggestion-item px-4 py-3 hover:bg-gray-800 cursor-pointer border-b border-gray-700 last:border-b-0"
                     data-product-id="${product._id}"
                     data-product-name="${this.escapeHtmlAttribute(product.name)}">
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

    hideDesktopSearchSuggestions() {
        const desktopSearchSuggestions = document.getElementById('home-search-suggestions');
        if (desktopSearchSuggestions) {
            desktopSearchSuggestions.classList.add('hidden');
        }
    }

    getDesktopSearchSuggestions(query, products) {
        const lowerQuery = query.toLowerCase();
        return products
            .filter(product => 
                product.name.toLowerCase().includes(lowerQuery) ||
                product.category.toLowerCase().includes(lowerQuery) ||
                product.description.toLowerCase().includes(lowerQuery)
            )
            .slice(0, 5); // Limit to 5 suggestions
    }

    performDesktopSearch() {
        const desktopSearchInput = document.getElementById('desktop-search-input');
        const query = desktopSearchInput.value.trim();
        if (query) {
            window.location.href = `/pages/products.html?search=${encodeURIComponent(query)}`;
        }
    }

    selectDesktopSearchSuggestion(productName, productId) {
        console.log('🚀 DESKTOP SEARCH SUGGESTION CLICKED');
        console.log('📦 Product Name:', productName);
        console.log('🆔 Product ID:', productId);
        
        const desktopSearchInput = document.getElementById('desktop-search-input');
        desktopSearchInput.value = productName;
        this.hideDesktopSearchSuggestions();
        
        // Direct navigation to product detail page
        const productDetailUrl = `/pages/product-detail.html?id=${productId}`;
        console.log('🔗 Navigating directly to:', productDetailUrl);
        
        window.location.href = productDetailUrl;
    }

    fixServerUrl(url) {
        if (!url) return url;
        return url.startsWith('/') ? `${API_BASE.replace('/api', '')}${url}` : url;
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
    window.unifiedHeader = new UnifiedHeader();
}
