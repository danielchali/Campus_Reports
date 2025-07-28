import EvidenceModel, { createEvidenceTable } from '../models/evidence.js';
import db from '../models/db.js';
import fs from 'fs';
import path from 'path';
import { logAudit } from './auditController.js';
const dbType = process.env.DB_TYPE || 'mongo';

export async function listEvidence(req, res) {
    try {
        let evidence;
        if (dbType === 'mongo') {
            evidence = await EvidenceModel.find();
        } else if (dbType === 'mysql') {
            await createEvidenceTable(db);
            const [rows] = await db.execute('SELECT * FROM evidence');
            evidence = rows;
        }
        res.json(evidence);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function uploadEvidence(req, res) {
    try {
        const { caseId } = req.body;
        const file = req.file;

        console.log('Upload request received:', { caseId, file: file ? file.originalname : 'No file' });

        if (!file) return res.status(400).json({ error: 'No file uploaded' });
        if (!caseId) return res.status(400).json({ error: 'Case ID is required' });

        // Verify upload directory exists and is writable
        const uploadDir = path.join(process.cwd(), 'backend', 'uploads', 'evidence');
        if (!fs.existsSync(uploadDir)) {
            console.error('Upload directory does not exist:', uploadDir);
            return res.status(500).json({ error: 'Upload directory not configured' });
        }

        try {
            fs.accessSync(uploadDir, fs.constants.W_OK);
        } catch (accessErr) {
            console.error('Upload directory not writable:', uploadDir, accessErr);
            return res.status(500).json({ error: 'Upload directory not writable' });
        }

        let result;
        if (dbType === 'mongo') {
            if (!EvidenceModel) {
                console.error('EvidenceModel not available for MongoDB');
                return res.status(500).json({ error: 'Database model not available' });
            }
            result = await EvidenceModel.create({
                caseId,
                filename: file.filename,
                uploadedBy: req.user.username,
                date: new Date(),
            });
        } else if (dbType === 'mysql') {
            if (!db) {
                console.error('Database connection not available for MySQL');
                return res.status(500).json({ error: 'Database connection not available' });
            }
            await createEvidenceTable(db);
            await db.execute('INSERT INTO evidence (caseId, filename, uploadedBy, date) VALUES (?, ?, ?, ?)', [caseId, file.filename, req.user.username, new Date()]);
            const [rows] = await db.execute('SELECT * FROM evidence WHERE caseId = ? AND filename = ?', [caseId, file.filename]);
            result = rows[0];
        } else {
            console.error('Unsupported database type:', dbType);
            return res.status(500).json({ error: 'Unsupported database type' });
        }

        console.log('Evidence uploaded successfully:', result);

        // Audit log for evidence upload
        await logAudit({
            action: 'evidence_uploaded',
            entity: 'evidence',
            entityId: result._id || result.id,
            user: req.user && req.user.username,
            details: {
                caseId,
                filename: file.filename,
                originalName: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json(result);
    } catch (err) {
        console.error('Error in uploadEvidence:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
}

export async function downloadEvidence(req, res) {
    try {
        const { id } = req.params;
        let evidence;
        if (dbType === 'mongo') {
            evidence = await EvidenceModel.findById(id);
        } else if (dbType === 'mysql') {
            await createEvidenceTable(db);
            const [rows] = await db.execute('SELECT * FROM evidence WHERE id = ?', [id]);
            evidence = rows[0];
        }
        if (!evidence) return res.status(404).json({ error: 'Evidence not found' });
        const filePath = path.join(process.cwd(), 'backend', 'uploads', 'evidence', evidence.filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        res.download(filePath, evidence.filename);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function deleteEvidence(req, res) {
    try {
        const { id } = req.params;
        let evidence;
        if (dbType === 'mongo') {
            evidence = await EvidenceModel.findById(id);
            if (!evidence) return res.status(404).json({ error: 'Evidence not found' });
            await EvidenceModel.findByIdAndDelete(id);
        } else if (dbType === 'mysql') {
            await createEvidenceTable(db);
            const [rows] = await db.execute('SELECT * FROM evidence WHERE id = ?', [id]);
            evidence = rows[0];
            if (!evidence) return res.status(404).json({ error: 'Evidence not found' });
            await db.execute('DELETE FROM evidence WHERE id = ?', [id]);
        }
        // Remove file from disk
        const filePath = path.join(process.cwd(), 'backend', 'uploads', 'evidence', evidence.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Audit log for evidence deletion
        await logAudit({
            action: 'evidence_deleted',
            entity: 'evidence',
            entityId: id,
            user: req.user && req.user.username,
            details: {
                caseId: evidence.caseId,
                filename: evidence.filename,
                uploadedBy: evidence.uploadedBy,
                timestamp: new Date().toISOString(),
                reason: 'Evidence permanently deleted'
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}