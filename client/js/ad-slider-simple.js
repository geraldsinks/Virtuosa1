/**
 * Simple, Fast Ad Slider for Virtuosa
 * Focuses on performance over complex optimizations
 */

class SimpleAdSlider {
    constructor() {
        this.currentIndex = 0;
        this.autoSlideInterval = null;
        this.progressInterval = null;
        this.totalCards = 0;
        this.slider = null;
        this.cardsWrapper = null;
        this.cards = [];
        this.isTransitioning = false;
        this.touchStartX = 0;
        this.touchEndX = 0;
    }

    /**
     * Retry card detection for dynamically loaded content
     */
    retryCardDetection(cardsWrapper) {
        console.log('DEBUG: Retrying card detection...');
        
        // Try multiple detection methods
        this.cards = Array.from(cardsWrapper.querySelectorAll('.ad-card')) ||
                    Array.from(cardsWrapper.children).filter(child => 
                        child.classList.contains('ad-card')
                    ) ||
                    Array.from(cardsWrapper.querySelectorAll('[class*="ad"]')) ||
                    [];
        
        this.totalCards = this.cards.length;
        console.log('DEBUG: Retry card count:', this.totalCards);
        
        if (this.totalCards === 0) {
            console.warn('No ad cards found at all');
            return;
        }

        // Simple setup - no complex optimizations
        this.setupEventListeners();
        this.startAutoSlide();

        console.log(`Simple ad slider initialized with ${this.totalCards} cards (after retry)`);
    }

    /**
     * Initialize the ad slider following original proven patterns
     */
    initialize() {
        // Target ad-cards-wrapper directly (like original)
        this.cardsWrapper = document.getElementById('ad-cards-wrapper');
        if (!this.cardsWrapper) {
            console.warn('Ad cards wrapper not found');
            return;
        }

        console.log('DEBUG: Ad cards wrapper found:', this.cardsWrapper);

        // Use proven querySelectorAll approach (like original)
        this.cards = Array.from(this.cardsWrapper.querySelectorAll('.ad-card'));
        this.totalCards = this.cards.length;

        console.log('DEBUG: Found ad cards:', this.totalCards);

        if (this.totalCards === 0) {
            console.warn('No ad cards found');
            return;
        }

        // Simple setup - no complex optimizations
        this.setupEventListeners();
        this.startAutoSlide();

        console.log(`Simple ad slider initialized with ${this.totalCards} cards`);
    }

    /**
     * Update slider position with production-grade transition management
     */
    updateSlider() {
        if (!this.cardsWrapper || this.totalCards === 0 || this.isTransitioning) return;

        this.isTransitioning = true;

        // Transform the cards wrapper directly (like original)
        this.cardsWrapper.style.transform = `translateX(-${this.currentIndex * 100}%)`;
        this.cardsWrapper.style.transition = 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)';

        // Update dots and restart progress
        this.updateDots();
        this.startProgressBar();

