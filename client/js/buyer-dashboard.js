// Buyer Dashboard JavaScript
// API_BASE is provided by config.js
// Helper function to fix URLs to point to server
function fixServerUrl(url) {
    if (!url) return url;
    return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

// Make the helper function globally available
window.fixServerUrl = fixServerUrl;

// Use window object to avoid global conflicts
window.currentDisputeId = null;
let spendingChartInst = null; // Store chart instance

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        if (window.router) {
            window.router.navigate('/login.html');
        } else {
            window.location.href = '/login.html';
        }
        return;
    }

    console.log('🚀 Buyer dashboard loading...');

    // Check dashboard access using role manager
    if (window.roleManager) {
        try {
            console.log('🔐 Initializing role manager...');
            await window.roleManager.initialize();
            console.log('✅ Role manager initialized:', window.roleManager.getCurrentRole());
            
            const hasAccess = await window.roleManager.requireDashboardAccess('buyer');
            if (!hasAccess) {
                console.log('❌ No buyer dashboard access, redirecting...');
                return; // Redirect will be handled by role manager
            }
            
            // Update UI based on role after initialization
            if (window.roleManager.roleInfo) {
                updateRoleBasedUI({}, window.roleManager.roleInfo);
            }
        } catch (error) {
            console.error('❌ Dashboard access check failed:', error);
            // Fallback: try to load anyway, server will validate
        }
    } else {
        console.warn('⚠️ Role manager not available');
    }

    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Load dashboard data
    loadDashboardData();
});

// Show loading states
function showLoadingStates() {
    const elements = {
        'buyer-name': 'Loading...',
        'total-orders': '...',
        'pending-orders': '...',
        'completed-orders': '...',
        'total-spent': '...',
        'cart-items-count': '...'
    };

    Object.entries(elements).forEach(([id, placeholder]) => {
        const element = document.getElementById(id);
        if (element) {
            if (id === 'buyer-token-balance') {
                element.textContent = '0';
            } else {
                element.textContent = placeholder;
            }
        }
    });
}

// Load dashboard data
async function loadDashboardData() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        if (window.router) {
            window.router.navigate('/login.html');
        } else {
            window.location.href = '/login.html';
        }
        return;
    }

    try {
        // Show loading states
        showLoadingStates();

        // Get user data first, then conditionally fetch role info
        const userResponse = await fetch(`${API_BASE}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userResponse.ok) {
            throw new Error('Failed to fetch user profile');
        }
        
        const userData = await userResponse.json();
        
        // Only fetch role info if not already available from role manager
        let roleInfo = null;
        if (window.roleManager && window.roleManager.isInitialized && window.roleManager.roleInfo) {
            roleInfo = window.roleManager.roleInfo;
            console.log('📊 Using cached role info for dashboard');
        } else {
            try {
                const roleResponse = await fetch(`${API_BASE}/user/role-info`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (roleResponse.ok) {
                    roleInfo = await roleResponse.json();
                    console.log('📊 Fetched fresh role info for dashboard');
                } else if (roleResponse.status === 401) {
                    // Authentication expired - redirect to login
                    console.warn('🚫 Authentication expired, redirecting to login');
                    localStorage.removeItem('token');
                    if (window.router) {
                        window.router.navigate('/login.html');
                    } else {
                        window.location.href = '/login.html';
                    }
                    return;
                } else if (roleResponse.status === 403) {
                    // Access forbidden - user doesn't have buyer access
                    console.warn('🚫 Access forbidden for buyer dashboard');
                    if (window.router) {
                        window.router.navigate('/pages/dashboard.html');
                    } else {
                        window.location.href = '/pages/dashboard.html';
                    }
                    return;
                } else {
                    console.warn('Role info fetch failed, using fallback');
                }
            } catch (roleError) {
                console.error('Role info fetch error:', roleError);
                // If it's a network error or other critical issue, don't continue
                if (roleError.name === 'TypeError' || roleError.message.includes('fetch')) {
                    console.error('🚫 Network error, cannot load dashboard');
                    return;
                }
                // For other errors, continue with user data only
            }
        }
        
        // Update welcome message with fresh data
        const buyerNameElement = document.getElementById('buyer-name');
        if (buyerNameElement) buyerNameElement.textContent = userData.fullName || 'Buyer';
        
        // Fetch consolidated dashboard data
        const dashboardResponse = await fetch(`${API_BASE}/buyer/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!dashboardResponse.ok) {
            throw new Error('Failed to fetch dashboard data');
        }

        const dashboardData = await dashboardResponse.json();
        console.log('📊 Consolidated dashboard data:', dashboardData);

        // Update Token Balance
        const tokenBalanceElement = document.getElementById('buyer-token-balance');
        if (tokenBalanceElement) {
            tokenBalanceElement.textContent = dashboardData.buyer?.tokenBalance || 0;
        }
        
        // Update role-based UI elements
        updateRoleBasedUI(userData, roleInfo);
        
        // Populate dashboard sections using consolidated data
        loadOrders(dashboardData.recentOrders || [], dashboardData.orderStats || {});
        displayRecommendations(dashboardData.recommendations || []);
        createSpendingChart(dashboardData.spendingHistory || { labels: [], values: [] });
        
        // Update cart count
        updateCartCount();

    } catch (error) {
        console.error('Dashboard loading error:', error);
        // Show error state
        const errorElements = ['buyer-name', 'total-orders', 'pending-orders', 'completed-orders', 'total-spent', 'buyer-token-balance'];
        errorElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'buyer-token-balance') element.textContent = '0';
                else element.textContent = 'Error';
            }
        });
    }
}

