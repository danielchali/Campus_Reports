import StatementRequestModel from '../models/statementRequest.js';
import StudentModel from '../models/student.js';
import UserModel from '../models/user.js';
import { logAudit } from './auditController.js';
import { createNotification } from '../utils/notifications.js';

function isExpired(record) {
    return Boolean(record?.dueAt && new Date(record.dueAt).getTime() < Date.now());
}

async function expireIfNeeded(record) {
    if (!record) return record;
    if (record.status === 'pending' && isExpired(record)) {
        record.status = 'expired';
        await record.save();
    }
    return record;
}

export async function createStatementRequest(req, res) {
    try {
        const { studentId, title, prompt, dueAt } = req.body || {};
        if (!studentId || !title || !prompt) {
            return res.status(400).json({ error: 'studentId, title, and prompt are required' });
        }

        const student = await StudentModel.findOne({ studentId: String(studentId).trim() });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const created = await StatementRequestModel.create({
            studentId: String(studentId).trim(),
            title: String(title).trim(),
            prompt: String(prompt).trim(),
            dueAt: dueAt ? new Date(dueAt) : undefined,
            createdBy: req.user?.username || 'unknown',
            notificationSentAt: new Date()
        });

        const studentUser = await UserModel.findOne({
            username: created.studentId,
            role: 'student',
        }).select('_id');

        if (studentUser?._id) {
            await createNotification({
                userId: studentUser._id,
                type: 'statement_request',
                message: `You have a new statement request: ${created.title}`,
                link: '/student-dashboard',
            });
        }

        await logAudit({
            action: 'statement_request_created',
            entity: 'statement_request',
            entityId: created._id,
            user: req.user?.username,
            details: {
                studentId: created.studentId,
                title: created.title,
                dueAt: created.dueAt || null,
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.status(201).json(created);
    } catch (err) {
        console.error('createStatementRequest error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function listStatementRequestsForStudent(req, res) {
    try {
        const studentId = req.user?.username;
        let records = await StatementRequestModel.find({ studentId }).sort({ createdAt: -1 });
        records = await Promise.all(records.map((record) => expireIfNeeded(record)));
        res.json(records);
    } catch (err) {
        console.error('listStatementRequestsForStudent error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function listStatementRequestsForStaff(req, res) {
    try {
        const { studentId } = req.query;
        const query = {};
        if (studentId) query.studentId = String(studentId).trim();

        let records = await StatementRequestModel.find(query).sort({ createdAt: -1 }).limit(200);
        records = await Promise.all(records.map((record) => expireIfNeeded(record)));
        res.json(records);
    } catch (err) {
        console.error('listStatementRequestsForStaff error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}

export async function submitStatementRequest(req, res) {
    try {
        const { id } = req.params;
        const { statement, signature, consentAccepted } = req.body || {};
        const record = await StatementRequestModel.findById(id);

        if (!record) {
            return res.status(404).json({ error: 'Statement request not found' });
        }

        if (record.studentId !== req.user?.username) {
            return res.status(403).json({ error: 'Forbidden' });
        }

        await expireIfNeeded(record);
        if (record.status !== 'pending') {
            return res.status(400).json({ error: `Cannot submit a ${record.status} request` });
        }

        if (!statement || !signature || !consentAccepted) {
            return res.status(400).json({ error: 'statement, signature, and consentAccepted are required' });
        }

        record.submittedStatement = String(statement).trim();
        record.submittedSignature = String(signature);
        record.consentAccepted = true;
        record.submittedAt = new Date();
        record.status = 'submitted';
        await record.save();

        await logAudit({
            action: 'statement_request_submitted',
            entity: 'statement_request',
            entityId: record._id,
            user: req.user?.username,
            details: {
                studentId: record.studentId,
                title: record.title,
                submittedAt: record.submittedAt,
                timestamp: new Date().toISOString()
            },
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
        });

        res.json(record);
    } catch (err) {
        console.error('submitStatementRequest error:', err);
        res.status(500).json({ error: 'Server error' });
    }
}
