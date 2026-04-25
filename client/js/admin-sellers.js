// admin-sellers.js

// Check auth on load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }
        
        // Wait for auth config/check (from admin-auth-helper if available)
        // Load initial data
        await loadSellerAnalytics();
        await loadSellers();
    } catch (err) {
        console.error('Initialization error:', err);
    }
});

// UI: Tab Switching
function switchSellerTab(tabId, btnElement) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');

    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active', 'text-white');
        b.classList.add('text-gray-500');
    });
    btnElement.classList.add('active', 'text-white');
    btnElement.classList.remove('text-gray-500');
}

// Global state for charts
let growthChartInstance = null;

// ==========================================
// TAB 1: ANALYTICS & PRODUCTIVITY
// ==========================================

async function loadSellerAnalytics() {
    try {
        const res = await fetch(`${API_BASE}/admin/sellers/analytics`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to load analytics');
        const data = await res.json();

        // Populate KPIs
        document.getElementById('kpi-total-sellers').textContent = data.kpis.totalSellers.toLocaleString();
        document.getElementById('kpi-pro-sellers').textContent = data.kpis.proSellers.toLocaleString();
        document.getElementById('kpi-pending-apps').textContent = data.kpis.pendingApps.toLocaleString();
        document.getElementById('kpi-revenue').textContent = `K${(data.kpis.totalMarketRevenue || 0).toLocaleString()}`;
        document.getElementById('kpi-transactions').textContent = (data.kpis.totalTransactions || 0).toLocaleString();
        document.getElementById('kpi-rating').textContent = `${data.kpis.avgRating} / 5.0`;

        // Render Chart
        renderGrowthChart(data.acquisitionTrend);

        // Render Top Sellers
        renderTopSellers(data.topSellers);
    } catch (err) {
        console.error('Analytics load error:', err);
        showToast('Failed to load seller analytics', 'error');
    }
}

function renderGrowthChart(trendData = []) {
    const ctx = document.getElementById('sellerGrowthChart');
    if (!ctx) return;

    const labels = trendData.map(d => d._id);
    const dataPoints = trendData.map(d => d.count);

    if (growthChartInstance) {
        growthChartInstance.destroy();
    }

    growthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'New Sellers Acquired',
                data: dataPoints,
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 4] } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function renderTopSellers(sellers = []) {
    const container = document.getElementById('top-sellers-list');
    if (!sellers.length) {
        container.innerHTML = '<p class="text-sm text-gray-500">No seller data available.</p>';
        return;
    }

    container.innerHTML = sellers.map((s, i) => `
        <div class="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
            <div class="w-8 h-8 rounded-full bg-navy text-white flex items-center justify-center font-bold text-sm mr-3">
                #${i + 1}
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-navy truncate">
                    ${s.storeName || s.fullName} 
                    ${s.isProSeller ? '<i class="fas fa-crown text-gold text-xs ml-1" title="Pro Seller"></i>' : ''}
                </p>
                <div class="flex text-xs text-gray-500 mt-1 gap-3">
                    <span><i class="fas fa-check-circle text-green-500 mr-1"></i>${s.successfulTransactions || 0}</span>
                    <span><i class="fas fa-star text-gold mr-1"></i>${(s.sellerRating || 5).toFixed(1)}</span>
                </div>
            </div>
            <div class="text-right">
                <p class="text-sm font-bold text-green-600">K${(s.totalSales || 0).toLocaleString()}</p>
            </div>
        </div>
    `).join('');
}

// ==========================================
// TAB 2: PLATFORM SAFETY & LISTINGS (Grid)
// ==========================================