// Update UI based on user role
function updateRoleBasedUI(userData, roleInfo) {
    console.log('🎭 Updating role-based UI:', { userData, roleInfo });
    
    // Update navigation
    const sellerSection = document.getElementById('seller-section');
    const mobileSellerSection = document.getElementById('mobile-seller-section');
    const becomeSellerLink = document.getElementById('become-seller-link');
    
    // Get role elements
    const sellerActionCard = document.getElementById('seller-action-card');
    const sellerActionTitle = document.getElementById('seller-action-title');
    const sellerActionDescription = document.getElementById('seller-action-description');
    const sellerActionIcon = document.getElementById('seller-action-icon');
    
    const adminActionCard = document.getElementById('admin-action-card');
    const adminActionTitle = document.getElementById('admin-action-title');
    const adminActionDescription = document.getElementById('admin-action-description');
    const adminActionIcon = document.getElementById('admin-action-icon');
    
    // Mobile menu elements
    const mobileSellerLink = document.getElementById('mobile-seller-link');
    const mobileSellerIcon = document.getElementById('mobile-seller-icon');
    const mobileSellerText = document.getElementById('mobile-seller-text');
    
    // Check if user is seller (from roleInfo or fallback to userData)
    const isSeller = roleInfo ? roleInfo.isSeller : (userData.isSeller === true || userData.isSeller === 'true');
    const isAdmin = userData.isAdmin === true || userData.isAdmin === 'true' || userData.role === 'admin';
    
    if (isAdmin) {
        console.log('🔧 User is admin, showing admin sections');
        
        // Update admin action card
        if (adminActionCard) {
            adminActionCard.style.display = 'block';
            adminActionCard.href = '/pages/admin-dashboard.html';
        }
        if (adminActionTitle) adminActionTitle.textContent = 'Admin Panel';
        if (adminActionDescription) adminActionDescription.textContent = 'System administration';
        if (adminActionIcon) {
            adminActionIcon.innerHTML = '<i data-lucide="shield" class="w-6 h-6 text-red-600"></i>';
        }
        
        // Update seller action card for admin (also has seller privileges)
        if (sellerActionCard) {
            sellerActionCard.style.display = 'block';
            sellerActionCard.href = '/pages/seller-dashboard.html';
        }
        if (sellerActionTitle) sellerActionTitle.textContent = 'Seller Panel';
        if (sellerActionDescription) sellerActionDescription.textContent = 'Manage your store';
        if (sellerActionIcon) {
            sellerActionIcon.innerHTML = '<i data-lucide="store" class="w-6 h-6 text-gold"></i>';
        }
        
        // Update mobile menu
        if (mobileSellerLink) {
            mobileSellerLink.href = '/pages/seller-dashboard.html';
            mobileSellerText.textContent = 'Seller Dashboard';
            mobileSellerIcon.className = 'fas fa-tachometer-alt';
        }
        
        // Show admin sections
        const mobileAdminSection = document.getElementById('mobile-admin-section');
        if (mobileAdminSection) {
            mobileAdminSection.style.display = 'block';
        }
        
    } else if (isSeller) {
        console.log('✅ User is seller, showing seller sections');
        
        // Update seller action card
        if (sellerActionCard) {
            sellerActionCard.style.display = 'block';
            sellerActionCard.href = '/pages/seller-dashboard.html';
        }
        if (sellerActionTitle) sellerActionTitle.textContent = 'Seller Dashboard';
        if (sellerActionDescription) sellerActionDescription.textContent = 'Manage your store';
        if (sellerActionIcon) {
            sellerActionIcon.innerHTML = '<i data-lucide="store" class="w-6 h-6 text-gold"></i>';
        }
        
        // Hide admin card for regular sellers
        if (adminActionCard) {
            adminActionCard.style.display = 'none';
        }
        
        // Update mobile menu
        if (mobileSellerLink) {
            mobileSellerLink.href = '/pages/seller-dashboard.html';
            mobileSellerText.textContent = 'Seller Dashboard';
            mobileSellerIcon.className = 'fas fa-tachometer-alt';
        }
        
        if (sellerSection) sellerSection.style.display = 'block';
        if (mobileSellerSection) mobileSellerSection.style.display = 'block';
        
    } else {
        console.log('❌ User is not seller, hiding seller sections');
        
        // Show "become a seller" for non-sellers
        if (sellerActionCard) {
            sellerActionCard.style.display = 'block';
            sellerActionCard.href = '/pages/seller.html';
        }
        if (sellerActionTitle) sellerActionTitle.textContent = 'Become a Seller';
        if (sellerActionDescription) sellerActionDescription.textContent = 'Start selling';
        if (sellerActionIcon) {
            sellerActionIcon.innerHTML = '<i data-lucide="plus-circle" class="w-6 h-6 text-gold"></i>';
        }
        
        // Update mobile menu
        if (mobileSellerLink) {
            mobileSellerLink.href = '/pages/seller.html';
            mobileSellerText.textContent = 'Become a Seller';
            mobileSellerIcon.className = 'fas fa-store';
        }
        
        if (sellerSection) sellerSection.style.display = 'none';
        if (mobileSellerSection) mobileSellerSection.style.display = 'none';
        
        // Hide admin card
        if (adminActionCard) {
            adminActionCard.style.display = 'none';
        }
        
        // Show "become a seller" link for non-sellers
        if (becomeSellerLink) becomeSellerLink.style.display = 'block';
    }
    
    // Re-initialize Lucide icons for updated elements
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Update navigation to show seller dashboard link
function updateNavigationForSeller() {
    // Update main navigation
    const sellerDashboardLink = document.querySelector('a[href="/pages/seller-dashboard.html"]');
    const buyerDashboardLink = document.querySelector('a[href="/pages/buyer-dashboard.html"]');
    
    if (sellerDashboardLink) {
        sellerDashboardLink.classList.remove('hidden');
        sellerDashboardLink.classList.add('text-blue-600', 'font-semibold');
    }
    
    // Update user dropdown dashboard link
    const dashboardDropdownLink = document.querySelector('#user-dropdown a[href*="dashboard"]');
    if (dashboardDropdownLink) {
        dashboardDropdownLink.href = '/pages/seller-dashboard.html';
        dashboardDropdownLink.textContent = 'Seller Dashboard';
    }
    
    // Update mobile navigation
    const mobileSellerLink = document.querySelector('#mobile-menu a[href="/pages/seller-dashboard.html"]');
    if (mobileSellerLink) {
        mobileSellerLink.classList.remove('hidden');
    }
}

// Load orders using provided data
function loadOrders(orders, stats) {
    try {
        console.log('📦 Processing buyer orders:', orders);
        
        // Update order counts from stats
        const totalOrders = stats.totalOrders || 0;
        const pendingOrders = stats.pendingOrders || 0;
        const completedOrders = stats.completedOrders || 0;
        const totalSpent = stats.totalSpent || 0;

        const totalEl = document.getElementById('total-orders');
        const pendingEl = document.getElementById('pending-orders');
        const completedEl = document.getElementById('completed-orders');
        const spentEl = document.getElementById('total-spent');

        if (totalEl) totalEl.textContent = totalOrders;
        if (pendingEl) pendingEl.textContent = pendingOrders;
        if (completedEl) completedEl.textContent = completedOrders;
        if (spentEl) spentEl.textContent = `ZMW ${totalSpent.toLocaleString()}`;
        
        // Load recent orders list
        loadRecentOrders(orders);
        
    } catch (error) {
        console.error('Error processing orders:', error);
    }
}

// Load recent orders
function loadRecentOrders(orders) {
    const recentOrdersContainer = document.getElementById('recent-orders');
    if (!recentOrdersContainer) return;

    const recentOrders = orders.slice(0, 5); // Show last 5 orders
    
    if (recentOrders.length === 0) {
        recentOrdersContainer.innerHTML = '<p class="text-gray-500">No recent orders</p>';
        return;
    }

    recentOrdersContainer.innerHTML = recentOrders.map(order => {
        const productName = (order.product && order.product.name) ? order.product.name : (order.productName || 'Product');
        const price = order.amount || order.totalAmount || order.price || 0;
        const status = (order.status || 'pending').toLowerCase();
        
        return `
        <div class="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50/50 rounded-r-lg mb-2 activity-item">
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-semibold text-navy">${productName}</p>
                    <p class="text-xs text-gray-500">Order #${order._id.toString().slice(-8).toUpperCase()}</p>
                    <p class="text-xs text-gray-400">${new Date(order.createdAt).toLocaleDateString()}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-navy text-sm">ZMW ${price.toLocaleString()}</p>
                    <span class="inline-block px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                        status === 'completed' ? 'bg-green-100 text-green-700' :
                        status === 'pending' || status.includes('pending') ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                    }">
                        ${status.replace(/_/g, ' ')}
                    </span>
                </div>
            </div>
        </div>
    `}).join('');
}

// Legacy function kept for compatibility, now calls refresh
async function loadRecommendations() {
    // This function is kept for pages that might call it independently
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/products/recommendations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const recommendations = await response.json();
            displayRecommendations(recommendations);
        }
    } catch (e) { console.error(e); }
}

