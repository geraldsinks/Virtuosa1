// Admin Dashboard JavaScript
// API_BASE is provided by config.js
window.currentDisputeId = null;
let revenueChart = null;
let userStatsChart = null;
let userRole = null;
let userPermissions = [];

// Role-based navigation configuration
const ROLE_NAVIGATION = {
    'admin': {
        // Admin - has access to everything
        cards: [
            { href: 'admin-asset-library.html', title: 'Asset Library', desc: 'Manage marketing assets and banners', icon: 'fas fa-images', color: 'blue' },
            { href: 'marketing.html', title: 'Marketing Dashboard', desc: 'Manage promotional content', icon: 'fas fa-bullhorn', color: 'green' },
            { href: 'admin-cookie-data.html', title: 'Cookie Analytics', desc: 'View cookie and tracking data', icon: 'fas fa-cookie-bite', color: 'orange' },
            { href: 'admin-seller-applications.html', title: 'Seller Requests', desc: 'Review and approve applications', icon: 'fas fa-user-check', color: 'teal' },
            { href: 'admin-mass-messaging.html', title: 'Mass Messaging', desc: 'Send announcements to users', icon: 'fas fa-bullhorn', color: 'purple' },
            { href: 'admin-retention.html', title: 'Message Retention', desc: 'Manage message data and policies', icon: 'fas fa-archive', color: 'orange' },
            { href: 'admin-account-deletions.html', title: 'Account Deletions', desc: 'Review and manage deletion requests', icon: 'fas fa-user-times', color: 'red' },
            { href: 'admin-maintenance.html', title: 'Maintenance', desc: 'Manage system maintenance', icon: 'fas fa-tools', color: 'yellow' },
            { href: 'admin-transactions.html', title: 'Transactions', desc: 'Manage transactions and escrow', icon: 'fas fa-exchange-alt', color: 'indigo' },
            { href: 'admin-disputes.html', title: 'Disputes', desc: 'Handle user disputes', icon: 'fas fa-gavel', color: 'pink' },
            { href: 'admin-support.html', title: 'Support Tickets', desc: 'Manage customer support tickets', icon: 'fas fa-headset', color: 'cyan' },
            { href: 'admin-live-chat.html', title: 'Live Chat', desc: 'Monitor live customer chat', icon: 'fas fa-comments', color: 'blue' },
            { href: 'strategic-analytics.html', title: 'Strategic Analytics', desc: 'View strategic insights', icon: 'fas fa-chart-line', color: 'gold' }
        ]
    },
    'marketing_lead': {
        cards: [
            { href: 'admin-mass-messaging.html', title: 'Mass Messaging', desc: 'Send announcements to users', icon: 'fas fa-bullhorn', color: 'purple' },
            { href: 'admin-asset-library.html', title: 'Asset Library', desc: 'Manage marketing assets and banners', icon: 'fas fa-images', color: 'blue' },
            { href: 'admin-seller-applications.html', title: 'Marketing Management', desc: 'Manage promotional content', icon: 'fas fa-bullhorn', color: 'green' },
            { href: 'admin-about.html', title: 'About Page Editor', desc: 'Edit about page content', icon: 'fas fa-edit', color: 'orange' }
        ]
    },
    'support_lead': {
        cards: [
            { href: 'admin-account-deletions.html', title: 'Account Deletions', desc: 'Review and manage deletion requests', icon: 'fas fa-user-times', color: 'red' },
            { href: 'admin-disputes.html', title: 'Disputes', desc: 'Handle user disputes', icon: 'fas fa-gavel', color: 'pink' },
            { href: 'admin-support.html', title: 'Contact Support', desc: 'Manage support tickets', icon: 'fas fa-headset', color: 'blue' },
            { href: 'admin-live-chat.html', title: 'Live Chat', desc: 'Monitor live chat', icon: 'fas fa-comments', color: 'green' }
        ]
    },
    'products_lead': {
        cards: [
            { href: 'admin-maintenance.html', title: 'Maintenance Mode', desc: 'Control system maintenance', icon: 'fas fa-tools', color: 'yellow' },
            { href: 'admin-mass-messaging.html', title: 'Mass Messaging', desc: 'Send maintenance updates', icon: 'fas fa-bullhorn', color: 'purple' },
            { href: 'admin-maintenance-reports.html', title: 'Maintenance Reports', desc: 'View maintenance analytics', icon: 'fas fa-chart-bar', color: 'blue' },
            { href: 'admin-ui-queries.html', title: 'UI/UX Queries', desc: 'Manage user interface feedback', icon: 'fas fa-palette', color: 'orange' }
        ]
    },
    'transaction_safety_lead': {
        cards: [
            { href: 'admin-transactions.html', title: 'Transaction System', desc: 'Manage transactions and escrow', icon: 'fas fa-exchange-alt', color: 'indigo' },
            { href: 'admin-disputes.html', title: 'Disputes', desc: 'Handle user disputes', icon: 'fas fa-gavel', color: 'pink' },
            { href: 'admin-transaction-reports.html', title: 'Transaction Reports', desc: 'View transaction analytics', icon: 'fas fa-chart-line', color: 'blue' },
            { href: 'admin-risk-management.html', title: 'Risk Management', desc: 'Monitor high-risk activities', icon: 'fas fa-shield-alt', color: 'red' }
        ]
    },
    'strategy_growth_lead': {
        cards: [
            { href: 'strategic-analytics.html', title: 'User Analytics', desc: 'View user behavior analytics', icon: 'fas fa-users', color: 'blue' },
            { href: 'strategic-analytics.html', title: 'Strategic Analytics', desc: 'View strategic insights', icon: 'fas fa-chart-line', color: 'gold' },
            { href: 'admin-analytics-reports.html', title: 'Analytics Reports', desc: 'Generate analytical reports', icon: 'fas fa-file-chart', color: 'green' },
            { href: 'admin-growth-metrics.html', title: 'Growth Metrics', desc: 'Monitor growth indicators', icon: 'fas fa-rocket', color: 'purple' }
        ]
    }
};

