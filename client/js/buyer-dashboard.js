// Buyer Dashboard JavaScript
// API_BASE is provided by config.js
// Helper function to fix URLs to point to server
function fixServerUrl(url) {
    if (!url) return url;
    return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

// Make the helper function globally available
window.fixServerUrl = fixServerUrl;

let currentDisputeId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Initialize user menu
    initializeUserMenu(token);

    // Load dashboard data
    await loadDashboardData();
});

// Initialize user menu
function initializeUserMenu(token) {
    // Show user menu and hide login link
    const userMenu = document.getElementById('user-menu');
    const loginLink = document.getElementById('login-link');
    
    if (userMenu) {
        userMenu.classList.remove('hidden');
    }
    
    if (loginLink) {
        loginLink.classList.add('hidden');
    }
}

// Toggle user menu dropdown
window.toggleUserMenu = function() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('hidden');
    }
};

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const userMenu = document.getElementById('user-menu');
    const dropdown = document.getElementById('user-dropdown');
    
    if (userMenu && dropdown && !userMenu.contains(event.target)) {
        dropdown.classList.add('hidden');
    }
});

// Logout function
window.logout = function() {
    if (window.authManager) {
        window.authManager.logout();
    } else {
        // Fallback
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
    }
};

async function loadDashboardData() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/login';
        return;
    }

    try {
        // Show loading states
        showLoadingStates();

        // Get user data directly instead of relying on authManager
        const userResponse = await fetch(`${API_BASE}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!userResponse.ok) {
            throw new Error('Failed to get user profile');
        }
        
        const userData = await userResponse.json();
        
        // Update welcome message with fresh data
        document.getElementById('buyer-name').textContent = userData.fullName || 'Buyer';
        
        // Update token balance display
        const tokenBalanceElement = document.getElementById('buyer-token-balance');
        if (tokenBalanceElement) {
            tokenBalanceElement.textContent = userData.tokenBalance || 0;
        }
        
        // Update user greeting in header
        const userGreeting = document.getElementById('user-greeting');
        if (userGreeting) {
            userGreeting.textContent = userData.fullName || 'User';
        }

        // Check user roles and update UI accordingly
        updateRoleBasedUI(userData);

        // Load dashboard statistics
        await Promise.all([
            loadOrderStats(),
            loadRecentOrders(),
            loadRecommendations(),
            loadSpendingChart()
        ]);

    } catch (error) {
        console.error('Dashboard loading error:', error);
        showErrorState();
    }
}

// Update UI based on user roles
function updateRoleBasedUI(userData) {
    // Show/hide seller section in mobile menu
    const mobileSellerSection = document.getElementById('mobile-seller-section');
    const mobileAdminSection = document.getElementById('mobile-admin-section');
    const desktopSellerLink = document.getElementById('desktop-seller-link');
    const desktopAdminLink = document.getElementById('desktop-admin-link');
    const dropdownSellerLink = document.getElementById('dropdown-seller-link');
    const dropdownAdminLink = document.getElementById('dropdown-admin-link');
    
    // Reset visibility
    if (mobileSellerSection) mobileSellerSection.style.display = 'none';
    if (mobileAdminSection) mobileAdminSection.style.display = 'none';
    if (desktopSellerLink) desktopSellerLink.style.display = 'none';
    if (desktopAdminLink) desktopAdminLink.style.display = 'none';
    if (dropdownSellerLink) dropdownSellerLink.classList.add('hidden');
    if (dropdownAdminLink) dropdownAdminLink.classList.add('hidden');
    
    // Show seller section if user is a seller
    if (userData.isSeller) {
        if (mobileSellerSection) {
            mobileSellerSection.style.display = 'block';
        }

        if (desktopSellerLink) {
            desktopSellerLink.style.display = 'flex';
        }

        if (dropdownSellerLink) {
            dropdownSellerLink.classList.remove('hidden');
        }

        // Update "Become a Seller" card to "Seller Dashboard"
        const sellerCards = document.querySelectorAll('a.quick-action-card[href^="/pages/seller"]');
        sellerCards.forEach(card => {
            card.href = '/pages/seller-dashboard.html';
            const title = card.querySelector('h3');
            const subtitle = card.querySelector('p');
            if (title) title.textContent = 'Seller Dashboard';
            if (subtitle) subtitle.textContent = 'Manage your store';

            // Update icon style if present
            const iconContainer = card.querySelector('.bg-gold\/20, .bg-gold\\/20');
            if (iconContainer) {
                iconContainer.className = 'bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4';
                const icon = iconContainer.querySelector('i');
                if (icon) {
                    icon.setAttribute('data-lucide', 'store');
                    icon.className = 'w-6 h-6 text-green-600';
                }
            }
        });

        // Update mobile dropdown link text
        const mobileBecomeSellerLink = document.querySelector('#mobile-menu-overlay + .mobile-menu-content a[href="seller.html"]');
        if (mobileBecomeSellerLink) {
            mobileBecomeSellerLink.href = 'seller-dashboard.html';
            const spanElement = mobileBecomeSellerLink.querySelector('span');
            if (spanElement) {
                spanElement.textContent = 'Seller Dashboard';
            }
        }

        const menuSellerLink = document.querySelector('a[href="seller-dashboard.html"]');
        if (menuSellerLink && menuSellerLink.textContent.trim().includes('Become a Seller')) {
            menuSellerLink.textContent = 'Seller Dashboard';
        }
    }
    
    // Show admin section if user is an admin
    const isAdmin = userData.isAdmin === true || userData.isAdmin === 'true' || userData.role === 'admin' || userData.email === 'admin@virtuosa.com';
    if (isAdmin) {
        if (mobileAdminSection) {
            mobileAdminSection.style.display = 'block';
        }
        
        if (desktopAdminLink) {
            desktopAdminLink.style.display = 'flex';
        }
        
        if (dropdownAdminLink) {
            dropdownAdminLink.classList.remove('hidden');
        }
    }
    
    // Re-initialize Lucide icons if they were updated
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

async function loadOrderStats() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE}/buyer/dashboard`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update stat cards with animation
            animateNumber('active-orders', data.stats?.pendingOrders || 0);
            animateNumber('completed-orders', data.stats?.completedOrders || 0);
            animateNumber('total-spent', data.stats?.totalSpent || 0);
        } else {
            throw new Error('Failed to load order statistics');
        }
    } catch (error) {
        console.error('Order stats loading error:', error);
        // Set default values on error
        animateNumber('active-orders', 0);
        animateNumber('completed-orders', 0);
        animateNumber('total-spent', 0);
    }
}

