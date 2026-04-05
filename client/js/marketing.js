// Marketing Management JavaScript
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    console.log('Marketing page loaded, token:', token ? 'present' : 'missing');

    if (!token) {
        console.log('No token found, redirecting to login');
        window.location.href = '/login';
        return;
    }

    // Helper function to fix URLs to point to server
    function fixServerUrl(url) {
        if (!url) return url;
        return url.startsWith('/') ? `${API_BASE}${url}` : url;
    }

    // Make the helper function globally available
    window.fixServerUrl = fixServerUrl;

    console.log('Token found, loading marketing data');
    loadMarketingData();
});

// Tab switching
function switchTab(tabName, buttonElement) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }

    // Activate the clicked button
    if (buttonElement) {
        buttonElement.classList.add('active');
    }

    // Load data for the selected tab
    loadTabData(tabName);
}

// Load data for specific tab
async function loadTabData(tabName) {
    switch (tabName) {
        case 'ad-sliders':
            await loadAdSliders();
            initializeLinkDropdowns();
            updateAdSliderPreview();
            break;
        case 'category-cards':
            await loadCategoryCards();
            initializeLinkDropdowns();
            updateCategoryCardsPreview();
            break;
        case 'promotions':
            await loadPromotions();
            break;
        case 'banners':
            await loadBanners();
            break;
        case 'a-plus-content':
            await loadAPlusContent();
            break;
        case 'fallback-categories':
            await loadFallbackCategories();
            break;
        case 'asset-library':
            await loadAssetLibrary();
            break;
    }
}

function initializeLinkDropdowns() {
    // Initialize ad slider link dropdowns
    document.querySelectorAll('[id^="ad-link-preset-"]').forEach(select => {
        const id = select.id.replace('ad-link-preset-', '');
        updateAdLink(id);
    });

    // Initialize category card link dropdowns
    document.querySelectorAll('[id^="card-link-preset-"]').forEach(select => {
        const id = select.id.replace('card-link-preset-', '');
        updateCardLink(id);
    });
}

// Load all marketing data
async function loadMarketingData() {
    await loadAdSliders();
    initializeLinkDropdowns();
    updateAdSliderPreview();
}

// Ad Sliders Management
async function loadAdSliders() {
    try {
        const response = await fetch(`${API_BASE}/marketing/ad-sliders`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const adSliders = await response.json();
            renderAdSliders(adSliders);
        }
    } catch (error) {
        console.error('Error loading ad sliders:', error);
    }
}

