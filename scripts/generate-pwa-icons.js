#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎨 KMU Discipline Desk - PWA Icon Generator\n');

// Check if we're in the right directory
if (!fs.existsSync('frontend') || !fs.existsSync('backend')) {
    console.error('❌ Please run this script from the project root directory');
    process.exit(1);
}

// PWA icon sizes required
const iconSizes = [
    { size: 72, name: 'icon-72x72.png' },
    { size: 96, name: 'icon-96x96.png' },
    { size: 128, name: 'icon-128x128.png' },
    { size: 144, name: 'icon-144x144.png' },
    { size: 152, name: 'icon-152x152.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 384, name: 'icon-384x384.png' },
    { size: 512, name: 'icon-512x512.png' }
];

// Create icons directory if it doesn't exist
const iconsDir = path.join('frontend', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('📋 Required PWA icon sizes:');
iconSizes.forEach(icon => {
    console.log(`  - ${icon.size}x${icon.size} (${icon.name})`);
});

console.log('\n📝 To generate properly sized icons:');
console.log('1. Use an online tool like https://www.favicon-generator.org/');
console.log('2. Upload your source image (kmu_logo.png)');
console.log('3. Download the generated package');
console.log('4. Extract and place the icons in frontend/public/icons/');
console.log('5. Update manifest.json to reference these icons');

console.log('\n✅ PWA Icon Generation Guide Completed!');