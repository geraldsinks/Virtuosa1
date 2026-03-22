// Transaction Management JavaScript
// API_BASE is provided by config.js
// Toast styles are shared from cart.js

// Toast notification functions (shared with cart.js)

// Inject toast styles once
if (!document.getElementById('toast-notification-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'toast-notification-styles';
    styleSheet.textContent = `
#toast-container {
    position: fixed;
    top: 1rem;
    right: 1rem;
    z-index: 9999;
    pointer-events: none;
}

.toast {
    background: rgba(0, 0, 0, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 0.5rem;
    min-width: 300px;
    max-width: 400px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    transform: translateX(100%);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.toast-content {
    display: flex;
    align-items: center;
    flex: 1;
    gap: 0.75rem;
}

.toast-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
}

.toast-message {
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    flex: 1;
    line-height: 1.4;
}

.toast-close {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 50%;
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
    color: rgba(255, 255, 255, 0.7);
    flex-shrink: 0;
}

.toast-close:hover {
    background: rgba(255, 255, 255, 0.2);
    color: white;
}

/* Animations */
.toast-enter {
    opacity: 0;
    transform: translateX(100%) scale(0.8);
}

.toast-show {
    opacity: 1;
    transform: translateX(0) scale(1);
}

.toast-exit {
    opacity: 0;
    transform: translateX(100%) scale(0.8);
}

/* Toast variants */
.toast.success {
    border-left: 4px solid #22c55e;
}

.toast.error {
    border-left: 4px solid #ef4444;
}

.toast.warning {
    border-left: 4px solid #f59e0b;
}

.toast.info {
    border-left: 4px solid #3b82f6;
}
`;
    document.head.appendChild(styleSheet);
}

/**
 * Show a modern toast notification with improved timing and user experience
 * @param {string} message 
 * @param {string} type - 'success', 'error', 'info'
 * @param {number} duration - Optional custom duration in milliseconds
 */
function showToast(message, type = 'success', duration = 4000) {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed top-4 right-4 z-50 pointer-events-none';
        document.body.appendChild(container);
    }

    // Remove any existing toasts to prevent stacking
    const existingToasts = container.querySelectorAll('.toast');
    existingToasts.forEach(toast => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });

    const toast = document.createElement('div');
    toast.className = `toast ${type} toast-enter`;
    
    // Choose icon based on type
    let icon = 'fa-check-circle';
    let iconColor = 'text-green-400';
    if (type === 'error') {
        icon = 'fa-exclamation-triangle';
        iconColor = 'text-red-400';
    } else if (type === 'info') {
        icon = 'fa-info-circle';
        iconColor = 'text-blue-400';
    }
    
    toast.innerHTML = `
        <div class="toast-content">
            <div class="toast-icon ${iconColor}">
                <i class="fas ${icon}"></i>
            </div>
            <div class="toast-message">${message}</div>
            <div class="toast-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </div>
        </div>
    `;

    container.appendChild(toast);

    // Trigger entrance animation
    requestAnimationFrame(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-show');
    });

    // Auto-remove after specified duration with smooth exit
    setTimeout(() => {
        toast.classList.add('toast-leave');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300); // Wait for exit animation
    }, duration);
}
let currentTransactionId = null;
let currentTransactionType = 'all';
let currentPage = 1;