function renderAdSliders(adSliders) {
    const container = document.getElementById('ad-sliders-list');
    if (!adSliders || adSliders.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-images text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No ad sliders found. Create your first ad slider!</p>
                <button onclick="addNewAdSlider()" class="mt-4 bg-button-gold text-white px-4 py-2 rounded-lg hover-bg-button-gold transition-colors">
                    <i class="fas fa-plus mr-2"></i>Create First Ad Slider
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = adSliders.map((ad, index) => `
        <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center space-x-4 mb-4">
                        <span class="font-bold text-navy">Ad ${index + 1}</span>
                        <span class="px-2 py-1 text-xs rounded-full ${ad.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                            ${ad.active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input type="text" value="${ad.title}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" id="ad-title-${ad._id || ad.id}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Link</label>
                            <div class="space-y-2">
                                <select id="ad-link-preset-${ad._id || ad.id}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" onchange="updateAdLink('${ad._id || ad.id}')">
                                    <option value="">Select Category Link...</option>
                                    <option value="/products?category=Hot%20Deals" ${ad.link === '/products?category=Hot%20Deals' ? 'selected' : ''}>Hot Deals</option>
                                    <option value="/products?category=Best%20Sellers" ${ad.link === '/products?category=Best%20Sellers' ? 'selected' : ''}>Best Sellers</option>
                                    <option value="/products?category=Electronics" ${ad.link === '/products?category=Electronics' ? 'selected' : ''}>Electronics</option>
                                    <option value="/products?category=Computers%20%26%20Software" ${ad.link === '/products?category=Computers%20%26%20Software' ? 'selected' : ''}>Computers & Software</option>
                                    <option value="/products?category=Services" ${ad.link === '/products?category=Services' ? 'selected' : ''}>Services</option>
                                    <option value="/products?category=Men%27s%20Clothing" ${ad.link === '/products?category=Men%27s%20Clothing' ? 'selected' : ''}>Men's Clothing</option>
                                    <option value="/products?category=Women%27s%20Clothing" ${ad.link === '/products?category=Women%27s%20Clothing' ? 'selected' : ''}>Women's Clothing</option>
                                    <option value="/products?category=Shoes" ${ad.link === '/products?category=Shoes' ? 'selected' : ''}>Shoes</option>
                                    <option value="/products?category=Accessories" ${ad.link === '/products?category=Accessories' ? 'selected' : ''}>Accessories</option>
                                    <option value="/products?category=Personal%20Care%20%26%20Beauty" ${ad.link === '/products?category=Personal%20Care%20%26%20Beauty' ? 'selected' : ''}>Personal Care & Beauty</option>
                                    <option value="/products?category=Food%20%26%20Beverages" ${ad.link === '/products?category=Food%20%26%20Beverages' ? 'selected' : ''}>Food & Beverages</option>
                                    <option value="/products?category=Sports%20%26%20Outdoors" ${ad.link === '/products?category=Sports%20%26%20Outdoors' ? 'selected' : ''}>Sports & Outdoors</option>
                                    <option value="/products?category=Home%20%26%20Living" ${ad.link === '/products?category=Home%20%26%20Living' ? 'selected' : ''}>Home & Living</option>
                                    <option value="/products?category=Watches%20%26%20Jewellery" ${ad.link === '/products?category=Watches%20%26%20Jewellery' ? 'selected' : ''}>Watches & Jewellery</option>
                                    <option value="/seller" ${ad.link === '/seller' ? 'selected' : ''}>Become a Seller</option>
                                    <option value="custom">Custom Link</option>
                                </select>
                                <input type="text" value="${ad.link || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" id="ad-link-${ad._id || ad.id}" placeholder="Enter custom link...">
                            </div>
                        </div>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Background Image</label>
                        <div class="space-y-2">
                            <input type="text" value="${ad.backgroundImage || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" id="ad-image-${ad._id || ad.id}" placeholder="Enter image URL...">
                            <button onclick="selectAsset('ad', '${ad._id || ad.id}')" class="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300">
                                <i class="fas fa-image mr-2"></i>Select from Assets
                            </button>
                        </div>
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button onclick="saveAdSlider('${ad._id || ad.id}')" class="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700">
                        <i class="fas fa-save"></i>
                    </button>
                    <button onclick="deleteAdSlider('${ad._id || ad.id}')" class="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Category Cards Management
async function loadCategoryCards() {
    try {
        const response = await fetch(`${API_BASE}/marketing/category-cards`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const cards = await response.json();
            renderCategoryCards(cards);
        }
    } catch (error) {
        console.error('Error loading category cards:', error);
    }
}

function renderCategoryCards(cards) {
    const container = document.getElementById('category-cards-list');
    if (!cards || cards.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-th-large text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No category cards found. Create your first category card!</p>
                <button onclick="addNewCategoryCard()" class="mt-4 bg-button-gold text-white px-4 py-2 rounded-lg hover-bg-button-gold transition-colors">
                    <i class="fas fa-plus mr-2"></i>Create First Category Card
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = cards.map(card => `
        <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <div class="flex items-center space-x-4 mb-4">
                        <span class="font-bold text-navy">${card.name}</span>
                        <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            ${card.cardType}
                        </span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input type="text" value="${card.name}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" id="card-name-${card._id || card.id}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                            <input type="text" value="${card.title}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" id="card-title-${card._id || card.id}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input type="text" value="${card.description}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" id="card-desc-${card._id || card.id}">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Link</label>
                            <div class="space-y-2">
                                <select id="card-link-preset-${card._id || card.id}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" onchange="updateCardLink('${card._id || card.id}')">
                                    <option value="">Select Category Link...</option>
                                    <option value="/products?category=Hot%20Deals" ${card.link === '/products?category=Hot%20Deals' ? 'selected' : ''}>Hot Deals</option>
                                    <option value="/products?category=Best%20Sellers" ${card.link === '/products?category=Best%20Sellers' ? 'selected' : ''}>Best Sellers</option>
                                    <option value="/products?category=Electronics" ${card.link === '/products?category=Electronics' ? 'selected' : ''}>Electronics</option>
                                    <option value="/products?category=Computers%20%26%20Software" ${card.link === '/products?category=Computers%20%26%20Software' ? 'selected' : ''}>Computers & Software</option>
                                    <option value="/products?category=Services" ${card.link === '/products?category=Services' ? 'selected' : ''}>Services</option>
                                    <option value="/products?category=Men%27s%20Clothing" ${card.link === '/products?category=Men%27s%20Clothing' ? 'selected' : ''}>Men's Clothing</option>
                                    <option value="/products?category=Women%27s%20Clothing" ${card.link === '/products?category=Women%27s%20Clothing' ? 'selected' : ''}>Women's Clothing</option>
                                    <option value="/products?category=Shoes" ${card.link === '/products?category=Shoes' ? 'selected' : ''}>Shoes</option>
                                    <option value="/products?category=Accessories" ${card.link === '/products?category=Accessories' ? 'selected' : ''}>Accessories</option>
                                    <option value="/products?category=Personal%20Care%20%26%20Beauty" ${card.link === '/products?category=Personal%20Care%20%26%20Beauty' ? 'selected' : ''}>Personal Care & Beauty</option>
                                    <option value="/products?category=Food%20%26%20Beverages" ${card.link === '/products?category=Food%20%26%20Beverages' ? 'selected' : ''}>Food & Beverages</option>
                                    <option value="/products?category=Sports%20%26%20Outdoors" ${card.link === '/products?category=Sports%20%26%20Outdoors' ? 'selected' : ''}>Sports & Outdoors</option>
                                    <option value="/products?category=Home%20%26%20Living" ${card.link === '/products?category=Home%20%26%20Living' ? 'selected' : ''}>Home & Living</option>
                                    <option value="/products?category=Watches%20%26%20Jewellery" ${card.link === '/products?category=Watches%20%26%20Jewellery' ? 'selected' : ''}>Watches & Jewellery</option>
                                    <option value="/seller" ${card.link === '/seller' ? 'selected' : ''}>Become a Seller</option>
                                    <option value="custom">Custom Link</option>
                                </select>
                                <input type="text" value="${card.link || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" id="card-link-${card._id || card.id}" placeholder="Enter custom link...">
                            </div>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
                            <select class="w-full px-3 py-2 border border-gray-300 rounded-lg" id="card-type-${card._id || card.id}">
                                <option value="square" ${card.cardType === 'square' ? 'selected' : ''}>Square</option>
                                <option value="rectangle" ${card.cardType === 'rectangle' ? 'selected' : ''}>Rectangle</option>
                            </select>
                        </div>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Card Image</label>
                        <div class="space-y-2">
                            <input type="text" value="${card.image || ''}" class="w-full px-3 py-2 border border-gray-300 rounded-lg" id="card-image-${card._id || card.id}" placeholder="Enter image URL...">
                            <button onclick="selectAsset('card', '${card._id || card.id}')" class="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300">
                                <i class="fas fa-image mr-2"></i>Select from Assets
                            </button>
                        </div>
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button onclick="saveCategoryCard('${card._id || card.id}')" class="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700">
                        <i class="fas fa-save"></i>
                    </button>
                    <button onclick="deleteCategoryCard('${card._id || card.id}')" class="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Asset Library Management
async function loadAssetLibrary() {
    try {
        const response = await fetch(`${API_BASE}/marketing/assets`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const assets = await response.json();
            console.log('Assets loaded:', assets); // Debug log
            renderAssetLibrary(assets);
        } else {
            console.error('Failed to load assets:', response.status, await response.text());
            renderAssetLibrary([]); // Show empty state
        }
    } catch (error) {
        console.error('Error loading assets:', error);
        renderAssetLibrary([]); // Show empty state on error
    }
}

// Fallback Categories Management
async function loadFallbackCategories() {
    const container = document.getElementById('fallback-categories-list');
    if (container) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-spinner fa-spin text-4xl mb-4"></i>
                <p>Loading fallback categories...</p>
            </div>
        `;
    }

    try {
        const response = await fetch(`${API_BASE}/marketing/fallback-categories`, {
            cache: 'no-store',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Cache-Control': 'no-cache'
            }
        });

        if (response.status === 401 || response.status === 403) {
            const bodyText = await response.text();
            console.error('Failed to load fallback categories (auth):', response.status, bodyText);
            if (container) {
                container.innerHTML = '<div class="text-center py-12 text-red-600"><p class="font-medium">Authentication failed. Please log in again.</p></div>';
            }
            return;
        }

        if (!response.ok) {
            const bodyText = await response.text();
            console.error('Failed to load fallback categories:', response.status, bodyText);
            if (container) {
                container.innerHTML = '<div class="text-center py-12 text-red-600"><p class="font-medium">Failed to load fallback categories.</p></div>';
            }
            renderFallbackCategories([]);
            return;
        }

        const fallbackCategories = await response.json();
        renderFallbackCategories(fallbackCategories);
    } catch (error) {
        console.error('Error loading fallback categories:', error);
        if (container) {
            container.innerHTML = '<div class="text-center py-12 text-red-600"><p class="font-medium">Error loading fallback categories. Please refresh.</p></div>';
        }
        renderFallbackCategories([]);
    }
}

function renderAssetLibrary(assets) {
    const container = document.getElementById('asset-library-grid');
    if (!container) {
        console.error('Asset library container not found');
        return;
    }

    const searchTerm = document.getElementById('asset-search')?.value?.toLowerCase() || '';

    // Defensive filtering with proper null checks
    const filteredAssets = assets ? assets.filter(asset => {
        if (!asset) return false;

        const filename = asset.filename || asset.name || '';
        const mimetype = asset.mimetype || asset.type || '';

        return filename.toLowerCase().includes(searchTerm) ||
            mimetype.toLowerCase().includes(searchTerm);
    }) : [];

    if (!assets || assets.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8">
                <i class="fas fa-photo-video text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No assets found. Upload your first asset!</p>
                <label for="asset-upload" class="mt-4 inline-block bg-button-gold text-white px-4 py-2 rounded-lg hover-bg-button-gold transition-colors cursor-pointer">
                    <i class="fas fa-upload mr-2"></i>Upload First Asset
                </label>
            </div>
        `;
        return;
    }

    if (filteredAssets.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8">
                <i class="fas fa-search text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No assets found matching "${searchTerm}"</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredAssets.map(asset => `
        <div class="asset-item" data-asset-id="${asset._id || asset.id}">
            ${asset.mimetype && asset.mimetype.includes('image') ?
            `<img src="${fixServerUrl(asset.url)}" alt="${asset.filename || asset.name || 'Asset'}" class="w-full h-40 object-cover">` :
            asset.mimetype && asset.mimetype.includes('video') ?
                `<video src="${fixServerUrl(asset.url)}" class="w-full h-40 object-cover" controls></video>` :
                `<div class="w-full h-40 bg-gray-200 flex items-center justify-center">
                    <i class="fas fa-file text-3xl text-gray-400"></i>
                </div>`
        }
            <div class="p-2">
                <p class="text-sm font-medium truncate">${asset.filename || asset.name || 'Unnamed Asset'}</p>
                <p class="text-xs text-gray-500">${asset.mimetype || asset.type || 'Unknown'}</p>
                <p class="text-xs text-gray-500">${asset.size ? (asset.size / 1024).toFixed(1) + 'KB' : 'Unknown size'}</p>
            </div>
            <div class="absolute top-2 right-2 flex space-x-1">
                <button onclick="copyAssetUrl('${asset.url}')" class="bg-blue-600 text-white p-1 rounded hover:bg-blue-700" title="Copy URL">
                    <i class="fas fa-copy text-xs"></i>
                </button>
                <button onclick="deleteAsset('${asset._id || asset.id}')" class="bg-red-600 text-white p-1 rounded hover:bg-red-700" title="Delete">
                    <i class="fas fa-trash text-xs"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Fallback Categories Management
function renderFallbackCategories(fallbackCategories) {
    const container = document.getElementById('fallback-categories-list');
    if (!container) {
        console.error('Fallback categories container not found');
        return;
    }

    // Load default categories from /api/categories to show as base
    fetch(`${API_BASE}/categories`)
        .then(response => response.json())
        .then(defaultCategories => {
            if (!Array.isArray(defaultCategories) || defaultCategories.length === 0) {
                container.innerHTML = '<div class="text-center py-12 text-gray-500"><p>No categories available to customize.</p></div>';
                return;
            }

            // Create a map of existing overrides
            const overrideMap = {};
            fallbackCategories.forEach(override => {
                overrideMap[override.originalName] = override;
            });

            // Define the desired order of categories (same as in index.html)
            const orderedNames = [
                'Hot Deals',
                'Best Sellers',
                'Men\'s Clothing',
                'Women\'s Clothing',
                'Shoes',
                'Accessories',
                'Electronics',
                'Computers & Software',
                'Services',
                'Watches & Jewellery',
                'Personal Care & Beauty',
                'Food & Beverages',
                'Sports & Outdoors',
                'Home & Living'
            ];

            // Sort categories based on the defined order
            const sortedCategories = [];
            orderedNames.forEach(name => {
                const cat = defaultCategories.find(c => c.name === name);
                if (cat) sortedCategories.push(cat);
            });

            // Add any remaining categories
            defaultCategories.forEach(cat => {
                if (!orderedNames.includes(cat.name)) sortedCategories.push(cat);
            });

            container.innerHTML = sortedCategories.map((category, index) => {
                const override = overrideMap[category.name];
                const displayName = override ? override.name : category.name;
                const displayTitle = override ? override.title : category.title || category.name;
                const displayDescription = override ? override.description : category.description || category.name;
                const displayImage = override ? override.image : category.image || `https://placehold.co/300x240?text=${encodeURIComponent(category.name)}`;
                const displayLink = override ? override.link : `/products?category=${encodeURIComponent(category.name)}`;
                const cardType = override ? override.cardType : (index % 3 === 0 ? 'rectangle' : 'square'); // Professional alternating pattern

                return `
                    <div class="bg-white border border-gray-200 rounded-lg p-6">
                        <div class="flex justify-between items-start mb-4">
                            <div class="flex items-center space-x-4">
                                <span class="font-bold text-navy text-lg">${displayName}</span>
                                <span class="px-2 py-1 text-xs rounded-full ${override ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                    ${override ? 'Customized' : 'Default'}
                                </span>
                            </div>
                            ${override ? `
                                <button onclick="resetFallbackCategory('${category.name}')" class="text-red-600 hover:text-red-800 text-sm">
                                    <i class="fas fa-undo mr-1"></i>Reset to Default
                                </button>
                            ` : ''}
                        </div>

                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                                <input type="text" value="${displayName}" class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                       id="fallback-name-${category.name}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                                <input type="text" value="${displayTitle}" class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                       id="fallback-title-${category.name}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <input type="text" value="${displayDescription}" class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                       id="fallback-desc-${category.name}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Link</label>
                                <input type="text" value="${displayLink}" class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                       id="fallback-link-${category.name}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Image URL</label>
                                <input type="text" value="${displayImage}" class="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                       id="fallback-image-${category.name}">
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
                                <select class="w-full px-3 py-2 border border-gray-300 rounded-lg" id="fallback-type-${category.name}">
                                    <option value="square" ${cardType === 'square' ? 'selected' : ''}>Square</option>
                                    <option value="rectangle" ${cardType === 'rectangle' ? 'selected' : ''}>Rectangle</option>
                                </select>
                            </div>
                        </div>

                        <div class="flex justify-end space-x-2">
                            <button onclick="selectFallbackAsset(this)" data-category-name="${category.name.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" class="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300">
                                <i class="fas fa-image mr-2"></i>Select from Assets
                            </button>
                            <button onclick="saveFallbackCategory(this)" data-category-name="${category.name.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                                <i class="fas fa-save mr-2"></i>Save Changes
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        })
        .catch(error => {
            console.error('Error loading default categories:', error);
            container.innerHTML = '<div class="text-center py-12 text-red-600"><p class="font-medium">Failed to load base categories.</p></div>';
        });
}

async function resetFallbackCategory(originalName) {
    if (!confirm('Are you sure you want to reset this category to default?')) return;

    try {
        const existingOverrides = await loadFallbackCategories();
        const existingOverride = existingOverrides.find(o => o.originalName === originalName);

        if (existingOverride) {
            const response = await fetch(`${API_BASE}/marketing/fallback-categories/${existingOverride._id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (response.ok) {
                showToast('Fallback category reset to default', 'success');
                await loadFallbackCategories(); // Refresh the list
            } else {
                showToast('Failed to reset fallback category', 'error');
            }
        }
    } catch (error) {
        console.error('Error resetting fallback category:', error);
        showToast('Failed to reset fallback category', 'error');
    }
}

async function saveFallbackCategories() {
    // This function would save all changes at once if needed
    showToast('All fallback categories saved successfully', 'success');
}

async function saveFallbackCategoryData(originalName) {
    const name = document.getElementById(`fallback-name-${originalName}`)?.value || '';
    const title = document.getElementById(`fallback-title-${originalName}`)?.value || '';
    const description = document.getElementById(`fallback-desc-${originalName}`)?.value || '';
    const link = document.getElementById(`fallback-link-${originalName}`)?.value || '';
    const image = document.getElementById(`fallback-image-${originalName}`)?.value || '';
    const cardType = document.getElementById(`fallback-type-${originalName}`)?.value || 'square';

    try {
        const response = await fetch(`${API_BASE}/marketing/fallback-categories`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                originalName,
                name,
                title,
                description,
                link,
                image,
                cardType
            })
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Fallback category saved successfully', 'success');
            await loadFallbackCategories(); // Refresh the list
        } else {
            showToast(data.message || 'Failed to save fallback category', 'error');
        }
    } catch (error) {
        console.error('Error saving fallback category:', error);
        showToast('Failed to save fallback category', 'error');
    }
}

// Wrapper functions for data attribute approach
function selectFallbackAsset(button) {
    const categoryName = button.getAttribute('data-category-name');
    if (categoryName) {
        selectAsset('fallback', categoryName);
    }
}

function saveFallbackCategory(button) {
    const categoryName = button.getAttribute('data-category-name');
    if (categoryName) {
        saveFallbackCategoryData(categoryName);
    }
}

async function handleAssetUpload(event) {
    const files = event.target.files;
    const formData = new FormData();

    for (let file of files) {
        formData.append('assets', file);
    }

    try {
        const response = await fetch('https://api.virtuosazm.com/api/marketing/assets', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });

        if (response.ok) {
            showToast('Assets uploaded successfully', 'success');
            loadAssetLibrary();
        } else {
            throw new Error('Upload failed');
        }
    } catch (error) {
        console.error('Error uploading assets:', error);
        showToast('Failed to upload assets', 'error');
    }
}

// Save functions
async function saveAdSlider(id) {
    const title = document.getElementById(`ad-title-${id}`).value;
    const link = document.getElementById(`ad-link-${id}`).value;
    const backgroundImage = document.getElementById(`ad-image-${id}`).value;

    try {
        const response = await fetch(`https://api.virtuosazm.com/api/marketing/ad-sliders/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, link, backgroundImage })
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Ad slider saved successfully', 'success');
            await loadAdSliders(); // Refresh the list
            updateAdSliderPreview(); // Update preview
        } else {
            showToast(data.message || 'Failed to save ad slider', 'error');
        }
    } catch (error) {
        console.error('Error saving ad slider:', error);
        showToast('Failed to save ad slider', 'error');
    }
}

async function saveCategoryCard(id) {
    const name = document.getElementById(`card-name-${id}`).value;
    const title = document.getElementById(`card-title-${id}`).value;
    const description = document.getElementById(`card-desc-${id}`).value;
    const link = document.getElementById(`card-link-${id}`).value;
    const cardType = document.getElementById(`card-type-${id}`).value;
    const image = document.getElementById(`card-image-${id}`).value;

    try {
        const response = await fetch(`https://api.virtuosazm.com/api/marketing/category-cards/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, title, description, link, cardType, image })
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Category card saved successfully', 'success');
            await loadCategoryCards(); // Refresh the list
        } else {
            showToast(data.message || 'Failed to save category card', 'error');
        }
    } catch (error) {
        console.error('Error saving category card:', error);
        showToast('Failed to save category card', 'error');
    }
}

function updateCardLink(id) {
    const presetSelect = document.getElementById(`card-link-preset-${id}`);
    const linkInput = document.getElementById(`card-link-${id}`);

    if (presetSelect.value === 'custom') {
        linkInput.style.display = 'block';
        linkInput.value = '';
    } else if (presetSelect.value) {
        linkInput.style.display = 'none';
        linkInput.value = presetSelect.value;
    } else {
        linkInput.style.display = 'block';
        linkInput.value = '';
    }
}

function updateAdLink(id) {
    const presetSelect = document.getElementById(`ad-link-preset-${id}`);
    const linkInput = document.getElementById(`ad-link-${id}`);

    if (presetSelect.value === 'custom') {
        linkInput.style.display = 'block';
        linkInput.value = '';
    } else if (presetSelect.value) {
        linkInput.style.display = 'none';
        linkInput.value = presetSelect.value;
    } else {
        linkInput.style.display = 'block';
        linkInput.value = '';
    }
}

// Preview functionality
let slideInterval;
let currentSlideIndex = 0;
let totalSlides = 0;

let currentPreviewMode = 'desktop';
let currentCategoryPreviewMode = 'free'; // 'free' or 'preset'
let currentPresetStyle = 'amazon'; // 'amazon', 'ebay', or 'rakuten'

// Base categories data
const BASE_CATEGORIES = [
    { name: 'Electronics', title: 'Electronics', link: '/products?category=Electronics' },
    { name: 'Computers & Software', title: 'Computers & Software', link: '/products?category=Computers%20%26%20Software' },
    { name: 'Services', title: 'Services', link: '/products?category=Services' },
    { name: 'Watches & Jewellery', title: 'Watches & Jewellery', link: '/products?category=Watches%20%26%20Jewellery' },
    { name: 'Mens Clothing', title: 'Men\'s Clothing', link: '/products?category=Men%27s%20Clothing' },
    { name: 'Womens Clothing', title: 'Women\'s Clothing', link: '/products?category=Women%27s%20Clothing' },
    { name: 'Shoes', title: 'Shoes', link: '/products?category=Shoes' },
    { name: 'Accessories', title: 'Accessories', link: '/products?category=Accessories' },
    { name: 'Personal Care & Beauty', title: 'Personal Care & Beauty', link: '/products?category=Personal%20Care%20%26%20Beauty' },
    { name: 'Food & Beverages', title: 'Food & Beverages', link: '/products?category=Food%20%26%20Beverages' },
    { name: 'Sports & Outdoors', title: 'Sports & Outdoors', link: '/products?category=Sports%20%26%20Outdoors' },
    { name: 'Home & Living', title: 'Home & Living', link: '/products?category=Home%20%26%20Living' },
    { name: 'Hot Deals', title: 'Hot Deals', link: '/products?category=Hot%20Deals' },
    { name: 'Best Sellers', title: 'Best Sellers', link: '/products?category=Best%20Sellers' }
];

// Preset layouts with different arrangements
const PRESET_LAYOUTS = {
    amazon: [
        // Amazon style: Emphasis on featured categories with rectangles
        { index: 0, cardType: 'rectangle' },  // Electronics - large featured
        { index: 4, cardType: 'square' },     // Men's Clothing
        { index: 5, cardType: 'square' },     // Women's Clothing
        { index: 1, cardType: 'rectangle' },  // Computers & Software
        { index: 6, cardType: 'square' },     // Shoes
        { index: 7, cardType: 'square' },     // Accessories
        { index: 11, cardType: 'rectangle' }, // Home & Living
        { index: 8, cardType: 'square' },     // Personal Care & Beauty
        { index: 9, cardType: 'square' },     // Food & Beverages
        { index: 10, cardType: 'rectangle' }, // Sports & Outdoors
        { index: 2, cardType: 'square' },     // Services
        { index: 3, cardType: 'square' },     // Watches & Jewellery
        { index: 12, cardType: 'rectangle' }, // Hot Deals
        { index: 13, cardType: 'square' }     // Best Sellers
    ],
    ebay: [
        // eBay style: Traditional grid with mixed squares and rectangles
        { index: 0, cardType: 'square' },     // Electronics
        { index: 1, cardType: 'square' },     // Computers & Software
        { index: 2, cardType: 'square' },     // Services
        { index: 3, cardType: 'rectangle' },  // Watches & Jewellery
        { index: 4, cardType: 'square' },     // Men's Clothing
        { index: 5, cardType: 'square' },     // Women's Clothing
        { index: 6, cardType: 'square' },     // Shoes
        { index: 7, cardType: 'rectangle' },  // Accessories
        { index: 8, cardType: 'square' },     // Personal Care & Beauty
        { index: 9, cardType: 'square' },     // Food & Beverages
        { index: 10, cardType: 'rectangle' }, // Sports & Outdoors
        { index: 11, cardType: 'square' },    // Home & Living
        { index: 12, cardType: 'square' },    // Hot Deals
        { index: 13, cardType: 'square' }     // Best Sellers
    ],
    rakuten: [
        // Rakuten style: Modern alternating pattern
        { index: 0, cardType: 'rectangle' },  // Electronics
        { index: 12, cardType: 'square' },    // Hot Deals
        { index: 1, cardType: 'square' },     // Computers & Software
        { index: 13, cardType: 'square' },    // Best Sellers
        { index: 2, cardType: 'rectangle' },  // Services
        { index: 4, cardType: 'square' },     // Men's Clothing
        { index: 3, cardType: 'square' },     // Watches & Jewellery
        { index: 5, cardType: 'square' },     // Women's Clothing
        { index: 6, cardType: 'rectangle' },  // Shoes
        { index: 7, cardType: 'square' },     // Accessories
        { index: 8, cardType: 'square' },     // Personal Care & Beauty
        { index: 9, cardType: 'rectangle' },  // Food & Beverages
        { index: 10, cardType: 'square' },    // Sports & Outdoors
        { index: 11, cardType: 'square' }     // Home & Living
    ],
    'modern-minimal': [
        // Modern Minimal: Clean grid with occasional large highlights
        { index: 12, cardType: 'rectangle' }, // Hot Deals (Feature)
        { index: 0, cardType: 'square' },     // Electronics
        { index: 1, cardType: 'square' },     // Computers
        { index: 13, cardType: 'square' },    // Best Sellers
        { index: 3, cardType: 'square' },     // Jewellery
        { index: 10, cardType: 'rectangle' }, // Sports (High impact)
        { index: 4, cardType: 'square' },     // Men's
        { index: 5, cardType: 'square' },     // Women's
        { index: 6, cardType: 'square' },     // Shoes
        { index: 7, cardType: 'square' },     // Accessories
        { index: 11, cardType: 'rectangle' }, // Home
        { index: 8, cardType: 'square' },     // Beauty
        { index: 9, cardType: 'square' },     // Food
        { index: 2, cardType: 'square' }      // Services
    ],
    'vibrant-mosaic': [
        // Vibrant Mosaic: Dynamic mixing of shapes for high engagement
        { index: 4, cardType: 'square' },     // Men's
        { index: 5, cardType: 'square' },     // Women's
        { index: 12, cardType: 'rectangle' }, // Hot Deals
        { index: 1, cardType: 'square' },     // Computers
        { index: 0, cardType: 'square' },     // Electronics
        { index: 13, cardType: 'rectangle' }, // Best Sellers
        { index: 7, cardType: 'square' },     // Accessories
        { index: 6, cardType: 'square' },     // Shoes
        { index: 3, cardType: 'rectangle' },  // Jewellery
        { index: 8, cardType: 'square' },     // Beauty
        { index: 9, cardType: 'square' },     // Food
        { index: 11, cardType: 'rectangle' }, // Home
        { index: 10, cardType: 'square' },    // Sports
        { index: 2, cardType: 'square' }      // Services
    ],
    'editorial-gallery': [
        // Editorial Gallery: Magazine style focus on featured sections
        { index: 0, cardType: 'rectangle' },  // Electronics (Leading)
        { index: 1, cardType: 'rectangle' },  // Computers (Leading)
        { index: 12, cardType: 'square' },    // Hot Deals
        { index: 13, cardType: 'square' },    // Best Sellers
        { index: 4, cardType: 'square' },     // Men's
        { index: 5, cardType: 'square' },     // Women's
        { index: 10, cardType: 'rectangle' }, // Sports
        { index: 11, cardType: 'rectangle' }, // Home
        { index: 6, cardType: 'square' },     // Shoes
        { index: 7, cardType: 'square' },     // Accessories
        { index: 3, cardType: 'square' },     // Jewellery
        { index: 8, cardType: 'square' },     // Beauty
        { index: 9, cardType: 'square' },     // Food
        { index: 2, cardType: 'square' }      // Services
    ]
};

function getPresetCategories(style = 'amazon') {
    const layout = PRESET_LAYOUTS[style] || PRESET_LAYOUTS.amazon;
    return layout.map(item => ({
        ...BASE_CATEGORIES[item.index],
        cardType: item.cardType,
        isPreset: true,
        presetStyle: style
    }));
}

function initializeSlider(slideCount) {
    currentSlideIndex = 0;
    totalSlides = slideCount;
    updateSlideIndicators();

    // Auto-play functionality (optional - can be disabled)
    if (slideInterval) clearInterval(slideInterval);
    // slideInterval = setInterval(() => {
    //     nextSlide();
    // }, 3000); // Change slide every 3 seconds
}

function nextSlide() {
    currentSlideIndex = (currentSlideIndex + 1) % totalSlides;
    updateSliderPosition();
    updateSlideIndicators();
}

function prevSlide() {
    currentSlideIndex = (currentSlideIndex - 1 + totalSlides) % totalSlides;
    updateSliderPosition();
    updateSlideIndicators();
}

function goToSlide(index) {
    currentSlideIndex = index;
    updateSliderPosition();
    updateSlideIndicators();
}

function updateSliderPosition() {
    const slidesContainer = document.getElementById('slider-slides');
    if (slidesContainer) {
        slidesContainer.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    }
}

function updateSlideIndicators() {
    const dots = document.querySelectorAll('#ad-slider-preview .w-2');
    dots.forEach((dot, index) => {
        if (index === currentSlideIndex) {
            dot.className = 'w-2 h-2 rounded-full bg-white bg-opacity-100 transition-all';
        } else {
            dot.className = 'w-2 h-2 rounded-full bg-white bg-opacity-50 hover:bg-opacity-75 transition-all';
        }
    });
}

function setPreviewMode(mode) {
    currentPreviewMode = mode;

    // Update button states for ad sliders
    const desktopBtn = document.getElementById('preview-desktop-btn');
    const mobileBtn = document.getElementById('preview-mobile-btn');

    if (desktopBtn && mobileBtn) {
        if (mode === 'desktop') {
            desktopBtn.className = 'bg-blue-600 text-white px-3 py-2 rounded-lg text-sm';
            mobileBtn.className = 'bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm';
        } else {
            desktopBtn.className = 'bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm';
            mobileBtn.className = 'bg-blue-600 text-white px-3 py-2 rounded-lg text-sm';
        }
    }

    // Update button states for category cards
    const desktopBtnCards = document.getElementById('preview-desktop-btn-cards');
    const mobileBtnCards = document.getElementById('preview-mobile-btn-cards');

    if (desktopBtnCards && mobileBtnCards) {
        if (mode === 'desktop') {
            desktopBtnCards.className = 'bg-blue-600 text-white px-3 py-2 rounded-lg text-sm';
            mobileBtnCards.className = 'bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm';
        } else {
            desktopBtnCards.className = 'bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm';
            mobileBtnCards.className = 'bg-blue-600 text-white px-3 py-2 rounded-lg text-sm';
        }
    }

    // Update previews
    updateAdSliderPreview();
    updateCategoryCardsPreview();
}

function updateAdSliderPreview() {
    const previewContainer = document.getElementById('ad-slider-preview');
    if (!previewContainer) return;

    // Get current ad sliders from the form inputs
    const adSliders = [];
    document.querySelectorAll('#ad-sliders-list > div').forEach(card => {
        const id = card.querySelector('input[id^="ad-title-"]')?.id?.replace('ad-title-', '');
        if (!id) return;

        const title = document.getElementById(`ad-title-${id}`)?.value || '';
        const backgroundImage = document.getElementById(`ad-image-${id}`)?.value || '';

        if (title || backgroundImage) {
            adSliders.push({ title, backgroundImage });
        }
    });

    if (adSliders.length === 0) {
        previewContainer.innerHTML = `
            <div class="flex items-center justify-center h-48 text-gray-500">
                <div class="text-center">
                    <i class="fas fa-images text-4xl mb-2"></i>
                    <p>No ad sliders to preview</p>
                </div>
            </div>
        `;
        return;
    }

    const previewClasses = currentPreviewMode === 'mobile'
        ? 'max-w-sm mx-auto'
        : 'max-w-4xl mx-auto';

    previewContainer.className = `preview-slider bg-gray-100 rounded-lg overflow-hidden relative ${previewClasses}`;

    // Create slideshow container
    previewContainer.innerHTML = `
        <div class="relative h-48 overflow-hidden">
            <div id="slider-slides" class="flex h-full transition-transform duration-500 ease-in-out">
                ${adSliders.map((ad, index) => `
                    <div class="flex-shrink-0 w-full h-full relative bg-cover bg-center flex items-center justify-center text-white"
                         style="background-image: url('${ad.backgroundImage || 'https://placehold.co/1200x320/0A1128/FFFFFF?text=' + encodeURIComponent(ad.title || 'Ad ' + (index + 1))}')">
                        <div class="absolute inset-0 bg-black bg-opacity-40"></div>
                        <div class="relative z-10 text-center">
                            <h2 class="text-2xl font-bold mb-2">${ad.title || 'Sample Ad Title'}</h2>
                            <p class="text-sm opacity-90">Click to explore</p>
                        </div>
                    </div>
                `).join('')}
            </div>

            <!-- Navigation arrows -->
            ${adSliders.length > 1 ? `
                <button onclick="prevSlide()" class="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 text-white transition-all">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <button onclick="nextSlide()" class="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-2 text-white transition-all">
                    <i class="fas fa-chevron-right"></i>
                </button>

                <!-- Dots indicator -->
                <div class="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    ${adSliders.map((_, index) => `
                        <button onclick="goToSlide(${index})" class="w-2 h-2 rounded-full bg-white bg-opacity-50 hover:bg-opacity-75 transition-all ${index === 0 ? 'bg-opacity-100' : ''}"></button>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;

    // Initialize slideshow
    if (adSliders.length > 1) {
        initializeSlider(adSliders.length);
    }
}


function getCurrentCategoryCards() {
    let categoryCards = [];

    if (currentCategoryPreviewMode === 'free') {
        // Free mode: get current cards from form inputs
        document.querySelectorAll('#category-cards-list > div').forEach(card => {
            const id = card.querySelector('input[id^="card-name-"]')?.id?.replace('card-name-', '');
            if (!id) return;

            const name = document.getElementById(`card-name-${id}`)?.value || '';
            const title = document.getElementById(`card-title-${id}`)?.value || '';
            const image = document.getElementById(`card-image-${id}`)?.value || '';
            const cardType = document.getElementById(`card-type-${id}`)?.value || 'square';
            const link = document.getElementById(`card-link-${id}`)?.value || '#';

            if (name || title) {
                categoryCards.push({ id, name, title, image, cardType, link });
            }
        });
    } else {
        // Preset mode: use selected preset style merged with management data
        categoryCards = getPresetCategories(currentPresetStyle).map((preset, index) => {
            // Find if this preset category exists in the management list (database)
            const managementCard = Array.from(document.querySelectorAll('#category-cards-list > div')).find(cardEl => {
                const nameInput = cardEl.querySelector('input[id^="card-name-"]');
                return nameInput && nameInput.value === preset.name;
            });

            if (managementCard) {
                const id = managementCard.querySelector('input[id^="card-name-"]').id.replace('card-name-', '');
                return {
                    id: id,
                    name: preset.name,
                    title: document.getElementById(`card-title-${id}`)?.value || preset.title,
                    image: document.getElementById(`card-image-${id}`)?.value || preset.image || `https://placehold.co/400x400/CCCCCC/FFFFFF?text=${encodeURIComponent(preset.title)}`,
                    cardType: preset.cardType,
                    link: document.getElementById(`card-link-${id}`)?.value || preset.link,
                    isPreset: true,
                    presetStyle: currentPresetStyle
                };
            }

            return {
                id: `preset-${currentPresetStyle}-${index}`,
                name: preset.name,
                title: preset.title,
                image: preset.image || `https://placehold.co/400x400/CCCCCC/FFFFFF?text=${encodeURIComponent(preset.title)}`,
                cardType: preset.cardType,
                link: preset.link,
                isPreset: true,
                presetStyle: currentPresetStyle
            };
        });

        // Add any additional user-created cards not in the preset
        document.querySelectorAll('#category-cards-list > div').forEach(card => {
            const id = card.querySelector('input[id^="card-name-"]')?.id?.replace('card-name-', '');
            if (!id) return;

            const name = document.getElementById(`card-name-${id}`)?.value || '';
            const title = document.getElementById(`card-title-${id}`)?.value || '';
            const image = document.getElementById(`card-image-${id}`)?.value || '';
            const cardType = document.getElementById(`card-type-${id}`)?.value || 'square';
            const link = document.getElementById(`card-link-${id}`)?.value || '#';

            if ((name || title) && !categoryCards.some(c => c.name === name)) {
                categoryCards.push({ id, name, title, image, cardType, link, isUserAdded: true });
            }
        });
    }

    return categoryCards;
}

function updateCategoryCardsPreview() {
    const previewContainer = document.getElementById('category-cards-preview');
    if (!previewContainer) return;

    const categoryCards = getCurrentCategoryCards();

    // Simulate the full index.html layout with universal padding and spacing
    const previewContent = `
        <div class="bg-white min-h-screen">
            <!-- Header simulation -->
            <header class="bg-navy text-white shadow-lg py-6 px-6">
                <div class="container mx-auto flex items-center justify-between">
                    <div class="flex items-center">
                        <a href="#" class="text-3xl font-bold text-gold">Virtuosa</a>
                    </div>
                    <nav class="hidden md:flex space-x-8">
                        <a href="#" class="text-white hover:text-gold transition-colors">Home</a>
                        <a href="#" class="text-white hover:text-gold transition-colors">Products</a>
                        <a href="#" class="text-white hover:text-gold transition-colors">Categories</a>
                    </nav>
                </div>
            </header>

            <!-- Hero section (simulated ad slider area) -->
            <section class="bg-gray-100 py-8">
                <div class="container mx-auto px-6">
                    <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
                        <div class="h-48 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
                            Ad Slider Area (Marketing Content)
                        </div>
                    </div>
                </div>
            </section>

            <!-- Shop by Category section (interactive) -->
            <section class="py-16 bg-gray-50">
                <div class="container mx-auto px-6">
                    <h2 class="text-4xl font-bold text-[#0A1128] text-center mb-12">Shop by Category</h2>

                    <!-- Interactive category grid with universal spacing -->
                    <div id="interactive-cards-grid" class="relative grid ${currentPreviewMode === 'mobile' ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6'} gap-8 max-w-7xl mx-auto">
                        ${categoryCards.map(card => `
                            <div class="category-card-interactive group relative bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-xl transition-all cursor-move select-none ${card.cardType === 'rectangle' ? 'col-span-2 row-span-1' : ''} ${card.isPreset ? 'border-green-200' : ''}"
                                 data-card-id="${card.id}"
                                 draggable="${currentCategoryPreviewMode === 'free' ? 'true' : 'false'}"
                                 ondragstart="${currentCategoryPreviewMode === 'free' ? `handleCardDragStart(event, '${card.id}')` : ''}"
                                 ondragend="${currentCategoryPreviewMode === 'free' ? 'handleCardDragEnd(event)' : ''}"
                                 style="touch-action: none;">
                                <!-- Resize handles (only in free mode) -->
                                ${currentCategoryPreviewMode === 'free' ? `
                                    <div class="resize-handle resize-nw absolute -top-1 -left-1 w-4 h-4 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 cursor-nw-resize" onmousedown="startResize(event, '${card.id}', 'nw')"></div>
                                    <div class="resize-handle resize-ne absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 cursor-ne-resize" onmousedown="startResize(event, '${card.id}', 'ne')"></div>
                                    <div class="resize-handle resize-sw absolute -bottom-1 -left-1 w-4 h-4 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 cursor-sw-resize" onmousedown="startResize(event, '${card.id}', 'sw')"></div>
                                    <div class="resize-handle resize-se absolute -bottom-1 -right-1 w-4 h-4 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 cursor-se-resize" onmousedown="startResize(event, '${card.id}', 'se')"></div>
                                ` : ''}

                                <div class="${card.cardType === 'rectangle' ? 'aspect-[2/1] lg:aspect-square' : 'aspect-square'} bg-cover bg-center relative p-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
                                    <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all"></div>
                                    
                                    <!-- Mobile Overlay Layout (Hidden on Desktop) -->
                                    <div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent opacity-80 lg:opacity-0 transition-opacity pointer-events-none"></div>
                                    <div class="absolute bottom-0 left-0 right-0 p-5 z-10 w-full text-left lg:hidden">
                                        <h3 class="font-bold text-white text-base sm:text-lg drop-shadow-md tracking-tight leading-tight">${card.title || card.name || 'Category Name'}</h3>
                                        ${card.isPreset ? '<span class="text-xs text-green-300 mt-1 block">Preset</span>' : ''}
                                    </div>
                                </div>

                                <!-- Desktop Label Layout (Visible only on Desktop) -->
                                <div class="hidden lg:block pt-3 px-1">
                                    <h3 class="font-bold text-[#0A1128] text-base group-hover:text-gold transition-colors duration-300">${card.title || card.name || 'Category Name'}</h3>
                                    <p class="text-[#4B5563] text-xs mt-0.5 line-clamp-2">${card.description || card.name || ''}</p>
                                    ${card.isPreset ? '<span class="text-[10px] text-green-600 font-medium uppercase tracking-wider mt-1 block">Preset</span>' : ''}
                                </div>

                                <!-- Card actions -->
                                <div class="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity space-y-2">
                                    <button onclick="editCardInPreview('${card.id}')" class="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 shadow-md">
                                        <i class="fas fa-edit text-gray-700 text-sm"></i>
                                    </button>
                                    ${currentCategoryPreviewMode === 'free' ? `
                                        <button onclick="changeCardShape('${card.id}')" class="bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full p-2 shadow-md">
                                            <i class="fas fa-expand-arrows-alt text-gray-700 text-sm"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}

                        <!-- Add new card placeholder (only in free mode) -->
                        ${currentCategoryPreviewMode === 'free' ? `
                            <div class="category-card-placeholder border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center hover:border-blue-400 transition-colors cursor-pointer min-h-[220px] bg-gray-50"
                                 onclick="addNewCategoryCard()">
                                <div class="text-center text-gray-500 p-6">
                                    <i class="fas fa-plus text-3xl mb-4"></i>
                                    <p class="text-lg font-medium">Add New Card</p>
                                    <p class="text-sm mt-2">Click to create a custom category</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Layout controls (only in free mode) -->
                    ${currentCategoryPreviewMode === 'free' ? `
                        <div class="mt-12 flex justify-center space-x-6">
                            <button onclick="autoArrangeCards()" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium">
                                <i class="fas fa-magic mr-2"></i>Auto Arrange
                            </button>
                            <button onclick="resetCardLayout()" class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium">
                                <i class="fas fa-undo mr-2"></i>Reset Layout
                            </button>
                        </div>
                    ` : `
                        <div class="mt-12 text-center space-y-4">
                            <p class="text-gray-600 mb-4">Using ${currentPresetStyle.charAt(0).toUpperCase() + currentPresetStyle.slice(1)} preset style with all 14 categories in a professional layout</p>
                            <div class="flex flex-col sm:flex-row justify-center gap-4">
                                <button onclick="editPresetCardsInManagement()" class="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors font-medium">
                                    <i class="fas fa-edit mr-2"></i>Edit Preset Cards in Management
                                </button>
                                <button onclick="publishPresetToIndex()" class="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium">
                                    <i class="fas fa-rocket mr-2"></i>Publish to index.html
                                </button>
                            </div>
                            <div class="flex justify-center gap-4">
                                <button onclick="savePresetEdits()" class="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                                    <i class="fas fa-save mr-2"></i>Save Preset Edits
                                </button>
                                <button onclick="resetPresetEdits()" class="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-medium">
                                    <i class="fas fa-undo mr-2"></i>Reset to Default
                                </button>
                            </div>
                            <button onclick="switchToFreeMode()" class="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors font-medium">
                                <i class="fas fa-edit mr-2"></i>Switch to Free Mode
                            </button>
                        </div>
                    `}
                </div>
            </section>

            <!-- Footer simulation -->
            <footer class="bg-navy text-white py-12 mt-16">
                <div class="container mx-auto px-6 text-center">
                    <p>&copy; 2024 Virtuosa. All rights reserved.</p>
                </div>
            </footer>
        </div>
    `;

    previewContainer.innerHTML = previewContent;

    // Initialize drag and drop for the interactive grid (only in free mode)
    if (currentCategoryPreviewMode === 'free') {
        initializeCardInteractions();
    }
}

// Delete functions
async function deleteAsset(id) {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
        const response = await fetch(`${API_BASE}/marketing/assets/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Asset deleted successfully', 'success');
            await loadAssetLibrary();
        } else {
            showToast(data.message || 'Failed to delete asset', 'error');
        }
    } catch (error) {
        console.error('Error deleting asset:', error);
        showToast('Failed to delete asset', 'error');
    }
}

async function deleteAdSlider(id) {
    if (!confirm('Are you sure you want to delete this ad slider?')) return;

    try {
        const response = await fetch(`https://api.virtuosazm.com/api/marketing/ad-sliders/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Ad slider deleted successfully', 'success');
            await loadAdSliders();
        } else {
            showToast(data.message || 'Failed to delete ad slider', 'error');
        }
    } catch (error) {
        console.error('Error deleting ad slider:', error);
        showToast('Failed to delete ad slider', 'error');
    }
}

async function deleteCategoryCard(id) {
    if (!confirm('Are you sure you want to delete this category card?')) return;

    try {
        const response = await fetch(`https://api.virtuosazm.com/api/marketing/category-cards/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Category card deleted successfully', 'success');
            await loadCategoryCards();
        } else {
            showToast(data.message || 'Failed to delete category card', 'error');
        }
    } catch (error) {
        console.error('Error deleting category card:', error);
        showToast('Failed to delete category card', 'error');
    }
}

// Utility functions
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6';
    toast.style.cssText = `
        background-color: ${bgColor};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        min-width: 250px;
        max-width: 350px;
        animation: slideIn 0.3s ease-out;
    `;
    toast.textContent = message;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    if (!document.head.querySelector('style[data-toast-animations]')) {
        style.setAttribute('data-toast-animations', 'true');
        document.head.appendChild(style);
    }

    toastContainer.appendChild(toast);

    // Remove toast after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

async function copyAssetUrl(url) {
    if (!url) {
        showToast('No URL available for this asset', 'error');
        return;
    }

    try {
        await navigator.clipboard.writeText(url);
        showToast('Asset URL copied to clipboard!', 'success');
    } catch (error) {
        console.error('Failed to copy URL:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('Asset URL copied to clipboard!', 'success');
        } catch (fallbackError) {
            console.error('Fallback copy failed:', fallbackError);
            showToast('Failed to copy URL. Please copy manually: ' + url, 'error');
        }
        document.body.removeChild(textArea);
    }
}

function refreshAssetLibrary() {
    loadAssetLibrary();
}

function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

async function selectAsset(type, id) {
    // Open asset selection modal
    const modal = document.createElement('div');
    modal.id = 'asset-selection-modal';
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div class="p-6 border-b">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold text-navy">Select Asset</h3>
                    <button onclick="closeAssetModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="mt-4">
                    <input type="text" id="asset-search-modal" placeholder="Search assets..."
                           class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                </div>
            </div>
            <div id="asset-selection-grid" class="p-6 overflow-y-auto max-h-96 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <!-- Assets will be loaded here -->
            </div>
            <div class="p-6 border-t bg-gray-50">
                <div class="flex justify-end space-x-3">
                    <button onclick="closeAssetModal()" class="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeAssetModal();
        }
    });

    const handleEsc = (event) => {
        if (event.key === 'Escape') {
            closeAssetModal();
        }
    };
    document.addEventListener('keydown', handleEsc);
    modal.setAttribute('data-esc-listener', 'true');
    modal._escListener = handleEsc;

    // Load assets for selection
    await loadAssetsForSelection(type, id);

    // Add search functionality
    document.getElementById('asset-search-modal').addEventListener('input', () => {
        loadAssetsForSelection(type, id);
    });

    // Add click handler to set selected asset
    modal.addEventListener('click', (event) => {
        if (event.target.closest('.asset-item')) {
            const assetUrl = event.target.closest('.asset-item').dataset.url;
            if (type === 'ad') {
                const input = document.getElementById(`ad-image-${id}`);
                if (input) {
                    input.value = assetUrl;
                }
            } else if (type === 'card') {
                const input = document.getElementById(`card-image-${id}`);
                if (input) {
                    input.value = assetUrl;
                }
            } else if (type === 'fallback') {
                const input = document.getElementById(`fallback-image-${id}`);
                if (input) {
                    input.value = assetUrl;
                }
            }
            closeAssetModal();
        }
    });
}

