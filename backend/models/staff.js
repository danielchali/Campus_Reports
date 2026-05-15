import mongoose from 'mongoose';

const staffSchema = new mongoose.Schema({
    staffId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    department: String,
    position: String,
    email: { type: String, trim: true, lowercase: true },
    phone: String,
    hireDate: Date,
    lastSelected: Date,
    createdAt: { type: Date, default: Date.now },
});

const StaffModel = mongoose.models.Staff || mongoose.model('Staff', staffSchema);

export default StaffModel;