// Load transactions
async function loadTransactions(page = 1) {
    try {
        const token = localStorage.getItem('token');
        const status = document.getElementById('statusFilter')?.value || '';
        const search = document.getElementById('searchFilter')?.value || '';
        
        const params = new URLSearchParams({
            type: currentTransactionType,
            status,
            page,
            limit: 10
        });
        
        if (search) {
            params.append('search', search);
        }
        
        const response = await fetch(`${API_BASE}/transactions?${params}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load transactions');
        }

        const data = await response.json();
        displayTransactions(data.transactions);
        displayPagination(data.pagination);
        currentPage = page;
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
        container.innerHTML = '<div class="p-8 text-center text-gray-500">No transactions found</div>';
        return;
    }

    // Get user data safely
    let userData;
    try {
        userData = JSON.parse(localStorage.getItem('user'));
    } catch (error) {
        console.error('Error parsing user data:', error);
        userData = { id: null };
    }

    transactions.forEach(transaction => {
        const transactionCard = document.createElement('div');
        transactionCard.className = 'p-6 hover:bg-gray-50 transition-colors';
        
        // Add null checks for buyer and seller
        const isBuyer = transaction.buyer && userData.id && transaction.buyer._id === userData.id;
        const otherParty = isBuyer ? (transaction.seller || { fullName: 'Unknown' }) : (transaction.buyer || { fullName: 'Unknown' });
        
        transactionCard.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex-1">
                    <div class="flex items-center space-x-4">
                        <div class="bg-gray-200 h-12 w-12 rounded-lg flex items-center justify-center">
                            <i class="fas fa-box text-gray-500"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-lg font-medium text-gray-900">${transaction.product.name}</h4>
                            <div class="flex items-center space-x-4 mt-1">
                                <span class="text-sm text-gray-500">
                                    <i class="fas fa-user mr-1"></i>
                                    ${isBuyer ? 'Seller' : 'Buyer'}: ${otherParty.fullName}
                                </span>
                                <span class="text-sm text-gray-500">
                                    <i class="fas fa-calendar mr-1"></i>
                                    ${new Date(transaction.createdAt).toLocaleDateString()}
                                </span>
                                ${transaction.trackingNumber ? `
                                    <span class="text-sm text-gray-500">
                                        <i class="fas fa-truck mr-1"></i>
                                        Tracking: ${transaction.trackingNumber}
                                    </span>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex items-center space-x-4">
                    <div class="text-right">
                        <p class="text-lg font-semibold text-gray-900">ZMW${transaction.totalAmount.toLocaleString()}</p>
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}">
                            ${transaction.status}
                        </span>
                        ${transaction.disputeStatus === 'Open' ? `
                            <span class="ml-1 px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                Dispute
                            </span>
                        ` : ''}
                    </div>
                    <div class="flex flex-col space-y-2">
                        <button onclick="viewTransactionDetails('${transaction._id}')" class="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm">
                            <i class="fas fa-eye mr-1"></i>View
                        </button>
                        ${getActionButton(transaction, isBuyer)}
                    </div>
                </div>
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

// Get action button based on transaction status and user role
function getActionButton(transaction, isBuyer) {
    if (transaction.status === 'Pending' && isBuyer) {
        return `<button onclick="openPaymentModal('${transaction._id}')" class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm">
            <i class="fas fa-credit-card mr-1"></i>Pay
        </button>`;
    }
    
    if (transaction.status === 'Confirmed' && !isBuyer) {
        return `<button onclick="openShipmentModal('${transaction._id}')" class="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600 text-sm">
            <i class="fas fa-truck mr-1"></i>Ship
        </button>`;
    }
    
    if (transaction.status === 'Shipped' && isBuyer) {
        return `<button onclick="confirmDelivery('${transaction._id}')" class="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm">
            <i class="fas fa-check mr-1"></i>Confirm Delivery
        </button>`;
    }
    
    if (['Confirmed', 'Shipped'].includes(transaction.status) && transaction.disputeStatus === 'None') {
        return `<button onclick="openDisputeModal('${transaction._id}')" class="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">
            <i class="fas fa-exclamation-triangle mr-1"></i>Dispute
        </button>`;
    }
    
    return '';
}

// View transaction details
async function viewTransactionDetails(transactionId) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/transactions/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load transaction details');
        }

        const transaction = await response.json();
        displayTransactionDetails(transaction);
    } catch (error) {
        console.error('Error loading transaction details:', error);
        showError('Failed to load transaction details');
    }
}