async function loadAssetsForSelection(type, id) {
    try {
        const response = await fetch('https://api.virtuosazm.com/api/marketing/assets', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const assets = await response.json();
            renderAssetSelection(assets, type, id);
        }
    } catch (error) {
        console.error('Error loading assets for selection:', error);
    }
}

function renderAssetSelection(assets, type, id) {
    const container = document.getElementById('asset-selection-grid');
    const searchTerm = document.getElementById('asset-search-modal').value.toLowerCase();

    const filteredAssets = assets ? assets.filter(asset => {
        if (!asset) return false;
        const filename = asset.filename || asset.name || '';
        const mimetype = asset.mimetype || asset.type || '';
        return filename.toLowerCase().includes(searchTerm) ||
            mimetype.toLowerCase().includes(searchTerm);
    }) : [];

    if (filteredAssets.length === 0) {
        container.innerHTML = `
            <div class="col-span-full text-center py-8">
                <i class="fas fa-search text-4xl text-gray-300 mb-4"></i>
                <p class="text-gray-500">No assets found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filteredAssets.map(asset => `
        <div class="asset-item cursor-pointer border-2 border-gray-200 hover:border-blue-500 rounded-lg overflow-hidden"
             data-url="${fixServerUrl(asset.url)}">
            ${asset.mimetype && asset.mimetype.includes('image') ?
            `<img src="${fixServerUrl(asset.url)}" alt="${asset.filename || asset.name || 'Asset'}" class="w-full h-24 object-cover">` :
            asset.mimetype && asset.mimetype.includes('video') ?
                `<video src="${fixServerUrl(asset.url)}" class="w-full h-24 object-cover"></video>` :
                `<div class="w-full h-24 bg-gray-200 flex items-center justify-center">
                    <i class="fas fa-file text-2xl text-gray-400"></i>
                </div>`
        }
            <div class="p-2 text-center">
                <p class="text-xs font-medium truncate">${asset.filename || asset.name || 'Asset'}</p>
            </div>
        </div>
    `).join('');
}

function selectAssetForItem(type, id, url) {
    if (type === 'ad') {
        const input = document.getElementById(`ad-image-${id}`);
        if (input) {
            input.value = url;
        }
    } else if (type === 'card') {
        const input = document.getElementById(`card-image-${id}`);
        if (input) {
            input.value = url;
        }
    } else if (type === 'fallback') {
        const input = document.getElementById(`fallback-image-${id}`);
        if (input) {
            input.value = url;
        }
    }

    closeAssetModal();
    showToast('Asset selected successfully!', 'success');
}

function closeAssetModal() {
    const modal = document.getElementById('asset-selection-modal');
    if (!modal) return;

    if (modal._escListener) {
        document.removeEventListener('keydown', modal._escListener);
    }

    modal.remove();
}

function initializeCardInteractions() {
    const grid = document.getElementById('interactive-cards-grid');
    if (!grid) return;

    // Setup drop zones and drag events
    grid.addEventListener('dragover', handleDragOver);
    grid.addEventListener('drop', handleDrop);
}

function handleCardDragStart(event, cardId) {
    event.dataTransfer.setData('text/plain', cardId);
    event.dataTransfer.effectAllowed = 'move';
    event.target.classList.add('opacity-50');
}

function handleCardDragEnd(event) {
    event.target.classList.remove('opacity-50');
}

function handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
}

function handleDrop(event) {
    event.preventDefault();

    const draggedCardId = event.dataTransfer.getData('text/plain');
    const dropTarget = event.target.closest('.category-card-interactive');

    if (!dropTarget || dropTarget.dataset.cardId === draggedCardId) return;

    // Get the dragged element
    const draggedElement = document.querySelector(`[data-card-id="${draggedCardId}"]`);
    if (!draggedElement) return;

    // Swap positions
    const draggedIndex = Array.from(draggedElement.parentNode.children).indexOf(draggedElement);
    const targetIndex = Array.from(dropTarget.parentNode.children).indexOf(dropTarget);

    if (draggedIndex < targetIndex) {
        dropTarget.parentNode.insertBefore(draggedElement, dropTarget.nextSibling);
    } else {
        dropTarget.parentNode.insertBefore(draggedElement, dropTarget);
    }

    showToast('Card position updated!', 'success');
}

let isResizing = false;
let currentResizeCard = null;
let currentResizeHandle = null;
let startX, startY, startWidth, startHeight;

function startResize(event, cardId, handle) {
    event.preventDefault();
    event.stopPropagation();

    isResizing = true;
    currentResizeCard = document.querySelector(`[data-card-id="${cardId}"]`);
    currentResizeHandle = handle;

    if (!currentResizeCard) return;

    const rect = currentResizeCard.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    startWidth = rect.width;
    startHeight = rect.height;

    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);

    // Prevent text selection during resize
    document.body.style.userSelect = 'none';
}

function handleResize(event) {
    if (!isResizing || !currentResizeCard) return;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    // Get the card type to determine aspect ratio
    const cardId = currentResizeCard.dataset.cardId;
    const cardTypeElement = document.getElementById(`card-type-${cardId}`);
    const cardType = cardTypeElement ? cardTypeElement.value : 'square';

    let newWidth = startWidth;
    let newHeight = startHeight;

    // Adjust size based on handle
    switch (currentResizeHandle) {
        case 'se': // southeast - bottom right
            if (cardType === 'square') {
                // For square cards, use the larger delta to maintain aspect ratio
                const maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
                newWidth = startWidth + (deltaX >= 0 ? maxDelta : -maxDelta);
                newHeight = startHeight + (deltaY >= 0 ? maxDelta : -maxDelta);
            } else if (cardType === 'rectangle') {
                // For rectangle cards (2:1), adjust height based on width
                newWidth = startWidth + deltaX;
                newHeight = (startWidth + deltaX) / 2; // Maintain 2:1 aspect ratio
            } else {
                newWidth = startWidth + deltaX;
                newHeight = startHeight + deltaY;
            }
            break;
        case 'sw': // southwest - bottom left
            if (cardType === 'square') {
                const maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
                newWidth = startWidth - maxDelta;
                newHeight = startHeight + maxDelta;
            } else if (cardType === 'rectangle') {
                newWidth = startWidth - deltaX;
                newHeight = (startWidth - deltaX) / 2;
            } else {
                newWidth = startWidth - deltaX;
                newHeight = startHeight + deltaY;
            }
            break;
        case 'ne': // northeast - top right
            if (cardType === 'square') {
                const maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
                newWidth = startWidth + maxDelta;
                newHeight = startHeight - maxDelta;
            } else if (cardType === 'rectangle') {
                newWidth = startWidth + deltaX;
                newHeight = (startWidth + deltaX) / 2;
            } else {
                newWidth = startWidth + deltaX;
                newHeight = startHeight - deltaY;
            }
            break;
        case 'nw': // northwest - top left
            if (cardType === 'square') {
                const maxDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
                newWidth = startWidth - maxDelta;
                newHeight = startHeight - maxDelta;
            } else if (cardType === 'rectangle') {
                newWidth = startWidth - deltaX;
                newHeight = (startWidth - deltaX) / 2;
            } else {
                newWidth = startWidth - deltaX;
                newHeight = startHeight - deltaY;
            }
            break;
    }

    // Apply minimum constraints
    newWidth = Math.max(150, newWidth);
    newHeight = Math.max(150, newHeight);

    currentResizeCard.style.width = `${newWidth}px`;
    currentResizeCard.style.height = `${newHeight}px`;
}

function stopResize() {
    isResizing = false;
    currentResizeCard = null;
    currentResizeHandle = null;

    document.removeEventListener('mousemove', handleResize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.userSelect = '';

    showToast('Card size updated!', 'success');
}

function editCardInPreview(cardId) {
    if (currentCategoryPreviewMode === 'free') {
        // Free mode: cards have database IDs that match management section
        const cardElement = document.querySelector(`#category-cards-list [id*="card-name-${cardId}"]`)?.closest('.border');
        if (cardElement) {
            cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            cardElement.classList.add('ring-2', 'ring-blue-500');
            setTimeout(() => {
                cardElement.classList.remove('ring-2', 'ring-blue-500');
            }, 2000);
            showToast('Card highlighted in management section', 'info');
        } else {
            showToast('Card not found in management section', 'warning');
        }
    } else {
        // Preset mode: find card by category name
        const presetCategories = getPresetCategories(currentPresetStyle);
        const cardIndex = parseInt(cardId.split('-').pop());
        const categoryName = presetCategories[cardIndex]?.name;

        if (categoryName) {
            // Find the management card with matching name
            const allCards = document.querySelectorAll('#category-cards-list .border');
            for (const cardElement of allCards) {
                const nameInput = cardElement.querySelector('input[id*="card-name-"]');
                if (nameInput && nameInput.value === categoryName) {
                    cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    cardElement.classList.add('ring-2', 'ring-blue-500');
                    setTimeout(() => {
                        cardElement.classList.remove('ring-2', 'ring-blue-500');
                    }, 2000);
                    showToast(`"${categoryName}" card highlighted in management section`, 'info');
                    return;
                }
            }
            showToast(`"${categoryName}" card not found in management section. Make sure it exists in your database.`, 'warning');
        } else {
            showToast('Unable to identify card to highlight', 'warning');
        }
    }
}

