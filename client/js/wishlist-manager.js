/**
 * Wishlist Manager
 * Handles wishlist state for both guest and authenticated users.
 */

if (window.WishlistManager) {
    console.log('WishlistManager already exists, skipping declaration');
} else {

class WishlistManager {
    constructor() {
        this.wishlist = [];
        this.STORAGE_KEY = 'virtuosa_guest_wishlist';
        this.isInitialized = false;
        
        // Initialize as soon as possible
        this.init();
    }

    async init() {
        if (this.isInitialized) return;
        
        await this.loadWishlist();
        this.isInitialized = true;
        
        // Listen for login/logout to refresh wishlist
        window.addEventListener('storage', (e) => {
            if (e.key === 'token') {
                this.loadWishlist();
            }
        });
    }

    async loadWishlist() {
        if (window.authManager && window.authManager.isAuthenticated()) {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${window.API_BASE}/wishlist`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.wishlist = data.wishlist.map(p => typeof p === 'object' ? p._id : p);
                } else {
                    // Fallback to local if API fails or session expired
                    this.loadLocalWishlist();
                }
            } catch (error) {
                console.error('Error loading wishlist from API:', error);
                this.loadLocalWishlist();
            }
        } else {
            this.loadLocalWishlist();
        }
        
        this.notifyUpdate();
    }

    loadLocalWishlist() {
        const localData = localStorage.getItem(this.STORAGE_KEY);
        this.wishlist = localData ? JSON.parse(localData) : [];
    }

    saveLocalWishlist() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.wishlist));
    }

    async toggle(productId) {
        if (!productId) return;
        
        const index = this.wishlist.indexOf(productId);
        const isCurrentlyIn = index !== -1;
        
        if (window.authManager && window.authManager.isAuthenticated()) {
            try {
                const token = localStorage.getItem('token');
                const method = isCurrentlyIn ? 'DELETE' : 'POST';
                const endpoint = isCurrentlyIn ? 'remove' : 'add';
                
                const response = await fetch(`${window.API_BASE}/wishlist/${endpoint}/${productId}`, {
                    method: method,
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    this.wishlist = data.wishlist;
                    this.notifyUpdate();
                    return !isCurrentlyIn;
                }
            } catch (error) {
                console.error('Error toggling wishlist via API:', error);
            }
        }
        
        // Fallback or Guest mode
        if (isCurrentlyIn) {
            this.wishlist.splice(index, 1);
        } else {
            this.wishlist.push(productId);
        }
        
        this.saveLocalWishlist();
        this.notifyUpdate();
        return !isCurrentlyIn;
    }

    contains(productId) {
        return this.wishlist.includes(productId);
    }

    getCount() {
        return this.wishlist.length;
    }

    notifyUpdate() {
        const event = new CustomEvent('wishlist-updated', {
            detail: { wishlist: this.wishlist, count: this.wishlist.length }
        });
        window.dispatchEvent(event);
        
        // Update any UI badges if they exist
        this.updateBadges();
    }

    updateBadges() {
        const badges = document.querySelectorAll('.wishlist-counter');
        badges.forEach(badge => {
            badge.textContent = this.getCount();
            badge.style.display = this.getCount() > 0 ? 'flex' : 'none';
        });
    }

    /**
     * Sync local wishlist to account on login
     * Call this after a successful login
     */
    async syncOnLogin() {
        if (!window.authManager.isAuthenticated()) return;
        
        const localItems = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
        if (localItems.length === 0) return;
        
        try {
            const token = localStorage.getItem('token');
            // Process each item (could be optimized with a bulk API)
            for (const productId of localItems) {
                if (!this.wishlist.includes(productId)) {
                    await fetch(`${window.API_BASE}/wishlist/add/${productId}`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            }
            
            // Clear local guest wishlist after successful sync
            localStorage.removeItem(this.STORAGE_KEY);
            await this.loadWishlist();
        } catch (error) {
            console.error('Syncing wishlist failed:', error);
        }
    }
}

// Create global instance
window.wishlistManager = new WishlistManager();

}