// Display transaction details in modal
function displayTransactionDetails(transaction) {
    const container = document.getElementById('transactionDetails');
    
    // Get user data safely
    let userData;
    try {
        userData = JSON.parse(localStorage.getItem('user'));
    } catch (error) {
        console.error('Error parsing user data:', error);
        userData = { id: null };
    }
    
    const isBuyer = transaction.buyer && userData.id && transaction.buyer._id === userData.id;
    
    container.innerHTML = `
        <div class="grid grid-cols-2 gap-6">
            <div>
                <h4 class="font-semibold text-gray-900 mb-3">Product Information</h4>
                <div class="space-y-2">
                    <div class="flex items-center space-x-2">
                        <img src="${transaction.product.images?.[0] || '/assets/placeholder-product.jpg'}" 
                             alt="${transaction.product.name}" 
                             class="w-16 h-16 object-cover rounded-lg">
                        <div>
                            <p class="font-medium text-gray-900">${transaction.product.name}</p>
                            <p class="text-sm text-gray-500">${transaction.product.category}</p>
                            <p class="text-sm text-gray-500">Condition: ${transaction.product.condition}</p>
                        </div>
                    </div>
                    <div class="border-t pt-3">
                        <p class="text-sm text-gray-600">Price: <span class="font-semibold text-gray-900">ZMW${transaction.product.price.toLocaleString()}</span></p>
                        <p class="text-sm text-gray-600">Commission: <span class="font-semibold text-gray-900">ZMW${transaction.commissionAmount.toLocaleString()}</span></p>
                        <p class="text-sm text-gray-600">Total: <span class="font-semibold text-gray-900">ZMW${transaction.totalAmount.toLocaleString()}</span></p>
                    </div>
                </div>
            </div>
            
            <div>
                <h4 class="font-semibold text-gray-900 mb-3">Transaction Information</h4>
                <div class="space-y-2">
                    <div>
                        <p class="text-sm text-gray-600">Transaction ID</p>
                        <p class="font-medium text-gray-900">${transaction._id}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Status</p>
                        <span class="px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}">
                            ${transaction.status}
                        </span>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Payment Status</p>
                        <p class="font-medium text-gray-900">${transaction.paymentStatus}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Created</p>
                        <p class="font-medium text-gray-900">${new Date(transaction.createdAt).toLocaleString()}</p>
                    </div>
                    ${transaction.shippedAt ? `
                        <div>
                            <p class="text-sm text-gray-600">Shipped</p>
                            <p class="font-medium text-gray-900">${new Date(transaction.shippedAt).toLocaleString()}</p>
                        </div>
                    ` : ''}
                    ${transaction.deliveredAt ? `
                        <div>
                            <p class="text-sm text-gray-600">Delivered</p>
                            <p class="font-medium text-gray-900">${new Date(transaction.deliveredAt).toLocaleString()}</p>
                        </div>
                    ` : ''}
                </div>
            </div>
        </div>
        
        <div class="mt-6">
            <h4 class="font-semibold text-gray-900 mb-3">Parties Involved</h4>
            <div class="grid grid-cols-2 gap-6">
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-sm font-medium text-gray-600 mb-2">Buyer</p>
                    <p class="font-medium text-gray-900">${transaction.buyer.fullName}</p>
                    <p class="text-sm text-gray-500">${transaction.buyer.email}</p>
                    <p class="text-sm text-gray-500">${transaction.buyer.university || 'N/A'}</p>
                </div>
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-sm font-medium text-gray-600 mb-2">Seller</p>
                    <p class="font-medium text-gray-900">${transaction.seller.fullName}</p>
                    <p class="text-sm text-gray-500">${transaction.seller.email}</p>
                    <p class="text-sm text-gray-500">${transaction.seller.university || 'N/A'}</p>
                </div>
            </div>
        </div>
        
        ${transaction.trackingNumber ? `
            <div class="mt-6">
                <h4 class="font-semibold text-gray-900 mb-3">Shipping Information</h4>
                <div class="bg-blue-50 p-4 rounded-lg">
                    <p class="text-sm text-gray-600">Tracking Number: <span class="font-medium text-gray-900">${transaction.trackingNumber}</span></p>
                    <p class="text-sm text-gray-600">Delivery Method: <span class="font-medium text-gray-900">${transaction.deliveryMethod}</span></p>
                </div>
            </div>
        ` : ''}
        
        ${transaction.disputeStatus === 'Open' ? `
            <div class="mt-6">
                <h4 class="font-semibold text-gray-900 mb-3">Dispute Information</h4>
                <div class="bg-red-50 p-4 rounded-lg">
                    <p class="text-sm text-gray-600">Status: <span class="font-medium text-red-900">Open</span></p>
                    <p class="text-sm text-gray-600">Reason: <span class="font-medium text-gray-900">${transaction.disputeReason}</span></p>
                </div>
            </div>
        ` : ''}
    `;
    
    document.getElementById('transactionModal').classList.remove('hidden');
}

// Close transaction modal
function closeTransactionModal() {
    document.getElementById('transactionModal').classList.add('hidden');
}