// Load role-based navigation
function loadRoleBasedNavigation() {
    const navCardsContainer = document.getElementById('admin-nav-cards');
    if (!navCardsContainer) {
        console.error('Admin nav cards container not found');
        return;
    }

    // Get role config, with fallback to admin
    let roleConfig = ROLE_NAVIGATION[userRole];
    if (!roleConfig) {
        roleConfig = ROLE_NAVIGATION['admin'];
    }
    
    const roleCards = roleConfig?.cards;
    
    // Ensure roleCards is an array
    if (!Array.isArray(roleCards)) {
        navCardsContainer.innerHTML = '<p class="text-red-500">Error loading navigation. Invalid role configuration.</p>';
        return;
    }
    
    navCardsContainer.innerHTML = roleCards.map(card => `
        <a href="${card.href}" class="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all border-l-4 border-${card.color}-500 group">
            <div class="flex items-center justify-between">
                <div>
                    <h3 class="font-semibold text-gray-900 mb-1">${card.title}</h3>
                    <p class="text-sm text-gray-600">${card.desc}</p>
                </div>
                <div class="bg-${card.color}-50 p-3 rounded-lg group-hover:scale-110 transition-transform">
                    <i class="${card.icon} text-${card.color}-600 text-xl"></i>
                </div>
            </div>
        </a>
    `).join('');
}

// Get user role information
function getUserRoleInfo() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    fetch(`${API_BASE}/admin/role-info`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                alert('Your session has expired. Please log in again.');
                window.location.href = '/login';
                return;
            }
            throw new Error('Failed to get role information');
        }
        return response.json();
    })
    .then(roleInfo => {
        userRole = roleInfo.role;
        userPermissions = roleInfo.permissions;
        
        // Update dashboard header with role information
        updateDashboardHeader(roleInfo);
        
        // Load dashboard data
        loadDashboardData();

        // Check for tab parameter in URL
        const urlParams = new URLSearchParams(window.location.search);
        const tab = urlParams.get('tab');
        if (tab) {
            setTimeout(() => showTab(tab), 100);
        }
    })
    .catch(error => {
        console.error('Failed to get role info:', error);
        // Fall back to checking admin status
        checkAdminAccess();
    });
}

// Update dashboard header with role information
function updateDashboardHeader(roleInfo) {
    const header = document.querySelector('h1');
    const subtitle = document.querySelector('p.text-gray-600');
    
    if (header && subtitle) {
        // Admin user may have CEO title for UI display
        if (roleInfo.title === 'CEO') {
            header.textContent = 'CEO (Admin) Dashboard';
            subtitle.textContent = 'Full system access granted as Admin / CEO title';
        } else if (roleInfo.role === 'admin') {
            header.textContent = 'Admin Dashboard';
            subtitle.textContent = 'Manage admin functions for the Virtuosa platform';
        } else {
            header.textContent = `${roleInfo.description} Dashboard`;
            subtitle.textContent = `Manage ${roleInfo.description.toLowerCase()} functions for the Virtuosa platform`;
        }
    }
}

// Check if user is admin (legacy function)
function checkAdminAccess() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/login';
        return;
    }

    // Verify admin status
    fetch(`${API_BASE}/user/profile`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Token expired or invalid - clear and redirect
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    alert('Your session has expired. Please log in again.');
                    window.location.href = '/login';
                    return;
                }
                throw new Error('Not authorized');
            }
            return response.json();
        })
        .then(user => {
            // Check if user role is admin or isAdmin is true
            if (user.role !== 'admin' && user.isAdmin !== 'true' && user.isAdmin !== true) {
                alert('Access denied. Admin privileges required.');
                window.location.href = '/pages/buyer-dashboard.html';
            } else {
                // Set role as admin for backward compatibility
                userRole = 'admin';
                loadRoleBasedNavigation();
                loadDashboardData();
            }
        })
        .catch(error => {
            console.error('Admin check failed:', error);
            // Don't redirect immediately on network errors, only on auth errors
            if (error.message.includes('Failed to fetch') || error.message.includes('Not authorized')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }
        });
}

// Load dashboard data
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('token');
        const period = document.getElementById('periodSelector').value;

        const response = await fetch(`${API_BASE}/admin/dashboard?period=${period}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Token expired - clear and redirect
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                alert('Your session has expired. Please log in again.');
                window.location.href = '/login';
                return;
            }
            throw new Error(`Failed to load dashboard data: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        updateKPICards(data);
        updateCharts(data);
        updateTopSellers(data.topSellers);
        updateRecentTransactions(data.recentTransactions);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Only redirect on authentication errors, not network errors
        if (error.message.includes('Your session has expired')) {
            // Already handled above
            return;
        }
        showError('Failed to load dashboard data');
    }
}

// Update KPI cards
function updateKPICards(data) {
    // User stats
    document.getElementById('totalUsers').textContent = data.userStats.totalUsers.toLocaleString();
    document.getElementById('verifiedStudents').textContent = `${data.userStats.verifiedStudents} verified students`;
    document.getElementById('newUsers24hCount').textContent = data.userStats.newUsers24hCount.toLocaleString();
    document.getElementById('pendingAppsCount').textContent = data.userStats.pendingAppsCount.toLocaleString();

    // Revenue stats
    document.getElementById('totalRevenue').textContent = `K${data.revenueStats.totalAllRevenue.toLocaleString()}`;
    document.getElementById('revenueBreakdown').textContent = `Commission: K${data.revenueStats.totalCommissionRevenue.toLocaleString()}`;
    document.getElementById('avgTransactionValue').textContent = `K${parseFloat(data.transactionStats.avgTransactionValue).toLocaleString()}`;

    // Transaction stats
    document.getElementById('totalTransactions').textContent = data.transactionStats.totalTransactions.toLocaleString();
    document.getElementById('successRate').textContent = `${data.transactionStats.transactionSuccessRate}% success rate`;

    // Product stats
    document.getElementById('activeProductsCount').textContent = data.productStats.activeProductsCount.toLocaleString();

    // Dispute stats
    document.getElementById('totalDisputes').textContent = data.transactionStats.totalDisputes.toLocaleString();
    document.getElementById('resolvedDisputes').textContent = `${data.transactionStats.resolvedDisputes} resolved`;
}

