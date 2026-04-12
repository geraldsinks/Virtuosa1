/**
 * Wishlist Page Controller
 */

window.onPageReady(async () => {
    const wishlistGrid = document.getElementById('wishlist-grid');
    const loadingState = document.getElementById('loading-state');
    const emptyState = document.getElementById('empty-wishlist');
    const countBadge = document.getElementById('wishlist-count-badge');

    async function loadAndRenderWishlist() {
        showLoading();
        
        try {
            let products = [];
            
            if (window.authManager && window.authManager.isAuthenticated()) {
                const token = localStorage.getItem('token');
                const response = await fetch(`${window.API_BASE}/wishlist`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    products = data.wishlist || [];
                }
            } else {
                // Guest mode - fetch product details for each ID in localStorage
                const localIds = JSON.parse(localStorage.getItem('virtuosa_guest_wishlist') || '[]');
                if (localIds.length > 0) {
                    // Fetch details for each item (could be a bulk API, but using multiple for now)
                    const promises = localIds.map(id => fetch(`${window.API_BASE}/products/${id}`).then(r => r.ok ? r.json() : null));
                    const results = await Promise.all(promises);
                    products = results.filter(p => p !== null);
                }
            }

            renderWishlist(products);
        } catch (error) {
            console.error('Error loading wishlist:', error);
            showEmpty();
        }
    }

    function renderWishlist(products) {
        if (!products || products.length === 0) {
            showEmpty();
            return;
        }

        countBadge.textContent = `${products.length} Item${products.length > 1 ? 's' : ''}`;
        
        wishlistGrid.innerHTML = products.map(product => {
            const imageUrl = product.images && product.images.length > 0 
                ? fixServerUrl(product.images[0]) 
                : 'https://placehold.co/300x300?text=No+Image';
            
            return `
                <div class="product-card group bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all relative cursor-pointer" 
                     onclick="if(!event.target.closest('button')) window.navigateTo('/product/${product._id}')">
                    <div class="aspect-square overflow-hidden bg-gray-50 relative">
                        <img src="${imageUrl}" 
                             alt="${product.name}" 
                             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                             loading="lazy">
                        
                        <div class="absolute top-3 right-3 z-10">
                            <button class="js-remove-wishlist p-2 rounded-full bg-white/70 backdrop-blur-md hover:bg-white text-red-500 shadow-sm transition-all transform hover:scale-110" 
                                    data-id="${product._id}" 
                                    onclick="event.stopPropagation();">
                                <i class="fas fa-trash-alt text-sm"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="p-5">
                        <div class="mb-2">
                            <span class="text-[10px] font-bold text-gold uppercase tracking-widest">${product.category || 'General'}</span>
                        </div>
                        <h3 class="font-bold text-navy text-sm line-clamp-1 mb-2 group-hover:text-gold transition-colors">${product.name}</h3>
                        
                        <div class="flex items-center justify-between mt-4">
                            <div>
                                <span class="text-xl font-bold text-navy">K${(product.price || 0).toLocaleString()}</span>
                            </div>
                            <button class="js-add-to-cart bg-navy text-white p-2.5 rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center shadow-lg hover:shadow-navy/20" 
                                    data-id="${product._id}"
                                    onclick="event.stopPropagation(); handleAddToCart(this, '${product._id}', '${product.name.replace(/'/g, "\\'")}', ${product.price}, '${imageUrl}')">
                                <i class="fas fa-cart-plus text-sm"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add event listeners for removal
        document.querySelectorAll('.js-remove-wishlist').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.dataset.id;
                const card = btn.closest('.product-card');
                
                await window.wishlistManager.toggle(id);
                
                // Animate removal
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    card.remove();
                    if (wishlistGrid.children.length === 0) showEmpty();
                    // Update count
                    const currentCount = parseInt(countBadge.textContent);
                    countBadge.textContent = `${currentCount - 1} Item${(currentCount - 1) !== 1 ? 's' : ''}`;
                }, 300);
            });
        });

        showGrid();
    }

    // Explicitly handle add to cart for the wishlist page cards
    window.handleAddToCart = async (btn, id, name, price, image) => {
        const item = { _id: id, name, price, image };
        if (typeof addToCart === 'function') {
            await addToCart(item);
            
            // Visual feedback
            const icon = btn.querySelector('i');
            const originalClass = icon.className;
            icon.className = 'fas fa-check text-green-400';
            setTimeout(() => {
                icon.className = originalClass;
            }, 2000);
        }
    };

    function showLoading() {
        loadingState.classList.remove('hidden');
        emptyState.classList.add('hidden');
        wishlistGrid.classList.add('hidden');
    }

    function showEmpty() {
        loadingState.classList.add('hidden');
        emptyState.classList.remove('hidden');
        wishlistGrid.classList.add('hidden');
        countBadge.textContent = '0 Items';
    }

    function showGrid() {
        loadingState.classList.add('hidden');
        emptyState.classList.add('hidden');
        wishlistGrid.classList.remove('hidden');
    }

    function fixServerUrl(url) {
        if (!url) return '';
        if (url.startsWith('http')) return url;
        return `${window.API_BASE.replace('/api', '')}${url.startsWith('/') ? '' : '/'}${url}`;
    }

    // Initial load
    loadAndRenderWishlist();
});