let currentPage = 1;
async function loadSellers(page = 1) {
    currentPage = page;
    const tbody = document.getElementById('sellers-table-body');
    const search = document.getElementById('seller-search').value;
    const status = document.getElementById('seller-status').value;
    const verified = document.getElementById('seller-verified').value;
    const pro = document.getElementById('seller-pro').value;

    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400"><i class="fas fa-spinner fa-spin mr-2"></i>Loading sellers...</td></tr>`;

    try {
        const queryParams = new URLSearchParams({ page, limit: 12, search, status, verified, pro });
        const res = await fetch(`${API_BASE}/admin/sellers/list?${queryParams.toString()}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Failed to load sellers');
        
        const data = await res.json();
        renderSellersTable(data.sellers);
        renderPagination(data.pagination);
    } catch (error) {
        console.error('List error:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-red-500">Error loading data.</td></tr>`;
    }
}

function renderSellersTable(sellers) {
    const tbody = document.getElementById('sellers-table-body');
    if (!sellers || sellers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-gray-500">No sellers found.</td></tr>`;
        return;
    }

    tbody.innerHTML = sellers.map(s => {
        const isSuspended = s.sellerApplicationStatus === 'Suspended';
        const displayStatus = isSuspended ? 'Suspended' : (s.isSeller ? 'Active' : 'Deactivated');
        const statusClass = isSuspended ? 'status-suspended' : (s.isSeller ? 'status-approved' : 'status-pending');
        
        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-4 whitespace-nowrap">
                    <div class="flex flex-col">
                        <span class="text-sm font-semibold text-gray-900">${s.fullName}</span>
                        <span class="text-xs text-gray-500">${s.email}</span>
                        <span class="text-xs text-gray-400">${s.phoneNumber}</span>
                    </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-2">
                        <span class="text-sm text-navy font-medium">${s.storeName || 'N/A'}</span>
                        ${s.isProSeller ? '<span class="pro-badge"><i class="fas fa-crown text-[10px] mr-1"></i>PRO</span>' : ''}
                    </div>
                    <div class="mt-1">
                        ${s.sellerVerified ? 
                            '<span class="text-xs text-green-600"><i class="fas fa-check-circle mr-1"></i>Verified Store</span>' : 
                            '<span class="text-xs text-gray-400"><i class="fas fa-times-circle mr-1"></i>Unverified Store</span>'}
                    </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap">
                    <span class="status-badge ${statusClass}">${displayStatus}</span>
                    <p class="text-[10px] text-gray-400 mt-1">Joined: ${new Date(s.createdAt).toLocaleDateString()}</p>
                </td>
                <td class="px-4 py-4 whitespace-nowrap">
                    <div class="flex flex-col text-sm">
                        <span><strong class="text-gray-900">${s.successfulTransactions || 0}</strong> Sales</span>
                        <span class="text-yellow-600"><i class="fas fa-star text-xs mr-1"></i>${(s.sellerRating || 5).toFixed(1)}</span>
                    </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-center">
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="openSupportModal('${s._id}', '${s.fullName.replace(/'/g, "\\'")}', '${s.email}', ${s.isStudentVerified}, ${s.isEmailVerified}, ${s.sellerVerified})" 
                            class="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded" title="Tools & Verification">
                            <i class="fas fa-tools"></i>
                        </button>
                        <button onclick="toggleProStatus('${s._id}')" 
                            class="${s.isProSeller ? 'text-gray-400 hover:text-red-500' : 'text-gold hover:bg-orange-50'} p-1.5 rounded" 
                            title="${s.isProSeller ? 'Revoke PRO' : 'Upgrade to PRO'}">
                            <i class="fas fa-crown"></i>
                        </button>
                    </div>
                </td>
                <td class="px-4 py-4 whitespace-nowrap text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button onclick="openWarnModal('${s._id}', '${s.fullName.replace(/'/g, "\\'")}')" 
                            class="text-amber-500 hover:bg-amber-50 p-1.5 rounded" title="Send Official Warning">
                            <i class="fas fa-exclamation-triangle"></i>
                        </button>
                        ${!isSuspended ? `
                        <button onclick="openSuspendModal('${s._id}', '${s.fullName.replace(/'/g, "\\'")}')" 
                            class="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Suspend Seller">
                            <i class="fas fa-ban"></i>
                        </button>` : `
                        <button disabled class="text-gray-300 p-1.5 rounded cursor-not-allowed" title="Already Suspended">
                            <i class="fas fa-ban"></i>
                        </button>
                        `}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function renderPagination(pageData) {
    const container = document.getElementById('sellers-pagination');
    if (!container || !pageData || pageData.pages <= 1) {
        container.innerHTML = '';
        return;
    }

    let html = `<p class="text-sm text-gray-500">Showing page ${pageData.page} of ${pageData.pages} (${pageData.total} sellers)</p>`;
    html += `<div class="flex gap-2">`;
    if (pageData.page > 1) {
        html += `<button onclick="loadSellers(${pageData.page - 1})" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">Prev</button>`;
    }
    if (pageData.page < pageData.pages) {
        html += `<button onclick="loadSellers(${pageData.page + 1})" class="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">Next</button>`;
    }
    html += `</div>`;
    container.innerHTML = html;
}

// ==========================================
// ACTIONS & MODALS
// ==========================================

// Global state for modals
let activeSellerId = null;

function showToast(message, type = 'success') {
    // Basic fallback toast, in real app assumes you have showToast globally
    if (window.showToast) {
        window.showToast(message, type);
    } else {
        alert(message);
    }
}

// --- SUPPORT MODAL ---
function openSupportModal(id, name, email, isStudentVerified, isEmailVerified, sellerVerified) {
    activeSellerId = id;
    document.getElementById('support-seller-name').textContent = name;
    document.getElementById('support-seller-email').textContent = email;
    
    document.getElementById('verify-student').checked = isStudentVerified;
    document.getElementById('verify-email').checked = isEmailVerified;
    document.getElementById('verify-store').checked = sellerVerified;
    
    document.getElementById('reset-link-container').classList.add('hidden');
    document.getElementById('reset-link-output').value = '';
    
    document.getElementById('support-modal').classList.remove('hidden');
}

function closeSupportModal() {
    activeSellerId = null;
    document.getElementById('support-modal').classList.add('hidden');
}

async function saveVerification() {
    if (!activeSellerId) return;
    const payload = {
        isStudentVerified: document.getElementById('verify-student').checked,
        isEmailVerified: document.getElementById('verify-email').checked,
        sellerVerified: document.getElementById('verify-store').checked
    };

    try {
        const res = await fetch(`${API_BASE}/admin/sellers/${activeSellerId}/verify`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Verification update failed');
        showToast('Verification manually updated', 'success');
        closeSupportModal();
        loadSellers(currentPage);
    } catch (err) {
        console.error(err);
        showToast('Failed to update verification', 'error');
    }
}

async function generateResetLink() {
    if (!activeSellerId) return;
    try {
        const res = await fetch(`${API_BASE}/admin/sellers/${activeSellerId}/reset-password`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Reset link failed');
        const data = await res.json();
        
        const c = document.getElementById('reset-link-container');
        const i = document.getElementById('reset-link-output');
        i.value = data.resetUrl;
        c.classList.remove('hidden');
        i.select(); // Auto select for copy
        showToast('Link generated', 'success');
    } catch (err) {
        console.error(err);
        showToast('Failed to generate link', 'error');
    }
}

// --- SUSPEND MODAL ---
function openSuspendModal(id, name) {
    activeSellerId = id;
    document.getElementById('suspend-seller-name').textContent = name;
    document.getElementById('suspend-reason').value = '';
    document.getElementById('suspend-hide-products').checked = true;
    document.getElementById('suspend-modal').classList.remove('hidden');
}

function closeSuspendModal() {
    activeSellerId = null;
    document.getElementById('suspend-modal').classList.add('hidden');
}

async function confirmSuspendSeller() {
    if (!activeSellerId) return;
    const reason = document.getElementById('suspend-reason').value.trim();
    if (!reason) {
        alert('Please provide a reason for suspension.');
        return;
    }
    const hideProducts = document.getElementById('suspend-hide-products').checked;

    try {
        const res = await fetch(`${API_BASE}/admin/sellers/${activeSellerId}/suspend`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ reason, hideProducts })
        });
        if (!res.ok) throw new Error('Suspension failed');
        
        showToast('Seller suspended successfully', 'success');
        closeSuspendModal();
        loadSellers(currentPage);
        loadSellerAnalytics(); // Update KPI counts
    } catch (err) {
        console.error(err);
        showToast('Failed to suspend seller', 'error');
    }
}

// --- WARN MODAL ---
function openWarnModal(id, name) {
    activeSellerId = id;
    document.getElementById('warn-seller-name').textContent = name;
    document.getElementById('warn-message').value = '';
    document.getElementById('warn-modal').classList.remove('hidden');
}

function closeWarnModal() {
    activeSellerId = null;
    document.getElementById('warn-modal').classList.add('hidden');
}

async function confirmSendWarning() {
    if (!activeSellerId) return;
    const message = document.getElementById('warn-message').value.trim();
    if (!message) {
        alert('Please enter a warning message.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/admin/sellers/${activeSellerId}/warn`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        if (!res.ok) throw new Error('Warning failed');
        
        showToast('Warning sent successfully', 'success');
        closeWarnModal();
    } catch (err) {
        console.error(err);
        showToast('Failed to send warning', 'error');
    }
}

// --- TOGGLE PRO STATUS ---
async function toggleProStatus(id) {
    if (!confirm('Are you sure you want to change this seller\'s PRO status?')) return;
    
    try {
        const res = await fetch(`${API_BASE}/admin/sellers/${id}/pro`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) throw new Error('Pro toggle failed');
        
        const data = await res.json();
        showToast(`Pro status ${data.isProSeller ? 'activated' : 'deactivated'}`, 'success');
        loadSellers(currentPage);
        loadSellerAnalytics(); // Update KPI counts
    } catch (err) {
        console.error(err);
        showToast('Failed to toggle Pro status', 'error');
    }
}
