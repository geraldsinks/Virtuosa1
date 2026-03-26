// Instant LCP Optimization - Execute immediately
// This script runs as soon as possible to optimize LCP

// Remove render-blocking resources immediately
(function() {
    'use strict';
    
    // Set font loading to swap immediately
    if (document.body) {
        document.body.style.fontFamily = 'Montserrat, system-ui, -apple-system, sans-serif';
        document.body.style.fontDisplay = 'swap';
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            document.body.style.fontFamily = 'Montserrat, system-ui, -apple-system, sans-serif';
            document.body.style.fontDisplay = 'swap';
        });
    }
    
    // Preload critical resources
    const preloadCritical = function() {
        const criticalResources = [
            { href: 'https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Ew-.woff2', as: 'font', type: 'font/woff2', crossorigin: true },
            { href: 'https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM73w-.woff2', as: 'font', type: 'font/woff2', crossorigin: true }
        ];
        
        criticalResources.forEach(resource => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.href = resource.href;
            link.as = resource.as;
            if (resource.type) link.type = resource.type;
            if (resource.crossorigin) link.crossOrigin = resource.crossorigin;
            document.head.appendChild(link);
        });
    };
    
    // Optimize LCP element immediately
    const optimizeLCPElement = function() {
        const heroSection = document.querySelector('.relative.w-full.h-80');
        if (heroSection) {
            // Ensure the hero section is visible immediately
            heroSection.style.visibility = 'visible';
            heroSection.style.opacity = '1';
            
            // Add loading optimization
            heroSection.classList.add('lcp-optimized');
        }
    };
    
    // Initialize optimizations immediately
    preloadCritical();
    optimizeLCPElement();
    
    // Run again when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            optimizeLCPElement();
        });
    }
    
    // Monitor LCP performance
    const monitorLCP = function() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                
                if (lastEntry.entryType === 'largest-contentful-paint') {
                    const lcpTime = Math.round(lastEntry.startTime);
                    console.log(`🚀 LCP: ${lcpTime}ms - ${lcpTime < 2500 ? '✅ Good' : lcpTime < 4000 ? '⚠️ Needs Improvement' : '❌ Poor'}`);
                    
                    // Log the LCP element
                    if (lastEntry.element) {
                        console.log('📱 LCP Element:', lastEntry.element);
                    }
                    
                    // Performance suggestions
                    if (lcpTime > 2500) {
                        console.warn('💡 LCP Optimization Suggestions:');
                        if (lcpTime > 4000) {
                            console.log('  - Consider reducing image sizes');
                            console.log('  - Optimize server response time');
                            console.log('  - Use CDNs for static assets');
                        } else {
                            console.log('  - Preload critical resources');
                            console.log('  - Optimize font loading');
                        }
                    }
                }
            });
            
            observer.observe({ entryTypes: ['largest-contentful-paint'] });
        }
    };
    
    // Start monitoring
    monitorLCP();
    
})();