// Update charts
function updateCharts(data) {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenueChart').getContext('2d');

    if (revenueChart) {
        revenueChart.destroy();
    }

    revenueChart = new Chart(revenueCtx, {
        type: 'line',
        data: {
            labels: data.dailyRevenue.map(item => item._id),
            datasets: [{
                label: 'Daily Revenue',
                data: data.dailyRevenue.map(item => item.revenue),
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function (value) {
                            return 'K' + value.toLocaleString();
                        }
                    }
                }
            }
        }
    });

    // User Stats Chart
    const userStatsCtx = document.getElementById('userStatsChart').getContext('2d');

    if (userStatsChart) {
        userStatsChart.destroy();
    }

    userStatsChart = new Chart(userStatsCtx, {
        type: 'doughnut',
        data: {
            labels: ['Total Users', 'Verified Students', 'Verified Sellers', 'Pro Sellers'],
            datasets: [{
                data: [
                    data.userStats.totalUsers,
                    data.userStats.verifiedStudents,
                    data.userStats.verifiedSellers,
                    data.userStats.proSellers
                ],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Update top sellers
function updateTopSellers(sellers) {
    const container = document.getElementById('topSellers');
    container.innerHTML = '';

    if (!sellers || sellers.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No top sellers yet</p>';
        return;
    }

    sellers.forEach(seller => {
        const sellerCard = document.createElement('div');
        sellerCard.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';
        sellerCard.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="bg-blue-100 p-2 rounded-full">
                    <i class="fas fa-user text-blue-600"></i>
                </div>
                <div>
                    <p class="font-medium text-gray-900">${seller.name || 'Unknown'}</p>
                    <p class="text-sm text-gray-500">${seller.email || ''}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="font-medium text-gray-900">ZMW${(seller.totalRevenue || 0).toLocaleString()}</p>
                <p class="text-sm text-gray-500">${seller.transactionCount || 0} sales</p>
            </div>
        `;
        container.appendChild(sellerCard);
    });
}

// Update recent transactions
function updateRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactions');
    container.innerHTML = '';

    if (!transactions || transactions.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No recent transactions</p>';
        return;
    }

    transactions.forEach(transaction => {
        const transactionCard = document.createElement('div');
        transactionCard.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg';

        const statusColor = getStatusColor(transaction.status);
        const statusIcon = getStatusIcon(transaction.status);

        const productName = transaction.product?.name || 'Unknown Product';
        const buyerName = transaction.buyer?.fullName || 'Unknown Buyer';
        const sellerName = transaction.seller?.fullName || 'Unknown Seller';
        const amount = (transaction.totalAmount || 0).toLocaleString();

        transactionCard.innerHTML = `
            <div class="flex items-center space-x-3">
                <div class="${statusColor} p-2 rounded-full">
                    <i class="fas ${statusIcon} text-white"></i>
                </div>
                <div>
                    <p class="font-medium text-gray-900">${productName}</p>
                    <p class="text-sm text-gray-500">${buyerName} → ${sellerName}</p>
                </div>
            </div>
            <div class="text-right">
                <p class="font-medium text-gray-900">ZMW${amount}</p>
                <p class="text-sm ${statusColor}">${transaction.status}</p>
            </div>
        `;
        container.appendChild(transactionCard);
    });
}

// Get status color
function getStatusColor(status) {
    const colors = {
        'Pending': 'bg-yellow-100 text-yellow-800',
        'Confirmed': 'bg-blue-100 text-blue-800',
        'Shipped': 'bg-purple-100 text-purple-800',
        'Completed': 'bg-green-100 text-green-800',
        'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

// Get status icon
function getStatusIcon(status) {
    const icons = {
        'Pending': 'fa-clock',
        'Confirmed': 'fa-check',
        'Shipped': 'fa-truck',
        'Completed': 'fa-check-circle',
        'Cancelled': 'fa-times-circle'
    };
    return icons[status] || 'fa-question-circle';
}

// Tab management
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Remove active state from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('border-blue-500', 'text-blue-600');
        button.classList.add('border-transparent', 'text-gray-500');
    });

    // Show selected tab
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');

    // Add active state to clicked button
    if (event && event.target) {
        event.target.classList.remove('border-transparent', 'text-gray-500');
        event.target.classList.add('border-blue-500', 'text-blue-600');
    } else {
        // Find the button by text content if no event
        const buttons = document.querySelectorAll('.tab-button');
        buttons.forEach(btn => {
            if (btn.textContent.toLowerCase().includes(tabName)) {
                btn.classList.remove('border-transparent', 'text-gray-500');
                btn.classList.add('border-blue-500', 'text-blue-600');
            }
        });
    }

    // Load tab-specific data
    if (tabName === 'users') {
        loadUsers();
    } else if (tabName === 'transactions') {
        loadTransactions();
    } else if (tabName === 'disputes') {
        loadDisputes();
    } else if (tabName === 'applications') {
        loadApplications();
    } else if (tabName === 'retention') {
        loadRetentionStats();
    } else if (tabName === 'about') {
        loadAboutData();
    }
}

// Load users
async function loadUsers(page = 1) {
    try {
        const token = localStorage.getItem('token');
        const search = document.getElementById('userSearch')?.value || '';
        const role = document.getElementById('userRoleFilter')?.value || '';
        const verified = document.getElementById('userVerifiedFilter')?.value || '';

        const params = new URLSearchParams({
            page,
            search,
            role,
            verified
        });

        const response = await fetch(`/api/admin/users?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load users');
        }

        const data = await response.json();
        displayUsers(data.users);
        displayPagination('users', data.pagination);
    } catch (error) {
        console.error('Error loading users:', error);
        showError('Failed to load users');
    }
}

// Display users
function displayUsers(users) {
    const container = document.getElementById('usersList');
    container.innerHTML = '';

    if (users.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No users found</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    table.innerHTML = `
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">University</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
    `;

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="bg-gray-200 h-10 w-10 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-gray-500"></i>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${user.fullName}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.university || 'N/A'}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isSeller ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                    ${user.isSeller ? 'Seller' : 'Buyer'}
                </span>
                ${user.isProSeller ? '<span class="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">Pro</span>' : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.isStudentVerified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                    ${user.isStudentVerified ? 'Verified' : 'Not Verified'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(user.createdAt).toLocaleDateString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="window.location.href='/pages/messages.html?recipientId=${user._id}'" class="text-blue-600 hover:text-blue-900 flex items-center gap-1">
                    <i class="fas fa-envelope"></i> Message
                </button>
            </td>
        `;
        table.appendChild(row);
    });

    container.appendChild(table);
}

// Load transactions
async function loadTransactions(page = 1) {
    try {
        const token = localStorage.getItem('token');
        const status = document.getElementById('transactionStatusFilter')?.value || '';
        const disputeStatus = document.getElementById('disputeStatusFilter')?.value || '';

        const params = new URLSearchParams({
            page,
            status,
            disputeStatus
        });

        const response = await fetch(`/api/admin/transactions?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load transactions');
        }

        const data = await response.json();
        displayTransactions(data.transactions);
        displayPagination('transactions', data.pagination);
    } catch (error) {
        console.error('Error loading transactions:', error);
        showError('Failed to load transactions');
    }
}

// Display transactions
function displayTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    container.innerHTML = '';

    if (transactions.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No transactions found</p>';
        return;
    }

    const table = document.createElement('table');
    table.className = 'min-w-full divide-y divide-gray-200';
    table.innerHTML = `
        <thead class="bg-gray-50">
            <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buyer</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seller</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            </tr>
        </thead>
        <tbody class="bg-white divide-y divide-gray-200">
    `;

    transactions.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">${transaction.product.name}</div>
                <div class="text-sm text-gray-500">ID: ${transaction._id.substring(0, 8)}...</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${transaction.buyer.fullName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${transaction.seller.fullName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">ZMW${transaction.totalAmount.toLocaleString()}</td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(transaction.status)}">
                    ${transaction.status}
                </span>
                ${transaction.disputeStatus === 'Open' ? '<span class="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Dispute</span>' : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(transaction.createdAt).toLocaleDateString()}
            </td>
        `;
        table.appendChild(row);
    });

    container.appendChild(table);
}

// Load disputes
async function loadDisputes() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE}/admin/transactions?disputeStatus=Open`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load disputes');
        }

        const data = await response.json();
        displayDisputes(data.transactions);
    } catch (error) {
        console.error('Error loading disputes:', error);
        showError('Failed to load disputes');
    }
}

// Display disputes
function displayDisputes(disputes) {
    const container = document.getElementById('disputesList');
    container.innerHTML = '';

    if (disputes.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-4">No open disputes</p>';
        return;
    }

    disputes.forEach(dispute => {
        const disputeCard = document.createElement('div');
        disputeCard.className = 'bg-white border border-gray-200 rounded-lg p-6';
        disputeCard.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="text-lg font-medium text-gray-900">Dispute for ${dispute.product.name}</h4>
                    <p class="text-sm text-gray-500">Transaction ID: ${dispute._id}</p>
                </div>
                <span class="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">
                    Open
                </span>
            </div>
            
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div>
                    <p class="text-sm font-medium text-gray-700">Buyer</p>
                    <p class="text-sm text-gray-900">${dispute.buyer.fullName}</p>
                    <p class="text-sm text-gray-500">${dispute.buyer.email}</p>
                </div>
                <div>
                    <p class="text-sm font-medium text-gray-700">Seller</p>
                    <p class="text-sm text-gray-900">${dispute.seller.fullName}</p>
                    <p class="text-sm text-gray-500">${dispute.seller.email}</p>
                </div>
            </div>
            
            <div class="mb-4">
                <p class="text-sm font-medium text-gray-700">Dispute Reason</p>
                <p class="text-sm text-gray-900">${dispute.disputeReason}</p>
            </div>
            
            <div class="flex justify-end space-x-3">
                <button onclick="viewDisputeDetails('${dispute._id}')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                    View Details
                </button>
                <button onclick="openDisputeModal('${dispute._id}')" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">
                    Resolve
                </button>
            </div>
        `;
        container.appendChild(disputeCard);
    });
}

// Open dispute resolution modal
function openDisputeModal(disputeId) {
    currentDisputeId = disputeId;
    document.getElementById('disputeModal').classList.remove('hidden');
}

// Close dispute modal
function closeDisputeModal() {
    document.getElementById('disputeModal').classList.add('hidden');
    currentDisputeId = null;
    document.getElementById('resolutionText').value = '';
    document.getElementById('winnerSelect').value = '';
}

// Resolve dispute
async function resolveDispute() {
    try {
        const token = localStorage.getItem('token');
        const resolution = document.getElementById('resolutionText').value;
        const winner = document.getElementById('winnerSelect').value;

        if (!resolution || !winner) {
            showError('Please fill in all fields');
            return;
        }

        const response = await fetch(`/api/admin/disputes/${currentDisputeId}/resolve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ resolution, winner })
        });

        if (!response.ok) {
            throw new Error('Failed to resolve dispute');
        }

        const data = await response.json();
        showSuccess('Dispute resolved successfully');
        closeDisputeModal();
        loadDisputes(); // Reload disputes list
    } catch (error) {
        console.error('Error resolving dispute:', error);
        showError('Failed to resolve dispute');
    }
}

// Load applications
async function loadApplications() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/admin/applications`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load applications');

        const data = await response.json();
        displayApplications(data.applications);
    } catch (error) {
        console.error('Error loading applications:', error);
        showError('Failed to load applications');
    }
}

// Display applications
function displayApplications(apps) {
    const container = document.getElementById('applicationsList');
    container.innerHTML = '';

    if (!apps || apps.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500 mb-3">No pending applications</p>
                <a href="/pages/admin-seller-applications.html" class="text-blue-600 hover:underline text-sm font-medium">
                    View all applications →
                </a>
            </div>`;
        return;
    }

    // Add link to full applications page
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-4';
    header.innerHTML = `
        <p class="text-sm text-gray-500">${apps.length} pending application(s)</p>
        <a href="/pages/admin-seller-applications.html" class="text-blue-600 hover:underline text-sm font-medium">
            View All →
        </a>
    `;
    container.appendChild(header);

    apps.forEach(app => {
        const name = app.personalInfo?.fullName || app.user?.fullName || 'Unknown';
        const email = app.personalInfo?.email || app.user?.email || '';
        const university = app.personalInfo?.university || '';
        const sellerType = app.sellerType || '';
        const appId = app._id;
        const userId = app.user?._id || app.user;

        const typeBadgeColors = {
            Student: 'bg-blue-100 text-blue-700',
            CampusBusiness: 'bg-indigo-100 text-indigo-700',
            ExternalVendor: 'bg-pink-100 text-pink-700',
            Cooperative: 'bg-purple-100 text-purple-700'
        };
        const badgeColor = typeBadgeColors[sellerType] || 'bg-gray-100 text-gray-700';

        const card = document.createElement('div');
        card.className = 'bg-white border border-gray-200 rounded-lg p-4 md:p-6 flex flex-wrap justify-between items-center gap-3';
        card.innerHTML = `
            <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                    <h4 class="text-lg font-medium text-gray-900">${escapeHtmlDash(name)}</h4>
                    <span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${badgeColor}">${sellerType}</span>
                </div>
                <p class="text-sm text-gray-500">${escapeHtmlDash(email)} | ${escapeHtmlDash(university)}</p>
                <p class="text-sm text-yellow-600 mt-1">Pending Approval</p>
            </div>
            <div class="flex gap-2 flex-shrink-0">
                <button onclick="approveApplication('${appId}', '${userId}')" class="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 text-sm font-medium">
                    <i class="fas fa-check mr-1"></i> Approve
                </button>
                <a href="/pages/admin-seller-applications.html" class="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium">
                    <i class="fas fa-eye mr-1"></i> Details
                </a>
            </div>
        `;
        container.appendChild(card);
    });
}

