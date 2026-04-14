// Seller Dashboard JavaScript
// API_BASE is provided by config.js

let salesChart = null; // Global variable to store chart instance



// Check seller access and update UI
async function checkSellerAccess(token) {
    try {
        const response = await fetch(`${API_BASE}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            let errorMessage = 'Not authorized';
            if (response.status === 401) {
                errorMessage = 'Session expired. Please log in again.';
            } else if (response.status === 403) {
                errorMessage = 'Access denied. Please verify your credentials.';
            }
            throw new Error(errorMessage);
        }

        const user = await response.json();
        
        // Check if user is seller or admin
        if (!user.isSeller && !user.isAdmin) {
            showMessage('Access denied. Seller or admin privileges required.', true);
            setTimeout(() => {
                if (window.router) {
                    window.router.navigate('/dashboard');
                } else {
                    window.location.href = '/dashboard';
                }
            }, 2000);
            return;
        }

        // Check admin role and update UI
        const isAdmin = user.isAdmin === true || user.isAdmin === 'true' || user.role === 'admin';
        if (isAdmin) {
            const dropdownAdminLink = document.getElementById('admin-link');
            const desktopAdminLink = document.getElementById('desktop-admin-link');
            
            if (dropdownAdminLink) {
                dropdownAdminLink.classList.remove('hidden');
            }
            
            if (desktopAdminLink) {
                desktopAdminLink.style.display = 'flex';
            }
        }



        // Update seller links in desktop menu
        const sellerLinks = document.getElementById('seller-links');
        if (sellerLinks && user.isSeller) {
            sellerLinks.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('Seller check failed:', error);
        showMessage(error.message || 'Authentication failed', true);
        setTimeout(() => {
            if (window.router) {
                window.router.navigate('/login');
            } else {
                window.location.href = '/login';
            }
        }, 2000);
        return;
    }
}

// Helper function to fix URLs to point to server
function fixServerUrl(url) {
    if (!url) return url;
    return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

// Make the helper function globally available
window.fixServerUrl = fixServerUrl;

document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        if (window.router) {
            window.router.navigate('/login');
        } else {
            window.location.href = '/login';
        }
        return;
    }

    // Check dashboard access using role manager
    if (window.roleManager) {
        try {
            const hasAccess = await window.roleManager.requireDashboardAccess('seller');
            if (!hasAccess) {
                return; // Redirect will be handled by role manager
            }
        } catch (error) {
            console.error('❌ Dashboard access check failed:', error);
            // Fallback: Check seller access the old way
            await checkSellerAccess(token);
        }
    } else {
        // Fallback: Check seller access the old way
        await checkSellerAccess(token);
    }

    // Debug: Log token and API base
    console.log('🔍 Debug - Token exists:', !!token);
    console.log('🔍 Debug - Token length:', token?.length);
    console.log('🔍 Debug - API_BASE:', API_BASE);

    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }



    // Test API connectivity first
    try {
        const testResponse = await fetch(`${API_BASE}/auth/test`);
        if (testResponse.ok) {
            console.log('✅ API connectivity test passed');
        } else {
            console.warn('⚠️ API connectivity test failed');
        }
    } catch (error) {
        console.error('❌ API connectivity test error:', error);
        showMessage('Unable to connect to server. Please check your internet connection.', true);
        return;
    }

    // Load dashboard data
    await loadDashboardData();

    // Check for notifications periodically
    setInterval(checkNotifications, 30000); // Check every 30 seconds
    await checkNotifications(); // Initial check

    async function loadDashboardData() {
        try {
            const response = await fetch(`${API_BASE}/seller/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = 'Failed to load dashboard data';
                
                if (response.status === 401) {
                    errorMessage = 'Session expired. Please log in again.';
                    setTimeout(() => {
                        if (window.router) {
                            window.router.navigate('/login');
                        } else {
                            window.location.href = '/login';
                        }
                    }, 2000);
                } else if (response.status === 403) {
                    errorMessage = 'Seller access required. Please verify your seller account.';
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                }
                
                throw new Error(errorMessage);
            }

            dashboardData = await response.json();
            console.log('Dashboard data received:', dashboardData);
            updateUI();
            initializeCharts();
            await loadTokenBalance(); // Load seller's token balance
        } catch (error) {
            console.error('Error loading dashboard:', error);
            showMessage(error.message || 'Error loading dashboard data', true);
            
            // Hide loading indicators
            const loadingElements = document.querySelectorAll('.animate-pulse');
            loadingElements.forEach(el => el.classList.remove('animate-pulse'));
            
            // Show error state in dashboard sections
            const errorContainer = document.getElementById('recent-transactions');
            if (errorContainer) {
                errorContainer.innerHTML = `
                    <div class="text-center py-8">
                        <i data-lucide="alert-circle" class="w-12 h-12 text-red-200 mx-auto mb-3"></i>
                        <p class="text-red-500 font-medium">Unable to load dashboard data</p>
                        <p class="text-gray-500 text-sm mt-1">${error.message}</p>
                        <button onclick="loadDashboardData()" class="mt-3 px-4 py-2 bg-gold text-navy rounded-lg text-sm font-semibold hover:bg-yellow-400 transition-colors">
                            Retry
                        </button>
                    </div>
                `;
            }
        }
    }

    function updateUI() {
        if (!dashboardData) return;

        // Update seller info
        const sellerName = document.getElementById('seller-name');
        const userGreeting = document.getElementById('user-greeting');
        const verificationCard = document.getElementById('verification-card');

        // Use seller object first, then fallback to buyer for backward compatibility
        const sellerInfo = dashboardData.seller || dashboardData.buyer || {};
        console.log('Using seller info:', sellerInfo);
        if (sellerName) sellerName.textContent = sellerInfo.name || 'Seller';
        if (userGreeting) userGreeting.textContent = `Hello, ${sellerInfo.name || 'Seller'}`;

        // Handle verification status
        const sellerVerified = document.getElementById('seller-verified');
        if (sellerInfo.isStudentVerified) {
            if (sellerVerified) sellerVerified.classList.remove('hidden');
            if (verificationCard) verificationCard.classList.add('hidden');
        } else {
            if (sellerVerified) sellerVerified.classList.add('hidden');
            // Temporarily hide verification banner as per user request
            // if (verificationCard) verificationCard.classList.remove('hidden');
            if (verificationCard) verificationCard.classList.add('hidden');
        }

        const sellerPro = document.getElementById('seller-pro');
        if (sellerInfo.isPro) {
            if (sellerPro) sellerPro.classList.remove('hidden');
            const proFeatures = document.getElementById('pro-features');
            if (proFeatures) proFeatures.classList.remove('hidden');
        }

        // Update stats
        const stats = dashboardData.stats || {};
        console.log('Stats received from server:', stats);
        console.log('TotalRevenue type:', typeof stats.totalRevenue, 'value:', stats.totalRevenue);
        document.getElementById('total-revenue').textContent = `ZMW ${(stats.totalRevenue || 0).toFixed(2)}`;
        document.getElementById('active-listings').textContent = stats.activeListings || 0;
        document.getElementById('sold-items').textContent = stats.soldItems || 0;
        document.getElementById('seller-rating').textContent = (sellerInfo.rating || 0).toFixed(1);
        
        // Update token balance
        const tokenBalance = document.getElementById('token-balance');
        if (tokenBalance) {
            tokenBalance.textContent = sellerInfo.tokenBalance || 0;
        }

        // Update stars preview
        updateRatingStars(sellerInfo.rating || 0);

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
        
        if (storeNameInput) storeNameInput.value = sellerInfo.storeName || '';
        if (storeDescInput) storeDescInput.value = sellerInfo.storeDescription || '';
        if (storeSlugInput) storeSlugInput.value = sellerInfo.storeSlug || '';

        if (sellerInfo.storeSlug) {
            if (shopLinkContainer) shopLinkContainer.classList.remove('hidden');
            if (publicShopLink) {
                const fullLink = `${window.location.origin}/seller/${sellerInfo.storeSlug}`;
                publicShopLink.href = fullLink;
                publicShopLink.textContent = fullLink;
            }
        } else {
            if (shopLinkContainer) shopLinkContainer.classList.add('hidden');
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

                const response = await fetch(`${API_BASE}/seller/store-settings`, {
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
                    if (!dashboardData.seller) dashboardData.seller = {};
                    dashboardData.seller.storeName = data.storeName;
                    dashboardData.seller.storeDescription = data.storeDescription;
                    dashboardData.seller.storeSlug = data.storeSlug;
                    updateUI();
                    // Reset button state
                    saveStoreBtn.disabled = false;
                    saveStoreBtn.innerHTML = originalContent;
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
                    <p class="font-bold text-navy">ZMW ${transaction.totalAmount || transaction.amount || 0}</p>
                    <span class="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusColor(transaction.status)}">
                        ${transaction.status}
                    </span>
                    <div class="mt-2 space-x-1">
                        ${getOrderActionButtons(transaction)}
                    </div>
                </div>
            </div>
        `).join('');
    }

    function getOrderActionButtons(transaction) {
        switch (transaction.status) {
            case 'pending_seller_confirmation':
                return `
                    <button onclick="updateOrderStatus('${transaction._id}', 'confirmed_by_seller')" 
                        class="text-[10px] px-2 py-1 bg-green-600 text-white rounded font-bold hover:bg-green-700 transition-colors uppercase">
                        Accept
                    </button>
                    <button onclick="updateOrderStatus('${transaction._id}', 'declined')" 
                        class="text-[10px] px-2 py-1 bg-red-600 text-white rounded font-bold hover:bg-red-700 transition-colors uppercase">
                        Decline
                    </button>
                `;
            case 'confirmed_by_seller':
                return `
                    <button onclick="markAsShipped('${transaction._id}')" 
                        class="text-[10px] px-2 py-1 bg-purple-600 text-white rounded font-bold hover:bg-purple-700 transition-colors uppercase">
                        Ship
                    </button>
                `;
            case 'Shipped':
                return `
                    <button onclick="updateOrderStatus('${transaction._id}', 'delivered_pending_confirmation')" 
                        class="text-[10px] px-2 py-1 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 transition-colors uppercase">
                        Delivered
                    </button>
                `;
            case 'delivered_pending_confirmation':
            case 'delivered':
            case 'Delivered':
                return `
                    <span class="text-[10px] text-orange-600 font-bold uppercase">Awaiting Buyer</span>
                `;
            case 'Completed':
            case 'completed':
                return `
                    <span class="text-[10px] text-green-600 font-bold uppercase">Completed</span>
                `;
            case 'declined':
            case 'Cancelled':
            case 'cancelled':
                return `
                    <span class="text-[10px] text-red-600 font-bold uppercase">Cancelled</span>
                `;
            case 'disputed':
                return `
                    <button onclick="window.location.href='/pages/dispute-details.html?id=${transaction._id}'" 
                        class="text-[10px] px-2 py-1 bg-red-100 text-red-600 rounded font-bold hover:bg-red-200 transition-colors uppercase border border-red-200">
                        View Dispute
                    </button>
                `;
            default:
                return '';
        }
    }

    window.markAsShipped = async (orderId) => {
        const tracking = prompt("Enter tracking number (optional):");
        await updateOrderStatus(orderId, 'Shipped', tracking);
    };

    // Update order status function
    window.updateOrderStatus = async (orderId, newStatus, trackingNumber = null) => {
        if (!confirm(`Are you sure you want to ${newStatus.toLowerCase()} this order?`)) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus, trackingNumber: trackingNumber })
            });

            if (response.ok) {
                showMessage(`Order ${newStatus.toLowerCase()} successfully!`, false);
                await loadDashboardData(); // Reload dashboard data
                await checkNotifications(); // Check for new notifications
            } else {
                const error = await response.json();
                showMessage(error.message || 'Failed to update order', true);
            }
        } catch (error) {
            console.error('Error updating order:', error);
            showMessage('Failed to update order', true);
        }
    };

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

        container.innerHTML = activeListings.map(product => {
            const isPersistent = product.listingType === 'persistent';
            const inventory = product.inventory || 1;
            const totalSold = product.totalSold || 0;
            const isOutOfStock = isPersistent && inventory <= 0;
            const isLowStock = isPersistent && inventory <= 2 && inventory > 0;

            return `
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col justify-between">
                <div class="flex items-center space-x-4 mb-4">
                    <img src="${fixServerUrl(product.images?.[0]) || 'https://placehold.co/100x100?text=No+Image'}" 
                         class="w-16 h-16 rounded-lg object-cover shadow-sm" alt="${product.name}">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-bold text-navy truncate">${product.name}</h3>
                        <p class="text-gold font-bold">ZMW ${product.price}</p>
                        <p class="text-[10px] text-gray-500 uppercase">${product.category}</p>
                        
                        <!-- Inventory Status Badges -->
                        <div class="flex flex-wrap gap-1 mt-2">
                            ${isPersistent ? `
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <i class="fas fa-box mr-1"></i>Persistent
                                </span>
                            ` : `
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    <i class="fas fa-tag mr-1"></i>One-Time
                                </span>
                            `}
                            ${isOutOfStock ? `
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <i class="fas fa-times-circle mr-1"></i>Out of Stock
                                </span>
                            ` : ''}
                            ${isLowStock && !isOutOfStock ? `
                                <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    <i class="fas fa-exclamation-triangle mr-1"></i>Low Stock
                                </span>
                            ` : ''}
                        </div>
                    </div>
                </div>
                
                ${isPersistent ? `
                    <div class="text-sm text-gray-600 mb-3 bg-white p-2 rounded">
                        <div class="flex items-center justify-between">
                            <span><i class="fas fa-box mr-1"></i>Stock: ${inventory}</span>
                            <span><i class="fas fa-shopping-cart mr-1"></i>Sold: ${totalSold}</span>
                        </div>
                    </div>
                ` : ''}
                
                <div class="space-y-3 border-t pt-3 mt-auto">
                    <!-- Primary Actions -->
                    <div class="flex gap-2">
                        <button onclick="window.router ? window.router.navigate('/product/${product._id}') : window.location.href='/product/${product._id}'"
                            class="flex-1 bg-white border border-gray-200 text-navy text-xs py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors font-semibold flex items-center justify-center gap-1">
                            <i data-lucide="eye" class="w-3 h-3"></i> View
                        </button>
                        <button onclick="editProduct('${product._id}')"
                            class="flex-1 bg-white border border-gray-200 text-blue-600 text-xs py-2 px-3 rounded-lg hover:bg-blue-50 transition-colors font-semibold flex items-center justify-center gap-1">
                            <i data-lucide="edit-2" class="w-3 h-3"></i> Edit
                        </button>
                    </div>
                    
                    <!-- Secondary Actions -->
                    <div class="flex gap-2">
                        ${isPersistent ? `
                            <button onclick="manageStock('${product._id}')" 
                                class="flex-1 bg-green-50 border border-green-200 text-green-700 text-xs py-2 px-3 rounded-lg hover:bg-green-100 transition-colors font-semibold flex items-center justify-center gap-1">
                                <i data-lucide="package" class="w-3 h-3"></i> Stock
                            </button>
                        ` : ''}
                        <button onclick="convertListingType('${product._id}')" 
                            class="flex-1 bg-purple-50 border border-purple-200 text-purple-700 text-xs py-2 px-3 rounded-lg hover:bg-purple-100 transition-colors font-semibold flex items-center justify-center gap-1">
                            <i data-lucide="refresh-cw" class="w-3 h-3"></i> Convert
                        </button>
                        <button onclick="deleteProduct('${product._id}')"
                            class="flex-1 bg-red-50 border border-red-200 text-red-700 text-xs py-2 px-3 rounded-lg hover:bg-red-100 transition-colors font-semibold flex items-center justify-center gap-1">
                            <i data-lucide="trash-2" class="w-3 h-3"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
        }).join('');
    }

    window.editProduct = (productId) => {
        if (window.router) {
            window.router.navigate(`/edit-product?id=${productId}`);
        } else {
            window.location.href = `/edit-product?id=${productId}`;
        }
    };

    window.deleteProduct = async (productId) => {
        if (!confirm('Are you sure you want to delete this listing? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/products/${productId}`, {
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
            const response = await fetch(`${API_BASE}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();

            // Handle both array and paginated response formats
            let notifications = [];
            if (Array.isArray(data)) {
                notifications = data;
            } else if (data && data.notifications && Array.isArray(data.notifications)) {
                notifications = data.notifications;
            } else {
                console.error('Expected array but received:', typeof data, data);
                container.innerHTML = '<p class="text-gray-500 text-sm">Error loading activity feed.</p>';
                return;
            }

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

    // Update chart date range
    window.updateChartDateRange = function() {
        const days = parseInt(document.getElementById('dateRangeSelector').value);
        console.log(`Updating chart to show last ${days} days`);
        initializeCharts(days);
    };

    function getStatusColor(status) {
        switch (status) {
            case 'pending_seller_confirmation': return 'bg-yellow-100 text-yellow-800';
            case 'confirmed_by_seller': return 'bg-blue-100 text-blue-800';
            case 'Shipped':
            case 'out_for_delivery': return 'bg-purple-100 text-purple-800';
            case 'delivered_pending_confirmation': 
            case 'delivered': 
            case 'Delivered': return 'bg-orange-100 text-orange-800';
            case 'Completed': 
            case 'completed': return 'bg-green-100 text-green-800';
            case 'disputed': 
            case 'Disputed': return 'bg-red-100 text-red-800';
            case 'declined':
            case 'Cancelled':
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }

    function initializeCharts(days = 7) {
        const ctx = document.getElementById('salesChart');
        if (!ctx || !dashboardData) return;

        console.log(`Initializing charts with ${days} days range`);

        // Debug: Log transactions data
        console.log('Dashboard transactions for chart:', dashboardData.recentTransactions);
        console.log('Sample transaction for chart:', dashboardData.recentTransactions?.[0]);

        // Build date range based on selected period
        const lastDays = [];
        const revenueByDay = {};

        console.log(`Building date range for ${days} days - current date:`, new Date());
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const key = date.toISOString().slice(0, 10);
            lastDays.push(label);
            revenueByDay[key] = 0;
            console.log(`Date range: ${key} (${label})`);
        }

        // Aggregate real revenue from completed transactions
        if (dashboardData.recentTransactions && dashboardData.recentTransactions.length > 0) {
            dashboardData.recentTransactions.forEach(t => {
                // Check for various completed status variations
                const isCompleted = ['completed', 'Completed', 'delivered', 'Delivered'].includes(t.status);
                console.log(`Transaction ${t._id}: status=${t.status}, isCompleted=${isCompleted}, createdAt=${t.createdAt}`);
                
                if (isCompleted && t.createdAt) {
                    const key = new Date(t.createdAt).toISOString().slice(0, 10);
                    console.log(`Transaction date key: ${key}, available keys: ${Object.keys(revenueByDay)}`);
                    
                    if (key in revenueByDay) {
                        // Use multiple possible field names for revenue amount
                        const amount = t.sellerPayout || t.sellerAmount || t.totalAmount || t.amount || 0;
                        console.log(`Adding ${amount} to ${key} from transaction:`, {
                            status: t.status,
                            sellerPayout: t.sellerPayout,
                            sellerAmount: t.sellerAmount,
                            totalAmount: t.totalAmount,
                            amount: t.amount
                        });
                        revenueByDay[key] += amount;
                    } else {
                        console.log(`Transaction date ${key} is outside the 7-day window, skipping`);
                    }
                }
            });
        }

        const salesData = Object.values(revenueByDay);
        const hasData = salesData.some(v => v > 0);

        if (salesChart && typeof salesChart.destroy === 'function') {
            salesChart.destroy();
        }

        salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: lastDays,
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
        window.location.href = '/create-product';
    };

    window.viewProducts = () => {
        window.location.href = '/my-products';
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

    // Check for new notifications
    async function checkNotifications() {
        try {
            const response = await fetch(`${API_BASE}/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                
                // Handle both array and paginated response formats
                let notifications = [];
                if (Array.isArray(data)) {
                    notifications = data;
                } else if (data && data.notifications && Array.isArray(data.notifications)) {
                    notifications = data.notifications;
                } else {
                    console.error('Expected array but received:', typeof data, data);
                    return;
                }
                
                const unreadCount = notifications.filter(n => !n.isRead).length;
                
                // Update notification badges
                updateNotificationBadges(unreadCount);

                // Show notification for new orders
                const newOrderNotifications = notifications.filter(n => 
                    !n.isRead && n.type === 'Transaction' && n.message.includes('new order')
                );
                
                if (newOrderNotifications.length > 0) {
                    showMessage(`You have ${newOrderNotifications.length} new order(s)!`);
                }
            }
        } catch (error) {
            console.error('Error checking notifications:', error);
        }
    }

    // Update notification badges
    function updateNotificationBadges(count) {
        const badges = document.querySelectorAll('#notification-badge, #notification-badge-desktop');
        badges.forEach(badge => {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        });
    }

    // Load seller's token balance
    async function loadTokenBalance() {
        try {
            const response = await fetch(`${API_BASE}/user/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const user = await response.json();
                const tokenBalanceElement = document.getElementById('seller-token-balance');
                if (tokenBalanceElement) {
                    tokenBalanceElement.textContent = user.tokenBalance || 0;
                }
            }
        } catch (error) {
            console.error('Error loading token balance:', error);
        }
    }

    // Show token rewards modal (reused from orders page)
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
                                    <span class="text-sm">Complete Order Delivery</span>
                                </div>
                                <span class="bg-green-600 text-white px-2 py-1 rounded text-sm font-semibold">+5</span>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                <div class="flex items-center">
                                    <i class="fas fa-star text-blue-600 mr-3"></i>
                                    <span class="text-sm">Receive Product Reviews</span>
                                </div>
                                <span class="bg-blue-600 text-white px-2 py-1 rounded text-sm font-semibold">+3</span>
                            </div>
                            <div class="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                                <div class="flex items-center">
                                    <i class="fas fa-camera text-purple-600 mr-3"></i>
                                    <span class="text-sm">Quality Product Photos</span>
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

    // Inventory Management Functions
    window.manageStock = (productId) => {
        const product = dashboardData.products.find(p => p._id === productId);
        if (!product) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-navy">Manage Stock</h3>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="text-gray-400 hover:text-gray-600 transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-3 mb-4">
                    <p class="text-sm font-medium text-navy">${product.name}</p>
                    <p class="text-xs text-gray-500">ZMW ${product.price} • ${product.category}</p>
                </div>
                
                <div class="space-y-4">
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <label class="block text-sm font-medium text-blue-900 mb-2">
                            <i data-lucide="package" class="w-4 h-4 inline mr-1"></i>
                            Current Stock Quantity
                        </label>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="this.nextElementSibling.stepDown()" 
                                    class="w-8 h-8 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors flex items-center justify-center">
                                <i data-lucide="minus" class="w-3 h-3"></i>
                            </button>
                            <input type="number" id="stock-quantity" min="0" value="${product.inventory || 1}"
                                   class="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-gold focus:outline-none text-center font-semibold">
                            <button type="button" onclick="this.previousElementSibling.stepUp()" 
                                    class="w-8 h-8 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors flex items-center justify-center">
                                <i data-lucide="plus" class="w-3 h-3"></i>
                            </button>
                        </div>
                        <p class="text-xs text-blue-700 mt-1">Set to 0 to mark as out of stock</p>
                    </div>
                    
                    <div class="bg-orange-50 border border-orange-200 rounded-lg p-3">
                        <label class="block text-sm font-medium text-orange-900 mb-2">
                            <i data-lucide="alert-triangle" class="w-4 h-4 inline mr-1"></i>
                            Low Stock Alert Threshold
                        </label>
                        <input type="number" id="low-stock-threshold" min="1" value="${product.lowStockThreshold || 2}"
                               class="w-full px-3 py-2 border border-orange-300 rounded-lg focus:ring-2 focus:ring-gold focus:outline-none text-center font-semibold">
                        <p class="text-xs text-orange-700 mt-1">Get notified when stock reaches this level</p>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3 mt-6">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                        Cancel
                    </button>
                    <button onclick="updateStock('${productId}')" 
                            class="px-4 py-2 bg-gold text-navy rounded-lg hover:bg-yellow-400 transition-colors font-semibold flex items-center gap-2">
                        <i data-lucide="check" class="w-4 h-4"></i>
                        Update Stock
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Re-initialize Lucide icons for the new modal
        if (window.lucide) window.lucide.createIcons();
    };

    window.updateStock = async (productId) => {
        try {
            const quantity = parseInt(document.getElementById('stock-quantity').value) || 1;
            const lowStockThreshold = parseInt(document.getElementById('low-stock-threshold').value) || 2;

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/products/${productId}/stock`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inventory: quantity,
                    lowStockThreshold: lowStockThreshold
                })
            });

            if (response.ok) {
                await loadDashboardData(); // Reload dashboard data
                document.querySelector('.fixed').remove(); // Close modal
                showMessage('Stock updated successfully', false);
            } else {
                throw new Error('Failed to update stock');
            }
        } catch (error) {
            console.error('Error updating stock:', error);
            showMessage('Failed to update stock', true);
        }
    };

    window.convertListingType = (productId) => {
        const product = dashboardData.products.find(p => p._id === productId);
        if (!product) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="text-lg font-bold text-navy">Convert Listing Type</h3>
                    <button onclick="this.closest('.fixed').remove()" 
                            class="text-gray-400 hover:text-gray-600 transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                
                <div class="bg-gray-50 rounded-lg p-3 mb-4">
                    <p class="text-sm font-medium text-navy">${product.name}</p>
                    <p class="text-xs text-gray-500">ZMW ${product.price} • ${product.category}</p>
                </div>
                
                <div class="space-y-3">
                    <label class="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${product.listingType !== 'persistent' ? 'border-gold bg-gold/10' : 'border-gray-200'}">
                        <input type="radio" name="listingType" value="one_time" ${product.listingType !== 'persistent' ? 'checked' : ''}
                               class="w-4 h-4 text-gold">
                        <div class="ml-3 flex-1">
                            <div class="font-medium text-navy flex items-center">
                                <i data-lucide="tag" class="w-4 h-4 mr-2"></i>
                                One-Time Sale
                            </div>
                            <div class="text-sm text-gray-600 mt-1">Perfect for unique items or single quantities</div>
                        </div>
                    </label>
                    
                    <label class="flex items-center p-3 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${product.listingType === 'persistent' ? 'border-gold bg-gold/10' : 'border-gray-200'}">
                        <input type="radio" name="listingType" value="persistent" ${product.listingType === 'persistent' ? 'checked' : ''}
                               class="w-4 h-4 text-gold">
                        <div class="ml-3 flex-1">
                            <div class="font-medium text-navy flex items-center">
                                <i data-lucide="package" class="w-4 h-4 mr-2"></i>
                                Persistent Listing
                            </div>
                            <div class="text-sm text-gray-600 mt-1">For multiple quantities with inventory tracking</div>
                        </div>
                    </label>
                    
                    <div id="inventory-field" class="${product.listingType === 'persistent' ? '' : 'hidden'}">
                        <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <label class="block text-sm font-medium text-blue-900 mb-2">
                                <i data-lucide="package" class="w-4 h-4 inline mr-1"></i>
                                Initial Stock Quantity
                            </label>
                            <input type="number" id="convert-inventory" min="1" value="${product.inventory || 1}"
                                   class="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-gold focus:outline-none text-center font-semibold">
                            <p class="text-xs text-blue-700 mt-1">How many items do you have available?</p>
                        </div>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3 mt-6">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
                        Cancel
                    </button>
                    <button onclick="performConversion('${productId}')" 
                            class="px-4 py-2 bg-gold text-navy rounded-lg hover:bg-yellow-400 transition-colors font-semibold flex items-center gap-2">
                        <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                        Convert Listing
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Show/hide inventory field based on selection
        modal.querySelectorAll('input[name="listingType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const inventoryField = document.getElementById('inventory-field');
                const labels = modal.querySelectorAll('label');
                
                // Update border styles
                labels.forEach(label => {
                    label.classList.remove('border-gold', 'bg-gold/10');
                    label.classList.add('border-gray-200');
                });
                
                // Highlight selected option
                e.target.closest('label').classList.remove('border-gray-200');
                e.target.closest('label').classList.add('border-gold', 'bg-gold/10');
                
                if (e.target.value === 'persistent') {
                    inventoryField.classList.remove('hidden');
                } else {
                    inventoryField.classList.add('hidden');
                }
            });
        });
        
        // Re-initialize Lucide icons for the new modal
        if (window.lucide) window.lucide.createIcons();
    };

    window.performConversion = async (productId) => {
        try {
            const listingType = document.querySelector('input[name="listingType"]:checked').value;
            const inventory = listingType === 'persistent' ? 
                parseInt(document.getElementById('convert-inventory').value) || 1 : 1;

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/products/${productId}/listing-type`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    listingType,
                    inventory
                })
            });

            if (response.ok) {
                await loadDashboardData(); // Reload dashboard data
                document.querySelector('.fixed').remove(); // Close modal
                showMessage('Listing type converted successfully', false);
            } else {
                throw new Error('Failed to convert listing type');
            }
        } catch (error) {
            console.error('Error converting listing type:', error);
            showMessage('Failed to convert listing type', true);
        }
    };

    // Auto-refresh dashboard every 30 seconds
    setInterval(() => {
        loadDashboardData();
        checkNotifications();
    }, 30000);
});