// Open payment modal
function openPaymentModal(transactionId) {
    currentTransactionId = transactionId;
    document.getElementById('paymentModal').classList.remove('hidden');
    
    // Load transaction details for payment
    loadPaymentDetails(transactionId);
}

// Load payment details
async function loadPaymentDetails(transactionId) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/transactions/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load transaction details');
        }

        const transaction = await response.json();
        const container = document.getElementById('paymentDetails');
        container.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-900 mb-2">${transaction.product.name}</h4>
                <div class="space-y-1">
                    <p class="text-sm text-gray-600">Product Price: <span class="font-medium">K${transaction.product.price.toLocaleString()}</span></p>
                    <p class="text-sm text-gray-600">Commission (6%): <span class="font-medium">K${transaction.commissionAmount.toLocaleString()}</span></p>
                    <p class="text-sm font-semibold text-gray-900 border-t pt-2">Total Amount: <span class="font-bold">K${transaction.totalAmount.toLocaleString()}</span></p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading payment details:', error);
        showError('Failed to load payment details');
    }
}

// Close payment modal
function closePaymentModal() {
    document.getElementById('paymentModal').classList.add('hidden');
    currentTransactionId = null;
}

// Process payment
async function processPayment(event) {
    event.preventDefault();
    
    try {
        const token = localStorage.getItem('token');
        const paymentMethod = document.getElementById('paymentMethod').value;
        const paymentReference = document.getElementById('paymentReference').value;

        const response = await fetch(`${API_BASE}/transactions/${currentTransactionId}/pay`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                paymentMethod,
                paymentReference
            })
        });

        if (!response.ok) {
            throw new Error('Failed to process payment');
        }

        const data = await response.json();
        showSuccess('Payment processed successfully!');
        closePaymentModal();
        loadTransactions(); // Reload transactions
    } catch (error) {
        console.error('Error processing payment:', error);
        showError('Failed to process payment');
    }
}

// Open shipment modal
function openShipmentModal(transactionId) {
    currentTransactionId = transactionId;
    document.getElementById('shipmentModal').classList.remove('hidden');
    
    // Load transaction details for shipment
    loadShipmentDetails(transactionId);
}

// Load shipment details
async function loadShipmentDetails(transactionId) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/transactions/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load transaction details');
        }

        const transaction = await response.json();
        const container = document.getElementById('shipmentDetails');
        container.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-900 mb-2">${transaction.product.name}</h4>
                <div class="space-y-1">
                    <p class="text-sm text-gray-600">Buyer: <span class="font-medium">${transaction.buyer.fullName}</span></p>
                    <p class="text-sm text-gray-600">Email: <span class="font-medium">${transaction.buyer.email}</span></p>
                    <p class="text-sm text-gray-600">Total Amount: <span class="font-medium">ZMW${transaction.totalAmount.toLocaleString()}</span></p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading shipment details:', error);
        showError('Failed to load shipment details');
    }
}

// Close shipment modal
function closeShipmentModal() {
    document.getElementById('shipmentModal').classList.add('hidden');
    currentTransactionId = null;
}

// Confirm shipment
async function confirmShipment(event) {
    event.preventDefault();
    
    try {
        const token = localStorage.getItem('token');
        const trackingNumber = document.getElementById('trackingNumber').value;
        const deliveryMethod = document.getElementById('deliveryMethod').value;

        const response = await fetch(`${API_BASE}/transactions/${currentTransactionId}/ship`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                trackingNumber,
                deliveryMethod
            })
        });

        if (!response.ok) {
            throw new Error('Failed to confirm shipment');
        }

        const data = await response.json();
        showSuccess('Shipment confirmed successfully!');
        closeShipmentModal();
        loadTransactions(); // Reload transactions
    } catch (error) {
        console.error('Error confirming shipment:', error);
        showError('Failed to confirm shipment');
    }
}

