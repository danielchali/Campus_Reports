#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 KMU Discipline Desk - PWA Deployment Script\n');

// Check if we're in the right directory
if (!fs.existsSync('frontend') || !fs.existsSync('backend')) {
    console.error('❌ Please run this script from the project root directory');
    process.exit(1);
}

async function deployPWA() {
    try {
        console.log('📦 Step 1: Building frontend for production...');
        execSync('cd frontend && npm run build', { stdio: 'inherit' });

        console.log('\n✅ Frontend build completed successfully!');

        console.log('\n🌐 Step 2: Deploying to Vercel...');
        console.log('Note: You will be prompted to login to Vercel if not already logged in');

        // Check if vercel is installed
        try {
            execSync('vercel --version', { stdio: 'pipe' });
        } catch (error) {
            console.log('📥 Installing Vercel CLI...');
            execSync('npm install -g vercel', { stdio: 'inherit' });
        }

        console.log('\n🚀 Deploying to Vercel...');
        execSync('cd frontend && vercel --prod', { stdio: 'inherit' });

        console.log('\n🎉 PWA Deployment completed!');
        console.log('\n📋 Next steps:');
        console.log('1. Deploy your backend to Railway/Render/Heroku');
        console.log('2. Update the API_BASE_URL in your frontend environment');
        console.log('3. Share the Vercel URL with your users');
        console.log('4. Users can install the PWA from their browser');

    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        process.exit(1);
    }
}

async function deployBackend() {
    try {
        console.log('\n🔧 Backend Deployment Options:');
        console.log('1. Railway (Recommended) - Free tier available');
        console.log('2. Render - Free tier available');
        console.log('3. Heroku - Paid service');
        console.log('4. Manual deployment');

        console.log('\n📝 For Railway deployment:');
        console.log('1. Go to https://railway.app');
        console.log('2. Connect your GitHub repository');
        console.log('3. Select the backend folder');
        console.log('4. Add environment variables:');
        console.log('   - MONGODB_URI=your_mongodb_connection');
        console.log('   - DB_TYPE=mongodb');
        console.log('   - PORT=5000');

    } catch (error) {
        console.error('\n❌ Backend deployment guide failed:', error.message);
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--backend')) {
        await deployBackend();
    } else {
        await deployPWA();
    }
}

main();