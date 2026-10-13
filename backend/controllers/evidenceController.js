import EvidenceModel from '../models/evidence.js';
import fs from 'fs';
import path from 'path';
import { getUploadDirectory } from '../utils/uploadPaths.js';
import { logAudit } from './auditController.js';
import { getClientIpAddress } from '../utils/requestMetadata.js';

export async function listEvidence(req, res) {
    try {
        const query = {};
        if (req.query.caseId) {
            query.caseId = req.query.caseId;
        }

        const evidence = await EvidenceModel.find(query).sort({ date: -1 });
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

        const uploadDir = getUploadDirectory('evidence');
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

        const result = await EvidenceModel.create({
            caseId,
            filename: file.filename,
            uploadedBy: req.user.username,
            date: new Date(),
        });

        console.log('Evidence uploaded successfully:', result);

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
            ipAddress: getClientIpAddress(req),
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
        const evidence = await EvidenceModel.findById(id);
        if (!evidence) return res.status(404).json({ error: 'Evidence not found' });
        const filePath = path.join(getUploadDirectory('evidence'), evidence.filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });
        res.download(filePath, evidence.filename);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}

export async function deleteEvidence(req, res) {
    try {
        const { id } = req.params;
        const evidence = await EvidenceModel.findById(id);
        if (!evidence) return res.status(404).json({ error: 'Evidence not found' });
        await EvidenceModel.findByIdAndDelete(id);

        const filePath = path.join(getUploadDirectory('evidence'), evidence.filename);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

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
            ipAddress: getClientIpAddress(req),
            userAgent: req.get('User-Agent')
        });

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
}
