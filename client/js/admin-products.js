// Admin Products Management JavaScript
// API_BASE is provided by config.js

let monthlyChart = null;
let categoryChart = null;
let currentProductPage = 1;
let pendingDeleteId = null;
let pendingCautionId = null;
let sellerSearchTimeout = null;

// ============================================================
// TAB SWITCHING
// ============================================================
function switchProductTab(tabName, btn) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => { b.classList.remove('active'); b.classList.add('text-gray-500'); });
    const panel = document.getElementById(`tab-${tabName}`);
    if (panel) panel.classList.add('active');
    if (btn) { btn.classList.add('active'); btn.classList.remove('text-gray-500'); }

    if (tabName === 'analytics') loadAnalytics();
    else if (tabName === 'management') loadProducts();
}

// ============================================================
// ANALYTICS
// ============================================================
async function loadAnalytics() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/admin/products/analytics`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load analytics');
        const data = await res.json();
        renderAnalytics(data);
    } catch (err) {
        console.error('Analytics error:', err);
        showToast('Failed to load analytics', 'error');
    }
}

function renderAnalytics(data) {
    const k = data.kpis;
    document.getElementById('kpi-total').textContent = k.totalProducts.toLocaleString();
    document.getElementById('kpi-active').textContent = k.activeProducts.toLocaleString();
    document.getElementById('kpi-sold').textContent = k.soldProducts.toLocaleString();
    document.getElementById('kpi-removed').textContent = k.removedProducts.toLocaleString();
    document.getElementById('kpi-oos').textContent = k.outOfStockProducts.toLocaleString();
    document.getElementById('kpi-views').textContent = k.totalViews.toLocaleString();
    document.getElementById('kpi-favs').textContent = k.totalFavorites.toLocaleString();

    // Monthly trend chart
    const trendCtx = document.getElementById('monthlyTrendChart').getContext('2d');
    if (monthlyChart) monthlyChart.destroy();
    monthlyChart = new Chart(trendCtx, {
        type: 'line',
        data: {
            labels: data.monthlyTrend.map(m => m._id),
            datasets: [
                { label: 'New Products', data: data.monthlyTrend.map(m => m.count), borderColor: '#C19A6B', backgroundColor: 'rgba(193,154,107,0.1)', tension: 0.4, fill: true },
                { label: 'Views', data: data.monthlyTrend.map(m => m.totalViews), borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.05)', tension: 0.4, fill: true, yAxisID: 'y1' }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Products' } },
                y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Views' } }
            }
        }
    });

    // Category distribution chart
    const catCtx = document.getElementById('categoryChart').getContext('2d');
    if (categoryChart) categoryChart.destroy();
    const colors = ['#C19A6B','#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#06b6d4','#84cc16','#a855f7','#e11d48','#0ea5e9'];
    categoryChart = new Chart(catCtx, {
        type: 'doughnut',
        data: {
            labels: data.categoryDistribution.map(c => c._id || 'Unknown'),
            datasets: [{ data: data.categoryDistribution.map(c => c.count), backgroundColor: colors.slice(0, data.categoryDistribution.length) }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } }
    });

    // Top products lists
    renderTopList('top-views-list', data.topByViews, 'viewCount', 'views');
    renderTopList('top-sales-list', data.topBySales, 'totalSold', 'sales');
}

function renderTopList(containerId, items, metric, label) {
    const container = document.getElementById(containerId);
    if (!items || items.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-center py-4">No data yet</p>';
        return;
    }
    container.innerHTML = items.map((item, i) => {
        const imgSrc = item.images && item.images[0] ? item.images[0] : 'https://placehold.co/48x48?text=N/A';
        return `
            <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <span class="text-xs font-bold text-gray-400 w-5">${i + 1}</span>
                <img src="${imgSrc}" class="product-thumb" alt="${item.name}" loading="lazy">
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">${item.name}</p>
                    <p class="text-xs text-gray-500">${item.category} · ${item.sellerName || ''}</p>
                </div>
                <div class="text-right">
                    <p class="text-sm font-bold text-navy">${(item[metric] || 0).toLocaleString()}</p>
                    <p class="text-xs text-gray-400">${label}</p>
                </div>
            </div>`;
    }).join('');
}

// ============================================================
// PRODUCT MANAGEMENT TABLE
// ============================================================
async function loadProducts(page = 1) {
    currentProductPage = page;
    const token = localStorage.getItem('token');
    const search = document.getElementById('prod-search')?.value || '';
    const category = document.getElementById('prod-category')?.value || '';
    const status = document.getElementById('prod-status')?.value || '';

    try {
        const params = new URLSearchParams({ page, limit: 20, search, category, status });
        const res = await fetch(`${API_BASE}/admin/products?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load products');
        const data = await res.json();
        renderProductsTable(data.products);
        renderPagination(data.pagination);
    } catch (err) {
        console.error('Products error:', err);
        document.getElementById('products-table-body').innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-red-500">Failed to load products</td></tr>';
    }
}

