import mongoose from 'mongoose';

const statementRequestSchema = new mongoose.Schema({
    studentId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    prompt: { type: String, required: true, trim: true },
    dueAt: { type: Date, required: false },
    status: {
        type: String,
        enum: ['pending', 'submitted', 'expired', 'cancelled'],
        default: 'pending',
        index: true
    },
    createdBy: { type: String, required: true },
    submittedStatement: { type: String, default: '' },
    submittedSignature: { type: String, default: '' },
    consentAccepted: { type: Boolean, default: false },
    submittedAt: { type: Date, required: false },
    viewedAt: { type: Date, required: false },
    notificationSentAt: { type: Date, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

statementRequestSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

const StatementRequestModel = mongoose.models.StatementRequest || mongoose.model('StatementRequest', statementRequestSchema);

export default StatementRequestModel;
