# Navigation System - Quick Reference Card
**Version**: v202604081000 | **Status**: Production Ready

---

## Available Everywhere

```javascript
// Navigate to a URL
window.navigateTo('/products');

// Get current URL
const url = window.getCurrentUrl();

// Check if route needs auth
if (window.isProtectedRoute('/admin')) { }

// Get coordinator (advanced)
const nav = window.getNavigator();

// Check if ready
if (window.navigationBootstrap.isReady()) { }
```

---

## Events

```javascript
// When navigation is ready on page
window.addEventListener('pageNavigationReady', () => { });

// When overall system ready
window.addEventListener('navigationSystemReady', () => { });

// When state changes
window.addEventListener('navigationStateChanged', (e) => {
    console.log('Navigated to:', e.detail.url);
});
```

---

## Wait for System

```javascript
// In async functions
await window.navigationBootstrap.waitForReady();
window.navigateTo('/page');

// Or use event
window.addEventListener('navigationSystemReady', () => {
    window.navigateTo('/page');
});
```

---

## Links (Automatic)

```html
<!-- These auto-navigate (SPA) -->
<a href="/cart">Cart</a>
<a href="/products">Products</a>

<!-- These DON'T get intercepted -->
<a href="https://external.com">External</a>
<a href="mailto:email@example.com">Email</a>
<a href="/file.pdf" download>Download</a>

<!-- Opt-out of interception -->
<a href="/special" data-no-navigate="true">Special</a>
```

---

## Page Initialization Pattern

```javascript
// On page load
window.addEventListener('pageNavigationReady', function initPage() {
    // Initialize your components
    setupSearch();
    loadData();
    setupEventListeners();
});

// Alternative: wait for ready
window.navigationBootstrap.waitForReady().then(() => {
    initPage();
});
```

---

## Advanced: Get Navigator

```javascript
const nav = window.getNavigator();

// Check if script loaded
if (nav.isScriptLoaded('/js/admin.js')) {
    AdminModule.init();
}

// Get page file for route
const file = nav.getPageFile('/dashboard');

// View history
const history = nav.getHistory();

// URL normalization
const clean = nav.normalizeUrl('/products/');
```

---

## Protected Routes Example

```javascript
// These require authentication
const auth = localStorage.getItem('token');

if (!auth && window.isProtectedRoute(location.pathname)) {
    window.navigateTo('/login');
}
```

---

## Error Handling

```javascript
window.navigateTo('/page').catch(err => {
    console.error('Navigation failed:', err);
    
    // Fallback to direct navigation
    window.location.href = '/page';
});
```

---

## Common Tasks

### Navigate on Button Click
```javascript
button.addEventListener('click', () => {
    window.navigateTo('/next-page');
});
```

### Navigate on Form Submit
```javascript
form.addEventListener('submit', (e) => {
    e.preventDefault();
    window.navigateTo('/success');
});
```

### Conditional Navigation
```javascript
const token = localStorage.getItem('token');
const url = token ? '/dashboard' : '/login';
window.navigateTo(url);
```

### Navigate with Params
```javascript
window.navigateTo('/products?category=electronics');
```

---

## DO's & DON'Ts

✅ **DO**
- Use `window.navigateTo(url)`
- Listen for `pageNavigationReady` event
- Let links auto-intercept
- Check `isProtectedRoute()`

❌ **DON'T**
- Use `window.location.href` for internal links
- Use deprecated `navigationStateManager`
- Manually load scripts
- Modify `window.loadedScripts`

---

## System Status

```javascript
// Check everything
console.log('Ready:', window.navigationBootstrap.isReady());
console.log('Router:', !!window.router);
console.log('Coordinator:', !!window.getNavigator());
console.log('Scripts:', window.loadedScripts.size);
```

---

## Debugging

```javascript
// Enable detailed logging
window.DEBUG_NAVIGATION = true;

// Check script registry
console.log('Loaded scripts:', window.loadedScripts);

// Check coordinator
const nav = window.getNavigator();
console.log('Nav state:', nav);

// Monitor events
window.addEventListener('navigationStateChanged', (e) => {
    console.log('Navigation:', e.detail);
});
```

---

## Loading Scripts

```javascript
// The bootstrap auto-loads these:
// 1. navigation-coordinator.js
// 2. router.js
// 3. Your page scripts

// Manual check
const coord = window.NavigationCoordinator?.getInstance?.();
const router = window.router;
```

---

## Browser Compatibility

✅ Chrome 90+  
✅ Firefox 88+  
✅ Safari 14+  
✅ Edge 90+  
✅ Mobile browsers (all modern)

---

## Performance Tips

```javascript
// Lazy load page scripts
if (url === '/admin') {
    loadScript('/js/admin-dashboard.js');
}

// Debounce navigation
let timer;
button.addEventListener('click', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
        window.navigateTo('/page');
    }, 200);
});
```

---

## Links & Resources

- Full Guide: `NAVIGATION_USAGE_GUIDE.md`
- Architecture: `NAVIGATION_SYSTEM_FIXED.md`
- Deployment: `GLOBAL_NAVIGATION_DEPLOYMENT.md`
- Template: `pages/master-template.html`

---

**Quick Support**: Check console for error messages or see full guide above.
