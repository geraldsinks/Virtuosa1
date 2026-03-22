// Orders Management System
let currentPage = 1;
let currentFilter = '';

// Load orders with pagination and filtering
async function loadOrders(page = 1, statusFilter = '') {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('❌ No token found');
            return;
        }

        currentPage = page;
        currentFilter = statusFilter;

        // Build API URL with filters
        let apiUrl = `${API_BASE}/orders?page=${page}&limit=10`;
        if (statusFilter) {
            apiUrl += `&status=${statusFilter}`;
        }

        console.log(`🔍 Loading orders: page=${page}, status=${statusFilter}`);

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📋 Orders loaded:', data);

        // Render orders
        renderOrders(data.orders || data || []);
        
        // Update pagination
        updatePagination(data.pagination);

    } catch (error) {
        console.error('❌ Error loading orders:', error);
        showError('Failed to load orders');
    }
}

// Render orders in the DOM
function renderOrders(orders) {
    const container = document.getElementById('orders-container');
    if (!container) return;

    if (orders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-box-open text-4xl text-gray-400 mb-4"></i>
                <p class="text-gray-400">No orders found</p>
            </div>
        `;
        return;
    }

    const ordersHtml = orders.map(order => {
        const statusColor = getStatusColor(order.status);
        const statusIcon = getStatusIcon(order.status);
        const statusText = getStatusText(order.status);
        
        return `
            <div class="bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-navy">Order #${order._id ? order._id.slice(-8) : 'Unknown'}</h3>
                        <p class="text-sm text-gray-500">${new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="text-right">
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor}">
                            <i class="${statusIcon} mr-1"></i>
                            ${statusText}
                        </span>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-gray-500">Product</p>
                        <p class="font-medium">${order.product?.name || 'Unknown Product'}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Total</p>
                        <p class="font-medium">K${order.totalAmount || order.total || 0}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Quantity</p>
                        <p class="font-medium">${order.quantity || 1}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-500">Payment</p>
                        <p class="font-medium">${order.paymentMethod || 'N/A'}</p>
                    </div>
                </div>
                
                ${order.product ? `
                    <div class="mt-4 pt-4 border-t border-gray-200">
                        <h4 class="font-medium mb-2">Product Details</h4>
                        <div class="flex items-center space-x-4">
                            <img src="${order.product.images?.[0] || '/images/placeholder.jpg'}" 
                                 alt="${order.product.name || 'Product'}" 
                                 class="w-16 h-16 object-cover rounded">
                            <div class="flex-grow">
                                <p class="font-medium">${order.product.name}</p>
                                <p class="text-sm text-gray-500">K${order.product.price || 0} × ${order.quantity || 1}</p>
                            </div>
                            <p class="font-medium">K${(order.product.price || 0) * (order.quantity || 1)}</p>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');

    container.innerHTML = ordersHtml;
}

// Update pagination controls
function updatePagination(pagination) {
    const paginationContainer = document.getElementById('pagination-container');
    if (!paginationContainer || !pagination) return;

    const { currentPage, totalPages, hasNext, hasPrev } = pagination;
    
    let paginationHtml = '';
    
    if (hasPrev) {
        paginationHtml += `
            <button onclick="loadOrders(${currentPage - 1}, '${currentFilter}')" 
                    class="px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy-dark">
                <i class="fas fa-chevron-left mr-2"></i>Previous
            </button>
        `;
    }
    
    paginationHtml += `
        <span class="px-4 py-2 text-gray-600">
            Page ${currentPage} of ${totalPages}
        </span>
    `;
    
    if (hasNext) {
        paginationHtml += `
            <button onclick="loadOrders(${currentPage + 1}, '${currentFilter}')" 
                    class="px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy-dark">
                Next<i class="fas fa-chevron-right ml-2"></i>
            </button>
        `;
    }
    
    paginationContainer.innerHTML = paginationHtml;
}

// Helper functions for status styling
function getStatusColor(status) {
    const colors = {
        'pending_seller_confirmation': 'bg-yellow-100 text-yellow-800',
        'confirmed_by_seller': 'bg-blue-100 text-blue-800',
        'out_for_delivery': 'bg-purple-100 text-purple-800',
        'delivered_pending_confirmation': 'bg-green-100 text-green-800',
        'completed': 'bg-green-100 text-green-800',
        'declined': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

function getStatusIcon(status) {
    const icons = {
        'pending_seller_confirmation': 'fas fa-clock',
        'confirmed_by_seller': 'fas fa-check-circle',
        'out_for_delivery': 'fas fa-truck',
        'delivered_pending_confirmation': 'fas fa-box',
        'completed': 'fas fa-check-double',
        'declined': 'fas fa-times-circle'
    };
    return icons[status] || 'fas fa-question-circle';
}

function getStatusText(status) {
    const texts = {
        'pending_seller_confirmation': 'Pending Confirmation',
        'confirmed_by_seller': 'Confirmed',
        'out_for_delivery': 'Out for Delivery',
        'delivered_pending_confirmation': 'Delivered',
        'completed': 'Completed',
        'declined': 'Declined'
    };
    return texts[status] || status;
}

// Show error message
function showError(message) {
    const container = document.getElementById('orders-container');
    if (container) {
        container.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <i class="fas fa-exclamation-triangle text-red-500 text-2xl mb-2"></i>
                <p class="text-red-700">${message}</p>
            </div>
        `;
    }
}

// Make functions globally available
window.loadOrders = loadOrders;
window.renderOrders = renderOrders;
