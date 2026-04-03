1// Mobile Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const mobileMenuContent = document.getElementById('mobile-menu-content');

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

    // Initialize menu sections
    updateUserMenuSections();

    // Listen for storage changes (when user logs in/out)
    window.addEventListener('storage', updateUserMenuSections);
    window.addEventListener('userLoggedIn', updateUserMenuSections);
    window.addEventListener('userLoggedOut', updateUserMenuSections);
});
