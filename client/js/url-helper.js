/**
 * URL Helper - v202604081100
 * Converts old /pages/*.html links to clean URLs in the DOM.
 * Uses router's toCleanUrl() as the single source of truth for URL conversion.
 */
(function() {
    'use strict';

    if (window.URLHelper) {
        return;
    }

    var URLHelper = {

        /**
         * Update all <a href> in the page to use clean URLs.
         * Called once on page load and after any dynamic content injection.
         */
        updatePageLinks: function() {
            var links = document.querySelectorAll('a[href]');
            
            links.forEach(function(link) {
                var href = link.getAttribute('href');
                if (!href) return;

                // Skip special links
                if (href.startsWith('javascript:') || href.startsWith('mailto:') ||
                    href.startsWith('tel:') || href.startsWith('#') ||
                    href.startsWith('http://') || href.startsWith('https://') ||
                    link.hasAttribute('download') || link.getAttribute('data-no-navigate') === 'true') {
                    return;
                }

                var cleanUrl = URLHelper.getCleanUrl(href);
                
                if (cleanUrl && cleanUrl !== href) {
                    link.setAttribute('href', cleanUrl);
                }
            });
        },

        /**
         * Convert a file path to a clean URL.
         * Delegates to router's toCleanUrl() if available, otherwise uses basic mapping.
         */
        getCleanUrl: function(filePath) {
            if (!filePath || typeof filePath !== 'string') return '/';

            // Use router's converter if available (single source of truth)
            if (window.toCleanUrl) {
                var result = window.toCleanUrl(filePath);
                return result || filePath;
            }

            // Fallback: basic conversion for before router loads
            var url = filePath.trim();
            
            // Strip ../ and ./
            url = url.replace(/^(\.\.\/)+/, '/').replace(/^\.\//, '/');
            if (!url.startsWith('/')) url = '/' + url;

            // Separate query and hash
            var suffix = '';
            var hashIdx = url.indexOf('#');
            if (hashIdx !== -1) {
                suffix = url.substring(hashIdx);
                url = url.substring(0, hashIdx);
            }
            var queryIdx = url.indexOf('?');
            if (queryIdx !== -1) {
                suffix = url.substring(queryIdx) + suffix;
                url = url.substring(0, queryIdx);
            }

            if (url === '/index.html') return '/' + suffix;

            var pagesMatch = url.match(/^\/pages\/(.+?)\.html$/);
            if (pagesMatch) {
                var name = pagesMatch[1];
                var specialMap = {
                    'buyer-dashboard': 'dashboard',
                    'admin-dashboard': 'admin',
                    'product-detail': 'product',
                    'contact-support': 'contact'
                };
                return '/' + (specialMap[name] || name) + suffix;
            }

            if (url.endsWith('.html')) {
                url = url.replace(/\.html$/, '');
            }

            return url + suffix;
        },

        /**
         * Navigate to a clean URL (delegates to router)
         */
        updateWindowLocation: function(cleanPath, params) {
            if (window.router && window.router.navigate) {
                window.router.navigate(cleanPath, params || {});
            } else {
                window.location.href = cleanPath;
            }
        },

        /**
         * Initialize: update all links when ready
         */
        init: function() {
            var doUpdate = function() {
                URLHelper.updatePageLinks();
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', doUpdate, { once: true });
            } else {
                // Delay slightly to ensure all dynamic content is rendered
                setTimeout(doUpdate, 100);
            }
        }
    };

    // Auto-initialize
    URLHelper.init();

    // Export globally
    window.URLHelper = URLHelper;

    // Convenience function for updating links after dynamic content
    window.updateCleanLinks = function() {
        URLHelper.updatePageLinks();
    };

})();
