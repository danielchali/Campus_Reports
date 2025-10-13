import mongoose from 'mongoose';
import db from './db.js';

const dbType = process.env.DB_TYPE || 'mongo';

let StaffModel;

if (dbType === 'mongo') {
    const staffSchema = new mongoose.Schema({
        staffId: { type: String, required: true, unique: true },
        fullName: { type: String, required: true },
        department: String,
        position: String,
        email: String,
        phone: String,
        hireDate: Date,
        lastSelected: Date,
        createdAt: { type: Date, default: Date.now },
    });
    StaffModel = mongoose.models.Staff || mongoose.model('Staff', staffSchema);
} else if (dbType === 'mysql') {
    // MySQL: Use raw queries in controller
    StaffModel = null;
}

export default StaffModel;