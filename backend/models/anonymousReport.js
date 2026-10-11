import mongoose from 'mongoose';

const anonymousReportSchema = new mongoose.Schema({
    tracking_code: { type: String, unique: true, required: true, index: true },
    category: { type: String, enum: ['disciplinary_case', 'maintenance_issue', 'other'], required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    incident_date: { type: String, required: true },
    contact_email: { type: String, trim: true, default: '' }, // optional, for follow-up
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['Submitted', 'Under Review', 'In Progress', 'Resolved'], default: 'Submitted' },
    ip_hash: { type: String, default: '' }, // hashed for basic spam detection, not traceable
    seen_by: { type: [String], default: [] },
    updates: {
      type: [
        {
          status: { type: String, required: true },
          message: { type: String, required: true },
          createdBy: { type: String, default: '' },
          createdByRole: { type: String, default: '' },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    ai_summary: { type: String, default: '' },
    ai_priority: { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
    ai_priority_score: { type: Number, default: 50 },
    ai_keywords: { type: [String], default: [] },
    ai_analyzed_at: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});
anonymousReportSchema.index({ category: 1, createdAt: -1 });
anonymousReportSchema.index({ status: 1, createdAt: -1 });
anonymousReportSchema.index({ ai_priority_score: -1, createdAt: -1 });

const AnonymousReportModel = mongoose.models.AnonymousReport || mongoose.model('AnonymousReport', anonymousReportSchema);

export default AnonymousReportModel;
