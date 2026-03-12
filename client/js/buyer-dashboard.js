// Buyer Dashboard JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');

    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Load dashboard data
    await loadDashboardData();
});

async function loadDashboardData() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    try {
        // Show loading states
        showLoadingStates();

        // Fetch user data
        const userResponse = await fetch('/api/user/profile', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!userResponse.ok) {
            throw new Error('Failed to load user data');
        }

        const userData = await userResponse.json();
        
        // Update welcome message
        document.getElementById('buyer-name').textContent = userData.fullName || 'Buyer';

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

async function loadOrderStats() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/transactions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const transactions = data.transactions || [];
            
            // Calculate stats from transactions
            const activeOrders = transactions.filter(t => t.status === 'Pending' || t.status === 'Confirmed').length;
            const completedOrders = transactions.filter(t => t.status === 'Completed').length;
            const totalSpent = transactions
                .filter(t => t.status === 'Completed' && t.buyer._id === JSON.parse(localStorage.getItem('userId') || 'null'))
                .reduce((sum, t) => sum + (t.totalAmount || 0), 0);
            
            // Update stat cards with animation
            animateNumber('active-orders', activeOrders);
            animateNumber('completed-orders', completedOrders);
            animateNumber('total-spent', `ZMW ${totalSpent.toLocaleString()}`);
            animateNumber('saved-items', 0); // No saved items endpoint yet
        }
    } catch (error) {
        console.error('Error loading order stats:', error);
        // Set default values
        document.getElementById('active-orders').textContent = '0';
        document.getElementById('completed-orders').textContent = '0';
        document.getElementById('total-spent').textContent = 'ZMW 0';
        document.getElementById('saved-items').textContent = '0';
    }
}

async function loadRecentOrders() {
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/transactions?limit=5', {
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
                        <img src="${order.product?.images?.[0] || 'https://placehold.co/60x60?text=Product'}" 
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
        <div class="border border-gray-200 rounded-lg p-3 hover:border-gold transition-colors cursor-pointer" onclick="window.location.href='/pages/product-detail.html?id=${product._id}'">
            <div class="flex items-center">
                <img src="${product.images?.[0] || 'https://placehold.co/60x60?text=Product'}" 
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
        const response = await fetch('/api/transactions', {
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
        container.innerHTML = `
            <div class="col-span-full text-center py-16">
                <i data-lucide="alert-circle" class="w-16 h-16 mx-auto mb-4 text-red-500"></i>
                <h2 class="text-2xl font-bold text-gray-900 mb-2">Dashboard Error</h2>
                <p class="text-gray-600 mb-6">Unable to load your dashboard. Please try again later.</p>
                <button onclick="location.reload()" class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition">
                    <i data-lucide="refresh-cw" class="w-4 h-4 mr-2"></i>Try Again
                </button>
            </div>
        `;
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
