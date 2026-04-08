/**
 * Global Navigation Bootstrap
 * Ensures the Navigation Coordinator + Router system is available on all pages
 * Version: v202604081000
 * 
 * This script should be loaded early on all pages to initialize the
 * unified navigation system globally.
 */

console.log('🚀 Global Navigation Bootstrap starting...');

// ============================================================================
// PHASE 1: Initialize Global Script Registry
// ============================================================================

if (!window.loadedScripts) {
    window.loadedScripts = new Set();
    document.querySelectorAll('script[src]').forEach(script => {
        window.loadedScripts.add(script.src);
    });
    console.log(`✓ Script registry initialized with ${window.loadedScripts.size} scripts`);
}

// Ensure the SPA initialization helper exists even if bootstrap is delayed or not loaded.
if (typeof window.onPageReady !== 'function') {
    window.onPageReady = function(callback, runImmediately = true) {
        if (typeof callback !== 'function') {
            console.error('onPageReady: callback must be a function');
            return;
        }

        if (document.readyState === 'interactive' || document.readyState === 'complete') {
            if (runImmediately) {
                Promise.resolve().then(callback);
            } else {
                callback();
            }
        } else {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
        }

        window.addEventListener('pageNavigationReady', () => {
            Promise.resolve().then(callback);
        });
    };
}

// ============================================================================
// PHASE 2: Global Navigation State
// ============================================================================

window.navigationState = {
    isInitialized: false,
    isReady: false,
    waiters: [],
    
    /**
     * Wait for navigation system to be ready
     */
    async waitForReady() {
        if (this.isReady) {
            return Promise.resolve();
        }
        
        return new Promise(resolve => {
            this.waiters.push(resolve);
        });
    },
    
    /**
     * Mark navigation system as ready
     */
    markReady() {
        if (this.isReady) return;
        this.isReady = true;
        console.log('✓ Navigation system is READY for all pages');
        
        // Resolve all waiters
        this.waiters.forEach(resolve => resolve());
        this.waiters = [];
        
        // Dispatch ready event
        window.dispatchEvent(new CustomEvent('navigationSystemReady'));
    }
};

// ============================================================================
// PHASE 3: Global Navigation Helpers
// ============================================================================

/**
 * Navigate to a URL using the SPA navigation system
 * @param {string} url - URL to navigate to
 * @param {object} options - Navigation options
 */
window.navigateTo = async function(url, options = {}) {
    // Wait for router to be ready
    if (!window.router) {
        console.warn('Router not available yet, waiting...');
        await window.navigationState.waitForReady();
    }
    
    if (window.router && typeof window.router.navigate === 'function') {
        return window.router.navigate(url, options);
    }
    
    // Fallback
    console.warn('Router navigation unavailable, using direct navigation');
    window.location.href = url;
};

/**
 * Initialize page on both initial load AND navigation
 * Use this instead of DOMContentLoaded for SPA-compatible page setup
 * 
 * @param {function} callback - Function to run on page ready
 * @param {boolean} runImmediately - If true, run now if already ready
 * 
 * @example
 * window.onPageReady(() => {
 *     setupForm();
 *     attachEventListeners();
 *     loadData();
 * });
 */
window.onPageReady = function(callback, runImmediately = true) {
    if (typeof callback !== 'function') {
        console.error('onPageReady: callback must be a function');
        return;
    }
    
    // If DOMContentLoaded already fired (normal page load)
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
        if (runImmediately) {
            // Run on next microtask to ensure DOM is settled
            Promise.resolve().then(callback);
        } else {
            callback();
        }
    } else {
        // Wait for DOMContentLoaded (initial page load only)
        document.addEventListener('DOMContentLoaded', callback, { once: true });
    }
    
    // ALSO listen for SPA navigation events (when router loads new page)
    window.addEventListener('pageNavigationReady', () => {
        // Run callback when navigating to this page via SPA
        Promise.resolve().then(callback);
    });
    
    // For backward compatibility, also dispatch events on window
    window.addEventListener('navigationStateChanged', () => {
        // This gives pages another opportunity to initialize
    });
};

/**
 * Get the Navigation Coordinator instance
 */
window.getNavigator = function() {
    if (!window.NavigationCoordinator) {
        console.warn('NavigationCoordinator not yet available');
        return null;
    }
    return window.NavigationCoordinator.getInstance();
};

/**
 * Check if a route is protected (requires authentication)
 */
window.isProtectedRoute = function(route) {
    const coordinator = window.getNavigator();
    if (!coordinator) return false;
    return coordinator.isProtectedRoute(route);
};

/**
 * Get current URL from navigator
 */
