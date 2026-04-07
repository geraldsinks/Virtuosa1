// Enhanced Ad Slider with modern features and optimizations
// This script handles the functionality for the ad card slider with improved UX

// Expose as a reusable initializer so index.html can call it
window.initializeAdSlider = () => {
    const slider = document.getElementById('ad-cards-wrapper');
    const prevButton = document.getElementById('prev-ad');
    const nextButton = document.getElementById('next-ad');
    const dotsContainer = document.getElementById('slider-dots');
    const progressBar = document.getElementById('slider-progress');

    // Select all ad cards
    const adCards = slider ? slider.querySelectorAll('.ad-card') : [];
    const totalCards = adCards.length;

    // If there are no cards or only one, don't attach slider logic
    if (!slider || totalCards <= 1) {
        // Hide navigation elements if no slider needed
        if (prevButton) prevButton.style.display = 'none';
        if (nextButton) nextButton.style.display = 'none';
        if (dotsContainer) dotsContainer.style.display = 'none';
        if (progressBar) progressBar.style.display = 'none';
        return;
    }

    let currentIndex = 0;
    let autoSlideInterval;
    let progressInterval;
    let isTransitioning = false;

    // Create dots indicator
    function createDots() {
        if (!dotsContainer) return;

        dotsContainer.innerHTML = '';
        for (let i = 0; i < totalCards; i++) {
            const dot = document.createElement('button');
            dot.className = `w-3 h-3 rounded-full transition-all duration-300 ${
                i === currentIndex
                    ? 'bg-gold scale-125 shadow-lg'
                    : 'bg-gray-300 hover:bg-gray-400'
            }`;
            dot.addEventListener('click', () => goToSlide(i));
            dotsContainer.appendChild(dot);
        }
    }

    // Update dots active state
    function updateDots() {
        if (!dotsContainer) return;

        const dots = dotsContainer.querySelectorAll('button');
        dots.forEach((dot, index) => {
            if (index === currentIndex) {
                dot.className = 'w-3 h-3 rounded-full bg-gold scale-125 shadow-lg transition-all duration-300';
            } else {
                dot.className = 'w-3 h-3 rounded-full bg-gray-300 hover:bg-gray-400 transition-all duration-300';
            }
        });
    }

    // Progress bar animation
    function startProgressBar() {
        if (!progressBar) return;

        const progressFill = progressBar.querySelector('div');
        if (!progressFill) return;

        let progress = 0;
        const duration = 5000; // 5 seconds
        const increment = 100 / (duration / 50); // Update every 50ms

        clearInterval(progressInterval);
        progressFill.style.width = '0%';

        progressInterval = setInterval(() => {
            progress += increment;
            if (progress >= 100) {
                progress = 100;
                clearInterval(progressInterval);
            }
            progressFill.style.width = progress + '%';
        }, 50);
    }

    /**
     * Updates the slider's position to show the current ad card.
     */
    function updateSlider() {
        if (isTransitioning) return;

        isTransitioning = true;

        // Calculate the offset to slide the wrapper
        const offset = -currentIndex * 100;
        slider.style.transform = `translateX(${offset}%)`;

        // Update dots and restart progress
        updateDots();
        startProgressBar();

        // Reset transition flag after animation completes
        setTimeout(() => {
            isTransitioning = false;
        }, 700);
    }

    /**
     * Go to specific slide
     */
    function goToSlide(index) {
        if (isTransitioning || index === currentIndex) return;

        currentIndex = index;
        updateSlider();
        startAutoSlide(); // Restart auto-slide timer
    }

    /**
     * Starts the automatic sliding timer.
     */
    function startAutoSlide() {
        // Clear any existing timer before starting a new one
        clearInterval(autoSlideInterval);
        autoSlideInterval = setInterval(nextCard, 5000);
    }

    /**
     * Moves the slider to the next card, looping back to the start if at the end.
     */
    function nextCard() {
        if (isTransitioning) return;

        // If the current slide is the last one, we will reset to the beginning
        if (currentIndex === totalCards - 1) {
            // Temporarily disable the CSS transition to make the jump instantaneous
            slider.style.transition = 'none';
            currentIndex = 0;
            updateSlider();

            // Re-enable the transition after a brief delay so the next slide is animated
            setTimeout(() => {
                slider.style.transition = 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 50);
        } else {
            // Otherwise, move to the next slide with the normal transition
            currentIndex++;
            updateSlider();
        }
    }

    /**
     * Moves the slider to the previous card, looping back to the end if at the beginning.
     */
    function prevCard() {
        if (isTransitioning) return;

        // Move to the previous index, or to the last index if at the beginning
        if (currentIndex === 0) {
            // Temporarily disable the CSS transition for an instant jump
            slider.style.transition = 'none';
            currentIndex = totalCards - 1;
            updateSlider();

            // Re-enable the transition for the next slide
            setTimeout(() => {
                slider.style.transition = 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
            }, 50);
        } else {
            // Otherwise, move to the previous slide with the normal transition
            currentIndex--;
            updateSlider();
        }
        // Restart the timer after a manual click
        startAutoSlide();
    }

    // Touch/swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;

    function handleTouchStart(e) {
        touchStartX = e.changedTouches[0].screenX;
    }

    function handleTouchEnd(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }

    function handleSwipe() {
        const swipeThreshold = 50;
        const swipeDistance = touchStartX - touchEndX;

        if (Math.abs(swipeDistance) > swipeThreshold) {
            if (swipeDistance > 0) {
                nextCard(); // Swipe left, go next
            } else {
                prevCard(); // Swipe right, go previous
            }
        }
    }

    // Add touch event listeners
    const sliderContainer = document.getElementById('ad-slider');
    if (sliderContainer) {
        sliderContainer.addEventListener('touchstart', handleTouchStart, { passive: true });
        sliderContainer.addEventListener('touchend', handleTouchEnd, { passive: true });
    }

    // Event listeners for the navigation buttons
    if (prevButton) {
        prevButton.addEventListener('click', prevCard);
    }

    if (nextButton) {
        nextButton.addEventListener('click', () => {
            nextCard();
            // Restart the timer after a manual click
            startAutoSlide();
        });
    }

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            prevCard();
        } else if (e.key === 'ArrowRight') {
            nextCard();
        }
    });

    // Initialize
    slider.style.transition = 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)';
    createDots();
    startProgressBar();
    startAutoSlide();

    // Pause on hover
    const sliderElement = document.getElementById('ad-slider');
    if (sliderElement) {
        sliderElement.addEventListener('mouseenter', () => {
            clearInterval(autoSlideInterval);
            clearInterval(progressInterval);
        });

        sliderElement.addEventListener('mouseleave', () => {
            startAutoSlide();
            startProgressBar();
        });
    }
}

// Auto-initialize if index page didn't explicitly call it yet
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initializeAdSlider === 'function') {
        window.initializeAdSlider();
    }
});
