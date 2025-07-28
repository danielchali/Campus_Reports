const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting KMU Discipline Desk .exe build process...\n');

// Step 1: Install dependencies
console.log('📦 Installing frontend dependencies...');
execSync('npm install', { cwd: './frontend', stdio: 'inherit' });

console.log('📦 Installing backend dependencies...');
execSync('npm install', { cwd: './backend', stdio: 'inherit' });

// Step 2: Build frontend
console.log('🔨 Building frontend...');
execSync('npm run build', { cwd: './frontend', stdio: 'inherit' });

// Step 3: Create production backend package
console.log('🔨 Preparing backend for production...');
const backendPackageJson = JSON.parse(fs.readFileSync('./backend/package.json', 'utf8'));
backendPackageJson.scripts.start = 'node ./bin/www';
fs.writeFileSync('./backend/package.json', JSON.stringify(backendPackageJson, null, 2));

// Step 4: Package with electron-packager
console.log('📦 Creating .exe with electron-packager...');
execSync('npm run package-win-simple', { cwd: './frontend', stdio: 'inherit' });

console.log('\n✅ Build complete! Check the frontend/dist folder for your application.');
console.log('📁 The application will be in: frontend/dist/KMUDisciplineDesk-win32-x64/');