import mongoose from 'mongoose';
import db from './db.js';

const dbType = process.env.DB_TYPE || 'mongo';

let StudentModel;

if (dbType === 'mongo') {
    const studentSchema = new mongoose.Schema({
        studentId: { type: String, required: true, unique: true },
        fullName: { type: String, required: true },
        department: String,
        year: String,
        gender: String,
        lastSelected: Date,
        createdAt: { type: Date, default: Date.now },
    });
    StudentModel = mongoose.models.Student || mongoose.model('Student', studentSchema);
} else if (dbType === 'mysql') {
    // MySQL: Use raw queries in controller
    StudentModel = null;
}

export default StudentModel;