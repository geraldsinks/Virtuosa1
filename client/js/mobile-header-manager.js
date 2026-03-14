// Mobile Header Templates for Different Page Types
// Provides optimized header structures based on page context

class MobileHeaderManager {
    constructor() {
        this.currentPage = this.getCurrentPageType();
        this.init();
    }

    getCurrentPageType() {
        const path = window.location.pathname;
        
        if (path === '/' || path.includes('index.html')) return 'home';
        if (path.includes('products.html')) return 'products';
        if (path.includes('product-detail.html')) return 'product-detail';
        if (path.includes('buyer-dashboard.html')) return 'buyer-dashboard';
        if (path.includes('seller-dashboard.html')) return 'seller-dashboard';
        if (path.includes('admin-dashboard.html')) return 'admin-dashboard';
        if (path.includes('login.html') || path.includes('signup.html')) return 'auth';
        if (path.includes('cart.html')) return 'cart';
        if (path.includes('profile.html')) return 'profile';
        if (path.includes('messages.html')) return 'messages';
        if (path.includes('notifications.html')) return 'notifications';
        if (path.includes('seller.html')) return 'seller-landing';
        
        return 'default'; // For other pages
    }

    init() {
        this.setupHeaderForPageType();
        this.initializeMobileMenu();
        this.updateAuthState();
        this.updateCartBadge();
    }

    setupHeaderForPageType() {
        switch (this.currentPage) {
            case 'home':
            case 'products':
            case 'product-detail':
                this.setupSearchHeader();
                break;
            case 'buyer-dashboard':
                this.setupBuyerDashboardHeader();
                break;
            case 'seller-dashboard':
            case 'admin-dashboard':
                this.setupDashboardHeader();
                break;
            case 'auth':
                this.setupAuthHeader();
                break;
            default:
                this.setupSimpleHeader();
                break;
        }
    }

    // Search-enabled header (home, products, product-detail)
    setupSearchHeader() {
        // Keep the full search header structure
        this.showSearchBar();
        this.showHamburgerMenu();
        this.updateMobileMenu('search');
    }

    // Buyer dashboard header - compact with utilities in logo row
    setupBuyerDashboardHeader() {
        this.hideSearchBar();
        this.showHamburgerMenu();
        this.moveUtilitiesToLogoRow();
        this.hideGreeting(); // Hide greeting from header, move to welcome section
        this.updateMobileMenu('dashboard');
        this.setupResponsiveBehavior();
    }

    // Dashboard header (seller/admin) - simplified
    setupDashboardHeader() {
        this.hideSearchBar();
        this.showHamburgerMenu();
        this.moveLogoutToLogoRow();
        this.hideGreeting(); // Hide greeting from header
        this.updateMobileMenu('dashboard');
        this.setupResponsiveBehavior();
    }

    // Auth pages header - minimal
    setupAuthHeader() {
        this.hideSearchBar();
        this.hideHamburgerMenu();
        this.setupBackNavigation();
        this.hideGreeting();
    }

    // Simple header for other pages
    setupSimpleHeader() {
        this.hideSearchBar();
        this.showHamburgerMenu();
        this.hideGreeting();
        this.updateMobileMenu('simple');
    }

    // Header manipulation methods
    showSearchBar() {
        const searchRow = document.querySelector('.mobile-header-row-2');
        if (searchRow) {
            searchRow.style.display = 'block';
        }
    }

    hideSearchBar() {
        const searchRow = document.querySelector('.mobile-header-row-2');
        if (searchRow) {
            searchRow.style.display = 'none';
        }
    }

    showHamburgerMenu() {
        const hamburger = document.getElementById('mobile-menu-toggle');
        if (hamburger) {
            hamburger.style.display = 'flex';
        }
    }

    hideHamburgerMenu() {
        const hamburger = document.getElementById('mobile-menu-toggle');
        if (hamburger) {
            hamburger.style.display = 'none';
        }
    }

    hideGreeting() {
        // Hide greeting from header on mobile
        const userGreeting = document.getElementById('user-greeting');
        if (userGreeting) {
            userGreeting.style.display = 'none';
        }
        
        // For buyer dashboard, move greeting to welcome section
        if (this.currentPage === 'buyer-dashboard') {
            const welcomeName = document.getElementById('buyer-name');
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (welcomeName && user.fullName) {
                welcomeName.textContent = user.fullName;
            }
        }
    }

