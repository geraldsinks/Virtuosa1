/**
 * Simple, Fast Ad Slider for Virtuosa
 * Focuses on performance over complex optimizations
 */

class SimpleAdSlider {
    constructor() {
        this.currentIndex = 0;
        this.autoSlideInterval = null;
        this.totalCards = 0;
        this.slider = null;
        this.cards = [];
    }

    /**
     * Initialize the ad slider - simple and fast
     */
    initialize() {
        this.slider = document.getElementById('ad-slider');
        if (!this.slider) {
            console.warn('Ad slider element not found');
            return;
        }

        // Get all cards
        this.cards = Array.from(this.slider.querySelectorAll('.ad-card'));
        this.totalCards = this.cards.length;

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
     * Update slider position - simple and fast
     */
    updateSlider() {
        if (!this.slider || this.totalCards === 0) return;

        // Simple transform for best performance
        this.slider.style.transform = `translateX(-${this.currentIndex * 100}%)`;
        this.slider.style.transition = 'transform 0.4s ease-out';
    }

    /**
     * Move to next card
     */
    nextCard() {
        if (this.totalCards === 0) return;

        if (this.currentIndex >= this.totalCards - 1) {
            // Loop back to first card
            this.currentIndex = 0;
        } else {
            this.currentIndex++;
        }
        
        this.updateSlider();
        this.restartAutoSlide();
    }

    /**
     * Move to previous card
     */
    prevCard() {
        if (this.totalCards === 0) return;

        if (this.currentIndex === 0) {
            // Loop to last card
            this.currentIndex = this.totalCards - 1;
        } else {
            this.currentIndex--;
        }
        
        this.updateSlider();
        this.restartAutoSlide();
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
    }

    /**
     * Restart auto-slide after manual interaction
     */
    restartAutoSlide() {
        this.stopAutoSlide();
        setTimeout(() => {
            this.startAutoSlide();
        }, 2000); // 2 second delay
    }

    /**
     * Set up event listeners - simple and efficient
     */
    setupEventListeners() {
        const sliderElement = document.getElementById('ad-slider');
        if (!sliderElement) return;

        // Mouse events
        sliderElement.addEventListener('mouseenter', () => {
            this.stopAutoSlide();
        });

        sliderElement.addEventListener('mouseleave', () => {
            this.startAutoSlide();
        });

        // Navigation buttons
        const nextButton = document.getElementById('ad-slider-next');
        const prevButton = document.getElementById('ad-slider-prev');
        
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

        // Touch events for mobile - simple implementation
        let touchStartX = 0;
        
        sliderElement.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        });

        sliderElement.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const diff = touchStartX - touchEndX;
            
            if (Math.abs(diff) > 50) { // Minimum swipe distance
                if (diff > 0) {
                    this.nextCard();
                } else {
                    this.prevCard();
                }
            }
        });
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
