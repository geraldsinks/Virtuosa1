// Mobile Header JavaScript
// Handles mobile menu, search, and responsive functionality

// Helper function to fix URLs to point to server
function fixServerUrl(url) {
    if (!url) return url;
    return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

// Make the helper function globally available
window.fixServerUrl = fixServerUrl;

document.addEventListener('DOMContentLoaded', async function() {
    await initializeMobileHeader();
});

async function initializeMobileHeader() {
    // Mobile Menu Elements
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuButton = document.getElementById('mobile-menu-button'); // Messages page menu button
    const desktopMenuToggle = document.getElementById('desktop-menu-toggle');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    
    // Mobile Search Elements
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const mobileSearchButton = document.getElementById('mobile-search-button');
    const mobileSearchSuggestions = document.getElementById('mobile-search-suggestions');
    
    // Cart Badge Elements
    const cartBadgeCount = document.querySelector('.cart-badge-count');
    
    // Initialize Mobile Menu
    if (mobileMenuToggle && mobileMenuOverlay) {
        mobileMenuToggle.addEventListener('click', openMobileMenu);
    }
    
    // Initialize Messages Page Mobile Menu Button
    if (mobileMenuButton && mobileMenuOverlay) {
        mobileMenuButton.addEventListener('click', openMobileMenu);
    }
    
    // Desktop "All" Menu Trigger (Amazon-style)
    const desktopAllMenu = document.getElementById('desktop-all-menu');
    if (desktopAllMenu && mobileMenuOverlay) {
        desktopAllMenu.addEventListener('click', openMobileMenu);
    }
    
    // Initialize Desktop Menu Toggle (legacy/backup)
    if (desktopMenuToggle && mobileMenuOverlay) {
        desktopMenuToggle.addEventListener('click', openMobileMenu);
    }
    
    if (mobileMenuClose && mobileMenuOverlay) {
        mobileMenuClose.addEventListener('click', closeMobileMenu);
    }
    
    // Close menu when clicking outside
    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', function(e) {
            if (e.target === mobileMenuOverlay) {
                closeMobileMenu();
            }
        });
    }
    
    // Initialize Mobile Search
    if (mobileSearchInput && mobileSearchButton) {
        initializeMobileSearch();
    }
    
    // Initialize Cart Badge
    await updateCartBadge();
    
    // Handle authentication state
    updateAuthState();
    
    // Handle responsive behavior
    handleResponsiveBehavior();
    
    // Initialize horizontal category scroller
    initializeMobileCategoryScroller();
}

// Mobile Menu Functions
function openMobileMenu() {
    console.log('📱 Opening mobile menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const mobileMenuContent = document.getElementById('mobile-menu-content');
    
    if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.add('active');
    }
    
    if (mobileMenuContent) {
        mobileMenuContent.classList.add('active');
    }
    
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeMobileMenu() {
    console.log('📱 Closing mobile menu');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const mobileMenuContent = document.getElementById('mobile-menu-content');
    
    if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.remove('active');
    }
    
    if (mobileMenuContent) {
        mobileMenuContent.classList.remove('active');
    }
    
    document.body.style.overflow = ''; // Restore scrolling
}

