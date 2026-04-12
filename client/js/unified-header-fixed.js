/**
 * Fixed Unified Header System for Virtuosa - Amazon Style Redesign
 * Production-grade centralized header management
 * Coordinates with Navigation Coordinator and Router system
 * 
 * Version: v202604081200
 */

console.log('Virtuosa Unified Header v202604081200 - Amazon Style Redesign');

// Prevent duplicate class declarations
if (window.UnifiedHeader) {
    console.log('UnifiedHeader class already exists, skipping declaration');
} else {

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
        this.eventListeners = [];
        this.lastScrollY = window.scrollY;
        
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
            // Wait for router to be ready
            if (!window.router) {
                console.warn('Waiting for router initialization...');
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // 1. Ensure header HTML exists
            this.ensureHeaderExists();
            
            // 2. Initialize all components
            await this.initializeAuthState();
            if (!this.isAuthPage()) {
                this.initializeSearch();
            }
            this.initializeSideMenu();
            this.initializeNotifications();
            this.initializeUserDropdown();
            this.initializeHideOnScroll();
            
            // 3. Set up observers
            this.setupAuthStateObserver();
            
            // Update links
            setTimeout(() => this.updateAllLinksToClean(), 100);
            
            console.log('✓ Unified header system initialized');
        } catch (error) {
            console.error('Failed to initialize unified header:', error);
            this.initializeBasicFunctionality();
        }
    }

    /**
     * Update all links in the header to use clean URLs
     */
    updateAllLinksToClean() {
        if (window.URLHelper && window.URLHelper.updatePageLinks) {
            window.URLHelper.updatePageLinks();
        } else {
            this.manualLinkUpdate();
        }
        this.setupLinkObserver();
    }

    manualLinkUpdate() {
        const linkMappings = {
            '/pages/cart.html': '/cart',
            '/pages/login.html': '/login',
            '/pages/products.html': '/products',
            '/pages/seller.html': '/seller',
            '/pages/profile.html': '/profile',
            '/pages/orders.html': '/orders',
            '/pages/dashboard.html': '/dashboard',
            '/pages/seller-dashboard.html': '/seller-dashboard',
            '/pages/create-product.html': '/create-product',
            '/pages/admin-dashboard.html': '/admin',
            '/pages/faq.html': '/faq',
            '/pages/contact-support.html': '/contact',
            '/pages/wishlist.html': '/wishlist'
        };

        const headerLinks = document.querySelectorAll('header a[href*=".html"], #side-menu-content a[href*=".html"]');
        headerLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (linkMappings[href]) {
                link.setAttribute('href', linkMappings[href]);
            }
        });
    }

    setupLinkObserver() {
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') shouldUpdate = true;
            });
            if (shouldUpdate) {
                setTimeout(() => this.updateAllLinksToClean(), 100);
            }
        });

        const header = document.querySelector('header');
        if (header) observer.observe(header, { childList: true, subtree: true });
    }

    ensureHeaderExists() {
        if (this.isAuthPage()) {
            console.log('Skipping header injection on auth page');
            return null;
        }
        
        let header = document.getElementById('main-site-header');
        
        if (!header) {
            console.log('Injecting unified Amazon-style header...');
            const headerHTML = this.getUnifiedHeaderHTML();
            document.body.insertAdjacentHTML('afterbegin', headerHTML);
            header = document.getElementById('main-site-header');
        }
        
        this.ensureHorizontalNavigationExists();
        this.addEnhancedStyles();
        
        return header;
    }

    ensureHorizontalNavigationExists() {
        if (this.isAuthPage()) return;
        
        const path = window.location.pathname.toLowerCase();
        
        // Comprehensive list of prefixes derived from the /pages directory. 
        // /cart is intentionally omitted to retain contextual up-sells.
        const nonShoppingPrefixes = [
            '/about', '/admin', '/buyer-dashboard', '/dashboard',
            '/contact', '/contact-support', '/create-product', '/edit-product',
            '/disputes', '/faq', '/live-chat', '/login', '/signup', '/register', '/verify-email',
            '/maintenance', '/marketing', '/messages', '/notifications',
            '/order', '/privacy', '/terms', '/refund-policy', '/profile', '/settings',
            '/reviews', '/seller', '/strategic-analytics', '/transactions'
        ];

        // Match against clean paths, sub-directories, and raw HTML files
        const shouldHide = nonShoppingPrefixes.some(prefix => 
            path === prefix || 
            path.startsWith(`${prefix}/`) || 
            path.startsWith(`${prefix}-`) ||
            path === `/pages${prefix}.html` ||
            path.startsWith(`/pages${prefix}/`) ||
            path.startsWith(`/pages${prefix}-`)
        );

        if (shouldHide) {
            // Remove the default injected wrapper container
            const wrapper = document.getElementById('universal-category-scroller-wrapper');
            if (wrapper) wrapper.remove();
            return;
        }

        this.initializeUniversalCategoryScroller();
    }

    addEnhancedStyles() {
        if (document.getElementById('enhanced-header-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'enhanced-header-styles';
        style.textContent = `
            /* Hide scrolling bar in universal scroller */
            .hide-scrollbar {
                -ms-overflow-style: none;
                scrollbar-width: none;
            }
            .hide-scrollbar::-webkit-scrollbar {
                display: none;
            }
            
            #side-menu-content.active {
                transform: translateX(0) !important;
            }
            
            /* Backdrop blur for desktop mega menu */
            #side-menu-overlay {
                backdrop-filter: blur(4px);
                transition: opacity 0.3s ease;
            }
            #side-menu-overlay.active {
                opacity: 1;
            }
            #side-menu-overlay:not(.active) {
                pointer-events: none;
            }
            
            /* Responsive tweaks */
            @media (min-width: 768px) {
                #side-menu-content {
                    width: 350px;
                }
            }
            
            /* Search bar focused state */
            #desktop-search-input:focus, #mobile-search-input:focus {
                box-shadow: inset 0 0 0 2px #FFD700;
            }

            /* Failsafe layout breakpoints for dynamic header injection */
            @media (min-width: 1024px) {
                #main-site-header .lg\\:flex { display: flex !important; }
                #main-site-header .lg\\:block { display: block !important; }
                #main-site-header .lg\\:inline-block { display: inline-block !important; }
                #main-site-header .lg\\:hidden { display: none !important; }
                #main-site-header .lg\\:w-auto { width: auto !important; }
                #main-site-header .lg\\:px-8 { padding-left: 2rem !important; padding-right: 2rem !important; }
            }
        `;
        document.head.appendChild(style);
    }

    getUnifiedHeaderHTML() {
        return `
<!-- Universal Header Top Row -->
<header id="main-site-header" class="text-white shadow-lg sticky top-0 z-50 bg-gradient-to-r from-[#0A1128] via-[#101b3b] to-[#0A1128] backdrop-blur-md border-b border-white/10">
    <div class="container mx-auto px-4 py-2.5 lg:py-3 h-full">
        <!-- Row 1: Menus, Logo, Actions -->
        <div class="flex items-center justify-between gap-3 lg:gap-6 relative">
            <!-- Left: Mobile Menu Toggle -->
            <div class="flex items-center gap-3 shrink-0 z-10 w-1/3 lg:w-auto">
                <button id="mobile-menu-toggle" class="text-white hover:text-gold transition-colors p-1 md:p-2 flex items-center group">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 md:h-7 md:w-7 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    <span class="hidden lg:inline-block text-sm font-bold ml-2 tracking-wide uppercase">All</span>
                </button>
                <a href="/" class="hidden lg:block text-2xl lg:text-3xl font-extrabold text-[#FFD700] hover:text-yellow-400 transition-all tracking-tight drop-shadow-sm ml-2">Virtuosa</a>
            </div>

            <!-- Mobile perfectly centered Logo -->
            <div class="lg:hidden absolute left-1/2 transform -translate-x-1/2 z-0 flex justify-center w-auto">
                <a href="/" class="text-2xl font-extrabold text-[#FFD700] hover:scale-105 transition-all tracking-tight drop-shadow-sm">Virtuosa</a>
            </div>

            <!-- Middle: Desktop Search Bar -->
            <div class="hidden lg:flex flex-1 max-w-2xl px-4 lg:px-8">
                <div class="relative flex w-full">
                    <input id="desktop-search-input" type="text" placeholder="Search for products, categories, or brands..." 
                           class="w-full pl-5 pr-14 py-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 focus:bg-white/15 focus:border-[#FFD700] focus:outline-none focus:ring-1 focus:ring-[#FFD700]/50 transition-all shadow-inner">
                    <button id="desktop-search-button" class="absolute right-1 top-1 bottom-1 bg-gradient-to-r from-gold to-yellow-500 px-5 rounded-lg text-navy hover:scale-105 transition-all flex items-center justify-center font-bold shadow-sm">
                        <i class="fas fa-search text-lg"></i>
                    </button>
                    <div id="desktop-search-suggestions" class="absolute top-full left-0 right-0 mt-2 bg-navy/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl max-h-80 overflow-y-auto hidden z-50 text-white"></div>
                </div>
            </div>

            <!-- Right: Actions -->
            <div class="flex items-center justify-end space-x-5 lg:space-x-7 shrink-0 z-10 w-1/3 lg:w-auto">
                <a href="/login" id="header-login-link" class="hidden lg:flex flex-col text-white hover:text-gold transition-colors justify-center leading-tight items-end">
                    <span class="text-[10px] font-medium text-gray-300 uppercase tracking-wider" id="header-greeting">Hello, Sign in</span>
                    <span class="text-sm font-bold tracking-wide">Account</span>
                </a>

                <div id="user-dropdown-container" class="relative hidden lg:block">
                    <!-- Dropdown structure populated by auth state -->
                </div>

                <a href="/notifications" class="relative text-white hover:text-gold transition-colors group">
                    <i class="far fa-bell text-xl md:text-2xl group-hover:scale-110 transition-transform"></i>
                    <span id="notification-badge" class="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center hidden px-1 shadow-lg border border-red-400">0</span>
                </a>

                <a href="/cart" class="relative text-white hover:text-gold transition-colors flex items-center gap-1 group">
                    <div class="relative">
                        <i class="fas fa-shopping-cart text-xl md:text-2xl group-hover:scale-110 transition-transform"></i>
                        <span class="cart-badge-count absolute -top-1.5 -right-2 bg-gold text-navy text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center hidden px-1 shadow-lg">0</span>
                    </div>
                </a>
            </div>
        </div>
        
        <!-- Row 2: Mobile Vertical Search Bar -->
        <div class="mt-4 lg:hidden w-full">
            <div class="relative flex w-full">
                <input id="mobile-search-input" type="text" placeholder="Search..." 
                       class="w-full pl-5 pr-12 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gold transition-all shadow-inner">
                <button id="mobile-search-button" class="absolute right-1 top-1 bottom-1 bg-gradient-to-r from-gold to-yellow-500 px-4 rounded-lg text-navy flex items-center justify-center shadow-sm">
                    <i class="fas fa-search text-sm"></i>
                </button>
                <div id="mobile-search-suggestions" class="absolute top-full left-0 right-0 mt-2 bg-navy/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl max-h-60 overflow-y-auto hidden z-50 text-white"></div>
            </div>
        </div>
    </div>
</header>
    
<!-- Universal Horizontal Scroller Wrapper -->
<div id="universal-category-scroller-wrapper" class="bg-gradient-to-r from-[#060A18] via-[#0A1128] to-[#060A18] backdrop-blur-md border-b border-white/5 shadow-md">
    <!-- Injected dynamically -->
</div>

<!-- Unified Side Navigation Drawer -->
<div id="side-menu-overlay" class="fixed inset-0 bg-black/70 z-[60] hidden transition-opacity opacity-0"></div>

<div id="side-menu-content" class="fixed top-0 left-0 w-[85%] md:w-[350px] h-full bg-[#0A1128] text-white z-[70] transform -translate-x-full transition-transform duration-300 ease-in-out overflow-y-auto shadow-2xl flex flex-col">
    <!-- User / Auth Header -->
    <div class="bg-[#060A18] p-5 flex items-center justify-between sticky top-0 z-10 border-b border-gray-800">
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center border border-gray-600">
                <i class="fas fa-user text-gray-300"></i>
            </div>
            <div id="side-menu-user-info">
                <a href="/login" class="text-lg font-bold text-white hover:text-gold" id="side-menu-greeting">Hello, Sign In</a>
            </div>
        </div>
        <button id="side-menu-close" class="text-gray-400 hover:text-white p-2">
            <i class="fas fa-times text-2xl"></i>
        </button>
    </div>

    <!-- Menus Content -->
    <div class="flex-1 py-4 text-sm font-medium">
        <!-- Shopping Section -->
        <div class="mb-2">
            <h3 class="px-5 py-2 font-bold text-gray-400 uppercase tracking-widest text-[11px]">Shop By Category</h3>
            <a href="/" class="flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 hover:text-gold transition-colors">
                <span class="flex-1">Home</span>
            </a>
            <a href="/products" class="flex flex-row items-center justify-between px-5 py-3 text-gray-200 hover:bg-gray-800 hover:text-gold transition-colors">
                <span>All Products</span>
                <i class="fas fa-chevron-right text-xs text-gray-500"></i>
            </a>
            <a href="/products?category=Hot%20Deals" class="flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 hover:text-gold transition-colors">
                <span>Hot Deals</span>
            </a>
            <a href="/wishlist" class="flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 hover:text-gold transition-colors">
                <span>My Wishlist</span>
            </a>
        </div>

        <div class="border-t border-gray-800 my-2 mx-5"></div>

        <!-- Account Section -->
        <div id="side-menu-account-section" class="mb-2 hidden">
            <h3 class="px-5 py-2 font-bold text-gray-400 uppercase tracking-widest text-[11px]">Your Account</h3>
            <a href="/dashboard" class="flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 hover:text-gold transition-colors">
                <span>Dashboard</span>
            </a>
            <a href="/orders" class="flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 hover:text-gold transition-colors">
                <span>Your Orders</span>
            </a>
            <a href="/messages" class="flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 hover:text-gold transition-colors">
                <span>Messages</span>
            </a>
            <a href="/transactions" class="flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 hover:text-gold transition-colors">
                <span>Transactions</span>
            </a>
            <a href="/profile" class="flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 hover:text-gold transition-colors">
                <span>Your Account Settings</span>
            </a>
        </div>

        <div class="border-t border-gray-800 my-2 mx-5"></div>

        <!-- Role Based Sections -->
        <div id="side-menu-seller-section" class="mb-2 hidden">
            <h3 class="px-5 py-2 font-bold text-gray-400 uppercase tracking-widest text-[11px]">Seller Tools</h3>
            <a href="/seller-dashboard" class="flex flex-row items-center justify-between px-5 py-3 text-gold hover:bg-gray-800 transition-colors">
                <span class="font-bold">Seller Dashboard</span>
            </a>
            <a href="/create-product" class="flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 transition-colors">
                <span>Add Product</span>
            </a>
            <div class="border-t border-gray-800 my-2 mx-5"></div>
        </div>

        <div id="side-menu-admin-section" class="mb-2 hidden">
            <h3 class="px-5 py-2 font-bold text-red-400 uppercase tracking-widest text-[11px]">Administration</h3>
            <a href="/admin" class="flex flex-row items-center justify-between px-5 py-3 text-red-200 hover:bg-gray-800 transition-colors">
                <span class="font-bold">Admin Dashboard</span>
            </a>
            <div class="border-t border-gray-800 my-2 mx-5"></div>
        </div>

        <!-- Support Section -->
        <div class="mb-6">
            <h3 class="px-5 py-2 font-bold text-gray-400 uppercase tracking-widest text-[11px]">Help & Settings</h3>
            <a href="/seller" class="flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 transition-colors">
                <span>Sell on Virtuosa</span>
            </a>
            <a href="/faq" class="flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 transition-colors">
                <span>Customer Service</span>
            </a>
            <a href="/contact" class="flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 transition-colors">
                <span>Contact Us</span>
            </a>
            <a href="#" id="side-menu-sign-out" class="hidden flex flex-row items-center px-5 py-3 text-gray-200 hover:bg-gray-800 transition-colors">
                <span>Sign Out</span>
            </a>
        </div>
    </div>
</div>
        `;
    }

    async initializeUniversalCategoryScroller() {
        const scrollerWrapper = document.getElementById('universal-category-scroller-wrapper');
        if (!scrollerWrapper) return;
        
        try {
            let activeCats = [];
            
            // Try fetching marketing cards first
            const mkResponse = await fetch(`${window.API_BASE}/public/marketing/category-cards`).catch(() => null);
            if (mkResponse && mkResponse.ok) {
                const categoryCards = await mkResponse.json();
                activeCats = categoryCards.filter(c => c.active).sort((a,b) => a.displayOrder - b.displayOrder);
            }
            
            // If empty, fetch from standard categories to secure the circular images properly
            if (activeCats.length === 0) {
                const fallbackNames = ['Hot Deals', 'Best Sellers', "Men's Clothing", "Women's Clothing", 'Electronics', 'Computers & Software', 'Shoes', 'Accessories'];
                try {
                    const fallbackResponse = await fetch(`${window.API_BASE}/categories`);
                    if (fallbackResponse.ok) {
                        const standardCats = await fallbackResponse.json();
                        activeCats = fallbackNames.map((name, index) => {
                            const found = standardCats.find(c => c.name === name);
                            return {
                                title: name,
                                link: `/products?category=${encodeURIComponent(name)}`,
                                image: found ? found.image : null,
                                active: true,
                                displayOrder: index
                            };
                        });
                    }
                } catch (e) {
                    // Final hardcoded fallback if absolutely everything fails
                    activeCats = fallbackNames.map((name, index) => ({
                        title: name,
                        link: `/products?category=${encodeURIComponent(name)}`,
                        image: null,
                        active: true,
                        displayOrder: index
                    }));
                }
            }
            
            const scrollerContainer = document.createElement('div');
            scrollerContainer.className = 'flex flex-row overflow-x-auto items-center gap-4 md:gap-6 px-4 py-3 hide-scrollbar w-full container mx-auto';
            
            // Add static Sell link first
            const sellHtml = `
                <a href="/seller" class="flex flex-col items-center no-underline text-gold hover:text-yellow-300 transition-all duration-300 shrink-0 group hover:scale-105" style="min-width: 60px;">
                    <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 flex items-center justify-center mb-1 overflow-hidden border-2 border-gold group-hover:bg-gray-700 transition-all shadow-md group-hover:shadow-lg group-hover:border-yellow-300">
                        <i class="fas fa-store-alt text-lg"></i>
                    </div>
                    <span class="text-[10px] md:text-[11px] font-bold text-center w-full truncate max-w-[70px] md:max-w-[80px]">Sell Items</span>
                </a>
                <div class="h-10 w-px bg-gray-700 mx-1 shrink-0"></div>
            `;
            
            scrollerContainer.innerHTML = sellHtml + activeCats.map(cat => {
                let targetUrl = cat.link ? cat.link : `/products?category=${encodeURIComponent(cat.title)}`;
                if (targetUrl.includes('.html')) {
                    targetUrl = targetUrl.replace('.html', '');
                    if (!targetUrl.startsWith('/')) targetUrl = '/' + targetUrl;
                }
                
                const imageUrl = cat.image?.startsWith('http') ? cat.image : 
                                (cat.image ? `${window.API_BASE.replace('/api', '')}${cat.image}` : null);
                
                return `
                    <a href="${targetUrl}" class="flex flex-col items-center no-underline text-gray-400 hover:text-gold transition-all duration-300 shrink-0 group hover:scale-105" style="min-width: 60px;">
                        <div class="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gray-800 flex items-center justify-center mb-1 overflow-hidden border-2 border-transparent group-hover:border-gold transition-all shadow-sm group-hover:shadow-md">
                            ${imageUrl ? `<img src="${imageUrl}" class="w-full h-full object-cover" alt="${cat.title}">` : `<i class="fas fa-tags text-gray-500"></i>`}
                        </div>
                        <span class="text-[10px] md:text-[11px] font-medium max-w-[70px] md:max-w-[80px] truncate text-center">${cat.title}</span>
                    </a>
                `;
            }).join('');
            
            scrollerWrapper.appendChild(scrollerContainer);
            
            // Allow mouse wheel scrolling
            scrollerContainer.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    scrollerContainer.scrollLeft += e.deltaY;
                }
            }, { passive: false });
            
        } catch (error) {
            console.error('Error loading category scroller:', error);
        }
    }

    initializeHideOnScroll() {
        // Disabled: The scroller is now outside the sticky header and scrolls away natively.
    }

    initializeSideMenu() {
        const toggle = document.getElementById('mobile-menu-toggle');
        const closeBtn = document.getElementById('side-menu-close');
        const overlay = document.getElementById('side-menu-overlay');
        const content = document.getElementById('side-menu-content');
        
        const openMenu = () => {
            overlay.classList.remove('hidden');
            // Small timeout to allow block rendering before animating opacity
            setTimeout(() => {
                overlay.classList.add('active');
                content.classList.add('active');
            }, 10);
            document.body.style.overflow = 'hidden';
        };

        const closeMenu = () => {
            overlay.classList.remove('active');
            content.classList.remove('active');
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 300);
            document.body.style.overflow = '';
        };

        if (toggle) toggle.addEventListener('click', openMenu);
        if (closeBtn) closeBtn.addEventListener('click', closeMenu);
        if (overlay) overlay.addEventListener('click', closeMenu);
    }

    async initializeAuthState() {
        const token = localStorage.getItem('token');
        const userFullName = localStorage.getItem('userFullName');

        if (token) {
            try {
                await this.fetchAndUpdateUserData();
            } catch (error) {
                this.updateUIForLoggedInUser(userFullName);
            }
        } else {
            this.updateUIForLoggedOutUser();
        }
        
        // Always try to load cart
        this.updateCartBadge();
    }

    async fetchAndUpdateUserData() {
        const token = localStorage.getItem('token');
        if (!token) throw new Error('No token available');

        const response = await fetch(`${window.API_BASE}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to fetch user profile');

        const userData = await response.json();
        
        if (userData.fullName) localStorage.setItem('userFullName', userData.fullName);
        if (userData.email) localStorage.setItem('userEmail', userData.email);
        
        this.userData = userData;
        this.updateUIForLoggedInUser(userData.fullName || localStorage.getItem('userFullName'));
        this.updateConditionalSections(userData);
    }

    updateUIForLoggedInUser(fullName) {
        const firstName = fullName?.split(' ')[0] || 'User';
        
        // Desktop Top Auth Link
        const headerLoginLink = document.getElementById('header-login-link');
        const headerGreeting = document.getElementById('header-greeting');
        if (headerLoginLink) {
            headerLoginLink.href = '/dashboard';
            if (headerGreeting) headerGreeting.textContent = `Hello, ${firstName}`;
        }

        // Side Menu Greeting
        const sideMenuGreeting = document.getElementById('side-menu-greeting');
        if (sideMenuGreeting) {
            sideMenuGreeting.textContent = `Hello, ${firstName}`;
            sideMenuGreeting.href = '/dashboard';
        }

        // Sign Out Button Inside Side Menu
        const sideMenuSignOut = document.getElementById('side-menu-sign-out');
        if (sideMenuSignOut) {
            sideMenuSignOut.classList.remove('hidden');
            sideMenuSignOut.onclick = (e) => {
                e.preventDefault();
                this.handleLogout();
            };
        }

        // Unhide Account Section
        const sideMenuAccountSection = document.getElementById('side-menu-account-section');
        if (sideMenuAccountSection) sideMenuAccountSection.classList.remove('hidden');
    }

    updateUIForLoggedOutUser() {
        // Desktop Top Auth Link
        const headerLoginLink = document.getElementById('header-login-link');
        const headerGreeting = document.getElementById('header-greeting');
        if (headerLoginLink) {
            headerLoginLink.href = '/login';
            if (headerGreeting) headerGreeting.textContent = `Hello, Sign in`;
        }

        // Side Menu Greeting
        const sideMenuGreeting = document.getElementById('side-menu-greeting');
        if (sideMenuGreeting) {
            sideMenuGreeting.textContent = `Hello, Sign In`;
            sideMenuGreeting.href = '/login';
        }

        // Sign Out Button Inside Side Menu
        const sideMenuSignOut = document.getElementById('side-menu-sign-out');
        if (sideMenuSignOut) sideMenuSignOut.classList.add('hidden');

        // Hide special sections
        ['side-menu-account-section', 'side-menu-seller-section', 'side-menu-admin-section'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.add('hidden');
        });
    }

    updateConditionalSections(userData) {
        const isSeller = userData.isSeller || userData.role === 'seller';
        const isAdmin = userData.role === 'admin' || userData.isAdmin === 'true' || userData.isAdmin === true;

        const sellerSection = document.getElementById('side-menu-seller-section');
        const adminSection = document.getElementById('side-menu-admin-section');

        if (sellerSection) {
            isSeller ? sellerSection.classList.remove('hidden') : sellerSection.classList.add('hidden');
        }
        if (adminSection) {
            isAdmin ? adminSection.classList.remove('hidden') : adminSection.classList.add('hidden');
        }
    }

    async updateCartBadge() {
        const cartBadges = document.querySelectorAll('.cart-badge-count');
        if (cartBadges.length === 0) return;
        
        try {
            // Cart loading logic matching old behavior
            let cart = [];
            const cartItems = localStorage.getItem('virtuosa_cart');
            if (cartItems) {
                cart = JSON.parse(cartItems);
            }
            
            const itemCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
            
            cartBadges.forEach(badge => {
                badge.textContent = itemCount;
                if (itemCount > 0) {
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            });
        } catch (error) {
            console.error('Error updating cart badge:', error);
        }
    }

    async initializeSearch() {
        this.setupSearchInputs('mobile-search-input', 'mobile-search-button', 'mobile-search-suggestions');
        this.setupSearchInputs('desktop-search-input', 'desktop-search-button', 'desktop-search-suggestions');
    }

    setupSearchInputs(inputId, btnId, suggestionsId) {
        const input = document.getElementById(inputId);
        const btn = document.getElementById(btnId);
        const suggestionsContainer = document.getElementById(suggestionsId);

        if (!input || !btn || !suggestionsContainer) return;

        let searchTimeout;

        input.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value.trim();
            if (query.length >= 2) {
                searchTimeout = setTimeout(() => this.showSearchSuggestions(query, suggestionsContainer, inputId), 300);
            } else {
                suggestionsContainer.classList.add('hidden');
            }
        });

        btn.addEventListener('click', () => {
            this.performSearch(input.value);
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.performSearch(input.value);
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.classList.add('hidden');
            }
        });
    }

    async showSearchSuggestions(query, container, inputId) {
        try {
            const response = await fetch(`${window.API_BASE}/search/suggestions?q=${encodeURIComponent(query)}`).catch(() => null);
            if (!response || !response.ok) {
                container.classList.add('hidden');
                return;
            }
            
            const suggestions = await response.json();
            
            if (suggestions.length === 0) {
                container.innerHTML = `<div class="px-4 py-3 text-gray-500 text-sm">No suggestions found for "${query}"</div>`;
                container.classList.remove('hidden');
                return;
            }

            container.innerHTML = suggestions.map(item => {
                const imageUrl = item.image ? 
                    (item.image.startsWith('/') ? `${window.API_BASE.replace('/api', '')}${item.image}` : item.image) : null;
                
                return `
                    <div class="search-suggestion-item px-4 py-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                         data-product-id="${item.id}"
                         data-product-name="${this.escapeHtmlAttribute(item.title)}">
                        ${imageUrl ? `
                            <img src="${imageUrl}" alt="${item.title}" class="w-8 h-8 object-cover rounded">
                        ` : `
                            <div class="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                <i class="fas fa-box text-gray-400 text-xs"></i>
                            </div>
                        `}
                        <div class="flex-1">
                            <div class="text-sm font-medium text-gray-800 line-clamp-1">${item.title}</div>
                            <div class="text-xs text-gray-500">${item.category}</div>
                        </div>
                        <div class="text-navy text-sm font-bold">K${item.price ? item.price.toLocaleString() : '0'}</div>
                    </div>
                `;
            }).join('');

            // Delegation
            container.onclick = (e) => {
                const item = e.target.closest('.search-suggestion-item');
                if (item) {
                    const id = item.dataset.productId;
                    window.location.href = `/product/${id}`;
                }
            };

            container.classList.remove('hidden');
        } catch (error) {
            console.error('Search suggestion error', error);
        }
    }

    performSearch(query) {
        const trimmed = query.trim();
        if (trimmed) {
            window.location.href = `/products?q=${encodeURIComponent(trimmed)}`;
        }
    }

    escapeHtmlAttribute(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    isAuthPage() {
        const currentPath = window.location.pathname;
        return currentPath.includes('/login') || currentPath.includes('/signup');
    }

    initializeNotifications() {
        // Implement lightweight unread notifications count fetch
        const token = localStorage.getItem('token');
        if (!token) return;

        fetch(`${window.API_BASE}/notifications/unread-count`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (!res.ok) throw new Error('Network response was not ok');
            return res.json();
        })
        .then(data => {
            const badge = document.getElementById('notification-badge');
            if (badge && data && data.count > 0) {
                badge.textContent = data.count > 9 ? '9+' : data.count;
                badge.classList.remove('hidden');
            }
        })
        .catch(err => console.log('Notification fetch skipped:', err.message));
    }

    initializeUserDropdown() {
        // Unused in Amazon style, using Side Menu instead for full dashboard
    }

    initializeBasicFunctionality() {
        console.log('Basic fallback initialized');
    }

    handleLogout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userFullName');
        localStorage.removeItem('userEmail');
        window.location.href = '/login';
    }

    /**
     * Show a global notification banner (toast)
     * @param {string} message 
     * @param {string} type - 'success', 'error', 'info', 'warning'
     * @param {number} duration - ms
     */
    showBanner(message, type = 'info', duration = 5000) {
        const containerId = 'virtuosa-global-banner-container';
        let container = document.getElementById(containerId);
        
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            container.className = 'fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none max-w-md w-full px-4 sm:px-0';
            document.body.appendChild(container);

            const style = document.createElement('style');
            style.textContent = `
                @keyframes bannerIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes bannerOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
                .banner-animate-in { animation: bannerIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .banner-animate-out { animation: bannerOut 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `;
            document.head.appendChild(style);
        }

        const banner = document.createElement('div');
        const colors = {
            success: 'bg-emerald-600 border-emerald-400',
            error: 'bg-red-600 border-red-400',
            info: 'bg-blue-600 border-blue-400',
            warning: 'bg-amber-500 border-amber-300'
        };
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            info: 'fa-info-circle',
            warning: 'fa-exclamation-triangle'
        };

        banner.className = `${colors[type] || colors.info} text-white p-4 rounded-xl shadow-2xl border flex items-center gap-3 banner-animate-in pointer-events-auto`;
        banner.innerHTML = `
            <i class="fas ${icons[type] || icons.info} text-xl"></i>
            <div class="flex-1 font-semibold text-sm">${message}</div>
            <button class="hover:bg-white/20 p-1 rounded-lg transition-colors">
                <i class="fas fa-times"></i>
            </button>
        `;

        const closeBanner = () => {
            banner.classList.replace('banner-animate-in', 'banner-animate-out');
            setTimeout(() => banner.remove(), 400);
        };

        banner.querySelector('button').onclick = closeBanner;
        container.appendChild(banner);

        if (duration > 0) {
            setTimeout(closeBanner, duration);
        }
    }

    setupAuthStateObserver() {
        document.addEventListener('authStateChanged', () => this.initializeAuthState());
        window.addEventListener('cartUpdated', () => this.updateCartBadge());
    }
}

// Initialize on load
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => window.unifiedHeader = new UnifiedHeader());
    } else {
        window.unifiedHeader = new UnifiedHeader();
    }
}

}
