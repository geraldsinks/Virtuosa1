/**
 * Virtuosa Cookie Tracker
 * Depends on window.CookieManager.
 * Tracks page views, clicks, and session time if consent is granted.
 * Batches events and dispatches them to the backend periodically.
 */

class VirtuosaTracker {
    constructor() {
        this.events = [];
        this.sessionId = this.getOrCreateSessionId();
        this.userId = localStorage.getItem('userId') || null;
        // Don't set endpoint here - get it dynamically when needed
        this.pageLoadTime = Date.now();

        // Listen for consent updates to retroactively fire tracking
        window.addEventListener('cookieConsentUpdated', () => {
            this.handleInitialTracking();
        });

        // Initialize tracking if we have consent
        this.handleInitialTracking();

        // Bind lifecycle events for batch dispatching
        window.addEventListener('beforeunload', () => this.flushOnExit());
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                this.flushOnExit();
            }
        });

        // Periodic flush every 15 seconds
        setInterval(() => this.flush(), 15000);
    }

    getEndpoint() {
        // Always get the current API_BASE dynamically
        if (window.API_BASE) {
            const endpoint = `${window.API_BASE}/analytics/track`;
            console.log('📊 Using API_BASE endpoint:', endpoint);
            return endpoint;
        }
        
        // Fallback for production - always use API subdomain
        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            const endpoint = 'https://api.virtuosazm.com/api/analytics/track';
            console.log('📊 Using fallback endpoint:', endpoint);
            return endpoint;
        }
        
        const endpoint = '/api/analytics/track';
        console.log('📊 Using relative endpoint:', endpoint);
        return endpoint;
    }

    getOrCreateSessionId() {
        let sid = sessionStorage.getItem('virtuosa_session_id');
        if (!sid) {
            sid = 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
            sessionStorage.setItem('virtuosa_session_id', sid);
        }
        return sid;
    }

    handleInitialTracking() {
        if (!window.CookieManager) return;
        
        // Ensure we don't accidentally double-track pageview in current session context
        if (window.CookieManager.hasConsent('analytics') && !this.pageviewTracked) {
            this.trackEvent('pageview', 'analytics', {
                path: window.location.pathname,
                referrer: document.referrer,
                screenResolution: `${window.innerWidth}x${window.innerHeight}`
            });
            this.pageviewTracked = true;
        }

        // Attach click listeners for marketing events (only if consented)
        if (window.CookieManager.hasConsent('marketing') && !this.clickListenersAttached) {
            this.attachMarketingListeners();
            this.clickListenersAttached = true;
        }
    }

    attachMarketingListeners() {
        document.body.addEventListener('click', (e) => {
            // Track product clicks
            const productCard = e.target.closest('[data-product-id]');
            if (productCard) {
                const productId = productCard.getAttribute('data-product-id');
                this.trackEvent('product_click', 'marketing', {
                    path: window.location.pathname,
                    productId: productId
                });
            }

            // Track category clicks
            const catLink = e.target.closest('[data-category]');
            if (catLink) {
                const category = catLink.getAttribute('data-category');
                this.trackEvent('category_view', 'marketing', {
                    path: window.location.pathname,
                    categoryId: category
                });
            }
        });
    }

    trackEvent(eventType, category, metadata = {}) {
        // Double check consent on dispatch
        if (category !== 'essential' && window.CookieManager && !window.CookieManager.hasConsent(category)) {
            return; // Dropped due to lack of consent
        }

        const event = {
            sessionId: this.sessionId,
            userId: this.userId || localStorage.getItem('userId'),
            eventType,
            category,
            metadata,
            timestamp: new Date().toISOString()
        };

        this.events.push(event);

        // Instantly flush if marketing critical
        if (eventType === 'product_click' || eventType === 'consent_update') {
            this.flush();
        }
    }

    flush() {
        if (this.events.length === 0) return;

        const payload = [...this.events];
        this.events = []; // clear the batch

        // Get endpoint dynamically each time
        const endpoint = this.getEndpoint();
        console.log('📊 Flushing events to:', endpoint);

        // We use fetch if available. If navigating away, fetch keepalive is good.
        try {
            fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ events: payload }),
                keepalive: true // Ensures request finishes even if user closes tab
            }).catch(() => {
                // Silently swallow errors on analytics to prevent console noise
            });
        } catch (e) {
            // Ignore
        }
    }

    flushOnExit() {
        // Track the duration spent on the current page before exit
        if (window.CookieManager && window.CookieManager.hasConsent('analytics')) {
            const timeSpent = Date.now() - this.pageLoadTime;
            // Unshift to put it at the start of the batch being flushed
            this.events.unshift({
                sessionId: this.sessionId,
                userId: this.userId || localStorage.getItem('userId'),
                eventType: 'pageview_duration',
                category: 'analytics',
                metadata: {
                    path: window.location.pathname,
                    durationMs: timeSpent
                },
                timestamp: new Date().toISOString()
            });
        }

        if (this.events.length > 0) {
            // Navigator sendBeacon is ideal for page unloads
            const blob = new Blob([JSON.stringify({ events: this.events })], { type: 'application/json' });
            navigator.sendBeacon(this.endpoint, blob);
            this.events = [];
        }
    }
}

// Instantiate globally
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.VirtuosaTracker = new VirtuosaTracker();
    });
} else {
    window.VirtuosaTracker = new VirtuosaTracker();
}
