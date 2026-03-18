// Cart Logic for Virtuosa
// API_BASE is provided by config.js

// Initialize cart from localStorage (fallback) and sync with backend
async function getCart() {
    const token = localStorage.getItem('token');
    if (!token) {
        // Fallback to localStorage for non-logged in users
        const cart = localStorage.getItem('virtuosa_cart');
        return cart ? JSON.parse(cart) : [];
    }

    try {
        const response = await fetch(`${API_BASE}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            return data.items || [];
        }
    } catch (error) {
        console.error('Error fetching cart from backend:', error);
    }

    // Fallback to localStorage
    const cart = localStorage.getItem('virtuosa_cart');
    return cart ? JSON.parse(cart) : [];
}

async function saveCart(cart) {
    const token = localStorage.getItem('token');
    
    if (token) {
        // For logged in users, cart is managed on backend
        // Individual operations will sync with backend
        await updateCartIcon();
        return;
    }

    // For non-logged in users, save to localStorage
    localStorage.setItem('virtuosa_cart', JSON.stringify(cart));
    await updateCartIcon();
}

async function addToCart(product, quantity = 1) {
    const token = localStorage.getItem('token');
    
    if (token) {
        // Add to backend cart
        try {
            const response = await fetch(`${API_BASE}/cart/add`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ productId: product._id, quantity })
            });

            if (response.ok) {
                showToast(`${product.name} added to cart!`, 'success');
                showCartBanner(`${product.name} added to cart!`);
                await updateCartIcon();
                
                // If we're on the cart page, re-render to show the new item
                if (window.location.pathname.includes('cart.html')) {
                    setTimeout(() => renderCart(), 100); // Small delay to ensure backend is updated
                }
            } else {
                const error = await response.json();
                showToast(error.message || 'Failed to add to cart', 'error');
            }
        } catch (error) {
            console.error('Error adding to cart:', error);
            showToast('Failed to add to cart', 'error');
        }
    } else {
        // Add to localStorage cart
        const cart = await getCart();
        const existingItem = cart.find(item => item._id === product._id);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                ...product,
                quantity: quantity
            });
        }

        await saveCart(cart);
        showToast(`${product.name} added to cart!`, 'success');
    }
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
            e.preventDefault();
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

async function removeFromCart(productId) {
    const cart = await getCart();
    const updatedCart = cart.filter(item => item._id !== productId);
    await saveCart(updatedCart);

    // If we're on the cart page, re-render
    if (window.location.pathname.includes('cart.html')) {
        renderCart();
    }
}

async function updateQuantity(productId, delta) {
    const cart = await getCart();
    const item = cart.find(item => item._id === productId);

    if (item) {
        item.quantity += delta;

        if (item.quantity <= 0) {
            await removeFromCart(productId);
            return;
        }

        await saveCart(cart);

        // If we're on the cart page, re-render
        if (window.location.pathname.includes('cart.html')) {
            renderCart();
        }
    }
}

async function updateCartIcon() {
    const cart = await getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);

    // Only update the red cart badge (the one positioned above the cart icon)
    const cartBadge = document.querySelector('.cart-badge-count');
    
    if (cartBadge) {
        cartBadge.textContent = count;
        if (count > 0) {
            cartBadge.classList.remove('hidden');
        } else {
            cartBadge.classList.add('hidden');
        }
    }
}

async function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    const subtotalElement = document.getElementById('subtotal');
    const shippingElement = document.getElementById('shipping');
    const totalElement = document.getElementById('total');

    if (!cartItemsContainer) return; // Not on the cart page

    const cart = await getCart(); // Make sure we await the async function
    
    console.log('🛒 Rendering cart with data:', cart);

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Your cart is empty. <a href="/pages/products.html" class="text-gold font-semibold">Continue shopping</a></p>';
        if (subtotalElement) subtotalElement.textContent = 'ZMW 0.00';
        if (shippingElement) shippingElement.textContent = 'ZMW 0.00';
        if (totalElement) totalElement.textContent = 'ZMW 0.00';
        return;
    }

    // Calculate totals
    const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    // No shipping for now - as requested
    const shipping = 0;
    const total = subtotal + shipping;

    if (subtotalElement) subtotalElement.textContent = `ZMW ${subtotal.toFixed(2)}`;
    if (shippingElement) shippingElement.textContent = `ZMW ${shipping.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `ZMW ${total.toFixed(2)}`;

    // Render items
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="flex items-center border-b border-gray-200 py-4 last:border-0 last:pb-0">
            <img src="${fixServerUrl(item.image) || 'https://placehold.co/100x100?text=Product'}" alt="${item.name || 'Product'}" class="w-20 h-20 object-cover rounded-md">
            <div class="ml-4 flex-grow">
                <h3 class="font-semibold text-navy text-lg">${item.name || 'Product'}</h3>
                <p class="text-sm text-gray-500 mb-2">${item.category || 'Product'}</p>
                <div class="flex items-center mt-2">
                    <button onclick="updateQuantity('${item._id}', -1)" class="w-8 h-8 rounded-full bg-gray-200 text-navy font-bold hover:bg-gray-300 transition-colors">-</button>
                    <span class="mx-3 font-semibold text-lg">${item.quantity || 0}</span>
                    <button onclick="updateQuantity('${item._id}', 1)" class="w-8 h-8 rounded-full bg-gray-200 text-navy font-bold hover:bg-gray-300 transition-colors">+</button>
                </div>
            </div>
            <div class="text-right">
                <p class="font-bold text-navy text-lg">ZMW ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                <button onclick="removeFromCart('${item._id}')" class="text-red-500 text-sm mt-2 hover:text-red-700 transition-colors">Remove</button>
            </div>
        </div>
    `).join('');
}

// Cart Management JavaScript
// Helper function to fix URLs to point to server
function fixServerUrl(url) {
    if (!url) return url;
    return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

// Show cart banner when items are added
function showCartBanner(message = 'Item added to cart!') {
    const banner = document.getElementById('cart-banner');
    const bannerMessage = document.getElementById('cart-banner-message');
    
    console.log('🎯 Showing cart banner:', message);
    
    if (banner && bannerMessage) {
        bannerMessage.textContent = message;
        banner.classList.remove('hidden');
        
        // Hide banner after 3 seconds
        setTimeout(() => {
            banner.classList.add('hidden');
        }, 3000);
    }
}

// Make showCartBanner globally available
window.showCartBanner = showCartBanner;

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', async () => {
    await updateCartIcon();
    
    // If we're on the cart page, render it
    if (window.location.pathname.includes('cart.html')) {
        await renderCart();
    }
});

// Make the helper function globally available
window.fixServerUrl = fixServerUrl;
