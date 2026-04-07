/**
 * Virtuosa Cookie Consent Manager
 * Handles showing the GDPR/CCPA compliant banner and storing user preferences.
 */

// Prevent duplicate class declarations
if (window.CookieManager) {
    console.log('CookieManager class already exists, skipping declaration');
} else {

class CookieManager {
    constructor() {
        this.cookieName = 'virtuosa_cookie_consent';
        this.preferences = this.getPreferences();
        this.bannerElement = null;
        this.modalElement = null;
        
        // Essential is always true
        this.defaultPreferences = {
            essential: true,   // Authentication, security, routing
            analytics: false,  // Pageviews, time-on-page
            marketing: false   // Product clicks, advertising
        };

        // If no preferences are set, we need consent
        if (!this.preferences) {
            this.preferences = { ...this.defaultPreferences };
            this.needsConsent = true;
        } else {
            this.needsConsent = false;
        }

        // Initialize UI only after DOM is completely ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    getPreferences() {
        try {
            // First check standard cookie
            const match = document.cookie.match(new RegExp('(^| )' + this.cookieName + '=([^;]+)'));
            if (match) return JSON.parse(decodeURIComponent(match[2]));
            
            // Fallback to localStorage
            const local = localStorage.getItem(this.cookieName);
            if (local) return JSON.parse(local);
            
            return null;
        } catch (e) {
            return null;
        }
    }

    savePreferences(prefs) {
        this.preferences = { ...this.defaultPreferences, ...prefs };
        
        // Save to cookie (1 year expiry)
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        document.cookie = `${this.cookieName}=${encodeURIComponent(JSON.stringify(this.preferences))};expires=${expiry.toUTCString()};path=/;SameSite=Lax`;
        
        // Also save to localStorage as a robust fallback
        localStorage.setItem(this.cookieName, JSON.stringify(this.preferences));
        
        this.needsConsent = false;
        if (this.bannerElement) this.bannerElement.remove();
        if (this.modalElement) this.modalElement.remove();

        // Dispatch global event so CookieTracker can trigger immediately if needed
        window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { detail: this.preferences }));
    }

    hasConsent(category) {
        if (category === 'essential') return true; // Always granted
        if (!this.preferences) return false;
        return !!this.preferences[category];
    }

    init() {
        if (this.needsConsent) {
            this.injectBanner();
        }
        
        // Check if there's a trigger for managing preferences on the current page (like in footer)
        const manageBtn = document.getElementById('manage-cookie-preferences');
        if (manageBtn) {
            manageBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.injectModal();
            });
        }
    }

    injectBanner() {
        if (document.getElementById('virtuosa-cookie-banner')) return;

        this.bannerElement = document.createElement('div');
        this.bannerElement.id = 'virtuosa-cookie-banner';
        this.bannerElement.className = 'fixed bottom-0 left-0 w-full bg-[#0A1128]/95 backdrop-blur-md border-t border-[#C19A6B]/30 p-4 md:p-6 shadow-2xl z-[99999] transform transition-transform duration-500 translate-y-0';
        
        this.bannerElement.innerHTML = `
            <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                <div class="text-gray-300 text-sm md:text-base flex-1">
                    <h3 class="text-[#FFD700] font-bold mb-1">We value your privacy</h3>
                    <p>Virtuosa uses cookies to provide essential site functionality (like keeping you logged in), analyze site traffic, and personalize your experience. By clicking "Accept All", you agree to the storing of cookies on your device for these purposes. Read our <a href="/privacy" class="text-[#FFD700] underline hover:text-white transition">Privacy Policy</a> to learn more.</p>
                </div>
                <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                    <button id="cookie-preferences-btn" class="px-4 py-2 border border-[#C19A6B] text-[#C19A6B] hover:bg-[#C19A6B] hover:text-[#0A1128] rounded-lg transition-colors font-medium text-sm whitespace-nowrap">Manage Preferences</button>
                    <button id="cookie-reject-btn" class="px-4 py-2 bg-gray-800 text-white hover:bg-gray-700 rounded-lg transition-colors font-medium text-sm whitespace-nowrap">Reject Non-Essential</button>
                    <button id="cookie-accept-btn" class="px-6 py-2 bg-gradient-to-r from-[#FFD700] to-[#C19A6B] text-[#0A1128] hover:shadow-lg hover:shadow-[#FFD700]/20 rounded-lg transition-all font-bold text-sm whitespace-nowrap">Accept All</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.bannerElement);

        document.getElementById('cookie-accept-btn').addEventListener('click', () => {
            this.savePreferences({ essential: true, analytics: true, marketing: true });
        });

        document.getElementById('cookie-reject-btn').addEventListener('click', () => {
            this.savePreferences({ essential: true, analytics: false, marketing: false });
        });

        document.getElementById('cookie-preferences-btn').addEventListener('click', () => {
            this.injectModal();
        });
    }

    injectModal() {
        if (document.getElementById('virtuosa-cookie-modal')) return;

        this.modalElement = document.createElement('div');
        this.modalElement.id = 'virtuosa-cookie-modal';
        this.modalElement.className = 'fixed inset-0 bg-[#0A1128]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100000]';
        
        // Ensure accurate state checkboxes if user already consented
        const anChecked = this.preferences?.analytics ? 'checked' : '';
        const mkChecked = this.preferences?.marketing ? 'checked' : '';

        this.modalElement.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-gray-800">
                <div class="p-5 border-b flex justify-between items-center bg-gray-50">
                    <h2 class="text-xl font-bold font-serif text-[#0A1128]">Cookie Preferences</h2>
                    <button id="close-cookie-modal" class="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
                </div>
                
                <div class="p-6 overflow-y-auto flex-1 space-y-6">
                    <p class="text-gray-600 text-sm">When you visit any website, it may store or retrieve information on your browser, mostly in the form of cookies. You can choose not to allow some types of cookies. Click on the different category headings to find out more and change our default settings.</p>
                    
                    <!-- Essential Cookies -->
                    <div class="flex items-start justify-between gap-4 p-4 rounded-lg bg-gray-50 border">
                        <div>
                            <h3 class="font-bold flex items-center gap-2">Strictly Necessary Cookies <span class="text-xs px-2 py-0.5 bg-gray-200 rounded-full text-gray-600">Always Active</span></h3>
                            <p class="text-xs text-gray-500 mt-1">These cookies are necessary for the website to function and cannot be switched off. This includes security tokens and session data to keep you logged in.</p>
                        </div>
                    </div>

                    <!-- Analytics Cookies -->
                    <div class="flex items-start justify-between gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                        <div>
                            <h3 class="font-bold">Performance & Analytics Cookies</h3>
                            <p class="text-xs text-gray-500 mt-1">These cookies allow us to count visits and traffic sources so we can measure and improve the performance of our site. They help us to know which pages are the most and least popular.</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                            <input type="checkbox" id="toggle-analytics" class="sr-only peer" ${anChecked}>
                            <div class="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A1128]"></div>
                        </label>
                    </div>

                    <!-- Marketing Cookies -->
                    <div class="flex items-start justify-between gap-4 p-4 rounded-lg border hover:bg-gray-50 transition-colors">
                        <div>
                            <h3 class="font-bold">Advertising & Customization Cookies</h3>
                            <p class="text-xs text-gray-500 mt-1">These cookies may be set by us or our advertising partners. They track your interests and product views to show you relevant recommendations and targeted advertising.</p>
                        </div>
                        <label class="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                            <input type="checkbox" id="toggle-marketing" class="sr-only peer" ${mkChecked}>
                            <div class="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A1128]"></div>
                        </label>
                    </div>
                </div>

                <div class="p-5 border-t bg-gray-50 flex justify-end gap-3">
                    <button id="save-cookie-prefs" class="px-5 py-2.5 bg-[#0A1128] text-white hover:bg-[#1a2332] rounded-lg transition-colors font-medium text-sm">Save My Choices</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalElement);

        document.getElementById('close-cookie-modal').addEventListener('click', () => {
            if (this.needsConsent) {
                // If closed without action and we need consent, do nothing (banner remains)
                this.modalElement.remove();
            } else {
                this.modalElement.remove();
            }
        });

        document.getElementById('save-cookie-prefs').addEventListener('click', () => {
            const analytics = document.getElementById('toggle-analytics').checked;
            const marketing = document.getElementById('toggle-marketing').checked;
            
            this.savePreferences({
                essential: true,
                analytics: analytics,
                marketing: marketing
            });
            
            // Record consent update if analytics is enabled
            if (window.VirtuosaTracker) {
                window.VirtuosaTracker.trackEvent('consent_update', 'essential', { 
                    consentState: { analytics, marketing } 
                });
            }
        });
    }

    openPreferences() {
        this.injectModal();
    }
}

// Instantiate globally
window.CookieManager = new CookieManager();

// Close conditional class declaration block
}
