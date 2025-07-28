const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Fixing upload directory permissions...\n');

const uploadDir = path.join(process.cwd(), 'backend', 'uploads', 'evidence');

try {
    // Check if directory exists
    if (!fs.existsSync(uploadDir)) {
        console.log('📁 Creating upload directory...');
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    console.log('📁 Upload directory:', uploadDir);
    console.log('✅ Directory exists:', fs.existsSync(uploadDir));
    console.log('📂 Is directory:', fs.statSync(uploadDir).isDirectory());

    // Try to set permissions using Windows commands
    try {
        console.log('🔐 Setting permissions...');
        execSync(`icacls "${uploadDir}" /grant Everyone:F /T`, { stdio: 'inherit' });
        console.log('✅ Permissions set successfully');
    } catch (permError) {
        console.log('⚠️ Could not set permissions via icacls, trying alternative method...');

        // Try to create a test file to verify write access
        const testFile = path.join(uploadDir, 'test-permissions.txt');
        try {
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            console.log('✅ Write access confirmed');
        } catch (writeError) {
            console.error('❌ Write access failed:', writeError.message);
            console.log('\n🔧 Manual steps to fix:');
            console.log('1. Right-click on the "backend/uploads" folder');
            console.log('2. Select "Properties"');
            console.log('3. Go to "Security" tab');
            console.log('4. Click "Edit"');
            console.log('5. Add "Everyone" or your user account');
            console.log('6. Grant "Full control" permissions');
            console.log('7. Apply and OK');
        }
    }

    // Test write access
    const testFile = path.join(uploadDir, 'permission-test.txt');
    try {
        fs.writeFileSync(testFile, 'Permission test successful');
        fs.unlinkSync(testFile);
        console.log('✅ Write access test passed');
    } catch (testError) {
        console.error('❌ Write access test failed:', testError.message);
    }

} catch (error) {
    console.error('❌ Error fixing permissions:', error.message);
}

console.log('\n🎉 Permission fix attempt completed!');