function autoArrangeCards() {
    const cards = Array.from(document.querySelectorAll('.category-card-interactive'));
    const grid = document.getElementById('interactive-cards-grid');

    // Simple auto-arrangement: sort by card type (square first, then rectangle)
    cards.sort((a, b) => {
        const aRect = a.classList.contains('col-span-2');
        const bRect = b.classList.contains('col-span-2');
        return aRect - bRect; // squares first
    });

    // Reorder in DOM
    cards.forEach(card => {
        grid.appendChild(card);
    });

    showToast('Cards auto-arranged!', 'success');
}

function changeCardShape(cardId) {
    const cardTypeElement = document.getElementById(`card-type-${cardId}`);
    if (cardTypeElement) {
        const currentType = cardTypeElement.value;
        const newType = currentType === 'square' ? 'rectangle' : 'square';
        cardTypeElement.value = newType;

        // Update the preview
        updateCategoryCardsPreview();

        showToast(`Card changed to ${newType}`, 'success');
    }
}

function editPresetCardsInManagement() {
    if (currentCategoryPreviewMode !== 'preset') return;

    const presetCategories = getPresetCategories(currentPresetStyle);

    // Show loading indicator
    showToast(`Creating ${currentPresetStyle} preset cards in management section...`, 'info');

    // Create or update each preset card in the database
    const promises = presetCategories.map(async (category, index) => {
        try {
            const cardData = {
                name: category.name,
                title: category.title,
                description: category.name,
                image: category.image || `https://placehold.co/400x400/CCCCCC/FFFFFF?text=${encodeURIComponent(category.title)}`,
                link: category.link,
                cardType: category.cardType,
                active: true,
                displayOrder: index + 1
            };

            // Check if card already exists by name
            const existingResponse = await fetch(`https://api.virtuosazm.com/api/marketing/category-cards?name=${encodeURIComponent(category.name)}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (existingResponse.ok) {
                const existingCards = await existingResponse.json();
                const existingCard = existingCards.find(card => card.name === category.name);

                if (existingCard) {
                    // Update existing card
                    const updateResponse = await fetch(`https://api.virtuosazm.com/api/marketing/category-cards/${existingCard._id}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(cardData)
                    });

                    if (!updateResponse.ok) {
                        console.error(`Failed to update ${category.name}`);
                    }
                    return updateResponse.ok;
                }
            }

            // Create new card
            const createResponse = await fetch('https://api.virtuosazm.com/api/marketing/category-cards', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cardData)
            });

            if (!createResponse.ok) {
                console.error(`Failed to create ${category.name}`);
            }
            return createResponse.ok;

        } catch (error) {
            console.error(`Error processing ${category.name}:`, error);
            return false;
        }
    });

    // Wait for all operations to complete
    Promise.all(promises).then(results => {
        const successCount = results.filter(Boolean).length;
        if (successCount === presetCategories.length) {
            showToast(`✅ All ${currentPresetStyle} preset cards created/updated successfully!`, 'success');
            // Reload the category cards to show them in management section
            loadCategoryCards();
        } else {
            showToast(`⚠️ ${successCount}/${presetCategories.length} preset cards processed. Check console for errors.`, 'warning');
            loadCategoryCards();
        }
    });
}

