import mongoose from 'mongoose';
import db from './db.js';

const dbType = process.env.DB_TYPE || 'mongo';

let UserModel;

if (dbType === 'mongo') {
    const userSchema = new mongoose.Schema({
        username: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        name: String,
        role: { type: String, default: 'user' },
        createdAt: { type: Date, default: Date.now },
    });
    UserModel = mongoose.models.User || mongoose.model('User', userSchema);
} else if (dbType === 'mysql') {
    // MySQL: Use raw queries in controller
    UserModel = null;
}

export default UserModel;