# Global Navigation System - Implementation Guide
## Using the Production Navigation System in All Pages

### Quick Start

The navigation system is now available globally on all pages through the **Navigation Bootstrap** system. You don't need to do anything special - just use the global functions:

```javascript
// Navigate to a page
window.navigateTo('/dashboard');

// Check if you're on a protected route
if (window.isProtectedRoute('/admin')) {
    // Do something
}

// Get current URL
const currentUrl = window.getCurrentUrl();

// Get navigator instance (for advanced use)
const navigator = window.getNavigator();
```

### Global Functions Available (Available Immediately)

#### `window.navigateTo(url, options)`
Navigate to a URL using the SPA navigation system.

```javascript
// Simple navigation
window.navigateTo('/products');

// With options (for future use)
window.navigateTo('/products', { force: true });

// With error handling
window.navigateTo('/login').catch(err => {
    console.error('Navigation failed:', err);
});
```

#### `window.getNavigator()`
Get the NavigationCoordinator instance for advanced navigation features.

```javascript
const navigator = window.getNavigator();

// Get route information
const pageFile = navigator.getPageFile('/dashboard');

// Check if script is loaded
if (navigator.isScriptLoaded('/js/admin.js')) {
    // Admin script available
}

// Access navigation history
const history = navigator.getHistory();
```

#### `window.isProtectedRoute(route)`
Check if a route requires authentication.

```javascript
if (window.isProtectedRoute('/admin')) {
    console.log('Admin route requires auth');
}
```

#### `window.getCurrentUrl()`
Get the current URL from the navigator.

```javascript
const url = window.getCurrentUrl();
console.log('Current page:', url);
```

### Navigation Bootstrap API

The `window.navigationBootstrap` object provides meta information:

```javascript
// Check if navigation is ready
if (window.navigationBootstrap.isReady()) {
    console.log('Navigation system is ready');
}

// Wait for navigation to be ready (if loading late)
await window.navigationBootstrap.waitForReady();

// Get the bootstrap version
console.log('Bootstrap version:', window.navigationBootstrap.version);
```

### Events

The navigation system fires events that you can listen to:

```javascript
// When navigation system is ready
document.addEventListener('navigationSystemReady', () => {
    console.log('Navigation system ready');
});

// When navigation state changes
window.addEventListener('navigationStateChanged', (e) => {
    console.log('Navigation changed to:', e.detail.url);
});

// When page navigation is ready (on page load)
window.addEventListener('pageNavigationReady', (e) => {
    console.log('Page navigation ready', e.detail);
});
```

### Using in Page HTML

All pages automatically get the navigation system initialized. Just use it:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Page</title>
    <!-- Include bootstrap script early -->
    <script src="/js/navigation-bootstrap.js"></script>
</head>
<body>
    <!-- Your page content -->
    
    <!-- Your scripts -->
    <script>
        // This will work - navigation is available
        document.getElementById('myButton').addEventListener('click', () => {
            window.navigateTo('/products');
        });
    </script>
</body>
</html>
```

### Using in Page-Specific Scripts

For page-specific JavaScript files:

```javascript
// pages/my-awesome-page.js

// Wait for navigation to be ready
window.navigationBootstrap.waitForReady().then(() => {
    // Now navigation is guaranteed to be available
    
    // Setup navigation for your page
    document.querySelectorAll('[data-nav-link]').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            const url = el.getAttribute('href');
            window.navigateTo(url);
        });
    });
});

// Or use the pageNavigationReady event
window.addEventListener('pageNavigationReady', () => {
    // Initialize your page
    setupFilters();
    setupSearch();
});
```

### Link Handling

All internal links are automatically intercepted and handled by the navigation system:

```html
<!-- These links will use SPA navigation automatically -->
<a href="/products">Browse Products</a>
<a href="/cart">View Cart</a>
<a href="/admin">Admin Panel</a>

<!-- These links will NOT be intercepted (use normal navigation) -->
<a href="https://external-site.com">External Link</a>
<a href="mailto:support@example.com">Email Us</a>
<a href="/file.pdf" download>Download PDF</a>

<!-- Explicitly opt-out of navigation (if needed) -->
<a href="/special-page" data-no-navigate="true">Special Link</a>
```

### Authentication & Protected Routes

Protected routes automatically check for authentication:

```javascript
// These routes require a valid token
const protectedRoutes = [
    '/dashboard',
    '/admin',
    '/profile',
    '/orders',
    '/messages',
    // ... etc
];

// If user tries to navigate to protected route without token:
// 1. Router checks for token in localStorage
// 2. If no token, redirects to /login
// 3. If token exists, loads the page
// 4. Page-level role checks via RoleManager (if available)

// Your page can respond to auth changes
document.addEventListener('authStateChanged', () => {
    // User logged in/out
    window.navigateTo('/'); // Redirect to home
});
```

### Role-Based Access

The system integrates with RoleManager for fine-grained access:

```javascript
// RoleManager is optional but recommended
window.addEventListener('pageNavigationReady', async () => {
    // Check role-based access
    if (window.roleManager) {
        const canAccess = await window.roleManager.canAccessRoute('/admin');
        
        if (!canAccess) {
            console.log('Access denied');
            window.navigateTo('/dashboard');
        }
    }
});
```

### Script Management

The navigation system ensures scripts are only loaded once:

```javascript
// NavigationCoordinator tracks all loaded scripts globally
const navigator = window.getNavigator();