// Display recommendations
function displayRecommendations(recommendations) {
    const container = document.getElementById('recommendations');
    if (!container) return;

    if (!recommendations || recommendations.length === 0) {
        container.innerHTML = '<p class="text-gray-500">No recommendations available</p>';
        return;
    }

    container.innerHTML = recommendations.map(product => {
        const productImg = (product.images && product.images.length > 0) ? fixServerUrl(product.images[0]) : 'https://placehold.co/300x200?text=No+Image';
        return `
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <img src="${productImg}" alt="${product.name}" class="w-full h-40 object-cover">
            <div class="p-3">
                <h3 class="font-semibold text-navy text-sm mb-1 truncate">${product.name}</h3>
                <div class="flex justify-between items-center">
                    <span class="text-gold font-bold text-sm">ZMW ${product.price}</span>
                    <button onclick="addToCart('${product._id}')" class="text-blue-600 hover:text-blue-800 p-1">
                        <i class="fas fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `}).join('');
    
    // Set fixed height for grid if needed or keep scrollable
}

// Legacy function kept for compatibility
async function loadSpendingChart() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/buyer/spending-chart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const spendingData = await response.json();
            createSpendingChart(spendingData);
        }
    } catch (e) { console.error(e); }
}

// Create spending chart
function createSpendingChart(data) {
    const canvas = document.getElementById('spending-chart-canvas');
    if (!canvas) return;

    // Check if Chart.js is available
    if (typeof Chart === 'undefined') {
        console.error('Chart.js not available for spending chart');
        const container = canvas.parentElement;
        if (container) {
            container.innerHTML = '<p class="text-gray-500">Chart library not available</p>';
        }
        return;
    }

    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (spendingChartInst) {
        spendingChartInst.destroy();
    }
    
    spendingChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || [],
            datasets: [{
                label: 'Spending',
                data: data.values || [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '$' + value;
                        }
                    }
                }
            }
        }
    });
}

// Add to cart function
async function addToCart(productId) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ productId, quantity: 1 })
        });

        if (!response.ok) throw new Error('Failed to add to cart');
        
        // Update cart count
        updateCartCount();
        
        // Show success message
        showNotification('Product added to cart!', 'success');
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add to cart', 'error');
    }
}

// Update cart count
async function updateCartCount() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const cart = await response.json();
            const count = cart.items ? cart.items.length : 0;
            const countElement = document.getElementById('cart-items-count');
            if (countElement) {
                countElement.textContent = count;
            }
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500 text-white' :
        type === 'error' ? 'bg-red-500 text-white' :
        'bg-blue-500 text-white'
    }`;
    notification.textContent = message;

    // Add to page
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}
