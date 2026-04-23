import mongoose from 'mongoose';

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

studentSchema.virtual('fullName').get(function() {
    return [this.personalInfo?.firstName, this.personalInfo?.surName].filter(Boolean).join(' ').trim();
});
studentSchema.virtual('gender').get(function() {
    return this.personalInfo?.gender || '';
});

studentSchema.set('toJSON', { virtuals: true });
studentSchema.set('toObject', { virtuals: true });

const StudentModel = mongoose.models.Student || mongoose.model('Student', studentSchema);

export default StudentModel;