// Confirm delivery
async function confirmDelivery(transactionId) {
    if (!confirm('Are you sure you have received the item and want to confirm delivery? This will release the payment to the seller.')) {
        return;
    }

    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/transactions/${transactionId}/confirm-delivery`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to confirm delivery');
        }

        const data = await response.json();
        showSuccess('Delivery confirmed! Payment released to seller.');
        loadTransactions(); // Reload transactions
    } catch (error) {
        console.error('Error confirming delivery:', error);
        showError('Failed to confirm delivery');
    }
}

// Open dispute modal
function openDisputeModal(transactionId) {
    currentTransactionId = transactionId;
    document.getElementById('disputeModal').classList.remove('hidden');
    
    // Load transaction details for dispute
    loadDisputeDetails(transactionId);
}

// Load dispute details
async function loadDisputeDetails(transactionId) {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/transactions/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load transaction details');
        }

        const transaction = await response.json();
        const container = document.getElementById('disputeDetails');
        container.innerHTML = `
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-medium text-gray-900 mb-2">${transaction.product.name}</h4>
                <div class="space-y-1">
                    <p class="text-sm text-gray-600">Transaction ID: <span class="font-medium">${transaction._id}</span></p>
                    <p class="text-sm text-gray-600">Amount: <span class="font-medium">K${transaction.totalAmount.toLocaleString()}</span></p>
                    <p class="text-sm text-gray-600">Status: <span class="font-medium">${transaction.status}</span></p>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading dispute details:', error);
        showError('Failed to load dispute details');
    }
}

// Close dispute modal
function closeDisputeModal() {
    document.getElementById('disputeModal').classList.add('hidden');
    currentTransactionId = null;
}

// Raise dispute
async function raiseDispute(event) {
    event.preventDefault();
    
    try {
        const token = localStorage.getItem('token');
        const disputeReason = document.getElementById('disputeReason').value;

        const response = await fetch(`${API_BASE}/transactions/${currentTransactionId}/dispute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                disputeReason
            })
        });

        if (!response.ok) {
            throw new Error('Failed to raise dispute');
        }

        const data = await response.json();
        showSuccess('Dispute raised successfully! We will review and resolve it soon.');
        closeDisputeModal();
        loadTransactions(); // Reload transactions
    } catch (error) {
        console.error('Error raising dispute:', error);
        showError('Failed to raise dispute');
    }
}

// Display pagination
function displayPagination(pagination) {
    const container = document.getElementById('pagination');
    container.innerHTML = '';

    if (pagination.totalPages <= 1) {
        return;
    }

    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'flex justify-center items-center space-x-2';

    // Previous button
    if (pagination.currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'px-3 py-1 border border-gray-300 rounded hover:bg-gray-50';
        prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevBtn.onclick = () => loadTransactions(pagination.currentPage - 1);
        paginationDiv.appendChild(prevBtn);
    }

    // Page numbers
    for (let i = 1; i <= pagination.totalPages; i++) {
        if (i === 1 || i === pagination.totalPages || (i >= pagination.currentPage - 1 && i <= pagination.currentPage + 1)) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `px-3 py-1 border rounded ${i === pagination.currentPage ? 'bg-blue-500 text-white border-blue-500' : 'border-gray-300 hover:bg-gray-50'}`;
            pageBtn.textContent = i;
            pageBtn.onclick = () => loadTransactions(i);
            paginationDiv.appendChild(pageBtn);
        } else if (i === pagination.currentPage - 2 || i === pagination.currentPage + 2) {
            const dots = document.createElement('span');
            dots.className = 'px-2';
            dots.textContent = '...';
            paginationDiv.appendChild(dots);
        }
    }

    // Next button
    if (pagination.currentPage < pagination.totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'px-3 py-1 border border-gray-300 rounded hover:bg-gray-50';
        nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextBtn.onclick = () => loadTransactions(pagination.currentPage + 1);
        paginationDiv.appendChild(nextBtn);
    }

    container.appendChild(paginationDiv);
}

// Tab management
function showTab(tabName) {
    currentTransactionType = tabName;
    
    // Remove active state from all tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('border-blue-500', 'text-blue-600');
        button.classList.add('border-transparent', 'text-gray-500');
    });
    
    // Add active state to clicked button
    event.target.classList.remove('border-transparent', 'text-gray-500');
    event.target.classList.add('border-blue-500', 'text-blue-600');
    
    // Reload transactions with new type
    loadTransactions(1);
}

// Show error message with improved toast system
function showError(message) {
    showToast(message, 'error', 5000);
}

// Show success message with improved toast system
function showSuccess(message) {
    showToast(message, 'success', 5000);
}

// Logout function
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

// Initialize transactions page
document.addEventListener('DOMContentLoaded', function() {
    loadTransactions();
});
