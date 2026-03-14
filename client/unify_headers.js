const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/HP USER/Desktop/Virtuosa/client';
const pagesDir = path.join(baseDir, 'pages');

const MOBILE_HEADER_HTML = `
    <!-- Mobile Header Structure (320px-480px) -->
    <header class="bg-navy text-white shadow-lg sticky top-0 z-50">
        <!-- Row 1: Utilities and Branding -->
        <div class="v-container mobile-header-row-1">
            <div class="flex items-center justify-between py-3">
                <!-- Hamburger Menu (Left) -->
                <button id="mobile-menu-toggle" class="v-touch text-white hover:text-gold transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>

                <!-- Brand Name (Center) -->
                <div class="flex-1 text-center">
                    <a href="/index.html" class="text-2xl md:text-3xl font-bold text-gold mobile-logo">Virtuosa</a>
                </div>

                <!-- Customer Utilities (Right) -->
                <div class="flex items-center space-x-3 mobile-header-actions">
                    <!-- Sign in / Profile Icon -->
                    <a href="/pages/login.html" id="mobile-login-link" class="v-touch text-white hover:text-gold transition-colors mobile-auth-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span class="mobile-auth-label hidden ml-1 text-sm">Sign in</span>
                    </a>
                    
                    <!-- Cart Icon with Badge -->
                    <a href="/pages/cart.html" class="relative v-touch text-white hover:text-gold transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.185 1.706.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span class="cart-badge-count absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">0</span>
                    </a>
                </div>
            </div>
        </div>
`;

const SEARCH_ROW_HTML = `
        <!-- Row 2: Search-First Experience (Product Pages Only) -->
        <div class="v-container mobile-header-row-2 pb-3">
            <div class="relative mobile-search-container">
                <input id="mobile-search-input" type="text" 
                    placeholder="Search campus marketplace..." 
                    class="w-full pl-4 pr-12 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-gray-800 text-gray-200 placeholder-gray-400 mobile-search-input"
                    autocomplete="off">
                <button id="mobile-search-button" 
                    class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gold transition-colors mobile-search-button">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
`;

const DESKTOP_HEADER_BASE = `
        <!-- Desktop Header (Hidden on Mobile) -->
        <div class="v-container v-header-row desktop-header">
            <div class="flex items-center v-header-logo">
                <a href="/index.html" class="text-xl md:text-3xl font-bold text-gold">Virtuosa</a>
            </div>
`;

const DESKTOP_SEARCH_HTML = `
            <div class="v-header-search">
                <div class="relative">
                    <input id="home-search-input" type="text"
                        placeholder="Search campus marketplace..."
                        class="w-full pl-4 pr-10 py-2 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-gold bg-gray-800 text-gray-200 placeholder-gray-400"
                        autocomplete="off">
                    <button id="home-search-button"
                        class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gold transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
`;

const ACTIONS_HTML = `
            <div id="user-info-container" class="flex items-center space-x-4 v-header-actions">
                <a href="/pages/login.html" id="login-link" class="text-white hover:text-gold transition-colors font-medium text-sm md:text-base hidden md:block">Log In</a>
                <div id="user-menu" class="relative hidden">
                    <button onclick="toggleUserMenu()" class="text-white hover:text-gold transition-colors font-medium flex items-center space-x-2">
                        <span id="user-greeting" class="hidden md:inline"></span>
                        <i class="fas fa-user-circle text-lg md:text-base"></i>
                        <i class="fas fa-chevron-down text-xs hidden md:inline"></i>
                    </button>
                    <div id="user-dropdown" class="absolute right-0 top-10 w-48 bg-navy rounded-lg shadow-xl z-50 py-2 hidden">
                        <a href="/pages/profile.html" class="block px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"><i class="fas fa-user mr-2"></i>My Profile</a>
                        <a href="/pages/dashboard.html" class="block px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"><i class="fas fa-tachometer-alt mr-2"></i>Dashboard</a>
                        <div class="border-t border-gray-700 my-1"></div>
                        <button onclick="logout()" class="block w-full text-left px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"><i class="fas fa-sign-out-alt mr-2"></i>Log Out</button>
                    </div>
                </div>
                <a href="/pages/cart.html" class="relative text-white hover:text-gold transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.185 1.706.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span class="cart-badge-count absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">0</span>
                </a>
            </div>
        </div>
    </header>
`;

const OVERLAY_HTML = `
    <!-- Mobile Navigation Menu Overlay -->
    <div id="mobile-menu-overlay" class="mobile-menu-overlay">
        <div class="mobile-menu-content">
            <div class="mobile-menu-header">
                <div class="text-xl font-bold text-gold">Virtuosa Menu</div>
                <button id="mobile-menu-close" class="mobile-menu-close">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div class="mobile-menu-section">
                <a href="/index.html" class="mobile-menu-link"><i class="fas fa-home"></i><span>Home</span></a>
                <a href="/pages/products.html" class="mobile-menu-link"><i class="fas fa-shopping-bag"></i><span>Shop All</span></a>
                <a href="/pages/cart.html" class="mobile-menu-link"><i class="fas fa-shopping-cart"></i><span>My Cart</span></a>
            </div>
            <div class="mobile-menu-section">
                <div class="mobile-menu-title">Account</div>
                <a href="/pages/profile.html" class="mobile-menu-link"><i class="fas fa-user"></i><span>Profile</span></a>
                <a href="/pages/orders.html" class="mobile-menu-link"><i class="fas fa-box"></i><span>Orders</span></a>
            </div>
        </div>
    </div>
`;

function processHtml(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const isProductPage = filePath.includes('index.html') || filePath.includes('products.html') || filePath.includes('product-detail.html');

    let newHeader = MOBILE_HEADER_HTML;
    if (isProductPage) newHeader += SEARCH_ROW_HTML;
    newHeader += DESKTOP_HEADER_BASE;
    if (isProductPage) newHeader += DESKTOP_SEARCH_HTML;
    newHeader += ACTIONS_HTML;

    // 1. Replace the entire <header>...</header> block
    content = content.replace(/<header[\s\S]*?<\/header>/, newHeader);

    // 2. Ensure overlay
    if (content.includes('id="mobile-menu-overlay"')) {
        content = content.replace(/<div id="mobile-menu-overlay"[\s\S]*?<\/div>\s*<\/div>/, OVERLAY_HTML);
    } else {
        content = content.replace(/<\/header>/, '<\/header>\n' + OVERLAY_HTML);
    }

    // 3. Essential scripts
    const scripts = '<script src="/js/config.js"></script>' +
                    '<script src="/js/header.js"></script>' +
                    '<script src="/js/mobile-header.js"></script>';
    
    if (!content.includes('mobile-header.js')) {
        content = content.replace(/<\/body>/, scripts + '\n</body>');
    }

    fs.writeFileSync(filePath, content, 'utf8');
}

processHtml(path.join(baseDir, 'index.html'));
const files = fs.readdirSync(pagesDir).filter(f => f.endsWith('.html'));
for (const file of files) {
    processHtml(path.join(pagesDir, file));
}
console.log('Unification complete.');
