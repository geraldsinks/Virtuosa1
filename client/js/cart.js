// Cart Logic for Virtuosa
// API_BASE is provided by config.js

// Cart operation lock to prevent race conditions
let cartOperationLock = false;

// Cache DOM elements for performance
let cartItemsContainer, subtotalElement, totalElement;

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
                
                // Ensure cart items have consistent structure with product ID
                const normalizedItems = (data.items || []).map(item => {
                    // Backend returns populated product object
                    if (item.product && typeof item.product === 'object') {
                        return {
                            _id: item.product._id, // Use product._id as item _id
                            product: item.product,   // Keep the populated product object
                            quantity: item.quantity,
                            addedAt: item.addedAt || new Date().toISOString()
                        };
                    }
                    // Fallback for any other structure
                    return item;
                });
                
                console.log('🔧 Normalized cart items:', normalizedItems);
                
                // Sync normalized cart to localStorage for consistency
                localStorage.setItem('virtuosa_cart', JSON.stringify(normalizedItems));
                
                return normalizedItems;
            } else {
                console.warn('⚠️ Backend cart unavailable, using localStorage');
                // Don't try to parse failed response, just use localStorage
                throw new Error('Backend cart unavailable');
            }
        } catch (error) {
            console.error('Error fetching cart from backend:', error);
            // Don't try to parse failed response, just use localStorage
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
            // Normalize cart items before sending to backend
            const normalizedCart = cart.map(item => {
                if (item.product && typeof item.product === 'object') {
                    return {
                        product: item.product._id, // Send only product._id to backend
                        quantity: item.quantity || 1
                    };
                }
                return item;
            });
            
            console.log('🔧 Normalized cart for backend:', normalizedCart);
            
            const response = await fetch(`${API_BASE}/cart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ items: normalizedCart })
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
            // Fallback to localStorage only, but notify user
            localStorage.setItem('virtuosa_cart', JSON.stringify(cart));
            showToast('Cart saved locally. Changes will sync when connection is restored.', 'info');
        }
    } else {
        // For guest users, only use localStorage
        localStorage.setItem('virtuosa_cart', JSON.stringify(cart));
        console.log('✅ Cart saved to localStorage (guest user)');
    }
    
    await updateCartIcon();
}

// Validate and fix cart items to ensure they have correct product IDs
async function validateAndFixCart() {
    try {
        const cart = await getCart();
        const fixedCart = [];
        let hasChanges = false;

        for (const item of cart) {
            const product = item.product || item;
            const productId = item._id || product._id;
            
            if (!productId) {
                console.warn('⚠️ Cart item missing product ID, removing:', item);
                hasChanges = true;
                continue; // Skip this item
            }

            // Validate product ID format (24-character hex string for ObjectId)
            if (typeof productId === 'string' && productId.length === 24 && /^[0-9a-fA-F]{24}$/.test(productId)) {
                // Valid ObjectId format, keep the item
                fixedCart.push({
                    ...item,
                    _id: productId,
                    product: {
                        ...product,
                        _id: productId
                    }
                });
            } else {
                console.warn('⚠️ Invalid product ID format, removing item:', productId, item);
                hasChanges = true;
            }
        }

        if (hasChanges) {
            await saveCart(fixedCart);
            console.log('🔧 Cart validated and fixed. Items removed:', cart.length - fixedCart.length);
            
            // Show notification to user if items were removed
            if (cart.length !== fixedCart.length) {
                showToast('Cart updated - some items were removed due to invalid product data', 'warning');
            }
            
            // Update cart icon
            await updateCartIcon();
            
            // If on cart page, re-render
            if (window.location.pathname.includes('/cart') || window.location.pathname.includes('cart.html')) {
                renderCart();
            }
        }

        return fixedCart;
    } catch (error) {
        console.error('❌ Error validating cart:', error);
        return [];
    }
}

// Auto-validate cart when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Force clear any existing cart with invalid IDs
    clearInvalidCart();
    validateAndFixCart();
});

// Clear cart with invalid product IDs
async function clearInvalidCart() {
    try {
        const token = localStorage.getItem('token');
        const localCart = localStorage.getItem('virtuosa_cart');
        
        if (localCart) {
            const cart = JSON.parse(localCart);
            const hasInvalidIds = cart.some(item => {
                const productId = item._id || item.product?._id;
                
                // Check if product ID is valid (24-character hex string for ObjectId)
                if (!productId) return true; // Missing ID is invalid
                
                // Valid ObjectId format: 24-character hex string
                if (typeof productId === 'string' && productId.length === 24 && /^[0-9a-fA-F]{24}$/.test(productId)) {
                    return false; // Valid ID
                }
                
                return true; // Invalid ID format
            });
            
            if (hasInvalidIds) {
                console.log('🧹 Clearing cart with invalid IDs:', cart);
                localStorage.removeItem('virtuosa_cart');
                
                // Also clear backend cart if logged in
                if (token) {
                    try {
                        await fetch(`${API_BASE}/cart`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({ items: [] })
                        });
                        console.log('🧹 Backend cart cleared');
                    } catch (error) {
                        console.error('Error clearing backend cart:', error);
                    }
                }
                
                showToast('Cart cleared due to invalid product IDs', 'info');
            }
        }
    } catch (error) {
        console.error('Error clearing invalid cart:', error);
    }
}

// Make function globally available
window.clearInvalidCart = clearInvalidCart;

// Make function globally available
window.validateAndFixCart = validateAndFixCart;

// Validate product data before adding to cart
function validateProductData(product) {
    if (!product || typeof product !== 'object') {
        console.error('❌ Invalid product data:', product);
        return false;
    }
    
    if (!product._id) {
        console.error('❌ Product missing _id:', product);
        return false;
    }
    
    // Validate ObjectId format (24-character hex string)
    if (typeof product._id !== 'string' || product._id.length !== 24 || !/^[0-9a-fA-F]{24}$/.test(product._id)) {
        console.error('❌ Invalid product _id format:', product._id);
        return false;
    }
    
    if (!product.name || typeof product.name !== 'string') {
        console.error('❌ Product missing valid name:', product);
        return false;
    }
    
    if (!product.price || typeof product.price !== 'number' || product.price <= 0) {
        console.error('❌ Product missing valid price:', product);
        return false;
    }
    
    return true;
}

async function addToCart(product, quantity = 1) {
    // Prevent concurrent cart operations
    if (cartOperationLock) {
        console.log('🔄 Cart operation in progress, please wait...');
        return;
    }
    
    cartOperationLock = true;
    
    try {
        const token = localStorage.getItem('token');
        
        console.log('🛒 Adding to cart:', { product, quantity, hasToken: !!token });
        
        // Validate product data before proceeding
        if (!validateProductData(product)) {
            showToast('Invalid product data - cannot add to cart', 'error');
            return;
        }
        
        // Log the exact product ID being used
        console.log('🆔 Product ID being added:', product._id);
        console.log('📦 Product details:', {
            _id: product._id,
            name: product.name,
            price: product.price,
            idType: typeof product._id,
            idLength: product._id?.length
        });
    
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
                if (window.location.pathname.includes('/cart') || window.location.pathname.includes('cart.html')) {
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
                    
                    console.log('📦 Added to localStorage cart:', {
                        _id: product._id,
                        name: product.name,
                        quantity: quantity
                    });
                }

                await saveCart(cart);
                console.log('💾 Saved to localStorage as fallback');
                
                showToast(`${product.name} added to cart! (Saved locally)`, 'success');
                showCartBanner(`${product.name} added to cart! (Saved locally)`);
                await updateCartIcon();
                
                // If we're on the cart page, re-render to show the new item
                if (window.location.pathname.includes('/cart') || window.location.pathname.includes('cart.html')) {
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
            
            showToast(`${product.name} added to cart! (Offline mode)`, 'success');
            showCartBanner(`${product.name} added to cart! (Offline mode)`);
            await updateCartIcon();
            
            // If we're on the cart page, re-render to show the new item
            if (window.location.pathname.includes('/cart') || window.location.pathname.includes('cart.html')) {
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
    
    } catch (error) {
        console.error('❌ Error adding to cart:', error);
        showToast('Failed to add item to cart', 'error');
    } finally {
        // Always release the lock
        cartOperationLock = false;
    }
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
    const cartLink = e.target.closest('a[href*="/cart"]');
    if (cartLink && !e.ctrlKey && !e.metaKey) {
        // Store current page before navigating to cart
        sessionStorage.setItem('previousPage', window.location.href);
    }
});

async function removeFromCart(productId) {
    // Prevent concurrent cart operations
    if (cartOperationLock) {
        console.log('🔄 Cart operation in progress, please wait...');
        return;
    }
    
    cartOperationLock = true;
    
    try {
        console.log('🗑️ Removing item from cart:', productId);
    
    const token = localStorage.getItem('token');
    
    if (token) {
        // Remove from backend cart first
        try {
            const response = await fetch(`${API_BASE}/cart/remove/${productId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                console.log('✅ Item removed from backend cart');
            } else {
                console.warn('⚠️ Backend removal failed, continuing with localStorage update');
                // Don't show error to user for backend failures, just handle gracefully
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
    if (window.location.pathname.includes('/cart') || window.location.pathname.includes('cart.html')) {
        renderCart();
    }
    
    // Update cart icon
    await updateCartIcon();
    
    } catch (error) {
        console.error('❌ Error removing from cart:', error);
        showToast('Failed to remove item from cart', 'error');
    } finally {
        // Always release the lock
        cartOperationLock = false;
    }
}

async function updateQuantity(productId, delta) {
    // Prevent concurrent cart operations
    if (cartOperationLock) {
        console.log('🔄 Cart operation in progress, please wait...');
        return;
    }
    
    cartOperationLock = true;
    
    try {
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
                    console.log('⚠️ Backend update failed, reverting to previous quantity');
                    showToast('Failed to update quantity', 'error');
                    await updateQuantity(productId, -delta);
                }
            } catch (error) {
                console.error('❌ Backend update error:', error);
                console.log('⚠️ Backend update failed, reverting to previous quantity');
                showToast('Failed to update quantity', 'error');
                await updateQuantity(productId, -delta);
            }
        }
        
        // Update localStorage
        item.quantity = newQuantity;
        await saveCart(cart);
        console.log('💾 Cart saved with new quantity');

        // If we're on the cart page, re-render
        if (window.location.pathname.includes('/cart') || window.location.pathname.includes('cart.html')) {
            renderCart();
        }
        
        // Update cart icon
        await updateCartIcon();
    } else {
        console.error('❌ Item not found in cart:', productId);
        showToast('Item not found in cart', 'error');
    }
    
    } catch (error) {
        console.error('❌ Error updating quantity:', error);
        showToast('Failed to update quantity', 'error');
    } finally {
        // Always release the lock
        cartOperationLock = false;
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

    // Dispatch event to notify other components (like mobile-header.js)
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { count, cart } }));
}

