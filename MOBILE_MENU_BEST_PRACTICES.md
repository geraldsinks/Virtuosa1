# Production-Grade Mobile Menu - Best Practices Guide

## What's Implemented in Unified Header

The unified header system includes production-grade mobile menu with:

### 🎯 User Experience
- **Smooth Open/Close Animations** - CSS transform for 60fps performance
- **Auto-Close on Navigation** - Seamless page transitions
- **Overlay Backdrop** - Clear visual context
- **Proper Z-Stacking** - Menu always visible (z-50), backdrop (z-40)
- **Touch Feedback** - Hover states on touch targets
- **Escape Key Support** - Close menu with ESC

### ♿ Accessibility (WCAG 2.1 AA)
- **ARIA Labels** - All interactive elements labeled
- **Role Attributes** - Proper semantic HTML roles
- **Keyboard Navigation** - Full keyboard support
- **Focus Management** - Logical tab order
- **Screen Reader Support** - Announcements and labels
- **Semantic Structure** - Proper heading hierarchy

### 📱 Mobile Best Practices
- **Touch Targets** - Minimum 44x44px (iOS standard)
- **Proper Spacing** - 16px padding for comfortable touch
- **No Hover Dependency** - Works on touch devices
- **Responsive Layout** - Adapts to screen size
- **Performance** - Hardware-accelerated animations
- **Scroll Management** - Prevents body scroll when open

### 🚀 Performance
- **Hardware Acceleration** - Uses CSS transforms (GPU)
- **Minimal Reflows** - Efficient DOM updates
- **Event Delegation** - Single listener per menu
- **Lazy Initialization** - Only on first use
- **Memory Management** - Proper cleanup on close
- **CSS-Based Animations** - Not JavaScript

### 🔒 Security
- **XSS Prevention** - Proper escaping of user content
- **CSRF Protection** - Token-based navigation
- **Link Validation** - Prevents navigation to unsafe URLs
- **Session Check** - Validates auth before showing sections

---

## Technical Implementation Details

### Structure

```html
<!-- Menu Overlay (Backdrop) -->
<div id="mobile-menu-overlay" 
     class="fixed inset-0 bg-black bg-opacity-50 hidden z-40"
     aria-hidden="true"
     onclick="closeMobileMenu()">
</div>

<!-- Menu Content (Drawer) -->
<div id="mobile-menu-content" 
     class="fixed top-0 left-0 w-80 h-screen bg-navy text-white
            z-50 transform -translate-x-full transition-transform"
     role="navigation" 
     aria-label="Main menu">
    
    <div class="sticky top-0 bg-navy border-b border-gray-800 p-4">
        <button id="mobile-menu-close" aria-label="Close menu">
            <i class="fas fa-times"></i>
        </button>
    </div>

    <!-- Menu Sections -->
    <div class="py-4">
        <div class="mobile-menu-section">
            <!-- Links with proper touch targets -->
            <a href="/link" 
               class="px-4 py-2 flex items-center text-gray-200 
                      hover:text-gold hover:bg-gray-800 transition-colors"
               role="menuitem">
                <i class="fas fa-icon mr-3 w-5 text-center"></i>
                <span>Label</span>
            </a>
        </div>
    </div>
</div>
```

### CSS Animation (GPU Accelerated)

```css
/* Menu drawer animation */
#mobile-menu-content {
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    /* will-change: transform; */ /* Use sparingly */
}

#mobile-menu-content.open {
    transform: translateX(0);
}

/* Backdrop fade */
#mobile-menu-overlay {
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
}

#mobile-menu-overlay.open {
    opacity: 1;
    pointer-events: auto;
}
```

### JavaScript Lifecycle

```javascript
// 1. Open Menu
function openMenu() {
    overlay.classList.add('open');
    drawer.classList.add('open');
    document.body.style.overflow = 'hidden'; // Prevent body scroll
    button.setAttribute('aria-expanded', 'true');
}

// 2. User interacts with menu
menu.addEventListener('click', handleMenuClick);

// 3. User clicks link
link.addEventListener('click', () => {
    // Auto-close (happens before navigation)
    closeMenu();
    // Navigation happens after animation
});

// 4. Close Menu
function closeMenu() {
    overlay.classList.remove('open');
    drawer.classList.remove('open');
    document.body.style.overflow = '';
    button.setAttribute('aria-expanded', 'false');
}
```

---

## Mobile Menu Sections (Unified System)

### 1. Account Section (Auth-Aware)

