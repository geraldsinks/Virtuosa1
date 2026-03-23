// Admin Dashboard JavaScript
// API_BASE is provided by config.js
let currentDisputeId = null;
let revenueChart = null;
let userStatsChart = null;

// Check if user is admin
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
            // Check if user email matches admin email or role is admin or isAdmin is true
            if (user.email !== 'admin@virtuosa.com' && user.role !== 'admin' && user.isAdmin !== 'true' && user.isAdmin !== true) {
                alert('Access denied. Admin privileges required.');
                window.location.href = '/pages/buyer-dashboard.html';
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
            throw new Error('Failed to load dashboard data');
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

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

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
document.addEventListener('DOMContentLoaded', function () {
    checkAdminAccess();
    loadDashboardData();

    // Add event listeners for filters
    document.getElementById('userSearch')?.addEventListener('input', () => loadUsers());
    document.getElementById('userRoleFilter')?.addEventListener('change', () => loadUsers());
    document.getElementById('userVerifiedFilter')?.addEventListener('change', () => loadUsers());
    document.getElementById('transactionStatusFilter')?.addEventListener('change', () => loadTransactions());
    document.getElementById('disputeStatusFilter')?.addEventListener('change', () => loadTransactions());

    // Database reset functionality
    const resetBtn = document.getElementById('reset-database-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', handleDatabaseReset);
    }
});

// Handle database reset
function handleDatabaseReset() {
    // Confirm with user
    const confirmation = prompt('⚠️ DANGER: This will permanently delete ALL products, transactions, and carts!\n\nType "DELETE ALL" to confirm:');
    
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
        
        // Show success message
        alert(`✅ Database reset successfully!\n\n- Products deleted: ${data.productsDeleted}\n- Transactions deleted: ${data.transactionsDeleted}\n- Carts deleted: ${data.cartsDeleted}\n\nPage will reload in 3 seconds...`);
        
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
