#!/usr/bin/env node

/**
 * Automatic Page Header Update Script for Virtuosa
 * Updates all pages to use the new unified header system
 * 
 * Usage: node update-pages-to-unified-header.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logWarn(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

/**
 * Find all HTML pages in the pages directory
 */
function findHtmlPages(pagesDir) {
    const files = fs.readdirSync(pagesDir);
    return files.filter(f => f.endsWith('.html'));
}

/**
 * Remove header HTML from a page
 */
function removeHeaderHTML(htmlContent) {
    // Find and remove the header element
    const headerRegex = /<header\s+class="bg-navy[^>]*>[\s\S]*?<\/header>/i;
    let modified = htmlContent.replace(headerRegex, '');
    
    // Remove mobile menu overlay if it exists
    const overlayRegex = /<div\s+id="mobile-menu-overlay"[\s\S]*?<\/div>\s*\n?/i;
    modified = modified.replace(overlayRegex, '');
    
    // Remove mobile menu content if it exists
    const menuRegex = /<div\s+id="mobile-menu-content"[\s\S]*?<\/div>\s*\n?/i;
    modified = modified.replace(menuRegex, '');
    
    return modified;
}

/**
 * Remove header-related CSS from style blocks
 */
function removeHeaderCSS(htmlContent) {
    // This is complex, so we'll be conservative and only remove obvious blocks
    
    // Remove mobile-menu styles
    const mobileMenuRegex = /\/\*\s*Mobile\s*(?:Menu|Header)[\s\S]*?\*\/[\s\S]*?(?=\/\*|<\/style>)/gi;
    let modified = htmlContent.replace(mobileMenuRegex, '');
    
    // Remove header-specific CSS variables
    const headerVarsRegex = /--(?:header|menu|mobile)[^:]*:[^;]*;?\n?/gi;
    modified = modified.replace(headerVarsRegex, '');
    
    return modified;
}

/**
 * Remove old header-related script includes
 */
