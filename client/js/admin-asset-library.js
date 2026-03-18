document.addEventListener('DOMContentLoaded', async () => {
    // API_BASE is provided by config.js
    const token = localStorage.getItem('token');
    
    if (!token) {
        window.location.href = '/pages/login.html';
        return;
    }

    // Helper function to fix URLs to point to server
    function fixServerUrl(url) {
        if (!url) return url;
        return url.startsWith('/') ? `${API_BASE}${url}` : url;
    }

    // Make the helper function globally available
    window.fixServerUrl = fixServerUrl;

    // First check localStorage for admin status (faster, avoids API call if already authed)
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    const isSeller = localStorage.getItem('isSeller') === 'true';
    
    if (!isAdmin) {
        // If not admin based on localStorage, redirect to appropriate dashboard
        if (isSeller) {
            window.location.href = '/pages/seller-dashboard.html';
        } else {
            window.location.href = '/pages/buyer-dashboard.html';
        }
        return;
    }

    // Verify admin access with API (to ensure token is still valid)
    try {
        const response = await fetch(`${API_BASE}/user/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Not authorized');
        }

        const user = await response.json();
        
        // Double-check admin status with server data
        if (user.email !== 'admin@virtuosa.com' && user.role !== 'admin' && user.isAdmin !== 'true' && user.isAdmin !== true) {
            alert('Access denied. Admin privileges required.');
            window.location.href = '/pages/buyer-dashboard.html';
            return;
        }

        // Update user greeting
        const greetingElement = document.getElementById('user-greeting');
        if (greetingElement) {
            greetingElement.textContent = `Hello, ${user.fullName}`;
        }
    } catch (error) {
        console.error('Admin check failed:', error);
        // If API call fails, redirect to login (token might be expired)
        window.location.href = '/pages/login.html';
        return;
    }

    let assets = [];
    let filteredAssets = [];

    // Load assets
    await loadAssets();

    // Event listeners
    const uploadBtn = document.getElementById('upload-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', () => {
            document.getElementById('upload-zone').classList.toggle('hidden');
        });
    }

    const browseBtn = document.getElementById('browse-btn');
    if (browseBtn) {
        browseBtn.addEventListener('click', () => {
            document.getElementById('file-input').click();
        });
    }

    const fileInput = document.getElementById('file-input');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterAssets();
        });
    }

    const filterSelect = document.getElementById('filter-select');
    if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
            filterAssets();
        });
    }

    // Drag and drop
    const uploadZone = document.getElementById('upload-zone');
    if (uploadZone) {
        uploadZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.classList.remove('dragover');
        });

        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
            handleFiles(e.dataTransfer.files);
        });
    }

    // Load assets function
    async function loadAssets() {
        try {
            console.log('🔍 Loading assets from:', `${API_BASE}/marketing/assets`);
            const response = await fetch(`${API_BASE}/marketing/assets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                assets = await response.json();
                console.log('🔍 Assets loaded:', assets);
                filteredAssets = [...assets];
                renderAssets();
                updateStats();
            } else {
                const errorData = await response.json();
                console.error('Failed to load assets:', errorData);
                renderAssets([]);
            }
        } catch (error) {
            console.error('Error loading assets:', error);
            renderAssets([]);
        }
    }

    // Render assets
    function renderAssets() {
        const container = document.getElementById('assets-container');
        if (!container) return;
        
        if (filteredAssets.length === 0) {
            container.innerHTML = `
                <div class="text-center py-12 col-span-full">
                    <i class="fas fa-images text-6xl text-gray-300 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-600 mb-2">No assets found</h3>
                    <p class="text-gray-500 mb-6">Upload your first marketing asset to get started.</p>
                    <button onclick="document.getElementById('upload-btn').click()" 
                            class="bg-button-gold text-white px-6 py-3 rounded-full hover-bg-button-gold transition-colors">
                        <i class="fas fa-upload mr-2"></i>Upload First Asset
                    </button>
                </div>
            `;
            return;
        }

        let html = '';
        filteredAssets.forEach(asset => {
            console.log('🔍 Rendering asset:', asset);
            const isImage = asset.mimetype.startsWith('image/');
            const isVideo = asset.mimetype.startsWith('video/');
            const fileSize = (asset.size / (1024 * 1024)).toFixed(2); // Convert to MB
            
            // Fix the URL to point to the server, not the client
            const serverUrl = fixServerUrl(asset.url);
            console.log('🔍 Asset URL (original):', asset.url);
            console.log('🔍 Asset URL (fixed):', serverUrl);
            
            html += `
                <div class="asset-card bg-white rounded-xl shadow-lg overflow-hidden">
                    <div class="relative">
                        ${isImage ? `
                            <img src="${serverUrl}" alt="${asset.filename}" class="asset-preview" 
                                 onerror="console.error('Image failed to load:', '${serverUrl}'); this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div style="display:none; background:#f3f4f6; height:200px; align-items:center; justify-content:center; flex-direction:column;">
                                <i class="fas fa-image text-4xl text-gray-400 mb-2"></i>
                                <span class="text-sm text-gray-600">Image failed to load</span>
                                <span class="text-xs text-gray-500">${serverUrl}</span>
                            </div>
                        ` : isVideo ? `
                            <video src="${serverUrl}" class="asset-preview" controls></video>
                        ` : `
                            <div class="asset-preview bg-gray-100 flex items-center justify-center">
                                <i class="fas fa-file text-4xl text-gray-400"></i>
                            </div>
                        `}
                        
                        <div class="asset-actions absolute top-2 right-2 flex space-x-2">
                            <button onclick="copyAssetUrl('${serverUrl}')" 
                                    class="bg-white bg-opacity-90 text-navy p-2 rounded-lg hover:bg-opacity-100 transition-all">
                                <i class="fas fa-copy"></i>
                            </button>
                            <button onclick="deleteAsset('${asset._id}')" 
                                    class="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-all">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="p-4">
                        <h3 class="font-semibold text-navy mb-2 truncate">${asset.filename}</h3>
                        <div class="flex items-center justify-between text-sm text-gray-600 mb-3">
                            <span>${asset.mimetype.split('/')[0].toUpperCase()}</span>
                            <span>${fileSize} MB</span>
                        </div>
                        
                        ${asset.tags && asset.tags.length > 0 ? `
                            <div class="flex flex-wrap gap-1 mb-3">
                                ${asset.tags.map(tag => `<span class="tag-badge">${tag}</span>`).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="text-xs text-gray-500">
                            Uploaded ${new Date(asset.createdAt).toLocaleDateString()}
                        </div>
                        
                        <div class="text-xs text-gray-400 mt-2 break-all">
                            URL: ${serverUrl}
                        </div>
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    // Update stats
    function updateStats() {
        const totalAssets = assets.length;
        const totalImages = assets.filter(a => a.mimetype.startsWith('image/')).length;
        const totalVideos = assets.filter(a => a.mimetype.startsWith('video/')).length;
        const totalSize = assets.reduce((sum, asset) => sum + asset.size, 0);
        const storageUsed = (totalSize / (1024 * 1024)).toFixed(2);

        const totalAssetsElem = document.getElementById('total-assets');
        if (totalAssetsElem) totalAssetsElem.textContent = totalAssets;
        
        const totalImagesElem = document.getElementById('total-images');
        if (totalImagesElem) totalImagesElem.textContent = totalImages;
        
        const totalVideosElem = document.getElementById('total-videos');
        if (totalVideosElem) totalVideosElem.textContent = totalVideos;
        
        const storageUsedElem = document.getElementById('storage-used');
        if (storageUsedElem) storageUsedElem.textContent = `${storageUsed} MB`;
    }

    // Filter assets
    function filterAssets() {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const filterType = document.getElementById('filter-select').value;

        filteredAssets = assets.filter(asset => {
            const matchesSearch = asset.filename.toLowerCase().includes(searchTerm) ||
                             (asset.tags && asset.tags.some(tag => tag.toLowerCase().includes(searchTerm)));
            
            const matchesFilter = !filterType || 
                (filterType === 'image' && asset.mimetype.startsWith('image/')) ||
                (filterType === 'video' && asset.mimetype.startsWith('video/')) ||
                (filterType === 'banner' && asset.tags && asset.tags.includes('banner')) ||
                (filterType === 'promotion' && asset.tags && asset.tags.includes('promotion'));

            return matchesSearch && matchesFilter;
        });

        renderAssets();
    }

    // Handle file selection
    function handleFileSelect(e) {
        handleFiles(e.target.files);
    }

    // Handle files
    async function handleFiles(files) {
        const tagsInput = document.getElementById('tags-input');
        const tags = tagsInput ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t) : [];
        
        for (let file of files) {
            await uploadFile(file, tags);
        }
        
        // Reset form
        const fileInputElem = document.getElementById('file-input');
        if (fileInputElem) fileInputElem.value = '';
        
        if (tagsInput) tagsInput.value = '';
        
        const uploadZoneElem = document.getElementById('upload-zone');
        if (uploadZoneElem) uploadZoneElem.classList.add('hidden');
        
        // Reload assets
        await loadAssets();
    }

    // Upload file
    async function uploadFile(file, tags) {
        console.log('🔍 Uploading file:', file.name, 'Tags:', tags);
        const formData = new FormData();
        formData.append('asset', file);
        formData.append('tags', JSON.stringify(tags));

        try {
            console.log('🔍 Upload request to:', `${API_BASE}/marketing/assets/upload`);
            const response = await fetch(`${API_BASE}/marketing/assets/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            console.log('🔍 Upload response status:', response.status);
            console.log('🔍 Response headers:', response.headers);
            
            // Get response text first to check if it's HTML
            const responseText = await response.text();
            console.log('🔍 Response text:', responseText.substring(0, 200));
            
            if (response.ok) {
                try {
                    const result = JSON.parse(responseText);
                    console.log('🔍 Upload successful:', result);
                    showToast(`${file.name} uploaded successfully!`, 'success');
                } catch (parseError) {
                    console.error('🔍 Failed to parse response:', parseError);
                    showToast('Upload succeeded but response format is invalid', 'warning');
                }
            } else {
                // Try to parse as JSON first, fallback to text
                let error;
                try {
                    error = JSON.parse(responseText);
                    console.error('🔍 Upload failed (JSON):', error);
                    showToast(error.message || 'Failed to upload file', 'error');
                } catch (parseError) {
                    console.error('🔍 Upload failed (HTML):', responseText);
                    showToast(`Upload failed: Server returned ${response.status} error`, 'error');
                }
            }
        } catch (error) {
            console.error('🔍 Upload error:', error);
            showToast('Failed to upload file - ' + error.message, 'error');
        }
    }

    // Copy asset URL
    window.copyAssetUrl = async (url) => {
        try {
            const fullUrl = window.location.origin + url;
            await navigator.clipboard.writeText(fullUrl);
            showToast('URL copied to clipboard!', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            showToast('Failed to copy URL', 'error');
        }
    };

    // Delete asset
    window.deleteAsset = async (assetId) => {
        if (!confirm('Are you sure you want to delete this asset?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/marketing/assets/${assetId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                showToast('Asset deleted successfully!', 'success');
                await loadAssets();
            } else {
                const error = await response.json();
                showToast(error.message || 'Failed to delete asset', 'error');
            }
        } catch (error) {
            console.error('Error deleting asset:', error);
            showToast('Failed to delete asset', 'error');
        }
    };

    // Toast notification
    function showToast(message, type = 'success') {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <i class="fas fa-check-circle toast-icon"></i>
            <span class="toast-message">${message}</span>
        `;

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }
});