function publishPresetToIndex() {
    if (currentCategoryPreviewMode !== 'preset') return;

    const presetCategories = getCurrentCategoryCards();

    // Show loading indicator
    showToast(`Publishing ${currentPresetStyle} preset to index.html...`, 'info');

    // Create or update each preset card in the database
    const promises = presetCategories.map(async (category, index) => {
        try {
            const cardData = {
                name: category.name,
                title: category.title,
                description: category.name,
                image: category.image,
                link: category.link,
                cardType: category.cardType,
                active: true,
                displayOrder: index + 1,
                presetStyle: currentPresetStyle
            };

            // Check if card already exists by name
            const existingResponse = await fetch(`https://api.virtuosazm.com/api/marketing/category-cards?name=${encodeURIComponent(category.name)}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });

            if (existingResponse.ok) {
                const existingCards = await existingResponse.json();
                const existingCard = existingCards.find(card => card.name === category.name);

                if (existingCard) {
                    // Update existing card with new data and activate it
                    const updateResponse = await fetch(`https://api.virtuosazm.com/api/marketing/category-cards/${existingCard._id}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(cardData)
                    });

                    if (!updateResponse.ok) {
                        console.error(`Failed to update ${category.name}`);
                    }
                    return updateResponse.ok;
                }
            }

            // Create new card
            const createResponse = await fetch('https://api.virtuosazm.com/api/marketing/category-cards', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cardData)
            });

            if (!createResponse.ok) {
                console.error(`Failed to create ${category.name}`);
            }
            return createResponse.ok;

        } catch (error) {
            console.error(`Error processing ${category.name}:`, error);
            return false;
        }
    });

    // Wait for all operations to complete
    Promise.all(promises).then(results => {
        const successCount = results.filter(Boolean).length;
        if (successCount === presetCategories.length) {
            showToast(`🚀 ${currentPresetStyle.charAt(0).toUpperCase() + currentPresetStyle.slice(1)} preset published successfully! Check index.html to see your live category cards.`, 'success');
            // Reload the category cards to show them in management section
            loadCategoryCards();
        } else {
            console.error('Publishing results:', results);
            showToast(`⚠️ ${successCount}/${presetCategories.length} cards published. Check console for errors.`, 'warning');
            loadCategoryCards();
        }
    }).catch(error => {
        console.error('Publishing error:', error);
        showToast('❌ Publishing failed. Check console for details.', 'error');
    });
}

