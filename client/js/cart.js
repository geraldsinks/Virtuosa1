// Cart Logic for Virtuosa

// Initialize cart from localStorage
function getCart() {
    const cart = localStorage.getItem('virtuosa_cart');
    return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
    localStorage.setItem('virtuosa_cart', JSON.stringify(cart));
    updateCartIcon();
}

function addToCart(product) {
    const cart = getCart();

    // Check if item already exists in cart
    const existingItem = cart.find(item => item._id === product._id);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    saveCart(cart);

    // Show modern toast notification
    showToast(`${product.name} added to cart!`, 'success');
}

/**
 * Show a modern toast notification
 * @param {string} message 
 * @param {string} type - 'success', 'error', 'info'
 */
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    // Choose icon based on type
    let icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';
    if (type === 'info') icon = 'fa-info-circle';

    toast.innerHTML = `
        <i class="fas ${icon} toast-icon"></i>
        <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Global Event Delegation for Add to Cart
document.addEventListener('click', (e) => {
    // Find the closest button or link with the js-add-to-cart class
    const btn = e.target.closest('.js-add-to-cart');
    if (!btn) return;

    e.preventDefault();

    try {
        let productData;
        const dataAttr = btn.getAttribute('data-product');

        if (dataAttr) {
            // Option 1: Full JSON in data-product
            productData = JSON.parse(dataAttr);
        } else {
            // Option 2: Individual data attributes
            productData = {
                _id: btn.getAttribute('data-item-id'),
                name: btn.getAttribute('data-item-name'),
                price: parseFloat(btn.getAttribute('data-item-price')),
                image: btn.getAttribute('data-item-image'),
                category: btn.getAttribute('data-item-category')
            };
        }

        if (productData && productData._id) {
            addToCart(productData);
        } else {
            console.error('Invalid product data on button', btn);
        }
    } catch (err) {
        console.error('Error parsing product data:', err);
        showToast('Could not add item to cart', 'error');
    }
});

// Store previous page before navigating to cart
document.addEventListener('click', (e) => {
    const cartLink = e.target.closest('a[href*="cart.html"]');
    if (cartLink && !e.ctrlKey && !e.metaKey) {
        // Store current page before navigating to cart
        sessionStorage.setItem('previousPage', window.location.href);
    }
});

function removeFromCart(productId) {
    const cart = getCart();
    const updatedCart = cart.filter(item => item._id !== productId);
    saveCart(updatedCart);

    // If we're on the cart page, re-render
    if (window.location.pathname.includes('cart.html')) {
        renderCart();
    }
}

function updateQuantity(productId, delta) {
    const cart = getCart();
    const item = cart.find(item => item._id === productId);

    if (item) {
        item.quantity += delta;

        if (item.quantity <= 0) {
            removeFromCart(productId);
            return;
        }

        saveCart(cart);

        // If we're on the cart page, re-render
        if (window.location.pathname.includes('cart.html')) {
            renderCart();
        }
    }
}

function updateCartIcon() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);

    // More comprehensive selector list for cart badges
    const cartCountSelectors = [
        '#cart-count',
        '.cart-count-badge',
        '.relative i[data-lucide="shopping-cart"] + span',
        '.relative svg + span',
        'a[href*="cart.html"] span',
        '.fa-shopping-cart + span',
        '[data-lucide="shopping-cart"] + span'
    ];
    
    cartCountSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
            // Only update if it's a cart badge (check if it's near a cart icon/link)
            const parent = el.closest('a');
            const isCartRelated = parent && (
                parent.href?.includes('cart.html') || 
                parent.querySelector('[data-lucide="shopping-cart"]') ||
                parent.querySelector('.fa-shopping-cart')
            );
            
            if (isCartRelated || selector === '#cart-count' || selector === '.cart-count-badge') {
                el.textContent = count;
                if (count > 0) {
                    el.classList.remove('hidden');
                } else if (count === 0 && !el.classList.contains('always-show')) {
                    el.classList.add('hidden');
                }
            }
        });
    });
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const subtotalElement = document.getElementById('subtotal');
    const shippingElement = document.getElementById('shipping');
    const totalElement = document.getElementById('total');

    if (!cartItemsContainer) return; // Not on the cart page

    const cart = getCart();

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Your cart is empty. <a href="/pages/products.html" class="text-gold font-semibold">Continue shopping</a></p>';
        if (subtotalElement) subtotalElement.textContent = 'ZMW 0.00';
        if (shippingElement) shippingElement.textContent = 'ZMW 0.00';
        if (totalElement) totalElement.textContent = 'ZMW 0.00';
        return;
    }

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // Simple flat shipping logic for demo
    const shipping = 50.00;
    const total = subtotal + shipping;

    if (subtotalElement) subtotalElement.textContent = `ZMW ${subtotal.toFixed(2)}`;
    if (shippingElement) shippingElement.textContent = `ZMW ${shipping.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `ZMW ${total.toFixed(2)}`;

    // Render items
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="flex items-center border-b border-gray-200 py-4 last:border-0 last:pb-0">
            <img src="${item.image || 'https://placehold.co/100x100?text=Product'}" alt="${item.name}" class="w-20 h-20 object-cover rounded-md">
            <div class="ml-4 flex-grow">
                <h3 class="font-semibold text-navy">${item.name}</h3>
                <p class="text-sm text-gray-500">${item.category || 'Product'}</p>
                <div class="flex items-center mt-2">
                    <button onclick="updateQuantity('${item._id}', -1)" class="w-8 h-8 rounded-full bg-gray-200 text-navy font-bold hover:bg-gray-300">-</button>
                    <span class="mx-3 font-semibold">${item.quantity}</span>
                    <button onclick="updateQuantity('${item._id}', 1)" class="w-8 h-8 rounded-full bg-gray-200 text-navy font-bold hover:bg-gray-300">+</button>
                </div>
            </div>
            <div class="text-right">
                <p class="font-bold text-navy">ZMW ${(item.price * item.quantity).toFixed(2)}</p>
                <button onclick="removeFromCart('${item._id}')" class="text-red-500 text-sm mt-2 hover:text-red-700">Remove</button>
            </div>
        </div>
    `).join('');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    updateCartIcon();

    // If we're on the cart page
    if (window.location.pathname.includes('cart.html')) {
        renderCart();
    }
});
