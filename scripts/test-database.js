const dotenv = require('dotenv');
const path = require('path');

// Change to backend directory to access node_modules
process.chdir(path.join(__dirname, '..', 'backend'));

// Load environment variables from backend directory
dotenv.config({ path: '.env' });

async function testDatabase() {
    console.log('🔍 Testing database connectivity...\n');

    const dbType = process.env.DB_TYPE || 'mongo';
    console.log('📊 Database type:', dbType);

    if (dbType === 'mongo') {
        console.log('🔗 MongoDB URI:', process.env.MONGO_URI ? 'Set' : 'Not set');

        if (!process.env.MONGO_URI) {
            console.error('❌ MONGO_URI environment variable is not set');
            console.log('💡 Please set MONGO_URI in backend/.env file');
            process.exit(1);
        }

        try {
            const mongoose = require('mongoose');
            await mongoose.connect(process.env.MONGO_URI, {
                useNewUrlParser: true,
                useUnifiedTopology: true
            });
            console.log('✅ MongoDB connection successful');

            // Test creating a collection
            const testCollection = mongoose.connection.collection('test');
            await testCollection.insertOne({ test: 'connection', timestamp: new Date() });
            console.log('✅ MongoDB write test successful');

            await mongoose.connection.close();
            console.log('✅ MongoDB connection closed');

        } catch (error) {
            console.error('❌ MongoDB connection failed:', error.message);
            process.exit(1);
        }

    } else if (dbType === 'mysql') {
        console.log('🔗 MySQL Host:', process.env.MYSQL_HOST || 'Not set');
        console.log('👤 MySQL User:', process.env.MYSQL_USER || 'Not set');
        console.log('🗄️ MySQL Database:', process.env.MYSQL_DB || 'Not set');

        if (!process.env.MYSQL_HOST || !process.env.MYSQL_USER || !process.env.MYSQL_DB) {
            console.error('❌ MySQL environment variables are not properly set');
            console.log('💡 Please set MYSQL_HOST, MYSQL_USER, MYSQL_PASS, and MYSQL_DB in backend/.env file');
            process.exit(1);
        }

        try {
            const mysql = require('mysql2/promise');
            const connection = await mysql.createConnection({
                host: process.env.MYSQL_HOST,
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASS,
                database: process.env.MYSQL_DB,
            });

            console.log('✅ MySQL connection successful');

            // Test creating a table
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS test_connection (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    test VARCHAR(255),
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log('✅ MySQL table creation test successful');

            await connection.end();
            console.log('✅ MySQL connection closed');

        } catch (error) {
            console.error('❌ MySQL connection failed:', error.message);
            process.exit(1);
        }

    } else {
        console.error('❌ Unsupported database type:', dbType);
        console.log('💡 Supported types: mongo, mysql');
        process.exit(1);
    }

    console.log('\n🎉 Database connectivity test completed successfully!');
    console.log('💡 If you\'re still having upload issues, check the server logs for more details.');
}

// Run the test
testDatabase().catch(console.error);