async function loadRecentOrders() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE}/transactions?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const orders = data.transactions || [];
            const container = document.getElementById('recent-orders');
            
            if (orders.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i data-lucide="package" class="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                        <p>No recent orders</p>
                        <a href="/pages/products.html" class="text-gold hover:underline mt-2 inline-block">Start Shopping</a>
                    </div>
                `;
            } else {
                container.innerHTML = orders.map(order => createOrderHTML(order)).join('');
            }
        } else {
            throw new Error('Failed to load orders');
        }
    } catch (error) {
        console.error('Error loading recent orders:', error);
        document.getElementById('recent-orders').innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-4"></i>
                <p>Unable to load recent orders</p>
            </div>
        `;
    } finally {
        // Re-initialize Lucide icons for dynamic content
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
}

function createOrderHTML(order) {
    const statusColors = {
        'Pending': 'text-yellow-600 bg-yellow-50',
        'Confirmed': 'text-blue-600 bg-blue-50',
        'Shipped': 'text-purple-600 bg-purple-50',
        'Completed': 'text-green-600 bg-green-50',
        'Cancelled': 'text-red-600 bg-red-50'
    };

    const statusColor = statusColors[order.status] || 'text-gray-600 bg-gray-50';
    const orderDate = new Date(order.createdAt).toLocaleDateString();

    return `
        <div class="activity-item border-l-4 border-l-gray-300 pl-4 hover:bg-gray-50 rounded-r-lg p-4 cursor-pointer" onclick="window.location.href='/pages/transactions.html'">
            <div class="flex items-center justify-between">
                <div class="flex-grow">
                    <div class="flex items-center mb-2">
                        <img src="${fixServerUrl(order.product?.images?.[0]) || 'https://placehold.co/60x60?text=Product'}" 
                             alt="${order.product?.name || 'Product'}" 
                             class="w-12 h-12 rounded-lg object-cover mr-3">
                        <div>
                            <h4 class="font-semibold text-navy">${order.product?.name || 'Product'}</h4>
                            <p class="text-sm text-gray-500">Order #${order._id?.slice(-6) || 'Unknown'}</p>
                        </div>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-xs text-gray-500">${orderDate}</span>
                        <span class="text-xs px-2 py-1 rounded-full font-medium ${statusColor}">${order.status}</span>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-navy">ZMW ${(order.totalAmount || 0).toLocaleString()}</p>
                    <p class="text-sm text-gray-500">${order.quantity || 1} item${order.quantity > 1 ? 's' : ''}</p>
                </div>
            </div>
        </div>
    `;
}

