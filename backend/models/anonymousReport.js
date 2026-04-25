import mongoose from 'mongoose';

const anonymousReportSchema = new mongoose.Schema({
    tracking_code: { type: String, unique: true, required: true, index: true },
    category: { type: String, enum: ['disciplinary_case', 'maintenance_issue', 'other'], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    incident_date: { type: String, required: true },
    contact_email: { type: String, trim: true, default: '' }, // optional, for follow-up
    status: { type: String, enum: ['Submitted', 'Under Review', 'In Progress', 'Resolved'], default: 'Submitted' },
    ip_hash: { type: String, default: '' }, // hashed for basic spam detection, not traceable
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const AnonymousReportModel = mongoose.models.AnonymousReport || mongoose.model('AnonymousReport', anonymousReportSchema);

export default AnonymousReportModel;