function switchToFreeMode() {
    currentCategoryPreviewMode = 'free';
    document.getElementById('preset-actions')?.classList.add('hidden');
    updateCategoryCardsPreview();
    showToast('Switched to Free Mode - you can now edit, resize, and arrange cards freely', 'info');
}

function switchToPresetMode() {
    currentCategoryPreviewMode = 'preset';
    document.getElementById('preset-actions')?.classList.remove('hidden');
    updateCategoryCardsPreview();
    showToast('Switched to Preset Mode - choose from Amazon, eBay, or Rakuten styles', 'info');
}

async function publishPreset() {
    if (currentCategoryPreviewMode !== 'preset') return;

    if (!confirm(`Are you sure you want to publish the ${currentPresetStyle} preset? This will overwrite existing category cards on the home page.`)) return;

    const presetCategories = getCurrentCategoryCards();
    console.log(`Publishing ${currentPresetStyle} preset with ${presetCategories.length} cards:`, presetCategories);

    // Show loading indicator
    showToast(`Publishing ${currentPresetStyle} preset...`, 'info');

    try {
        const response = await fetch('https://api.virtuosazm.com/api/marketing/publish-preset', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                style: currentPresetStyle,
                cards: presetCategories
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log('Publish success:', data);
            showToast(`🚀 ${data.message}`, 'success');
            loadCategoryCards();
        } else {
            console.error('Publish failed:', data);
            showToast(data.message || 'Failed to publish preset', 'error');
        }
    } catch (error) {
        console.error('Publish error:', error);
        showToast('Failed to publish preset. Check console for details.', 'error');
    }
}