function escapeHtmlDash(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Approve application
async function approveApplication(appId, userId) {
    if (!confirm('Approve this seller application?')) return;
    try {
        const token = localStorage.getItem('token');
        // Try new endpoint first, fall back to old
        let response = await fetch(`/api/admin/seller-applications/${appId}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ notes: '' })
        });

        if (!response.ok) {
            // Fallback to old endpoint using userId
            response = await fetch(`/api/admin/applications/${userId || appId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }

        if (!response.ok) throw new Error('Failed to approve application');

        showSuccess('Application approved successfully');
        loadApplications();
        loadDashboardData();
    } catch (error) {
        console.error('Error approving application:', error);
        showError('Failed to approve application');
    }
}

// Display pagination
function displayPagination(type, pagination) {
    const containerId = type === 'users' ? 'usersPagination' : 'transactionsPagination';
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (pagination.totalPages <= 1) return;

    const nav = document.createElement('nav');
    nav.className = 'flex items-center space-x-2';

    // Previous button
    if (pagination.currentPage > 1) {
        const prevBtn = createPageButton('Prev', () => {
            type === 'users' ? loadUsers(pagination.currentPage - 1) : loadTransactions(pagination.currentPage - 1);
        }, false);
        nav.appendChild(prevBtn);
    }

    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === 1 || i === pagination.totalPages || (i >= pagination.currentPage - 1 && i <= pagination.currentPage + 1)) {
            const pageBtn = createPageButton(i, () => {
                type === 'users' ? loadUsers(i) : loadTransactions(i);
            }, i === pagination.currentPage);
            nav.appendChild(pageBtn);
        } else if (i === pagination.currentPage - 2 || i === pagination.currentPage + 2) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.className = 'px-2 text-gray-500';
            nav.appendChild(dots);
        }
    }

    // Next button
    if (pagination.currentPage < pagination.totalPages) {
        const nextBtn = createPageButton('Next', () => {
            type === 'users' ? loadUsers(pagination.currentPage + 1) : loadTransactions(pagination.currentPage + 1);
        }, false);
        nav.appendChild(nextBtn);
    }

    container.appendChild(nav);
}

