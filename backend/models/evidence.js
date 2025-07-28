import mongoose from 'mongoose';
import db from './db.js';
const dbType = process.env.DB_TYPE || 'mongo';

let EvidenceModel;

if (dbType === 'mongo') {
    const evidenceSchema = new mongoose.Schema({
        caseId: { type: String, required: true },
        filename: String,
        uploadedBy: String,
        date: { type: Date, default: Date.now },
    });
    EvidenceModel = mongoose.models.Evidence || mongoose.model('Evidence', evidenceSchema);
} else if (dbType === 'mysql') {
    EvidenceModel = null;
}

export default EvidenceModel;

// MySQL table creation helper
export async function createEvidenceTable(db) {
    await db.execute(`CREATE TABLE IF NOT EXISTS evidence (
        id INT AUTO_INCREMENT PRIMARY KEY,
        caseId VARCHAR(255),
        filename VARCHAR(255),
        uploadedBy VARCHAR(255),
        date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}