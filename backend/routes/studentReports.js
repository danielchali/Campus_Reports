import express from 'express';
import StudentReportModel from '../models/studentReport.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Generate tracking code
function generateTrackingCode() {
    return `KMU-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
}

// Helper: map DB doc to frontend shape
function mapReport(doc) {
    const obj = doc.toObject ? doc.toObject() : doc;
    return {
        id: String(obj._id),
        trackingCode: obj.tracking_code,
        title: obj.title,
        description: obj.description,
        category: obj.category,
        anonymous: obj.anonymous,
        location: obj.location,
        incidentDate: obj.incident_date,
        submittedAt: obj.createdAt?.toISOString?.() || obj.createdAt,
        status: obj.status,
        ownerId: obj.owner_id,
        ownerUsername: obj.owner_username,
        ownerName: obj.owner_name,
        seenBy: obj.seen_by || [],
        updates: (obj.updates || []).map((u) => ({
            id: String(u._id),
            status: u.status,
            message: u.message,
            createdAt: u.createdAt?.toISOString?.() || u.createdAt,
        })),
    };
}

// POST / — Student creates a report
router.post('/', authenticate, authorize(['student']), async (req, res) => {
    try {
        const { title, description, category, anonymous, location, incidentDate } = req.body;

        if (!title || !description || !category || !location || !incidentDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const report = await StudentReportModel.create({
            tracking_code: generateTrackingCode(),
            title: title.trim(),
            description: description.trim(),
            category,
            anonymous: !!anonymous,
            location: location.trim(),
            incident_date: incidentDate,
            status: 'Submitted',
            owner_id: String(req.user.id || req.user._id),
            owner_username: req.user.username,
            owner_name: req.user.name || req.user.username,
            seen_by: [],
            updates: [{
                status: 'Submitted',
                message: 'Your report has been received and is waiting for review by the appropriate office.',
                createdBy: req.user.username,
            }],
        });

        res.status(201).json(mapReport(report));
    } catch (err) {
        console.error('Create student report error:', err);
        res.status(500).json({ error: 'Failed to create report' });
    }
});

// GET /mine — Student gets their own reports
router.get('/mine', authenticate, authorize(['student']), async (req, res) => {
    try {
        const userId = String(req.user.id || req.user._id);
        const username = req.user.username;
        const search = req.query.search;

        const query = {
            $or: [{ owner_id: userId }, { owner_username: username }],
        };
        if (search) {
            const regex = { $regex: search, $options: 'i' };
            query.$and = [
                { $or: [{ owner_id: userId }, { owner_username: username }] },
                {
                    $or: [
                        { title: regex },
                        { description: regex },
                        { tracking_code: regex },
                        { location: regex },
                        { category: regex },
                    ],
                },
            ];
            delete query.$or;
        }

        const reports = await StudentReportModel.find(query).sort({ createdAt: -1 });

        res.json(reports.map(mapReport));
    } catch (err) {
        console.error('Fetch my reports error:', err);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// GET /metrics — Student gets their report metrics
router.get('/metrics', authenticate, authorize(['student']), async (req, res) => {
    try {
        const userId = String(req.user.id || req.user._id);
        const username = req.user.username;

        const reports = await StudentReportModel.find({
            $or: [{ owner_id: userId }, { owner_username: username }],
        }).sort({ createdAt: -1 }).limit(100);

        const total = reports.length;
        const anonymous = reports.filter((r) => r.anonymous).length;
        const open = reports.filter((r) => r.status !== 'Resolved').length;
        const resolved = reports.filter((r) => r.status === 'Resolved').length;
        const recent = reports.slice(0, 5).map(mapReport);

        res.json({ total, anonymous, open, resolved, recent });
    } catch (err) {
        console.error('Fetch student metrics error:', err);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

// GET / — Staff gets all student reports
router.get('/', authenticate, authorize(['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'security_officer', 'maintenance']), async (req, res) => {
    try {
        const search = req.query.search;
        const query = {};
        if (search) {
            const regex = { $regex: search, $options: 'i' };
            query.$or = [
                { title: regex },
                { description: regex },
                { tracking_code: regex },
                { location: regex },
                { category: regex },
                { owner_name: regex },
                { owner_username: regex },
            ];
        }

        const reports = await StudentReportModel.find(query).sort({ createdAt: -1 });
        res.json(reports.map(mapReport));
    } catch (err) {
        console.error('Fetch all reports error:', err);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// GET /unread-count — Staff gets count of unseen reports
router.get('/unread-count', authenticate, authorize(['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'security_officer', 'maintenance']), async (req, res) => {
    try {
        const userId = String(req.user.id || req.user._id);
        const count = await StudentReportModel.countDocuments({
            seen_by: { $ne: userId },
        });
        res.json({ count });
    } catch (err) {
        console.error('Fetch unread count error:', err);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});

// PATCH /:id/seen — Mark a report as seen
router.patch('/:id/seen', authenticate, async (req, res) => {
    try {
        const userId = String(req.user.id || req.user._id);
        const report = await StudentReportModel.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        if (!report.seen_by.includes(userId)) {
            report.seen_by.push(userId);
            await report.save();
        }

        res.json(mapReport(report));
    } catch (err) {
        console.error('Mark seen error:', err);
        res.status(500).json({ error: 'Failed to mark as seen' });
    }
});

// PATCH /mark-all-seen — Mark all reports as seen
router.patch('/mark-all-seen', authenticate, authorize(['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'security_officer', 'maintenance']), async (req, res) => {
    try {
        const userId = String(req.user.id || req.user._id);
        await StudentReportModel.updateMany(
            { seen_by: { $ne: userId } },
            { $addToSet: { seen_by: userId } },
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Mark all seen error:', err);
        res.status(500).json({ error: 'Failed to mark all as seen' });
    }
});

// PATCH /:id/status — Staff updates a report's status
router.patch('/:id/status', authenticate, authorize(['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'security_officer', 'maintenance']), async (req, res) => {
    try {
        const { status, message } = req.body;

        if (!status || !message) {
            return res.status(400).json({ error: 'Status and message are required' });
        }

        const validStatuses = ['Submitted', 'Under Review', 'In Progress', 'Resolved'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }

        const report = await StudentReportModel.findById(req.params.id);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }

        const userId = String(req.user.id || req.user._id);
        if (!report.seen_by.includes(userId)) {
            report.seen_by.push(userId);
        }

        report.status = status;
        report.updates.unshift({
            status,
            message: message.trim(),
            createdBy: req.user.username || req.user.name,
        });
        report.updatedAt = new Date();

        await report.save();
        res.json(mapReport(report));
    } catch (err) {
        console.error('Update status error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

// POST /migrate — One-time migration from localStorage data
router.post('/migrate', authenticate, authorize(['student']), async (req, res) => {
    try {
        const { reports } = req.body;

        if (!Array.isArray(reports) || reports.length === 0) {
            return res.json({ migrated: 0 });
        }

        const userId = String(req.user.id || req.user._id);
        let migrated = 0;

        for (const r of reports) {
            // Only migrate reports owned by this user
            if (r.ownerId !== userId && r.ownerUsername !== req.user.username) continue;

            // Skip if already migrated (by tracking code)
            const existing = await StudentReportModel.findOne({ tracking_code: r.trackingCode });
            if (existing) continue;

            await StudentReportModel.create({
                tracking_code: r.trackingCode,
                title: r.title,
                description: r.description,
                category: r.category,
                anonymous: r.anonymous,
                location: r.location,
                incident_date: r.incidentDate,
                status: r.status,
                owner_id: r.ownerId || userId,
                owner_username: r.ownerUsername || req.user.username,
                owner_name: r.ownerName || req.user.username,
                seen_by: r.seenBy || [],
                updates: (r.updates || []).map((u) => ({
                    status: u.status,
                    message: u.message,
                    createdBy: '',
                })),
                createdAt: r.submittedAt ? new Date(r.submittedAt) : new Date(),
            });

            migrated++;
        }

        res.json({ migrated });
    } catch (err) {
        console.error('Migration error:', err);
        res.status(500).json({ error: 'Migration failed' });
    }
});

export default router;
