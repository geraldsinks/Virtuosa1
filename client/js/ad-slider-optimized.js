/**
 * Optimized Ad Slider for Virtuosa
 * Fixes smooth sliding and slow image loading issues
 */

class OptimizedAdSlider {
    constructor() {
        this.currentIndex = 0;
        this.autoSlideInterval = null;
        this.progressInterval = null;
        this.totalCards = 0;
        this.slider = null;
        this.cards = [];
        this.loadedImages = new Set();
        
        // Preload critical images
        this.preloadImages();
    }

    /**
     * Preload images for smooth sliding
     */
    preloadImages() {
        const imageUrls = [
            'https://placehold.co/1200x600/0A1128/FFFFFF?text=Virtuosa+Campus+Life',
            'https://placehold.co/1200x600/0A1128/FFFFFF?text=Student+Marketplace',
            'https://placehold.co/1200x600/0A1128/FFFFFF?text=Buy+and+Sell',
            'https://placehold.co/1200x600/0A1128/FFFFFF?text=Campus+Deals'
        ];

        imageUrls.forEach(url => {
            const img = new Image();
            img.onload = () => this.loadedImages.add(url);
            img.src = url;
        });
    }

    /**
     * Initialize the ad slider with performance optimizations
     */
    initialize() {
        this.slider = document.getElementById('ad-slider');
        if (!this.slider) {
            console.warn('Ad slider element not found');
            return;
        }

        // Get all cards with performance optimization
        this.cards = Array.from(this.slider.querySelectorAll('.ad-card'));
        this.totalCards = this.cards.length;

        if (this.totalCards === 0) {
            console.warn('No ad cards found');
            return;
        }

        // Optimize images
        this.optimizeImages();

        // Set up event listeners
        this.setupEventListeners();

        // Start auto-slide with optimized timing
        this.startAutoSlide();

        console.log(`Optimized ad slider initialized with ${this.totalCards} cards`);
    }

    /**
     * Optimize images for faster loading
     */
    optimizeImages() {
        this.cards.forEach((card, index) => {
            const img = card.querySelector('img');
            if (img) {
                // Add loading="lazy" for below-the-fold images
                if (index > 0) {
                    img.loading = 'lazy';
                }
                
                // Add error handling
                img.onerror = () => {
                    img.style.display = 'none';
                    const placeholder = card.querySelector('.ad-card-placeholder');
                    if (placeholder) {
                        placeholder.style.display = 'flex';
                    }
                };

                // Add load animation
                img.onload = () => {
                    img.style.opacity = '0';
                    setTimeout(() => {
                        img.style.transition = 'opacity 0.3s ease';
                        img.style.opacity = '1';
                    }, 50);
                };
            }
        });
    }

    /**
     * Update slider position with smooth transitions
     */
    updateSlider() {
        if (!this.slider || this.totalCards === 0) return;

        // Use transform3d for better performance
        this.slider.style.transform = `translate3d(-${this.currentIndex * 100}%, 0, 0)`;
        this.slider.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
        
        // Update active card indicators
        this.updateIndicators();
    }

    /**
     * Update slide indicators
     */
    updateIndicators() {
        const indicators = document.querySelectorAll('.ad-slider-indicator');
        indicators.forEach((indicator, index) => {
            if (index === this.currentIndex) {
                indicator.classList.add('active');
                indicator.style.backgroundColor = '#FFD700';
            } else {
                indicator.classList.remove('active');
                indicator.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
            }
        });
    }