window.getCurrentUrl = function() {
    const coordinator = window.getNavigator();
    if (coordinator) {
        return coordinator.currentUrl;
    }
    return window.location.pathname;
};

// ============================================================================
// PHASE 4: Global Click Interception
// ============================================================================

/**
 * Setup global link click interception
 */
function setupGlobalClickInterception() {
    // Only setup once
    if (window.__clickInterceptionSetup) {
        return;
    }
    window.__clickInterceptionSetup = true;
    
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        
        const href = link.getAttribute('href');
        
        // Skip non-navigation links
        if (!href || 
            href.startsWith('http') || 
            href.startsWith('mailto:') || 
            href.startsWith('tel:') || 
            href.startsWith('#') ||
            link.hasAttribute('download') ||
            link.getAttribute('target') === '_blank' ||
            link.getAttribute('data-no-navigate') === 'true') {
            return;
        }
        
        // Only intercept internal links
        if (href.startsWith('/')) {
            e.preventDefault();
            window.navigateTo(href).catch(err => {
                console.error('Navigation failed:', err);
                // Fallback
                window.location.href = href;
            });
        }
    }, true); // Use capture phase for better control
    
    console.log('✓ Global click interception setup complete');
}

// Setup click interception as soon as DOM is interactive
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupGlobalClickInterception);
} else {
    setupGlobalClickInterception();
}

// ============================================================================
// PHASE 5: Ensure Navigation System Scripts Load in Correct Order
// ============================================================================

/**
 * Ensure navigation scripts are loaded in the correct order
 */
function ensureNavigationScriptsLoaded() {
    const scripts = [
        '/js/navigation-coordinator.js',
        '/js/router.js'
    ];
    
    const requiredScripts = scripts.filter(src => {
        const absoluteUrl = new URL(src, window.location.origin).href;
        for (let loaded of window.loadedScripts) {
            if (loaded.includes(src) || loaded === absoluteUrl) {
                return false;
            }
        }
        return true;
    });
    
    if (requiredScripts.length === 0) {
        console.log('✓ Navigation scripts already loaded');
        scheduleReadyCheck();
        return;
    }
    
    console.log(`⏳ Loading ${requiredScripts.length} navigation script(s)...`);
    
    let loadedCount = 0;
    requiredScripts.forEach(src => {
        const script = document.createElement('script');
        script.src = src;
        script.type = 'text/javascript';
        
        script.onload = () => {
            loadedCount++;
            console.log(`✓ Loaded: ${src} (${loadedCount}/${requiredScripts.length})`);
            window.loadedScripts.add(src);
            
            if (loadedCount === requiredScripts.length) {
                console.log('✓ All navigation scripts loaded');
                scheduleReadyCheck();
            }
        };
        
        script.onerror = () => {
            console.error(`✗ Failed to load: ${src}`);
        };
        
        document.head.appendChild(script);
    });
}

// ============================================================================
// PHASE 6: Ready State Checking
// ============================================================================

/**
 * Check if the navigation system is ready
 */
function checkNavigationReady() {
    const hasCoordinator = typeof window.NavigationCoordinator !== 'undefined' && 
                           window.NavigationCoordinator.getInstance;
    const hasRouter = typeof window.router !== 'undefined' && 
                      window.router.navigate;
    
    if (hasCoordinator && hasRouter) {
        console.log('✓ Navigation system fully initialized');
        window.navigationState.markReady();
        return true;
    }
    
    return false;
}

/**
 * Schedule ready check with retries
 */
function scheduleReadyCheck() {
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max
    
    const checkInterval = setInterval(() => {
        attempts++;
        
        if (checkNavigationReady()) {
            clearInterval(checkInterval);
            return;
        }
        
        if (attempts >= maxAttempts) {
            clearInterval(checkInterval);
            console.warn('⚠️  Navigation system initialization timeout - proceeding with partial system');
            window.navigationState.markReady();
        }
    }, 100);
}

// ============================================================================
// PHASE 7: Initialization
// ============================================================================

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded - initializing navigation system');
        ensureNavigationScriptsLoaded();
    });
} else {
    console.log('📄 DOM already loaded - initializing navigation system');
    ensureNavigationScriptsLoaded();
}

// ============================================================================
// PHASE 8: Expose Bootstrap Status
// ============================================================================

window.navigationBootstrap = {
    version: 'v202604081000',
    isReady: () => window.navigationState.isReady,
    waitForReady: () => window.navigationState.waitForReady(),
    navigateTo: window.navigateTo,
    getNavigator: window.getNavigator,
    isProtectedRoute: window.isProtectedRoute,
    getCurrentUrl: window.getCurrentUrl,
    onPageReady: window.onPageReady
};

console.log('✓ Navigation Bootstrap initialized - waiting for DOM...');
