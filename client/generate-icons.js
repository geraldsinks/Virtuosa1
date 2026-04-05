/**
 * Virtuosa PWA Icon Generator
 * 
 * Generates all required PWA icons from an SVG template that matches
 * the login page's VIRTUOSA icon style (navy rounded rect with gold text).
 * 
 * Usage: node generate-icons.js
 * Requires: npm install sharp
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'assets', 'images');

// SVG template matching the login.html .virtuosa-icon style
// Navy background (#0A1128) + gold gradient text + rounded corners
function createIconSVG(size) {
  const padding = Math.round(size * 0.1);
  const innerSize = size - padding * 2;
  const cornerRadius = Math.round(size * 0.2);
  const fontSize = Math.round(size * 0.115);
  const letterSpacing = Math.round(size * 0.01);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="100%" style="stop-color:#C19A6B"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="50%" style="stop-color:#C19A6B"/>
      <stop offset="100%" style="stop-color:#FFD700"/>
    </linearGradient>
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" style="stop-color:#1a2332"/>
      <stop offset="100%" style="stop-color:#0A1128"/>
    </radialGradient>
  </defs>
  
  <!-- Gold border glow -->
  <rect x="${padding - 2}" y="${padding - 2}" width="${innerSize + 4}" height="${innerSize + 4}" rx="${cornerRadius + 2}" fill="url(#borderGrad)" opacity="0.6"/>
  
  <!-- Main background -->
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${innerSize}" rx="${cornerRadius}" fill="url(#bgGrad)"/>
  
  <!-- Gold accent line at top -->
  <rect x="${padding}" y="${padding}" width="${innerSize}" height="${Math.max(3, Math.round(size * 0.012))}" rx="${Math.max(1, Math.round(size * 0.006))}" fill="url(#goldGrad)" opacity="0.8"/>
  
  <!-- VIRTUOSA text -->
  <text x="${size / 2}" y="${size / 2 + fontSize * 0.35}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${fontSize}" letter-spacing="${letterSpacing}" fill="url(#goldGrad)">VIRTUOSA</text>
</svg>`;
}

// Maskable icon: same design but with extra safe-zone padding (20%)
function createMaskableIconSVG(size) {
  const safeZone = Math.round(size * 0.2);
  const innerSize = size - safeZone * 2;
  const cornerRadius = Math.round(innerSize * 0.2);
  const fontSize = Math.round(innerSize * 0.115);
  const letterSpacing = Math.round(innerSize * 0.01);
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="100%" style="stop-color:#C19A6B"/>
    </linearGradient>
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="50%" style="stop-color:#C19A6B"/>
      <stop offset="100%" style="stop-color:#FFD700"/>
    </linearGradient>
    <radialGradient id="bgGrad" cx="50%" cy="40%" r="60%">
      <stop offset="0%" style="stop-color:#1a2332"/>
      <stop offset="100%" style="stop-color:#0A1128"/>
    </radialGradient>
  </defs>
  
  <!-- Full background for maskable safe zone -->
  <rect x="0" y="0" width="${size}" height="${size}" fill="#0A1128"/>
  
  <!-- Gold border glow -->
  <rect x="${safeZone - 2}" y="${safeZone - 2}" width="${innerSize + 4}" height="${innerSize + 4}" rx="${cornerRadius + 2}" fill="url(#borderGrad)" opacity="0.6"/>
  
  <!-- Main background -->
  <rect x="${safeZone}" y="${safeZone}" width="${innerSize}" height="${innerSize}" rx="${cornerRadius}" fill="url(#bgGrad)"/>
  
  <!-- Gold accent line at top -->
  <rect x="${safeZone}" y="${safeZone}" width="${innerSize}" height="${Math.max(3, Math.round(innerSize * 0.012))}" rx="${Math.max(1, Math.round(innerSize * 0.006))}" fill="url(#goldGrad)" opacity="0.8"/>
  
  <!-- VIRTUOSA text -->
  <text x="${size / 2}" y="${size / 2 + fontSize * 0.35}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${fontSize}" letter-spacing="${letterSpacing}" fill="url(#goldGrad)">VIRTUOSA</text>
</svg>`;
}

// Splash screen SVG: full-size startup image with branding
function createSplashSVG(width, height) {
  const iconSize = Math.min(width, height) * 0.25;
  const cornerRadius = iconSize * 0.2;
  const fontSize = iconSize * 0.115;
  const titleFontSize = Math.min(width, height) * 0.04;
  const subtitleFontSize = Math.min(width, height) * 0.02;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0A1128"/>
      <stop offset="100%" style="stop-color:#060A18"/>
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#FFD700"/>
      <stop offset="100%" style="stop-color:#C19A6B"/>
    </linearGradient>
    <radialGradient id="iconBg" cx="50%" cy="40%" r="60%">
      <stop offset="0%" style="stop-color:#1a2332"/>
      <stop offset="100%" style="stop-color:#0A1128"/>
    </radialGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
  
  <!-- Subtle pattern overlay -->
  <rect width="${width}" height="${height}" fill="url(#bgGrad)" opacity="0.95"/>
  
  <!-- Icon container -->
  <g transform="translate(${width / 2 - iconSize / 2}, ${height / 2 - iconSize / 2 - titleFontSize * 2})">
    <rect x="-2" y="-2" width="${iconSize + 4}" height="${iconSize + 4}" rx="${cornerRadius + 2}" fill="url(#goldGrad)" opacity="0.4"/>
    <rect x="0" y="0" width="${iconSize}" height="${iconSize}" rx="${cornerRadius}" fill="url(#iconBg)"/>
    <text x="${iconSize / 2}" y="${iconSize / 2 + fontSize * 0.35}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="800" font-size="${fontSize}" fill="url(#goldGrad)">VIRTUOSA</text>
  </g>
  
  <!-- Title text below icon -->
  <text x="${width / 2}" y="${height / 2 + iconSize / 2 - titleFontSize}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${titleFontSize}" fill="url(#goldGrad)">Virtuosa</text>
  
  <!-- Subtitle -->
  <text x="${width / 2}" y="${height / 2 + iconSize / 2 + subtitleFontSize}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="400" font-size="${subtitleFontSize}" fill="#9ca3af">Student Trading Platform</text>
</svg>`;
}

// All icon sizes needed
const icons = [
  { name: 'icon-72x72.png', size: 72, maskable: false },
  { name: 'icon-96x96.png', size: 96, maskable: false },
  { name: 'icon-128x128.png', size: 128, maskable: false },
  { name: 'icon-144x144.png', size: 144, maskable: false },
  { name: 'icon-152x152.png', size: 152, maskable: false },
  { name: 'icon-192x192.png', size: 192, maskable: false },
  { name: 'icon-384x384.png', size: 384, maskable: false },
  { name: 'icon-512x512.png', size: 512, maskable: false },
  { name: 'icon-maskable-192x192.png', size: 192, maskable: true },
  { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
  { name: 'apple-touch-icon-180x180.png', size: 180, maskable: false },
];

// All splash screen sizes for iPhones
const splashScreens = [
  // iPhone SE / 8  (375x667 @2x)
  { name: 'splash-750x1334.png', width: 750, height: 1334 },
  { name: 'splash-1334x750.png', width: 1334, height: 750 },
  // iPhone 8 Plus  (414x736 @3x)
  { name: 'splash-1242x2208.png', width: 1242, height: 2208 },
  { name: 'splash-2208x1242.png', width: 2208, height: 1242 },
  // iPhone X/XS/11 Pro (375x812 @3x)
  { name: 'splash-1125x2436.png', width: 1125, height: 2436 },
  { name: 'splash-2436x1125.png', width: 2436, height: 1125 },
  // iPhone XR/11 (414x896 @2x)
  { name: 'splash-828x1792.png', width: 828, height: 1792 },
  { name: 'splash-1792x828.png', width: 1792, height: 828 },
  // iPhone XS Max/11 Pro Max (414x896 @3x)
  { name: 'splash-1242x2688.png', width: 1242, height: 2688 },
  { name: 'splash-2688x1242.png', width: 2688, height: 1242 },
  // iPhone 12 mini/13 mini (375x812 @3x — slightly different)
  { name: 'splash-1080x2340.png', width: 1080, height: 2340 },
  { name: 'splash-2340x1080.png', width: 2340, height: 1080 },
  // iPhone 12/12 Pro/13/13 Pro/14 (390x844 @3x)
  { name: 'splash-1170x2532.png', width: 1170, height: 2532 },
  { name: 'splash-2532x1170.png', width: 2532, height: 1170 },
  // iPhone 12 Pro Max/13 Pro Max/14 Plus (428x926 @3x)
  { name: 'splash-1284x2778.png', width: 1284, height: 2778 },
  { name: 'splash-2778x1284.png', width: 2778, height: 1284 },
  // iPhone 14 Pro/15/15 Pro/16 (393x852 @3x)
  { name: 'splash-1179x2556.png', width: 1179, height: 2556 },
  { name: 'splash-2556x1179.png', width: 2556, height: 1179 },
  // iPhone 14 Pro Max/15 Plus/15 Pro Max/16 Plus (430x932 @3x)
  { name: 'splash-1290x2796.png', width: 1290, height: 2796 },
  { name: 'splash-2796x1290.png', width: 2796, height: 1290 },
  // iPhone 16 Pro (402x874 @3x)
  { name: 'splash-1206x2622.png', width: 1206, height: 2622 },
  { name: 'splash-2622x1206.png', width: 2622, height: 1206 },
  // iPhone 16 Pro Max (440x956 @3x)
  { name: 'splash-1320x2868.png', width: 1320, height: 2868 },
  { name: 'splash-2868x1320.png', width: 2868, height: 1320 },
];

async function generateIcons() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('🎨 Generating Virtuosa PWA Icons...\n');

  // Generate app icons
  for (const icon of icons) {
    const svg = icon.maskable 
      ? createMaskableIconSVG(icon.size) 
      : createIconSVG(icon.size);
    
    const outputPath = path.join(OUTPUT_DIR, icon.name);
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`  ✅ ${icon.name} (${icon.size}×${icon.size}${icon.maskable ? ' maskable' : ''})`);
  }

  console.log('\n🖼️  Generating Apple Splash Screens...\n');

  // Generate splash screens
  for (const splash of splashScreens) {
    const svg = createSplashSVG(splash.width, splash.height);
    const outputPath = path.join(OUTPUT_DIR, splash.name);
    
    await sharp(Buffer.from(svg))
      .png()
      .toFile(outputPath);
    
    console.log(`  ✅ ${splash.name} (${splash.width}×${splash.height})`);
  }

  console.log('\n🎉 All icons and splash screens generated successfully!');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
}

generateIcons().catch(err => {
  console.error('❌ Error generating icons:', err);
  process.exit(1);
});
