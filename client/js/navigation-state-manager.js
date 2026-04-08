/**
 * DEPRECATED: Navigation State Manager
 * This component is deprecated in favor of Navigation Coordinator + Router system
 * Keeping for backward compatibility but it does NOT handle navigation anymore
 */
// NavigationStateManager is deprecated but kept for backward compatibility
// Migration: use NavigationCoordinator + Router instead

// Prevent this from registering or interfering
if (window.NavigationStateManager) {
    console.log('NavigationStateManager already exists, skipping re-initialization');
} else {

class NavigationStateManager {
    constructor() {
        // Silently skip re-initialization (deprecated - using Router instead)
        if (window.navigationStateManager) return;
        window.navigationStateManager = this;
        
        // DO NOT initialize - let Router handle everything
    }
    
    // Deprecated methods - redirect to router
    async navigate(url, options = {}) {
        // Silently delegate to Router (deprecated method)
        if (window.router && window.router.navigate) {
            return window.router.navigate(url);
        }
        window.location.href = url;
    }

    static navigate(url, options = {}) {
        // Silently delegate to Router (deprecated method)
        if (window.router && window.router.navigate) {
            return window.router.navigate(url);
        }
        window.location.href = url;
    }

    static getCurrentUrl() {
        return window.location.pathname;
    }

    static clearCache() {
        console.log('NavigationStateManager cache clear is deprecated');
    }
}

// Export for backward compatibility
window.NavigationStateManager = NavigationStateManager;
window.navigate = NavigationStateManager.navigate;

// Close conditional
}