async function loadRecommendations() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/products', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const products = data.products || [];
            const container = document.getElementById('recommendations');
            
            if (products.length === 0) {
                container.innerHTML = `
                    <div class="text-center py-8 text-gray-500">
                        <i data-lucide="search" class="w-12 h-12 mx-auto mb-4 text-gray-300"></i>
                        <p class="text-sm">No recommendations yet</p>
                        <p class="text-xs text-gray-400 mt-2">Start browsing to get personalized suggestions</p>
                    </div>
                `;
            } else {
                // Show first 3 products as recommendations
                container.innerHTML = products.slice(0, 3).map(product => createRecommendationHTML(product)).join('');
            }
        }
    } catch (error) {
        console.error('Error loading recommendations:', error);
        document.getElementById('recommendations').innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <i data-lucide="alert-circle" class="w-12 h-12 mx-auto mb-4"></i>
                <p class="text-sm">Unable to load recommendations</p>
            </div>
        `;
    } finally {
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
}

function createRecommendationHTML(product) {
    return `
        <div class="border border-gray-200 rounded-lg p-3 hover:border-gold transition-colors cursor-pointer" onclick="window.location.href='/product/${product._id}'">
            <div class="flex items-center">
                <img src="${fixServerUrl(product.images?.[0]) || 'https://placehold.co/60x60?text=Product'}" 
                     alt="${product.name}" 
                     class="w-16 h-16 rounded-lg object-cover mr-3">
                <div class="flex-grow min-w-0">
                    <h4 class="font-medium text-navy text-sm truncate">${product.name}</h4>
                    <p class="text-xs text-gray-500">${product.category}</p>
                    <p class="text-sm font-bold text-gold">ZMW ${product.price.toLocaleString()}</p>
                </div>
            </div>
        </div>
    `;
}

async function loadSpendingChart() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_BASE}/transactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const transactions = data.transactions || [];
            
            // Prepare chart data from transactions
            const spendingByMonth = {};
            const last6Months = [];
            
            // Generate last 6 months
            for (let i = 5; i >= 0; i--) {
                const date = new Date();
                date.setMonth(date.getMonth() - i);
                const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                last6Months.push(monthName);
                spendingByMonth[monthName] = 0;
            }
            
            // Calculate spending for each month
            transactions.forEach(transaction => {
                if (transaction.status === 'Completed' && transaction.totalAmount) {
                    const transactionDate = new Date(transaction.createdAt);
                    const monthName = transactionDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    if (spendingByMonth.hasOwnProperty(monthName)) {
                        spendingByMonth[monthName] += transaction.totalAmount;
                    }
                }
            });
            
            const chartData = {
                labels: last6Months,
                values: last6Months.map(month => spendingByMonth[month] || 0)
            };
            
            createSpendingChart(chartData);
        }
    } catch (error) {
        console.error('Error loading spending chart:', error);
        // Show empty chart
        const ctx = document.getElementById('spending-chart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['No data available'],
                datasets: [{
                    label: 'Spending',
                    data: [0],
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
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
                }
            }
        });
    }
}

function createSpendingChart(data) {
    const ctx = document.getElementById('spending-chart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.labels || ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Monthly Spending',
                data: data.values || [0, 0, 0, 0, 0, 0],
                borderColor: '#FFD700',
                backgroundColor: 'rgba(255, 215, 0, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#FFD700',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 6,
                pointHoverRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 17, 40, 0.8)',
                    titleColor: '#FFD700',
                    bodyColor: '#fff',
                    borderColor: '#FFD700',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return `Spending: ZMW ${context.parsed.y.toLocaleString()}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return 'ZMW ' + value.toLocaleString();
                        }
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.1)'
                    }
                },
                x: {
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function showLoadingStates() {
    // Keep initial loading states for recent orders and recommendations
    // Stats will show their skeleton loading animation via CSS
}

function showErrorState() {
    const container = document.querySelector('.container .grid');
    if (container) {
        // Clear existing content safely
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        
        // Create error elements safely
        const errorDiv = document.createElement('div');
        errorDiv.className = 'col-span-full text-center py-16';
        
        const icon = document.createElement('i');
        icon.setAttribute('data-lucide', 'alert-circle');
        icon.className = 'w-16 h-16 mx-auto mb-4 text-red-500';
        
        const title = document.createElement('h2');
        title.className = 'text-2xl font-bold text-gray-900 mb-2';
        title.textContent = 'Dashboard Error';
        
        const message = document.createElement('p');
        message.className = 'text-gray-600 mb-6';
        message.textContent = 'Unable to load your dashboard. Please try again later.';
        
        const button = document.createElement('button');
        button.className = 'bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition';
        button.onclick = () => location.reload();
        
        const buttonIcon = document.createElement('i');
        buttonIcon.setAttribute('data-lucide', 'refresh-cw');
        buttonIcon.className = 'w-4 h-4 mr-2';
        
        const buttonText = document.createTextNode('Try Again');
        
        button.appendChild(buttonIcon);
        button.appendChild(buttonText);
        errorDiv.appendChild(icon);
        errorDiv.appendChild(title);
        errorDiv.appendChild(message);
        errorDiv.appendChild(button);
        container.appendChild(errorDiv);
        
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }
}

function animateNumber(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;

    const isNumeric = typeof targetValue === 'number' || /^\d+$/.test(targetValue.replace(/[^\d]/g, ''));
    const finalValue = isNumeric ? (typeof targetValue === 'number' ? targetValue : parseInt(targetValue.replace(/[^\d]/g, ''))) : targetValue;
    
    // Simple animation for numbers
    let currentValue = 0;
    const increment = finalValue / 20;
    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= finalValue) {
            currentValue = finalValue;
            clearInterval(timer);
        }
        
        if (isNumeric) {
            element.textContent = Math.floor(currentValue).toLocaleString();
        } else {
            element.textContent = targetValue; // For formatted strings like "ZMW 1,234"
        }
    }, 50);
}

