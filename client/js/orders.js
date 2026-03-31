// Orders Management System with Real-time Updates
let currentPage = 1;
let currentFilter = '';
let socket = null;

// Initialize socket connection for real-time updates
function initializeSocket() {
    try {
        socket = io();
        
        // Listen for connection events
        socket.on('connect', () => {
            console.log('🔌 Socket connected successfully');
            
            // Authenticate socket
            const token = localStorage.getItem('token');
            if (token) {
                socket.emit('authenticate', token);
            }
        });

        socket.on('disconnect', () => {
            console.log('🔌 Socket disconnected');
        });

        socket.on('connect_error', (error) => {
            console.error('🔌 Socket connection error:', error);
        });

        // Listen for real-time order status updates
        socket.on('order_status_updated', (data) => {
            console.log('🔄 Real-time order update received:', data);
            handleRealTimeOrderUpdate(data);
        });

        // Listen for order update errors
        socket.on('order_update_error', (error) => {
            console.error('❌ Order update error:', error);
            showToast(error.message, 'error');
        });

    } catch (error) {
        console.error('Socket initialization error:', error);
        socket = null;
    }
}

// Handle real-time order updates
function handleRealTimeOrderUpdate(data) {
    // Update the order in the current view if it exists
    const orderElements = document.querySelectorAll('[data-order-id]');
    orderElements.forEach(element => {
        if (element.dataset.orderId === data.orderId) {
            // Update status display
            const statusElement = element.querySelector('.order-status');
            if (statusElement) {
                const statusColor = getStatusColor(data.status);
                const statusIcon = getStatusIcon(data.status);
                const statusText = getStatusText(data.status);
                
                statusElement.className = `inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor}`;
                statusElement.innerHTML = `
                    <i class="${statusIcon} mr-1"></i>
                    ${statusText}
                `;
            }

            // Add animation to draw attention
            element.classList.add('ring-2', 'ring-green-500', 'ring-opacity-50');
            setTimeout(() => {
                element.classList.remove('ring-2', 'ring-green-500', 'ring-opacity-50');
            }, 2000);

            // Show toast notification
            showToast(`Order #${data.orderId.toString().slice(-8)} status updated to ${getStatusText(data.status)}`, 'success');
        }
    });

    // Reload orders to ensure data consistency
    setTimeout(() => {
        loadOrders(currentPage, currentFilter);
    }, 1000);
}

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

// Update order status in real-time
async function updateOrderStatus(orderId, status, trackingNumber = null, deliveryNotes = null) {
    try {
        // Try Socket.IO first if available, otherwise use HTTP
        if (socket && socket.connected) {
            // Emit order status update via socket
            socket.emit('update_order_status', {
                orderId,
                status,
                trackingNumber,
                deliveryNotes
            });

            console.log(`📤 Sent order status update: ${orderId} -> ${status}`);
        } else {
            // Fallback to HTTP request directly
            console.log('🔌 Socket not connected, using HTTP fallback');
            await updateOrderStatusHTTP(orderId, status, trackingNumber, deliveryNotes);
        }

    } catch (error) {
        console.error('❌ Error updating order status:', error);
        // Fallback to HTTP request
        await updateOrderStatusHTTP(orderId, status, trackingNumber, deliveryNotes);
    }
}

// HTTP fallback for order status updates
async function updateOrderStatusHTTP(orderId, status, trackingNumber = null, deliveryNotes = null) {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/orders/${orderId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status,
                trackingNumber,
                deliveryNotes
            })
        });

        if (response.ok) {
            showToast('Order status updated successfully', 'success');
            loadOrders(currentPage, currentFilter);
        } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update order status');
        }
    } catch (fallbackError) {
        console.error('❌ HTTP fallback failed:', fallbackError);
        showToast(fallbackError.message || 'Failed to update order status', 'error');
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
            <div class="bg-white rounded-lg shadow-md p-6 mb-4 border border-gray-200 hover:shadow-lg transition-shadow" data-order-id="${order._id}">
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h3 class="text-lg font-semibold text-navy">Order #${order._id ? order._id.slice(-8) : 'Unknown'}</h3>
                        <p class="text-sm text-gray-500">${new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div class="text-right">
                        <span class="order-status inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor}">
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
                
                <!-- Action buttons based on order status and user role -->
                <div class="mt-4 pt-4 border-t border-gray-200">
                    <div class="flex flex-wrap gap-2">
                        ${getOrderActionButtons(order)}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = ordersHtml;
    
    // Attach event listeners to action buttons
    attachOrderActionListeners();
}

// Get appropriate action buttons based on order status and user role
function getOrderActionButtons(order) {
    // This would need to be implemented based on user role (buyer/seller)
    // For now, return basic status update buttons
    const buttons = [];
    
    if (order.status === 'pending_seller_confirmation') {
        buttons.push(`
            <button onclick="updateOrderStatus('${order._id}', 'confirmed_by_seller')" 
                    class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                <i class="fas fa-check mr-2"></i>Confirm Order
            </button>
            <button onclick="updateOrderStatus('${order._id}', 'declined', null, 'Declined by seller')" 
                    class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                <i class="fas fa-times mr-2"></i>Decline Order
            </button>
        `);
    }
    
    if (order.status === 'confirmed_by_seller') {
        buttons.push(`
            <button onclick="showTrackingModal('${order._id}')" 
                    class="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                <i class="fas fa-truck mr-2"></i>Mark as Shipped
            </button>
        `);
    }
    
    if (order.status === 'out_for_delivery') {
        buttons.push(`
            <button onclick="updateOrderStatus('${order._id}', 'delivered_pending_confirmation', null, 'Order delivered')" 
                    class="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                <i class="fas fa-box mr-2"></i>Mark as Delivered
            </button>
        `);
    }
    
    if (order.status === 'delivered_pending_confirmation') {
        buttons.push(`
            <button onclick="updateOrderStatus('${order._id}', 'Completed', null, 'Delivery confirmed by buyer')" 
                    class="px-4 py-2 bg-gold text-navy rounded-lg hover:bg-yellow-500 transition-colors font-semibold">
                <i class="fas fa-check-double mr-2"></i>Confirm Delivery
            </button>
        `);
    }
    
    return buttons.join('');
}

// Attach event listeners to order action buttons
function attachOrderActionListeners() {
    // Event listeners are attached via onclick attributes in the HTML
    // This function can be extended for more complex event handling
}

// Show tracking modal for shipped orders
function showTrackingModal(orderId) {
    const trackingNumber = prompt('Enter tracking number:');
    if (trackingNumber) {
        updateOrderStatus(orderId, 'out_for_delivery', trackingNumber, 'Order shipped with tracking');
    }
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
        'Completed': 'bg-green-100 text-green-800', // legacy capitalized variant
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
        'Completed': 'Completed', // legacy capitalized variant
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

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-y-full transition-transform duration-300`;
    toast.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-full');
    }, 100);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize socket when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeSocket();
});

// Make functions globally available
window.loadOrders = loadOrders;
window.renderOrders = renderOrders;
window.updateOrderStatus = updateOrderStatus;
window.showTrackingModal = showTrackingModal;
