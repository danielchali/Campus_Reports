import mongoose from 'mongoose';
import StatementRequestModel from '../models/statementRequest.js';
import StudentModel from '../models/student.js';
import UserModel from '../models/user.js';
import CaseModel from '../models/case.js';
import { logAudit } from './auditController.js';
import { createNotification } from '../utils/notifications.js';

function caseIncludesStudent(caseDoc, studentId) {
    const normalized = String(studentId).trim();
    if (caseDoc.student_id === normalized) return true;
    if (Array.isArray(caseDoc.student_ids) && caseDoc.student_ids.includes(normalized)) {
        return true;
    }
    return false;
}

async function resolveLinkedCase(caseId, studentId) {
    if (!caseId) {
        return null;
    }

    const normalizedCaseId = String(caseId).trim();
    if (!mongoose.Types.ObjectId.isValid(normalizedCaseId)) {
        const error = new Error('Invalid case ID');
        error.status = 400;
        throw error;
    }

    const caseDoc = await CaseModel.findById(normalizedCaseId);
    if (!caseDoc) {
        const error = new Error('Case not found');
        error.status = 404;
        throw error;
    }

    if (!caseIncludesStudent(caseDoc, studentId)) {
        const error = new Error('Case does not belong to this student');
        error.status = 400;
        throw error;
    }

    return {
        caseMongoId: caseDoc._id.toString(),
        caseNumber: caseDoc.case_id || null,
    };
}

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
        const { studentId, caseId, title, prompt, dueAt } = req.body || {};
        if (!studentId || !title || !prompt) {
            return res.status(400).json({ error: 'studentId, title, and prompt are required' });
        }

        const normalizedStudentId = String(studentId).trim();
        const student = await StudentModel.findOne({ studentId: normalizedStudentId });
        if (!student) {
            return res.status(404).json({ error: 'Student not found' });
        }

        let linkedCase = null;
        try {
            linkedCase = await resolveLinkedCase(caseId, normalizedStudentId);
        } catch (linkError) {
            return res.status(linkError.status || 400).json({ error: linkError.message });
        }

        const created = await StatementRequestModel.create({
            studentId: normalizedStudentId,
            caseMongoId: linkedCase?.caseMongoId,
            caseNumber: linkedCase?.caseNumber,
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
            const notificationMessage = created.caseNumber
                ? `You have a new statement request for Case ${created.caseNumber}: ${created.title}`
                : `You have a new statement request: ${created.title}`;

            await createNotification({
                userId: studentUser._id,
                type: 'statement_request',
                message: notificationMessage,
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
                caseMongoId: created.caseMongoId || null,
                caseNumber: created.caseNumber || null,
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
        const { studentId, caseId } = req.query;
        const query = {};
        if (studentId) query.studentId = String(studentId).trim();
        if (caseId) query.caseMongoId = String(caseId).trim();

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
                caseMongoId: record.caseMongoId || null,
                caseNumber: record.caseNumber || null,
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
