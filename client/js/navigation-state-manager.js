/**
 * DEPRECATED: Navigation State Manager
 * This component is deprecated in favor of Navigation Coordinator + Router system
 * Keeping for backward compatibility but it does NOT handle navigation anymore
 */
console.warn('NavigationStateManager is deprecated - use NavigationCoordinator + Router instead');

// Prevent this from registering or interfering
if (window.NavigationStateManager) {
    console.log('NavigationStateManager already exists, skipping re-initialization');
} else {

class NavigationStateManager {
    constructor() {
        console.warn('NavigationStateManager is deprecated - functionality handled by Router');
        if (window.navigationStateManager) return;
        window.navigationStateManager = this;
        
        // DO NOT initialize - let Router handle everything
    }
    
    // Deprecated methods - redirect to router
    async navigate(url, options = {}) {
        console.warn('NavigationStateManager.navigate() is deprecated - delegating to Router');
        if (window.router && window.router.navigate) {
            return window.router.navigate(url);
        }
        window.location.href = url;
    }

    static navigate(url, options = {}) {
        console.warn('NavigationStateManager.navigate() is deprecated');
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
