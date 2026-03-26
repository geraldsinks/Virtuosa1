// CLS Prevention Script for Virtuosa
// This script helps prevent Cumulative Layout Shift by reserving space for dynamic content

document.addEventListener('DOMContentLoaded', function() {
    // Reserve space for images before they load
    const reserveImageSpace = () => {
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            if (img.width && img.height) {
                img.style.aspectRatio = `${img.width} / ${img.height}`;
                img.style.backgroundColor = '#f3f4f6';
            }
        });
    };

    // Prevent layout shift for dynamic content areas
    const reserveDynamicSpace = () => {
        // Ad slider
        const adSlider = document.getElementById('ad-slider');
        if (adSlider) {
            adSlider.style.minHeight = '320px';
            adSlider.style.aspectRatio = '16/9';
        }

        // Category grid
        const categoryGrid = document.getElementById('category-grid');
        if (categoryGrid) {
            categoryGrid.style.minHeight = '400px';
        }

        // Product cards
        const productCards = document.querySelectorAll('.product-card');
        productCards.forEach(card => {
            card.style.contain = 'layout style paint';
        });
    };

    // Initialize font loading with fallback
    const optimizeFontLoading = () => {
        if ('fonts' in document) {
            document.fonts.ready.then(() => {
                document.body.classList.add('fonts-loaded');
            });
        }
    };

    // Prevent shift from dynamically loaded content
    const preventContentShift = () => {
        // Observe images loading
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.complete) {
                img.addEventListener('load', function() {
                    this.style.backgroundColor = 'transparent';
                });
                
                img.addEventListener('error', function() {
                    this.style.backgroundColor = '#f3f4f6';
                    this.src = 'https://placehold.co/300x200?text=Error';
                });
            }
        });
    };

    // Initialize all CLS prevention measures
    reserveImageSpace();
    reserveDynamicSpace();
    optimizeFontLoading();
    preventContentShift();

    // Add CSS for font loading transition
    const style = document.createElement('style');
    style.textContent = `
        .fonts-loaded body {
            font-family: 'Montserrat', system-ui, -apple-system, sans-serif;
        }
        
        img {
            background-color: #f3f4f6;
            transition: background-color 0.3s ease;
        }
        
        .skeleton-card {
            contain: layout style paint;
        }
        
        #ad-slider {
            contain: layout style paint;
        }
        
        .product-card {
            contain: layout style paint;
        }
    `;
    document.head.appendChild(style);
});

// Intersection Observer for lazy loading with CLS prevention
const observeImages = () => {
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
        threshold: 0.01
    });

    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
};

// Initialize image observation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', observeImages);
} else {
    observeImages();
}
