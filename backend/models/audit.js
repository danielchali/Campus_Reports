import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema({
    action: { type: String, required: true },
    entity: String,
    entityId: String,
    user: { type: String, required: true },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String,
    date: { type: Date, default: Date.now },
});

const AuditModel = mongoose.models.Audit || mongoose.model('Audit', auditSchema);

export default AuditModel;
