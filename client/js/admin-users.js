// User Analytics JavaScript
let userGrowthChart = null;
let userDistributionChart = null;
let universityChart = null;

// Load user analytics data
async function loadUserAnalytics() {
    try {
        const periodSelector = document.getElementById('periodSelector');
        const period = periodSelector.value;
        const dateContainer = document.getElementById('dateSelectorContainer');
        const customDate = document.getElementById('customDateSelector')?.value || '';

        // Show/hide date selector based on period
        if (period === 'custom_day') {
            dateContainer?.classList.remove('hidden');
        } else {
            dateContainer?.classList.add('hidden');
        }

        const params = new URLSearchParams({ period });
        if (period === 'custom_day' && customDate) {
            params.set('date', customDate);
        }

        const response = await adminFetch(`${API_BASE}/admin/user-analytics?${params}`);
        if (!response) return;
        const data = await response.json();
        updateAnalyticsCards(data);
        updateAnalyticsCharts(data);
        
        // Link top period to the user list below
        loadUsers(1);
    } catch (error) {
        console.error('Error loading user analytics:', error);
        // Only redirect on authentication errors, not network errors
        if (error.message.includes('Your session has expired')) {
            // Already handled above
            return;
        }
        showError('Failed to load user analytics');
        // Load fallback data
        loadFallbackAnalytics();
    }
}

// Update analytics cards
function updateAnalyticsCards(data) {
    const period = document.getElementById('periodSelector').value;
    const customDate = document.getElementById('customDateSelector')?.value;
    const isDaily = period === 'custom_day' && customDate;

    document.getElementById('totalUsers').textContent = data.totalUsers?.toLocaleString() || '0';
    document.getElementById('activeUsers').textContent = data.activeUsers?.toLocaleString() || '0';
    document.getElementById('newUsers').textContent = data.newUsers30Days?.toLocaleString() || '0';
    document.getElementById('siteVisits').textContent = data.siteVisits?.toLocaleString() || '0';

    // Update labels if daily
    const activeLabel = document.querySelector('[id="activeUsers"]').previousElementSibling;
    const newUsersLabel = document.querySelector('[id="newUsers"]').previousElementSibling;
    
    if (isDaily) {
        if (activeLabel) activeLabel.textContent = 'Active (Selected Day)';
        if (newUsersLabel) newUsersLabel.textContent = 'Joined (Selected Day)';
    } else {
        if (activeLabel) activeLabel.textContent = 'Active Users';
        if (newUsersLabel) newUsersLabel.textContent = `New Users (${period === 'all' ? 'Total' : period + 'd'})`;
    }

    // Growth indicators
    const userGrowthEl = document.getElementById('userGrowth');
    if (data.userGrowthRate) {
        userGrowthEl.innerHTML = `<span class="${data.userGrowthRate >= 0 ? 'growth-positive' : 'growth-negative'}">
            ${data.userGrowthRate >= 0 ? '↑' : '↓'} ${Math.abs(data.userGrowthRate)}% from last period
        </span>`;
    } else {
        userGrowthEl.textContent = 'No data';
    }

    const activePercentageEl = document.getElementById('activePercentage');
    if (data.activeUsersPercentage) {
        activePercentageEl.innerHTML = `<span class="text-green-600">${data.activeUsersPercentage}% of total users</span>`;
    } else {
        activePercentageEl.textContent = 'No data';
    }

    const newUserGrowthEl = document.getElementById('newUserGrowth');
    if (data.newUserGrowthRate) {
        newUserGrowthEl.innerHTML = `<span class="${data.newUserGrowthRate >= 0 ? 'growth-positive' : 'growth-negative'}">
            ${data.newUserGrowthRate >= 0 ? '↑' : '↓'} ${Math.abs(data.newUserGrowthRate)}% from last month
        </span>`;
    } else {
        newUserGrowthEl.textContent = 'No data';
    }

    const visitsGrowthEl = document.getElementById('visitsGrowth');
    if (data.visitsGrowthRate) {
        visitsGrowthEl.innerHTML = `<span class="${data.visitsGrowthRate >= 0 ? 'growth-positive' : 'growth-negative'}">
            ${data.visitsGrowthRate >= 0 ? '↑' : '↓'} ${Math.abs(data.visitsGrowthRate)}% from last period
        </span>`;
    } else {
        visitsGrowthEl.textContent = 'No data';
    }

    // Secondary stats
    document.getElementById('verifiedStudents').textContent = data.verifiedStudents?.toLocaleString() || '0';
    document.getElementById('totalSellers').textContent = data.totalSellers?.toLocaleString() || '0';
    document.getElementById('proSellers').textContent = data.proSellers?.toLocaleString() || '0';
    document.getElementById('avgSessionTime').textContent = data.avgSessionTime || '0m';

    // Percentages
    const verifiedPercentageEl = document.getElementById('verifiedPercentage');
    if (data.verifiedStudentsPercentage) {
        verifiedPercentageEl.innerHTML = `<span class="text-indigo-600">${data.verifiedStudentsPercentage}% of total users</span>`;
    } else {
        verifiedPercentageEl.textContent = 'No data';
    }

    const sellerPercentageEl = document.getElementById('sellerPercentage');
    if (data.sellerPercentage) {
        sellerPercentageEl.innerHTML = `<span class="text-yellow-600">${data.sellerPercentage}% of total users</span>`;
    } else {
        sellerPercentageEl.textContent = 'No data';
    }

    const proSellerPercentageEl = document.getElementById('proSellerPercentage');
    if (data.proSellerPercentage) {
        proSellerPercentageEl.innerHTML = `<span class="text-red-600">${data.proSellerPercentage}% of sellers</span>`;
    } else {
        proSellerPercentageEl.textContent = 'No data';
    }
}

