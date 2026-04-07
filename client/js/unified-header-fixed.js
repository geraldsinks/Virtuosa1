/**
 * Fixed Unified Header System for Virtuosa
 * Production-grade centralized header management with clean URL support
 * 
 * FIXES:
 * - All hardcoded .html links replaced with clean URLs
 * - Integration with URLHelper system
 * - Proper link updating after dynamic content injection
 * - Coordination with navigation state manager
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
            
            // 4. CRITICAL: Update all links to use clean URLs
            this.updateAllLinksToClean();
            
            console.log('× Unified header system initialized with clean URL support');
        } catch (error) {
            console.error('Failed to initialize unified header:', error);
            // Fallback to basic functionality
            this.initializeBasicFunctionality();
        }
    }

    /**
     * Update all links in the header to use clean URLs
     * This is the critical fix for multinavigation issues
     */
    updateAllLinksToClean() {
        // Use URLHelper if available, otherwise manual conversion
        if (window.URLHelper && window.URLHelper.updatePageLinks) {
            window.URLHelper.updatePageLinks();
        } else {
            this.manualLinkUpdate();
        }
        
        // Set up observer to handle dynamically added content
        this.setupLinkObserver();
    }

    /**
     * Manual link update as fallback
     */
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
            '/pages/contact-support.html': '/contact'
        };

        // Update all links in the header
        const headerLinks = document.querySelectorAll('header a[href*=".html"]');
        headerLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (linkMappings[href]) {
                link.setAttribute('href', linkMappings[href]);
            }
        });
    }

    /**
     * Set up mutation observer to handle dynamic content
     */
    setupLinkObserver() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    // Update any new links that were added
                    setTimeout(() => {
                        this.updateAllLinksToClean();
                    }, 100);
                }
            });
        });

        // Observe the header for changes
        const header = document.querySelector('header');
        if (header) {
            observer.observe(header, {
                childList: true,
                subtree: true
            });
        }
    }

    /**
     * Ensure header HTML structure exists (inject if missing)
     */
    ensureHeaderExists() {
        let header = document.querySelector('header.bg-gradient-to-r');
        
        if (!header) {
            console.log('ð¡§ No header found, injecting unified header...');
            const headerHTML = this.getUnifiedHeaderHTML(); // This will use clean URLs
            const body = document.body;
            body.insertAdjacentHTML('afterbegin', headerHTML);
            header = document.querySelector('header');
            console.log('â¡ Unified header injected');
        } else {
            console.log('â¡ Header already exists');
        }
        
        // Inject horizontal category navigation if it doesn't exist
        this.ensureHorizontalNavigationExists();
        
        // Add enhanced CSS styles
        this.addEnhancedStyles();
        
        return header;
    }

    /**
     * Get unified header HTML template with CLEAN URLs ONLY
     * FIXED: All .html links replaced with clean URLs
     */
    getUnifiedHeaderHTML() {
        return `
<!-- Mobile Header -->
<header class="mobile-header-row-1 bg-navy text-white shadow-md sticky top-0 z-50 md:hidden">
    <div class="container mx-auto px-4 py-3">
        <div class="flex items-center justify-between">
            <!-- Hamburger Menu -->
            <button id="mobile-menu-toggle" class="text-white hover:text-gold transition-colors p-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            <!-- Logo -->
            <div class="flex-1 text-center">
                <a href="/" class="text-xl font-bold text-gold hover:text-yellow-400 transition-colors">Virtuosa</a>
            </div>

            <!-- Actions -->
            <div class="flex items-center space-x-3">
                <a href="/cart" class="relative text-white hover:text-gold transition-colors">
                    <i class="fas fa-shopping-cart text-lg"></i>
                    <span class="cart-badge-count absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hidden">0</span>
                </a>
                <a href="/login" class="text-white hover:text-gold transition-colors">
                    <i class="fas fa-user text-lg"></i>
                </a>
            </div>
        </div>
    </div>
</header>

<!-- Mobile Search Header -->
<header class="mobile-header-row-2 bg-gray-900 text-white shadow-md md:hidden">
    <div class="container mx-auto px-4 py-3">
        <div class="relative">
            <input id="mobile-search-input" type="text" placeholder="Search products..." 
                   class="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:border-gold focus:outline-none">
            <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <i class="fas fa-search"></i>
            </div>
            <button id="mobile-search-button" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gold hover:text-yellow-400">
                <i class="fas fa-arrow-right"></i>
            </button>
            <!-- Mobile Search Suggestions -->
            <div id="mobile-search-suggestions" class="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto hidden z-50">
            </div>
        </div>
    </div>
</header>

<!-- Desktop Header -->
<header class="desktop-header bg-navy text-white shadow-md sticky top-0 z-50 hidden md:block">
    <div class="container mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
            <!-- Logo -->
            <div class="flex items-center">
                <a href="/" class="text-2xl font-bold text-gold hover:text-yellow-400 transition-colors">Virtuosa</a>
            </div>

            <!-- Search Bar -->
            <div class="flex-1 max-w-2xl mx-8">
                <div class="relative">
                    <input id="desktop-search-input" type="text" placeholder="Search for products..." 
                           class="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800 text-white placeholder-gray-400 border border-gray-700 focus:border-gold focus:outline-none">
                    <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                        <i class="fas fa-search"></i>
                    </div>
                    <button id="desktop-search-button" class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gold hover:text-yellow-400">
                        <i class="fas fa-arrow-right"></i>
                    </button>
                    <!-- Desktop Search Suggestions -->
                    <div id="home-search-suggestions" class="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto hidden z-50">
                    </div>
                </div>
            </div>

            <!-- Navigation -->
            <div class="flex items-center space-x-6">
                <a href="/products" class="text-white hover:text-gold transition-colors">Browse</a>
                <a href="/seller" class="text-gold hover:text-yellow-400 transition-colors font-semibold">Sell</a>
                <a href="/cart" class="relative text-white hover:text-gold transition-colors">
                    <i class="fas fa-shopping-cart"></i>
                    <span class="cart-badge-count absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center hidden">0</span>
                </a>
                <a href="/login" id="login-link" class="bg-gold text-navy px-4 py-2 rounded-lg hover:bg-yellow-400 transition-colors font-semibold">Sign In</a>
                
                <!-- User Dropdown (hidden when not logged in) -->
                <div id="user-dropdown-container" class="relative hidden">
                    <button id="user-dropdown-button" onclick="toggleUserMenu()" class="flex items-center space-x-2 text-white hover:text-gold transition-colors">
                        <i class="fas fa-user"></i>
                        <span id="user-greeting-short"></span>
                        <i class="fas fa-chevron-down text-xs"></i>
                    </button>
                    <div id="user-dropdown" class="absolute right-0 top-full mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 hidden">
                        <div class="p-2">
                            <a href="/profile" class="block px-3 py-2 text-white hover:bg-gray-700 rounded">My Profile</a>
                            <a href="/orders" class="block px-3 py-2 text-white hover:bg-gray-700 rounded">My Orders</a>
                            <a href="/dashboard" class="block px-3 py-2 text-white hover:bg-gray-700 rounded">Dashboard</a>
                            <div class="border-t border-gray-700 my-2"></div>
                            <button onclick="logout()" class="block w-full text-left px-3 py-2 text-white hover:bg-gray-700 rounded">Sign Out</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</header>

<!-- Mobile Menu Overlay -->
<div id="mobile-menu-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden md:hidden"></div>

<!-- Mobile Menu Content -->
<div id="mobile-menu-content" class="fixed top-0 left-0 w-80 h-full bg-gray-900 text-white z-50 transform -translate-x-full transition-transform duration-300 md:hidden">
    <div class="mobile-menu-header p-4 border-b border-gray-700">
        <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold text-gold">Menu</h2>
            <button id="mobile-menu-close" class="text-white hover:text-gold transition-colors">
                <i class="fas fa-times text-xl"></i>
            </button>
        </div>
    </div>
    
    <div class="p-4">
        <!-- Account Section -->
        <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Account</h3>
            <a href="/login" id="mobile-menu-sign-link" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-sign-in-alt"></i>
                <span id="mobile-menu-sign-text">Sign In</span>
            </a>
            <a href="/profile" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-user"></i>
                <span>My Profile</span>
            </a>
            <a href="/dashboard" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-tachometer-alt"></i>
                <span>Dashboard</span>
            </a>
            <a href="/orders" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-shopping-bag"></i>
                <span>My Orders</span>
            </a>
        </div>
        
        <!-- Shopping Section -->
        <div class="mb-6">
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Shopping</h3>
            <a href="/" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-home"></i>
                <span>Home</span>
            </a>
            <a href="/products" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-th-large"></i>
                <span>All Products</span>
            </a>
            <a href="/products?category=Hot%20Deals" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-tag"></i>
                <span>Hot Deals</span>
            </a>
            <a href="/seller" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-store"></i>
                <span>Sell Items</span>
            </a>
        </div>
        
        <!-- Seller Section (conditional) -->
        <div id="mobile-seller-section" class="mb-6 hidden">
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Selling</h3>
            <a href="/seller-dashboard" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-store"></i>
                <span>My Shop</span>
            </a>
            <a href="/create-product" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-plus"></i>
                <span>Create Product</span>
            </a>
        </div>
        
        <!-- Admin Section (conditional) -->
        <div id="mobile-admin-section" class="mb-6 hidden">
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Administration</h3>
            <a href="/admin" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-cog"></i>
                <span>Admin Dashboard</span>
            </a>
        </div>
        
        <!-- Support Section -->
        <div>
            <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Support</h3>
            <a href="/faq" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-question-circle"></i>
                <span>Help Center</span>
            </a>
            <a href="/contact" class="flex items-center space-x-3 p-3 text-white hover:bg-gray-800 rounded-lg transition-colors mb-2">
                <i class="fas fa-envelope"></i>
                <span>Contact Us</span>
            </a>
        </div>
    </div>
</div>
        `;
    }

    // ... (rest of the methods remain the same, but ensure all dynamic content uses clean URLs)
    
    /**
     * Initialize mobile category scroller with CLEAN URLs
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
                            link: `/products?category=${encodeURIComponent(name)}`, // CLEAN URL
                            image: found ? found.image : null,
                            active: true,
                            displayOrder: index
                        };
                    });
                }
            }
            
            if (activeCats.length === 0) return;
            
            const scrollerContainer = document.createElement('div');
            scrollerContainer.className = 'mobile-category-scroller md:hidden flex flex-row overflow-x-auto items-center bg-gradient-to-r from-slate-900/80 via-navy/80 to-slate-900/80 backdrop-blur-sm gap-4 border-gold/20 transition-all duration-300 ease-in-out border-b shadow-lg relative z-20';
            
            // Define initial visible styles with better appearance
            scrollerContainer.style.maxHeight = '120px';
            scrollerContainer.style.paddingTop = '0.875rem';
            scrollerContainer.style.paddingBottom = '0.875rem';
            scrollerContainer.style.paddingLeft = '1.25rem';
            scrollerContainer.style.paddingRight = '1.25rem';
            scrollerContainer.style.opacity = '1';
            
            scrollerContainer.innerHTML = activeCats.map(cat => {
                // ENSURE CLEAN URLs
                let targetUrl = cat.link ? cat.link : `/products?category=${encodeURIComponent(cat.title)}`;
                
                // Fix any remaining .html paths
                if (targetUrl.includes('.html')) {
                    targetUrl = targetUrl.replace('.html', '');
                }
                
                // Ensure clean URL format
                if (targetUrl.includes('/pages/')) {
                    targetUrl = targetUrl.replace('/pages/', '');
                }
                
                if (!targetUrl.startsWith('/')) {
                    targetUrl = '/' + targetUrl;
                }
                
                // Enhance cat object with cleaned URL for desktop reuse
                cat.targetUrl = targetUrl;
                
                const imageUrl = cat.image?.startsWith('http') ? cat.image : 
                                (cat.image ? `${API_BASE.replace('/api', '')}${cat.image}` : null);
                // Enhance cat object with cleaned image mapping for desktop reuse
                cat.imageUrl = imageUrl;
                
                return `
                    <a href="${targetUrl}" class="mobile-category-item flex flex-col items-center no-underline text-gray-300 hover:text-gold transition-all duration-300 shrink-0 hover:scale-110 group" style="min-width: 70px;">
                        <div class="mobile-category-icon w-14 h-14 rounded-full bg-gradient-to-br from-gold/20 to-yellow-500/10 flex items-center justify-center mb-2 overflow-hidden border-2 border-gold/40 hover:border-gold transition-all shadow-md group-hover:shadow-lg group-hover:from-gold/40 group-hover:to-yellow-500/20">
                            ${imageUrl ? `<img src="${imageUrl}" class="w-full h-full object-cover rounded-full" alt="${cat.title}" style="object-fit: cover;">` : `<i class="fas fa-tag text-gold text-lg"></i>`}
                        </div>
                        <span class="mobile-category-text text-[11px] font-semibold truncate w-[70px] text-center text-white group-hover:text-gold transition-colors">${cat.title}</span>
                    </a>
                `;
            }).join('');
            
            // Inject the mobile scroller OUTSIDE the sticky header so it scrolls away naturally
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
                    
                    // 1. Manually add Sell Items with CLEAN URL
                    const sellLinkHtml = `
                        <a href="/seller" class="flex flex-col items-center no-underline text-gold hover:text-yellow-300 transition-all duration-300 shrink-0 group hover:scale-105" style="min-width: 70px;">
                            <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-1.5 overflow-hidden border-2 border-gold group-hover:bg-gray-700 transition-all shadow-md group-hover:shadow-lg group-hover:border-yellow-300">
                                <i class="fas fa-store-alt text-lg"></i>
                            </div>
                            <span class="text-[11px] font-bold text-center w-full truncate">Sell Items</span>
                        </a>
                        <div class="w-px h-10 bg-gray-700 mx-2 shrink-0"></div>
                    `;
                    
                    // 2. Map the activeCats to desktop cards with CLEAN URLs
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
            
            // CRITICAL: Update links after dynamic content injection
            setTimeout(() => {
                this.updateAllLinksToClean();
            }, 100);
            
        } catch (error) {
            console.error('Error loading category scroller:', error);
        }
    }

    /**
     * Select mobile search suggestion with CLEAN URL
     */
    selectMobileSearchSuggestion(productName, productId) {
        console.log('ð¡ MOBILE SEARCH SUGGESTION CLICKED');
        console.log('ð¦ Product Name:', productName);
        console.log('ð Product ID:', productId);
        
        const mobileSearchInput = document.getElementById('mobile-search-input');
        if (mobileSearchInput) {
            mobileSearchInput.value = productName;
        }
        this.hideMobileSearchSuggestions(document.getElementById('mobile-search-suggestions'));
        
        // Use clean URL format
        const productDetailUrl = `/product/${productId}`;
        console.log('ð¡ Navigating to clean URL:', productDetailUrl);
        
        // Use navigation state manager if available
        if (window.NavigationStateManager) {
            window.NavigationStateManager.navigate(productDetailUrl);
        } else {
            window.location.href = productDetailUrl;
        }
    }

    /**
     * Perform mobile search with CLEAN URL
     */
    performMobileSearch(query) {
        const trimmedQuery = query.trim();
        
        if (trimmedQuery) {
            console.log('Mobile search for:', trimmedQuery);
            
            // Use clean URL format for search
            const productsPath = `/products?q=${encodeURIComponent(trimmedQuery)}`;
            console.log('Final mobile search path:', productsPath);
            
            // Use navigation state manager if available
            if (window.NavigationStateManager) {
                window.NavigationStateManager.navigate(productsPath);
            } else {
                window.location.href = productsPath;
            }
        }
    }

    // ... (rest of the methods remain the same, but ensure they all use clean URLs)

    /**
     * Initialize basic functionality as fallback
     */
    initializeBasicFunctionality() {
        console.log('Initializing basic header functionality');
        
        // Basic mobile menu toggle
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
        const mobileMenuClose = document.getElementById('mobile-menu-close');
        const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
        const mobileMenuContent = document.getElementById('mobile-menu-content');
        
        if (mobileMenuToggle && mobileMenuContent) {
            mobileMenuToggle.addEventListener('click', () => {
                mobileMenuContent.classList.remove('-translate-x-full');
                if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('hidden');
            });
        }
        
        if (mobileMenuClose && mobileMenuContent) {
            mobileMenuClose.addEventListener('click', () => {
                mobileMenuContent.classList.add('-translate-x-full');
                if (mobileMenuOverlay) mobileMenuOverlay.classList.add('hidden');
            });
        }
        
        if (mobileMenuOverlay && mobileMenuContent) {
            mobileMenuOverlay.addEventListener('click', () => {
                mobileMenuContent.classList.add('-translate-x-full');
                mobileMenuOverlay.classList.add('hidden');
            });
        }
        
        // Update links even in basic mode
        this.updateAllLinksToClean();
    }
}

// Initialize on load
if (typeof document !== 'undefined') {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.unifiedHeader = new UnifiedHeader();
        });
    } else {
        window.unifiedHeader = new UnifiedHeader();
    }
}