// Add some interactivity
document.addEventListener('click', (e) => {
    // Handle any dynamic content clicks
    if (e.target.closest('[onclick]')) {
        // Let the onclick handle it
    }
});

// Refresh data every 5 minutes
setInterval(() => {
    if (document.visibilityState === 'visible') {
        loadDashboardData();
    }
}, 5 * 60 * 1000);

// Show token rewards modal
window.showTokenRewards = () => {
    const modalHtml = `
        <div id="token-rewards-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-8 max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                <div class="text-center mb-6">
                    <div class="bg-gold/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-coins text-gold text-2xl"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-navy mb-2">Token Rewards Program</h2>
                    <p class="text-gray-600">Earn tokens and unlock exclusive marketplace benefits</p>
                </div>

                <div class="mb-6">
                    <h3 class="font-semibold text-navy mb-3">How to Earn Tokens:</h3>
                    <div class="space-y-2">
                        <div class="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                            <div class="flex items-center">
                                <i class="fas fa-check-circle text-green-600 mr-3"></i>
                                <span class="text-sm">Confirm Delivery</span>
                            </div>
                            <span class="bg-green-600 text-white px-2 py-1 rounded text-sm font-semibold">+5</span>
                        </div>
                        <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                            <div class="flex items-center">
                                <i class="fas fa-star text-blue-600 mr-3"></i>
                                <span class="text-sm">Write Product Review</span>
                            </div>
                            <span class="bg-blue-600 text-white px-2 py-1 rounded text-sm font-semibold">+3</span>
                        </div>
                        <div class="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                            <div class="flex items-center">
                                <i class="fas fa-camera text-purple-600 mr-3"></i>
                                <span class="text-sm">Upload Product Photo</span>
                            </div>
                            <span class="bg-purple-600 text-white px-2 py-1 rounded text-sm font-semibold">+2</span>
                        </div>
                        <div class="flex items-center justify-between p-3 bg-gold/50 rounded-lg">
                            <div class="flex items-center">
                                <i class="fas fa-calendar-check text-gold mr-3"></i>
                                <span class="text-sm">Daily Login Streak</span>
                            </div>
                            <span class="bg-gold text-navy px-2 py-1 rounded text-sm font-semibold">+1</span>
                        </div>
                    </div>
                </div>

                <div class="mb-6">
                    <h3 class="font-semibold text-navy mb-3">Redeem Your Tokens:</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div class="border border-gray-200 rounded-lg p-3 hover:border-gold transition-colors cursor-pointer">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="font-semibold text-sm">10% Discount</h4>
                                    <p class="text-xs text-gray-500">Valid for any purchase</p>
                                </div>
                                <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">25 Tokens</span>
                            </div>
                        </div>
                        <div class="border border-gray-200 rounded-lg p-3 hover:border-gold transition-colors cursor-pointer">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="font-semibold text-sm">Fast Delivery</h4>
                                    <p class="text-xs text-gray-500">Priority shipping</p>
                                </div>
                                <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">50 Tokens</span>
                            </div>
                        </div>
                        <div class="border border-gray-200 rounded-lg p-3 hover:border-gold transition-colors cursor-pointer">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="font-semibold text-sm">Premium Badge</h4>
                                    <p class="text-xs text-gray-500">Show on your profile</p>
                                </div>
                                <span class="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-semibold">100 Tokens</span>
                            </div>
                        </div>
                        <div class="border border-gray-200 rounded-lg p-3 hover:border-gold transition-colors cursor-pointer">
                            <div class="flex justify-between items-start mb-2">
                                <div>
                                    <h4 class="font-semibold text-sm">VIP Access</h4>
                                    <p class="text-xs text-gray-500">Exclusive features</p>
                                </div>
                                <span class="bg-gold/20 text-gold px-2 py-1 rounded text-xs font-semibold">200 Tokens</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="text-center">
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            class="bg-navy text-white font-semibold py-2 px-6 rounded-full hover:bg-gray-800 transition-colors">
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};