    /**
     * Move to the next card with smooth animation
     */
    nextCard() {
        if (this.totalCards === 0) return;

        if (this.currentIndex >= this.totalCards - 1) {
            // Instant jump to first card for seamless loop
            this.slider.style.transition = 'none';
            this.currentIndex = 0;
            this.updateSlider();
            
            // Re-enable transition after a brief moment
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.slider.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                });
            });
        } else {
            this.currentIndex++;
            this.updateSlider();
        }
        
        // Restart the timer after a manual click
        this.restartAutoSlide();
    }

    /**
     * Move to the previous card with smooth animation
     */
    prevCard() {
        if (this.totalCards === 0) return;

        if (this.currentIndex === 0) {
            // Instant jump to last card for seamless loop
            this.slider.style.transition = 'none';
            this.currentIndex = this.totalCards - 1;
            this.updateSlider();
            
            // Re-enable transition after a brief moment
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.slider.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                });
            });
        } else {
            this.currentIndex--;
            this.updateSlider();
        }
        
        // Restart the timer after a manual click
        this.restartAutoSlide();
    }

    /**
     * Start automatic sliding with optimized timing
     */
    startAutoSlide() {
        // Clear any existing intervals
        this.stopAutoSlide();
        
        // Start auto-slide with longer interval for better UX
        this.autoSlideInterval = setInterval(() => {
            this.nextCard();
        }, 5000); // 5 seconds instead of 3
        
        // Start progress bar if it exists
        this.startProgressBar();
    }

    /**
     * Stop automatic sliding
     */
    stopAutoSlide() {
        if (this.autoSlideInterval) {
            clearInterval(this.autoSlideInterval);
            this.autoSlideInterval = null;
        }
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    /**
     * Restart auto-slide with delay
     */
    restartAutoSlide() {
        this.stopAutoSlide();
        setTimeout(() => {
            this.startAutoSlide();
        }, 1000); // 1 second delay after manual interaction
    }

    /**
     * Start progress bar animation
     */
    startProgressBar() {
        const progressBar = document.querySelector('.ad-slider-progress');
        if (!progressBar) return;

        // Reset progress bar
        progressBar.style.width = '0%';
        progressBar.style.transition = 'none';
        
        // Start progress animation
        requestAnimationFrame(() => {
            progressBar.style.transition = 'width 5s linear';
            progressBar.style.width = '100%';
        });
    }

    /**
     * Set up event listeners with performance optimization
     */
    setupEventListeners() {
        const sliderElement = document.getElementById('ad-slider');
        if (sliderElement) {
            // Use passive listeners for better scroll performance
            sliderElement.addEventListener('mouseenter', () => {
                this.stopAutoSlide();
            }, { passive: true });

            sliderElement.addEventListener('mouseleave', () => {
                this.startAutoSlide();
            }, { passive: true });
        }

        // Navigation buttons with throttling
        const nextButton = document.getElementById('ad-slider-next');
        const prevButton = document.getElementById('ad-slider-prev');
        
        if (nextButton) {
            nextButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.nextCard();
            }, { passive: true });
        }
        
        if (prevButton) {
            prevButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.prevCard();
            }, { passive: true });
        }

        // Touch events for mobile
        this.setupTouchEvents();
    }

    /**
     * Set up touch events for mobile swiping
     */
    setupTouchEvents() {
        let startX = 0;
        let endX = 0;
        
        const sliderElement = document.getElementById('ad-slider');
        if (!sliderElement) return;

        sliderElement.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });

        sliderElement.addEventListener('touchend', (e) => {
            endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            
            if (Math.abs(diff) > 50) { // Minimum swipe distance
                if (diff > 0) {
                    this.nextCard();
                } else {
                    this.prevCard();
                }
            }
        }, { passive: true });
    }

    /**
     * Cleanup method to prevent memory leaks
     */
    destroy() {
        this.stopAutoSlide();
        this.loadedImages.clear();
        this.cards = [];
        this.slider = null;
    }
}

// Auto-initialize with performance monitoring
let adSliderInstance = null;

function initializeOptimizedAdSlider() {
    // Clean up existing instance
    if (adSliderInstance) {
        adSliderInstance.destroy();
    }
    
    // Create new instance
    adSliderInstance = new OptimizedAdSlider();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            adSliderInstance.initialize();
        });
    } else {
        // Use requestAnimationFrame for smooth initialization
        requestAnimationFrame(() => {
            adSliderInstance.initialize();
        });
    }
}

// Make available globally
window.initializeOptimizedAdSlider = initializeOptimizedAdSlider;
window.OptimizedAdSlider = OptimizedAdSlider;

// Auto-initialize
initializeOptimizedAdSlider();
