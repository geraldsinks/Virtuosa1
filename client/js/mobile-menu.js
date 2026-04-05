// Mobile Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const mobileMenuContent = document.querySelector('.mobile-menu-content');

    /**
     * Standardized Mobile Menu Sections
     * This ensures all pages have consistent, functional navigation.
     */
    function injectStandardMenuSections() {
        if (!mobileMenuContent) return;

        // Preserve header
        const header = mobileMenuContent.querySelector('.mobile-menu-header');
        
        // Find existing sections
        const sections = Array.from(mobileMenuContent.querySelectorAll('.mobile-menu-section'));
        
        // 1. Account Section (Fixed & Synced)
        let accountSection = sections.find(s => s.querySelector('.mobile-menu-title')?.textContent === 'Account');
        if (accountSection) {
            accountSection.innerHTML = `
                <div class="mobile-menu-title">Account</div>
                <a href="/pages/login.html" id="mobile-menu-sign-link" class="mobile-menu-link">
                    <i class="fas fa-sign-in-alt"></i>
                    <span id="mobile-menu-sign-text">Sign In</span>
                </a>
                <a href="/pages/profile.html" class="mobile-menu-link">
                    <i class="fas fa-user"></i>
                    <span>My Profile</span>
                </a>
                <a href="/pages/buyer-dashboard.html" class="mobile-menu-link">
                    <i class="fas fa-tachometer-alt"></i>
                    <span>Dashboard</span>
                </a>
                <a href="/pages/orders.html" class="mobile-menu-link">
                    <i class="fas fa-shopping-bag"></i>
                    <span>My Orders</span>
                </a>
                <a href="/pages/transactions.html" class="mobile-menu-link">
                    <i class="fas fa-exchange-alt"></i>
                    <span>Transactions</span>
                </a>
            `;
        }

        // 2. Shopping Section (Modernized, no placeholders)
        let shoppingSection = sections.find(s => s.querySelector('.mobile-menu-title')?.textContent === 'Shopping');
        if (shoppingSection) {
            shoppingSection.innerHTML = `
                <div class="mobile-menu-title">Shopping</div>
                <a href="/index.html" class="mobile-menu-link">
                    <i class="fas fa-home"></i>
                    <span>Home</span>
                </a>
                <a href="/pages/products.html" class="mobile-menu-link">
                    <i class="fas fa-th-large"></i>
                    <span>All Products</span>
                </a>
                <a href="javascript:void(0)" onclick="window.openCategories()" class="mobile-menu-link">
                    <i class="fas fa-list"></i>
                    <span>Categories</span>
                </a>
                <a href="/pages/products.html?category=Hot%20Deals" class="mobile-menu-link">
                    <i class="fas fa-tag"></i>
                    <span>Hot Deals</span>
                </a>
                <a id="mobile-seller-link" href="/pages/seller.html" class="mobile-menu-link">
                    <i id="mobile-seller-icon" class="fas fa-store"></i>
                    <span id="mobile-seller-text">Become a Seller</span>
                </a>
            `;
        }

        // 3. Support Section (Fixed placeholders)
        let supportSection = sections.find(s => ['Customer Service', 'Support', 'Customer'].includes(s.querySelector('.mobile-menu-title')?.textContent));
        if (!supportSection) {
            // Create if it doesn't exist
            supportSection = document.createElement('div');
            supportSection.className = 'mobile-menu-section';
            mobileMenuContent.appendChild(supportSection);
        }
        
        supportSection.innerHTML = `
            <div class="mobile-menu-title">Support</div>
            <a href="/pages/faq.html" class="mobile-menu-link">
                <i class="fas fa-question-circle"></i>
                <span>Help Center</span>
            </a>
            <a href="/pages/contact-support.html" class="mobile-menu-link">
                <i class="fas fa-envelope"></i>
                <span>Contact Us</span>
            </a>
            <a href="javascript:void(0)" onclick="window.showTokenRewards()" class="mobile-menu-link">
                <i class="fas fa-coins text-gold"></i>
                <span>Token Rewards</span>
            </a>
        `;
    }


    // Store event listeners for proper cleanup
    const eventListeners = [];

    // Open mobile menu
    if (mobileMenuToggle) {
        const openMenuHandler = function() {
            if (mobileMenuOverlay) mobileMenuOverlay.classList.add('active');
            if (mobileMenuContent) mobileMenuContent.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        };
        mobileMenuToggle.addEventListener('click', openMenuHandler);
        eventListeners.push({ element: mobileMenuToggle, handler: openMenuHandler });
    }

    // Close mobile menu
    function closeMobileMenu() {
        if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
        if (mobileMenuContent) mobileMenuContent.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', closeMobileMenu);
        eventListeners.push({ element: mobileMenuClose, handler: closeMobileMenu });
    }

    // Close mobile menu when clicking overlay
    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', closeMobileMenu);
        eventListeners.push({ element: mobileMenuOverlay, handler: closeMobileMenu });
    }

    // Close mobile menu when clicking outside
    const outsideClickHandler = function(event) {
        if (mobileMenuContent && !mobileMenuContent.contains(event.target) && 
            mobileMenuToggle && !mobileMenuToggle.contains(event.target)) {
            closeMobileMenu();
        }
    };
    document.addEventListener('click', outsideClickHandler);
    eventListeners.push({ element: document, handler: outsideClickHandler });

    // Handle user role-based menu sections
    async function updateUserMenuSections() {
        if (!window.authManager) {
            console.warn('AuthManager not available, using fallback');
            updateMenuUIFromStorage();
            return;
        }

        const userData = await window.authManager.getUserData();
        
        if (!userData) {
            // User not authenticated
            const sellerSection = document.getElementById('mobile-seller-section');
            const adminSection = document.getElementById('mobile-admin-section');
            const signLink = document.getElementById('mobile-menu-sign-link');
            const signText = document.getElementById('mobile-menu-sign-text');

            if (sellerSection) sellerSection.style.display = 'none';
            if (adminSection) adminSection.style.display = 'none';
            
            if (signLink && signText) {
                signLink.href = '/login';
                signText.textContent = 'Sign In';
                // Remove any existing click handlers
                signLink.replaceWith(signLink.cloneNode(true));
            }
            return;
        }

        updateMenuUI(userData);
    }

    function updateMenuUI(userData) {
        const sellerSection = document.getElementById('mobile-seller-section');
        const adminSection = document.getElementById('mobile-admin-section');
        const signLink = document.getElementById('mobile-menu-sign-link');
        const signText = document.getElementById('mobile-menu-sign-text');
        
        // Determine roles from fresh user data
        const isAdmin = userData.isAdmin === true || userData.isAdmin === 'true' || userData.role === 'admin';
        const isSeller = userData.isSeller === true || userData.isSeller === 'true';

        // Show/hide seller section
        if (sellerSection) {
            sellerSection.style.display = (isSeller || isAdmin) ? 'block' : 'none';
        }

        // Show/hide admin section
        if (adminSection) {
            adminSection.style.display = isAdmin ? 'block' : 'none';
        }

        // Update sign in/out link
        if (signLink && signText) {
            signLink.href = '#';
            signText.textContent = 'Sign Out';
            
            // Remove existing click handler properly
            const newSignLink = signLink.cloneNode(true);
            const logoutHandler = function(e) {
                e.preventDefault();
                if (window.authManager) {
                    window.authManager.logout();
                } else {
                    // Fallback
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    window.location.href = '/login';
                }
            };
            newSignLink.addEventListener('click', logoutHandler);
            signLink.parentNode.replaceChild(newSignLink, signLink);
            
            // Store for cleanup
            eventListeners.push({ element: newSignLink, handler: logoutHandler });
        }
    }

    function updateMenuUIFromStorage() {
        // Fallback function using localStorage (for when API fails)
        const isAdmin = localStorage.getItem('isAdmin') === 'true';
        const isSeller = localStorage.getItem('isSeller') === 'true';
        const userRole = localStorage.getItem('userRole');

        const sellerSection = document.getElementById('mobile-seller-section');
        const adminSection = document.getElementById('mobile-admin-section');
        const signLink = document.getElementById('mobile-menu-sign-link');
        const signText = document.getElementById('mobile-menu-sign-text');

        // Show/hide seller section
        if (sellerSection) {
            sellerSection.style.display = (isSeller || isAdmin) ? 'block' : 'none';
        }

        // Show/hide admin section
        if (adminSection) {
            adminSection.style.display = isAdmin ? 'block' : 'none';
        }

        // Update sign in/out link
        if (signLink && signText) {
            const token = localStorage.getItem('token');
            if (token) {
                signLink.href = '#';
                signText.textContent = 'Sign Out';
                
                // Remove existing click handler properly
                const newSignLink = signLink.cloneNode(true);
                const logoutHandler = function(e) {
                    e.preventDefault();
                    if (window.authManager) {
                        window.authManager.logout();
                    } else {
                        // Fallback
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                    }
                };
                newSignLink.addEventListener('click', logoutHandler);
                signLink.parentNode.replaceChild(newSignLink, signLink);
                
                // Store for cleanup
                eventListeners.push({ element: newSignLink, handler: logoutHandler });
            }
        }
    }

    // Cleanup function for event listeners
    function cleanupEventListeners() {
        eventListeners.forEach(({ element, handler }) => {
            element.removeEventListener('click', handler);
        });
        eventListeners.length = 0;
    }

    // Run injection before user UI updates
    injectStandardMenuSections();
    updateUserMenuSections();

    // Listen for storage changes (when user logs in/out)
    window.addEventListener('storage', updateUserMenuSections);
    window.addEventListener('userLoggedIn', updateUserMenuSections);
    window.addEventListener('userLoggedOut', updateUserMenuSections);
});
