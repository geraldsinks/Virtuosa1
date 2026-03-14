const fs = require('fs');
const path = require('path');

const cssPath = 'c:/Users/HP USER/Desktop/Virtuosa/client/css/style.css';
let content = fs.readFileSync(cssPath, 'utf8');

// 1. Cut the file at the first sign of corruption / start of header logic
// Looking at my previous views, everything before /* ============================== */ (line 78 approx) was fine.
// But actually line 191 "Virtuosa Mobile Header Structure" was also part of the original "good" design.
// Line 403 "Sub Navigation Category Menu" was also good.
// The mess starts where I tried to insert the Flexbox fixes.

// We'll keep everything up to line 403 (approx) if it's clean.
const lines = content.split('\n');
let cleanLines = [];
let foundMess = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Stop at the first repetition of the mobile header logic or markdown weirdness
    if (line.includes('```css') || line.includes('/* Mobile Navigation Menu (Full-screen overlay) */') && cleanLines.join('\n').includes('/* Mobile Navigation Menu (Full-screen overlay) */')) {
        foundMess = true;
        break;
    }
    // Also stop if we see the "Hide mobile-specific elements" repeated
    if (line.includes('/* Hide mobile-specific elements on desktop */') && cleanLines.join('\n').includes('/* Hide mobile-specific elements on desktop */')) {
        foundMess = true;
        break;
    }
    cleanLines.push(line);
}

// Reconstruct the clean foundation
let cleanContent = cleanLines.join('\n');

// Append the FIXED header logic
cleanContent += `
/* ============================== */
/* Final Header Layout Logic      */
/* ============================== */

/* Hide desktop header on mobile */
@media (max-width: 767px) {
    .v-header-row:not(.mobile-header-row-1):not(.mobile-header-row-2),
    .desktop-header {
        display: none !important;
    }
}

/* Show desktop header and hide mobile elements starting from tablet */
@media (min-width: 768px) {
    .mobile-header-row-1,
    .mobile-header-row-2 {
        display: none !important;
    }
    
    .v-header-row,
    .desktop-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 1.5rem !important;
        padding: 10px 1.5rem !important;
        min-height: 48px !important;
        position: relative !important;
    }
    
    header .v-header-row .v-header-logo {
        display: flex !important;
        align-items: center !important;
        flex-shrink: 0 !important;
        position: relative !important;
        z-index: 10 !important;
        margin-right: auto;
    }
    
    header .v-header-row .v-header-search {
        display: flex !important;
        align-items: center !important;
        flex: 1 1 auto !important;
        max-width: 700px !important;
        min-width: 300px !important;
        margin: 0 2rem !important;
        position: relative !important;
        z-index: 5 !important;
    }
    
    header .v-header-row .v-header-actions {
        display: flex !important;
        align-items: center !important;
        flex-shrink: 0 !important;
        position: relative !important;
        z-index: 10 !important;
        margin-left: auto;
    }
}

/* Sub Navigation Fixes */
.nav-category-menu {
    display: none;
}
@media (min-width: 768px) {
    .nav-category-menu {
        display: flex !important;
        align-items: center;
    }
}

/* Mobile overlay defaults */
#mobile-menu-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 9999;
    display: none;
    overflow-y: auto;
}
#mobile-menu-overlay.active {
    display: block;
}

/* Utility classes at end */
:root {
    --v-touch: 44px;
}
.v-touch {
    min-width: var(--v-touch);
    min-height: var(--v-touch);
    display: inline-flex;
    align-items: center;
    justify-content: center;
}
`;

fs.writeFileSync(cssPath, cleanContent, 'utf8');
console.log('Sanitization complete.');
