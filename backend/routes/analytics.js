import express from 'express';
import StudentReportModel from '../models/studentReport.js';
import AnonymousReportModel from '../models/anonymousReport.js';
import CaseModel from '../models/case.js';
import UserModel from '../models/user.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { getStaffReportScope } from '../utils/studentReportAccess.js';
import { buildAnalyticsSummary } from '../utils/analytics.js';

const router = express.Router();

const ANALYTICS_ROLES = [
  'admin',
  'chief_security_officer',
  'dean_of_students',
  'assistant_dean',
  'secretary',
  'registrar',
  'security_officer',
  'maintenance',
];

router.get('/summary', authenticate, authorize(ANALYTICS_ROLES), async (req, res) => {
  try {
    const studentScope = getStaffReportScope(req.user) || {};
    const anonymousScope = req.user.role === 'maintenance' ? { category: 'maintenance_issue' } : {};
    const caseScope = {};

    const [studentReports, anonymousReports, cases, users] = await Promise.all([
      StudentReportModel.find(studentScope).lean(),
      AnonymousReportModel.find(anonymousScope).lean(),
      CaseModel.find(caseScope).lean(),
      req.user.role === 'admin' ? UserModel.find({}).select('role').lean() : Promise.resolve([]),
    ]);

    const summary = buildAnalyticsSummary({
      studentReports,
      anonymousReports,
      cases,
      users,
    });

    res.json({
      ...summary,
      system: req.user.role === 'admin' ? summary.system : null,
      permissions: { canViewSystemAnalytics: req.user.role === 'admin' },
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to load analytics summary.' });
  }
});

export default router;
