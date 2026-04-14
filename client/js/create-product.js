// Product Creation JavaScript
let currentStep = 1;
let uploadedImages = [];
let currentProductId = null;

// Helper function to fix URLs to point to server
function fixServerUrl(url) {
    if (!url) return url;
    return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

// Make the helper function globally available
window.fixServerUrl = fixServerUrl;

// Subcategories based on main categories (kept in sync with create-product.html category options)
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

// Toggle inventory options based on listing type
function toggleInventoryOptions() {
    const listingType = document.querySelector('input[name="listingType"]:checked').value;
    const inventoryOptions = document.getElementById('inventoryOptions');
    
    if (listingType === 'persistent') {
        inventoryOptions.classList.remove('hidden');
    } else {
        inventoryOptions.classList.add('hidden');
    }
}

// Make the function globally available
window.toggleInventoryOptions = toggleInventoryOptions;

// Update subcategories based on selected category
function updateSubcategories() {
    const category = document.getElementById('category').value;
    const subcategorySelect = document.getElementById('subcategory');
    
    subcategorySelect.innerHTML = '<option value="">Select subcategory</option>';
    
    if (category && subcategories[category]) {
        subcategories[category].forEach(sub => {
            const option = document.createElement('option');
            option.value = sub;
            option.textContent = sub;
            subcategorySelect.appendChild(option);
        });
    }
}

// Handle image upload
function handleImageUpload() {
    const input = document.getElementById('imageInput');
    const files = Array.from(input.files);
    
    if (uploadedImages.length + files.length > 5) {
        showError('You can upload a maximum of 5 images');
        return;
    }
    
    files.forEach(file => {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            showError(`File ${file.name} is too large. Maximum size is 10MB.`);
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageData = {
                file: file,
                url: e.target.result,
                name: file.name
            };
            uploadedImages.push(imageData);
            updateImagePreview();
        };
        reader.readAsDataURL(file);
    });
    
    // Clear input to allow selecting the same file again
    input.value = '';
}

// Update image preview
function updateImagePreview() {
    const container = document.getElementById('imagePreview');
    container.innerHTML = '';
    
    uploadedImages.forEach((image, index) => {
        const imageDiv = document.createElement('div');
        imageDiv.className = 'relative group';
        imageDiv.innerHTML = `
            <img src="${fixServerUrl(image.url)}" alt="${image.name}" class="w-full h-32 object-cover rounded-lg">
            <button type="button" onclick="removeImage(${index})" class="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                <i class="fas fa-times text-xs"></i>
            </button>
        `;
        container.appendChild(imageDiv);
    });
}

// Remove image
function removeImage(index) {
    uploadedImages.splice(index, 1);
    updateImagePreview();
}

// Navigation between steps
function nextStep() {
    if (currentStep < 3) {
        if (validateStep(currentStep)) {
            currentStep++;
            updateStepDisplay();
        }
    }
}

function previousStep() {
    if (currentStep > 1) {
        currentStep--;
        updateStepDisplay();
    }
}

// Validate current step
function validateStep(step) {
    if (step === 1) {
        const productName = document.getElementById('productName').value.trim();
        const category = document.getElementById('category').value;
        const condition = document.getElementById('condition').value;
        const price = document.getElementById('price').value;
        const description = document.getElementById('description').value.trim();
        
        if (!productName) {
            showError('Please enter a product name');
            return false;
        }
        if (!category) {
            showError('Please select a category');
            return false;
        }
        if (!condition) {
            showError('Please select the condition');
            return false;
        }
        if (!price || price <= 0) {
            showError('Please enter a valid price');
            return false;
        }
        if (!description) {
            showError('Please enter a description');
            return false;
        }
    }
    
    return true;
}

// Update step display
function updateStepDisplay() {
    // Ensure DOM is ready
    if (document.readyState !== 'complete' && document.readyState !== 'interactive') {
        console.warn('DOM not ready, skipping updateStepDisplay');
        return;
    }
    
    // Hide all step contents
    document.querySelectorAll('.step-content').forEach(content => {
        content.classList.add('hidden');
    });
    
    // Show current step content
    const currentStepContent = document.getElementById(`step${currentStep}Content`);
    if (currentStepContent) {
        currentStepContent.classList.remove('hidden');
    } else {
        console.warn(`Step ${currentStep} content not found`);
    }
    
    // Update step indicators with better error handling
    for (let i = 1; i <= 3; i++) {
        const stepIndicator = document.getElementById(`step${i}-indicator`);
        if (stepIndicator && stepIndicator !== null) {
            try {
                if (i <= currentStep) {
                    stepIndicator.className = 'step-active w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0';
                } else {
                    stepIndicator.className = 'step-inactive w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0';
                }
            } catch (error) {
                console.error(`Error updating step ${i} indicator:`, error);
            }
        } else {
            console.warn(`Step ${i} indicator not found or null`);
        }
    }
    
    // Update progress lines
    const progressLines = document.querySelectorAll('.flex.items-center.justify-between > div.w-16');
    progressLines.forEach((line, index) => {
        try {
            if (index < currentStep - 1) {
                line.className = 'w-16 h-1 bg-blue-500';
            } else {
                line.className = 'w-16 h-1 bg-gray-300';
            }
        } catch (error) {
            console.error(`Error updating progress line ${index}:`, error);
        }
    });
}

