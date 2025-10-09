import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/user.js';

dotenv.config();

async function createAdminUser() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/kmu_discipline_desk');
        console.log('Connected to MongoDB');

        // Check if admin user already exists
        const existingAdmin = await User.findOne({ username: 'admin' });
        if (existingAdmin) {
            console.log('Admin user already exists');
            return;
        }

        // Create admin user
        const hashedPassword = await bcrypt.hash('admin123', 10);
        const adminUser = new User({
            username: 'admin',
            password: hashedPassword,
            name: 'System Administrator',
            role: 'admin'
        });

        await adminUser.save();
        console.log('Admin user created successfully!');
        console.log('Username: admin');
        console.log('Password: admin123');

        // Create security officer user
        const securityUser = new User({
            username: 'security',
            password: hashedPassword, // Same password for simplicity
            name: 'Security Officer',
            role: 'security_officer'
        });

        await securityUser.save();
        console.log('Security officer user created successfully!');
        console.log('Username: security');
        console.log('Password: admin123');

        // Create chief security officer user
        const chiefSecurityUser = new User({
            username: 'chief_security',
            password: hashedPassword,
            name: 'Chief Security Officer',
            role: 'chief_security_officer'
        });

        await chiefSecurityUser.save();
        console.log('Chief security officer user created successfully!');
        console.log('Username: chief_security');
        console.log('Password: admin123');

        // Create dean of students user
        const deanUser = new User({
            username: 'dean',
            password: hashedPassword,
            name: 'Dean of Students',
            role: 'dean_of_students'
        });

        await deanUser.save();
        console.log('Dean of students user created successfully!');
        console.log('Username: dean');
        console.log('Password: admin123');

        // Create assistant dean user
        const assistantDeanUser = new User({
            username: 'assistant_dean',
            password: hashedPassword,
            name: 'Assistant Dean',
            role: 'assistant_dean'
        });

        await assistantDeanUser.save();
        console.log('Assistant dean user created successfully!');
        console.log('Username: assistant_dean');
        console.log('Password: admin123');

        // Create secretary user
        const secretaryUser = new User({
            username: 'secretary',
            password: hashedPassword,
            name: 'Secretary',
            role: 'secretary'
        });

        await secretaryUser.save();
        console.log('Secretary user created successfully!');
        console.log('Username: secretary');
        console.log('Password: admin123');

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

createAdminUser();