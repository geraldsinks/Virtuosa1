// Cash on Delivery Order System
let cartItems = [];
let orderData = {};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadCartItems();
    renderOrderSummary();
    
    // Validate and fix cart items before proceeding
    try {
        const fixedCart = await validateAndFixCart();
        if (fixedCart.length === 0 && cartItems.length > 0) {
            // Cart had invalid items that were removed
            showToast('Cart updated - some items were invalid and have been removed', 'warning');
            // Redirect to cart page to see updated cart
            setTimeout(() => {
                window.location.href = 'cart.html';
            }, 3000);
        }
    } catch (error) {
        console.error('❌ Error validating cart:', error);
    }
    
    loadUserData();
    
    // Retry failed orders if connection is restored
    if (navigator.onLine) {
        setTimeout(retryFailedOrders, 2000); // Wait 2 seconds before retrying
    }
    
    // Listen for connection changes
    window.addEventListener('online', () => {
        console.log('🌐 Connection restored, retrying failed orders...');
        setTimeout(retryFailedOrders, 1000);
    });
});

// Load cart items from localStorage
async function loadCartItems() {
    try {
        const cart = await getCart();
        cartItems = cart;
        console.log('🛒 Loaded cart items:', cartItems);
    } catch (error) {
        console.error('❌ Error loading cart items:', error);
        cartItems = [];
    }
}

// Get cart items (reuse from cart.js)
async function getCart() {
    const token = localStorage.getItem('token');
    
    if (token) {
        try {
            const response = await fetch(`${API_BASE}/cart`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.items || [];
            }
        } catch (error) {
            console.error('❌ Error fetching backend cart:', error);
        }
    }
    
    // Fallback to localStorage
    const localCart = localStorage.getItem('virtuosa_cart');
    return localCart ? JSON.parse(localCart) : [];
}

