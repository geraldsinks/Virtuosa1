const fs = require('fs');
const path = require('path');

const pagesDir = 'c:/Users/HP USER/Desktop/Virtuosa/client/pages';
const indexFile = 'c:/Users/HP USER/Desktop/Virtuosa/client/index.html';

// Pages that keep the search bar
const productPages = ['products.html', 'product-detail.html', 'index.html'];

function processHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const filename = path.basename(filePath);

    // 1. Hide user greeting
    content = content.replace(
        /<span id="user-greeting"><\/span>/g,
        '<span id="user-greeting" class="hidden md:inline"></span>'
    );
    content = content.replace(
        /<span id="user-greeting" class="text-white font-medium"><\/span>/g,
        '<span id="user-greeting" class="text-white font-medium hidden md:inline"></span>'
    );
    // If it has other classes
    if (content.match(/<span id="user-greeting" class="([^"]*)"><\/span>/)) {
        content = content.replace(
            /<span id="user-greeting" class="([^"]*)"><\/span>/g,
            (match, classes) => {
                if (!classes.includes('hidden md:inline')) {
                    return `<span id="user-greeting" class="${classes} hidden md:inline"></span>`;
                }
                return match;
            }
        );
    }

    // 2. Remove search bar if non-product page
    if (!productPages.includes(filename)) {
        // Try to match the flex-grow desktop search div
        const searchRegex1 = /<div class="flex-grow max-w-lg md:mx-auto order-3 md:order-2 w-full md:w-auto">[\s\S]*?<\/div>\s*<\/div>\s*<div id="user-info-container"/;
        if (searchRegex1.test(content)) {
            content = content.replace(
                /<div class="flex-grow max-w-lg md:mx-auto order-3 md:order-2 w-full md:w-auto">[\s\S]*?<\/div>\s*<\/div>/,
                ''
            );
        }

        // Try to match .v-header-search desktop div
        const searchRegex2 = /<div class="v-header-search"[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<div id="user-info-container"/;
        if (searchRegex2.test(content)) {
            // we have to carefully match opening/closing tags or just use standard regex
            content = content.replace(
                /<div class="v-header-search"[^>]*>(?:<div[^>]*>[\s\S]*?<\/div>\s*<\/div>|<div[^>]*>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)<\/div>/,
                ''
            );
            // This regex might be brittle, let's just make it simpler
            content = content.replace(/<div class="v-header-search"[^>]*>[\s\S]*?<\/div>\s*<div id="user-info-container"/, '<div id="user-info-container"');
        }

        const searchRegex3 = /<div class="v-header-search"[^>]*>[\s\S]*?<\/div>\s*<div id="user-info-container"/;
        if (searchRegex3.test(content)) {
            content = content.replace(
                /<div class="v-header-search"[^>]*>[\s\S]*?<\/div>\s*<div id="user-info-container"/,
                '<div id="user-info-container"'
            );
        }
    }

    fs.writeFileSync(filePath, content, 'utf8');
}

// Process index
if (fs.existsSync(indexFile)) {
    processHtmlFile(indexFile);
}

// Process all pages
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
for (const file of files) {
    const filePath = path.join(pagesDir, file);
    processHtmlFile(filePath);
}

console.log('Update complete.');
