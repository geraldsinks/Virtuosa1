// Order Details Page JavaScript
class OrderDetailsManager {
    constructor() {
        this.order = null;
        this.currentUserRole = null;
        this.init();
    }

    async init() {
        try {
            // Get order ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            const orderId = urlParams.get('id');
            
            if (!orderId) {
                this.showError('No order ID provided');
                return;
            }

            await this.loadOrderDetails(orderId);
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing order details:', error);
            this.showError('Failed to load order details');
        }
    }

    async loadOrderDetails(orderId) {
        try {
            const token = localStorage.getItem('token');
            
            if (!token) {
                this.showError('Please log in to view order details');
                return;
            }

            const response = await fetch(`${API_BASE}/orders/${orderId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.order = data.order;
                this.currentUserRole = data.userRole;
                this.renderOrderDetails();
                this.hideLoading();
            } else if (response.status === 404) {
                this.showError('Order not found');
            } else if (response.status === 403) {
                this.showError('You do not have permission to view this order');
            } else {
                this.showError('Failed to load order details');
            }
        } catch (error) {
            console.error('Error loading order details:', error);
            this.showError('Failed to load order details');
        }
    }

    renderOrderDetails() {
        if (!this.order) return;

        // Update status badge
        this.updateStatusBadge();
        
        // Update product information
        this.updateProductInfo();
        
        // Update delivery information
        this.updateDeliveryInfo();
        
        // Update timeline
        this.updateTimeline();
        
        // Update price breakdown
        this.updatePriceBreakdown();
        
        // Update contact information
        this.updateContactInfo();
        
        // Update action buttons
        this.updateActionButtons();
        
        // Show the order details
        document.getElementById('order-details').classList.remove('hidden');
    }

    updateStatusBadge() {
        const statusElement = document.getElementById('order-status');
        if (!statusElement) return;

        const statusConfig = this.getStatusConfig(this.order.status);
        statusElement.className = `status-badge ${statusConfig.class}`;
        statusElement.innerHTML = `
            <i class="${statusConfig.icon} mr-1"></i>
            ${this.formatStatusText(this.order.status)}
        `;
    }

    updateProductInfo() {
        const product = this.order.product;
        if (!product) return;

        // Update product image
        const imageElement = document.getElementById('product-image');
        if (imageElement && product.images?.[0]) {
            imageElement.src = this.fixServerUrl(product.images[0]);
            imageElement.alt = product.name;
        }

        // Update product details
        document.getElementById('product-name').textContent = product.name || 'Unknown Product';
        document.getElementById('product-description').textContent = product.description || 'No description available';
        document.getElementById('product-condition').textContent = product.condition || 'N/A';
        document.getElementById('product-category').textContent = product.category || 'N/A';
        document.getElementById('product-price').textContent = (product.price || 0).toFixed(2);
        
        // Update original price if available
        const originalPriceElement = document.getElementById('product-original-price');
        if (originalPriceElement && product.originalPrice && product.originalPrice > product.price) {
            originalPriceElement.textContent = `ZMW ${product.originalPrice.toFixed(2)}`;
            originalPriceElement.style.display = 'inline';
        } else {
            originalPriceElement.style.display = 'none';
        }
        
        document.getElementById('product-quantity').textContent = this.order.quantity || 1;
    }

    updateDeliveryInfo() {
        const deliveryMethod = document.getElementById('delivery-method');
        const deliveryAddressSection = document.getElementById('delivery-address-section');
        const trackingSection = document.getElementById('tracking-section');
        const trackingNumber = document.getElementById('tracking-number');
        const deliveryInstructionsSection = document.getElementById('delivery-instructions-section');
        const deliveryInstructions = document.getElementById('delivery-instructions');
        
        // New elements for recipient info
        const recipientSection = document.getElementById('delivery-recipient-section');
        const recipientName = document.getElementById('delivery-recipient-name');
        const recipientPhone = document.getElementById('delivery-recipient-phone');

        // Update delivery method
        if (deliveryMethod) {
            deliveryMethod.textContent = this.formatDeliveryMethod(this.order.deliveryMethod);
        }

        // Update delivery address and recipient info if available
        if (this.order.deliveryAddress) {
            const da = this.order.deliveryAddress;
            
            // Handle both object and string (backward compatibility)
            const isObject = typeof da === 'object' && da !== null;
            const addressText = isObject ? da.address : da;
            
            if (deliveryAddressSection && addressText) {
                deliveryAddressSection.classList.remove('hidden');
                document.getElementById('delivery-address').textContent = addressText;
            }

            if (isObject && recipientSection) {
                if (da.name || da.phone) {
                    recipientSection.classList.remove('hidden');
                    if (recipientName) recipientName.textContent = da.name || 'N/A';
                    if (recipientPhone) recipientPhone.textContent = da.phone || 'N/A';
                }
            }

            // Update delivery instructions if available in deliveryAddress object
            const instructions = isObject ? da.instructions : this.order.deliveryNotes;
            if (deliveryInstructionsSection && deliveryInstructions && instructions) {
                deliveryInstructionsSection.classList.remove('hidden');
                deliveryInstructions.textContent = instructions;
            }
        }

        // Update tracking information if available
        if (trackingSection && trackingNumber && this.order.trackingNumber) {
            trackingSection.classList.remove('hidden');
            trackingNumber.textContent = this.order.trackingNumber;
        }

        // Add Cancellation Reason display
        const cancelSection = document.getElementById('cancellation-reason-section');
        const cancelReasonElement = document.getElementById('cancellation-reason');
        
        if (cancelSection && (this.order.status === 'cancelled' || this.order.status === 'declined')) {
            const reason = this.order.cancelReason || this.order.declineReason || 'No reason provided';
            if (reason) {
                cancelSection.classList.remove('hidden');
                if (cancelReasonElement) cancelReasonElement.textContent = reason;
            }
        }
    }

    updateTimeline() {
        const timelineElement = document.getElementById('order-timeline');
        if (!timelineElement) return;

        const events = this.createTimelineEvents();
        timelineElement.innerHTML = events.map(event => `
            <div class="flex items-start space-x-3">
                <div class="flex-shrink-0 w-2 h-2 bg-gold rounded-full mt-2"></div>
                <div class="flex-1 min-w-0">
                    <div class="glass-card p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span class="font-medium text-gray-900">${event.title}</span>
                            <span class="text-xs text-gray-500">${event.date}</span>
                        </div>
                        ${event.description ? `<p class="text-sm text-gray-600">${event.description}</p>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    createTimelineEvents() {
        const events = [];
        
        // Order placed
        events.push({
            title: 'Order Placed',
            date: this.formatDate(this.order.createdAt),
            description: `Order #${this.order._id.slice(-8)} was placed successfully`
        });

        // Seller confirmation
        if (this.order.sellerConfirmedAt) {
            events.push({
                title: 'Confirmed by Seller',
                date: this.formatDate(this.order.sellerConfirmedAt),
                description: 'Seller has confirmed your order and is preparing it for delivery'
            });
        }

        // Shipped
        if (this.order.shippedAt && this.order.trackingNumber) {
            events.push({
                title: 'Order Shipped',
                date: this.formatDate(this.order.shippedAt),
                description: `Order has been shipped with tracking number: ${this.order.trackingNumber}`
            });
        }

        // Delivered
        if (this.order.deliveredAt) {
            events.push({
                title: 'Order Delivered',
                date: this.formatDate(this.order.deliveredAt),
                description: 'Order has been delivered successfully'
            });
        }

        // Completed
        if (this.order.completedAt) {
            events.push({
                title: 'Order Completed',
                date: this.formatDate(this.order.completedAt),
                description: 'Order has been completed and payment has been released to seller'
            });
        }

        // Cancelled
        if (this.order.cancelledAt || this.order.status === 'cancelled') {
            events.push({
                title: 'Order Cancelled',
                date: this.formatDate(this.order.cancelledAt || this.order.updatedAt),
                description: `Order was cancelled: ${this.order.cancelReason || 'No reason provided'}`
            });
        }

        // Declined
        if (this.order.declinedAt || this.order.status === 'declined') {
            events.push({
                title: 'Order Declined',
                date: this.formatDate(this.order.declinedAt || this.order.updatedAt),
                description: `Order was declined: ${this.order.declineReason || 'No reason provided'}`
            });
        }

        return events.reverse(); // Show most recent first
    }

    updatePriceBreakdown() {
        const productPrice = this.order.product?.price || 0;
        const deliveryFee = this.order.deliveryFee || 0;
        const totalAmount = this.order.totalAmount || this.order.amount || (productPrice + deliveryFee);
        const commissionAmount = this.order.commissionAmount || (totalAmount * 0.06);

        // Update price breakdown
        document.getElementById('breakdown-price').textContent = productPrice.toFixed(2);
        document.getElementById('breakdown-total').textContent = totalAmount.toFixed(2);
        document.getElementById('breakdown-commission').textContent = commissionAmount.toFixed(2);

        // Show delivery fee row if applicable
        const deliveryFeeRow = document.getElementById('delivery-fee-row');
        if (deliveryFeeRow && deliveryFee > 0) {
            deliveryFeeRow.classList.remove('hidden');
            document.getElementById('breakdown-delivery').textContent = deliveryFee.toFixed(2);
        }
    }

    updateContactInfo() {
        const isSeller = this.currentUserRole === 'seller';
        const sellerInfo = document.getElementById('seller-info');
        const buyerInfo = document.getElementById('buyer-info');

        if (isSeller) {
            // Show buyer info for sellers
            if (buyerInfo) {
                buyerInfo.classList.remove('hidden');
                document.getElementById('buyer-name').textContent = this.order.buyer?.fullName || 'Unknown';
                document.getElementById('buyer-email').textContent = this.order.buyer?.email || 'Unknown';
                document.getElementById('buyer-phone').textContent = this.order.buyer?.phoneNumber || 'Unknown';
            }
            if (sellerInfo) sellerInfo.classList.add('hidden');
        } else {
            // Show seller info for buyers
            if (sellerInfo) {
                sellerInfo.classList.remove('hidden');
                document.getElementById('seller-name').textContent = this.order.seller?.fullName || 'Unknown';
                document.getElementById('seller-email').textContent = this.order.seller?.email || 'Unknown';
                document.getElementById('seller-phone').textContent = this.order.seller?.phoneNumber || 'Unknown';
            }
            if (buyerInfo) buyerInfo.classList.add('hidden');
        }
    }

    updateActionButtons() {
        const actionButtons = document.getElementById('action-buttons');
        if (!actionButtons) return;

        const isSeller = this.currentUserRole === 'seller';
        const buttons = [];

        if (isSeller) {
            // Seller actions
            if (this.order.status === 'pending_seller_confirmation') {
                buttons.push({
                    text: 'Confirm Order',
                    icon: 'fa-check',
                    color: 'green',
                    action: () => this.confirmOrder()
                });
                buttons.push({
                    text: 'Decline Order',
                    icon: 'fa-times',
                    color: 'red',
                    action: () => this.declineOrder()
                });
            }
            
            if (this.order.status === 'confirmed_by_seller') {
                buttons.push({
                    text: 'Mark as Shipped',
                    icon: 'fa-truck',
                    color: 'blue',
                    action: () => this.markAsShipped()
                });
            }
            
            if (this.order.status === 'out_for_delivery') {
                buttons.push({
                    text: 'Mark as Delivered',
                    icon: 'fa-box',
                    color: 'purple',
                    action: () => this.markAsDelivered()
                });
            }
        } else {
            // Buyer actions
            if (this.order.status === 'delivered_pending_confirmation') {
                buttons.push({
                    text: 'Confirm Delivery',
                    icon: 'fa-check',
                    color: 'green',
                    action: () => this.confirmDelivery()
                });
            }
            
            // Message button for both parties
            const otherParty = isSeller ? this.order.buyer : this.order.seller;
            if (otherParty?._id) {
                buttons.push({
                    text: `Message ${isSeller ? 'Buyer' : 'Seller'}`,
                    icon: 'fa-message',
                    color: 'gold',
                    id: 'btn-message',
                    action: () => this.messageOtherParty()
                });
            }

            // Buyer Cancellation (COD only, not shipped) - NOT IN PLAIN SIGHT (added as secondary)
            if (!isSeller && 
                this.order.paymentMethod === 'cash_on_delivery' && 
                ['pending_seller_confirmation', 'confirmed_by_seller', 'Processing'].includes(this.order.status)) {
                buttons.push({
                    text: 'Cancel Order',
                    icon: 'fa-ban',
                    color: 'gray',
                    id: 'btn-cancel',
                    action: () => this.cancelOrder()
                });
            }
        }

        actionButtons.innerHTML = buttons.map(btn => `
            <button id="${btn.id || ''}" 
                    class="w-full bg-${btn.color === 'gray' ? 'gray-100 text-gray-600' : btn.color + '-600 text-white'} px-4 py-3 rounded-lg hover:bg-${btn.color === 'gray' ? 'gray-200' : btn.color + '-700'} transition-colors text-sm font-medium flex items-center justify-center ${btn.color === 'gray' ? 'mt-4 border border-gray-200' : ''}">
                <i class="fas ${btn.icon} mr-2"></i>
                ${btn.text}
            </button>
        `).join('');

        // Attach event listeners manually since we are using anonymous functions
        buttons.forEach(btn => {
            if (btn.id) {
                const element = document.getElementById(btn.id);
                if (element) {
                    element.addEventListener('click', btn.action);
                }
            }
        });
    }

    // Action methods
    async confirmOrder() {
        await this.updateOrderStatus('confirmed_by_seller', 'Order confirmed successfully');
    }

    async declineOrder() {
        const reason = prompt('Please provide a reason for declining this order:');
        if (reason) {
            await this.updateOrderStatus('declined', 'Order declined successfully', { declineReason: reason });
        }
    }

    async markAsShipped() {
        const trackingNumber = prompt('Please enter the tracking number:');
        if (trackingNumber) {
            await this.updateOrderStatus('out_for_delivery', 'Order marked as shipped', { trackingNumber });
        }
    }

    async markAsDelivered() {
        await this.updateOrderStatus('delivered_pending_confirmation', 'Order marked as delivered');
    }

    async confirmDelivery() {
        await this.updateOrderStatus('Completed', 'Delivery confirmed successfully');
    }

    messageOtherParty() {
        const otherParty = this.currentUserRole === 'seller' ? this.order.buyer : this.order.seller;
        if (otherParty?._id) {
            const productId = this.order.product?._id || this.order.product;
            window.navigateTo(`/messages?recipientId=${otherParty._id}&orderId=${this.order._id}&productId=${productId}`);
        }
    }

    async cancelOrder() {
        if (!confirm('Are you sure you want to cancel this order? This action cannot be undone.')) {
            return;
        }

        const reason = prompt('Please let us know why you are cancelling (optional):');
        
        await this.updateOrderStatus('cancelled', 'Order cancelled successfully', { 
            deliveryNotes: reason || 'Cancelled by buyer' 
        });
    }

    async updateOrderStatus(status, successMessage, additionalData = {}) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/orders/${this.order._id}/status`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    status,
                    ...additionalData
                })
            });

            if (response.ok) {
                this.showToast(successMessage, 'success');
                // Reload order details
                await this.loadOrderDetails(this.order._id);
            } else {
                const error = await response.json();
                this.showToast(error.message || 'Failed to update order status', 'error');
            }
        } catch (error) {
            console.error('Error updating order status:', error);
            this.showToast('Failed to update order status', 'error');
        }
    }

    // Utility methods
    getStatusConfig(status) {
        const configs = {
            'pending_seller_confirmation': { class: 'status-pending', icon: 'fa-clock' },
            'confirmed_by_seller': { class: 'status-confirmed', icon: 'fa-check' },
            'out_for_delivery': { class: 'status-shipped', icon: 'fa-truck' },
            'delivered_pending_confirmation': { class: 'status-delivered', icon: 'fa-box' },
            'Completed': { class: 'status-completed', icon: 'fa-check-circle' },
            'declined': { class: 'status-declined', icon: 'fa-times-circle' },
            'Pending': { class: 'status-pending', icon: 'fa-clock' },
            'Confirmed': { class: 'status-confirmed', icon: 'fa-check' },
            'Shipped': { class: 'status-shipped', icon: 'fa-truck' },
            'Delivered': { class: 'status-delivered', icon: 'fa-box' }
        };
        return configs[status] || configs['Pending'];
    }

    formatStatusText(status) {
        return status.replace(/_/g, ' ').replace(/\b\w/g, word => word.charAt(0).toUpperCase() + word.slice(1));
    }

    formatDeliveryMethod(method) {
        const methods = {
            'pickup': 'Pickup',
            'delivery': 'Delivery',
            'cash_on_delivery': 'Cash on Delivery'
        };
        return methods[method] || method || 'Unknown';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    fixServerUrl(url) {
        if (!url) return url;
        return url.startsWith('/') ? `${API_BASE}${url}` : url;
    }

    hideLoading() {
        const loadingElement = document.getElementById('loading-state');
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
    }

    showError(message) {
        const loadingElement = document.getElementById('loading-state');
        const errorElement = document.getElementById('error-state');
        
        if (loadingElement) loadingElement.classList.add('hidden');
        if (errorElement) {
            errorElement.classList.remove('hidden');
            // Update error message if needed
            const errorMessageElement = errorElement.querySelector('h3');
            if (errorMessageElement) {
                errorMessageElement.textContent = message;
            }
        }
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        if (!toastContainer) return;

        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
        
        toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg transform transition-all duration-300 translate-y-full opacity-0`;
        toast.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;

        toastContainer.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-y-full', 'opacity-0');
        }, 100);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-y-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    setupEventListeners() {
        // Additional event listeners if needed
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new OrderDetailsManager();
});
