/**
 * Navigation State Manager - Prevents multinavigation issues
 * Handles race conditions, cache consistency, and URL state synchronization
 */
// Prevent duplicate class declarations
if (window.NavigationStateManager) {
    console.log('NavigationStateManager class already exists, skipping declaration');
} else {

class NavigationStateManager {
    constructor() {
        if (window.navigationStateManager) return;
        window.navigationStateManager = this;
        
        // Navigation state tracking
        this.navigationInProgress = false;
        this.lastNavigationId = 0;
        this.pendingNavigations = new Map();
        
        // Cache management
        this.pageCache = new Map();
        this.cacheVersion = 0;
        this.maxCacheSize = 50;
        
        // URL state synchronization
        this.currentUrl = window.location.pathname + window.location.search;
        this.expectedUrl = this.currentUrl;
        
        // Event cleanup
        this.eventListeners = new Set();
        
        this.init();
    }
    
    init() {
        // Clean up existing router conflicts
        this.cleanupRouterConflicts();
        
        // Set up unified navigation handling
        this.setupUnifiedNavigation();
        
        // Handle browser navigation events
        this.setupBrowserNavigation();
        
        console.log('Navigation State Manager initialized');
    }
    
    cleanupRouterConflicts() {
        // Don't disable existing router - work with it instead
        // Only remove conflicting popstate listeners if needed
        if (window.getEventListeners?.(window)?.popstate) {
            const listeners = window.getEventListeners(window).popstate;
            // Only remove listeners that aren't from our main router
            listeners.forEach(listener => {
                if (!listener.listener.toString().includes('router')) {
                    window.removeEventListener('popstate', listener.listener);
                }
            });
        }
    }
    
    setupUnifiedNavigation() {
        // Intercept all navigation attempts
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            
            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('#')) {
                return;
            }
            
            e.preventDefault();
            this.navigate(href);
        });
    }
    
    setupBrowserNavigation() {
        const popstateHandler = (e) => {
            const newUrl = window.location.pathname + window.location.search;
            if (newUrl !== this.currentUrl) {
                this.handleBrowserNavigation(newUrl);
            }
        };
        
        window.addEventListener('popstate', popstateHandler);
        this.eventListeners.add({ element: window, event: 'popstate', handler: popstateHandler });
    }
    
    async navigate(url, options = {}) {
        const navigationId = ++this.lastNavigationId;
        
        // Cancel any pending navigation
        this.cancelPendingNavigations();
        
        // Set navigation state
        this.navigationInProgress = true;
        this.expectedUrl = url;
        
        try {
            console.log(`Navigation ${navigationId}: ${url}`);
            
            // Update browser history
            if (!options.replaceHistory) {
                history.pushState({}, '', url);
            } else {
                history.replaceState({}, '', url);
            }
            
            // Load content
            await this.loadContent(url, navigationId);
            
            // Update current URL
            this.currentUrl = url;
            
        } catch (error) {
            console.error(`Navigation ${navigationId} failed:`, error);
            this.handleNavigationError(url, error);
        } finally {
            this.navigationInProgress = false;
            this.pendingNavigations.delete(navigationId);
        }
    }
    
    async handleBrowserNavigation(url) {
        if (this.navigationInProgress) {
            console.warn('Browser navigation blocked - navigation in progress');
            // Revert URL if navigation is in progress
            history.replaceState({}, '', this.currentUrl);
            return;
        }
        
        await this.navigate(url, { replaceHistory: true });
    }
    
    async loadContent(url, navigationId) {
        // Disable caching for pages that need full script execution
        const needsFullScriptExecution = [
            '/login',
            '/signup', 
            '/',
            '/index.html'
        ].includes(url);
        
        // Check cache first (only for pages that don't need full script execution)
        if (!needsFullScriptExecution) {
            const cacheKey = this.getCacheKey(url);
            if (this.pageCache.has(cacheKey)) {
                const cached = this.pageCache.get(cacheKey);
                if (this.isCacheValid(cached)) {
                    console.log(`Using cache for ${url}`);
                    this.renderContent(cached.html, url);
                    return;
                }
            }
        }
        
        // Fetch fresh content
        const controller = new AbortController();
        this.pendingNavigations.set(navigationId, controller);
        
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const html = await response.text();
            
            // Update cache (only for pages that don't need full script execution)
            if (!needsFullScriptExecution) {
                const cacheKey = this.getCacheKey(url);
                this.updateCache(cacheKey, html);
            }
            
            // Render content
            this.renderContent(html, url);
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                throw error;
            }
        }
    }
    
    renderContent(html, url) {
        // Validate HTML
        if (!html || html.trim().length === 0) {
            throw new Error(`Empty content for ${url}`);
        }
        
        // Extract content from HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Update page content
        const mainContent = doc.querySelector('main') || doc.querySelector('body') || doc.body;
        const currentMain = document.querySelector('main') || document.querySelector('body');
        
        if (currentMain && mainContent) {
            currentMain.innerHTML = mainContent.innerHTML;
        }
        
        // Update page title
        const title = doc.querySelector('title');
        if (title) {
            document.title = title.textContent;
        }
        
        // Execute scripts using router's proper script execution
        if (window.router && window.router.executeScripts) {
            window.router.executeScripts(doc);
            
            // Reinitialize click interceptors for dynamically added content
            setTimeout(() => {
                if (window.router.setupClickInterceptor) {
                    window.router.setupClickInterceptor();
                }
            }, 100);
            
            // Reinitialize mobile menu interception
            setTimeout(() => {
                if (window.router.setupMobileMenuInterception) {
                    window.router.setupMobileMenuInterception();
                }
            }, 150);
        } else {
            // Fallback to basic reinitialization
            this.reinitializeScripts();
        }
        
        // Update URL helper links
        if (window.updateCleanLinks) {
            window.updateCleanLinks();
        }
        
        console.log(`Content rendered for ${url}`);
    }
    
    reinitializeScripts() {
        // Find and reinitialize common page scripts
        const scripts = [
            { name: 'header', selector: '[data-header-script]' },
            { name: 'cart', selector: '[data-cart-script]' },
            { name: 'auth', selector: '[data-auth-script]' }
        ];
        
        scripts.forEach(script => {
            const element = document.querySelector(script.selector);
            if (element && window[script.name + 'Init']) {
                try {
                    window[script.name + 'Init']();
                } catch (error) {
                    console.warn(`Failed to reinitialize ${script.name}:`, error);
                }
            }
        });
    }
    
    getCacheKey(url) {
        return url.split('?')[0]; // Ignore query params for caching
    }
    
    isCacheValid(cached) {
        // Cache is valid for 5 minutes
        return Date.now() - cached.timestamp < 5 * 60 * 1000;
    }
    
    updateCache(key, html) {
        // Remove oldest entries if cache is full
        if (this.pageCache.size >= this.maxCacheSize) {
            const oldestKey = this.pageCache.keys().next().value;
            this.pageCache.delete(oldestKey);
        }
        
        this.pageCache.set(key, {
            html,
            timestamp: Date.now(),
            version: ++this.cacheVersion
        });
    }
    
    cancelPendingNavigations() {
        this.pendingNavigations.forEach(controller => {
            controller.abort();
        });
        this.pendingNavigations.clear();
    }
    
    handleNavigationError(url, error) {
        console.error(`Navigation error for ${url}:`, error);
        
        // Show error message
        if (window.showToast) {
            window.showToast('Failed to load page. Please try again.', 'error', 3000);
        }
        
        // Fallback to full page reload
        setTimeout(() => {
            window.location.href = url;
        }, 1000);
    }
    
    // Public API
    static navigate(url, options = {}) {
        if (!window.navigationStateManager) {
            console.warn('Navigation State Manager not initialized');
            window.location.href = url;
            return;
        }
        
        return window.navigationStateManager.navigate(url, options);
    }
    
    static getCurrentUrl() {
        return window.navigationStateManager?.currentUrl || window.location.pathname;
    }
    
    static clearCache() {
        if (window.navigationStateManager) {
            window.navigationStateManager.pageCache.clear();
            window.navigationStateManager.cacheVersion++;
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new NavigationStateManager();
});

// Global access
window.NavigationStateManager = NavigationStateManager;
window.navigate = NavigationStateManager.navigate;

// Close the conditional class declaration block
}