// Create product
async function createProduct(event) {
    event.preventDefault();
    
    if (!validateStep(3)) {
        return;
    }
    
    // Show loading state
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalContent = submitButton.innerHTML;
    submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Creating Listing...`;
    submitButton.disabled = true;

    try {
        const token = localStorage.getItem('token');
        
        // Prepare form data
        const formData = new FormData();
        formData.append('name', document.getElementById('productName').value.trim());
        formData.append('description', document.getElementById('description').value.trim());
        formData.append('price', parseFloat(document.getElementById('price').value));
        const op = document.getElementById('originalPrice').value;
        if (op && !isNaN(parseFloat(op))) {
            formData.append('originalPrice', parseFloat(op));
        }
        formData.append('category', document.getElementById('category').value);
        formData.append('subcategory', document.getElementById('subcategory').value);
        formData.append('condition', document.getElementById('condition').value);
        formData.append('courseCode', document.getElementById('courseCode').value.trim());
        formData.append('courseName', document.getElementById('courseName').value.trim());
        formData.append('author', document.getElementById('author').value.trim());
        formData.append('isbn', document.getElementById('isbn').value.trim());
        // Send both for compatibility
        const locationValue = document.getElementById('location').value.trim();
        formData.append('location', locationValue);
        formData.append('campusLocation', locationValue);
        formData.append('pickupAvailable', document.getElementById('pickupAvailable').checked);
        formData.append('deliveryAvailable', document.getElementById('deliveryAvailable').checked);
        
        // Add listing type and inventory fields
        const listingType = document.querySelector('input[name="listingType"]:checked').value;
        formData.append('listingType', listingType);
        
        if (listingType === 'persistent') {
            formData.append('inventory', parseInt(document.getElementById('inventory').value) || 1);
            formData.append('inventoryTracking', document.getElementById('inventoryTracking').checked);
            formData.append('lowStockThreshold', parseInt(document.getElementById('lowStockThreshold').value) || 1);
        }
        
        // Add images
        uploadedImages.forEach((image, index) => {
            formData.append(`images`, image.file);
        });
        
        const response = await fetch(`${API_BASE}/products`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            let errorMessage = 'Failed to create product';
            
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // If we can't parse JSON, use status text
                errorMessage = `Server error: ${response.status} ${response.statusText}`;
                
                // Provide specific guidance for common errors
                if (response.status === 502) {
                    errorMessage = 'Server is temporarily unavailable. Please try again in a few moments.';
                } else if (response.status === 403) {
                    errorMessage = 'You need to be a verified seller to create products.';
                } else if (response.status === 401) {
                    errorMessage = 'Please log in to create products.';
                }
            }
            
            throw new Error(errorMessage);
        }
        
        const product = await response.json();
        currentProductId = product._id;
        showSuccessModal();
        
    } catch (error) {
        console.error('Error creating product:', error);
        showError(error.message || 'Failed to create product');
    } finally {
        if (submitButton) {
            submitButton.innerHTML = originalContent;
            submitButton.disabled = false;
        }
    }
}

// Show success modal
function showSuccessModal() {
    document.getElementById('successModal').classList.remove('hidden');
}

// View created product
function viewProduct() {
    if (currentProductId) {
        window.location.href = `/products?id=${currentProductId}`;
    } else {
        window.location.href = '/products';
    }
}

// Create another product
function createAnother() {
    // Reset form
    document.getElementById('productForm').reset();
    uploadedImages = [];
    currentProductId = null;
    currentStep = 1;
    updateStepDisplay();
    updateImagePreview();
    
    // Close modal
    document.getElementById('successModal').classList.add('hidden');
}

// Show error message
function showError(message) {
    // Remove existing error notifications
    const existingErrors = document.querySelectorAll('.error-notification');
    existingErrors.forEach(error => error.remove());
    
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 error-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Check if user is verified seller
async function checkSellerStatus() {
    try {
        const token = localStorage.getItem('token');
        
        const response = await fetch(`${API_BASE}/user/profile`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to load user profile');
        }
        
        const user = await response.json();
        
        if (!user.isSeller) {
            // Redirect to seller verification page
            alert('You need to become a seller first. Redirecting to seller verification page...');
            window.location.href = '/seller-verification';
            return;
        }
        
        if (!user.sellerVerified) {
            // Show warning about verification
            const warningDiv = document.createElement('div');
            warningDiv.className = 'bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6';
            warningDiv.innerHTML = `
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="fas fa-exclamation-triangle text-yellow-400"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-yellow-700">
                            <strong>Notice:</strong> Your seller account is not yet verified. 
                            <a href="/seller-verification" class="underline font-medium">Complete verification</a> 
                            to unlock all seller features and increase buyer trust.
                        </p>
                    </div>
                </div>
            `;
            
            // Insert warning after the header
            const header = document.querySelector('.mb-8');
            header.parentNode.insertBefore(warningDiv, header.nextSibling);
        }
        
    } catch (error) {
        console.error('Error checking seller status:', error);
        // Don't block the page, just log the error
    }
}

// Create Product JavaScript
// API_BASE is provided by config.js

document.addEventListener('DOMContentLoaded', async () => {
    checkSellerStatus();
    updateStepDisplay();
});

// Add keyboard navigation
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter' && event.ctrlKey) {
        if (currentStep < 3) {
            nextStep();
        }
    }
});

// Auto-save draft functionality
let autoSaveTimer;
function autoSave() {
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
        const draftData = {
            productName: document.getElementById('productName').value,
            category: document.getElementById('category').value,
            subcategory: document.getElementById('subcategory').value,
            condition: document.getElementById('condition').value,
            price: document.getElementById('price').value,
            originalPrice: document.getElementById('originalPrice').value,
            description: document.getElementById('description').value,
            courseCode: document.getElementById('courseCode').value,
            courseName: document.getElementById('courseName').value,
            author: document.getElementById('author').value,
            isbn: document.getElementById('isbn').value,
            location: document.getElementById('location').value,
            pickupAvailable: document.getElementById('pickupAvailable').checked,
            deliveryAvailable: document.getElementById('deliveryAvailable').checked,
            step: currentStep,
            timestamp: new Date().toISOString()
        };
        
        localStorage.setItem('productDraft', JSON.stringify(draftData));
    }, 1000);
}

// Add auto-save listeners to form fields
document.addEventListener('DOMContentLoaded', function() {
    const formFields = document.querySelectorAll('#productForm input, #productForm select, #productForm textarea');
    formFields.forEach(field => {
        field.addEventListener('input', autoSave);
        field.addEventListener('change', autoSave);
    });
    
    // Load draft if exists
    const draft = localStorage.getItem('productDraft');
    if (draft) {
        try {
            const draftData = JSON.parse(draft);
            const timeDiff = new Date() - new Date(draftData.timestamp);
            const hoursDiff = timeDiff / (1000 * 60 * 60);
            
            if (hoursDiff < 24) { // Only restore if draft is less than 24 hours old
                // Restore form fields
                if (draftData.productName) document.getElementById('productName').value = draftData.productName;
                if (draftData.category) {
                    document.getElementById('category').value = draftData.category;
                    updateSubcategories();
                    if (draftData.subcategory) {
                        document.getElementById('subcategory').value = draftData.subcategory;
                    }
                }
                if (draftData.condition) document.getElementById('condition').value = draftData.condition;
                if (draftData.price) document.getElementById('price').value = draftData.price;
                if (draftData.originalPrice) document.getElementById('originalPrice').value = draftData.originalPrice;
                if (draftData.description) document.getElementById('description').value = draftData.description;
                if (draftData.courseCode) document.getElementById('courseCode').value = draftData.courseCode;
                if (draftData.courseName) document.getElementById('courseName').value = draftData.courseName;
                if (draftData.author) document.getElementById('author').value = draftData.author;
                if (draftData.isbn) document.getElementById('isbn').value = draftData.isbn;
                if (draftData.location) document.getElementById('location').value = draftData.location;
                if (draftData.pickupAvailable) document.getElementById('pickupAvailable').checked = draftData.pickupAvailable;
                if (draftData.deliveryAvailable) document.getElementById('deliveryAvailable').checked = draftData.deliveryAvailable;
                
                currentStep = draftData.step || 1;
                updateStepDisplay();
                
                // Show notification about restored draft
                const notification = document.createElement('div');
                notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                notification.textContent = 'Draft restored from previous session';
                document.body.appendChild(notification);
                
                setTimeout(() => {
                    notification.remove();
                }, 3000);
            }
        } catch (error) {
            console.error('Error restoring draft:', error);
        }
    }
});

// Clear draft on successful submission
function clearDraft() {
    localStorage.removeItem('productDraft');
}