// Mobile Search Functions
function initializeMobileSearch() {
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const mobileSearchButton = document.getElementById('mobile-search-button');
    const mobileSearchSuggestions = document.getElementById('mobile-search-suggestions');
    
    let searchTimeout;
    let allProducts = [];
    
    // Load products for search suggestions
    loadProductsForSearch();
    
    // Search input events
    mobileSearchInput.addEventListener('input', function(e) {
        clearTimeout(searchTimeout);
        const query = e.target.value.trim();
        
        if (query.length >= 2) {
            searchTimeout = setTimeout(() => {
                showSearchSuggestions(query);
            }, 300);
        } else {
            hideSearchSuggestions();
        }
    });
    
    // Search button click
    mobileSearchButton.addEventListener('click', function() {
        performSearch();
    });
    
    // Enter key in search input
    mobileSearchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });
    
    // Click outside to close suggestions
    document.addEventListener('click', function(e) {
        if (!e.target.closest('.mobile-search-container')) {
            hideSearchSuggestions();
        }
    });
    
    // Prevent input from losing focus when clicking suggestions
    if (mobileSearchSuggestions) {
        mobileSearchSuggestions.addEventListener('mousedown', (e) => {
            e.preventDefault();
        });

        // Delegate clicks to suggestion items (avoids brittle inline onclick)
        mobileSearchSuggestions.addEventListener('click', (e) => {
            const suggestionItem = e.target.closest('.mobile-search-suggestion-item');
            if (!suggestionItem) return;

            const productId = suggestionItem.dataset.productId;
            const productName = suggestionItem.dataset.productName || '';
            if (!productId) return;

            selectMobileSearchSuggestion(productName, productId);
        });
    }
}

async function loadProductsForSearch() {
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

// Fetch search suggestions from API (same as index.html)
async function fetchSuggestions(query) {
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

function showSearchSuggestions(query) {
    const mobileSearchSuggestions = document.getElementById('mobile-search-suggestions');
    
    // Use new search suggestions API like index.html
    fetchSuggestions(query)
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
                // Handle image URL with server base URL
                const imageUrl = item.image ? 
                    (item.image.startsWith('/') ? `${API_BASE.replace('/api', '')}${item.image}` : item.image) : 
                    null;
                
                return `
                    <div class="mobile-search-suggestion-item px-4 py-3 hover:bg-gray-800 cursor-pointer border-b border-gray-700 last:border-b-0"
                         data-product-id="${item.id}"
                         data-product-name="${escapeHtmlAttribute(item.title)}">
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
                            <div class="flex-1">
                                <div class="text-sm font-medium text-white line-clamp-1">${item.title}</div>
                                <div class="text-xs text-gray-400">${item.category}</div>
                            </div>
                            <div class="text-gold text-sm font-bold">K${item.price ? item.price.toLocaleString() : '0'}</div>
                        </div>
                    </div>
                `;
            }).join('');

            mobileSearchSuggestions.classList.remove('hidden');
        })
        .catch(error => {
            console.error('Error fetching search suggestions:', error);
            mobileSearchSuggestions.innerHTML = `
                <div class="px-4 py-3 text-gray-400 text-sm">
                    Error loading suggestions
                </div>
            `;
            mobileSearchSuggestions.classList.remove('hidden');
        });
}

function hideSearchSuggestions() {
    const mobileSearchSuggestions = document.getElementById('mobile-search-suggestions');
    if (mobileSearchSuggestions) {
        mobileSearchSuggestions.classList.add('hidden');
    }
}

function selectMobileSearchSuggestion(productName, productId) {
    console.log('🚀 MOBILE SEARCH SUGGESTION CLICKED');
    console.log('📦 Product Name:', productName);
    console.log('🆔 Product ID:', productId);
    
    const mobileSearchInput = document.getElementById('mobile-search-input');
    mobileSearchInput.value = productName;
    hideSearchSuggestions();
    
    // Use clean URL format like desktop search
    const productDetailUrl = `/product/${productId}`;
    console.log('🔗 Navigating to clean URL:', productDetailUrl);
    
    // Direct navigation - bypass router completely
    window.location.href = productDetailUrl;
}

function performSearch() {
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const query = mobileSearchInput.value.trim();
    
    if (query) {
        console.log('Mobile search for:', query);
        console.log('Current pathname:', window.location.pathname);
        
        // Use centralized routing for products search
        const productsPath = `/products?q=${encodeURIComponent(query)}`;
        console.log('Final mobile search path:', productsPath);
        
        // Redirect to products page with search query
        window.location.href = productsPath;
    }
}