function createPageButton(text, onClick, isActive) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.onclick = onClick;
    btn.className = `px-3 py-1 rounded-md text-sm font-medium ${isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
        }`;
    return btn;
}

// Show error message
function showError(message) {
    // Create error notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Show success message
function showSuccess(message) {
    // Create success notification
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}


// Redundant logout() function removed - handled globally by unified-header-fixed.js


// Load retention statistics
async function loadRetentionStats() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE}/admin/retention/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const stats = await response.json();

            // Update quick stats
            document.getElementById('retention-total-messages').textContent = stats.totalMessages.toLocaleString();
            document.getElementById('retention-expired-messages').textContent = stats.expiredMessages.toLocaleString();
            document.getElementById('retention-archived-messages').textContent = stats.archivedMessages.toLocaleString();
            document.getElementById('retention-expiring-soon').textContent = stats.expiringSoon.toLocaleString();

            // Update policy info (load from config)
            loadRetentionConfig();

        } else {
            console.error('Failed to load retention stats');
        }
    } catch (error) {
        console.error('Error loading retention stats:', error);
    }
}

// Load retention configuration
async function loadRetentionConfig() {
    try {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_BASE}/admin/retention/config`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const defaultConfig = data.configs.find(c => c.name === 'default');

            if (defaultConfig) {
                document.getElementById('retention-standard-policy').textContent = `${defaultConfig.standardRetention} days`;
                document.getElementById('retention-mass-policy').textContent = `${defaultConfig.massMessageRetention} days`;
                document.getElementById('retention-archive-status').textContent = defaultConfig.autoArchiveEnabled ? 'Enabled' : 'Disabled';

                if (defaultConfig.cleanupSchedule.lastRun) {
                    const lastRun = new Date(defaultConfig.cleanupSchedule.lastRun).toLocaleDateString();
                    document.getElementById('retention-last-cleanup').textContent = lastRun;
                } else {
                    document.getElementById('retention-last-cleanup').textContent = 'Never';
                }
            }
        }
    } catch (error) {
        console.error('Error loading retention config:', error);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function () {
    // Check admin access first
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
        return;
    }
    
    // Don't initialize userRole as fallback - let getUserRoleInfo set it properly
    await getUserRoleInfo(); // This will set userRole correctly
    
    // Add event listeners for filters
    document.getElementById('userSearch')?.addEventListener('input', () => loadUsers());
    document.getElementById('userRoleFilter')?.addEventListener('change', () => loadUsers());
    document.getElementById('userVerifiedFilter')?.addEventListener('change', () => loadUsers());
    document.getElementById('transactionStatusFilter')?.addEventListener('change', () => loadTransactions());
    document.getElementById('disputeStatusFilter')?.addEventListener('change', () => loadTransactions());

    // Database reset functionality
    const resetBtn = document.getElementById('reset-database-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleDatabaseReset();
        });
    } else {
        // Try to attach event listener with a delay in case DOM is still loading
        setTimeout(() => {
            const delayedBtn = document.getElementById('reset-database-btn');
            if (delayedBtn) {
                delayedBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    handleDatabaseReset();
                });
            }
        }, 1000);
    }
    
    // Also add a global click handler as a fallback
    document.addEventListener('click', function(e) {
        if (e.target && e.target.id === 'reset-database-btn') {
            e.preventDefault();
            handleDatabaseReset();
        }
    });
});

// Handle database reset - make globally available
window.handleDatabaseReset = function() {
    // Confirm with user
    const confirmation = prompt('⚠️ DANGER: This will permanently delete ALL data including:\n\n• Products and listings\n• Transactions and orders\n• Shopping carts\n• Disputes and resolutions\n• Notifications\n• User statistics\n\nType "DELETE ALL" to confirm:');
    
    if (confirmation !== 'DELETE ALL') {
        alert('❌ Database reset cancelled. Confirmation text did not match.');
        return;
    }

    // Double confirm
    const doubleConfirm = confirm('🚨 FINAL WARNING: This action CANNOT be undone!\n\nAll data will be permanently lost.\n\nAre you absolutely sure?');
    
    if (!doubleConfirm) {
        alert('❌ Database reset cancelled.');
        return;
    }

    // Show loading state
    const resetBtn = document.getElementById('reset-database-btn');
    const originalText = resetBtn.innerHTML;
    resetBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Resetting...';
    resetBtn.disabled = true;

    // Perform reset
    const token = localStorage.getItem('token');
    
    fetch(`${API_BASE}/admin/delete-all-products`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to reset database');
        }
        return response.json();
    })
    .then(data => {
        console.log('✅ Database reset successful:', data);
        
        // Build comprehensive success message
        let successMessage = `✅ Database reset successfully!\n\n`;
        successMessage += `📦 Products deleted: ${data.productsDeleted || 0}\n`;
        successMessage += `💰 Transactions deleted: ${data.transactionsDeleted || 0}\n`;
        successMessage += `🛒 Carts deleted: ${data.cartsDeleted || 0}\n`;
        
        if (data.disputesDeleted !== undefined) {
            successMessage += `⚖️ Disputes deleted: ${data.disputesDeleted}\n`;
        }
        if (data.notificationsDeleted !== undefined) {
            successMessage += `🔔 Notifications deleted: ${data.notificationsDeleted}\n`;
        }
        if (data.userStatsReset !== undefined) {
            successMessage += `👥 User statistics reset: ${data.userStatsReset} users\n`;
        }
        
        successMessage += `\nPage will reload in 3 seconds...`;
        
        // Show success message
        alert(successMessage);
        
        // Reload page after delay
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    })
    .catch(error => {
        console.error('❌ Database reset failed:', error);
        alert('❌ Failed to reset database. Please try again.');
        
        // Reset button state
        resetBtn.innerHTML = originalText;
        resetBtn.disabled = false;
    });
}

// HTML Sanitization Utility
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load About Page Data
async function loadAboutData() {
    try {
        // Show loading state
        const aboutTab = document.getElementById('aboutTab');
        if (!aboutTab) {
            console.error('About tab element not found');
            return;
        }
        const originalContent = aboutTab.innerHTML;
        aboutTab.innerHTML = `
            <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                <span class="text-gray-600">Loading about page data...</span>
            </div>
        `;
        
        const response = await fetch(`${API_BASE}/public/about`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();

        // Restore original content and populate data
        aboutTab.innerHTML = originalContent;
        document.getElementById('about-title-input').value = data.title || '';
        document.getElementById('about-mission-input').value = data.mission || '';
        document.getElementById('about-vision-input').value = data.vision || '';
        document.getElementById('about-story-input').value = data.story || '';
        document.getElementById('about-hero-input').value = data.heroImage || '';
        
        renderTeamInputs(data.team || []);
    } catch (error) {
        console.error('Error loading about data:', error);
        
        // Show user-friendly error message
        const aboutTab = document.getElementById('aboutTab');
        aboutTab.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <div class="text-red-600 mb-3">
                    <i class="fas fa-exclamation-triangle text-2xl"></i>
                </div>
                <h3 class="text-lg font-semibold text-red-900 mb-2">Failed to Load About Page Data</h3>
                <p class="text-red-700 mb-4">${escapeHtml(error.message) || 'Unable to connect to the server. Please check your internet connection and try again.'}</p>
                <button onclick="loadAboutData()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                    <i class="fas fa-redo mr-2"></i>Try Again
                </button>
            </div>
        `;
    }
}