// Update analytics charts
function updateAnalyticsCharts(data) {
    // User Growth Chart
    const growthCtx = document.getElementById('userGrowthChart').getContext('2d');
    if (userGrowthChart) {
        userGrowthChart.destroy();
    }

    userGrowthChart = new Chart(growthCtx, {
        type: 'line',
        data: {
            labels: data.userGrowthData?.map(item => item.date) || [],
            datasets: [{
                label: 'New Users',
                data: data.userGrowthData?.map(item => item.count) || [],
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // User Distribution Chart
    const distributionCtx = document.getElementById('userDistributionChart').getContext('2d');
    if (userDistributionChart) {
        userDistributionChart.destroy();
    }

    userDistributionChart = new Chart(distributionCtx, {
        type: 'doughnut',
        data: {
            labels: ['Buyers', 'Sellers', 'Pro Sellers', 'Verified Students'],
            datasets: [{
                data: [
                    data.totalBuyers || 0,
                    data.totalSellers || 0,
                    data.proSellers || 0,
                    data.verifiedStudents || 0
                ],
                backgroundColor: [
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(251, 191, 36, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(34, 197, 94, 0.8)'
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

    // University Distribution Chart
    const universityCtx = document.getElementById('universityChart').getContext('2d');
    if (universityChart) {
        universityChart.destroy();
    }

    universityChart = new Chart(universityCtx, {
        type: 'bar',
        data: {
            labels: data.universityDistribution?.map(item => item.university) || [],
            datasets: [{
                label: 'Students',
                data: data.universityDistribution?.map(item => item.count) || [],
                backgroundColor: 'rgba(99, 102, 241, 0.8)'
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

// Load users with filters
async function loadUsers(page = 1) {
    try {
        const search = document.getElementById('userSearch')?.value || '';
        const role = document.getElementById('userRoleFilter')?.value || '';
        const verified = document.getElementById('userVerifiedFilter')?.value || '';
        const signupDate = document.getElementById('userDateFilter')?.value || '';

        const params = new URLSearchParams({
            page,
            search,
            role,
            verified,
            signupDate,
            period: (period === 'custom_day' ? '' : period) // Top period overrides if present
        });

        const response = await adminFetch(`${API_BASE}/admin/users?${params}`);
        if (!response) return;
        const data = await response.json();
        displayUsers(data.users);
        displayPagination(data.pagination);
    } catch (error) {
        console.error('Error loading users:', error);
        // Only redirect on authentication errors, not network errors
        if (error.message.includes('Your session has expired')) {
            // Already handled above
            return;
        }
        showError('Failed to load users');
    }
}

// Display users in table
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
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2 flex items-center">
                <button onclick="viewUserDetails('${user._id}')" class="text-indigo-600 hover:text-indigo-900 flex items-center gap-1">
                    <i class="fas fa-eye"></i> Details
                </button>
                <button onclick="window.location.href='messages.html?recipientId=${user._id}'" class="text-blue-600 hover:text-blue-900 flex items-center gap-1">
                    <i class="fas fa-envelope"></i> Message
                </button>
            </td>
        `;
        table.appendChild(row);
    });

    container.appendChild(table);
}

// Display pagination
function displayPagination(pagination) {
    const container = document.getElementById('usersPagination');
    container.innerHTML = '';

    if (pagination.totalPages <= 1) return;

    const nav = document.createElement('nav');
    nav.className = 'flex items-center space-x-2';

    // Previous button
    if (pagination.currentPage > 1) {
        const prevBtn = createPageButton('Prev', () => {
            loadUsers(pagination.currentPage - 1);
        }, false);
        nav.appendChild(prevBtn);
    }

    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === 1 || i === pagination.totalPages || (i >= pagination.currentPage - 1 && i <= pagination.currentPage + 1)) {
            const pageBtn = createPageButton(i, () => {
                loadUsers(i);
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
            loadUsers(pagination.currentPage + 1);
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

// Load fallback analytics when API fails
function loadFallbackAnalytics() {
    const fallbackData = {
        totalUsers: 1234,
        activeUsers: 856,
        newUsers30Days: 89,
        siteVisits: 15420,
        userGrowthRate: 12.5,
        activeUsersPercentage: 69.4,
        newUserGrowthRate: 8.3,
        visitsGrowthRate: 15.7,
        verifiedStudents: 445,
        totalSellers: 234,
        proSellers: 67,
        avgSessionTime: '4m 32s',
        verifiedStudentsPercentage: 36.1,
        sellerPercentage: 19.0,
        proSellerPercentage: 28.6,
        totalBuyers: 1000,
        userGrowthData: [
            { date: '2024-01-01', count: 12 },
            { date: '2024-01-02', count: 8 },
            { date: '2024-01-03', count: 15 },
            { date: '2024-01-04', count: 10 },
            { date: '2024-01-05', count: 18 },
            { date: '2024-01-06', count: 14 },
            { date: '2024-01-07', count: 12 }
        ],
        universityDistribution: [
            { university: 'UNZA', count: 445 },
            { university: 'CBU', count: 234 },
            { university: 'MULUNGUSHI', count: 189 },
            { university: 'ZCAS', count: 156 },
            { university: 'Other', count: 210 }
        ]
    };

    updateAnalyticsCards(fallbackData);
    updateAnalyticsCharts(fallbackData);
}

// Show error message
function showError(message) {
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
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}


// Redundant logout() function removed - handled globally by unified-header-fixed.js


// Initialize page
document.addEventListener('DOMContentLoaded', async function() {
    // Check admin access first
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) {
        return;
    }
    
    loadUserAnalytics();
    loadUsers();

    // Add event listeners for filters
    document.getElementById('userSearch')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            loadUsers();
        }
    });

    document.getElementById('userRoleFilter')?.addEventListener('change', function() {
        loadUsers();
    });

    document.getElementById('userVerifiedFilter')?.addEventListener('change', function() {
        loadUsers();
    });
});

// User Details Modal Logic
async function viewUserDetails(userId) {
    try {
        // Fetch specific user details 
        const response = await adminFetch(`${API_BASE}/admin/users?search=${userId}`);
        if (!response) return;
        
        const data = await response.json();
        const user = data.users.find(u => u._id === userId);
        
        if (!user) {
            alert('User profile details not found.');
            return;
        }

        const modal = document.getElementById('userDetailsModal');
        const content = document.getElementById('modalContent');

        content.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="space-y-4">
                    <div>
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Identity</h4>
                        <p class="text-lg font-bold text-gray-900">${user.fullName}</p>
                        <p class="text-indigo-600 font-medium">${user.email}</p>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Contact Info</h4>
                        <p class="text-gray-700"><i class="fas fa-phone mr-2 text-gray-400"></i>${user.phoneNumber || 'N/A'}</p>
                        <p class="text-gray-700 capitalize"><i class="fas fa-venus-mars mr-2 text-gray-400"></i>${user.gender || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Status</h4>
                        <div class="mt-1 flex flex-wrap gap-2">
                             <span class="px-2 py-1 rounded-md text-xs font-bold ${user.isStudentVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">
                                ${user.isStudentVerified ? 'Verified Student' : 'Unverified'}
                             </span>
                             <span class="px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700 capitalize">
                                ${user.role}
                             </span>
                        </div>
                    </div>
                </div>

                <div class="space-y-4">
                    <div>
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Academic Info</h4>
                        <p class="font-bold text-gray-900 mt-1">${user.university || 'N/A'}</p>
                        <p class="text-gray-600">${user.faculty || 'N/A'}</p>
                        <p class="text-sm text-gray-500">ID: ${user.studentId || 'N/A'} (Year: ${user.yearOfStudy || 'N/A'})</p>
                    </div>
                    ${user.isSeller ? `
                    <div class="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Marketplace Presence</h4>
                        <p class="font-bold text-gray-900">${user.storeName || 'Unnamed Store'}</p>
                        <p class="text-xs text-gray-500 line-clamp-2 mt-1">${user.storeDescription || 'No store bio provided'}</p>
                        <div class="mt-3 flex items-center justify-between">
                            <span class="text-sm font-bold text-yellow-600"><i class="fas fa-star mr-1"></i>${user.sellerRating || '0.0'}</span>
                            <span class="text-xs text-gray-400">Joined: ${new Date(user.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                    ` : `
                    <div class="bg-blue-50 p-4 rounded-xl border border-blue-100 italic text-sm text-blue-700">
                        Regular buyer account. No active seller profile detected.
                    </div>
                    `}
                </div>

                ${user.bio ? `
                <div class="col-span-1 md:col-span-2">
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">User Bio</h4>
                    <p class="text-gray-600 text-sm italic border-l-4 border-gray-200 pl-4 py-1 bg-gray-50 rounded-r-lg">"${user.bio}"</p>
                </div>
                ` : ''}
            </div>
        `;

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Error showing user details:', error);
        alert('Failed to load user details. Please check the console.');
    }
}

function closeUserDetailsModal() {
    document.getElementById('userDetailsModal').classList.add('hidden');
    document.body.style.overflow = 'auto';
}
