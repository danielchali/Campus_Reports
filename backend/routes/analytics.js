import express from 'express';
import StudentReportModel from '../models/studentReport.js';
import AnonymousReportModel from '../models/anonymousReport.js';
import CaseModel from '../models/case.js';
import UserModel from '../models/user.js';
import WorkOrderModel from '../models/workOrder.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { getStaffReportScope } from '../utils/studentReportAccess.js';
import { buildAnalyticsSummary, buildWorkOrderSummary } from '../utils/analytics.js';
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

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function emptyScope() {
  return { _id: null };
}

async function resolveWardenHostel(user) {
  const tokenHostel = String(user?.hostel || '').trim();
  if (tokenHostel) return tokenHostel;
  if (!user?.id) return '';

  const account = await UserModel.findById(user.id).select('hostel').lean();
  return String(account?.hostel || '').trim();
}

function getLocationScope(hostel) {
  if (!hostel) return emptyScope();
  return { location: { $regex: escapeRegex(hostel), $options: 'i' } };
}

function getAnalyticsScope(role, hostel) {
  if (role === 'warden') {
    const locationScope = getLocationScope(hostel);
    return {
      studentReports: locationScope,
      anonymousReports: locationScope,
      workOrders: locationScope,
      cases: emptyScope(),
      includeWorkOrders: true,
      scope: {
        kind: 'hostel',
        label: hostel || 'Unassigned hostel',
        description: hostel
          ? `Reports and work orders whose recorded location matches ${hostel}.`
          : 'No hostel assignment is available, so no operational records are shown.',
      },
    };
  }

  if (role === 'maintenance') {
    return {
      studentReports: getStaffReportScope({ role }) || {},
      anonymousReports: { category: 'maintenance_issue' },
      workOrders: {},
      cases: emptyScope(),
      includeWorkOrders: true,
      scope: {
        kind: 'maintenance',
        label: 'Maintenance operations',
        description: 'Work orders received by the maintenance team and the source requests behind them.',
      },
    };
  }

  return {
    studentReports: getStaffReportScope({ role }) || {},
    anonymousReports: {},
    workOrders: emptyScope(),
    cases: {},
    includeWorkOrders: false,
    scope: {
      kind: 'campus',
      label: 'Campus operations',
      description: 'Reports and cases available to your role.',
    },
  };
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
    const hostel = req.user.role === 'warden' ? await resolveWardenHostel(req.user) : '';
    const scopedData = getAnalyticsScope(req.user.role, hostel);

    const [studentReports, anonymousReports, cases, users, workOrders] = await Promise.all([
      StudentReportModel.find(scopedData.studentReports)
        .select('category status title description details ai_keywords createdAt')
        .lean(),
      AnonymousReportModel.find(scopedData.anonymousReports)
        .select('category status title description details ai_keywords createdAt')
        .lean(),
      CaseModel.find(scopedData.cases)
        .select('offense_type description student_case_process')
        .lean(),
      req.user.role === 'admin' ? UserModel.find({}).select('role').lean() : Promise.resolve([]),
      scopedData.includeWorkOrders
        ? WorkOrderModel.find(scopedData.workOrders)
          .select('status priority issue_type location createdAt updatedAt')
          .lean()
        : Promise.resolve([]),
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
      scope: scopedData.scope,
      workOrders: scopedData.includeWorkOrders
        ? buildWorkOrderSummary({ workOrders })
        : null,
    });
  } catch (error) {
    console.error('Analytics summary error:', error);
    res.status(500).json({ error: 'Failed to load analytics summary.' });
  }
});

export default router;
