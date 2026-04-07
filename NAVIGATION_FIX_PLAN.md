# Navigation System Fix Plan

## Goal
Stabilize the SPA navigation stack for Virtuosa so navigation works consistently in production:
- Prevent duplicate page loads and bad back/forward behavior
- Ensure clean URLs stay intact and deep links work
- Guarantee page content/scripts load fully after navigation
- Keep the unified header inserted and updated correctly
- Resolve broken multinavigation and race conditions

## Critical files
- `client/js/router.js`
- `client/js/url-helper.js`
- `client/js/navigation-state-manager.js`
- `client/js/unified-header-fixed.js`
- `client/js/roleManager.js`

## Root causes identified
1. Duplicate navigation interception and conflicting event handlers across multiple modules.
2. `history.pushState` used without normalization or duplicate-state checks, causing back button loops.
3. Clean URL conversion is partial and inconsistent between static header links and dynamic content.
4. Dynamic page loads do not always reinitialize page scripts or header state after injection.
5. Fallback and protected-route logic is incomplete or references undefined variables.
6. Header injection timing is fragile and may skip initialization on non-auth pages.
7. Role-based page access is not reliably awaited before route rendering.

## Proposed fix strategy

### 1. Centralize navigation control
- Use `navigation-state-manager.js` as the single SPA navigation entrypoint.
- Remove or disable redundant click handlers in `router.js` and `unified-header-fixed.js` once the central manager is active.
- Ensure all internal anchor clicks and programmatic navigations flow through `NavigationStateManager.navigate(url)`.

### 2. Normalize and deduplicate history updates
- Add a `normalizePath()` helper in `router.js`/`navigation-state-manager.js`.
- Prevent `history.pushState` when navigating to the current URL.
- Use `history.replaceState` only when reacting to browser back/forward or redirecting.
- Keep `currentUrl` and `expectedUrl` synced and avoid state mismatch.

### 3. Repair clean URL mapping and routing logic
- Unify route definitions between `router.js` and `url-helper.js`.
- Make `URLHelper.getCleanUrl()` support relative paths, query mappings, and `window.router.routes` as the source of truth.
- Ensure all page links in the header and content are rewritten to clean paths after every render.
- Fix dynamic route parsing for patterns like `/product/:id` and `/seller/:shop`.

### 4. Fix page loading and script execution
- In `router.js`, consolidate `navigate()`, `loadPage()`, and `loadContentDynamically()`.
- Ensure fetched HTML is parsed and rendered safely, with `main` content replacement and title updates.
- Re-run script initialization hooks after content swap (router click interceptors, mobile menu, header link updates).
- Add a robust `executeScripts(doc)` or equivalent script hydration path.

### 5. Stabilize unified header behavior
- Ensure `unified-header-fixed.js` injects the header only once and only on non-auth pages.
- Use a mutation observer to update clean URLs for newly injected header/menu markup.
- Prefer SPA navigation for header links through the router rather than direct `window.location.href` where possible.
- Add fallback safeguards to let header initialization degrade gracefully if UI injection fails.

### 6. Harden protected-route / role-based navigation
- Use `roleManager.initialize()` before protected routes are enforced.
- Add an explicit `canAccessRoute(route)` method in `roleManager.js` or `router.js`.
- Avoid redirect loops by checking current route and login state before calling `navigate('/login')`.

### 7. Improve error handling and fallback behavior
- Fix `FallbackManager.executeFallback()` to call the computed fallback route, not an undefined variable.
- Add logging around failed fetches, bad URL states, and aborted navigations.
- Keep a small navigation retry/backoff strategy if a page load fails.

## File-level change plan

### `client/js/router.js`
- Add path normalization and canonical route mapping helpers.
- Fix route resolution for dynamic routes and fallback page path selection.
- Ensure `navigate()` does not push duplicate states for the same URL.
- Add or tighten `executeScripts(doc)` to support script initialization after AJAX page loads.
- Repair `FallbackManager.executeFallback()` and replace undefined `fallbackRoute`.

### `client/js/url-helper.js`
- Make clean URL rewrite deterministic and safe.
- Ensure `updatePageLinks()` handles both static `.html` anchors and query-based category links.
- Use `window.router.routes` when available.
- Add safeguards for external or malformed URLs.

### `client/js/navigation-state-manager.js`
- Centralize click interception and browser navigation handling.
- Add duplicate-navigation prevention and pending-navigation cancellation.
- Ensure `popstate` loads content with `replaceState` semantics and keeps `currentUrl` accurate.
- Reinitialize router/UI state after content swaps and call `window.updateCleanLinks()`.
- Fix the `cleanupRouterConflicts()` approach so it only removes truly conflicting listeners.

### `client/js/unified-header-fixed.js`
- Ensure header injection is robust and repeatable only once.
- Use `URLHelper.updatePageLinks()` after content injection.
- Add an observer for dynamic header updates.
- Prefer SPA-compatible header click handling when route manager is available.

### `client/js/roleManager.js`
- Ensure role initialization is awaited before protected-route checks.
- Add a helper for route authorization, such as `canAccessRoute(route)`.
- Avoid using stale fallback state or invalid localStorage data during navigation.

## Validation & testing
- Verify that clicking internal links updates the URL without a full reload.
- Test browser back/forward behavior and confirm it lands on the correct previous page.
- Confirm deep links load the correct UI and scripts, including `/product/123` and `/dashboard`.
- Validate header injection on initial page load and after page swaps.
- Verify protected pages redirect to `/login` only when unauthenticated.
- Test clean URL rewriting for both header links and dynamically inserted anchors.
- Check for console errors, broken UI fragments, and missing functionality after navigation.

## Next step
Implement the above fixes in the identified files, starting with `client/js/navigation-state-manager.js` and `client/js/router.js` to establish a stable centralized navigation flow.