// Cart Badge Functions
async function updateCartBadge() {
    const cartBadgeCount = document.querySelector('.cart-badge-count');
    if (cartBadgeCount) {
        try {
            // Use the same getCart function as cart.js for consistency
            const cart = await getCart();
            const itemCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
            
            cartBadgeCount.textContent = itemCount;
            
            if (itemCount > 0) {
                cartBadgeCount.classList.remove('hidden');
            } else {
                cartBadgeCount.classList.add('hidden');
            }
        } catch (error) {
            console.error('Error updating cart badge:', error);
            // Fallback to localStorage if getCart fails
            const cart = JSON.parse(localStorage.getItem('virtuosa_cart') || '[]');
            const itemCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
            
            cartBadgeCount.textContent = itemCount;
            
            if (itemCount > 0) {
                cartBadgeCount.classList.remove('hidden');
            } else {
                cartBadgeCount.classList.add('hidden');
            }
        }
    }
}

// Authentication State Functions
function updateAuthState() {
    const token = localStorage.getItem('token');
    const userEmail = localStorage.getItem('userEmail');
    const userFullName = localStorage.getItem('userFullName');
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const isSeller = localStorage.getItem('isSeller') === 'true';
    
    const mobileLoginLink = document.getElementById('mobile-menu-sign-link');
    const mobileSellerSection = document.getElementById('mobile-seller-section');
    const mobileAdminSection = document.getElementById('mobile-admin-section');
    const userGreeting = document.getElementById('user-greeting');
    
    if (token && userEmail) {
        // User is authenticated
        if (mobileLoginLink) {
            mobileLoginLink.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span class="mobile-auth-label hidden ml-1 text-sm">Dashboard</span>
            `;
            mobileLoginLink.href = '/dashboard';
        }

        // Update greeting in header if it exists
        if (userGreeting && userFullName) {
            userGreeting.textContent = `Hello, ${userFullName.split(' ')[0]}`;
        }
        
        // Show seller section if user is a seller
        if (isSeller && mobileSellerSection) {
            mobileSellerSection.style.display = 'block';
        } else if (mobileSellerSection) {
            mobileSellerSection.style.display = 'none';
        }
        
        // Show admin section if user is an admin
        if (isAdmin && mobileAdminSection) {
            mobileAdminSection.style.display = 'block';
        } else if (mobileAdminSection) {
            mobileAdminSection.style.display = 'none';
        }
    } else {
        // User is not authenticated
        if (mobileLoginLink) {
            mobileLoginLink.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span class="mobile-auth-label hidden ml-1 text-sm">Sign in</span>
            `;
            mobileLoginLink.href = '/login';
        }
        if (mobileSellerSection) mobileSellerSection.style.display = 'none';
        if (mobileAdminSection) mobileAdminSection.style.display = 'none';
        if (userGreeting) userGreeting.textContent = '';
    }
}

