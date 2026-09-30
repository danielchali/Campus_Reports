import express from 'express';
import StudentReportModel from '../models/studentReport.js';
import AnonymousReportModel from '../models/anonymousReport.js';
import CaseModel from '../models/case.js';
import UserModel from '../models/user.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { getStaffReportScope } from '../utils/studentReportAccess.js';
import { buildAnalyticsSummary } from '../utils/analytics.js';
import PerformanceMetricModel from '../models/performanceMetric.js';

const router = express.Router();

const ANALYTICS_ROLES = [
  'admin',
  'chief_security_officer',
  'dean_of_students',
  'warden',
  'secretary',
  'registrar',
  'security_officer',
  'maintenance',
];

function average(values) {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100) / 100;
}

function percentile(values, percentileValue) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return Math.round(sorted[Math.min(Math.ceil(sorted.length * percentileValue) - 1, sorted.length - 1)] * 100) / 100;
}

async function buildPerformanceSummary() {
  const since = new Date(Date.now() - 15 * 60 * 1000);
  const samples = await PerformanceMetricModel.find({ receivedAt: { $gte: since } })
    .select('path navigationDuration domContentLoaded firstContentfulPaint largestContentfulPaint cumulativeLayoutShift connectionType receivedAt')
    .sort({ receivedAt: -1 })
    .limit(1000)
    .lean();
  const values = (field) => samples.map((sample) => sample[field]).filter((value) => typeof value === 'number');

  return {
    windowMinutes: 15,
    samples: samples.length,
    latestAt: samples[0]?.receivedAt || null,
    navigationDuration: { average: average(values('navigationDuration')), p75: percentile(values('navigationDuration'), 0.75) },
    domContentLoaded: { average: average(values('domContentLoaded')), p75: percentile(values('domContentLoaded'), 0.75) },
    firstContentfulPaint: { average: average(values('firstContentfulPaint')), p75: percentile(values('firstContentfulPaint'), 0.75) },
    largestContentfulPaint: { average: average(values('largestContentfulPaint')), p75: percentile(values('largestContentfulPaint'), 0.75) },
    cumulativeLayoutShift: { average: average(values('cumulativeLayoutShift')), p75: percentile(values('cumulativeLayoutShift'), 0.75) },
    topRoutes: Object.entries(samples.reduce((counts, sample) => {
      counts[sample.path] = (counts[sample.path] || 0) + 1;
      return counts;
    }, {})).sort(([, left], [, right]) => right - left).slice(0, 5).map(([path, count]) => ({ path, count })),
  };
}

router.get('/summary', authenticate, authorize(ANALYTICS_ROLES), async (req, res) => {
  try {
    const studentScope = getStaffReportScope(req.user) || {};
    const anonymousScope = req.user.role === 'maintenance' ? { category: 'maintenance_issue' } : {};
    const caseScope = {};

    const [studentReports, anonymousReports, cases, users] = await Promise.all([
      StudentReportModel.find(studentScope)
        .select('category status title description details ai_keywords createdAt')
        .lean(),
      AnonymousReportModel.find(anonymousScope)
        .select('category status title description details ai_keywords createdAt')
        .lean(),
      CaseModel.find(caseScope)
        .select('offense_type description student_case_process')
        .lean(),
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
      performance: req.user.role === 'admin' ? await buildPerformanceSummary() : null,
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to load analytics summary.' });
  }
});

export default router;
