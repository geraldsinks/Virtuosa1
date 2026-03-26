// LCP Optimization Script for Virtuosa
// This script optimizes Largest Contentful Paint by preloading critical resources

document.addEventListener('DOMContentLoaded', function() {
    // Preload critical images for LCP
    const preloadCriticalImages = () => {
        // Preload the hero ad image if it exists
        const heroAd = document.querySelector('.ad-card');
        if (heroAd && heroAd.style.backgroundImage) {
            const imageUrl = heroAd.style.backgroundImage.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (imageUrl && imageUrl[1] && !imageUrl[1].includes('data:image')) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'image';
                link.href = imageUrl[1];
                document.head.appendChild(link);
            }
        }
    };

    // Optimize image loading with priority hints
    const optimizeImageLoading = () => {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            // Add fetchpriority="high" to above-the-fold images
            const rect = img.getBoundingClientRect();
            if (rect.top < window.innerHeight) {
                img.fetchPriority = 'high';
            }
            
            // Add loading optimization
            if (!img.complete) {
                img.loading = 'eager';
                img.decoding = 'sync';
            }
        });
    };

    // Remove non-critical CSS and JavaScript
    const deferNonCriticalResources = () => {
        // Find and defer non-critical scripts
        const scripts = document.querySelectorAll('script:not([src*="tailwindcss"]):not([src*="font"]):not([src*="lcp"])');
        scripts.forEach(script => {
            if (!script.hasAttribute('data-critical')) {
                script.defer = true;
            }
        });
    };

    // Optimize font loading for LCP
    const optimizeFontLoading = () => {
        if ('fonts' in document) {
            // Load critical fonts immediately
            document.fonts.load('400 1em Montserrat').then(() => {
                document.body.classList.add('font-loaded-400');
            });
            
            document.fonts.load('600 1em Montserrat').then(() => {
                document.body.classList.add('font-loaded-600');
            });
            
            document.fonts.load('700 1em Montserrat').then(() => {
                document.body.classList.add('font-loaded-700');
            });
        }
    };

    // Monitor LCP performance
    const monitorLCP = () => {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                
                if (lastEntry.entryType === 'largest-contentful-paint') {
                    console.log(`LCP: ${lastEntry.startTime}ms`);
                    console.log('LCP Element:', lastEntry.element);
                    
                    // Log performance metrics for debugging
                    if (lastEntry.startTime > 2500) {
                        console.warn('LCP is slow (>2.5s). Consider further optimization.');
                    }
                }
            });
            
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
        }
    };

    // Initialize all optimizations
    preloadCriticalImages();
    optimizeImageLoading();
    deferNonCriticalResources();
    optimizeFontLoading();
    monitorLCP();

    // Add performance monitoring
    const measurePageLoad = () => {
        window.addEventListener('load', () => {
            const navigation = performance.getEntriesByType('navigation')[0];
            const loadTime = navigation.loadEventEnd - navigation.startTime;
            console.log(`Page load time: ${loadTime}ms`);
            
            // Calculate LCP improvement suggestions
            if (loadTime > 3000) {
                console.warn('Page load is slow. Consider optimizing resources.');
            }
        });
    };

    measurePageLoad();

    // Add lazy loading for below-the-fold images
    const setupLazyLoading = () => {
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        if (img.dataset.src) {
                            img.src = img.dataset.src;
                            img.removeAttribute('data-src');
                            imageObserver.unobserve(img);
                        }
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.1
            });

            // Observe images with data-src
            document.querySelectorAll('img[data-src]').forEach(img => {
                imageObserver.observe(img);
            });
        }
    };

    setupLazyLoading();
});

// Critical resource preloading
const preloadCriticalResources = () => {
    // Preload critical CSS
    const criticalCSS = document.createElement('link');
    criticalCSS.rel = 'preload';
    criticalCSS.as = 'style';
    criticalCSS.href = 'css/style.css';
    document.head.appendChild(criticalCSS);

    // Preload critical JavaScript
    const criticalJS = document.createElement('link');
    criticalJS.rel = 'preload';
    criticalJS.as = 'script';
    criticalJS.href = 'js/cls-prevention.js';
    document.head.appendChild(criticalJS);
};

// Execute preloading early
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preloadCriticalResources);
} else {
    preloadCriticalResources();
}
