// This script handles the functionality for the ad card slider.

// Expose as a reusable initializer so index.html can call it
window.initializeAdSlider = () => {
    const slider = document.getElementById('ad-cards-wrapper');
    const prevButton = document.getElementById('prev-ad');
    const nextButton = document.getElementById('next-ad');
    // Select all ad cards
    const adCards = slider ? slider.querySelectorAll('.ad-card') : [];
    const totalCards = adCards.length;

    // If there are no cards or only one, don't attach slider logic
    if (!slider || totalCards <= 1) {
        return;
    }
    let currentIndex = 0;
    // Variable to hold the interval ID so it can be cleared
    let autoSlideInterval;

    /**
     * Updates the slider's position to show the current ad card.
     */
    function updateSlider() {
        // Calculate the offset to slide the wrapper
        const offset = -currentIndex * 100;
        slider.style.transform = `translateX(${offset}%)`;
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
        // If the current slide is the last one, we will reset to the beginning
        if (currentIndex === totalCards - 1) {
            // Temporarily disable the CSS transition to make the jump instantaneous
            slider.style.transition = 'none';
            currentIndex = 0;
            updateSlider();

            // Re-enable the transition after a brief delay so the next slide is animated
            setTimeout(() => {
                slider.style.transition = 'transform 0.5s ease-in-out';
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
        // Move to the previous index, or to the last index if at the beginning
        if (currentIndex === 0) {
            // Temporarily disable the CSS transition for an instant jump
            slider.style.transition = 'none';
            currentIndex = totalCards - 1;
            updateSlider();

            // Re-enable the transition for the next slide
            setTimeout(() => {
                slider.style.transition = 'transform 0.5s ease-in-out';
            }, 50);
        } else {
            // Otherwise, move to the previous slide with the normal transition
            currentIndex--;
            updateSlider();
        }
        // Restart the timer after a manual click
        startAutoSlide();
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

    // Ensure we always respect the current number of cards rendered
    slider.style.transition = 'transform 0.5s ease-in-out';
    startAutoSlide();
};

// Auto-initialize if index page didn't explicitly call it yet
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.initializeAdSlider === 'function') {
        window.initializeAdSlider();
    }
});
