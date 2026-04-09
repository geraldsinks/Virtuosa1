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

        // Use direct children instead of querySelectorAll
        this.cards = Array.from(this.cardsWrapper.children).filter(child => 
            child.classList && child.classList.contains('ad-card')
        );
        
        // Final fallback: use all direct children if still no cards
        if (this.cards.length === 0) {
            this.cards = Array.from(this.cardsWrapper.children);
        }
        
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

    updateSlider(snap = false) {
        if (!this.cardsWrapper || this.totalCards === 0 || this.isTransitioning) return;

        this.isTransitioning = !snap;

        if (snap) {
            this.cardsWrapper.style.transition = 'none';
        } else {
            this.cardsWrapper.style.transition = 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
        }

        // Transform the cards wrapper directly
        this.cardsWrapper.style.transform = `translateX(-${this.currentIndex * 100}%)`;

        // Update dots
        this.updateDots();

        if (!snap) {
            // Reset transition flag after animation completes
            setTimeout(() => {
                this.isTransitioning = false;
            }, 700);
        } else {
            // Restore transition class immediately after snap rendering
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this.cardsWrapper.style.transition = 'transform 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
                });
            });
        }
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
                dot.className = 'slider-dot active';
                dot.setAttribute('aria-current', 'true');
            } else {
                dot.className = 'slider-dot';
                dot.setAttribute('aria-current', 'false');
            }
        });
    }

    // Progress bar removed in redesigned slider

    /**
     * Move to next card with seamless looping
     */
    nextCard() {
        if (this.totalCards === 0 || this.isTransitioning) return;

        if (this.currentIndex >= this.totalCards - 1) {
            // Snap back to 0 instantly
            this.currentIndex = 0;
            this.updateSlider(true);
        } else {
            this.currentIndex++;
            this.updateSlider();
        }
        
        this.restartAutoSlide();
    }

    prevCard() {
        if (this.totalCards === 0 || this.isTransitioning) return;

        if (this.currentIndex === 0) {
            // Snap to last card instantly
            this.currentIndex = this.totalCards - 1;
            this.updateSlider(true);
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
            dot.className = i === this.currentIndex ? 'slider-dot active' : 'slider-dot';
            dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
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
