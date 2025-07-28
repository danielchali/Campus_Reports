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

        // Create academic office user
        const academicUser = new User({
            username: 'academic',
            password: hashedPassword, // Same password for simplicity
            name: 'Academic Office',
            role: 'academic_office'
        });

        await academicUser.save();
        console.log('Academic office user created successfully!');
        console.log('Username: academic');
        console.log('Password: admin123');

    } catch (error) {
        console.error('Error creating admin user:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

createAdminUser();