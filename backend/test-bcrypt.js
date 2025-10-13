#!/usr/bin/env node

/**
 * Bcrypt Test Utility
 * Use this script to test bcrypt comparison with a known password
 */

import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './models/user.js';

// Load environment variables
dotenv.config();

// Connect to database
const dbType = process.env.DB_TYPE || 'mongo';
const MONGO_URI = process.env.MONGO_URI;

if (dbType !== 'mongo') {
    console.log('This script only works with MongoDB');
    process.exit(1);
}

if (!MONGO_URI) {
    console.log('MONGO_URI environment variable is not set');
    process.exit(1);
}

mongoose.connect(MONGO_URI);

const testBcrypt = async (username, password) => {
    try {
        const user = await User.findOne({ username });
        if (!user) {
            console.log(`User ${username} not found`);
            return;
        }

        console.log('User found:', user.username);
        console.log('Stored password hash:', user.password);
        console.log('Password hash length:', user.password.length);
        
        const valid = await bcrypt.compare(password, user.password);
        console.log('Password valid:', valid);
        
        // Also test with a known invalid password
        const invalidValid = await bcrypt.compare('wrongpassword', user.password);
        console.log('Wrong password valid:', invalidValid);
    } catch (error) {
        console.error('Error testing bcrypt:', error);
    } finally {
        mongoose.connection.close();
    }
};

// Get username and password from command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
    console.log('Usage: node test-bcrypt.js <username> <password>');
    process.exit(1);
}

const username = args[0];
const password = args[1];

testBcrypt(username, password);