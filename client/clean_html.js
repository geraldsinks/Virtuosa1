const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/HP USER/Desktop/Virtuosa/client';
const pagesDir = path.join(baseDir, 'pages');

function cleanHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Remove the internal <style> block that contains @media (min-width: 768px) with absolute positioning
    // We search for the specific pattern the user added
    content = content.replace(/<style>[\s\S]*?Force header alignment override all other styles[\s\S]*?<\/style>/g, '');

    // 2. Remove inline style attributes in the header container
    // Match <div class="v-container v-header-row desktop-header" style="...">
    content = content.replace(/(<div class="v-container v-header-row desktop-header") style="[^"]*"/g, '$1');

    // 3. Remove inline style attributes in logo
    content = content.replace(/(<div class="flex items-center v-header-logo") style="[^"]*"/g, '$1');

    // 4. Remove inline style attributes in search
    content = content.replace(/(<div class="v-header-search") style="[^"]*"/g, '$1');

    // 5. Remove inline style attributes in actions
    content = content.replace(/(<div id="user-info-container" class="flex items-center space-x-4 v-header-actions") style="[^"]*"/g, '$1');

    // 6. Fix nav container alignment (if it has inline style)
    content = content.replace(/(<div class="container mx-auto flex items-center") style="[^"]*"/g, '$1');
    content = content.replace(/(<div class="flex items-center space-x-4 md:space-x-8") style="[^"]*"/g, '$1');

    // 7. Ensure mobile rows exist (already there in index.html, but let's check class consistency)
    // No-op for now as index.html has them.

    fs.writeFileSync(filePath, content, 'utf8');
}

// Clean index.html
const indexFile = path.join(baseDir, 'index.html');
if (fs.existsSync(indexFile)) {
    console.log('Cleaning index.html...');
    cleanHtmlFile(indexFile);
}

// Clean all pages
if (fs.existsSync(pagesDir)) {
    const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
    for (const file of files) {
        console.log(`Cleaning ${file}...`);
        cleanHtmlFile(path.join(pagesDir, file));
    }
}

console.log('HTML cleanup complete.');
