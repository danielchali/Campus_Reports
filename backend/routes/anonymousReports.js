import express from 'express';
import crypto from 'crypto';
import AnonymousReportModel from '../models/anonymousReport.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// --- Helpers ---

function generateTrackingCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let code = 'KMU-';
    for (let i = 0; i < 8; i++) {
        if (i === 4) code += '-';
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function hashIp(ip) {
    if (!ip) return '';
    return crypto.createHash('sha256').update(ip + (process.env.IP_SALT || 'campus-reports-salt')).digest('hex').slice(0, 16);
}

// --- PUBLIC ROUTES (no auth required) ---

// POST /api/anonymous-reports — submit a new anonymous report
router.post('/', async (req, res) => {
    try {
        const { category, title, description, location, incident_date, contact_email } = req.body;

        if (!category || !title || !description || !location || !incident_date) {
            return res.status(400).json({ error: 'All required fields must be provided.' });
        }

        // Generate a unique tracking code
        let tracking_code;
        let attempts = 0;
        do {
            tracking_code = generateTrackingCode();
            attempts++;
        } while (await AnonymousReportModel.exists({ tracking_code }) && attempts < 10);

        const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '';
        const ip_hash = hashIp(ip);

        const report = await AnonymousReportModel.create({
            tracking_code,
            category,
            title: title.trim(),
            description: description.trim(),
            location: location.trim(),
            incident_date,
            contact_email: contact_email ? contact_email.trim() : '',
            ip_hash,
        });

        res.status(201).json({
            message: 'Report submitted successfully.',
            tracking_code: report.tracking_code,
            status: report.status,
            submitted_at: report.createdAt,
        });
    } catch (err) {
        console.error('Anonymous report submission error:', err);
        res.status(500).json({ error: 'Failed to submit report. Please try again.' });
    }
});

// GET /api/anonymous-reports/track/:code — public tracking endpoint
router.get('/track/:code', async (req, res) => {
    try {
        const report = await AnonymousReportModel.findOne({ tracking_code: req.params.code });
        if (!report) {
            return res.status(404).json({ error: 'Report not found. Please check your tracking code.' });
        }

        // Return only safe public-facing fields
        res.json({
            tracking_code: report.tracking_code,
            category: report.category,
            title: report.title,
            location: report.location,
            incident_date: report.incident_date,
            status: report.status,
            submitted_at: report.createdAt,
        });
    } catch (err) {
        console.error('Anonymous report tracking error:', err);
        res.status(500).json({ error: 'Failed to fetch report status.' });
    }
});

// --- PROTECTED ROUTES (staff only) ---

// GET /api/anonymous-reports — list all anonymous reports (admin/staff only)
router.get('/', authenticate, authorize(['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'security_officer']), async (req, res) => {
    try {
        const { category, status, search } = req.query;
        const query = {};
        if (category) query.category = category;
        if (status) query.status = status;
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { location: { $regex: search, $options: 'i' } },
                { tracking_code: { $regex: search, $options: 'i' } },
            ];
        }

        const reports = await AnonymousReportModel.find(query).sort({ createdAt: -1 });
        res.json(reports);
    } catch (err) {
        console.error('Fetch anonymous reports error:', err);
        res.status(500).json({ error: 'Failed to fetch reports.' });
    }
});

// GET /api/anonymous-reports/:id — get a single anonymous report (staff only)
router.get('/:id', authenticate, authorize(['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'security_officer']), async (req, res) => {
    try {
        const report = await AnonymousReportModel.findById(req.params.id);
        if (!report) return res.status(404).json({ error: 'Report not found.' });
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch report.' });
    }
});

// PATCH /api/anonymous-reports/:id/status — update status (staff only)
router.patch('/:id/status', authenticate, authorize(['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'security_officer']), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Submitted', 'Under Review', 'In Progress', 'Resolved'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status value.' });
        }

        const report = await AnonymousReportModel.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: new Date() },
            { new: true }
        );
        if (!report) return res.status(404).json({ error: 'Report not found.' });
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update status.' });
    }
});

export default router;