    setupResponsiveBehavior() {
        // Handle screen size changes for different layouts
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.adjustForScreenSize();
            }, 250);
        });

        // Initial adjustment
        this.adjustForScreenSize();
    }

    adjustForScreenSize() {
        const screenWidth = window.innerWidth;
        
        if (screenWidth >= 768) {
            // Desktop: show desktop header, hide mobile elements
            this.showDesktopHeader();
        } else {
            // Mobile: show mobile header, hide desktop elements
            this.showMobileHeader();
        }

        // Adjust logout button size for smaller screens
        this.adjustLogoutButton(screenWidth);
    }

    showDesktopHeader() {
        const desktopHeader = document.querySelector('.container.mx-auto.flex.items-center');
        if (desktopHeader) {
            desktopHeader.classList.remove('hidden');
            desktopHeader.classList.add('flex');
        }
        
        // Hide mobile-specific elements
        const mobileRows = document.querySelectorAll('.mobile-header-row-1, .mobile-header-row-2');
        mobileRows.forEach(row => row.style.display = '');
    }

    showMobileHeader() {
        const desktopHeader = document.querySelector('.container.mx-auto.flex.items-center');
        if (desktopHeader) {
            desktopHeader.classList.add('hidden');
            desktopHeader.classList.remove('flex');
        }
        
        // Show mobile-specific elements based on page type
        this.setupHeaderForPageType();
    }

    adjustLogoutButton(screenWidth) {
        const logoutButtons = document.querySelectorAll('#mobile-logout-button, #logout-button');
        logoutButtons.forEach(button => {
            if (screenWidth < 400) {
                button.classList.add('px-3', 'py-1', 'text-xs');
                button.classList.remove('px-6', 'py-2');
            } else if (screenWidth < 480) {
                button.classList.add('px-4', 'py-2', 'text-sm');
                button.classList.remove('px-6', 'py-2', 'text-xs');
            } else {
                button.classList.add('px-6', 'py-2');
                button.classList.remove('px-3', 'py-1', 'text-xs', 'px-4', 'text-sm');
            }
        });
    }

    moveUtilitiesToLogoRow() {
        // For buyer dashboard: move messages, notifications, cart to logo row
        const logoRow = document.querySelector('.mobile-header-row-1 .flex.items-center.justify-between');
        const utilities = this.createDashboardUtilities('buyer');
        
        if (logoRow && utilities) {
            // Replace existing utilities
            const existingUtils = logoRow.querySelector('.mobile-header-actions');
            if (existingUtils) {
                existingUtils.replaceWith(utilities);
            }
        }
    }

    moveLogoutToLogoRow() {
        // For seller/admin: move logout and cart to logo row
        const logoRow = document.querySelector('.mobile-header-row-1 .flex.items-center.justify-between');
        const utilities = this.createDashboardUtilities('seller');
        
        if (logoRow && utilities) {
            const existingUtils = logoRow.querySelector('.mobile-header-actions');
            if (existingUtils) {
                existingUtils.replaceWith(utilities);
            }
        }
    }

    createDashboardUtilities(type) {
        const utilities = document.createElement('div');
        utilities.className = 'flex items-center space-x-3 mobile-header-actions';

        if (type === 'buyer') {
            utilities.innerHTML = `
                <!-- Messages Icon -->
                <a href="/pages/messages.html" class="relative v-touch text-white hover:text-gold transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span class="message-badge-count hidden absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">0</span>
                </a>
                <!-- Notifications Icon -->
                <a href="/pages/notifications.html" class="relative v-touch text-white hover:text-gold transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span id="notification-badge-count" class="hidden absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">0</span>
                </a>
                <!-- Cart Icon -->
                <a href="/pages/cart.html" class="relative v-touch text-white hover:text-gold transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.185 1.706.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span class="cart-badge-count absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">0</span>
                </a>
            `;
        } else if (type === 'seller') {
            utilities.innerHTML = `
                <!-- Logout Button -->
                <button id="mobile-logout-button" class="bg-button-gold text-white font-semibold py-2 px-4 rounded-full shadow-lg hover-bg-button-gold transition-colors text-sm">
                    Log Out
                </button>
                <!-- Cart Icon -->
                <a href="/pages/cart.html" class="relative v-touch text-white hover:text-gold transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.185 1.706.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span class="cart-badge-count absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">0</span>
                </a>
            `;
        }

        return utilities;
    }

    setupBackNavigation() {
        // For auth pages, replace hamburger with back arrow
        const hamburger = document.getElementById('mobile-menu-toggle');
        if (hamburger) {
            hamburger.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
            `;
            hamburger.parentElement.href = '/index.html';
            hamburger.parentElement.onclick = (e) => {
                e.preventDefault();
                window.location.href = '/index.html';
            };
        }
    }

    updateMobileMenu(type) {
        const overlay = document.getElementById('mobile-menu-overlay');
        if (!overlay) return;

        let menuContent = '';
        
        switch (type) {
            case 'search':
                menuContent = this.getSearchMenuContent();
                break;
            case 'dashboard':
                menuContent = this.getDashboardMenuContent();
                break;
            case 'simple':
                menuContent = this.getSimpleMenuContent();
                break;
            default:
                menuContent = this.getSimpleMenuContent();
        }

        const contentDiv = overlay.querySelector('.mobile-menu-content');
        if (contentDiv) {
            contentDiv.innerHTML = menuContent;
        }
    }

    getSearchMenuContent() {
        return `
            <div class="mobile-menu-header">
                <div class="text-xl font-bold text-gold">Menu</div>
                <button id="mobile-menu-close" class="mobile-menu-close">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Quick Links Section -->
            <div class="mobile-menu-section">
                <div class="mobile-menu-title">Quick Links</div>
                <a href="/pages/products.html?category=Hot%20Deals" class="mobile-menu-link">
                    <i class="fas fa-fire"></i>
                    <span>Hot Deals</span>
                </a>
                <a href="/pages/products.html?category=Best%20Sellers" class="mobile-menu-link">
                    <i class="fas fa-crown"></i>
                    <span>Best Sellers</span>
                </a>
                <a href="/pages/seller.html" class="mobile-menu-link">
                    <i class="fas fa-store"></i>
                    <span>Become a Seller</span>
                </a>
            </div>

            <!-- Account Section (if authenticated) -->
            <div class="mobile-menu-section" id="mobile-account-section" style="display: none;">
                <div class="mobile-menu-title">Account</div>
                <a href="/pages/profile.html" class="mobile-menu-link">
                    <i class="fas fa-user"></i>
                    <span>My Profile</span>
                </a>
                <a href="/pages/dashboard.html" class="mobile-menu-link">
                    <i class="fas fa-tachometer-alt"></i>
                    <span>Dashboard</span>
                </a>
                <a href="/pages/orders.html" class="mobile-menu-link">
                    <i class="fas fa-shopping-bag"></i>
                    <span>My Orders</span>
                </a>
                <a href="/pages/cart.html" class="mobile-menu-link">
                    <i class="fas fa-shopping-cart"></i>
                    <span>Shopping Cart</span>
                </a>
            </div>
        `;
    }

    getDashboardMenuContent() {
        return `
            <div class="mobile-menu-header">
                <div class="text-xl font-bold text-gold">Menu</div>
                <button id="mobile-menu-close" class="mobile-menu-close">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Quick Links Section -->
            <div class="mobile-menu-section">
                <div class="mobile-menu-title">Quick Links</div>
                <a href="/pages/products.html?category=Hot%20Deals" class="mobile-menu-link">
                    <i class="fas fa-fire"></i>
                    <span>Hot Deals</span>
                </a>
                <a href="/pages/products.html?category=Best%20Sellers" class="mobile-menu-link">
                    <i class="fas fa-crown"></i>
                    <span>Best Sellers</span>
                </a>
                <a href="/pages/products.html" class="mobile-menu-link">
                    <i class="fas fa-th-large"></i>
                    <span>All Products</span>
                </a>
            </div>

            <!-- Dashboard Tools -->
            <div class="mobile-menu-section">
                <div class="mobile-menu-title">My Tools</div>
                <a href="/pages/profile.html" class="mobile-menu-link">
                    <i class="fas fa-user"></i>
                    <span>My Profile</span>
                </a>
                <a href="/pages/orders.html" class="mobile-menu-link">
                    <i class="fas fa-shopping-bag"></i>
                    <span>My Orders</span>
                </a>
                <a href="/pages/transactions.html" class="mobile-menu-link">
                    <i class="fas fa-exchange-alt"></i>
                    <span>Transactions</span>
                </a>
                <a href="/pages/reviews.html" class="mobile-menu-link">
                    <i class="fas fa-star"></i>
                    <span>My Reviews</span>
                </a>
            </div>
        `;
    }

    getSimpleMenuContent() {
        return `
            <div class="mobile-menu-header">
                <div class="text-xl font-bold text-gold">Menu</div>
                <button id="mobile-menu-close" class="mobile-menu-close">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <!-- Quick Links Section -->
            <div class="mobile-menu-section">
                <div class="mobile-menu-title">Quick Links</div>
                <a href="/pages/products.html?category=Hot%20Deals" class="mobile-menu-link">
                    <i class="fas fa-fire"></i>
                    <span>Hot Deals</span>
                </a>
                <a href="/pages/products.html?category=Best%20Sellers" class="mobile-menu-link">
                    <i class="fas fa-crown"></i>
                    <span>Best Sellers</span>
                </a>
                <a href="/pages/seller.html" class="mobile-menu-link">
                    <i class="fas fa-store"></i>
                    <span>Become a Seller</span>
                </a>
            </div>

            <!-- Navigation Section -->
            <div class="mobile-menu-section">
                <div class="mobile-menu-title">Navigation</div>
                <a href="/index.html" class="mobile-menu-link">
                    <i class="fas fa-home"></i>
                    <span>Home</span>
                </a>
                <a href="/pages/products.html" class="mobile-menu-link">
                    <i class="fas fa-th-large"></i>
                    <span>All Products</span>
                </a>
                <a href="/pages/cart.html" class="mobile-menu-link">
                    <i class="fas fa-shopping-cart"></i>
                    <span>Shopping Cart</span>
                </a>
            </div>
        `;
    }

    initializeMobileMenu() {
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        const mobileMenuClose = document.getElementById('mobile-menu-close');

        if (mobileMenuToggle && mobileMenuOverlay) {
            mobileMenuToggle.addEventListener('click', () => this.openMobileMenu());
        }

        if (mobileMenuClose && mobileMenuOverlay) {
            mobileMenuClose.addEventListener('click', () => this.closeMobileMenu());
        }

        if (mobileMenuOverlay) {
            mobileMenuOverlay.addEventListener('click', (e) => {
                if (e.target === mobileMenuOverlay) {
                    this.closeMobileMenu();
                }
            });
        }

        // Handle dynamic close button
        document.addEventListener('click', (e) => {
            if (e.target.id === 'mobile-menu-close' || e.target.closest('#mobile-menu-close')) {
                this.closeMobileMenu();
            }
        });
    }

    openMobileMenu() {
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        if (mobileMenuOverlay) {
            mobileMenuOverlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeMobileMenu() {
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        if (mobileMenuOverlay) {
            mobileMenuOverlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    updateAuthState() {
        const token = localStorage.getItem('token');
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        
        const accountSection = document.getElementById('mobile-account-section');
        const mobileLoginLink = document.getElementById('mobile-login-link');
        
        if (token && user.email) {
            // User is authenticated
            if (accountSection) {
                accountSection.style.display = 'block';
            }
            
            // Update login link to profile
            if (mobileLoginLink) {
                mobileLoginLink.href = '/pages/profile.html';
                // Update icon and label if needed
            }
        } else {
            // User is not authenticated
            if (accountSection) {
                accountSection.style.display = 'none';
            }
            
            if (mobileLoginLink) {
                mobileLoginLink.href = '/pages/login.html';
            }
        }
    }

    updateCartBadge() {
        const cartBadges = document.querySelectorAll('.cart-badge-count');
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const itemCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);

        cartBadges.forEach(badge => {
            badge.textContent = itemCount;
            if (itemCount > 0) {
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    }
}

// Initialize the mobile header manager
document.addEventListener('DOMContentLoaded', () => {
    window.mobileHeaderManager = new MobileHeaderManager();
});

// Export for global access
window.MobileHeaderManager = MobileHeaderManager;
