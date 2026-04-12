// Product Editing JavaScript
let currentStep = 1;
let existingImages = []; // URLs of existing images
let newImages = []; // File objects of new images
let imagesToRemove = []; // URLs of images to be removed
let currentProductId = null;

const API_BASE = window.API_BASE || '';

// Helper function to fix URLs to point to server
function fixServerUrl(url) {
    if (!url) return url;
    if (url.startsWith('http')) return url;
    return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

window.fixServerUrl = fixServerUrl;

const subcategories = {
    'Textbooks': ['Science', 'Mathematics', 'Engineering', 'Business', 'Arts', 'Medicine', 'Law', 'Other'],
    'Electronics': ['Laptops', 'Phones', 'Tablets', 'Headphones', 'Cameras', 'Gaming', 'Other'],
    'Computers & Software': ['Laptops', 'Desktops', 'Software', 'Programming', 'Accessories', 'Other'],
    "Men's Clothing": ['T-Shirts', 'Shirts', 'Hoodies & Sweatshirts', 'Jackets', 'Trousers', 'Shorts', 'Other'],
    "Women's Clothing": ['Tops', 'Dresses', 'Skirts', 'Hoodies & Sweatshirts', 'Jackets', 'Trousers', 'Other'],
    'Shoes': ['Sneakers', 'Formal', 'Sandals & Slides', 'Sports', 'Other'],
    'Accessories': ['Bags', 'Belts', 'Hats & Caps', 'Jewellery', 'Other'],
    'Personal Care & Beauty': ['Skincare', 'Haircare', 'Fragrance', 'Makeup', 'Other'],
    'Food & Beverages': ['Snacks', 'Drinks', 'Meals', 'Other'],
    'Sports & Outdoors': ['Equipment', 'Apparel', 'Accessories', 'Other'],
    'Home & Living': ['Furniture', 'Decor', 'Storage & Organization', 'Kitchen & Dining', 'Other'],
    'Services': ['Tutoring', 'Writing', 'Design', 'Technical', 'Other'],
    'Other': ['General']
};

function toggleInventoryOptions() {
    const listingType = document.querySelector('input[name="listingType"]:checked').value;
    const inventoryOptions = document.getElementById('inventoryOptions');
    if (listingType === 'persistent') {
        inventoryOptions.classList.remove('hidden');
    } else {
        inventoryOptions.classList.add('hidden');
    }
}
window.toggleInventoryOptions = toggleInventoryOptions;

function updateSubcategories(selectedSub = '') {
    const category = document.getElementById('category').value;
    const subcategorySelect = document.getElementById('subcategory');
    
    subcategorySelect.innerHTML = '<option value="">Select subcategory</option>';
    
    if (category && subcategories[category]) {
        subcategories[category].forEach(sub => {
            const option = document.createElement('option');
            option.value = sub;
            option.textContent = sub;
            if (sub === selectedSub) option.selected = true;
            subcategorySelect.appendChild(option);
        });
    }
}
window.updateSubcategories = updateSubcategories;

async function loadProductData() {
    const urlParams = new URLSearchParams(window.location.search);
    currentProductId = urlParams.get('id');
    const token = localStorage.getItem('token');

    if (!currentProductId || !token) {
        window.location.href = '/pages/seller-dashboard.html';
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/products/${currentProductId}`);
        if (!response.ok) throw new Error('Failed to load product');
        const product = await response.json();

        // Fill basic info
        document.getElementById('productName').value = product.name || '';
        document.getElementById('category').value = product.category || '';
        updateSubcategories(product.subcategory);
        document.getElementById('condition').value = product.condition || '';
        document.getElementById('price').value = product.price || 0;
        document.getElementById('originalPrice').value = product.originalPrice || '';
        document.getElementById('description').value = product.description || '';

        // Fill additional details
        const lType = product.listingType === 'persistent' ? 'persistent' : 'one_time';
        document.querySelector(`input[name="listingType"][value="${lType}"]`).checked = true;
        toggleInventoryOptions();

        if (product.listingType === 'persistent') {
            document.getElementById('inventory').value = product.inventory || 1;
            document.getElementById('inventoryTracking').checked = product.inventoryTracking !== false;
            document.getElementById('lowStockThreshold').value = product.lowStockThreshold || 1;
        }

        document.getElementById('courseCode').value = product.courseCode || '';
        document.getElementById('courseName').value = product.courseName || '';
        document.getElementById('author').value = product.author || '';
        document.getElementById('isbn').value = product.isbn || '';
        document.getElementById('location').value = product.campusLocation || product.location || '';

        if (product.deliveryOptions) {
            document.getElementById('pickupAvailable').checked = product.deliveryOptions.some(o => o.type === 'pickup');
            document.getElementById('deliveryAvailable').checked = product.deliveryOptions.some(o => o.type === 'delivery');
        }

        // Handle images
        existingImages = product.images || [];
        updateImagePreview();

        if (window.lucide) window.lucide.createIcons();
    } catch (error) {
        console.error('Error loading product:', error);
        showError('Failed to load product data');
    }
}

function handleImageUpload() {
    const input = document.getElementById('imageInput');
    const files = Array.from(input.files);
    
    if (existingImages.length + newImages.length + files.length > 5) {
        showError('Maximum 5 images allowed');
        return;
    }
    
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            newImages.push({ file, url: e.target.result });
            updateImagePreview();
        };
        reader.readAsDataURL(file);
    });
    input.value = '';
}
window.handleImageUpload = handleImageUpload;

function removeExistingImage(url) {
    existingImages = existingImages.filter(img => img !== url);
    imagesToRemove.push(url);
    updateImagePreview();
}
window.removeExistingImage = removeExistingImage;

function removeNewImage(index) {
    newImages.splice(index, 1);
    updateImagePreview();
}
window.removeNewImage = removeNewImage;

function updateImagePreview() {
    const container = document.getElementById('imagePreview');
    container.innerHTML = '';
    
    // Show existing images
    existingImages.forEach((url) => {
        const div = document.createElement('div');
        div.className = 'relative group';
        div.innerHTML = `
            <img src="${fixServerUrl(url)}" class="w-full h-32 object-cover rounded-lg border">
            <button type="button" onclick="removeExistingImage('${url}')" class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <i class="fas fa-times text-xs"></i>
            </button>
        `;
        container.appendChild(div);
    });

    // Show new images
    newImages.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'relative group';
        div.innerHTML = `
            <img src="${img.url}" class="w-full h-32 object-cover rounded-lg border border-gold">
            <button type="button" onclick="removeNewImage(${index})" class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <i class="fas fa-times text-xs"></i>
            </button>
            <span class="absolute bottom-1 left-1 bg-gold text-navy text-[10px] px-1 rounded font-bold">NEW</span>
        `;
        container.appendChild(div);
    });
}

function nextStep() {
    if (currentStep < 3 && validateStep(currentStep)) {
        currentStep++;
        updateStepDisplay();
    }
}
window.nextStep = nextStep;

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}
window.previousStep = previousStep;

function validateStep(step) {
    if (step === 1) {
        const name = document.getElementById('productName').value;
        const cat = document.getElementById('category').value;
        const cond = document.getElementById('condition').value;
        const price = document.getElementById('price').value;
        if (!name || !cat || !cond || !price) {
            showError('Please fill in all required fields');
            return false;
        }
    }
    return true;
}

function updateStepDisplay() {
    document.querySelectorAll('.step-content').forEach(c => c.classList.add('hidden'));
    document.getElementById(`step${currentStep}Content`).classList.remove('hidden');

    for (let i = 1; i <= 3; i++) {
        const ind = document.getElementById(`step${i}-indicator`);
        if (ind) {
            if (i === currentStep) ind.className = 'step-active w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0';
            else if (i < currentStep) ind.className = 'step-done w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0';
            else ind.className = 'step-inactive w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0';
        }
    }
}

async function updateProduct(event) {
    if (event) event.preventDefault();
    
    const token = localStorage.getItem('token');
    const formData = new FormData();
    
    formData.append('name', document.getElementById('productName').value);
    formData.append('category', document.getElementById('category').value);
    formData.append('subcategory', document.getElementById('subcategory').value);
    formData.append('condition', document.getElementById('condition').value);
    formData.append('price', document.getElementById('price').value);
    formData.append('originalPrice', document.getElementById('originalPrice').value);
    formData.append('description', document.getElementById('description').value);
    
    const listingType = document.querySelector('input[name="listingType"]:checked').value;
    formData.append('listingType', listingType);
    if (listingType === 'persistent') {
        formData.append('inventory', document.getElementById('inventory').value);
        formData.append('inventoryTracking', document.getElementById('inventoryTracking').checked);
        formData.append('lowStockThreshold', document.getElementById('lowStockThreshold').value);
    }
    
    formData.append('courseCode', document.getElementById('courseCode').value);
    formData.append('courseName', document.getElementById('courseName').value);
    formData.append('author', document.getElementById('author').value);
    formData.append('isbn', document.getElementById('isbn').value);
    formData.append('campusLocation', document.getElementById('location').value);
    formData.append('pickupAvailable', document.getElementById('pickupAvailable').checked);
    formData.append('deliveryAvailable', document.getElementById('deliveryAvailable').checked);

    // Images to remove
    imagesToRemove.forEach(url => formData.append('removeImages', url));
    
    // New images
    newImages.forEach(img => formData.append('images', img.file));

    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalContent = submitButton.innerHTML;
    submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Saving Changes...`;
    submitButton.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/products/${currentProductId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });

        if (response.ok) {
            showSuccessModal();
        } else {
            const data = await response.json();
            showError(data.message || 'Update failed');
        }
    } catch (error) {
        console.error('Update error:', error);
        showError('An error occurred during update');
    } finally {
        if (submitButton) {
            submitButton.innerHTML = originalContent;
            submitButton.disabled = false;
        }
    }
}
window.updateProduct = updateProduct;

function showSuccessModal() {
    document.getElementById('successModal').classList.remove('hidden');
}
window.viewProduct = () => window.location.href = `/product/${currentProductId}`;

function showError(message) {
    const div = document.createElement('div');
    div.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    loadProductData();
});
