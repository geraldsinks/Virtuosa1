# Page Initialization Guide for SPA Navigation

## Problem
When using SPA navigation (single-page application), pages load dynamically without full page reloads. This means:
- The `DOMContentLoaded` event fires only once, on initial page load
- When navigating between pages, `DOMContentLoaded` **will not fire again**
- Page initialization code that depends on `DOMContentLoaded` won't run on subsequent navigations
- This causes pages to not display properly until you manually refresh

## Solution: Use `window.onPageReady()`

Instead of:
```javascript
document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
    loadData();
});
```

Use:
```javascript
window.onPageReady(() => {
    initializeForm();
    loadData();
});
```

## How It Works

`window.onPageReady()` is a helper function that runs your initialization code:
1. **On initial page load** - When `DOMContentLoaded` fires
2. **On SPA navigation** - When you navigate to this page via `window.navigateTo()`
3. **On browser back/forward** - When the browser history changes

## Step-by-Step Conversion

### Before (Broken on SPA navigation):
```html
<script>
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.querySelector('#loginForm');
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }
    });
</script>
```

### After (Works on SPA navigation):
```html
<script>
    window.onPageReady(() => {
        const form = document.querySelector('#loginForm');
        if (form) {
            form.addEventListener('submit', handleSubmit);
        }
    });
</script>
```

## Common Initialization Patterns

### Pattern 1: Form Setup
```javascript
window.onPageReady(() => {
    // Setup form elements
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', validateInput);
    });
});
```

### Pattern 2: Data Loading
```javascript
window.onPageReady(async () => {
    // Load data from API
    const data = await fetch('/api/products').then(r => r.json());
    renderData(data);
});
```

### Pattern 3: Multiple Initializations
```javascript
window.onPageReady(() => {
    initializeHeader();
    initializeForm();
    setupEventListeners();
    loadUserData();
});
```

### Pattern 4: Async Operations
```javascript
window.onPageReady(async () => {
    try {
        const user = await fetchUser();
        const products = await fetchProducts();
        render(user, products);
    } catch (error) {
        console.error('Failed to load page:', error);
    }
});
```

## Key Differences

| Aspect | `DOMContentLoaded` | `window.onPageReady()` |
|--------|-------------------|----------------------|
| Initial Load | ✅ Works | ✅ Works |
| SPA Navigation | ❌ Doesn't work | ✅ Works |
| Back/Forward | ❌ Doesn't work | ✅ Works |
| Fires Multiple Times | ❌ Once | ✅ Every navigation |
| Guaranteed DOM Ready | ✅ Yes | ✅ Yes |
| Guaranteed Scripts Loaded | ❌ Not always | ✅ Yes |

## Migration Checklist

For each page that needs fixes:

1. Find all `document.addEventListener('DOMContentLoaded', ...)` calls
2. Replace with `window.onPageReady(() => { ... })`
3. Test by:
   - Loading the page normally (should work)
   - Navigating to it via a link (should work without refresh)
   - Using browser back button (should work without refresh)
   - Using browser forward button (should work without refresh)

## Testing Your Changes

### Before (bad):
1. Go to `/products` - works
2. Click "Sign In" - page doesn't load until Ctrl+F5 ❌

### After (good):
1. Go to `/products` - works
2. Click "Sign In" - page loads immediately ✅
3. Click back button - home page loads immediately ✅

## Advanced: Both DOMContentLoaded and Navigation

If you need different initialization for different scenarios:

```javascript
// Run on both initial load AND navigation
window.onPageReady(() => {
    initializeCommonElements();
});

// Run only on initial page load
document.addEventListener('DOMContentLoaded', () => {
    // Analytics, first-time setup, etc.
    trackPageView();
});

// Run only on SPA navigation (not initial load)
window.addEventListener('pageNavigationReady', () => {
    // Reset page state, reload user-specific data
    resetFormState();
});
```

## Events Available

After page navigation, these events are fired (in order):

1. **Scripts Execute** - All page scripts run
2. **pageNavigationReady** - Fires when page is fully ready
   - Listen with: `window.addEventListener('pageNavigationReady', () => {...})`
   - Or use: `window.onPageReady(() => {...})`

## Debugging

If your page still doesn't load properly on navigation:

1. Open browser console (F12)
2. Look for errors in the console
3. Check that your initialization code is using `window.onPageReady()`
4. Check that all DOM selectors (e.g., `document.querySelector()`) find elements
5. Verify external scripts are loading (network tab)

### Common Issues

**Issue**: "Cannot read property 'addEventListener' of null"
- **Cause**: Your selector isn't finding the element
- **Fix**: Make sure selectors match the page HTML

**Issue**: Data not loading on navigation
- **Cause**: Using `DOMContentLoaded` instead of `window.onPageReady()`
- **Fix**: See conversion examples above

**Issue**: Event listeners not working after navigation
- **Cause**: Not re-attaching listeners in initialization
- **Fix**: Put all event attachment code in `window.onPageReady()`

## Reference

```javascript
// The new way - use this everywhere
window.onPageReady(() => {
    // Your initialization code here
    // Runs on:
    // 1. Initial page load
    // 2. SPA navigation to this page
    // 3. Browser back/forward
});

// Optional: Also listen for navigation event directly
window.addEventListener('pageNavigationReady', (event) => {
    console.log('Page loaded:', event.detail.pageFile);
});
```

## Files Already Using New Pattern

These files have been updated to use `window.onPageReady()`:
- (To be filled as pages are updated)

## Files Needing Update

To convert your pages, search for `DOMContentLoaded` and convert as shown above.
