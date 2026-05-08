import express from 'express';
import { authenticate } from '../middleware/auth.js';
import StudentModel from '../models/student.js';
import CaseModel from '../models/case.js';
import AnonymousReportModel from '../models/anonymousReport.js';

const router = express.Router();

router.use(authenticate);

router.get('/', async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.length < 2) {
            return res.json({ students: [], cases: [], reports: [] });
        }

        const regex = new RegExp(q, 'i');

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
        console.error(err);
        res.status(500).json({ error: 'Search failed' });
    }
});

export default router;
