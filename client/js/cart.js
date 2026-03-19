// Cart Logic for Virtuosa
// API_BASE is provided by config.js

// Initialize cart with proper priority: Backend > LocalStorage
async function getCart() {
    const token = localStorage.getItem('token');
    
    // For logged in users, always prioritize backend cart
    if (token) {
        try {
            const response = await fetch(`${API_BASE}/cart`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (response.ok) {
                const data = await response.json();
                console.log('📦 Cart from backend (logged in user):', data);
                
                // Sync backend cart to localStorage for consistency
                localStorage.setItem('virtuosa_cart', JSON.stringify(data.items || []));
                
                return data.items || [];
            }
        } catch (error) {
            console.error('Error fetching cart from backend:', error);
        }
    }
    
    // For guest users or backend failure, use localStorage
    const localCart = localStorage.getItem('virtuosa_cart');
    if (localCart) {
        try {
            const cart = JSON.parse(localCart);
            console.log('📦 Cart from localStorage (guest user):', cart);
            return cart;
        } catch (error) {
            console.error('Error parsing localStorage cart:', error);
        }
    }
    
    return [];
}

async function saveCart(cart) {
    const token = localStorage.getItem('token');
    
    console.log('💾 Saving cart:', cart);
    
    if (token) {
        // For logged in users, prioritize backend storage
        try {
            const response = await fetch(`${API_BASE}/cart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ items: cart })
            });
            
            if (response.ok) {
                console.log('✅ Cart saved to backend');
                // Sync to localStorage for consistency
                localStorage.setItem('virtuosa_cart', JSON.stringify(cart));
            } else {
                console.warn('⚠️ Backend sync failed, using localStorage only');
                // Fallback to localStorage only
                localStorage.setItem('virtuosa_cart', JSON.stringify(cart));
            }
        } catch (error) {
            console.error('❌ Backend sync error:', error);
            // Fallback to localStorage only
            localStorage.setItem('virtuosa_cart', JSON.stringify(cart));
        }
    } else {
        // For guest users, only use localStorage
        localStorage.setItem('virtuosa_cart', JSON.stringify(cart));
        console.log('✅ Cart saved to localStorage (guest user)');
    }
    
    await updateCartIcon();
}

async function addToCart(product, quantity = 1) {
    const token = localStorage.getItem('token');
    
    console.log('🛒 Adding to cart:', { product, quantity, hasToken: !!token });
    
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
                console.log('✅ Added to backend cart');
                
                showToast(`${product.name} added to cart!`, 'success');
                showCartBanner(`${product.name} added to cart!`);
                await updateCartIcon();
                
                // Refresh cart from backend to get the latest state
                const cart = await getCart();
                console.log('💾 Refreshed cart from backend:', cart);
                
                // If we're on the cart page, re-render to show the new item
                if (window.location.pathname.includes('cart.html')) {
                    setTimeout(() => renderCart(), 100);
                }
            } else {
                const error = await response.json();
                console.error('❌ Backend add to cart failed:', error);
                
                // Fall back to localStorage if backend fails
                console.log('🔄 Falling back to localStorage due to backend error');
                const cart = await getCart();
                const existingItem = cart.find(item => item._id === product._id);

                if (existingItem) {
                    existingItem.quantity += quantity;
                } else {
                    cart.push({
                        product: product,
                        quantity: quantity,
                        _id: product._id,
                        addedAt: new Date().toISOString()
                    });
                }

                await saveCart(cart);
                console.log('💾 Saved to localStorage as fallback');
                
                showToast(`${product.name} added to cart!`, 'success');
                showCartBanner(`${product.name} added to cart!`);
                await updateCartIcon();
                
                // If we're on the cart page, re-render to show the new item
                if (window.location.pathname.includes('cart.html')) {
                    setTimeout(() => renderCart(), 100);
                }
            }
        } catch (error) {
            console.error('❌ Error adding to cart:', error);
            
            // Fall back to localStorage if network error occurs
            console.log('🔄 Falling back to localStorage due to network error');
            const cart = await getCart();
            const existingItem = cart.find(item => item._id === product._id);

            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                cart.push({
                    product: product,
                    quantity: quantity,
                    _id: product._id,
                    addedAt: new Date().toISOString()
                });
            }

            await saveCart(cart);
            console.log('💾 Saved to localStorage as fallback');
            
            showToast(`${product.name} added to cart!`, 'success');
            showCartBanner(`${product.name} added to cart!`);
            await updateCartIcon();
            
            // If we're on the cart page, re-render to show the new item
            if (window.location.pathname.includes('cart.html')) {
                setTimeout(() => renderCart(), 100);
            }
        }
    } else {
        // Add to localStorage cart
        const cart = await getCart();
        const existingItem = cart.find(item => item._id === product._id);

        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.push({
                product: product,
                quantity: quantity,
                _id: product._id,
                addedAt: new Date().toISOString()
            });
        }

        await saveCart(cart);
        console.log('💾 Saved to localStorage cart');
        showToast(`${product.name} added to cart!`, 'success');
        showCartBanner(`${product.name} added to cart!`);
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
    console.log('🗑️ Removing item from cart:', productId);
    
    const token = localStorage.getItem('token');
    
    if (token) {
        // Remove from backend cart first
        try {
            const response = await fetch(`${API_BASE}/cart/remove`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ productId })
            });
            
            if (response.ok) {
                console.log('✅ Item removed from backend cart');
            } else {
                console.warn('⚠️ Backend removal failed, continuing with localStorage update');
            }
        } catch (error) {
            console.error('❌ Backend removal error:', error);
        }
    }
    
    // Update localStorage
    const cart = await getCart();
    const updatedCart = cart.filter(item => item._id !== productId);
    
    console.log('🛒 Cart after removal:', updatedCart);
    
    await saveCart(updatedCart);

    // If we're on the cart page, re-render
    if (window.location.pathname.includes('cart.html')) {
        renderCart();
    }
    
    // Update cart icon
    await updateCartIcon();
}

async function updateQuantity(productId, delta) {
    console.log('🔢 Updating quantity:', { productId, delta });
    
    const token = localStorage.getItem('token');
    const cart = await getCart();
    const item = cart.find(item => item._id === productId);
    
    console.log('🛒 Found item:', item);

    if (item) {
        const newQuantity = item.quantity + delta;
        console.log('🔢 New quantity:', newQuantity);

        if (newQuantity <= 0) {
            console.log('🗑️ Quantity is 0, removing item');
            await removeFromCart(productId);
            return;
        }

        if (token) {
            // Update quantity in backend cart
            try {
                const response = await fetch(`${API_BASE}/cart/update`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ productId, quantity: newQuantity })
                });
                
                if (response.ok) {
                    console.log('✅ Quantity updated in backend cart');
                } else {
                    console.warn('⚠️ Backend update failed, continuing with localStorage update');
                }
            } catch (error) {
                console.error('❌ Backend update error:', error);
            }
        }
        
        // Update localStorage
        item.quantity = newQuantity;
        await saveCart(cart);
        console.log('💾 Cart saved with new quantity');

        // If we're on the cart page, re-render
        if (window.location.pathname.includes('cart.html')) {
            renderCart();
        }
        
        // Update cart icon
        await updateCartIcon();
    } else {
        console.error('❌ Item not found in cart:', productId);
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
    const totalElement = document.getElementById('total');

    if (!cartItemsContainer) return; // Not on the cart page

    const cart = await getCart(); // Make sure we await the async function
    
    console.log('🛒 Rendering cart with data:', cart);

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Your selections are empty. <a href="/pages/products.html" class="text-gold font-semibold">Continue exploring</a></p>';
        if (subtotalElement) subtotalElement.textContent = 'ZMW 0.00';
        if (totalElement) totalElement.textContent = 'ZMW 0.00';
        return;
    }

    // Group items by category/intent for guilt-reduced display
    const groupedItems = groupCartItemsByIntent(cart);
    
    // Calculate totals
    const subtotal = cart.reduce((sum, item) => {
        const product = item.product || item;
        return sum + ((product.price || 0) * (item.quantity || 0));
    }, 0);
    // No shipping for now - as requested
    const shipping = 0;
    const total = subtotal + shipping;

    if (subtotalElement) subtotalElement.textContent = `ZMW ${subtotal.toFixed(2)}`;
    if (totalElement) totalElement.textContent = `ZMW ${total.toFixed(2)}`;

    // Render grouped items
    let html = '';
    for (const [groupName, items] of Object.entries(groupedItems)) {
        html += `
            <div class="mb-8">
                <h3 class="text-lg font-semibold text-navy mb-4 pb-2 border-b border-gray-200">${groupName}</h3>
                <div class="space-y-4">
                    ${items.map(item => renderItem(item)).join('')}
                </div>
            </div>
        `;
    }

    cartItemsContainer.innerHTML = html;
}

// Group cart items by intent/purpose to reduce guilt
function groupCartItemsByIntent(cart) {
    const groups = {};
    
    cart.forEach(item => {
        const product = item.product || item;
        const category = product.category || 'General';
        const groupName = getIntentGroupName(category, product.name);
        
        if (!groups[groupName]) {
            groups[groupName] = [];
        }
        groups[groupName].push(item);
    });
    
    return groups;
}

// Determine intent-based group name
function getIntentGroupName(category, productName) {
    const lowerCategory = category.toLowerCase();
    const lowerName = productName.toLowerCase();
    
    // Tech & Electronics
    if (lowerCategory.includes('electronic') || lowerCategory.includes('computer') || 
        lowerCategory.includes('phone') || lowerName.includes('laptop') ||
        lowerName.includes('phone') || lowerName.includes('tablet')) {
        return 'Your Tech Setup';
    }
    
    // Fashion & Apparel
    if (lowerCategory.includes('clothing') || lowerCategory.includes('fashion') ||
        lowerCategory.includes('shoes') || lowerName.includes('shirt') ||
        lowerName.includes('dress') || lowerName.includes('jeans')) {
        return 'Your Weekend Look';
    }
    
    // Home & Living
    if (lowerCategory.includes('home') || lowerCategory.includes('furniture') ||
        lowerName.includes('chair') || lowerName.includes('table') ||
        lowerName.includes('sofa') || lowerName.includes('bed')) {
        return 'Your Living Room Upgrade';
    }
    
    // Books & Learning
    if (lowerCategory.includes('book') || lowerName.includes('book') ||
        lowerName.includes('textbook') || lowerName.includes('course')) {
        return 'Your Learning Journey';
    }
    
    // Sports & Fitness
    if (lowerCategory.includes('sports') || lowerName.includes('sports') ||
        lowerName.includes('gym') || lowerName.includes('fitness')) {
        return 'Your Fitness Goals';
    }
    
    // Default group
    return 'Your Selected Items';
}

// Render individual item
function renderItem(item) {
    // Extract product data from nested structure
    const product = item.product || item;
    const productId = item._id || product._id;
    
    // Get image from product.images array or product.image
    const imageUrl = product.images?.[0] || product.image || '';
    
    console.log('📦 Rendering item:', { item, product, productId, imageUrl });
    
    return `
        <div class="flex items-center border-b border-gray-200 py-4 last:border-0 last:pb-0">
            <img src="${fixServerUrl(imageUrl) || 'https://placehold.co/100x100?text=Product'}" alt="${product.name || 'Product'}" class="w-20 h-20 object-cover rounded-md">
            <div class="ml-4 flex-grow">
                <h3 class="font-semibold text-navy text-lg">${product.name || 'Product'}</h3>
                <p class="text-sm text-gray-500 mb-2">${product.category || 'Product'}</p>
                <div class="flex items-center mt-2">
                    <button onclick="updateQuantity('${productId}', -1)" class="w-8 h-8 rounded-full bg-gray-200 text-navy font-bold hover:bg-gray-300 transition-colors">-</button>
                    <span class="mx-3 font-semibold text-lg">${item.quantity || 0}</span>
                    <button onclick="updateQuantity('${productId}', 1)" class="w-8 h-8 rounded-full bg-gray-200 text-navy font-bold hover:bg-gray-300 transition-colors">+</button>
                </div>
            </div>
            <div class="text-right">
                <p class="font-bold text-navy text-lg">ZMW ${((product.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                <button onclick="removeFromCart('${productId}')" class="text-red-500 text-sm mt-2 hover:text-red-700 transition-colors">Remove</button>
            </div>
        </div>
    `;
}

// Cart Management JavaScript
// Helper function to fix URLs to point to server
function fixServerUrl(url) {
    if (!url) return 'https://placehold.co/100x100?text=Product';
    
    // If it's already a full URL, return as is
    if (url.startsWith('http')) return url;
    
    // If it starts with /, prepend API_BASE
    if (url.startsWith('/')) return `${API_BASE}${url}`;
    
    // Otherwise, it's a relative path, prepend API_BASE with /
    return `${API_BASE}/${url}`;
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

// Fulfillment method selection functions
function selectFulfillmentMethod(method) {
    console.log('🚀 Selected fulfillment method:', method);
    
    // Remove previous selections
    document.querySelectorAll('[onclick^="selectFulfillmentMethod"]').forEach(card => {
        card.classList.remove('border-gold', 'bg-gold', 'bg-opacity-10');
        card.classList.add('border-gray-200');
    });
    
    // Highlight selected method
    const selectedCard = event.currentTarget;
    selectedCard.classList.remove('border-gray-200');
    selectedCard.classList.add('border-gold', 'bg-gold', 'bg-opacity-10');
    
    // Store selection
    localStorage.setItem('selectedFulfillmentMethod', method);
}

function finalizeSelection() {
    const method = localStorage.getItem('selectedFulfillmentMethod');
    if (!method) {
        alert('Please select a fulfillment method first.');
        return;
    }
    
    console.log('🎯 Finalizing selection with method:', method);
    
    if (method === 'mobile-money') {
        // Redirect to mobile money payment page
        window.location.href = 'mobile-money-payment.html';
    } else if (method === 'cash-on-delivery') {
        // Redirect to cash on delivery confirmation page
        window.location.href = 'cash-on-delivery.html';
    }
}

function getItDelivered() {
    const method = localStorage.getItem('selectedFulfillmentMethod');
    if (!method) {
        alert('Please select a fulfillment method first.');
        return;
    }
    
    console.log('🚚 Getting items delivered with method:', method);
    
    // Same logic as finalizeSelection but with different messaging
    if (method === 'mobile-money') {
        window.location.href = 'mobile-money-payment.html';
    } else if (method === 'cash-on-delivery') {
        window.location.href = 'cash-on-delivery.html';
    }
}

// Make functions globally available
window.addToCart = addToCart;
window.updateQuantity = updateQuantity;
window.removeFromCart = removeFromCart;
window.showCartBanner = showCartBanner;
window.fixServerUrl = fixServerUrl;
window.selectFulfillmentMethod = selectFulfillmentMethod;
window.finalizeSelection = finalizeSelection;
window.getItDelivered = getItDelivered;

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', async () => {
    await updateCartIcon();
    
    // If we're on the cart page, render it
    if (window.location.pathname.includes('cart.html')) {
        await renderCart();
        
        // Setup continue shopping button
        setupContinueShoppingButton();
    }
});

// Setup continue shopping button to go to last visited category
function setupContinueShoppingButton() {
    const continueBtn = document.getElementById('continue-shopping-button');
    if (!continueBtn) return;
    
    // Get the previous page from sessionStorage (set by cart.js event listener)
    const previousPage = sessionStorage.getItem('previousPage');
    
    console.log('🔙 Previous page:', previousPage);
    
    if (previousPage) {
        // Check if previous page was products.html with a category
        if (previousPage.includes('products.html')) {
            const url = new URL(previousPage, window.location.origin);
            const category = url.searchParams.get('category');
            
            if (category) {
                // Go back to the same category
                continueBtn.href = `products.html?category=${encodeURIComponent(category)}`;
                console.log('📂 Continuing to category:', category);
                return;
            } else {
                // Go back to products page
                continueBtn.href = 'products.html';
                console.log('📂 Continuing to products page');
                return;
            }
        }
        
        // Check if previous page was product-detail.html
        if (previousPage.includes('product-detail.html')) {
            // Go back to products page (could be enhanced to get product category)
            continueBtn.href = 'products.html';
            console.log('📂 Continuing from product detail to products');
            return;
        }
    }
    
    // Default fallback
    continueBtn.href = 'products.html';
    console.log('📂 Default: continuing to products page');
}

