// Cloudinary Upload Examples for Virtuosa
// This file contains examples of how to call the updated Cloudinary upload endpoints

// Get auth token from localStorage (assuming it's stored there after login)
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Generic upload function with progress tracking
async function uploadFile(file, endpoint, additionalData = {}) {
    const formData = new FormData();
    formData.append('file', file);
    
    // Add any additional data (like tags for marketing assets)
    Object.keys(additionalData).forEach(key => {
        formData.append(key, additionalData[key]);
    });

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error('Upload error:', error);
        throw error;
    }
}

// 1. Product Images Upload (Multiple images)
async function uploadProductImages(files) {
    const formData = new FormData();
    
    // Append each file with the same field name 'images'
    files.forEach(file => {
        formData.append('images', file);
    });

    try {
        const response = await fetch('/api/products', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Product creation failed: ${response.statusText}`);
        }

        const product = await response.json();
        console.log('Product created with Cloudinary images:', product);
        return product;
    } catch (error) {
        console.error('Product upload error:', error);
        throw error;
    }
}

// Usage example for product upload:
document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('product-images');
    const files = Array.from(fileInput.files);
    
    if (files.length === 0) {
        alert('Please select at least one image');
        return;
    }

    try {
        const product = await uploadProductImages(files);
        alert('Product uploaded successfully!');
        console.log('Cloudinary URLs for images:', product.images);
    } catch (error) {
        alert('Upload failed: ' + error.message);
    }
});

// 2. Marketing Asset Upload
async function uploadMarketingAsset(file, tags = []) {
    const additionalData = {
        tags: JSON.stringify(tags)
    };

    try {
        const result = await uploadFile(file, '/api/marketing/assets/upload', additionalData);
        console.log('Marketing asset uploaded to Cloudinary:', result);
        return result;
    } catch (error) {
        console.error('Marketing asset upload error:', error);
        throw error;
    }
}

// Usage example for marketing asset upload:
document.getElementById('marketing-upload').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const tags = ['banner', 'promotion']; // Example tags
        const asset = await uploadMarketingAsset(file, tags);
        alert('Marketing asset uploaded successfully!');
        console.log('Cloudinary URL:', asset.url);
    } catch (error) {
        alert('Upload failed: ' + error.message);
    }
});

// 3. Profile Picture Upload
async function uploadProfilePicture(file) {
    try {
        const result = await uploadFile(file, '/api/user/profile-picture');
        console.log('Profile picture uploaded to Cloudinary:', result);
        return result;
    } catch (error) {
        console.error('Profile picture upload error:', error);
        throw error;
    }
}

// Usage example for profile picture upload:
document.getElementById('profile-picture-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const result = await uploadProfilePicture(file);
        
        // Update the profile picture display
        const profileImg = document.getElementById('profile-display');
        profileImg.src = result.profilePicture;
        
        alert('Profile picture updated successfully!');
    } catch (error) {
        alert('Upload failed: ' + error.message);
    }
});

// 4. Message File Upload
async function uploadMessageFile(file) {
    try {
        const result = await uploadFile(file, '/api/messages/upload');
        console.log('Message file uploaded to Cloudinary:', result);
        return result;
    } catch (error) {
        console.error('Message file upload error:', error);
        throw error;
    }
}

// Usage example for message file upload:
document.getElementById('message-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        const fileData = await uploadMessageFile(file);
        
        // Add file to message
        const messageContainer = document.getElementById('message-container');
        const fileElement = document.createElement('div');
        
        if (fileData.messageType === 'image') {
            fileElement.innerHTML = `<img src="${fileData.fileUrl}" alt="${fileData.fileName}" style="max-width: 200px;">`;
        } else {
            fileElement.innerHTML = `<a href="${fileData.fileUrl}" target="_blank">${fileData.fileName}</a>`;
        }
        
        messageContainer.appendChild(fileElement);
    } catch (error) {
        alert('File upload failed: ' + error.message);
    }
});

// 5. Drag and Drop Upload Helper
function setupDragAndDrop(dropZoneId, uploadCallback) {
    const dropZone = document.getElementById(dropZoneId);
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', async (e) => {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            try {
                await uploadCallback(files[0]);
            } catch (error) {
                console.error('Drop upload failed:', error);
            }
        }
    });
}

// Usage example for drag and drop:
setupDragAndDrop('product-drop-zone', async (file) => {
    try {
        const product = await uploadProductImages([file]);
        console.log('Product uploaded via drag and drop:', product);
    } catch (error) {
        alert('Upload failed: ' + error.message);
    }
});

// 6. Progress Tracking (for large files)
function uploadWithProgress(file, endpoint, onProgress, additionalData = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        
        formData.append('file', file);
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        // Track upload progress
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                onProgress(percentComplete);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200 || xhr.status === 201) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (error) {
                    reject(new Error('Invalid response from server'));
                }
            } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
        });

        xhr.open('POST', endpoint);
        xhr.setRequestHeader('Authorization', `Bearer ${getAuthToken()}`);
        xhr.send(formData);
    });
}

// Usage example with progress tracking:
document.getElementById('upload-with-progress').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const progressBar = document.getElementById('upload-progress');
    
    try {
        const result = await uploadWithProgress(
            file, 
            '/api/user/profile-picture',
            (percent) => {
                progressBar.style.width = percent + '%';
                progressBar.textContent = Math.round(percent) + '%';
            }
        );
        
        alert('Upload completed!');
        console.log('Cloudinary URL:', result.profilePicture);
    } catch (error) {
        alert('Upload failed: ' + error.message);
    }
});

// Export functions for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        uploadProductImages,
        uploadMarketingAsset,
        uploadProfilePicture,
        uploadMessageFile,
        uploadWithProgress,
        setupDragAndDrop
    };
}