**Logged Out:**
```
Account
├── Sign In
├── My Profile (grayed out)
├── Dashboard (grayed out)
├── My Orders (grayed out)
└── Transactions (grayed out)
```

**Logged In:**
```
Account
├── Sign Out
├── My Profile
├── Dashboard
├── My Orders
└── Transactions
```

**Instant Sync:** When user logs in/out, menu updates immediately without page reload.

### 2. Shopping Section

```
Shopping
├── Home
├── All Products
├── Hot Deals
├── Become a Seller (or "My Shop" if already seller)
```

### 3. Seller Section (Conditional)

```
Selling (Only shown to sellers)
├── My Shop
└── Create Product
```

### 4. Admin Section (Conditional)

```
Administration (Only shown to admins)
└── Admin Dashboard
```

### 5. Support Section

```
Support
├── Help Center
└── Contact Us
```

---

## Interaction Patterns

### Pattern 1: Hamburger Menu

```
Mobile View (320px - 767px)
┌─────────────────┐
│ ☰  Logo  🔔 💳  │  ← Header row 1
├─────────────────┤
│ 🔍 Search...   │  ← Header row 2 (search-first)
├─────────────────┤
│ Main Content    │
└─────────────────┘

When hamburger clicked:
- Overlay appears (semi-transparent black)
- Drawer slides in from left
- Body scroll disabled
- User can click links or close button
```

### Pattern 2: Close Gestures

Users can close menu by:
1. **Clicking close button** (X icon)
2. **Clicking backdrop** (overlay)
3. **Pressing ESC key** (keyboard)
4. **Tapping a menu link** (auto-close)
5. **Swiping left** (optional feature)

### Pattern 3: Smooth Scroll

When menu is open:
- Body scroll is disabled: `document.body.style.overflow = 'hidden'`
- Menu itself is scrollable if content > viewport
- Momentum scrolling works on iOS: `-webkit-overflow-scrolling: touch`

---

## Badge System (Real-Time Updates)

### Notification Badges

```html
<!-- Desktop -->
<span id="notification-badge-count" class="badge hidden">5</span>

<!-- Mobile -->
<span id="mobile-notification-badge" class="badge hidden">5</span>
```

**Update Logic:**
```javascript
async function updateNotificationBadges() {
    const response = await fetch(`${API_BASE}/notifications/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const { unreadCount } = await response.json();
    
    // Update all badge instances
    document.querySelectorAll('[id*="notification-badge"]').forEach(badge => {
        badge.textContent = unreadCount;
        badge.classList.toggle('hidden', unreadCount === 0);
    });
}

// Auto-refresh every 30 seconds
setInterval(updateNotificationBadges, 30000);

// Also update on auth state change
document.addEventListener('authStateChanged', updateNotificationBadges);
```

---

## auth State Synchronization

### The Problem (Before)
```
Tab 1: Login → Header updates ✓
Tab 2: Still shows "Sign In" ✗
Tab 3: Still shows "Sign In" ✗
Tab 1: Navigate to new page → Re-render ✓
Tab 2: Still shows "Sign In" ✗
```

### The Solution (After)
```
Tab 1: Login → localStorage updated
       ↓
All Tabs: Listen to storage event → Update immediately
       ↓
Tab 1: Shows "Sign Out" ✓
Tab 2: Shows "Sign Out" ✓
Tab 3: Shows "Sign Out" ✓

The same works for:
- Notification count
- Cart count
- User roles
- Admin/Seller visibility
```

**Implementation:**
```javascript
// Listen for storage changes from other tabs
window.addEventListener('storage', (event) => {
    if (event.key === 'token') {
        // Token changed in another tab
        initializeAuthState();
    }
});

// Custom event for same-tab changes
document.addEventListener('authStateChanged', () => {
    initializeAuthState();
});

