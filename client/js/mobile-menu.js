1// Mobile Menu Functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const mobileMenuContent = document.querySelector('.mobile-menu-content');

    // Open mobile menu
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            if (mobileMenuOverlay) mobileMenuOverlay.classList.add('active');
            if (mobileMenuContent) mobileMenuContent.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevent background scrolling
        });
    }

    // Close mobile menu
    function closeMobileMenu() {
        if (mobileMenuOverlay) mobileMenuOverlay.classList.remove('active');
        if (mobileMenuContent) mobileMenuContent.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', closeMobileMenu);
    }

    // Close mobile menu when clicking overlay
    if (mobileMenuOverlay) {
        mobileMenuOverlay.addEventListener('click', closeMobileMenu);
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (mobileMenuContent && !mobileMenuContent.contains(event.target) && 
            mobileMenuToggle && !mobileMenuToggle.contains(event.target)) {
            closeMobileMenu();
        }
    });

    // Handle user role-based menu sections
    function updateUserMenuSections() {
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
                signLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    localStorage.clear();
                    window.location.href = 'login.html';
                });
            }
        }
    }

    // Initialize menu sections
    updateUserMenuSections();

    // Listen for storage changes (when user logs in/out)
    window.addEventListener('storage', updateUserMenuSections);
    window.addEventListener('userLoggedIn', updateUserMenuSections);
    window.addEventListener('userLoggedOut', updateUserMenuSections);
});
