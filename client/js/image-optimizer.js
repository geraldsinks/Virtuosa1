/**
 * Image Optimization Utility
 * Provides centralized image URL optimization for Cloudinary and other image sources
 */

// Helper function to fix URLs to point to server
function fixServerUrl(url) {
    if (!url) return url;
    return url.startsWith('/') ? `${window.API_BASE || 'https://api.virtuosazm.com'}${url}` : url;
}

// Unified Cloudinary URL optimization function
function generateOptimizedCloudinaryUrl(imageUrl, width, height, preserveExistingTransforms = false) {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return imageUrl;
    }

    if (!imageUrl.includes('res.cloudinary.com')) {
        return imageUrl;
    }

    // Validate dimensions - Default to 800 for better quality on modern screens
    width = Math.max(1, Math.min(3000, parseInt(width) || 800));
    height = Math.max(1, Math.min(3000, parseInt(height) || 800));

    try {
        const uploadIndex = imageUrl.indexOf('/upload/');
        if (uploadIndex === -1) {
            console.warn('Invalid Cloudinary URL structure:', imageUrl);
            return imageUrl;
        }

        const cloudinaryBase = imageUrl.substring(0, uploadIndex + 8); // +8 for '/upload/'
        const remainingPath = imageUrl.substring(uploadIndex + 8);

        let optimizedUrl;
        // Use q_auto:good and dpr_auto for better quality/performance balance
        const newTransforms = `q_auto:good,f_auto,w_${width},h_${height},c_fill,dpr_auto`;

        if (preserveExistingTransforms && remainingPath.includes('/')) {
            // Preserve existing transformations and add ours
            const pathIndex = remainingPath.indexOf('/');
            const existingTransforms = remainingPath.substring(0, pathIndex);
            const imagePath = remainingPath.substring(pathIndex);
            
            // Combine transformations, avoiding duplicates
            const combinedTransforms = existingTransforms ? `${existingTransforms},${newTransforms}` : newTransforms;
            optimizedUrl = cloudinaryBase + combinedTransforms + imagePath;
        } else {
            // Strip existing transformations and apply new ones
            const cleanImagePath = remainingPath.includes('/') ? 
                remainingPath.substring(remainingPath.indexOf('/') + 1) : remainingPath;
            optimizedUrl = cloudinaryBase + newTransforms + '/' + cleanImagePath;
        }

        return optimizedUrl;
    } catch (error) {
        console.error('Error processing Cloudinary URL:', error);
        return imageUrl;
    }
}

// Enhanced image URL optimizer that handles multiple image sources
function optimizeImageUrl(imageUrl, width = 800, height = 800, options = {}) {
    if (!imageUrl) {
        return 'https://placehold.co/800x800?text=No+Image';
    }

    const {
        format = 'auto', // auto, webp, avif
        quality = 'auto:good',
        crop = 'fill',
        preserveTransforms = false
    } = options;

    try {
        // Handle Cloudinary URLs
        if (imageUrl.includes('res.cloudinary.com')) {
            return generateOptimizedCloudinaryUrl(imageUrl, width, height, preserveTransforms);
        }

        // Handle placeholder images
        if (imageUrl.includes('placehold.co')) {
            const optimizedUrl = imageUrl.replace(/placehold\.co/, 'placehold.co/webp');
            return optimizedUrl;
        }

        // Handle API served images
        if (imageUrl.includes('api.virtuosazm.com')) {
            const separator = imageUrl.includes('?') ? '&' : '?';
            const params = [];
            
            // Parse existing parameters to avoid duplication
            const urlObj = new URL(imageUrl);
            const existingParams = new URLSearchParams(urlObj.search);
            
            // Only add parameters that don't already exist
            if (!existingParams.has('format')) {
                params.push(`format=${format}`);
            }
            if (!existingParams.has('w')) {
                params.push(`w=${width}`);
            }
            if (!existingParams.has('h')) {
                params.push(`h=${height}`);
            }
            if (!existingParams.has('q')) {
                params.push(`q=${quality}`);
            }
            
            // Build the final URL
            if (params.length > 0) {
                return `${imageUrl}${separator}${params.join('&')}`;
            } else {
                return imageUrl;
            }
        }

        // Handle relative server URLs
        if (imageUrl.startsWith('/')) {
            const fixedUrl = fixServerUrl(imageUrl);
            const separator = fixedUrl.includes('?') ? '&' : '?';
            const params = [`format=${format}`, `w=${width}`, `h=${height}`, `q=${quality}`];
            return `${fixedUrl}${separator}${params.join('&')}`;
        }

        // Return original URL for external images
        return imageUrl;
    } catch (error) {
        console.error('Error optimizing image URL:', error);
        return imageUrl;
    }
}

// Generate WebP version of image URL
function generateWebPUrl(imageUrl, width = 400, height = 280) {
    return optimizeImageUrl(imageUrl, width, height, { format: 'webp' });
}

// Responsive image srcset generator
function generateResponsiveSrcSet(imageUrl, baseWidth = 800, baseHeight = 800, breakpoints = [320, 640, 800, 1024, 1280, 1600]) {
    if (!imageUrl) return '';

    const srcset = breakpoints.map(width => {
        const height = Math.round((width / baseWidth) * baseHeight);
        const optimizedUrl = optimizeImageUrl(imageUrl, width, height);
        return `${optimizedUrl} ${width}w`;
    });

    return srcset.join(', ');
}

// Lazy loading image generator with optimization
function createOptimizedImage(imageUrl, alt, options = {}) {
    const {
        width = 400,
        height = 280,
        className = '',
        loading = 'lazy',
        priority = false, // If true, sets fetchpriority="high"
        sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
        srcset = true
    } = options;

    const optimizedSrc = optimizeImageUrl(imageUrl, width, height);
    const srcsetAttribute = srcset ? generateResponsiveSrcSet(imageUrl, width, height) : '';

    return `<img 
        src="${optimizedSrc}" 
        ${srcsetAttribute ? `srcset="${srcsetAttribute}"` : ''}
        ${sizes ? `sizes="${sizes}"` : ''}
        alt="${alt || ''}" 
        class="${className}" 
        width="${width}" 
        height="${height}"
        loading="${loading}"
        ${priority ? 'fetchpriority="high"' : ''}
        onerror="this.src='https://placehold.co/${width}x${height}?text=Error+Loading+Image'"
    >`;
}

// Make functions globally available
window.fixServerUrl = fixServerUrl;
window.generateOptimizedCloudinaryUrl = generateOptimizedCloudinaryUrl;
window.optimizeImageUrl = optimizeImageUrl;
window.generateWebPUrl = generateWebPUrl;
window.generateResponsiveSrcSet = generateResponsiveSrcSet;
window.createOptimizedImage = createOptimizedImage;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fixServerUrl,
        generateOptimizedCloudinaryUrl,
        optimizeImageUrl,
        generateWebPUrl,
        generateResponsiveSrcSet,
        createOptimizedImage
    };
}
