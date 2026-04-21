import mongoose from 'mongoose';
import db from './db.js';

const dbType = process.env.DB_TYPE || 'mongo';

let StudentModel;

if (dbType === 'mongo') {
    const studentSchema = new mongoose.Schema({
        studentId: { type: String, required: true, unique: true },
        program: String,
        year: String,
        yearOfStudy: String,
        status: String,
        deliveryMode: String,
        personalInfo: {
            firstName: String,
            surName: String,
            nrc: String,
            passport: String,
            maritalStatus: String,
            nationality: String,
            gender: String,
            dateOfBirth: String
        },
        accommodation: {
            roomNumber: String
        },
        addressInfo: {
            province: String,
            town: String,
            address: String,
            phone: String,
            email: String
        },
        lastSelected: Date,
        createdAt: { type: Date, default: Date.now },
    });

    // Backward-compatible virtuals for existing frontend usage
    studentSchema.virtual('fullName').get(function() {
        return [this.personalInfo?.firstName, this.personalInfo?.surName].filter(Boolean).join(' ').trim();
    });
    studentSchema.virtual('gender').get(function() {
        return this.personalInfo?.gender || '';
    });

    studentSchema.set('toJSON', { virtuals: true });
    studentSchema.set('toObject', { virtuals: true });
    StudentModel = mongoose.models.Student || mongoose.model('Student', studentSchema);
} else if (dbType === 'mysql') {
    // MySQL: Use raw queries in controller
    StudentModel = null;
}

export default StudentModel;