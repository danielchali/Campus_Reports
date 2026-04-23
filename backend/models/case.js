import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema({
    case_id: { type: String, unique: true, index: true },
    student_id: { type: String, required: false },
    student_ids: [{ type: String, required: false }],
    staff_id: { type: String, required: false },
    staff_ids: [{ type: String, required: false }],
    incident_date: String,
    description: String,
    offense_type: String,
    severity: String,
    status: String,
    sanctions: String,
    student_case_process: mongoose.Schema.Types.Mixed,
    attachments: [String],
    created_by: String,
    case_type: { type: String, enum: ['single_student', 'group_student', 'single_staff', 'group_staff'], default: 'single_student' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
});

const CaseModel = mongoose.models.Case || mongoose.model('Case', caseSchema);

export default CaseModel;