function removeOldHeaderScripts(htmlContent) {
    // Remove header.js
    let modified = htmlContent.replace(/<script[^>]*src=["']\/js\/header\.js["'][^>]*><\/script>\s*\n?/gi, '');
    
    // Remove mobile-menu.js
    modified = modified.replace(/<script[^>]*src=["']\/js\/mobile-menu\.js["'][^>]*><\/script>\s*\n?/gi, '');
    
    // Remove mobile-header.js
    modified = modified.replace(/<script[^>]*src=["']\/js\/mobile-header\.js["'][^>]*><\/script>\s*\n?/gi, '');
    
    return modified;
}

/**
 * Get the unified header scripts to add
 */
function getUnifiedHeaderScripts() {
    return `    <!-- Unified Header System -->
    <script src="/js/config.js"></script>
    <script src="/js/token-manager.js"></script>
    <script src="/js/auth-manager.js"></script>
    <script src="/js/cache-manager.js" defer></script>
    <script src="/js/unified-header.js" defer></script>
    <script src="/js/production-router.js" defer></script>`;
}

/**
 * Add unified header scripts to a page
 */
function addUnifiedHeaderScripts(htmlContent) {
    // Find the </head> tag
    if (!htmlContent.includes('</head>')) {
        logWarn('Could not find </head> tag');
        return htmlContent;
    }
    
    const scripts = getUnifiedHeaderScripts();
    
    // Insert before </head>
    return htmlContent.replace('</head>', `\n${scripts}\n</head>`);
}

/**
 * Check if page already has unified header
 */
function hasUnifiedHeader(htmlContent) {
    return htmlContent.includes('unified-header.js');
}

/**
 * Create a backup of the file
 */
function createBackup(filePath) {
    const backupPath = filePath + '.backup';
    
    try {
        fs.copyFileSync(filePath, backupPath);
        return backupPath;
    } catch (error) {
        logError(`Failed to create backup for ${path.basename(filePath)}: ${error.message}`);
        return null;
    }
}

/**
 * Restore from backup
 */
function restoreBackup(filePath) {
    const backupPath = filePath + '.backup';
    
    try {
        fs.copyFileSync(backupPath, filePath);
        fs.unlinkSync(backupPath);
        return true;
    } catch (error) {
        logError(`Failed to restore backup for ${path.basename(filePath)}: ${error.message}`);
        return false;
    }
}

/**
 * Update a single page
 */
function updatePage(filePath, options = {}) {
    const fileName = path.basename(filePath);
    const { dryRun = false, backup = true } = options;
    
    try {
        // Read the file
        let content = fs.readFileSync(filePath, 'utf-8');
        const originalContent = content;
        
        // Check if already updated
        if (hasUnifiedHeader(content)) {
            logWarn(`${fileName} already has unified header, skipping`);
            return { updated: false, reason: 'already-updated' };
        }
        
        // Make modifications
        content = removeHeaderHTML(content);
        content = removeHeaderCSS(content);
        content = removeOldHeaderScripts(content);
        content = addUnifiedHeaderScripts(content);
        
        // Check if anything changed
        if (content === originalContent) {
            logWarn(`${fileName} had no header to remove`);
            return { updated: false, reason: 'no-changes' };
        }
        
        // Dry run - don't actually save
        if (dryRun) {
            logInfo(`${fileName} would be updated (dry run)`);
            return { updated: true, dryRun: true };
        }
        
        // Create backup if requested
        if (backup) {
            const backupPath = createBackup(filePath);
            if (!backupPath) {
                logError(`${fileName} backup failed, skipping`);
                return { updated: false, reason: 'backup-failed' };
            }
        }
        
        // Write the file
        fs.writeFileSync(filePath, content, 'utf-8');
        
        logSuccess(`${fileName} updated`);
        return { updated: true };
        
    } catch (error) {
        logError(`${fileName} error: ${error.message}`);
        return { updated: false, error: error.message };
    }
}

/**
 * Update all pages in a directory
 */
function updateAllPages(pagesDir, options = {}) {
    const { dryRun = false, backup = true, pattern = null } = options;
    
    try {
        const pages = findHtmlPages(pagesDir);
        
        if (pattern) {
            // Filter by pattern
            const regex = new RegExp(pattern, 'i');
            pages = pages.filter(p => regex.test(p));
        }
        
        log(`\nFound ${pages.length} pages to update\n`, 'cyan');
        
        const results = {
            updated: 0,
            skipped: 0,
            failed: 0,
            details: []
        };
        
        pages.forEach((page, index) => {
            const filePath = path.join(pagesDir, page);
            log(`[${index + 1}/${pages.length}] Updating ${page}...`, 'cyan');
            
            const result = updatePage(filePath, { dryRun, backup });
            
            results.details.push({ page, ...result });
            
            if (result.updated) {
                results.updated++;
            } else if (result.reason === 'already-updated') {
                results.skipped++;
            } else {
                results.failed++;
            }
        });
        
        // Print summary
        log('\n' + '='.repeat(60), 'cyan');
        log('UPDATE SUMMARY', 'cyan');
        log('='.repeat(60), 'cyan');
        logSuccess(`Updated: ${results.updated} pages`);
        logWarn(`Skipped: ${results.skipped} pages`);
        logError(`Failed: ${results.failed} pages`);
        
        if (dryRun) {
            logInfo('(Dry run - no files were modified)');
        }
        
        return results;
        
    } catch (error) {
        logError(`Failed to update pages: ${error.message}`);
        return null;
    }
}

/**
 * Interactive confirmation
 */
async function askConfirmation(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

/**
 * Main function
 */
async function main() {
    log('='.repeat(60), 'cyan');
    log('Virtuosa Unified Header - Batch Update Tool', 'cyan');
    log('='.repeat(60), 'cyan');
    
    const pagesDir = path.join(__dirname, 'client', 'pages');
    
    // Check if pages directory exists
    if (!fs.existsSync(pagesDir)) {
        logError(`Pages directory not found: ${pagesDir}`);
        process.exit(1);
    }
    
    const args = process.argv.slice(2);
    let options = {
        dryRun: false,
        backup: true,
        pattern: null
    };
    
    // Parse command line arguments
    if (args.includes('--dry-run')) {
        options.dryRun = true;
        logWarn('Running in DRY RUN mode - no files will be modified');
    }
    
    if (args.includes('--no-backup')) {
        options.backup = false;
        logWarn('Backups will not be created');
    }
    
    const patternArg = args.find(arg => arg.startsWith('--pattern='));
    if (patternArg) {
        options.pattern = patternArg.split('=')[1];
        logInfo(`Filtering to pages matching: ${options.pattern}`);
    }
    
    // Ask for confirmation
    if (!options.dryRun && !args.includes('--no-confirm')) {
        log('');
        const confirmed = await askConfirmation('Update all pages? (y/n): ');
        
        if (!confirmed) {
            logWarn('Update cancelled');
            process.exit(0);
        }
    }
    
    // Run update
    const results = updateAllPages(pagesDir, options);
    
    if (!results) {
        process.exit(1);
    }
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
    main().catch(error => {
        logError(`Unexpected error: ${error.message}`);
        process.exit(1);
    });
}

// Export for use as module
module.exports = {
    updatePage,
    updateAllPages,
    removeHeaderHTML,
    removeHeaderCSS,
    removeOldHeaderScripts
};
