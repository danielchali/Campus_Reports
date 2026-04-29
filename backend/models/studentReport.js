import mongoose from 'mongoose';

const studentReportUpdateSchema = new mongoose.Schema({
    status: { type: String, enum: ['Submitted', 'Under Review', 'In Progress', 'Resolved'], required: true },
    message: { type: String, required: true, trim: true },
    createdBy: { type: String, default: '' },
    createdByRole: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
});

const studentReportSchema = new mongoose.Schema({
    tracking_code: { type: String, unique: true, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: ['disciplinary_case', 'maintenance_issue'], required: true },
    anonymous: { type: Boolean, default: false },
    location: { type: String, required: true, trim: true },
    incident_date: { type: String, required: true },
    status: { type: String, enum: ['Submitted', 'Under Review', 'In Progress', 'Resolved'], default: 'Submitted' },
    owner_id: { type: String, required: true, index: true },
    owner_username: { type: String, required: true },
    owner_name: { type: String, default: '' },
    owner_role: { type: String, enum: ['student', 'general_user'], default: 'student' },
    routed_to_maintenance: { type: Boolean, default: false },
    routed_by_role: { type: String, default: '' },
    seen_by: { type: [String], default: [] },
    updates: { type: [studentReportUpdateSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const StudentReportModel = mongoose.models.StudentReport || mongoose.model('StudentReport', studentReportSchema);

export default StudentReportModel;
