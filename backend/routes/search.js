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

        // Search students
        const students = await StudentModel.find({
            $or: [
                { fullName: regex },
                { studentId: regex },
                { program: regex }
            ]
        }).limit(5);

        // Search cases
        const cases = await CaseModel.find({
            $or: [
                { offense_type: regex },
                { description: regex },
                { location: regex }
            ]
        }).limit(5);

        // Search reports (if admin/staff, let's limit it to everyone for now)
        const reports = await AnonymousReportModel.find({
            $or: [
                { title: regex },
                { description: regex },
                { tracking_code: regex }
            ]
        }).limit(5);

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
