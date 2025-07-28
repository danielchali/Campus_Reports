import mongoose from 'mongoose';
import db from './db.js';

const dbType = process.env.DB_TYPE || 'mongo';

let CaseModel;

if (dbType === 'mongo') {
    const caseSchema = new mongoose.Schema({
        // Support both single student (backward compatibility) and multiple students
        student_id: { type: String, required: false }, // Keep for backward compatibility
        student_ids: [{ type: String, required: false }], // New field for multiple students
        incident_date: String,
        description: String,
        offense_type: String,
        severity: String,
        status: String,
        sanctions: String,
        attachments: [String],
        created_by: String,
        case_type: { type: String, enum: ['single', 'group'], default: 'single' }, // New field to distinguish case types
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
    });
    CaseModel = mongoose.models.Case || mongoose.model('Case', caseSchema);
} else if (dbType === 'mysql') {
    // MySQL: Use raw queries in controller
    CaseModel = null;
}

export default CaseModel;