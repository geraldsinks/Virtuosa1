// Mobile Header JavaScript for Virtuosa
// Handles mobile menu, search, and responsive functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeMobileHeader();
});

function initializeMobileHeader() {
    // Mobile Menu Elements
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
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
    updateCartBadge();
    
    // Handle authentication state
    updateAuthState();
    
    // Handle responsive behavior
    handleResponsiveBehavior();
}

// Mobile Menu Functions
function openMobileMenu() {
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeMobileMenu() {
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
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
}

async function loadProductsForSearch() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        if (response.ok) {
            window.mobileAllProducts = await response.json();
        }
    } catch (error) {
        console.error('Error loading products for mobile search:', error);
        window.mobileAllProducts = [];
    }
}

function showSearchSuggestions(query) {
    const mobileSearchSuggestions = document.getElementById('mobile-search-suggestions');
    const suggestions = getSearchSuggestions(query, window.mobileAllProducts || []);
    
    if (suggestions.length > 0) {
        mobileSearchSuggestions.innerHTML = suggestions.map(product => `
            <div class="mobile-search-suggestion-item px-4 py-3 hover:bg-gray-800 cursor-pointer border-b border-gray-700 last:border-b-0" 
                 onclick="selectMobileSearchSuggestion('${product.name}', '${product._id}')">
                <div class="flex items-center space-x-3">
                    <img src="${product.image?.startsWith('http') ? product.image : API_BASE.replace('/api', '') + (product.image || '/placeholder-product.jpg')}" 
                         alt="${product.name}" 
                         class="w-10 h-10 object-cover rounded">
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium text-white truncate">${product.name}</div>
                        <div class="text-xs text-gray-400">${product.category}</div>
                    </div>
                    <div class="text-sm font-bold text-gold">$${product.price}</div>
                </div>
            </div>
        `).join('');
        mobileSearchSuggestions.classList.remove('hidden');
    } else {
        mobileSearchSuggestions.innerHTML = `
            <div class="px-4 py-3 text-gray-400 text-sm">
                No products found for "${query}"
            </div>
        `;
        mobileSearchSuggestions.classList.remove('hidden');
    }
}

function hideSearchSuggestions() {
    const mobileSearchSuggestions = document.getElementById('mobile-search-suggestions');
    if (mobileSearchSuggestions) {
        mobileSearchSuggestions.classList.add('hidden');
    }
}

function getSearchSuggestions(query, products) {
    const lowerQuery = query.toLowerCase();
    return products
        .filter(product => 
            product.name.toLowerCase().includes(lowerQuery) ||
            product.category.toLowerCase().includes(lowerQuery) ||
            product.description.toLowerCase().includes(lowerQuery)
        )
        .slice(0, 5); // Limit to 5 suggestions
}

function selectMobileSearchSuggestion(productName, productId) {
    const mobileSearchInput = document.getElementById('mobile-search-input');
    mobileSearchInput.value = productName;
    hideSearchSuggestions();
    
    // Redirect to product detail page
    window.location.href = `/pages/product-detail.html?id=${productId}`;
}

function performSearch() {
    const mobileSearchInput = document.getElementById('mobile-search-input');
    const query = mobileSearchInput.value.trim();
    
    if (query) {
        // Redirect to products page with search query
        window.location.href = `/pages/products.html?search=${encodeURIComponent(query)}`;
    }
}

// Cart Badge Functions
function updateCartBadge() {
    const cartBadgeCount = document.querySelector('.cart-badge-count');
    if (cartBadgeCount) {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const itemCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
        
        cartBadgeCount.textContent = itemCount;
        
        if (itemCount > 0) {
            cartBadgeCount.classList.remove('hidden');
        } else {
            cartBadgeCount.classList.add('hidden');
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
    
    const mobileLoginLink = document.getElementById('mobile-login-link');
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
            mobileLoginLink.href = '/pages/buyer-dashboard.html';
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
            mobileLoginLink.href = '/pages/login.html';
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

// Export functions for global access
window.openMobileMenu = openMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.selectMobileSearchSuggestion = selectMobileSearchSuggestion;
window.updateMobileCartBadge = updateCartBadge;
window.updateMobileAuthState = updateAuthState;

// Listen for cart updates
window.addEventListener('cartUpdated', updateCartBadge);

// Listen for authentication changes
window.addEventListener('authStateChanged', updateAuthState);