async function renderCart() {
    // Use cached elements or get them if not cached
    if (!cartItemsContainer) cartItemsContainer = document.getElementById('cart-items');
    if (!subtotalElement) subtotalElement = document.getElementById('subtotal');
    if (!totalElement) totalElement = document.getElementById('total');

    if (!cartItemsContainer) return; // Not on the cart page

    const cart = await getCart(); // Make sure we await the async function
    
    console.log('🛒 Rendering cart with data:', cart);

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div class="text-center py-12 text-gray-400 editorial-text">
                <i class="fas fa-shopping-bag text-4xl mb-4 opacity-50"></i>
                <p class="text-lg mb-2">Your collection awaits</p>
                <p class="text-sm mb-6">Discover pieces that speak to your style</p>
                <a href="../pages/products.html" class="inline-block gold-button text-navy px-6 py-3 rounded-full font-semibold">
                    Begin Exploring
                </a>
            </div>
        `;
        if (subtotalElement) subtotalElement.textContent = 'ZMW 0.00';
        if (totalElement) totalElement.textContent = 'ZMW 0.00';
        
        // Update item count
        const itemCountElement = document.getElementById('item-count');
        if (itemCountElement) itemCountElement.textContent = cart.length.toString();
        
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

    // Update item count element
    const itemCountElement = document.getElementById('item-count');
    const totalQuantity = cart.reduce((total, item) => total + (item.quantity || 0), 0);
    if (itemCountElement) itemCountElement.textContent = totalQuantity.toString();

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
        <div class="glass-card p-4 md:p-6 cart-item" style="animation-delay: ${Math.random() * 0.3}s">
            <div class="flex flex-col md:flex-row md:items-start md:space-x-4 space-y-4 md:space-y-0">
                <div class="flex-shrink-0 mx-auto md:mx-0">
                    <img src="${fixServerUrl(imageUrl) || 'https://placehold.co/100x100?text=Product'}" alt="${product.name || 'Product'}" class="w-24 h-24 md:w-16 md:h-16 object-cover rounded-lg">
                </div>
                <div class="flex-grow min-w-0 text-center md:text-left">
                    <h3 class="text-white font-medium text-base md:text-lg mb-1 serif-heading">${product.name || 'Product'}</h3>
                    <p class="text-gray-400 text-sm mb-3 editorial-text">${product.category || 'Product'}</p>
                    <div class="flex items-center justify-center md:justify-start space-x-3">
                        <button onclick="updateQuantity('${productId}', -1)" class="w-8 h-8 rounded-full bg-white bg-opacity-20 text-white font-medium hover:bg-opacity-30 transition-all">−</button>
                        <span class="text-white font-semibold px-2">${item.quantity || 0}</span>
                        <button onclick="updateQuantity('${productId}', 1)" class="w-8 h-8 rounded-full bg-white bg-opacity-20 text-white font-medium hover:bg-opacity-30 transition-all">+</button>
                    </div>
                </div>
                <div class="text-right flex-shrink-0 text-center md:text-right">
                    <p class="text-white font-semibold text-lg mb-2">ZMW ${((product.price || 0) * (item.quantity || 0)).toFixed(2)}</p>
                    <button onclick="removeFromCart('${productId}')" class="text-gray-400 text-sm hover:text-red-400 transition-colors editorial-text inline-flex items-center justify-center md:justify-end">
                        <i class="fas fa-trash-alt mr-2"></i>
                        <span class="hidden sm:inline">Remove</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Cart Management JavaScript

// Toast Notification Styles
const toastStyles = `
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

.toast-leave {
    opacity: 0;
    transform: translateX(100%) scale(0.9);
}

/* Type-specific colors */
.toast.success {
    border-left: 4px solid #10b981;
}

.toast.error {
    border-left: 4px solid #ef4444;
}

.toast.info {
    border-left: 4px solid #3b82f6;
}
`;

// Inject styles once
if (!document.getElementById('toast-notification-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'toast-notification-styles';
    styleSheet.textContent = toastStyles;
    document.head.appendChild(styleSheet);
}
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

// Show cart banner when items are added with improved UX
function showCartBanner(message = 'Item added to cart!') {
    const banner = document.getElementById('cart-banner');
    const bannerMessage = document.getElementById('cart-banner-message');
    
    console.log('🎯 Showing cart banner:', message);
    
    if (banner && bannerMessage) {
        bannerMessage.textContent = message;
        banner.classList.remove('hidden');
        banner.classList.add('banner-enter');
        
        // Auto-hide after longer duration for better readability
        setTimeout(() => {
            banner.classList.add('banner-leave');
            setTimeout(() => {
                banner.classList.add('hidden');
                banner.classList.remove('banner-enter', 'banner-leave');
            }, 300);
        }, 5000); // 5 seconds instead of 3
    }
}

// Cart banner styles
const bannerStyles = `
#cart-banner {
    position: fixed;
    top: 4rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

#cart-banner-message {
    background: var(--gold-gradient);
    color: #0A1128;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.875rem;
    box-shadow: 0 4px 20px rgba(212, 175, 55, 0.3);
}

