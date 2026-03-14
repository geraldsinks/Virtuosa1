// Dashboard Mobile Header JavaScript
// Handles dashboard-specific mobile functionality

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboardMobileHeader();
});

function initializeDashboardMobileHeader() {
    // Dashboard Menu Elements
    const dashboardMenuToggle = document.getElementById('dashboard-menu-toggle');
    
    // User Greeting
    const dashboardUserGreeting = document.getElementById('dashboard-user-greeting');
    
    // Badge Elements
    const messageBadge = document.querySelector('.message-badge');
    const notificationBadge = document.querySelector('.notification-badge');
    const cartBadge = document.querySelector('.cart-badge');
    
    // Initialize Dashboard Menu
    if (dashboardMenuToggle) {
        dashboardMenuToggle.addEventListener('click', toggleDashboardMenu);
    }
    
    // Update User Greeting
    updateDashboardUserGreeting();
    
    // Update Badges
    updateDashboardBadges();
    
    // Handle Authentication State
    updateDashboardAuthState();
}

// Dashboard Menu Functions
function toggleDashboardMenu() {
    // Reuse the existing mobile menu overlay from the main site
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    
    if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        // If mobile menu overlay doesn't exist, create a simple dashboard menu
        createDashboardMenu();
    }
}

function createDashboardMenu() {
    // Create dashboard-specific menu if main mobile menu doesn't exist
    const menuHtml = `
        <div id="dashboard-menu-overlay" class="fixed inset-0 bg-black bg-opacity-90 z-50 flex">
            <div class="bg-navy w-80 h-full overflow-y-auto">
                <div class="p-4 border-b border-gray-700">
                    <div class="flex items-center justify-between">
                        <h2 class="text-xl font-bold text-gold">Dashboard Menu</h2>
                        <button onclick="closeDashboardMenu()" class="text-white hover:text-gold">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                </div>
                <nav class="p-4">
                    <div class="space-y-2">
                        <a href="/pages/profile.html" class="block px-4 py-3 text-white hover:bg-gray-800 rounded">
                            <i class="fas fa-user mr-3"></i>My Profile
                        </a>
                        <a href="/pages/transactions.html" class="block px-4 py-3 text-white hover:bg-gray-800 rounded">
                            <i class="fas fa-exchange-alt mr-3"></i>Transactions
                        </a>
                        <a href="/pages/reviews.html" class="block px-4 py-3 text-white hover:bg-gray-800 rounded">
                            <i class="fas fa-star mr-3"></i>My Reviews
                        </a>
                        <a href="/pages/messages.html" class="block px-4 py-3 text-white hover:bg-gray-800 rounded">
                            <i class="fas fa-envelope mr-3"></i>Messages
                        </a>
                        <a href="/pages/notifications.html" class="block px-4 py-3 text-white hover:bg-gray-800 rounded">
                            <i class="fas fa-bell mr-3"></i>Notifications
                        </a>
                        <div class="border-t border-gray-700 my-4"></div>
                        <a href="/index.html" class="block px-4 py-3 text-white hover:bg-gray-800 rounded">
                            <i class="fas fa-home mr-3"></i>Back to Home
                        </a>
                        <button onclick="logout()" class="w-full text-left px-4 py-3 text-white hover:bg-gray-800 rounded">
                            <i class="fas fa-sign-out-alt mr-3"></i>Log Out
                        </button>
                    </div>
                </nav>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', menuHtml);
}

function closeDashboardMenu() {
    const dashboardMenuOverlay = document.getElementById('dashboard-menu-overlay');
    const mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    
    if (mobileMenuOverlay) {
        mobileMenuOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    if (dashboardMenuOverlay) {
        dashboardMenuOverlay.remove();
        document.body.style.overflow = '';
    }
}

// User Greeting Functions
function updateDashboardUserGreeting() {
    const dashboardUserGreeting = document.getElementById('dashboard-user-greeting');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (dashboardUserGreeting) {
        if (user.fullName) {
            // Show full name if space allows (480px+)
            if (window.innerWidth >= 480) {
                dashboardUserGreeting.textContent = user.fullName.split(' ')[0]; // First name only
            } else {
                dashboardUserGreeting.textContent = 'Hi!'; // Minimal greeting on small screens
            }
        } else if (user.email) {
            const emailPrefix = user.email.split('@')[0];
            dashboardUserGreeting.textContent = emailPrefix.length > 10 
                ? emailPrefix.substring(0, 10) + '...' 
                : emailPrefix;
        } else {
            dashboardUserGreeting.textContent = 'Welcome!';
        }
    }
}

// Badge Update Functions
function updateDashboardBadges() {
    // Update message badge
    const messageBadge = document.querySelector('.message-badge');
    if (messageBadge) {
        const messageCount = Math.floor(Math.random() * 5); // Replace with actual count
        messageBadge.textContent = messageCount;
        messageBadge.style.display = messageCount > 0 ? 'flex' : 'none';
    }
    
    // Update notification badge
    const notificationBadge = document.querySelector('.notification-badge');
    if (notificationBadge) {
        const notificationCount = Math.floor(Math.random() * 10); // Replace with actual count
        notificationBadge.textContent = notificationCount;
        notificationBadge.style.display = notificationCount > 0 ? 'flex' : 'none';
    }
    
    // Update cart badge (only on buyer dashboard)
    const cartBadge = document.querySelector('.cart-badge');
    if (cartBadge) {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const itemCount = cart.reduce((total, item) => total + (item.quantity || 1), 0);
        cartBadge.textContent = itemCount;
        cartBadge.style.display = itemCount > 0 ? 'flex' : 'none';
    }
}

// Authentication State Functions
function updateDashboardAuthState() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!token) {
        // Redirect to login if not authenticated
        window.location.href = '/pages/login.html';
        return;
    }
    
    // Update user-specific elements
    updateDashboardUserGreeting();
    
    // Show/hide seller-specific elements
    if (user.isSeller) {
        const sellerElements = document.querySelectorAll('.seller-only');
        sellerElements.forEach(el => el.style.display = 'block');
    }
    
    // Show/hide admin-specific elements
    if (user.isAdmin) {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(el => el.style.display = 'block');
    }
}

// Logout Function
async function logout() {
    try {
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userFullName');
            window.location.href = '/pages/login.html';
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Force logout even on error
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/pages/login.html';
    }
}

// Responsive Behavior
function handleDashboardResponsive() {
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            updateDashboardUserGreeting();
            closeDashboardMenu(); // Close menu on resize
        }, 250);
    });
}

// Initialize responsive behavior
handleDashboardResponsive();

// Export functions for global access
window.closeDashboardMenu = closeDashboardMenu;
window.updateDashboardBadges = updateDashboardBadges;
window.updateDashboardAuthState = updateDashboardAuthState;

// Listen for authentication changes
window.addEventListener('authStateChanged', updateDashboardAuthState);

// Listen for cart updates (buyer dashboard only)
window.addEventListener('cartUpdated', updateDashboardBadges);
