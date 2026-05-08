import express from 'express';
import mongoose from 'mongoose';
import { authenticate } from '../middleware/auth.js';
import AuditModel from '../models/audit.js';
import EvidenceModel from '../models/evidence.js';
import StudentModel from '../models/student.js';
import StaffModel from '../models/staff.js';
import CaseModel from '../models/case.js';
import StudentReportModel from '../models/studentReport.js';
import AnonymousReportModel from '../models/anonymousReport.js';
import UserModel from '../models/user.js';

const router = express.Router();

router.use(authenticate);

const ROLE_ACCESS = {
    students: ['admin', 'academic_office', 'security_officer'],
    staff: ['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'maintenance'],
    cases: ['admin', 'academic_office', 'security_officer'],
    studentReports: ['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'security_officer', 'maintenance'],
    ownReports: ['student', 'general_user'],
    anonymousReports: ['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'security_officer', 'maintenance'],
    evidence: ['admin', 'security_officer'],
    auditLogs: ['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'security_officer', 'maintenance'],
    users: ['admin'],
};

function can(role, scope) {
    return ROLE_ACCESS[scope]?.includes(role);
}

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchOr(fields, regex) {
    return fields.map((field) => ({ [field]: regex }));
}

function objectIdMatch(q) {
    return mongoose.Types.ObjectId.isValid(q) ? [{ _id: new mongoose.Types.ObjectId(q) }] : [];
}

function getStaffReportScope(user) {
    const role = user?.role;
    if (role === 'dean_of_students') {
        return { owner_role: 'student' };
    }
    if (role === 'secretary') {
        return { owner_role: 'general_user', category: 'maintenance_issue' };
    }
    if (role === 'maintenance') {
        return { category: 'maintenance_issue', routed_to_maintenance: true };
    }
    return {};
}

function getOwnReportScope(user) {
    return {
        $or: [
            { owner_id: String(user.id || user._id || '') },
            { owner_username: user.username },
        ],
    };
}

function andSearch(baseQuery, searchConditions) {
    if (!Object.keys(baseQuery).length) {
        return { $or: searchConditions };
    }
    return { $and: [baseQuery, { $or: searchConditions }] };
}

function mapStudent(student) {
    const obj = student.toObject ? student.toObject({ virtuals: true }) : student;
    return {
        _id: obj._id,
        studentId: obj.studentId,
        fullName: obj.fullName || [obj.personalInfo?.firstName, obj.personalInfo?.surName].filter(Boolean).join(' ').trim(),
        program: obj.program,
        year: obj.year,
        status: obj.status,
    };
}

function mapReport(report) {
    const obj = report.toObject ? report.toObject() : report;
    return {
        _id: obj._id,
        tracking_code: obj.tracking_code,
        title: obj.title,
        description: obj.description,
        category: obj.category,
        status: obj.status,
        location: obj.location,
        owner_name: obj.owner_name,
        owner_username: obj.owner_username,
        owner_role: obj.owner_role,
    };
}

router.get('/', async (req, res) => {
    try {
        const q = String(req.query.q || '').trim();
        const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 5, 1), 10);

        const emptyResults = {
            students: [],
            staff: [],
            cases: [],
            reports: [],
            anonymousReports: [],
            evidence: [],
            auditLogs: [],
            users: [],
        };

        if (q.length < 2) {
            return res.json(emptyResults);
        }

        const regex = new RegExp(escapeRegex(q), 'i');
        const role = req.user?.role;
        const canViewStudents = ['admin', 'security_officer', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'registrar'].includes(role);
        const canViewCases = ['admin', 'security_officer', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'registrar'].includes(role);
        const canViewReports = ['admin', 'chief_security_officer', 'dean_of_students', 'assistant_dean', 'secretary', 'registrar', 'maintenance'].includes(role);

        const students = canViewStudents ? await StudentModel.find({
            $or: [
                { fullName: regex },
                { studentId: regex },
                { program: regex }
            ]
        }).limit(5) : [];

        const cases = canViewCases ? await CaseModel.find({
            $or: [
                { offense_type: regex },
                { description: regex },
                { location: regex }
            ]
        }).limit(5) : [];

        const reports = canViewReports ? await AnonymousReportModel.find({
            $or: [
                { title: regex },
                { description: regex },
                { tracking_code: regex }
            ]
        }).limit(5) : [];

        res.json({
            students,
            cases,
            reports
        });
    } catch (err) {
        console.error('Search failed:', err);
        res.status(500).json({ error: 'Search failed' });
    }
});

export default router;
