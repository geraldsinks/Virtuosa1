const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname);
const pagesDir = path.join(__dirname, 'pages');

const scriptTags = `
    <!-- Cookie Analytics & Consent -->
    <script src="/js/cookie-consent.js"></script>
    <script src="/js/cookie-tracker.js"></script>
</body>`;

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && file !== 'node_modules' && file !== 'assets' && file !== 'js' && file !== 'css') {
            processDir(fullPath);
        } else if (file.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('cookie-consent.js')) {
                console.log(`Skipping (already injected): ${file}`);
                continue;
            }
            if (content.includes('</body>')) {
                content = content.replace('</body>', scriptTags);
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Injected into: ${file}`);
            }
        }
    }
}

console.log('Starting injection...');
processDir(clientDir);
console.log('Injection complete.');