// Render Team Member Inputs
function renderTeamInputs(team) {
    const container = document.getElementById('admin-team-list');
    container.innerHTML = '';

    // Start with existing team members
    const displayTeam = [...team];
    
    // Add at least one empty slot if no team members
    if (displayTeam.length === 0) {
        displayTeam.push({ name: '', role: '', bio: '', image: '' });
    }

    displayTeam.forEach((member, index) => {
        const card = document.createElement('div');
        card.className = 'bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 relative';
        card.innerHTML = `
            <div class="flex items-center justify-between border-b pb-2 mb-4">
                <span class="text-xs font-bold text-gray-500 uppercase">Team Member ${index + 1}</span>
                ${displayTeam.length > 1 ? `
                    <button type="button" onclick="removeTeamMember(${index})" class="text-red-500 hover:text-red-700 transition-colors">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                ` : ''}
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Name <span class="text-red-500">*</span></label>
                <input type="text" class="team-name w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value="${member.name || ''}" placeholder="Enter team member name">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Role <span class="text-red-500">*</span></label>
                <input type="text" class="team-role w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value="${member.role || ''}" placeholder="e.g. CEO, Founder, Developer">
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Bio</label>
                <textarea class="team-bio w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows="2" placeholder="Brief description of their role and expertise">${member.bio || ''}</textarea>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Image URL</label>
                <div class="flex gap-2">
                    <input type="text" class="team-image w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value="${member.image || ''}" placeholder="https://example.com/photo.jpg" onchange="previewTeamImage(this, ${index})">
                    <button type="button" onclick="window.location.href='admin-asset-library.html'" class="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors" title="Select from Library">
                        <i class="fas fa-images"></i>
                    </button>
                </div>
                <div id="team-preview-${index}" class="mt-2 hidden">
                    <img src="" alt="Preview" class="w-16 h-16 rounded-full object-cover border-2 border-gray-300">
                </div>
            </div>
        `;
        container.appendChild(card);
    });

    // Add "Add Team Member" button
    const addButton = document.createElement('div');
    addButton.className = 'col-span-full';
    addButton.innerHTML = `
        <button type="button" onclick="addTeamMember()" class="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors">
            <i class="fas fa-plus mr-2"></i>Add Team Member
        </button>
    `;
    container.appendChild(addButton);
}

// Add new team member
function addTeamMember() {
    const container = document.getElementById('admin-team-list');
    const addButton = container.lastElementChild;
    
    const newIndex = container.children.length - 1; // Exclude add button
    const card = document.createElement('div');
    card.className = 'bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4 relative';
    card.innerHTML = `
        <div class="flex items-center justify-between border-b pb-2 mb-4">
            <span class="text-xs font-bold text-gray-500 uppercase">Team Member ${newIndex + 1}</span>
            <button type="button" onclick="removeTeamMember(${newIndex})" class="text-red-500 hover:text-red-700 transition-colors">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
        <div>
            <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Name <span class="text-red-500">*</span></label>
            <input type="text" class="team-name w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter team member name">
        </div>
        <div>
            <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Role <span class="text-red-500">*</span></label>
            <input type="text" class="team-role w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="e.g. CEO, Founder, Developer">
        </div>
        <div>
            <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Bio</label>
            <textarea class="team-bio w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows="2" placeholder="Brief description of their role and expertise"></textarea>
        </div>
        <div>
            <label class="block text-xs font-bold text-gray-600 mb-1 uppercase">Image URL</label>
            <div class="flex gap-2">
                <input type="text" class="team-image w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="https://example.com/photo.jpg" onchange="previewTeamImage(this, ${newIndex})">
                <button type="button" onclick="window.location.href='admin-asset-library.html'" class="px-3 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors" title="Select from Library">
                    <i class="fas fa-images"></i>
                </button>
            </div>
            <div id="team-preview-${newIndex}" class="mt-2 hidden">
                <img src="" alt="Preview" class="w-16 h-16 rounded-full object-cover border-2 border-gray-300">
            </div>
        </div>
    `;
    
    container.insertBefore(card, addButton);
    
    // Focus on the name field of the new member
    card.querySelector('.team-name').focus();
}

