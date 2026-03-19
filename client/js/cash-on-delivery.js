// Cash on Delivery Order System
let cartItems = [];
let orderData = {};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadCartItems();
    renderOrderSummary();
    loadUserData();
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
    const originalText = placeOrderBtn.textContent;
    
    try {
        // Validate form
        const deliveryName = document.getElementById('delivery-name').value.trim();
        const deliveryPhone = document.getElementById('delivery-phone').value.trim();
        const deliveryAddress = document.getElementById('delivery-address').value.trim();
        const deliveryInstructions = document.getElementById('delivery-instructions').value.trim();

        if (!deliveryName || !deliveryPhone || !deliveryAddress) {
            alert('Please fill in all required delivery information.');
            return;
        }

        if (cartItems.length === 0) {
            alert('Your cart is empty.');
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
            items: cartItems.map(item => ({
                productId: item._id || item.product._id,
                quantity: item.quantity,
                price: (item.product || item).price
            })),
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
            alert(error.message || 'Failed to place order. Please try again.');
        }

    } catch (error) {
        console.error('❌ Error placing order:', error);
        alert('An error occurred while placing your order. Please try again.');
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

// Make functions globally available
window.placeCashOnDeliveryOrder = placeCashOnDeliveryOrder;