.banner-enter {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
}

.banner-leave {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
}

#cart-banner.show {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
}
`;

// Inject banner styles once
if (!document.getElementById('cart-banner-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'cart-banner-styles';
    styleSheet.textContent = bannerStyles;
    document.head.appendChild(styleSheet);
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
    
    // Check if user is logged in before proceeding to checkout
    const token = localStorage.getItem('token');
    if (!token) {
        // Show user-friendly login prompt instead of letting them proceed
        if (confirm('Please log in to complete your order. Would you like to log in now?')) {
            window.location.href = '/login';
        }
        return;
    }
    
    console.log('🎯 Finalizing selection with method:', method);
    
    if (method === 'mobile-money') {
        // Redirect to mobile money payment page
        window.location.href = '/mobile-money-payment';
    } else if (method === 'cash-on-delivery') {
        // Redirect to cash on delivery confirmation page
        window.location.href = '/cash-on-delivery';
    }
}

function getItDelivered() {
    const method = localStorage.getItem('selectedFulfillmentMethod');
    if (!method) {
        alert('Please select a fulfillment method first.');
        return;
    }
    
    // Check if user is logged in before proceeding to checkout
    const token = localStorage.getItem('token');
    if (!token) {
        // Show user-friendly login prompt instead of letting them proceed
        if (confirm('Please log in to arrange delivery. Would you like to log in now?')) {
            window.location.href = '/login';
        }
        return;
    }
    
    console.log('🚚 Arranging delivery with method:', method);
    
    // Same logic as finalizeSelection but with different messaging
    if (method === 'mobile-money') {
        window.location.href = '/mobile-money-payment';
    } else if (method === 'cash-on-delivery') {
        window.location.href = '/cash-on-delivery';
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
    if (window.location.pathname.includes('/cart') || window.location.pathname.includes('cart.html')) {
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
                continueBtn.href = `/products?category=${encodeURIComponent(category)}`;
                console.log('📂 Continuing to category:', category);
                return;
            } else {
                // Go back to products page
                continueBtn.href = '/products';
                console.log('📂 Continuing to products page');
                return;
            }
        }
        
        // Check if previous page was product detail
        if (previousPage.includes('/product/')) {
            // Go back to products page (could be enhanced to get product category)
            continueBtn.href = '/products';
            console.log('📂 Continuing from product detail to products');
            return;
        }
    }
    
    // Default fallback
    continueBtn.href = 'products.html';
    console.log('📂 Default: continuing to products page');
}