        // Reset transition flag after animation completes
        setTimeout(() => {
            this.isTransitioning = false;
        }, 700);
    }

    /**
     * Update dots indicator with active state
     */
    updateDots() {
        const dotsContainer = document.getElementById('slider-dots');
        if (!dotsContainer) return;

        const dots = dotsContainer.querySelectorAll('button');
        dots.forEach((dot, index) => {
            if (index === this.currentIndex) {
                dot.className = 'w-3 h-3 rounded-full bg-gold scale-125 shadow-lg transition-all duration-300';
            } else {
                dot.className = 'w-3 h-3 rounded-full bg-gray-300 hover:bg-gray-400 transition-all duration-300';
            }
        });
    }

    /**
     * Start progress bar animation
     */
    startProgressBar() {
        const progressBar = document.getElementById('slider-progress');
        if (!progressBar) return;

        const progressFill = progressBar.querySelector('div');
        if (!progressFill) return;

        let progress = 0;
        const duration = 4000; // 4 seconds (match our auto-slide)
        const increment = 100 / (duration / 50); // Update every 50ms

        clearInterval(this.progressInterval);
        progressFill.style.width = '0%';

        this.progressInterval = setInterval(() => {
            progress += increment;
            if (progress >= 100) {
                progress = 100;
                clearInterval(this.progressInterval);
            }
            progressFill.style.width = progress + '%';
        }, 50);
    }

    /**
     * Move to next card with seamless looping
     */
    nextCard() {
        if (this.totalCards === 0 || this.isTransitioning) return;

        if (this.currentIndex >= this.totalCards - 1) {
            // Seamless loop back to first card
            this.cardsWrapper.style.transition = 'none';
            this.currentIndex = 0;
            this.updateSlider();

            // Re-enable transition after brief delay
            setTimeout(() => {
                this.cardsWrapper.style.transition = 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 50);
        } else {
            this.currentIndex++;
            this.updateSlider();
        }
        
        this.restartAutoSlide();
    }

    /**
     * Move to previous card with seamless looping
     */
    prevCard() {
        if (this.totalCards === 0 || this.isTransitioning) return;

        if (this.currentIndex === 0) {
            // Seamless loop to last card
            this.cardsWrapper.style.transition = 'none';
            this.currentIndex = this.totalCards - 1;
            this.updateSlider();

            // Re-enable transition after brief delay
            setTimeout(() => {
                this.cardsWrapper.style.transition = 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 50);
        } else {
            this.currentIndex--;
            this.updateSlider();
        }
        
        this.restartAutoSlide();
    }

    /**
     * Go to specific slide
     */
    goToSlide(index) {
        if (this.isTransitioning || index === this.currentIndex || index < 0 || index >= this.totalCards) return;

        this.currentIndex = index;
        this.updateSlider();
        this.restartAutoSlide();
    }

    /**
     * Restart auto-slide with delay
     */
    restartAutoSlide() {
        this.stopAutoSlide();
        setTimeout(() => {
            this.startAutoSlide();
        }, 2000); // 2 second delay after manual interaction
    }

    /**
     * Start automatic sliding
     */
    startAutoSlide() {
        // Clear existing interval
        this.stopAutoSlide();
        
        // Start new interval - 4 seconds for better UX
        this.autoSlideInterval = setInterval(() => {
            this.nextCard();
        }, 4000);
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
     * Set up event listeners with production-grade features
     */
    setupEventListeners() {
        const sliderElement = document.getElementById('ad-slider');
        if (!sliderElement) return;

        // Navigation buttons
        const nextButton = document.getElementById('next-ad');
        const prevButton = document.getElementById('prev-ad');
        
        if (nextButton) {
            nextButton.addEventListener('click', () => {
                this.nextCard();
            });
        }
        
        if (prevButton) {
            prevButton.addEventListener('click', () => {
                this.prevCard();
            });
        }

        // Touch/swipe support for mobile
        sliderElement.addEventListener('touchstart', (e) => {
            this.touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        sliderElement.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                this.prevCard();
            } else if (e.key === 'ArrowRight') {
                this.nextCard();
            }
        });

        // Pause on hover
        sliderElement.addEventListener('mouseenter', () => {
            this.stopAutoSlide();
        });

        sliderElement.addEventListener('mouseleave', () => {
            this.startAutoSlide();
        });

        // Create dots indicator
        this.createDots();
    }

    /**
     * Handle swipe gestures for mobile
     */
    handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = this.touchStartX - this.touchEndX;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                this.nextCard(); // Swipe left, go next
            } else {
                this.prevCard(); // Swipe right, go previous
            }
        }
    }

    /**
     * Create interactive dots indicator
     */
    createDots() {
        const dotsContainer = document.getElementById('slider-dots');
        if (!dotsContainer) return;

        dotsContainer.innerHTML = '';
        for (let i = 0; i < this.totalCards; i++) {
            const dot = document.createElement('button');
            dot.className = `w-3 h-3 rounded-full transition-all duration-300 ${
                i === this.currentIndex
                    ? 'bg-gold scale-125 shadow-lg'
                    : 'bg-gray-300 hover:bg-gray-400'
            }`;
            dot.addEventListener('click', () => this.goToSlide(i));
            dotsContainer.appendChild(dot);
        }
    }

    /**
     * Cleanup method
     */
    destroy() {
        this.stopAutoSlide();
        this.cards = [];
        this.slider = null;
    }
}

// Simple initialization
let simpleAdSliderInstance = null;

function initializeSimpleAdSlider() {
    // Clean up existing instance
    if (simpleAdSliderInstance) {
        simpleAdSliderInstance.destroy();
    }
    
    // Create new instance
    simpleAdSliderInstance = new SimpleAdSlider();
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            simpleAdSliderInstance.initialize();
        });
    } else {
        // Initialize immediately
        simpleAdSliderInstance.initialize();
    }
}

// Make available globally
window.initializeSimpleAdSlider = initializeSimpleAdSlider;
window.SimpleAdSlider = SimpleAdSlider;

// Auto-initialize
initializeSimpleAdSlider();
