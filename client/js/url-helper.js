// URL Helper for updating existing navigation to clean URLs
class URLHelper {
    static updatePageLinks() {
        // Update all anchor tags to use clean URLs
        const links = document.querySelectorAll('a[href*=".html"]');
        
        links.forEach(link => {
            const href = link.getAttribute('href');
            const cleanUrl = this.getCleanUrl(href);
            
            if (cleanUrl !== href) {
                link.setAttribute('href', cleanUrl);
            }
        });
    }

    static getCleanUrl(filePath) {
        // Validate and sanitize input
        if (!filePath || typeof filePath !== 'string') {
            return '/';
        }
        
        // Comprehensive path traversal and injection prevention
        const dangerousPatterns = [
            /\.\.\//g,           // Directory traversal
            /\.\.\\/g,           // Windows directory traversal
            /[<>"'\x00-\x1f\x7f-\x9f]/g,  // HTML injection and control characters
            /javascript:/gi,     // JavaScript protocol
            /data:/gi,           // Data protocol
            /vbscript:/gi,       // VBScript protocol
            /file:/gi,           // File protocol
            /ftp:/gi,            // FTP protocol
            /http:/gi,           // HTTP protocol (external)
            /https:/gi,          // HTTPS protocol (external)
            /\/\/\//g,           // Protocol bypass attempts
            /\\\\/g             // Windows UNC path attempts
        ];
        
        // Check for dangerous patterns
        for (const pattern of dangerousPatterns) {
            if (pattern.test(filePath)) {
                console.warn('Potentially malicious file path detected:', filePath);
                return '/';
            }
        }
        
        // Normalize path to prevent encoded attacks
        let normalizedPath = filePath;
        try {
            // Decode URL components to catch encoded attacks
            normalizedPath = decodeURIComponent(normalizedPath);
            // Remove null bytes and other dangerous characters
            normalizedPath = normalizedPath.replace(/\0/g, '');
            // Normalize multiple slashes
            normalizedPath = normalizedPath.replace(/\/+/g, '/');
        } catch (error) {
            console.warn('Path normalization failed:', error);
            return '/';
        }
        
        // Re-check after normalization
        for (const pattern of dangerousPatterns) {
            if (pattern.test(normalizedPath)) {
                console.warn('Dangerous pattern detected after normalization:', normalizedPath);
                return '/';
            }
        }
        
        // Use router's routes as the single source of truth
        if (window.router && window.router.routes) {
            for (const [cleanPath, actualPath] of Object.entries(window.router.routes)) {
                if (actualPath === normalizedPath) {
                    return '/' + cleanPath;
                }
            }
        }
        
        // Handle relative paths safely
        if (!normalizedPath.startsWith('/')) {
            normalizedPath = '/' + normalizedPath;
        }
        
        // Allow legitimate paths that contain /pages/ but are actual route mappings
        // Check if this is a direct request for a known page
        if (normalizedPath.includes('/pages/')) {
            // If it's a direct HTML file request, try to find a clean URL mapping
            const pageName = normalizedPath.split('/').pop().replace('.html', '');
            
            if (window.router && window.router.routes && window.router.routes[pageName]) {
                return '/' + pageName;
            }
            
            // If no mapping found, it might be a direct file access
            // Log it but don't block it entirely
            console.debug('Unmapped /pages/ path:', filePath);
            return normalizedPath; // Return as-is instead of blocking
        }
        
        // For other unmapped paths, return normalized version
        if (normalizedPath.includes('.html')) {
            // Try to extract a meaningful clean URL from HTML file names
            const htmlFile = normalizedPath.split('/').pop();
            const cleanName = htmlFile.replace('.html', '');
            
            // Only return clean URL if it looks reasonable
            if (cleanName && !cleanName.includes('.') && cleanName.length > 0 && /^[a-zA-Z0-9_-]+$/.test(cleanName)) {
                return '/' + cleanName;
            }
        }
        
        return normalizedPath;
    }

    static updateWindowLocation(cleanPath, params = {}) {
        try {
            // Validate the clean path
            if (typeof cleanPath !== 'string' || !cleanPath.startsWith('/')) {
                throw new Error('Invalid path format');
            }
            
            const url = new URL(cleanPath, window.location.origin);
            
            // Add query parameters with validation
            Object.keys(params).forEach(key => {
                if (params[key] !== null && params[key] !== undefined) {
                    url.searchParams.set(key, String(params[key]));
                }
            });

            window.location.href = url.toString();
        } catch (error) {
            console.error('URL update error:', error);
            // Fallback to simple redirect
            window.location.href = cleanPath;
        }
    }

    static init() {
        // Update links when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.updatePageLinks());
        } else {
            this.updatePageLinks();
        }
    }
}

// Auto-initialize
URLHelper.init();

// Export for use in other scripts
window.URLHelper = URLHelper;