async function deactivatePreset() {
    if (!confirm('Are you sure you want to deactivate all category cards? The home page will use its beautiful default fallback layout.')) return;

    try {
        const response = await fetch('https://api.virtuosazm.com/api/marketing/publish-preset', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ style: 'deactivate' })
        });

        const data = await response.json();
        if (response.ok) {
            showToast('✅ All presets deactivated. Reverting to homepage fallback.', 'success');
            loadCategoryCards();
        } else {
            showToast(data.message || 'Failed to deactivate presets', 'error');
        }
    } catch (error) {
        console.error('Deactivate error:', error);
        showToast('Failed to deactivate presets', 'error');
    }
}

function setPresetStyle(style) {
    currentPresetStyle = style;
    if (currentCategoryPreviewMode === 'preset') {
        updateCategoryCardsPreview();
        // Load saved edits for this preset style
        setTimeout(() => applySavedPresetEdits(), 100); // Small delay to ensure DOM is updated
        showToast(`Switched to ${style.charAt(0).toUpperCase() + style.slice(1)} preset style`, 'info');
    }
}

// Preset persistence functions
function savePresetEdits() {
    if (currentCategoryPreviewMode !== 'preset') return;

    const customPreset = {
        style: currentPresetStyle,
        categories: [],
        lastModified: new Date().toISOString()
    };

    // Collect current category data from the preview
    document.querySelectorAll('#category-cards-list > div').forEach(card => {
        const id = card.querySelector('input[id^="card-name-"]')?.id?.replace('card-name-', '');
        if (!id) return;

        const name = document.getElementById(`card-name-${id}`)?.value || '';
        const title = document.getElementById(`card-title-${id}`)?.value || '';
        const image = document.getElementById(`card-image-${id}`)?.value || '';
        const link = document.getElementById(`card-link-${id}`)?.value || '';

        if (name || title) {
            customPreset.categories.push({
                id,
                name,
                title,
                image,
                link
            });
        }
    });

    // Save to localStorage
    const storageKey = `customPreset_${currentPresetStyle}`;
    localStorage.setItem(storageKey, JSON.stringify(customPreset));

    showToast(`Custom ${currentPresetStyle} preset saved successfully!`, 'success');
}