// Remove team member
function removeTeamMember(index) {
    if (!confirm('Are you sure you want to remove this team member?')) return;
    
    const container = document.getElementById('admin-team-list');
    const cards = container.querySelectorAll(':not(:last-child)'); // Exclude add button
    
    if (cards[index]) {
        cards[index].remove();
        
        // Re-index remaining members
        updateTeamMemberIndices();
    }
}

// Update team member indices after removal
let isUpdatingIndices = false;
function updateTeamMemberIndices() {
    if (isUpdatingIndices) return;
    isUpdatingIndices = true;
    
    const container = document.getElementById('admin-team-list');
    const cards = container.querySelectorAll(':not(:last-child)');
    
    cards.forEach((card, index) => {
        const titleElement = card.querySelector('.text-xs.font-bold.text-gray-500');
        if (titleElement) {
            titleElement.textContent = `Team Member ${index + 1}`;
        }
        
        // Update remove button onclick
        const removeBtn = card.querySelector('button[onclick^="removeTeamMember"]');
        if (removeBtn) {
            removeBtn.setAttribute('onclick', `removeTeamMember(${index})`);
        }
        
        // Update image input onchange
        const imageInput = card.querySelector('.team-image');
        if (imageInput) {
            imageInput.setAttribute('onchange', `previewTeamImage(this, ${index})`);
        }
        
        // Update preview div id
        const previewDiv = card.querySelector('[id^="team-preview-"]');
        if (previewDiv) {
            previewDiv.id = `team-preview-${index}`;
        }
    });
    
    isUpdatingIndices = false;
}

// Preview team member image
function previewTeamImage(input, index) {
    const previewDiv = document.getElementById(`team-preview-${index}`);
    
    // Add null check for previewDiv
    if (!previewDiv) {
        console.error(`Preview div with ID team-preview-${index} not found`);
        return;
    }
    
    const previewImg = previewDiv.querySelector('img');
    
    // Add null check for previewImg
    if (!previewImg) {
        console.error(`Image element not found in preview div team-preview-${index}`);
        return;
    }
    
    if (input.value.trim()) {
        // Validate URL before setting as image source
        if (!isValidUrl(input.value.trim())) {
            previewDiv.classList.add('hidden');
            showError('Invalid image URL. Please enter a valid HTTP/HTTPS URL.');
            return;
        }
        
        previewImg.src = input.value;
        previewImg.onerror = function() {
            previewDiv.classList.add('hidden');
            showError('Invalid image URL. Please check the URL and try again.');
        };
        previewImg.onload = function() {
            previewDiv.classList.remove('hidden');
        };
    } else {
        previewDiv.classList.add('hidden');
    }
}

// URL Validation Utility
function isValidUrl(string) {
    try {
        const url = new URL(string);
        return (url.protocol === 'http:' || url.protocol === 'https:') && 
               !string.toLowerCase().startsWith('javascript:');
    } catch (_) {
        return false;
    }
}

