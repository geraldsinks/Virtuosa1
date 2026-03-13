document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    // Check seller access
    try {
        const response = await fetch('/api/user/profile', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Not authorized');
        }

        const user = await response.json();
        if (!user.isSeller) {
            alert('Access denied. Seller privileges required.');
            window.location.href = '/pages/buyer-dashboard.html';
            return;
        }
    } catch (error) {
        console.error('Seller check failed:', error);
        window.location.href = '/pages/login.html';
        return;
    }

    let dashboardData = null;
    let salesChart = null;

    // Load dashboard data
    await loadDashboardData();

    async function loadDashboardData() {
        try {
            const response = await fetch('/api/seller/dashboard', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load dashboard data');
            }

            dashboardData = await response.json();
            updateUI();
            initializeCharts();
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showMessage('Error loading dashboard data', true);
        }
    }

    function updateUI() {
        if (!dashboardData) return;

        // Update seller info
        const sellerName = document.getElementById('seller-name');
        const sellerVerified = document.getElementById('seller-verified');
        const sellerPro = document.getElementById('seller-pro');
        const userGreeting = document.getElementById('user-greeting');
        const verificationCard = document.getElementById('verification-card');

        if (sellerName) sellerName.textContent = dashboardData.seller.name;
        if (userGreeting) userGreeting.textContent = `Hello, ${dashboardData.seller.name}`;

        // Handle verification status
        if (dashboardData.seller.isVerified) {
            if (sellerVerified) sellerVerified.classList.remove('hidden');
            if (verificationCard) verificationCard.classList.add('hidden');
        } else {
            if (sellerVerified) sellerVerified.classList.add('hidden');
            if (verificationCard) verificationCard.classList.remove('hidden');
        }

        if (dashboardData.seller.isPro) {
            if (sellerPro) sellerPro.classList.remove('hidden');
            const proFeatures = document.getElementById('pro-features');
            if (proFeatures) proFeatures.classList.remove('hidden');
        }

        // Update stats
        document.getElementById('total-revenue').textContent = `ZMW ${dashboardData.stats.totalRevenue.toFixed(2)}`;
        document.getElementById('active-listings').textContent = dashboardData.stats.activeListings;
        document.getElementById('sold-items').textContent = dashboardData.stats.soldItems;
        document.getElementById('seller-rating').textContent = dashboardData.seller.rating.toFixed(1);

        // Update stars preview
        updateRatingStars(dashboardData.seller.rating);

        // Update recent transactions
        updateRecentTransactions();

        // Update recent reviews
        updateRecentReviews();

        // Update Activity Feed
        updateActivityFeed();

        // Update Active Listings
        updateActiveListings();

        // Update store settings fields
        const storeNameInput = document.getElementById('store-name-input');
        const storeDescInput = document.getElementById('store-desc-input');
        const storeSlugInput = document.getElementById('store-slug-input');
        const shopLinkContainer = document.getElementById('shop-link-container');
        const publicShopLink = document.getElementById('public-shop-link');

        if (storeNameInput && dashboardData.seller.storeName) storeNameInput.value = dashboardData.seller.storeName;
        if (storeDescInput && dashboardData.seller.storeDescription) storeDescInput.value = dashboardData.seller.storeDescription;
        if (storeSlugInput && dashboardData.seller.storeSlug) {
            storeSlugInput.value = dashboardData.seller.storeSlug;
            if (shopLinkContainer) shopLinkContainer.classList.remove('hidden');
            if (publicShopLink) {
                const fullLink = `${window.location.origin}/pages/seller-shop.html?shop=${dashboardData.seller.storeSlug}`;
                publicShopLink.href = fullLink;
                publicShopLink.textContent = fullLink;
            }
        }

        // Initialize/Refresh Lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // Store Settings Save Logic
    const saveStoreBtn = document.getElementById('save-store-settings');
    if (saveStoreBtn) {
        saveStoreBtn.addEventListener('click', async () => {
            const storeName = document.getElementById('store-name-input').value.trim();
            const storeDescription = document.getElementById('store-desc-input').value.trim();
            const storeSlug = document.getElementById('store-slug-input').value.trim();

            if (!storeName) {
                showMessage('Store name is required', true);
                return;
            }

            try {
                saveStoreBtn.disabled = true;
                const originalContent = saveStoreBtn.innerHTML;
                saveStoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';

                const response = await fetch('/api/seller/store-settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ storeName, storeDescription, storeSlug })
                });

                const data = await response.json();
                if (response.ok) {
                    showMessage('Store settings saved successfully!');
                    // Update local data and UI
                    dashboardData.seller.storeName = data.storeName;
                    dashboardData.seller.storeDescription = data.storeDescription;
                    dashboardData.seller.storeSlug = data.storeSlug;
                    updateUI();
                } else {
                    showMessage(data.message || 'Failed to save settings', true);
                    saveStoreBtn.disabled = false;
                    saveStoreBtn.innerHTML = originalContent;
                }
            } catch (error) {
                console.error('Error saving store settings:', error);
                showMessage('An error occurred while saving', true);
                saveStoreBtn.disabled = false;
            }
        });
    }

    // Copy Shop Link Logic
    const copyShopLinkBtn = document.getElementById('copy-shop-link');
    if (copyShopLinkBtn) {
        copyShopLinkBtn.addEventListener('click', () => {
            const link = document.getElementById('public-shop-link').href;
            navigator.clipboard.writeText(link).then(() => {
                showMessage('Link copied to clipboard!');
            }).catch(err => {
                console.error('Copy failed:', err);
                showMessage('Failed to copy. Please copy manually.', true);
            });
        });
    }

    function updateRatingStars(rating) {
        const container = document.getElementById('rating-stars-preview');
        if (!container) return;

        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= Math.floor(rating)) {
                starsHtml += '<i data-lucide="star" class="w-5 h-5 fill-current text-yellow-400"></i>';
            } else if (i === Math.ceil(rating) && rating % 1 !== 0) {
                starsHtml += '<i data-lucide="star-half" class="w-5 h-5 fill-current text-yellow-400"></i>';
            } else {
                starsHtml += '<i data-lucide="star" class="w-5 h-5 text-gray-300"></i>';
            }
        }
        container.innerHTML = starsHtml;
    }

    function updateRecentTransactions() {
        const container = document.getElementById('recent-transactions');
        if (!container || !dashboardData.recentTransactions) return;

        if (dashboardData.recentTransactions.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8">
                    <i data-lucide="shopping-cart" class="w-12 h-12 text-gray-300 mx-auto mb-3"></i>
                    <p class="text-gray-500">No orders yet. Keep listing!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = dashboardData.recentTransactions.map(transaction => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100 group">
                <div class="flex items-center space-x-4">
                    <div class="bg-white p-2 rounded-lg shadow-sm group-hover:shadow transition-shadow">
                        <i data-lucide="package" class="w-6 h-6 text-navy"></i>
                    </div>
                    <div>
                        <p class="font-bold text-navy">${transaction.product.name}</p>
                        <p class="text-xs text-gray-500">Buyer: ${transaction.buyer.fullName}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="font-bold text-navy">ZMW ${transaction.totalAmount}</p>
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusColor(transaction.status)}">
                        ${transaction.status}
                    </span>
                </div>
            </div>
        `).join('');
    }

    function updateRecentReviews() {
        // ... (previous code)
    }

    function updateActiveListings() {
        const container = document.getElementById('active-listings-container');
        if (!container || !dashboardData.products) return;

        const activeListings = dashboardData.products.filter(p => p.status === 'Active');

        if (activeListings.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-8">
                    <p class="text-gray-500">No active listings.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activeListings.map(product => `
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col justify-between">
                <div class="flex items-center space-x-4 mb-4">
                    <img src="${product.images?.[0] || 'https://placehold.co/100x100?text=No+Image'}" 
                         class="w-16 h-16 rounded-lg object-cover shadow-sm" alt="${product.name}">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-navy truncate">${product.name}</h3>
                        <p class="text-gold font-bold">ZMW ${product.price}</p>
                        <p class="text-[10px] text-gray-500 uppercase">${product.category}</p>
                    </div>
                </div>
                <div class="flex gap-2 border-t pt-3 mt-auto">
                    <button onclick="window.location.href='/pages/product-detail.html?id=${product._id}'"
                        class="flex-1 bg-white border border-gray-200 text-navy text-xs py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold flex items-center justify-center gap-1">
                        <i data-lucide="eye" class="w-3 h-3"></i> View
                    </button>
                    <button onclick="editProduct('${product._id}')"
                        class="flex-1 bg-white border border-gray-200 text-blue-600 text-xs py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors font-semibold flex items-center justify-center gap-1">
                        <i data-lucide="edit-2" class="w-3 h-3"></i> Edit
                    </button>
                    <button onclick="deleteProduct('${product._id}')"
                        class="flex-1 bg-white border border-gray-200 text-red-600 text-xs py-2 px-3 rounded-lg hover:bg-red-50 transition-colors font-semibold flex items-center justify-center gap-1">
                        <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    }

    window.editProduct = (productId) => {
        window.location.href = `/pages/edit-product.html?id=${productId}`;
    };

    window.deleteProduct = async (productId) => {
        if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/products/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                if (window.showToast) {
                    window.showToast('Listing deleted successfully');
                } else {
                    alert('Listing deleted successfully');
                }
                // Reload data
                loadDashboardData();
            } else {
                const data = await response.json();
                alert(data.message || 'Failed to delete listing');
            }
        } catch (error) {
            console.error('Error deleting product:', error);
            alert('An error occurred while deleting the listing');
        }
    };

    async function updateActivityFeed() {
        const container = document.getElementById('activity-feed');
        if (!container) return;

        try {
            const response = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const notifications = await response.json();

            if (notifications.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-sm">No recent activity.</p>';
                return;
            }

            container.innerHTML = notifications.slice(0, 5).map(note => {
                const icon = note.type === 'Transaction' ? 'shopping-bag' : 'bell';
                const color = note.type === 'Transaction' ? 'blue' : 'gold';

                return `
                    <div class="flex items-start space-x-3 group">
                        <div class="bg-${color}-100 rounded-full p-2 group-hover:scale-110 transition-transform">
                            <i data-lucide="${icon}" class="w-4 h-4 text-${color}-600"></i>
                        </div>
                        <div class="flex-1 border-b border-gray-50 pb-3 group-last:border-0">
                            <p class="text-sm font-semibold text-navy leading-tight">${note.title}</p>
                            <p class="text-xs text-gray-500 mt-1">${note.message}</p>
                            <p class="text-[10px] text-gray-400 mt-1">${formatTimeAgo(new Date(note.createdAt))}</p>
                        </div>
                    </div>
                `;
            }).join('');

            if (window.lucide) window.lucide.createIcons();
        } catch (error) {
            console.error('Error loading activity feed:', error);
        }
    }

    function formatTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return Math.floor(seconds) + " seconds ago";
    }

    function generateStars(rating) {
        let stars = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                stars += '<span class="text-yellow-500">★</span>';
            } else {
                stars += '<span class="text-gray-300">★</span>';
            }
        }
        return stars;
    }

    function getStatusColor(status) {
        switch (status) {
            case 'Completed': return 'bg-green-100 text-green-800';
            case 'Pending': return 'bg-yellow-100 text-yellow-800';
            case 'Confirmed': return 'bg-blue-100 text-blue-800';
            case 'Shipped': return 'bg-purple-100 text-purple-800';
            case 'Disputed': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    function initializeCharts() {
        const ctx = document.getElementById('salesChart');
        if (!ctx || !dashboardData) return;

        // Build last-7-days labels
        const last7Days = [];
        const revenueByDay = {};

        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const key = date.toISOString().slice(0, 10);
            last7Days.push(label);
            revenueByDay[key] = 0;
        }

        // Aggregate real revenue from completed transactions
        if (dashboardData.recentTransactions && dashboardData.recentTransactions.length > 0) {
            dashboardData.recentTransactions.forEach(t => {
                if (t.status === 'Completed' && t.createdAt) {
                    const key = new Date(t.createdAt).toISOString().slice(0, 10);
                    if (key in revenueByDay) {
                        revenueByDay[key] += (t.sellerPayout || t.totalAmount || 0);
                    }
                }
            });
        }

        const salesData = Object.values(revenueByDay);
        const hasData = salesData.some(v => v > 0);

        if (salesChart) {
            salesChart.destroy();
        }

        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: last7Days,
                datasets: [{
                    label: 'Revenue (ZMW)',
                    data: salesData,
                    borderColor: 'rgb(255, 215, 0)',
                    backgroundColor: 'rgba(255, 215, 0, 0.08)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: 'rgb(255, 215, 0)',
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ZMW ${ctx.parsed.y.toFixed(2)}`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.04)' },
                        ticks: {
                            callback: value => 'ZMW ' + value
                        }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });

        // Show a "no data yet" overlay if there are no completed transactions
        const noDataOverlay = document.getElementById('chart-no-data');
        if (noDataOverlay) {
            noDataOverlay.classList.toggle('hidden', hasData);
        }
    }

    // Action handlers
    window.addProduct = () => {
        window.location.href = '/pages/add-product.html';
    };

    window.viewProducts = () => {
        window.location.href = '/pages/my-products.html';
    };

    function showMessage(message, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${isError ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
            }`;
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // Auto-refresh dashboard every 30 seconds
    setInterval(loadDashboardData, 30000);
});
