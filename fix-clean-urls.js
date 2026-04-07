/**
 * Clean URL Fix Script - Batch Update All HTML Files
 * This script updates all HTML files to use the correct clean URL system
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    clientDir: './client',
    oldScripts: [
        '<script src="/js/unified-header.js" defer></script>',
        '<script src="/js/production-router.js" defer></script>',
        '<script src="js/unified-header.js" defer></script>',
        '<script src="js/production-router.js" defer></script>'
    ],
    newScripts: `
    <!-- Clean URL System -->
    <script src="/js/navigation-state-manager.js"></script>
    <script src="/js/unified-header-fixed.js" defer></script>
    <script src="/js/url-helper.js" defer></script>
    <script src="/js/router.js" defer></script>`,
    
    // Alternative for pages that don't need full router
    newScriptsSimple: `
    <!-- Clean URL System -->
    <script src="/js/navigation-state-manager.js"></script>
    <script src="/js/unified-header-fixed.js" defer></script>
    <script src="/js/url-helper.js" defer></script>`
};

function findHtmlFiles(dir) {
    const files = [];
    
    function traverse(currentDir) {
        const items = fs.readdirSync(currentDir);
        
        for (const item of items) {
            const fullPath = path.join(currentDir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                traverse(fullPath);
            } else if (item.endsWith('.html')) {
                files.push(fullPath);
            }
        }
    }
    
    traverse(dir);
    return files;
}

function updateHtmlFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // Check if file already has the new scripts
        if (content.includes('navigation-state-manager.js')) {
            console.log(`â  Already updated: ${filePath}`);
            return false;
        }
        
        // Remove old script references
        for (const oldScript of config.oldScripts) {
            if (content.includes(oldScript)) {
                content = content.replace(oldScript, '');
                modified = true;
            }
        }
        
        // Find the right place to insert new scripts (before </head> or </body>)
        const headEndIndex = content.lastIndexOf('</head>');
        const bodyEndIndex = content.lastIndexOf('</body>');
        
        let insertIndex = -1;
        let insertTag = '';
        
        if (headEndIndex !== -1) {
            insertIndex = headEndIndex;
            insertTag = '</head>';
        } else if (bodyEndIndex !== -1) {
            insertIndex = bodyEndIndex;
            insertTag = '</body>';
        }
        
        if (insertIndex !== -1) {
            // Determine which script set to use
            const isMainPage = filePath.includes('index.html') || 
                              filePath.includes('products.html') || 
                              filePath.includes('login.html') ||
                              filePath.includes('cart.html');
            
            const scriptsToInsert = isMainPage ? config.newScripts : config.newScriptsSimple;
            
            // Insert the new scripts
            content = content.slice(0, insertIndex) + 
                      scriptsToInsert + 
                      '\n' + 
                      content.slice(insertIndex);
            
            modified = true;
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`â Updated: ${filePath}`);
            return true;
        }
        
        return false;
    } catch (error) {
        console.error(`Error updating ${filePath}:`, error.message);
        return false;
    }
}

function main() {
    console.log('ð Clean URL Fix Script - Starting batch update...\n');
    
    const htmlFiles = findHtmlFiles(config.clientDir);
    console.log(`Found ${htmlFiles.length} HTML files\n`);
    
    let updatedCount = 0;
    let alreadyUpdatedCount = 0;
    let errorCount = 0;
    
    for (const file of htmlFiles) {
        try {
            const result = updateHtmlFile(file);
            if (result === true) {
                updatedCount++;
            } else if (result === false) {
                alreadyUpdatedCount++;
            }
        } catch (error) {
            errorCount++;
            console.error(`Failed to process ${file}:`, error.message);
        }
    }
    
    console.log('\nâ Update Summary:');
    console.log(`â Files updated: ${updatedCount}`);
    console.log(`â Already updated: ${alreadyUpdatedCount}`);
    console.log(`â Errors: ${errorCount}`);
    console.log(`â Total processed: ${htmlFiles.length}`);
    
    if (updatedCount > 0) {
        console.log('\nâ Next steps:');
        console.log('1. Test the updated pages in browser');
        console.log('2. Check for clean URL functionality');
        console.log('3. Verify multinavigation works correctly');
        console.log('4. Remove old unified-header.js and production-router.js files');
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { findHtmlFiles, updateHtmlFile };
