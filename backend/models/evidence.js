import mongoose from 'mongoose';

const evidenceSchema = new mongoose.Schema({
    caseId: { type: String, required: true },
    filename: String,
    uploadedBy: String,
    date: { type: Date, default: Date.now },
});

const EvidenceModel = mongoose.models.Evidence || mongoose.model('Evidence', evidenceSchema);

export default EvidenceModel;
