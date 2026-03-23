// Seller Dashboard with Inventory Management
class SellerInventoryManager {
    constructor() {
        this.products = [];
        this.init();
    }

    async init() {
        await this.loadProducts();
        this.setupEventListeners();
    }

    async loadProducts() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/products/my-products`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                this.products = await response.json();
                this.renderProducts();
                this.updateStats();
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    renderProducts() {
        const container = document.getElementById('active-listings-container');
        if (!container) return;

        if (this.products.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 col-span-full">
                    <i class="fas fa-box-open text-4xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500">You haven't listed any products yet</p>
                    <button onclick="window.location.href='/create-product'" 
                            class="mt-4 bg-gold text-navy px-6 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition-colors">
                        Create Your First Listing
                    </button>
                </div>
            `;
            return;
        }

        const html = this.products.map(product => this.createProductCard(product)).join('');
        container.innerHTML = html;
        this.attachProductEventListeners();
    }

    createProductCard(product) {
        const isPersistent = product.listingType === 'persistent';
        const isOutOfStock = product.status === 'Out of Stock';
        const isLowStock = isPersistent && product.inventoryTracking && product.inventory <= product.lowStockThreshold;
        
        return `
            <div class="border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow" data-product-id="${product._id}">
                <div class="flex space-x-4">
                    <img src="${product.images?.[0] || '/images/placeholder.jpg'}" 
                         alt="${product.name}" 
                         class="w-20 h-20 object-cover rounded-lg">
                    <div class="flex-1 min-w-0">
                        <h3 class="font-semibold text-gray-900 truncate">${product.name}</h3>
                        <p class="text-sm text-gray-600 mb-2">ZMW ${product.price.toFixed(2)}</p>
                        
                        <div class="flex flex-wrap gap-2 mb-2">
                            ${isPersistent ? `
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    <i class="fas fa-infinity mr-1"></i>Multi-Stock
                                </span>
                            ` : `
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    <i class="fas fa-times-circle mr-1"></i>One-Time
                                </span>
                            `}
                            ${isOutOfStock ? `
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                    <i class="fas fa-times-circle mr-1"></i>Out of Stock
                                </span>
                            ` : ''}
                            ${isLowStock && !isOutOfStock ? `
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    <i class="fas fa-exclamation-triangle mr-1"></i>Low Stock
                                </span>
                            ` : ''}
                        </div>

                        ${isPersistent ? `
                            <div class="text-sm text-gray-600 mb-3">
                                <div class="flex items-center justify-between">
                                    <span><i class="fas fa-box mr-1"></i>Stock: ${product.inventory}</span>
                                    <span><i class="fas fa-shopping-cart mr-1"></i>Sold: ${product.totalSold || 0}</span>
                                </div>
                            </div>
                        ` : ''}

                        <div class="flex flex-wrap gap-2">
                            ${isPersistent ? `
                                <button onclick="inventoryManager.showInventoryModal('${product._id}')" 
                                        class="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors">
                                    <i class="fas fa-edit mr-1"></i>Manage Stock
                                </button>
                            ` : ''}
                            <button onclick="inventoryManager.convertListingType('${product._id}')" 
                                    class="px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors">
                                <i class="fas fa-exchange-alt mr-1"></i>Convert Type
                            </button>
                            <button onclick="inventoryManager.viewSalesHistory('${product._id}')" 
                                    class="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors">
                                <i class="fas fa-chart-line mr-1"></i>Sales
                            </button>
                            <button onclick="window.location.href='/edit-product?id=${product._id}'" 
                                    class="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors">
                                <i class="fas fa-edit mr-1"></i>Edit
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showInventoryModal(productId) {
        const product = this.products.find(p => p._id === productId);
        if (!product) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h3 class="text-lg font-bold text-navy mb-4">Manage Inventory</h3>
                <p class="text-sm text-gray-600 mb-4">${product.name}</p>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                        <input type="number" id="inventory-input" min="0" value="${product.inventory || 1}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:outline-none">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Low Stock Alert</label>
                        <input type="number" id="threshold-input" min="1" value="${product.lowStockThreshold || 1}"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:outline-none">
                    </div>
                    
                    <div class="flex items-center">
                        <input type="checkbox" id="tracking-input" ${product.inventoryTracking ? 'checked' : ''}
                               class="w-4 h-4 text-gold border-gray-300 rounded focus:ring-gold">
                        <label for="tracking-input" class="ml-2 text-sm text-gray-700">Enable inventory tracking</label>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3 mt-6">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button onclick="inventoryManager.updateInventory('${productId}')" 
                            class="px-4 py-2 bg-gold text-navy rounded-lg hover:bg-yellow-400 transition-colors font-semibold">
                        Update
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    async updateInventory(productId) {
        try {
            const inventory = parseInt(document.getElementById('inventory-input').value) || 0;
            const lowStockThreshold = parseInt(document.getElementById('threshold-input').value) || 1;
            const inventoryTracking = document.getElementById('tracking-input').checked;

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/products/${productId}/inventory`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inventory,
                    lowStockThreshold,
                    inventoryTracking
                })
            });

            if (response.ok) {
                await this.loadProducts(); // Reload products
                document.querySelector('.fixed').remove(); // Close modal
                this.showToast('Inventory updated successfully', 'success');
            } else {
                throw new Error('Failed to update inventory');
            }
        } catch (error) {
            console.error('Error updating inventory:', error);
            this.showToast('Failed to update inventory', 'error');
        }
    }

    async convertListingType(productId) {
        const product = this.products.find(p => p._id === productId);
        if (!product) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                <h3 class="text-lg font-bold text-navy mb-4">Convert Listing Type</h3>
                <p class="text-sm text-gray-600 mb-4">${product.name}</p>
                
                <div class="space-y-3">
                    <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="radio" name="listingType" value="one_time" ${product.listingType === 'one_time' ? 'checked' : ''}
                               class="w-4 h-4 text-gold">
                        <div class="ml-3">
                            <div class="font-medium">One-Time Sale</div>
                            <div class="text-sm text-gray-500">Perfect for unique items</div>
                        </div>
                    </label>
                    
                    <label class="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                        <input type="radio" name="listingType" value="persistent" ${product.listingType === 'persistent' ? 'checked' : ''}
                               class="w-4 h-4 text-gold">
                        <div class="ml-3">
                            <div class="font-medium">Persistent Listing</div>
                            <div class="text-sm text-gray-500">For multiple quantities</div>
                        </div>
                    </label>
                    
                    <div id="inventory-field" class="hidden">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Initial Quantity</label>
                        <input type="number" id="convert-inventory" min="1" value="1"
                               class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gold focus:outline-none">
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3 mt-6">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button onclick="inventoryManager.performConversion('${productId}')" 
                            class="px-4 py-2 bg-gold text-navy rounded-lg hover:bg-yellow-400 transition-colors font-semibold">
                        Convert
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Show/hide inventory field based on selection
        modal.querySelectorAll('input[name="listingType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const inventoryField = document.getElementById('inventory-field');
                if (e.target.value === 'persistent') {
                    inventoryField.classList.remove('hidden');
                } else {
                    inventoryField.classList.add('hidden');
                }
            });
        });
    }

    async performConversion(productId) {
        try {
            const listingType = document.querySelector('input[name="listingType"]:checked').value;
            const inventory = listingType === 'persistent' ? 
                parseInt(document.getElementById('convert-inventory').value) || 1 : 1;

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/products/${productId}/listing-type`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    listingType,
                    inventory
                })
            });

            if (response.ok) {
                await this.loadProducts(); // Reload products
                document.querySelector('.fixed').remove(); // Close modal
                this.showToast('Listing type converted successfully', 'success');
            } else {
                throw new Error('Failed to convert listing type');
            }
        } catch (error) {
            console.error('Error converting listing type:', error);
            this.showToast('Failed to convert listing type', 'error');
        }
    }

    async viewSalesHistory(productId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE}/products/${productId}/sales`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.showSalesModal(productId, data);
            } else {
                throw new Error('Failed to load sales history');
            }
        } catch (error) {
            console.error('Error loading sales history:', error);
            this.showToast('Failed to load sales history', 'error');
        }
    }

    showSalesModal(productId, data) {
        const product = this.products.find(p => p._id === productId);
        if (!product) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
                <h3 class="text-lg font-bold text-navy mb-4">Sales History</h3>
                <p class="text-sm text-gray-600 mb-4">${product.name}</p>
                
                <div class="grid grid-cols-3 gap-4 mb-6">
                    <div class="text-center p-3 bg-blue-50 rounded-lg">
                        <div class="text-2xl font-bold text-blue-600">${data.totalSold || 0}</div>
                        <div class="text-sm text-gray-600">Total Sold</div>
                    </div>
                    <div class="text-center p-3 bg-green-50 rounded-lg">
                        <div class="text-2xl font-bold text-green-600">${data.currentInventory || 0}</div>
                        <div class="text-sm text-gray-600">Current Stock</div>
                    </div>
                    <div class="text-center p-3 bg-purple-50 rounded-lg">
                        <div class="text-2xl font-bold text-purple-600">${data.listingType}</div>
                        <div class="text-sm text-gray-600">Listing Type</div>
                    </div>
                </div>
                
                <div class="space-y-2">
                    ${data.salesHistory && data.salesHistory.length > 0 ? `
                        <h4 class="font-semibold text-gray-900 mb-3">Recent Sales</h4>
                        ${data.salesHistory.map(sale => `
                            <div class="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                    <div class="font-medium">${sale.buyer?.fullName || 'Unknown Buyer'}</div>
                                    <div class="text-sm text-gray-500">${new Date(sale.soldAt).toLocaleDateString()}</div>
                                </div>
                                <div class="text-right">
                                    <div class="font-semibold">ZMW ${sale.price.toFixed(2)}</div>
                                    <div class="text-sm text-gray-500">Qty: ${sale.quantity}</div>
                                </div>
                            </div>
                        `).join('')}
                    ` : `
                        <div class="text-center py-8 text-gray-500">
                            <i class="fas fa-chart-line text-4xl text-gray-300 mb-3"></i>
                            <p>No sales yet</p>
                        </div>
                    `}
                </div>
                
                <div class="flex justify-end mt-6">
                    <button onclick="this.closest('.fixed').remove()" 
                            class="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
    }

    updateStats() {
        const activeListings = document.getElementById('active-listings');
        if (activeListings) {
            const count = this.products.filter(p => p.status === 'Active').length;
            activeListings.textContent = count;
        }
    }

    attachProductEventListeners() {
        // Event listeners are attached via onclick attributes in the HTML
    }

    setupEventListeners() {
        // Additional setup if needed
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
        
        toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 transform translate-y-full transition-transform duration-300`;
        toast.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-y-full');
        }, 100);

        // Auto remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('translate-y-full');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.inventoryManager = new SellerInventoryManager();
});