// Render order summary
function renderOrderSummary() {
    const orderItemsContainer = document.getElementById('order-items');
    const subtotalElement = document.getElementById('subtotal');
    const totalElement = document.getElementById('total');

    if (!orderItemsContainer) return;

    if (cartItems.length === 0) {
        orderItemsContainer.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500">No items in cart</p>
                <a href="cart.html" class="text-gold font-semibold">Return to cart</a>
            </div>
        `;
        if (subtotalElement) subtotalElement.textContent = 'ZMW 0.00';
        if (totalElement) totalElement.textContent = 'ZMW 0.00';
        return;
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => {
        const product = item.product || item;
        return sum + ((product.price || 0) * (item.quantity || 0));
    }, 0);
    
    const total = subtotal; // No shipping for cash on delivery

    if (subtotalElement) subtotalElement.textContent = `ZMW ${subtotal.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `ZMW ${total.toFixed(2)}`;

    // Render items
    orderItemsContainer.innerHTML = cartItems.map(item => {
        const product = item.product || item;
        const imageUrl = product.images?.[0] || product.image || '';
        
        return `
            <div class="flex items-center border-b border-gray-200 py-4 last:border-0">
                <img src="${fixServerUrl(imageUrl) || 'https://placehold.co/80x80?text=Product'}" 
                     alt="${product.name || 'Product'}" class="w-20 h-20 object-cover rounded-md">
                <div class="ml-4 flex-grow">
                    <h3 class="font-semibold text-navy">${product.name || 'Product'}</h3>
                    <p class="text-sm text-gray-500">${product.category || 'Product'}</p>
                    <p class="text-sm text-gray-600">Quantity: ${item.quantity || 0}</p>
                </div>
                <div class="text-right">
                    <p class="font-bold text-navy">ZMW ${((product.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                </div>
            </div>
        `;
    }).join('');
}

// Load user data into delivery form
function loadUserData() {
    const token = localStorage.getItem('token');
    const userFullName = localStorage.getItem('userFullName');
    const userEmail = localStorage.getItem('userEmail');
    const userPhone = localStorage.getItem('userPhone');

    if (userFullName) {
        document.getElementById('delivery-name').value = userFullName;
    }
    if (userPhone) {
        document.getElementById('delivery-phone').value = userPhone;
    }
}

// Place cash on delivery order
async function placeCashOnDeliveryOrder() {
    const placeOrderBtn = document.getElementById('place-order-btn');
    
    // Check if button exists
    if (!placeOrderBtn) {
        console.error('❌ Place order button not found');
        return;
    }
    
    const originalText = placeOrderBtn.textContent;
    
    try {
        // Validate form elements exist
        const nameElement = document.getElementById('delivery-name');
        const phoneElement = document.getElementById('delivery-phone');
        const addressElement = document.getElementById('delivery-address');
        const instructionsElement = document.getElementById('delivery-instructions');
        
        if (!nameElement || !phoneElement || !addressElement) {
            console.error('❌ Required form elements not found');
            alert('Form error. Please refresh the page and try again.');
            return;
        }
        
        // Validate form
        const deliveryName = nameElement.value.trim();
        const deliveryPhone = phoneElement.value.trim();
        const deliveryAddress = addressElement.value.trim();
        const deliveryInstructions = instructionsElement ? instructionsElement.value.trim() : '';

        if (!deliveryName || !deliveryPhone || !deliveryAddress) {
            alert('Please fill in all required delivery information.');
            return;
        }

        if (cartItems.length === 0) {
            alert('Your cart is empty. Please add items before placing an order.');
            window.location.href = 'cart.html';
            return;
        }

        // Show loading state
        placeOrderBtn.textContent = 'PLACING ORDER...';
        placeOrderBtn.disabled = true;

        // Calculate totals
        const subtotal = cartItems.reduce((sum, item) => {
            const product = item.product || item;
            return sum + ((product.price || 0) * (item.quantity || 0));
        }, 0);
        const total = subtotal;

        // Prepare order data
        orderData = {
            items: cartItems.map(item => {
                const product = item.product || item;
                const productId = item._id || product._id;
                
                if (!productId) {
                    console.error('❌ Invalid item structure - missing product ID:', item);
                    throw new Error('Invalid item data: missing product ID');
                }
                
                // Validate product ID format (24-character hex string for ObjectId)
                if (typeof productId !== 'string' || productId.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(productId)) {
                    console.error('❌ Invalid product ID format:', productId, item);
                    throw new Error(`Invalid product ID format: ${productId}`);
                }
                
                return {
                    productId: productId,
                    quantity: item.quantity || 1,
                    price: product.price || 0
                };
            }),
            deliveryInfo: {
                name: deliveryName,
                phone: deliveryPhone,
                address: deliveryAddress,
                instructions: deliveryInstructions
            },
            paymentMethod: 'cash_on_delivery',
            subtotal: subtotal,
            total: total,
            status: 'pending_seller_confirmation'
        };

        console.log('📦 Placing cash on delivery order:', orderData);

        // Send order to backend
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            const result = await response.json();
            console.log('✅ Order placed successfully:', result);

            // Clear cart
            await clearCartAfterOrder();

            // Show success message
            showSuccessMessage(result.order);

            // Redirect to orders page
            setTimeout(() => {
                window.location.href = 'orders.html';
            }, 3000);

        } else {
            const error = await response.json();
            console.error('❌ Order placement failed:', error);
            
            // Handle different types of errors with appropriate user feedback
            if (response.status === 401) {
                alert('Your session has expired. Please log in again.');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else if (response.status === 400) {
                alert(error.message || 'Invalid order data. Please check your information and try again.');
            } else if (response.status >= 500) {
                alert('Server error. Your order has been saved locally and will be submitted when connection is restored.');
                // Save order to localStorage for retry
                saveOrderForRetry(orderData);
            } else {
                alert(error.message || 'Failed to place order. Please try again.');
            }
        }

    } catch (error) {
        console.error('❌ Error placing order:', error);
        
        // Handle network errors specifically
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            alert('Network error. Your order has been saved locally and will be submitted when connection is restored.');
            // Save order to localStorage for retry
            saveOrderForRetry(orderData);
        } else {
            alert('An error occurred while placing your order. Please try again.');
        }
    } finally {
        // Restore button state
        placeOrderBtn.textContent = originalText;
        placeOrderBtn.disabled = false;
    }
}

// Show success message
function showSuccessMessage(order) {
    const successHtml = `
        <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-8 max-w-md mx-4 animate-slide-in">
                <div class="text-center">
                    <div class="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-check text-green-600 text-2xl"></i>
                    </div>
                    <h2 class="text-2xl font-bold text-navy mb-2">Order Placed Successfully!</h2>
                    <p class="text-gray-600 mb-4">Order ID: ${order._id}</p>
                    <p class="text-sm text-gray-500 mb-6">
                        Your order has been sent to the sellers. They will review and confirm your order shortly.
                    </p>
                    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h3 class="font-semibold text-navy mb-2">Next Steps:</h3>
                        <ul class="text-sm text-gray-600 text-left space-y-1">
                            <li>• Sellers will confirm or decline your order</li>
                            <li>• You'll receive notifications about order status</li>
                            <li>• Pay cash when items are delivered</li>
                            <li>• Confirm delivery to complete transaction</li>
                        </ul>
                    </div>
                    <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                            class="bg-gold text-white font-semibold py-2 px-6 rounded-full hover:bg-gold transition-colors">
                        Got it!
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', successHtml);
}

// Clear cart after successful order
async function clearCartAfterOrder() {
    const token = localStorage.getItem('token');
    
    if (token) {
        try {
            await fetch(`${API_BASE}/cart/clear`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('❌ Error clearing backend cart:', error);
        }
    }
    
    // Clear localStorage
    localStorage.removeItem('virtuosa_cart');
    console.log('🗑️ Cart cleared after order');
}

// Helper function to fix URLs
function fixServerUrl(url) {
    if (!url) return 'https://placehold.co/80x80?text=Product';
    if (url.startsWith('http')) return url;
    if (url.startsWith('/')) return `${API_BASE}${url}`;
    return `${API_BASE}/${url}`;
}

// Save order for retry when API fails
function saveOrderForRetry(orderData) {
    try {
        const existingRetryOrders = JSON.parse(localStorage.getItem('retryOrders') || '[]');
        existingRetryOrders.push({
            ...orderData,
            timestamp: new Date().toISOString(),
            retryCount: 0
        });
        localStorage.setItem('retryOrders', JSON.stringify(existingRetryOrders));
        console.log('💾 Order saved for retry:', orderData);
    } catch (error) {
        console.error('❌ Error saving order for retry:', error);
    }
}

// Retry failed orders when connection is restored
async function retryFailedOrders() {
    try {
        const retryOrders = JSON.parse(localStorage.getItem('retryOrders') || '[]');
        const token = localStorage.getItem('token');
        
        if (!token || retryOrders.length === 0) {
            return;
        }
        
        console.log('🔄 Retrying failed orders:', retryOrders.length);
        
        for (const order of retryOrders) {
            try {
                const response = await fetch(`${API_BASE}/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(order)
                });
                
                if (response.ok) {
                    console.log('✅ Retry successful for order:', order);
                    // Remove from retry list
                    const updatedRetryOrders = retryOrders.filter(o => o.timestamp !== order.timestamp);
                    localStorage.setItem('retryOrders', JSON.stringify(updatedRetryOrders));
                } else {
                    console.warn('⚠️ Retry failed for order:', order);
                }
            } catch (error) {
                console.error('❌ Error retrying order:', error);
            }
        }
    } catch (error) {
        console.error('❌ Error in retryFailedOrders:', error);
    }
}

// Make functions globally available
window.placeCashOnDeliveryOrder = placeCashOnDeliveryOrder;
window.retryFailedOrders = retryFailedOrders;