// Preview About Page
function previewAboutPage() {
    // Gather current form data
    const title = escapeHtml(document.getElementById('about-title-input').value.trim() || 'About Virtuosa');
    const mission = escapeHtml(document.getElementById('about-mission-input').value.trim() || 'Our mission statement');
    const vision = escapeHtml(document.getElementById('about-vision-input').value.trim() || 'Our vision statement');
    const story = escapeHtml(document.getElementById('about-story-input').value.trim() || 'Our company story');
    const heroImage = escapeHtml(document.getElementById('about-hero-input').value.trim() || FALLBACK_IMAGES.HERO);
    
    // Gather team members with hierarchy logic
    const teamCards = document.querySelectorAll('#admin-team-list > div');
    const team = [];
    
    teamCards.forEach((card) => {
        // Skip add button
        if (card.querySelector('button[onclick="addTeamMember()"]')) return;
        
        const name = escapeHtml(card.querySelector('.team-name').value.trim());
        const role = escapeHtml(card.querySelector('.team-role').value.trim());
        const bio = escapeHtml(card.querySelector('.team-bio').value.trim());
        const image = card.querySelector('.team-image').value.trim();
        
        if (name && role) {
            team.push({ name, role, bio, image: escapeHtml(image) || FALLBACK_IMAGES.TEAM_MEMBER });
        }
    });

    // Create hierarchical preview structure
    let teamPreviewHtml = '';
    if (team.length > 0) {
        // Find the founder (first one with 'founder' or 'ceo' in role)
        const founder = team.find(member => 
            member.role.toLowerCase().includes('founder') || 
            member.role.toLowerCase().includes('ceo')
        );
        
        // Get all other team members (excluding the founder)
        const otherMembers = team.filter(member => 
            !member.role.toLowerCase().includes('founder') && 
            !member.role.toLowerCase().includes('ceo')
        );

        teamPreviewHtml = '<div class="space-y-12">';
        
        // Founder section
        if (founder) {
            teamPreviewHtml += `
                <div class="text-center">
                    <h4 class="text-lg font-bold text-navy mb-6">Founder & CEO</h4>
                    <div class="flex justify-center">
                        <div class="relative group inline-block">
                            <div class="w-32 h-32 rounded-full overflow-hidden bg-gray-200 shadow-lg border-3 border-gold transform transition-all duration-500 hover:scale-105">
                                <img src="${founder.image}" alt="${founder.name}" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" onerror="this.src='${FALLBACK_IMAGES.TEAM_MEMBER.replace(/'/g, "\\'")}'">
                            </div>
                            <div class="absolute -bottom-4 left-1/2 transform -translate-x-1/2 bg-gold text-navy font-bold py-1 px-4 rounded-full text-xs shadow-md">
                                ${founder.role}
                            </div>
                            <h5 class="text-base font-bold mt-6 mb-1">${founder.name}</h5>
                            <p class="text-gray-600 text-sm max-w-48 mx-auto line-clamp-2">${founder.bio || 'Founder description'}</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Team members section
        if (otherMembers.length > 0) {
            teamPreviewHtml += `
                <div>
                    <h4 class="text-md font-semibold text-navy mb-6 text-center">Our Team</h4>
                    <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 justify-items-center">
                        ${otherMembers.map(member => `
                            <div class="relative group text-center">
                                <div class="w-20 h-20 rounded-full overflow-hidden bg-gray-200 shadow-md border-2 border-gold/50 transform transition-all duration-500 hover:scale-105 hover:border-gold mx-auto">
                                    <img src="${member.image}" alt="${member.name}" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" onerror="this.src='${FALLBACK_IMAGES.TEAM_MEMBER.replace(/'/g, "\\'")}'">
                                </div>
                                <div class="absolute -bottom-2 left-1/2 transform -translate-x-1/2 bg-gold text-navy font-semibold py-0.5 px-2 rounded-full text-xs shadow-sm">
                                    ${member.role}
                                </div>
                                <h5 class="text-xs font-bold mt-3 mb-1">${member.name}</h5>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        teamPreviewHtml += '</div>';
    }

    // Create preview modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-gray-900 bg-opacity-75 z-50 overflow-y-auto';
    modal.innerHTML = `
        <div class="min-h-screen px-4 py-8">
            <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-xl">
                <!-- Preview Header -->
                <div class="bg-navy text-white p-6 rounded-t-lg flex items-center justify-between">
                    <h2 class="text-xl font-bold">About Page Preview</h2>
                    <button onclick="this.closest('.fixed').remove()" class="text-white hover:text-gold transition-colors">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <!-- Preview Content -->
                <div class="p-6 max-h-[80vh] overflow-y-auto">
                    <!-- Hero Section Preview -->
                    <div class="relative h-64 bg-navy rounded-lg overflow-hidden mb-8">
                        <img src="${heroImage}" alt="Hero" class="w-full h-full object-cover opacity-40" onerror="this.src='${FALLBACK_IMAGES.HERO.replace(/'/g, "\\'")}'">
                        <div class="absolute inset-0 flex items-center justify-center text-center">
                            <div>
                                <h1 class="text-4xl font-bold text-white mb-4">${title}</h1>
                                <p class="text-lg text-gray-300">Empowering the next generation of Zambian entrepreneurs</p>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Mission & Vision Preview -->
                    <div class="grid md:grid-cols-2 gap-8 mb-8">
                        <div class="bg-gray-50 p-6 rounded-lg">
                            <h3 class="text-lg font-bold text-navy mb-3">Our Mission</h3>
                            <p class="text-gray-700">${mission}</p>
                        </div>
                        <div class="bg-gray-50 p-6 rounded-lg">
                            <h3 class="text-lg font-bold text-navy mb-3">Our Vision</h3>
                            <p class="text-gray-700">${vision}</p>
                        </div>
                    </div>
                    
                    <!-- Story Preview -->
                    <div class="bg-gray-50 p-6 rounded-lg mb-8">
                        <h3 class="text-lg font-bold text-navy mb-3">Our Story</h3>
                        <p class="text-gray-700">${story}</p>
                    </div>
                    
                    <!-- Team Preview -->
                    ${teamPreviewHtml ? `
                        <div class="mb-8">
                            <h3 class="text-2xl font-bold text-navy mb-6 text-center">Meet Our Team</h3>
                            ${teamPreviewHtml}
                        </div>
                    ` : ''}
                    
                    <!-- Preview Actions -->
                    <div class="flex justify-end space-x-4 pt-6 border-t">
                        <button onclick="this.closest('.fixed').remove()" class="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                            Close Preview
                        </button>
                        <button onclick="this.closest('.fixed').remove(); saveAboutData();" class="bg-navy text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition-colors">
                            <i class="fas fa-save mr-2"></i>Save & Publish
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close on escape key
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            cleanupModal();
        }
    };
    document.addEventListener('keydown', handleEscape);
    
    // Close on background click
    const handleBackgroundClick = (e) => {
        if (e.target === modal) {
            cleanupModal();
        }
    };
    modal.addEventListener('click', handleBackgroundClick);
    
    // Cleanup function to remove modal and event listeners
    function cleanupModal() {
        if (modal && modal.parentNode) {
            modal.remove();
        }
        document.removeEventListener('keydown', handleEscape);
        modal.removeEventListener('click', handleBackgroundClick);
    }
}

// Save About Page Data
async function saveAboutData() {
    try {
        const token = localStorage.getItem('token');
        
        // Validate required fields
        const title = document.getElementById('about-title-input').value.trim();
        const mission = document.getElementById('about-mission-input').value.trim();
        const vision = document.getElementById('about-vision-input').value.trim();
        const story = document.getElementById('about-story-input').value.trim();
        
        if (!title) {
            showError('Page title is required');
            document.getElementById('about-title-input').focus();
            return;
        }
        
        if (!mission) {
            showError('Mission statement is required');
            document.getElementById('about-mission-input').focus();
            return;
        }
        
        if (!vision) {
            showError('Vision statement is required');
            document.getElementById('about-vision-input').focus();
            return;
        }
        
        if (!story) {
            showError('Company story is required');
            document.getElementById('about-story-input').focus();
            return;
        }
        
        // Show loading state
        const saveBtn = document.querySelector('button[onclick="saveAboutData()"]');
        if (!saveBtn) {
            console.error('Save button not found');
            return;
        }
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
        saveBtn.disabled = true;
        
        const teamCards = document.querySelectorAll('#admin-team-list > div');
        const team = [];

        // Validate team members
        let hasValidTeamMember = false;
        teamCards.forEach((card, index) => {
            // Skip the add button
            if (card.querySelector('button[onclick="addTeamMember()"]')) return;
            
            const name = card.querySelector('.team-name').value.trim();
            const role = card.querySelector('.team-role').value.trim();
            const bio = card.querySelector('.team-bio').value.trim();
            const image = card.querySelector('.team-image').value.trim();
            
            if (name && role) {
                hasValidTeamMember = true;
                team.push({ name, role, bio, image });
            } else if (name || role) {
                // Partial team member - show error
                const missingField = !name ? 'Name' : 'Role';
                const errorMessage = `Team Member ${index + 1}: ${missingField} is required (both name and role must be provided)`;
                showError(errorMessage);
                
                // Focus on the problematic field
                const problematicField = !name ? card.querySelector('.team-name') : card.querySelector('.team-role');
                if (problematicField) {
                    problematicField.focus();
                }
                return;
            }
        });
        
        if (!hasValidTeamMember) {
            showError('At least one team member with name and role is required');
            return;
        }

        const aboutData = {
            title,
            mission,
            vision,
            story,
            heroImage: document.getElementById('about-hero-input').value.trim(),
            team
        };

        const response = await fetch(`${API_BASE}/admin/about`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(aboutData)
        });

        const result = await response.json();
        
        if (response.ok) {
            showSuccess('About page updated successfully!');
        } else {
            throw new Error(result.message || 'Failed to update about page');
        }
    } catch (error) {
        console.error('Error saving about data:', error);
        
        // Show specific error message
        let errorMessage = 'Failed to save changes';
        if (error.message.includes('401') || error.message.includes('403')) {
            errorMessage = 'Your session has expired. Please log in again.';
            setTimeout(() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = '/login';
            }, 2000);
        } else if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        showError(errorMessage);
    } finally {
        // Reset button state
        const saveBtn = document.querySelector('button[onclick="saveAboutData()"]');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Changes';
            saveBtn.disabled = false;
        }
    }
}
