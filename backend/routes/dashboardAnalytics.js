import express from 'express';
import StudentReportModel from '../models/studentReport.js';
import AnonymousReportModel from '../models/anonymousReport.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { generateDashboardInsights } from '../utils/nlpAnalytics.js';
import { getStaffReportScope } from '../utils/studentReportAccess.js';
import { cacheResponse } from '../middleware/cache.js';

const router = express.Router();

const STAFF_ROLES = [
  'admin',
  'chief_security_officer',
  'dean_of_students',
  'warden',
  'secretary',
  'registrar',
  'security_officer',
  'maintenance',
];

function mapPrioritizedReport(doc, source) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(obj._id),
    source,
    trackingCode: obj.tracking_code,
    title: obj.title,
    category: obj.category,
    status: obj.status,
    location: obj.location,
    summary: obj.ai_summary || String(obj.description || '').slice(0, 140),
    priority: obj.ai_priority || 'Medium',
    priorityScore: obj.ai_priority_score ?? 50,
    submittedAt: obj.createdAt,
  };
}

router.get(
  '/insights',
  authenticate,
  authorize(STAFF_ROLES),
  cacheResponse(),
  async (req, res) => {
    try {
      const studentScope = getStaffReportScope(req.user) || {};
      const anonymousScope =
        req.user.role === 'maintenance' ? { category: 'maintenance_issue' } : {};

      const [studentReports, anonymousReports] = await Promise.all([
        StudentReportModel.find(studentScope)
          .sort({ ai_priority_score: -1, createdAt: -1 })
          .limit(40)
          .lean(),
        AnonymousReportModel.find(anonymousScope)
          .sort({ ai_priority_score: -1, createdAt: -1 })
          .limit(40)
          .lean(),
      ]);

      const combined = [
        ...studentReports.map((item) => mapPrioritizedReport(item, 'student')),
        ...anonymousReports.map((item) => mapPrioritizedReport(item, 'anonymous')),
      ].sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

      const topPriorities = combined.slice(0, 8);
      const pendingReviewReports =
        studentReports.filter((item) => item.status === 'Submitted' || item.status === 'Under Review').length +
        anonymousReports.filter((item) => item.status === 'Submitted' || item.status === 'Under Review').length;
      const highPriorityReports = combined.filter(
        (item) => item.priority === 'High' || item.priority === 'Critical',
      ).length;

      const metrics = {
        totalCampusReports: studentReports.length + anonymousReports.length,
        pendingReviewReports,
        highPriorityReports,
        maintenanceReports:
          studentReports.filter((item) => item.category === 'maintenance_issue').length +
          anonymousReports.filter((item) => item.category === 'maintenance_issue').length,
        disciplinaryReports:
          studentReports.filter((item) => item.category === 'disciplinary_case').length +
          anonymousReports.filter((item) => item.category === 'disciplinary_case').length,
      };

      const insights = await generateDashboardInsights({
        role: req.user.role,
        metrics,
        prioritizedReports: topPriorities,
      });

      res.json({
        metrics,
        ...insights,
      });
    } catch (error) {
      console.error('Dashboard insights error:', error);
      res.status(500).json({ error: 'Failed to generate dashboard insights.' });
    }
  },
);

export default router;
