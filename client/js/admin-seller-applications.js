// admin-seller-applications.js — Admin review logic for seller applications
const API_BASE = "https://virtuosa-server.onrender.com/api";

let currentPage = 1;
let rejectingAppId = null;

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }
    loadApplications();
    loadStats();
});

// ==============================
// LOAD APPLICATIONS
// ==============================

async function loadApplications() {
    const token = localStorage.getItem('token');
    const status = document.getElementById('filter-status').value;
    const sellerType = document.getElementById('filter-type').value;
    const university = document.getElementById('filter-university').value;

    const params = new URLSearchParams({ page: currentPage, limit: 20 });
    if (status) params.append('status', status);
    if (sellerType) params.append('sellerType', sellerType);
    if (university) params.append('university', university);

    try {
        const response = await fetch(`${API_BASE}/admin/seller-applications?${params}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Failed to load applications');
        }

        const data = await response.json();
        renderApplications(data.applications);
        renderPagination(data.pagination);
    } catch (error) {
        console.error('Load applications error:', error);
        document.getElementById('applications-list').innerHTML = `
            <div class="text-center py-12 text-red-400">
                <i class="fas fa-exclamation-circle text-2xl mb-3"></i>
                <p>Failed to load applications. Please try again.</p>
            </div>
        `;
    }
}

async function loadStats() {
    const token = localStorage.getItem('token');
    try {
        // Load counts for each status
        const [pending, approved, rejected] = await Promise.all([
            fetch(`${API_BASE}/admin/seller-applications?status=Pending&limit=1`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
            fetch(`${API_BASE}/admin/seller-applications?status=Approved&limit=1`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json()),
            fetch(`${API_BASE}/admin/seller-applications?status=Rejected&limit=1`, { headers: { 'Authorization': `Bearer ${token}` } }).then(r => r.json())
        ]);

        const p = pending.pagination?.total || 0;
        const a = approved.pagination?.total || 0;
        const r = rejected.pagination?.total || 0;

        document.getElementById('stat-total').textContent = p + a + r;
        document.getElementById('stat-pending').textContent = p;
        document.getElementById('stat-approved').textContent = a;
        document.getElementById('stat-rejected').textContent = r;
    } catch (e) {
        console.warn('Stats load failed:', e);
    }
}

// ==============================
// RENDER APPLICATIONS
// ==============================

function renderApplications(applications) {
    const container = document.getElementById('applications-list');

    if (!applications || applications.length === 0) {
        container.innerHTML = `
            <div class="text-center py-16">
                <div class="text-4xl mb-3">📋</div>
                <h3 class="text-lg font-semibold text-gray-700">No applications found</h3>
                <p class="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
        `;
        return;
    }

    container.innerHTML = applications.map(app => renderAppCard(app)).join('');
}

function renderAppCard(app) {
    const statusBadge = getStatusBadge(app.status);
    const typeBadge = getTypeBadge(app.sellerType);
    const timeAgo = getTimeAgo(app.submittedAt);
    const userName = app.personalInfo?.fullName || app.user?.fullName || 'Unknown';
    const userEmail = app.personalInfo?.email || app.user?.email || '';
    const university = app.personalInfo?.university || '';
    const phone = app.personalInfo?.phoneNumber || '';
    const categories = (app.sellingInfo?.categories || []).join(', ') || 'Not specified';
    const storeName = app.sellingInfo?.storeName || 'No store name';

    const isPending = app.status === 'Pending';

    return `
        <div class="app-card" id="app-${app._id}">
            <div class="p-5">
                <!-- Header -->
                <div class="flex flex-wrap items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <h3 class="text-lg font-bold text-gray-900 truncate">${escapeHtml(userName)}</h3>
                            ${statusBadge}
                            ${typeBadge}
                        </div>
                        <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                            <span><i class="fas fa-envelope mr-1"></i>${escapeHtml(userEmail)}</span>
                            <span><i class="fas fa-phone mr-1"></i>${escapeHtml(phone)}</span>
                            <span><i class="fas fa-clock mr-1"></i>${timeAgo}</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                        <button onclick="toggleDetails('${app._id}')" class="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition">
                            <i class="fas fa-eye mr-1"></i> Details
                        </button>
                        ${isPending ? `
                            <button onclick="approveApplication('${app._id}')" class="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition">
                                <i class="fas fa-check mr-1"></i> Approve
                            </button>
                            <button onclick="openRejectModal('${app._id}')" class="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition">
                                <i class="fas fa-times mr-1"></i> Reject
                            </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Quick Summary -->
                <div class="mt-3 flex flex-wrap gap-4 text-xs">
                    <div><span class="text-gray-400">University:</span> <span class="font-medium text-gray-700">${escapeHtml(university)}</span></div>
                    <div><span class="text-gray-400">Store:</span> <span class="font-medium text-gray-700">${escapeHtml(storeName)}</span></div>
                    <div><span class="text-gray-400">Categories:</span> <span class="font-medium text-gray-700">${escapeHtml(categories)}</span></div>
                </div>

                ${app.status === 'Rejected' ? `
                    <div class="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">
                        <span class="font-semibold text-red-700">Rejection Reason:</span>
                        <span class="text-red-600">${escapeHtml(app.rejectionReason || 'No reason provided')}</span>
                    </div>
                ` : ''}
            </div>

            <!-- Expandable Details -->
            <div class="hidden border-t border-gray-100" id="details-${app._id}">
                <div class="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                    ${renderDetailSection('Personal Information', [
        { label: 'Full Name', value: userName },
        { label: 'Student/Staff ID', value: app.personalInfo?.studentId },
        { label: 'University', value: university },
        { label: 'NRC Number', value: app.personalInfo?.nrcNumber },
        { label: 'Phone', value: phone },
        { label: 'Email', value: userEmail },
        { label: 'Year of Study', value: app.personalInfo?.yearOfStudy },
        { label: 'Program', value: app.personalInfo?.program }
    ])}
                    ${renderDetailSection('Campus Location', [
        { label: 'Campus', value: app.campusLocation?.campus },
        { label: 'Physical Access', value: app.campusLocation?.physicalAccess ? 'Yes' : 'No' },
        { label: 'Pickup Location', value: app.campusLocation?.pickupLocation },
        { label: 'Can Deliver', value: app.campusLocation?.canDeliver ? 'Yes' : 'No' },
        { label: 'Delivery Radius', value: app.campusLocation?.deliveryRadius ? app.campusLocation.deliveryRadius + ' km' : null }
    ])}
                    ${renderDetailSection('Selling Info', [
        { label: 'Categories', value: categories },
        { label: 'Other Category', value: app.sellingInfo?.otherCategory },
        { label: 'Experience', value: formatExperience(app.sellingInfo?.sellingExperience) },
        { label: 'Current Channels', value: (app.sellingInfo?.currentSaleChannels || []).join(', ') },
        { label: 'Store Name', value: storeName },
        { label: 'Description', value: app.sellingInfo?.storeDescription }
    ])}
                    ${renderDetailSection('Inventory & Source', [
        { label: 'Sources', value: (app.inventorySource?.sources || []).join(', ') },
        { label: 'Other Source', value: app.inventorySource?.otherSource },
        { label: 'Planned Items', value: app.inventorySource?.plannedItemCount }
    ])}
                    ${renderDetailSection('Payment Preferences', [
        { label: 'Methods', value: (app.paymentPreferences?.methods || []).join(', ') },
        { label: 'Understands Commission', value: app.paymentPreferences?.understandsCommission }
    ])}
                    ${renderDetailSection('Delivery Arrangements', [
        { label: 'Methods', value: (app.deliveryArrangements?.methods || []).join(', ') },
        { label: 'Meetup Location', value: app.deliveryArrangements?.meetupLocation }
    ])}
                    ${renderDetailSection('Verification', [
        { label: 'Documents', value: (app.verification?.documents || []).join(', ') },
        { label: 'Willing to Orient', value: app.verification?.willingToOrient ? 'Yes' : 'No' }
    ])}
                    ${renderDetailSection('Agreements', [
        { label: 'Enrolled Confirm', value: app.agreements?.enrolledConfirm ? '✅' : '❌' },
        { label: 'No Prohibited Items', value: app.agreements?.noProhibitedItems ? '✅' : '❌' },
        { label: 'No Scamming', value: app.agreements?.noScamming ? '✅' : '❌' },
        { label: 'Respect Commitment', value: app.agreements?.respectCommitment ? '✅' : '❌' },
        { label: 'Accurate Descriptions', value: app.agreements?.accurateDescriptions ? '✅' : '❌' }
    ])}
                    ${app.additionalContext?.challenges || app.additionalContext?.trustFactors || app.additionalContext?.referralName ?
            renderDetailSection('Additional Context', [
                { label: 'Challenges', value: app.additionalContext?.challenges },
                { label: 'Trust Factors', value: app.additionalContext?.trustFactors },
                { label: 'Referral', value: app.additionalContext?.referralName }
            ]) : ''
        }
                </div>
                ${app.reviewedBy ? `
                    <div class="px-5 pb-4 text-xs text-gray-400">
                        Reviewed by ${escapeHtml(app.reviewedBy?.fullName || 'Admin')} on ${formatDate(app.reviewedAt)}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderDetailSection(title, items) {
    const filteredItems = items.filter(i => i.value);
    if (filteredItems.length === 0) return '';

    return `
        <div class="detail-section">
            <h4 class="font-bold text-gray-800 text-sm mb-2"><i class="fas fa-folder-open text-gray-400 mr-1"></i>${title}</h4>
            ${filteredItems.map(i => `
                <div class="mb-1.5">
                    <div class="detail-label">${i.label}</div>
                    <div class="detail-value">${escapeHtml(String(i.value))}</div>
                </div>
            `).join('')}
        </div>
    `;
}

// ==============================
// ACTIONS
// ==============================

window.toggleDetails = function (id) {
    const el = document.getElementById(`details-${id}`);
    const card = document.getElementById(`app-${id}`);
    if (el) {
        el.classList.toggle('hidden');
        card.classList.toggle('expanded');
    }
};

window.approveApplication = async function (id) {
    if (!confirm('Approve this seller application? The user will be notified and granted seller access.')) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE}/admin/seller-applications/${id}/approve`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ notes: '' })
        });

        const result = await response.json();
        if (response.ok) {
            showToast('Application approved successfully! ✅');
            loadApplications();
            loadStats();
        } else {
            showToast(result.message || 'Failed to approve application', 'error');
        }
    } catch (error) {
        console.error('Approve error:', error);
        showToast('An error occurred', 'error');
    }
};

window.openRejectModal = function (id) {
    rejectingAppId = id;
    document.getElementById('reject-modal').classList.add('active');
    document.getElementById('reject-reason-select').value = '';
    document.getElementById('reject-reason-text').value = '';
};

window.closeRejectModal = function () {
    rejectingAppId = null;
    document.getElementById('reject-modal').classList.remove('active');
};

window.confirmReject = async function () {
    if (!rejectingAppId) return;

    let reason = document.getElementById('reject-reason-select').value;
    const notes = document.getElementById('reject-reason-text').value.trim();

    if (reason === 'Other' && notes) reason = notes;
    else if (reason === 'Other') reason = 'Other (no details provided)';

    if (!reason) {
        alert('Please select or provide a rejection reason.');
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`${API_BASE}/admin/seller-applications/${rejectingAppId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ reason, notes })
        });

        const result = await response.json();
        if (response.ok) {
            showToast('Application rejected.');
            closeRejectModal();
            loadApplications();
            loadStats();
        } else {
            showToast(result.message || 'Failed to reject', 'error');
        }
    } catch (error) {
        console.error('Reject error:', error);
        showToast('An error occurred', 'error');
    }
};