// Responsive Behavior Functions
function handleResponsiveBehavior() {
    // Handle screen size changes
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Removed automatic closure for desktop switch to allow hamburger on desktop
        }, 250);
    });
    
    // Handle orientation changes
    window.addEventListener('orientationchange', function() {
        setTimeout(() => {
            hideSearchSuggestions();
        }, 100);
    });
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Mobile Category Scroller Functions
async function initializeMobileCategoryScroller() {
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
        scrollerContainer.className = 'mobile-category-scroller md:hidden flex flex-row overflow-x-auto whitespace-nowrap hide-scrollbar items-center bg-[#0A1128] gap-4 border-gray-800 transition-all duration-300 ease-in-out origin-top overflow-y-hidden border-b'; // hide on desktop automatically
        
        // Define initial visible styles
        scrollerContainer.style.maxHeight = '140px';
        scrollerContainer.style.paddingTop = '0.75rem';
        scrollerContainer.style.paddingBottom = '0.75rem';
        scrollerContainer.style.paddingLeft = '1rem';
        scrollerContainer.style.paddingRight = '1rem';
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
                <a href="${targetUrl}" class="mobile-category-item flex flex-col items-center no-underline text-gray-400 hover:text-gold transition-colors shrink-0" style="min-width: 56px;">
                    <div class="mobile-category-icon w-11 h-11 rounded-full bg-gray-800 flex items-center justify-center mb-1.5 overflow-hidden border-2 border-transparent hover:border-gold transition-colors">
                        ${imageUrl ? `<img src="${imageUrl}" class="w-full h-full object-cover rounded-full" alt="${cat.title}">` : `<i class="fas fa-search text-gray-400"></i>`}
                    </div>
                    <span class="mobile-category-text text-[10px] font-medium truncate w-[64px] text-center">${cat.title}</span>
                </a>
            `;
        }).join('');
        
        searchRow.insertAdjacentElement('afterend', scrollerContainer);
        
        // Implement Auto-Hide Behavior on Scroll
        let lastScrollY = window.scrollY || document.documentElement.scrollTop;
        let cumulativeScrollUp = 0;
        
        window.addEventListener('scroll', () => {
            // Only apply on mobile viewport
            if (window.innerWidth >= 768) return;
            
            const currentScrollY = window.scrollY || document.documentElement.scrollTop;
            const diff = currentScrollY - lastScrollY;
            
            // Scrolling Down
            if (diff > 0) {
                cumulativeScrollUp = 0; // Reset upward scroll intent
                
                if (diff > 5 && currentScrollY > 150) {
                    scrollerContainer.style.maxHeight = '0px';
                    scrollerContainer.style.paddingTop = '0px';
                    scrollerContainer.style.paddingBottom = '0px';
                    scrollerContainer.style.opacity = '0';
                    scrollerContainer.style.borderBottomWidth = '0px';
                    lastScrollY = currentScrollY;
                }
            } 
            // Scrolling Up
            else if (diff < 0) {
                cumulativeScrollUp += Math.abs(diff);
                
                // Show only if scrolled up deliberately (e.g. 50px) OR hit the top
                if (cumulativeScrollUp > 50 || currentScrollY < 100) {
                    scrollerContainer.style.maxHeight = '140px';
                    scrollerContainer.style.paddingTop = '0.75rem';
                    scrollerContainer.style.paddingBottom = '0.75rem';
                    scrollerContainer.style.opacity = '1';
                    scrollerContainer.style.borderBottomWidth = '1px';
                    lastScrollY = currentScrollY;
                    cumulativeScrollUp = 0; // Reset after show
                }
            }
        }, { passive: true });
        
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
                    <a href="/pages/seller.html" class="flex flex-col items-center no-underline text-gold hover:text-yellow-300 transition-colors shrink-0" style="min-width: 64px;">
                        <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-1.5 overflow-hidden border-2 border-gold hover:bg-gray-700 transition-all shadow-md hover:shadow-lg">
                            <i class="fas fa-store-alt text-lg"></i>
                        </div>
                        <span class="text-[11px] font-bold text-center w-full truncate">Sell Items</span>
                    </a>
                    <div class="w-px h-10 bg-gray-700 mx-2 shrink-0"></div>
                `;
                
                // 2. Map the activeCats to desktop cards
                const dynamicLinksHtml = activeCats.map(cat => {
                    return `
                        <a href="${cat.targetUrl}" class="flex flex-col items-center no-underline text-gray-400 hover:text-gold transition-colors shrink-0" style="min-width: 64px;">
                            <div class="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-1.5 overflow-hidden border-2 border-transparent hover:border-gold transition-colors shadow-sm">
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

// Export functions for global access
window.openMobileMenu = openMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.selectMobileSearchSuggestion = selectMobileSearchSuggestion;
window.updateMobileCartBadge = updateCartBadge;
window.updateMobileAuthState = updateAuthState;

// Helper function to escape HTML attributes (same as index.html)
function escapeHtmlAttribute(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Listen for cart updates
window.addEventListener('cartUpdated', async () => {
    await updateCartBadge();
});

// Listen for authentication changes
window.addEventListener('authStateChanged', updateAuthState);