function renderProductsTable(products) {
    const tbody = document.getElementById('products-table-body');
    if (!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="px-4 py-8 text-center text-gray-400"><i class="fas fa-box-open text-3xl mb-2 block"></i>No products found</td></tr>';
        return;
    }
    tbody.innerHTML = products.map(p => {
        const imgSrc = p.images && p.images[0] ? p.images[0] : 'https://placehold.co/48x48?text=N/A';
        const statusClass = `status-${(p.status || 'Active').replace(/\s+/g, '')}`;
        const sellerName = p.seller?.fullName || p.sellerName || 'Unknown';
        return `
            <tr class="hover:bg-gray-50 transition-colors">
                <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                        <img src="${imgSrc}" class="product-thumb" alt="" loading="lazy">
                        <div class="min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate max-w-[180px]">${p.name}</p>
                            <p class="text-xs text-gray-400">ID: ${p._id.substring(0, 8)}…</p>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">${sellerName}</td>
                <td class="px-4 py-3 text-xs text-gray-500">${p.category || '-'}</td>
                <td class="px-4 py-3 text-sm font-medium text-gray-900">K${(p.price || 0).toLocaleString()}</td>
                <td class="px-4 py-3"><span class="status-badge ${statusClass}">${p.status}</span></td>
                <td class="px-4 py-3 text-sm text-gray-500">${(p.viewCount || 0).toLocaleString()}</td>
                <td class="px-4 py-3 text-xs text-gray-400">${new Date(p.createdAt).toLocaleDateString()}</td>
                <td class="px-4 py-3">
                    <div class="flex items-center gap-1">
                        <a href="/product/${p._id}" target="_blank" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="View">
                            <i class="fas fa-external-link-alt text-xs"></i>
                        </a>
                        <button onclick="toggleFeature('${p._id}')" class="p-1.5 ${p.isFeatured ? 'text-amber-500' : 'text-gray-400'} hover:bg-amber-50 rounded" title="${p.isFeatured ? 'Unfeature' : 'Feature'}">
                            <i class="fas fa-star text-xs"></i>
                        </button>
                        <button onclick="openCautionModal('${p._id}', '${p.name.replace(/'/g, "\\'")}', '${sellerName.replace(/'/g, "\\'")}')" class="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Send Caution">
                            <i class="fas fa-exclamation-triangle text-xs"></i>
                        </button>
                        <button onclick="openDeleteModal('${p._id}', '${p.name.replace(/'/g, "\\'")}', '${sellerName.replace(/'/g, "\\'")}')" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Remove">
                            <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
    }).join('');
}

function renderPagination(pagination) {
    const container = document.getElementById('products-pagination');
    if (!pagination || pagination.pages <= 1) { container.innerHTML = ''; return; }
    const { page, pages, total } = pagination;
    container.innerHTML = `
        <p class="text-sm text-gray-500">${total} products total</p>
        <div class="flex items-center gap-1">
            <button onclick="loadProducts(${page - 1})" class="px-3 py-1 rounded text-sm ${page <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}" ${page <= 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
            <span class="text-sm text-gray-600 px-2">Page ${page} of ${pages}</span>
            <button onclick="loadProducts(${page + 1})" class="px-3 py-1 rounded text-sm ${page >= pages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'}" ${page >= pages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>`;
}

// ============================================================
// DELETE / CAUTION MODALS
// ============================================================
function openDeleteModal(id, name, seller) {
    pendingDeleteId = id;
    document.getElementById('delete-product-name').textContent = name;
    document.getElementById('delete-seller-name').textContent = seller;
    document.getElementById('delete-reason').value = '';
    document.getElementById('delete-modal').classList.remove('hidden');
}
function closeDeleteModal() { document.getElementById('delete-modal').classList.add('hidden'); pendingDeleteId = null; }

async function confirmDeleteProduct() {
    if (!pendingDeleteId) return;
    const reason = document.getElementById('delete-reason').value.trim();
    if (!reason) { showToast('Please enter a reason', 'error'); return; }

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/admin/products/${pendingDeleteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });
        if (!res.ok) throw new Error('Failed to remove product');
        showToast('Product removed and seller notified', 'success');
        closeDeleteModal();
        loadProducts(currentProductPage);
    } catch (err) {
        console.error('Delete error:', err);
        showToast('Failed to remove product', 'error');
    }
}

function openCautionModal(id, name, seller) {
    pendingCautionId = id;
    document.getElementById('caution-product-name').textContent = name;
    document.getElementById('caution-seller-name').textContent = seller;
    document.getElementById('caution-message').value = '';
    document.getElementById('caution-modal').classList.remove('hidden');
}
function closeCautionModal() { document.getElementById('caution-modal').classList.add('hidden'); pendingCautionId = null; }

async function confirmSendCaution() {
    if (!pendingCautionId) return;
    const message = document.getElementById('caution-message').value.trim();
    if (!message) { showToast('Please enter a caution message', 'error'); return; }

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/admin/products/caution`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: pendingCautionId, message })
        });
        if (!res.ok) throw new Error('Failed to send caution');
        showToast('Caution sent to seller', 'success');
        closeCautionModal();
    } catch (err) {
        console.error('Caution error:', err);
        showToast('Failed to send caution', 'error');
    }
}

