const fs = require('fs');
const path = require('path');

const cssPath = 'c:/Users/HP USER/Desktop/Virtuosa/client/css/style.css';
const pagesDir = 'c:/Users/HP USER/Desktop/Virtuosa/client/pages';

// 1. Fix CSS Overlap
let cssContent = fs.readFileSync(cssPath, 'utf8');

// Replace logo absolute positioning
cssContent = cssContent.replace(
    /header \.v-header-row \.v-header-logo \{[\s\S]*?z-index: 10 !important;\s*\}/,
    `header .v-header-row .v-header-logo {
        display: flex !important;
        align-items: center !important;
        flex-shrink: 0 !important;
        position: relative !important;
        z-index: 10 !important;
    }`
);

// Replace actions absolute positioning
cssContent = cssContent.replace(
    /header \.v-header-row \.v-header-actions \{[\s\S]*?z-index: 10 !important;\s*\}/,
    `header .v-header-row .v-header-actions {
        display: flex !important;
        align-items: center !important;
        flex-shrink: 0 !important;
        position: relative !important;
        z-index: 10 !important;
    }`
);

fs.writeFileSync(cssPath, cssContent, 'utf8');

// 2. Fix inline HTML JS and Header Wrapping
function processHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Fix inline auth UserGreeting remove('hidden')
    content = content.replace(/userGreeting\.classList\.remove\('hidden'\);/g, "userGreeting.classList.add('hidden', 'md:inline');");
    
    // Fix inline auth UserGreeting add('hidden') when logging out
    content = content.replace(/userGreeting\.classList\.add\('hidden'\);/g, "userGreeting.classList.add('hidden');\n                    if(userGreeting.classList.contains('md:inline')) userGreeting.classList.remove('md:inline');");

    // Add flex-nowrap to header container if it has flex-wrap or just justify-between
    // Match standard header container logic
    content = content.replace(/<header[^>]*>\s*<div class="container mx-auto flex items-center justify-between( flex-wrap)?( gap-[0-9])?"/g, 
                             '<header class="bg-navy text-white shadow-lg py-3 px-4 md:px-12 sticky top-0 z-50">\n        <div class="container mx-auto flex items-center justify-between flex-nowrap gap-2 md:gap-4"');

    // Fix any stray headers that might just have "justify-between" without the exact preceding match
    content = content.replace(/<div class="container mx-auto flex items-center justify-between">/g, 
        '<div class="container mx-auto flex items-center justify-between flex-nowrap gap-2 md:gap-4">');

    // Shrink the inline "Log Out" button for mobile so it doesn't wrap
    content = content.replace(/class="bg-button-gold text-white font-semibold py-2 px-6 rounded-full shadow-lg hover-bg-button-gold transition-colors hidden"/g,
        'class="bg-button-gold text-white font-semibold py-1.5 px-3 md:py-2 md:px-6 text-sm md:text-base rounded-full shadow-lg hover-bg-button-gold transition-colors hidden"');

    // Also adjust inline "Log In" button so it's small if it is unhidden on mobile
    content = content.replace(/class="text-white hover:text-gold transition-colors font-medium hidden md:block"/g,
        'class="text-white hover:text-gold transition-colors font-medium text-sm md:text-base hidden md:block"');

    // Update Logo text size specifically for mobile to avoid wrapping
    content = content.replace(/class="text-3xl font-bold text-gold"/g, 'class="text-xl md:text-3xl font-bold text-gold"');
    content = content.replace(/class="text-2xl font-bold text-gold"/g, 'class="text-xl md:text-3xl font-bold text-gold"');

    fs.writeFileSync(filePath, content, 'utf8');
}

// Process index
const indexFile = 'c:/Users/HP USER/Desktop/Virtuosa/client/index.html';
if (fs.existsSync(indexFile)) {
    processHtmlFile(indexFile);
}

// Process all pages
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
for (const file of files) {
    processHtmlFile(path.join(pagesDir, file));
}

console.log('Update complete.');