function loadPresetEdits(style) {
    const storageKey = `customPreset_${style}`;
    const savedPreset = localStorage.getItem(storageKey);

    if (savedPreset) {
        try {
            const presetData = JSON.parse(savedPreset);
            return presetData.categories || [];
        } catch (error) {
            console.error('Error loading saved preset:', error);
            return [];
        }
    }
    return [];
}

function resetPresetEdits() {
    if (currentCategoryPreviewMode !== 'preset') return;

    const storageKey = `customPreset_${currentPresetStyle}`;
    localStorage.removeItem(storageKey);

    // Reload the default preset
    updateCategoryCardsPreview();

    showToast(`${currentPresetStyle} preset reset to default`, 'info');
}

function applySavedPresetEdits() {
    if (currentCategoryPreviewMode !== 'preset') return;

    const savedEdits = loadPresetEdits(currentPresetStyle);

    // Apply saved edits to the form inputs
    savedEdits.forEach(savedCategory => {
        // Find matching category in the current preset
        const presetCategories = getPresetCategories(currentPresetStyle);
        const matchingPreset = presetCategories.find(p => p.name === savedCategory.name);

        if (matchingPreset) {
            // Update form inputs with saved values
            const formCard = document.querySelector(`[data-card-id="${savedCategory.id}"]`);
            if (formCard) {
                const titleInput = formCard.querySelector(`input[id="card-title-${savedCategory.id}"]`);
                const imageInput = formCard.querySelector(`input[id="card-image-${savedCategory.id}"]`);
                const linkInput = formCard.querySelector(`input[id="card-link-${savedCategory.id}"]`);

                if (titleInput) titleInput.value = savedCategory.title || savedCategory.name;
                if (imageInput) imageInput.value = savedCategory.image || '';
                if (linkInput) linkInput.value = savedCategory.link || matchingPreset.link;
            }
        }
    });
}

// Add new item functions
async function addNewAdSlider() {
    const title = prompt('Enter ad slider title:');
    if (!title) return;

    const subtitle = prompt('Enter subtitle (optional):') || '';
    const link = prompt('Enter link (optional):') || '';
    const backgroundImage = prompt('Enter background image URL:') || 'https://placehold.co/1200x320/0A1128/FFFFFF?text=New+Ad';

    try {
        const response = await fetch(`${API_BASE}/marketing/ad-sliders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title, subtitle, backgroundImage, link })
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Ad slider created successfully', 'success');
            await loadAdSliders();
        } else {
            showToast(data.message || 'Failed to create ad slider', 'error');
        }
    } catch (error) {
        console.error('Error creating ad slider:', error);
        showToast('Failed to create ad slider', 'error');
    }
}

async function addNewCategoryCard() {
    const name = prompt('Enter category name:');
    if (!name) return;

    const title = prompt('Enter title:') || name;
    const description = prompt('Enter description:');
    if (!description) return;

    const link = prompt('Enter link:') || '#';
    const cardType = prompt('Enter card type (square/rectangle):') || 'square';
    const image = prompt('Enter image URL:') || 'https://placehold.co/400x240/CCCCCC/FFFFFF?text=' + encodeURIComponent(name);

    try {
        const response = await fetch(`${API_BASE}/marketing/category-cards`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, title, description, image, link, cardType })
        });

        const data = await response.json();
        if (response.ok) {
            showToast('Category card created successfully', 'success');
            await loadCategoryCards();
        } else {
            showToast(data.message || 'Failed to create category card', 'error');
        }
    } catch (error) {
        console.error('Error creating category card:', error);
        showToast('Failed to create category card', 'error');
    }
}

function addNewPromotion() {
    showToast('Promotions management coming soon!', 'info');
}

function addNewBanner() {
    showToast('Banner management coming soon!', 'info');
}

async function loadPromotions() {
    try {
        const response = await fetch(`${API_BASE}/marketing/promotions`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const promotions = await response.json();
            renderPromotions(promotions);
        } else {
            document.getElementById('promotions-list').innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500">Promotions management coming soon!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading promotions:', error);
        document.getElementById('promotions-list').innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500">Unable to load promotions</p>
            </div>
        `;
    }
}

async function loadBanners() {
    try {
        const response = await fetch(`${API_BASE}/marketing/banners`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            const banners = await response.json();
            renderBanners(banners);
        } else {
            document.getElementById('banners-list').innerHTML = `
                <div class="text-center py-8">
                    <p class="text-gray-500">Banner management coming soon!</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading banners:', error);
        document.getElementById('banners-list').innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500">Unable to load banners</p>
            </div>
        `;
    }
}

async function loadAPlusContent() {
    try {
        // A+ content would be product-specific, for now show coming soon
        document.getElementById('a-plus-content-list').innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500">A+ Content management coming soon!</p>
                <p class="text-sm text-gray-400 mt-2">This will allow you to create Amazon-style enhanced product pages</p>
            </div>
        `;
    } catch (error) {
        console.error('Error loading A+ content:', error);
    }
}

function renderPromotions(promotions) {
    const container = document.getElementById('promotions-list');
    if (promotions.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500">No promotions found. Create your first promotion!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = promotions.map(promo => `
        <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-bold text-[#0A1128]">${promo.title}</h3>
                    <p class="text-gray-600 text-sm">${promo.description || 'No description'}</p>
                    <div class="flex items-center space-x-2 mt-2">
                        <span class="px-2 py-1 text-xs rounded-full ${promo.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                            ${promo.status}
                        </span>
                        <span class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            ${promo.promotionType}
                        </span>
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button class="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderBanners(banners) {
    const container = document.getElementById('banners-list');
    if (banners.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8">
                <p class="text-gray-500">No banners found. Create your first banner!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = banners.map(banner => `
        <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h3 class="font-bold text-[#0A1128]">${banner.title}</h3>
                    <div class="mt-2">
                        <img src="${fixServerUrl(banner.imageUrl)}" alt="${banner.title}" class="w-32 h-20 object-cover rounded">
                    </div>
                </div>
                <div class="flex space-x-2 ml-4">
                    <button class="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}