// ============================================================
// FEATURE TOGGLE
// ============================================================
async function toggleFeature(id) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/admin/products/${id}/feature`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to toggle feature');
        const data = await res.json();
        showToast(data.message, 'success');
        loadProducts(currentProductPage);
    } catch (err) {
        console.error('Feature toggle error:', err);
        showToast('Failed to toggle feature', 'error');
    }
}

// ============================================================
// ASSISTED LISTING
// ============================================================
async function searchSellers() {
    clearTimeout(sellerSearchTimeout);
    const query = document.getElementById('seller-search').value.trim();
    const resultsDiv = document.getElementById('seller-results');

    if (query.length < 2) { resultsDiv.classList.add('hidden'); return; }

    sellerSearchTimeout = setTimeout(async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${API_BASE}/admin/sellers?search=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) throw new Error('Failed to search sellers');
            const sellers = await res.json();

            if (sellers.length === 0) {
                resultsDiv.innerHTML = '<p class="p-3 text-sm text-gray-400">No sellers found</p>';
            } else {
                resultsDiv.innerHTML = sellers.map(s => `
                    <button type="button" onclick="selectSeller('${s._id}', '${(s.fullName || '').replace(/'/g, "\\'")}')" 
                        class="w-full text-left px-3 py-2 hover:bg-amber-50 transition-colors text-sm border-b border-gray-100 last:border-0">
                        <span class="font-medium text-gray-900">${s.fullName}</span>
                        <span class="text-gray-400 ml-2">${s.email}</span>
                    </button>
                `).join('');
            }
            resultsDiv.classList.remove('hidden');
        } catch (err) {
            console.error('Seller search error:', err);
        }
    }, 300);
}

function selectSeller(id, name) {
    document.getElementById('selected-seller-id').value = id;
    document.getElementById('selected-seller-name').textContent = name;
    document.getElementById('selected-seller-badge').classList.remove('hidden');
    document.getElementById('seller-results').classList.add('hidden');
    document.getElementById('seller-search').value = '';
}

function clearSellerSelection() {
    document.getElementById('selected-seller-id').value = '';
    document.getElementById('selected-seller-badge').classList.add('hidden');
}

async function submitAssistedListing(event) {
    event.preventDefault();
    const sellerId = document.getElementById('selected-seller-id').value;
    if (!sellerId) { showToast('Please select a seller', 'error'); return; }

    const btn = document.getElementById('al-submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';
    btn.disabled = true;

    try {
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('sellerId', sellerId);
        formData.append('name', document.getElementById('al-name').value.trim());
        formData.append('description', document.getElementById('al-description').value.trim());
        formData.append('price', document.getElementById('al-price').value);
        const op = document.getElementById('al-original-price').value;
        if (op) formData.append('originalPrice', op);
        formData.append('category', document.getElementById('al-category').value);
        formData.append('condition', document.getElementById('al-condition').value);
        formData.append('campusLocation', document.getElementById('al-location').value.trim());

        const files = document.getElementById('al-images').files;
        for (let i = 0; i < files.length; i++) {
            formData.append('images', files[i]);
        }

        const res = await fetch(`${API_BASE}/admin/products/assisted`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to create listing');
        }
        showToast('Product listed on behalf of seller successfully!', 'success');
        document.getElementById('assisted-form').reset();
        clearSellerSelection();
    } catch (err) {
        console.error('Assisted listing error:', err);
        showToast(err.message || 'Failed to create listing', 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
function showToast(message, type = 'info') {
    const existing = document.querySelectorAll('.toast-notification');
    existing.forEach(e => e.remove());

    const colors = { success: 'bg-green-600', error: 'bg-red-600', info: 'bg-blue-600' };
    const toast = document.createElement('div');
    toast.className = `toast-notification fixed top-4 right-4 ${colors[type] || colors.info} text-white px-6 py-3 rounded-xl shadow-2xl z-[9999] text-sm font-medium`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// ============================================================
// INIT
// ============================================================
// INIT
document.addEventListener('DOMContentLoaded', async () => {
    // Check admin access first
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) return;

    loadAnalytics();

    // Bind enter key on search
    document.getElementById('prod-search')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') loadProducts();
    });
});
