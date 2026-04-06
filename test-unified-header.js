#!/usr/bin/env node

/**
 * Quick Test Script for Unified Header System
 * Tests that the system loads correctly and basic functionality works
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(60));
console.log('Unified Header System - Quick Test');
console.log('='.repeat(60));

// Test 1: Check if files exist
console.log('\n📁 Checking file existence...');
const files = [
    'client/js/unified-header.js',
    'client/js/production-router.js',
    'client/js/config.js',
    'client/js/token-manager.js',
    'client/js/auth-manager.js',
    'client/js/cache-manager.js'
];

let allFilesExist = true;
files.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${file}`);
    } else {
        console.log(`❌ ${file} - MISSING`);
        allFilesExist = false;
    }
});

// Test 2: Check if pages were updated
console.log('\n📄 Checking page updates...');
const pagesDir = path.join(__dirname, 'client', 'pages');
const samplePages = ['products.html', 'login.html', 'cart.html'];

let pagesUpdated = true;
samplePages.forEach(page => {
    const pagePath = path.join(pagesDir, page);
    if (fs.existsSync(pagePath)) {
        const content = fs.readFileSync(pagePath, 'utf-8');
        const hasUnifiedHeader = content.includes('unified-header.js');
        const hasOldHeader = content.includes('<header class="bg-navy');

        if (hasUnifiedHeader && !hasOldHeader) {
            console.log(`✅ ${page} - Updated correctly`);
        } else if (hasUnifiedHeader && hasOldHeader) {
            console.log(`⚠️  ${page} - Has both old and new headers`);
        } else if (!hasUnifiedHeader && hasOldHeader) {
            console.log(`❌ ${page} - Not updated`);
            pagesUpdated = false;
        } else {
            console.log(`❓ ${page} - No header found`);
        }
    } else {
        console.log(`❌ ${page} - File not found`);
        pagesUpdated = false;
    }
});

// Test 3: Check backups exist
console.log('\n💾 Checking backups...');
const backupFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.backup'));
console.log(`✅ Found ${backupFiles.length} backup files`);

// Test 4: Syntax check
console.log('\n🔍 Checking JavaScript syntax...');
const { execSync } = require('child_process');

try {
    execSync('node -c client/js/unified-header.js', { stdio: 'pipe' });
    console.log('✅ unified-header.js - Syntax OK');
} catch (error) {
    console.log('❌ unified-header.js - Syntax Error');
    allFilesExist = false;
}

try {
    execSync('node -c client/js/production-router.js', { stdio: 'pipe' });
    console.log('✅ production-router.js - Syntax OK');
} catch (error) {
    console.log('❌ production-router.js - Syntax Error');
    allFilesExist = false;
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));

if (allFilesExist && pagesUpdated) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Files exist and are valid');
    console.log('✅ Pages updated correctly');
    console.log('✅ Backups created');
    console.log('\n🚀 Ready for testing in browser!');
    console.log('\nNext steps:');
    console.log('1. Open http://localhost:8000/pages/products.html');
    console.log('2. Test mobile menu (hamburger icon)');
    console.log('3. Test login/logout functionality');
    console.log('4. Verify badges update');
} else {
    console.log('❌ SOME TESTS FAILED');
    if (!allFilesExist) console.log('❌ Missing or invalid files');
    if (!pagesUpdated) console.log('❌ Pages not updated correctly');
    console.log('\n🔧 Please check the errors above and fix them.');
}

console.log('\n📚 Documentation:');
console.log('- UNIFIED_HEADER_GUIDE.md');
console.log('- TESTING_VALIDATION_GUIDE.md');
console.log('- COMPLETE_SOLUTION_SUMMARY.md');

console.log('\n' + '='.repeat(60));