// Check if a script is loaded
if (navigator.isScriptLoaded('/js/admin-dashboard.js')) {
    // Script already available
    AdminDashboard.initialize();
}

// Register a script when it loads
window.addEventListener('load', () => {
    navigator.registerScriptLoaded('/js/my-async-script.js');
});
```

### Common Patterns

#### Pattern 1: Simple Page Navigation
```javascript
// In onclick handlers or event listeners
button.addEventListener('click', () => {
    window.navigateTo('/products?category=electronics');
});
```

#### Pattern 2: Conditional Navigation
```javascript
const token = localStorage.getItem('token');

if (token) {
    window.navigateTo('/dashboard');
} else {
    window.navigateTo('/login');
}
```

#### Pattern 3: Page Initialization
```javascript
// Initialize your page when navigation is ready
window.addEventListener('pageNavigationReady', () => {
    // Initialize page components
    initSearch();
    initFilters();
    loadProducts();
});

function initSearch() {
    // Search component initialization
}

function initFilters() {
    // Filter component initialization
}

function loadProducts() {
    // Load product data
}
```

#### Pattern 4: Programmatic Navigation with Error Handling
```javascript
async function navigate(url) {
    try {
        console.log('Navigating to:', url);
        await window.navigateTo(url);
        console.log('Navigation successful');
    } catch (error) {
        console.error('Navigation failed:', error);
        // Show error to user
        showNotification('Failed to navigate. Please try again.', 'error');
    }
}
```

### System Architecture

```
Page Load
    ↓
navigation-bootstrap.js loads
    ↓
Click interception setup
    ↓
navigation-coordinator.js loads
    ↓
router.js loads
    ↓
Navigation system ready
    ↓
pageNavigationReady event fires
    ↓
Page-specific code can run
```

### Loading Order (IMPORTANT)

1. **FIRST**: `navigation-bootstrap.js` - Sets up global functions and interception
2. **SECOND**: `navigation-coordinator.js` - Core navigation logic
3. **THIRD**: `router.js` - Page loading and rendering
4. **LAST**: Page-specific scripts - Can use navigation functions

### Debugging

Enable detailed logging:

```javascript
// Enable debug mode
window.DEBUG_NAVIGATION = true;

// Then check console for detailed logs
```

Monitor navigation events:

```javascript
// Listen for all navigation events
window.addEventListener('navigationStateChanged', (e) => {
    console.log('Navigation event:', e.detail);
});

// Check router state
console.log(window.router);
console.log(window.NavigationCoordinator.getInstance());
```

### Performance Tips

1. **Lazy Load Page-Specific Scripts**
   ```javascript
   // Only load when route changes
   window.addEventListener('navigationStateChanged', (e) => {
       if (e.detail.url === '/products') {
           loadScript('/js/products-page.js');
       }
   });
   ```

2. **Cache Navigation Data**
   ```javascript
   // Use NavigationCoordinator's built-in caching
   const navigator = window.getNavigator();
   navigator.getPageFile('/dashboard'); // Cached
   ```

3. **Debounce Navigation Calls**
   ```javascript
   let navigationTimeout;
   button.addEventListener('click', () => {
       clearTimeout(navigationTimeout);
       navigationTimeout = setTimeout(() => {
           window.navigateTo('/next-page');
       }, 200);
   });
   ```

### Troubleshooting

**Problem**: "Navigation system not ready" error
```javascript
// Solution: Wait for ready
await window.navigationBootstrap.waitForReady();
window.navigateTo('/page');
```

**Problem**: Links not being intercepted
```javascript
// Check if click interception is enabled
console.log(window.__clickInterceptionSetup);

// Manually navigate if needed
window.navigateTo(url);
```

**Problem**: Scripts being loaded multiple times
```javascript
// Check loaded scripts registry
console.log(window.loadedScripts);

// Check coordinator
console.log(window.getNavigator().loadedScripts);
```

### Migration from Old System

If you're still using the old navigation system:

```javascript
// OLD (deprecated)
window.navigationStateManager?.navigate('/page');

// NEW (use this)
window.navigateTo('/page');
```

### Best Practices

1. ✅ **DO** use `window.navigateTo()` for all internal navigation
2. ✅ **DO** wait for `pageNavigationReady` event before initializing
3. ✅ **DO** check `window.isProtectedRoute()` for auth-required pages
4. ✅ **DO** let the system intercept links automatically
5. ❌ **DON'T** use `window.location.href` for internal navigation
6. ❌ **DON'T** manually manipulate `window.loadedScripts`
7. ❌ **DON'T** assume scripts are available without checking
8. ❌ **DON'T** use the deprecated `navigationStateManager`

---

**Version**: v202604081000  
**Last Updated**: 2026-04-08  
**Status**: Production Ready