// When user logs in/out
function logout() {
    localStorage.clear();
    // Dispatch event to all listeners
    window.dispatchEvent(new StorageEvent('storage', {
        key: 'token',
        newValue: null
    }));
    document.dispatchEvent(new CustomEvent('authStateChanged'));
}
```

---

## Accessibility Checklist

### Keyboard Navigation
- [ ] Menu opens/closes with keyboard
- [ ] All links are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus is visible
- [ ] ESC key closes menu

### Screen Reader
- [ ] Menu has `role="navigation"`
- [ ] Close button has `aria-label`
- [ ] Links have descriptive labels
- [ ] Active state announced
- [ ] Toggle button has `aria-expanded`

### Touch/Motor
- [ ] Touch targets are ≥44x44px
- [ ] Sufficient spacing (16px minimum)
- [ ] No hover-only interactions
- [ ] Proper contrast (4.5:1 minimum)
- [ ] No seizure-inducing animations (< 3Hz)

### Cognitive
- [ ] Consistent menu structure
- [ ] Clear labels
- [ ] Logical grouping (sections)
- [ ] No duplicate links
- [ ] Clear visual hierarchy

---

## Performance Checklist

### Rendering
- [ ] Uses CSS transforms (GPU accelerated)
- [ ] No reflows during animation
- [ ] Event delegation used
- [ ] Efficient event listeners

### Loading
- [ ] Menu code ~5KB gzipped
- [ ] Loads with rest of header
- [ ] No blocking scripts
- [ ] No font blocking

### Runtime
- [ ] Smooth 60fps animations
- [ ] No jank during scroll
- [ ] Fast open/close (< 300ms)
- [ ] Minimal memory usage

---

## Testing Guide

### Manual Testing

```bash
# Test 1: Mobile View
1. Open DevTools → Device mode
2. Set viewport to 375x667 (iPhone SE)
3. Tap hamburger menu
4. Verify menu slides in smoothly
5. Tap close button
6. Verify menu slides out smoothly

# Test 2: Sign In/Out
1. Start logged out → "Sign In" visible
2. Sign in → Reload page
3. Verify "Sign Out" visible in menu
4. Click "Sign Out"
5. Verify "Sign In" visible again

# Test 3: Navigation
1. Open menu
2. Click a link
3. Verify menu closes
4. Verify page navigates correctly

# Test 4: Overlay
1. Open menu
2. Click backdrop (overlay)
3. Verify menu closes

# Test 5: Keyboard
1. Open menu with Tab to button, then Enter
2. Navigate with Tab key
3. Close with ESC key

# Test 6: Badges
1. Log in
2. Verify notification count shows
3. Wait 30 seconds
4. Verify count updates
```

### Automated Testing (Playwright)

```javascript
test('Mobile menu opens and closes', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Click hamburger
    await page.click('#mobile-menu-toggle');
    
    // Verify menu visible
    const menu = await page.locator('#mobile-menu-content');
    await expect(menu).toHaveClass(/open|translate-x-0/);
    
    // Click close
    await page.click('#mobile-menu-close');
    
    // Verify menu hidden
    await expect(menu).toHaveClass(/-translate-x-full/);
});
```

---

## Browser Compatibility

| Feature | IE11 | Edge | Chrome | Firefox | Safari |
|---------|------|------|--------|---------|--------|
| Transform animations | ✓ | ✓ | ✓ | ✓ | ✓ |
| ARIA labels | ✓ | ✓ | ✓ | ✓ | ✓ |
| Storage events | ✓ | ✓ | ✓ | ✓ | ✓ |
| CSS Grid (menu) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Flexbox | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## Common Customizations

### Change Menu Width
```css
#mobile-menu-content {
    width: 300px; /* Default: 320px */
}
```

### Change Animation Speed
```css
#mobile-menu-content {
    transition: transform 0.5s ease; /* Default: 0.3s */
}
```

### Add Swipe to Close
```javascript
let startX = 0;
drawer.addEventListener('touchstart', e => startX = e.touches[0].clientX);
drawer.addEventListener('touchend', e => {
    const diff = startX - e.changedTouches[0].clientX;
    if (diff > 50) closeMenu(); // Swipe left to close
});
```

### Add Nested Menus
```html
<details class="mobile-menu-section">
    <summary>Categories</summary>
    <ul>
        <li><a href="/electronics">Electronics</a></li>
        <li><a href="/books">Books</a></li>
    </ul>
</details>
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Menu not opening | Check z-index of overlay (should be z-40), drawer (z-50) |
| Body still scrolls | Ensure `overflow: hidden` is set on `document.body` |
| Animation is janky | Check for reflows in event handlers, use `requestAnimationFrame` |
| Can't close menu | Verify close button click handler is attached |
| Menu content cut off | Increase drawer width, use scrollable container |
| Links don't work | Verify href attributes, check router is loaded |
| Badges don't update | Check API endpoint, verify token is valid |

---

## Production Deployment Checklist

- [ ] All pages use unified header
- [ ] Mobile menu tested on real devices
- [ ] Accessibility audit passed (WAVE, axe)
- [ ] Performance audit passed (Lighthouse)
- [ ] Cross-browser testing done
- [ ] Load testing completed
- [ ] Error tracking setup
- [ ] User feedback collected
- [ ] Analytics tracking enabled
- [ ] Documentation updated