// ==============================
// PAGINATION
// ==============================

function renderPagination(pagination) {
    if (!pagination || pagination.totalPages <= 1) {
        document.getElementById('pagination-container').innerHTML = '';
        return;
    }

    let html = '<div class="flex gap-2">';
    for (let i = 1; i <= pagination.totalPages; i++) {
        const active = i === pagination.page ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200';
        html += `<button onclick="goToPage(${i})" class="px-3 py-1.5 rounded-lg text-sm font-medium ${active} transition">${i}</button>`;
    }
    html += '</div>';
    document.getElementById('pagination-container').innerHTML = html;
}

window.goToPage = function (page) {
    currentPage = page;
    loadApplications();
};

// ==============================
// HELPERS
// ==============================

function getStatusBadge(status) {
    const classes = { Pending: 'badge-pending', Approved: 'badge-approved', Rejected: 'badge-rejected' };
    const icons = { Pending: 'clock', Approved: 'check', Rejected: 'times' };
    return `<span class="badge ${classes[status] || ''}"><i class="fas fa-${icons[status] || 'question'} mr-1"></i>${status}</span>`;
}

function getTypeBadge(type) {
    const map = {
        Student: { cls: 'badge-student', label: '🎓 Student' },
        CampusBusiness: { cls: 'badge-campus', label: '🏪 Campus Business' },
        ExternalVendor: { cls: 'badge-external', label: '🏬 External Vendor' },
        Cooperative: { cls: 'badge-cooperative', label: '🤝 Cooperative' }
    };
    const t = map[type] || { cls: '', label: type };
    return `<span class="badge ${t.cls}">${t.label}</span>`;
}

function formatExperience(exp) {
    const map = { first_time: 'First time seller', sold_casually: 'Sold casually before', existing_business: 'Existing business' };
    return map[exp] || exp;
}

function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(dateStr);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-ZM', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-admin');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast-admin fixed top-5 right-5 z-50 px-6 py-3 rounded-xl font-semibold text-sm shadow-xl ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`;
    toast.style.animation = 'slideIn 0.3s ease';
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'} mr-2"></i>${message}`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}
