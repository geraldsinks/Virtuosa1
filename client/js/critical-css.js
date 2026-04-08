/**
 * Critical CSS Inlining Utility
 * Provides critical CSS extraction and inlining for performance optimization
 */

// Guard against re-declaration
if (typeof window.CriticalCSSManager === 'undefined') {

class CriticalCSSManager {
    constructor() {
        this.criticalCSS = this.generateCriticalCSS();
        this.isInjected = false;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.retryDelay = 100; // Base delay in ms
    }

    /**
     * Generate critical CSS for above-the-fold content
     * @returns {string} Critical CSS
     */
    generateCriticalCSS() {
        return `
            /* Critical CSS for Virtuosa - Above the Fold */
            
            /* Base Styles */
            * {
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Montserrat', sans-serif;
                margin: 0;
                padding: 0;
                background-color: #f8fafc;
                color: #1a202c;
                line-height: 1.6;
            }
            
            /* Header Styles - Critical for First Paint */
            .bg-navy {
                background-color: #0A1128 !important;
            }
            
            .text-white {
                color: #ffffff !important;
            }
            
            .text-gold {
                color: #FFD700 !important;
            }
            
            .sticky {
                position: sticky;
                top: 0;
                z-index: 50;
            }
            
            .shadow-lg {
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
            }
            
            /* Navigation Container */
            .v-container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 1rem;
            }
            
            /* Mobile Header */
            .mobile-header-row-1 {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0.75rem 0;
            }
            
            .mobile-logo {
                font-size: 1.5rem;
                font-weight: 700;
                text-decoration: none;
            }
            
            .v-touch {
                -webkit-tap-highlight-color: transparent;
                touch-action: manipulation;
            }
            
            /* Search Input */
            .mobile-search-input {
                width: 100%;
                padding: 0.75rem 3rem 0.75rem 1rem;
                border-radius: 0.75rem;
                border: 1px solid transparent;
                background-color: #374151;
                color: #e5e7eb;
                font-size: 0.875rem;
                outline: none;
                transition: all 0.2s;
            }
            
            .mobile-search-input:focus {
                ring: 2px;
                ring-color: #FFD700;
            }
            
            .mobile-search-input::placeholder {
                color: #9ca3af;
            }
            
            /* Desktop Header */
            .v-header-row {
                display: none;
            }
            
            @media (min-width: 768px) {
                .v-header-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 0;
                }
                
                .mobile-header-row-1 {
                    display: none;
                }
                
                .mobile-header-row-2 {
                    display: none;
                }
            }
            
            .v-header-logo a {
                font-size: 1.5rem;
                font-weight: 700;
                color: #FFD700;
                text-decoration: none;
            }
            
            .v-header-search {
                flex: 1;
                max-width: 500px;
                margin: 0 2rem;
            }
            
            .v-header-search input {
                width: 100%;
                padding: 0.5rem 2.5rem 0.5rem 1rem;
                border-radius: 9999px;
                border: 1px solid transparent;
                background-color: #374151;
                color: #e5e7eb;
                font-size: 0.875rem;
                outline: none;
            }
            
            .v-header-search input:focus {
                ring: 2px;
                ring-color: #FFD700;
            }
            
            /* Header Actions */
            .v-header-actions {
                display: flex;
                align-items: center;
                gap: 1rem;
            }
            
            /* Loading States */
            .animate-spin {
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                from {
                    transform: rotate(0deg);
                }
                to {
                    transform: rotate(360deg);
                }
            }
            
            /* Utility Classes */
            .hidden {
                display: none !important;
            }
            
            .flex {
                display: flex;
            }
            
            .items-center {
                align-items: center;
            }
            
            .justify-center {
                justify-content: center;
            }
            
            .space-x-2 > * + * {
                margin-left: 0.5rem;
            }
            
            .space-x-3 > * + * {
                margin-left: 0.75rem;
            }
            
            .relative {
                position: relative;
            }
            
            .absolute {
                position: absolute;
            }
            
            .text-center {
                text-align: center;
            }
            
            .py-3 {
                padding-top: 0.75rem;
                padding-bottom: 0.75rem;
            }
            
            .py-8 {
                padding-top: 2rem;
                padding-bottom: 2rem;
            }
            
            .px-4 {
                padding-left: 1rem;
                padding-right: 1rem;
            }
            
            .mb-4 {
                margin-bottom: 1rem;
            }
            
            .mb-6 {
                margin-bottom: 1.5rem;
            }
            
            .mt-2 {
                margin-top: 0.5rem;
            }
            
            .w-6 {
                width: 1.5rem;
            }
            
            .h-6 {
                height: 1.5rem;
            }
            
            .w-8 {
                width: 2rem;
            }
            
            .h-8 {
                height: 2rem;
            }
            
            .w-12 {
                width: 3rem;
            }
            
            .h-12 {
                height: 3rem;
            }
            
            .w-16 {
                width: 4rem;
            }
            
            .h-16 {
                height: 4rem;
            }
            
            /* Font Sizes */
            .text-sm {
                font-size: 0.875rem;
            }
            
            .text-lg {
                font-size: 1.125rem;
            }
            
            .text-xl {
                font-size: 1.25rem;
            }
            
            .text-2xl {
                font-size: 1.5rem;
            }
            
            .text-3xl {
                font-size: 1.875rem;
            }
            
            /* Font Weights */
            .font-bold {
                font-weight: 700;
            }
            
            .font-semibold {
                font-weight: 600;
            }
            
            .font-medium {
                font-weight: 500;
            }
            
            /* Transitions */
            .transition-colors {
                transition-property: color, background-color, border-color;
                transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                transition-duration: 150ms;
            }
            
            /* Hover States */
            .hover\\:text-gold:hover {
                color: #FFD700 !important;
            }
            
            .hover\\:bg-gray-800:hover {
                background-color: #1f2937 !important;
            }
            
            /* Container */
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 1rem;
            }
            
            /* Main Content Area */
            main {
                flex: 1;
            }
            
            .flex-grow {
                flex-grow: 1;
            }
            
            /* Background Colors */
            .bg-gray-50 {
                background-color: #f9fafb !important;
            }
            
            .bg-gray-100 {
                background-color: #f3f4f6 !important;
            }
            
            .bg-white {
                background-color: #ffffff !important;
            }
            
            /* Text Colors */
            .text-gray-400 {
                color: #9ca3af !important;
            }
            
            .text-gray-500 {
                color: #6b7280 !important;
            }
            
            .text-gray-600 {
                color: #4b5563 !important;
            }
            
            .text-navy {
                color: #0A1128 !important;
            }
            
            /* Badges */
            .badge {
                position: absolute;
                top: -0.25rem;
                right: -0.25rem;
                background-color: #ef4444;
                color: #ffffff;
                border-radius: 9999px;
                padding: 0.125rem 0.375rem;
                font-size: 0.75rem;
                font-weight: 700;
                line-height: 1;
                min-width: 1.25rem;
                text-align: center;
            }
            
            /* Skeleton Loading */
            @keyframes loading {
                0% {
                    background-position: 200% 0;
                }
                100% {
                    background-position: -200% 0;
                }
            }
            
            .skeleton {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: loading 1.5s infinite;
            }
            
            /* Responsive */
            @media (max-width: 767px) {
                .desktop-only {
                    display: none !important;
                }
            }
            
            @media (min-width: 768px) {
                .mobile-only {
                    display: none !important;
                }
            }
            
            /* Performance Optimizations */
            img {
                max-width: 100%;
                height: auto;
            }
            
            /* Prevent layout shift */
            .aspect-square {
                aspect-ratio: 1 / 1;
            }
            
            .aspect-video {
                aspect-ratio: 16 / 9;
            }
        `;
    }

    /**
     * Inject critical CSS into the head with proper error handling and retry logic
     */
    async injectCriticalCSS() {
        // Prevent multiple concurrent injections
        if (this.isInjected) {
            return true;
        }

        try {
            const style = document.createElement('style');
            style.textContent = this.criticalCSS;
            style.setAttribute('data-critical-css', 'true');
            
            // Insert as early as possible
            const head = document.head;
            const firstChild = head.firstChild;
            
            if (firstChild) {
                head.insertBefore(style, firstChild);
            } else {
                head.appendChild(style);
            }
            
            // Mark as injected only after successful insertion
            this.isInjected = true;
            this.retryCount = 0;
            console.log('Critical CSS injected successfully');
            return true;
            
        } catch (error) {
            console.error('Failed to inject critical CSS:', error);
            this.isInjected = false; // Ensure flag is reset on failure
            
            // Retry logic with exponential backoff
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                const delay = this.retryDelay * Math.pow(2, this.retryCount - 1);
                console.log(`Retrying CSS injection in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
                
                return new Promise(resolve => {
                    setTimeout(() => {
                        resolve(this.injectCriticalCSS());
                    }, delay);
                });
            } else {
                console.error('Max retries exceeded for CSS injection');
                return false;
            }
        }
    }

    /**
     * Remove non-critical CSS from head to speed up rendering
     */
    preloadNonCriticalCSS() {
        const links = document.querySelectorAll('link[rel="stylesheet"]');
        
        links.forEach(link => {
            if (!link.getAttribute('data-critical-css') && 
                !link.href.includes('critical') &&
                !link.href.includes('font-awesome')) {
                
                // Convert to preload
                link.rel = 'preload';
                link.as = 'style';
                link.onload = function() {
                    this.rel = 'stylesheet';
                };
                
                console.log('Preloading non-critical CSS:', link.href);
            }
        });
    }

    /**
     * Initialize critical CSS optimization
     */
    async init() {
        // Inject critical CSS immediately
        const injectionSuccess = await this.injectCriticalCSS();
        
        if (injectionSuccess) {
            // Preload non-critical CSS after critical CSS is injected
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.preloadNonCriticalCSS();
                });
            } else {
                this.preloadNonCriticalCSS();
            }
        }
    }

    /**
     * Get critical CSS for manual injection
     * @returns {string} Critical CSS
     */
    getCriticalCSS() {
        return this.criticalCSS;
    }

    /**
     * Generate critical CSS for specific page
     * @param {string} pageType - Type of page (home, product, dashboard, etc.)
     * @returns {string} Page-specific critical CSS
     */
    generatePageSpecificCSS(pageType) {
        const baseCSS = this.criticalCSS;
        
        switch (pageType) {
            case 'home':
                return baseCSS + `
                    /* Home Page Specific Critical CSS */
                    .hero-section {
                        min-height: 60vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    
                    .hero-title {
                        font-size: 3rem;
                        font-weight: 700;
                        margin-bottom: 1rem;
                    }
                    
                    @media (max-width: 767px) {
                        .hero-title {
                            font-size: 2rem;
                        }
                    }
                `;
                
            case 'product':
                return baseCSS + `
                    /* Product Page Specific Critical CSS */
                    .product-image-container {
                        aspect-ratio: 1 / 1;
                        overflow: hidden;
                        border-radius: 1rem;
                    }
                    
                    .product-image {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                `;
                
            case 'dashboard':
                return baseCSS + `
                    /* Dashboard Specific Critical CSS */
                    .stat-card {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 0.75rem;
                        padding: 1.5rem;
                        color: white;
                        transition: transform 0.3s ease;
                    }
                    
                    .stat-card:hover {
                        transform: translateY(-4px);
                    }
                `;
                
            default:
                return baseCSS;
        }
    }
}

// Auto-initialize
const criticalCSSManager = new CriticalCSSManager();

// Initialize immediately (before DOM content loaded)
criticalCSSManager.init().catch(error => {
    console.error('Critical CSS initialization failed:', error);
});

// Make available globally
window.CriticalCSSManager = CriticalCSSManager;
window.criticalCSSManager = criticalCSSManager;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CriticalCSSManager,
        criticalCSSManager
    };
}

} // end guard: if (typeof window.CriticalCSSManager === 'undefined')
