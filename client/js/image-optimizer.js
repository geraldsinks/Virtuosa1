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
function generateOptimizedCloudinaryUrl(imageUrl, width, height, preserveExistingTransforms = false, format = 'auto', quality = 'auto', compression = 'auto') {
    if (!imageUrl || typeof imageUrl !== 'string') {
        return imageUrl;
    }

    if (!imageUrl.includes('res.cloudinary.com')) {
        return imageUrl;
    }

    // Validate dimensions
    width = Math.max(1, Math.min(3000, parseInt(width) || 400));
    height = Math.max(1, Math.min(3000, parseInt(height) || 280));

    try {
        const uploadIndex = imageUrl.indexOf('/upload/');
        if (uploadIndex === -1) {
            console.warn('Invalid Cloudinary URL structure:', imageUrl);
            return imageUrl;
        }

        const cloudinaryBase = imageUrl.substring(0, uploadIndex + 8); // +8 for '/upload/'
        const remainingPath = imageUrl.substring(uploadIndex + 8);

        let optimizedUrl;
        
        // Build optimized transformations
        let transforms = [];
        
        // Format optimization - prioritize WebP for better compression
        if (format === 'auto') {
            transforms.push('f_auto'); // Let Cloudinary choose best format (WebP/AVIF)
        } else if (format === 'webp') {
            transforms.push('f_webp');
        } else if (format === 'avif') {
            transforms.push('f_avif');
        }
        
        // Quality optimization with better compression
        if (quality === 'auto') {
            transforms.push('q_auto:good'); // Use good quality for better compression
        } else if (quality === 'eco') {
            transforms.push('q_auto:eco'); // Even better compression
        } else if (typeof quality === 'number') {
            transforms.push(`q_${quality}`);
        }
        
        // Additional compression for better performance
        if (compression === 'high') {
            transforms.push('dpr_2.0'); // Optimize for high DPI displays
        }
        
        // Add dimension and crop transformations
        transforms.push(`w_${width}`, `h_${height}`, 'c_fill');
        
        const newTransforms = transforms.join(',');

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
function optimizeImageUrl(imageUrl, width = 400, height = 280, options = {}) {
    if (!imageUrl) {
        return 'https://placehold.co/400x280?text=No+Image';
    }

    const {
        format = 'auto', // auto, webp, avif
        quality = 'auto',
        crop = 'fill',
        preserveTransforms = false,
        compression = 'auto' // New compression parameter
    } = options;

    try {
        // Handle Cloudinary URLs
        if (imageUrl.includes('res.cloudinary.com')) {
            return generateOptimizedCloudinaryUrl(imageUrl, width, height, preserveTransforms, format, quality, compression);
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
    return optimizeImageUrl(imageUrl, width, height, { 
        format: 'webp', 
        quality: 'eco', // Use eco quality for better compression
        compression: 'high' 
    });
}

// Responsive image srcset generator with better compression
function generateResponsiveSrcSet(imageUrl, baseWidth = 400, baseHeight = 280, breakpoints = [320, 480, 768, 1024, 1200]) {
    if (!imageUrl) return '';

    const srcset = breakpoints.map(width => {
        const height = Math.round((width / baseWidth) * baseHeight);
        const optimizedUrl = optimizeImageUrl(imageUrl, width, height, {
            format: 'auto',
            quality: 'eco', // Better compression for responsive images
            compression: 'high'
        });
        return `${optimizedUrl} ${width}w`;
    });

    return srcset.join(', ');
}

// Critical image optimizer for LCP images
function optimizeCriticalImage(imageUrl, width, height) {
    return optimizeImageUrl(imageUrl, width, height, {
        format: 'auto',
        quality: 'good', // Balance quality and performance
        compression: 'high'
    });
}

// Lazy loading image generator with optimization
function createOptimizedImage(imageUrl, alt, options = {}) {
    const {
        width = 400,
        height = 280,
        className = '',
        loading = 'lazy',
        sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
        srcset = true,
        critical = false, // New parameter for critical images
        fetchPriority = 'auto' // New parameter for fetch priority
    } = options;

    // Use different optimization for critical vs non-critical images
    const optimizedSrc = critical ? 
        optimizeCriticalImage(imageUrl, width, height) :
        optimizeImageUrl(imageUrl, width, height, {
            format: 'auto',
            quality: 'eco',
            compression: 'high'
        });

    const srcsetAttribute = srcset ? generateResponsiveSrcSet(imageUrl, width, height) : '';

    // Build image attributes
    let imageAttrs = `
        src="${optimizedSrc}" 
        ${srcsetAttribute ? `srcset="${srcsetAttribute}"` : ''}
        ${sizes ? `sizes="${sizes}"` : ''}
        alt="${alt || ''}" 
        class="${className}" 
        width="${width}" 
        height="${height}"
        ${fetchPriority !== 'auto' ? `fetchpriority="${fetchPriority}"` : ''}
    `;

    // Only add loading attribute if not critical
    if (!critical) {
        imageAttrs += ` loading="${loading}" decoding="async"`;
    } else {
        imageAttrs += ` loading="eager" decoding="sync"`;
    }

    imageAttrs += ` onerror="this.src='https://placehold.co/${width}x${height}?text=Error+Loading+Image'"`;

    return `<img ${imageAttrs}>`;
}

// Make functions globally available
window.fixServerUrl = fixServerUrl;
window.generateOptimizedCloudinaryUrl = generateOptimizedCloudinaryUrl;
window.optimizeImageUrl = optimizeImageUrl;
window.generateWebPUrl = generateWebPUrl;
window.generateResponsiveSrcSet = generateResponsiveSrcSet;
window.createOptimizedImage = createOptimizedImage;
window.optimizeCriticalImage = optimizeCriticalImage;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fixServerUrl,
        generateOptimizedCloudinaryUrl,
        optimizeImageUrl,
        generateWebPUrl,
        generateResponsiveSrcSet,
        createOptimizedImage,
        optimizeCriticalImage
    };
}
