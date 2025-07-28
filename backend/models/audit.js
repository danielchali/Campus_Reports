import mongoose from 'mongoose';
import db from './db.js';
const dbType = process.env.DB_TYPE || 'mongo';

let AuditModel;

if (dbType === 'mongo') {
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
    AuditModel = mongoose.models.Audit || mongoose.model('Audit', auditSchema);
} else if (dbType === 'mysql') {
    AuditModel = null;
}

export default AuditModel;

export async function createAuditTable(db) {
    await db.execute(`CREATE TABLE IF NOT EXISTS audit (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(255) NOT NULL,
        entity VARCHAR(255),
        entityId VARCHAR(255),
        user VARCHAR(255) NOT NULL,
        details JSON,
        ipAddress VARCHAR(45),
        userAgent TEXT,
        date DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}