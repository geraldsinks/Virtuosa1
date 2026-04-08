/**
 * DEPRECATED: Navigation State Manager
 * This file is kept ONLY for backward compatibility.
 * It does nothing — all navigation is handled by router.js.
 * 
 * DO NOT add any logic here. If you need navigation functionality,
 * use window.navigateTo() or window.router.navigate().
 */
(function() {
    'use strict';

    if (window.NavigationStateManager) {
        return;
    }

    function NavigationStateManager() {}

    NavigationStateManager.prototype.navigate = function(url) {
        if (window.router && window.router.navigate) {
            return window.router.navigate(url);
        }
        window.location.href = url;
    };

    NavigationStateManager.navigate = function(url) {
        if (window.router && window.router.navigate) {
            return window.router.navigate(url);
        }
        window.location.href = url;
    };

    NavigationStateManager.getCurrentUrl = function() {
        return window.location.pathname;
    };

    NavigationStateManager.clearCache = function() {};

    window.NavigationStateManager = NavigationStateManager;
    window.navigate = NavigationStateManager.navigate;
})();
