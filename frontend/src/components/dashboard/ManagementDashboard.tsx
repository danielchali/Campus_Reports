"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageSkeleton } from '../PageSkeleton';
import { StatCard, StatsStrip } from '../StatsStrip';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  ArcElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import {
  AlertTriangle,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Clock3,
  FileStack,
  GraduationCap,
  Shield,
  Users,
} from '@/components/icons';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';
import { useDashboardRealtime } from '../../hooks/useDashboardRealtime';
import DashboardAIInsights from './DashboardAIInsights';

ChartJS.register(ArcElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip);

type SupportedRole =
  | 'admin'
  | 'chief_security_officer'
  | 'dean_of_students'
  | 'assistant_dean'
  | 'secretary'
  | 'registrar'
  | 'maintenance';

type MetricKey =
  | 'totalCases'
  | 'openCases'
  | 'pendingCases'
  | 'resolvedCases'
  | 'highPriorityCases'
  | 'totalCampusReports'
  | 'pendingReviewReports'
  | 'resolvedReports'
  | 'totalStudents'
  | 'totalStaff'
  | 'totalUsers'
  | 'totalReports'
  | 'openReports'
  | 'pendingStatements'
  | 'submittedStatements';

type QuickAction = {
  href: string;
  label: string;
};

type DatasetKey = 'cases' | 'anonymousReports';

type DashboardConfig = {
  role: SupportedRole;
  focusLabel: string;
  focusEmpty: string;
  metricKeys: MetricKey[];
  quickActions: QuickAction[];
  dataset?: DatasetKey;
};

type DashboardMetric = {
  label: string;
  value: number;
  tone: string;
  icon: typeof FileStack;
  helper: string;
};

type ReportActivityPeriod = 7 | 14 | 28 | 'all';

type CaseItem = {
  _id?: string;
  student?: {
    fullName?: string;
    studentId?: string;
    program?: string;
  } | null;
  staff?: {
    fullName?: string;
    staffId?: string;
    department?: string;
  } | null;
  offenseType?: string;
  offense_type?: string;
  severity?: string;
  status?: string;
  createdAt?: string;
  incidentDate?: string;
  incident_date?: string;
};

type AnonymousReport = {
  source?: 'student' | 'anonymous';
  _id?: string;
  tracking_code?: string;
  title?: string;
  category?: string;
  status?: string;
  location?: string;
  createdAt?: string;
  incident_date?: string;
};

type StudentReport = {
  id?: string;
  trackingCode?: string;
  title?: string;
  category?: 'disciplinary_case' | 'maintenance_issue';
  anonymous?: boolean;
  status?: string;
  location?: string;
  submittedAt?: string;
  incidentDate?: string;
  ownerName?: string;
  ownerUsername?: string;
};

type StatementRequest = {
  _id?: string;
  title?: string;
  status?: string;
  studentId?: string;
  caseMongoId?: string;
  caseNumber?: string;
  createdAt?: string;
  dueAt?: string;
};

const toneClasses: Record<string, { icon: string; border: string; badge: string }> = {
  emerald: {
    icon: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
    border: 'border-emerald-100 dark:border-emerald-900/30',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  },
  amber: {
    icon: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
    border: 'border-amber-100 dark:border-amber-900/30',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  },
  orange: {
    icon: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
    border: 'border-orange-100 dark:border-orange-900/30',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  green: {
    icon: 'bg-kmuGreen/10 text-kmuGreen dark:bg-kmuGreen/20 dark:text-emerald-300',
    border: 'border-kmuGreen/20 dark:border-kmuGreen/30',
    badge: 'bg-kmuGreen/10 text-kmuGreen dark:bg-kmuGreen/20 dark:text-emerald-300',
  },
  slate: {
    icon: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
    border: 'border-slate-200 dark:border-slate-800',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  },
};

function formatDateLabel(value?: string) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getCaseDate(caseItem: CaseItem) {
  return caseItem.createdAt || caseItem.incidentDate || caseItem.incident_date || '';
}

function getReportDate(report: AnonymousReport) {
  return report.createdAt || report.incident_date || '';
}

const REPORT_ACTIVITY_PERIODS: Array<{ days: ReportActivityPeriod; label: string }> = [
  { days: 7, label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 28, label: '28 days' },
  { days: 'all', label: 'All' },
];

function isWithinReportActivityPeriod(dateValue: string, period: ReportActivityPeriod) {
  if (period === 'all') return true;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (period - 1));

  const itemDate = new Date(date);
  itemDate.setHours(0, 0, 0, 0);
  return itemDate >= start;
}

function getCasePerson(caseItem: CaseItem) {
  if (caseItem.student?.fullName) {
    return {
      name: caseItem.student.fullName,
      meta: caseItem.student.studentId || 'Student',
      detail: caseItem.student.program || 'Program not set',
    };
  }

  if (caseItem.staff?.fullName) {
    return {
      name: caseItem.staff.fullName,
      meta: caseItem.staff.staffId || 'Staff',
      detail: caseItem.staff.department || 'Department not set',
    };
  }

  return {
    name: 'Unassigned case',
    meta: 'No linked record',
    detail: 'No academic unit',
  };
}

function getRoleResources(role: SupportedRole) {
  if (role === 'admin') {
    return ['/cases', '/students', '/staff', '/users', '/student-reports', '/anonymous-reports'] as const;
  }

  return ['/student-reports', '/anonymous-reports', '/staff', '/statement-requests/staff'] as const;
}

export default function ManagementDashboard({
  role,
  focusLabel,
  focusEmpty,
  metricKeys,
  quickActions,
  dataset = 'cases',
}: DashboardConfig) {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [anonymousReports, setAnonymousReports] = useState<AnonymousReport[]>([]);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [statementRequests, setStatementRequests] = useState<StatementRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [activityDays, setActivityDays] = useState<ReportActivityPeriod>(7);

  const handleRealtimeRefresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  useDashboardRealtime(handleRealtimeRefresh, Boolean(token), [
    'all',
    'student-reports',
    'anonymous-reports',
    'cases',
  ]);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!token) return;

    let active = true;

    async function fetchCollection(path: string) {
      const res = await fetch(`${API_BASE_URL}${path}`, { headers: { ...authHeaders() } });
      if (!res.ok) {
        throw new Error(`${path} failed with ${res.status}`);
      }

      return res.json();
    }

    async function load() {
      setLoading(true);
      setError(null);

      const resources = getRoleResources(role);
      const results = await Promise.allSettled(resources.map((path) => fetchCollection(path)));

      if (!active) return;

      const resolved: Record<string, any> = {};
      resources.forEach((path, index) => {
        const result = results[index];
        resolved[path] = result.status === 'fulfilled' ? result.value : null;
      });

      setCases(Array.isArray(resolved['/cases']) ? resolved['/cases'] : resolved['/cases']?.cases || []);
      setStudents(Array.isArray(resolved['/students']) ? resolved['/students'] : resolved['/students']?.students || []);
      setStaff(Array.isArray(resolved['/staff']) ? resolved['/staff'] : resolved['/staff']?.staff || []);
      setUsers(Array.isArray(resolved['/users']) ? resolved['/users'] : resolved['/users']?.users || []);
      setStudentReports(Array.isArray(resolved['/student-reports']) ? resolved['/student-reports'] : []);
      setAnonymousReports(Array.isArray(resolved['/anonymous-reports']) ? resolved['/anonymous-reports'] : []);
      setStatementRequests(Array.isArray(resolved['/statement-requests/staff']) ? resolved['/statement-requests/staff'] : []);

      const hasAnyData =
        Boolean((Array.isArray(resolved['/cases']) ? resolved['/cases'] : resolved['/cases']?.cases || []).length) ||
        Boolean((Array.isArray(resolved['/students']) ? resolved['/students'] : resolved['/students']?.students || []).length) ||
        Boolean((Array.isArray(resolved['/staff']) ? resolved['/staff'] : resolved['/staff']?.staff || []).length) ||
        Boolean((Array.isArray(resolved['/users']) ? resolved['/users'] : resolved['/users']?.users || []).length) ||
        Boolean((Array.isArray(resolved['/student-reports']) ? resolved['/student-reports'] : []).length) ||
        Boolean((Array.isArray(resolved['/anonymous-reports']) ? resolved['/anonymous-reports'] : []).length) ||
        Boolean((Array.isArray(resolved['/statement-requests/staff']) ? resolved['/statement-requests/staff'] : []).length);

      if (!hasAnyData) {
        setError('Dashboard data could not be loaded from the endpoints allowed for this role.');
      }

      setLoading(false);
    }

    load().catch((loadError) => {
      if (!active) return;
      console.error('Failed to load dashboard data', loadError);
      setError('Dashboard data could not be loaded from the backend.');
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [role, token, refreshToken]);

  const summary = useMemo(() => {
    const totalCases = cases.length;
    const openCases = cases.filter((item) => item.status === 'Open').length;
    const pendingCases = cases.filter((item) => item.status === 'Open' || item.status === 'Under Investigation').length;
    const resolvedCases = cases.filter((item) => item.status === 'Closed').length;
    const highPriorityCases = cases.filter((item) => item.severity === 'High' || item.severity === 'Critical').length;
    const totalCampusReports = anonymousReports.length + studentReports.length;
    const pendingReviewReports =
      anonymousReports.filter((item) => item.status === 'Submitted' || item.status === 'Under Review').length +
      studentReports.filter((item) => item.status === 'Submitted' || item.status === 'Under Review').length;
    const resolvedReports =
      anonymousReports.filter((item) => item.status === 'Resolved').length +
      studentReports.filter((item) => item.status === 'Resolved').length;

    const totalReports = anonymousReports.length;
    const openReports =
      anonymousReports.filter((item) => item.status === 'In Progress').length +
      studentReports.filter((item) => item.status === 'In Progress').length;
    const pendingStatements = statementRequests.filter((item) => item.status === 'pending').length;
    const submittedStatements = statementRequests.filter((item) => item.status === 'submitted').length;

    return {
      totalCases,
      openCases,
      pendingCases,
      resolvedCases,
      highPriorityCases,
      totalCampusReports,
      pendingReviewReports,
      resolvedReports,
      totalStudents: students.length,
      totalStaff: staff.length,
      totalUsers: users.length,
      totalReports,
      openReports,
      pendingStatements,
      submittedStatements,
    };
  }, [anonymousReports, cases, staff.length, statementRequests, students.length, users.length]);

  const metricMap: Record<MetricKey, DashboardMetric> = {
    totalCases: { label: 'Total Cases', value: summary.totalCases, tone: 'green', icon: FileStack, helper: 'Allowed case records' },
    openCases: { label: 'Open Cases', value: summary.openCases, tone: 'amber', icon: Clock3, helper: 'Awaiting closure' },
    pendingCases: { label: 'Pending Review', value: summary.pendingCases, tone: 'orange', icon: AlertTriangle, helper: 'Open or under investigation' },
    resolvedCases: { label: 'Resolved', value: summary.resolvedCases, tone: 'emerald', icon: CheckCircle2, helper: 'Closed matters' },
    highPriorityCases: { label: 'High Priority', value: summary.highPriorityCases, tone: 'orange', icon: Shield, helper: 'High or critical severity' },
    totalCampusReports: { label: 'Total Reports', value: summary.totalCampusReports, tone: 'green', icon: FileStack, helper: 'Student and anonymous reports' },
    pendingReviewReports: { label: 'Pending Review', value: summary.pendingReviewReports, tone: 'amber', icon: AlertTriangle, helper: 'Submitted or under review' },
    resolvedReports: { label: 'Resolved', value: summary.resolvedReports, tone: 'emerald', icon: CheckCircle2, helper: 'Resolved reports' },
    totalStudents: { label: 'Students', value: summary.totalStudents, tone: 'green', icon: GraduationCap, helper: 'Fetched student records' },
    totalStaff: { label: 'Staff', value: summary.totalStaff, tone: 'slate', icon: Briefcase, helper: 'Fetched staff records' },
    totalUsers: { label: 'Users', value: summary.totalUsers, tone: 'slate', icon: Users, helper: 'Fetched user accounts' },
    totalReports: { label: 'Anonymous Reports', value: summary.totalReports, tone: 'green', icon: FileStack, helper: 'Allowed anonymous report records' },
    openReports: { label: 'In Progress', value: summary.openReports, tone: 'orange', icon: Clock3, helper: 'Reports actively being handled' },
    pendingStatements: { label: 'Pending Statements', value: summary.pendingStatements, tone: 'orange', icon: AlertTriangle, helper: 'Student replies outstanding' },
    submittedStatements: { label: 'Submitted Statements', value: summary.submittedStatements, tone: 'emerald', icon: CheckCircle2, helper: 'Received from students' },
  };

  const filteredCases = useMemo(() => cases, [cases]);

  const filteredReports = useMemo(() => anonymousReports, [anonymousReports]);

  const recentCampusReports = useMemo(() => {
    const studentItems = studentReports.map((item) => ({
      key: item.id || item.trackingCode || `${item.title || 'student-report'}-${item.submittedAt || item.incidentDate || ''}`,
      date: item.submittedAt || item.incidentDate || '',
      bucket: item.category === 'maintenance_issue' ? 'Maintenance' : 'Discipline',
    }));

    const anonymousItems = anonymousReports.map((item) => ({
      key: item._id || item.tracking_code || `${item.title || 'anonymous-report'}-${item.createdAt || item.incident_date || ''}`,
      date: item.createdAt || item.incident_date || '',
      bucket: 'Anonymous',
    }));

    return [...studentItems, ...anonymousItems].filter((item) => item.date);
  }, [anonymousReports, studentReports]);

  const activityPeriodReports = useMemo(
    () => recentCampusReports.filter((item) => isWithinReportActivityPeriod(item.date, activityDays)),
    [activityDays, recentCampusReports]
  );

  const activityPeriodLabel = activityDays === 'all' ? 'all time' : `the last ${activityDays} days`;

  const primaryItems: Array<CaseItem | AnonymousReport> = dataset === 'cases' ? filteredCases : filteredReports;

  const focusItems = useMemo(() => {
    if (dataset === 'cases') {
      const studentReportItems: AnonymousReport[] = studentReports.map((item) => ({
        _id: item.id || item.trackingCode,
        tracking_code: item.anonymous ? 'Student Anonymous' : (item.ownerName || 'Named reporter'),
        title: item.title,
        category: item.category === 'maintenance_issue' ? 'Maintenance' : 'Incident',
        status: item.status,
        location: item.location,
        createdAt: item.submittedAt || item.incidentDate,
        incident_date: item.incidentDate,
        source: 'student',
      }));

      return [...studentReportItems, ...filteredReports]
        .filter((item) => getReportDate(item))
        .sort((a, b) => new Date(getReportDate(b)).getTime() - new Date(getReportDate(a)).getTime())
        .slice(0, 3);
    }

    const studentReportItems: AnonymousReport[] = studentReports.map((item) => ({
      _id: item.id || item.trackingCode,
      tracking_code: item.anonymous ? 'Student Anonymous' : (item.ownerName || 'Named reporter'),
      title: item.title,
      category: item.category === 'maintenance_issue' ? 'Maintenance' : 'Incident',
      status: item.status,
      location: item.location,
      createdAt: item.submittedAt || item.incidentDate,
      incident_date: item.incidentDate,
        source: 'student',
    }));

    return [...studentReportItems, ...filteredReports]
      .filter((item) => getReportDate(item))
      .sort((a, b) => new Date(getReportDate(b)).getTime() - new Date(getReportDate(a)).getTime())
      .slice(0, 3);
  }, [dataset, filteredReports, studentReports]);

  const trendData = useMemo(() => {
    const labels: string[] = [];
    const maintenanceCounts: number[] = [];
    const disciplineCounts: number[] = [];
    const anonymousCounts: number[] = [];
    const validDates = activityPeriodReports
      .map((item) => new Date(item.date))
      .filter((date) => !Number.isNaN(date.getTime()));

    if (activityDays === 'all') {
      const today = new Date();
      const latestMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const earliestDate = validDates.length > 0 ? new Date(Math.min(...validDates.map((date) => date.getTime()))) : latestMonth;
      const cursor = new Date(earliestDate.getFullYear(), earliestDate.getMonth(), 1);

      while (cursor <= latestMonth) {
        const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        const monthItems = activityPeriodReports.filter((item) => {
          const date = new Date(item.date);
          return !Number.isNaN(date.getTime()) && date >= cursor && date < nextMonth;
        });

        labels.push(cursor.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        maintenanceCounts.push(monthItems.filter((item) => item.bucket === 'Maintenance').length);
        disciplineCounts.push(monthItems.filter((item) => item.bucket === 'Discipline').length);
        anonymousCounts.push(monthItems.filter((item) => item.bucket === 'Anonymous').length);
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else {
      const today = new Date();

      for (let offset = activityDays - 1; offset >= 0; offset -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - offset);
        labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

        const dayItems = activityPeriodReports.filter((item) => new Date(item.date).toDateString() === date.toDateString());
        maintenanceCounts.push(dayItems.filter((item) => item.bucket === 'Maintenance').length);
        disciplineCounts.push(dayItems.filter((item) => item.bucket === 'Discipline').length);
        anonymousCounts.push(dayItems.filter((item) => item.bucket === 'Anonymous').length);
      }
    }

    return {
      labels,
      datasets: [
        {
          label: 'Maintenance',
          data: maintenanceCounts,
          borderColor: '#008542',
          backgroundColor: 'rgba(0, 133, 66, 0.10)',
          fill: true,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#008542',
          pointBorderWidth: 0,
        },
        {
          label: 'Discipline',
          data: disciplineCounts,
          borderColor: '#ff8200',
          backgroundColor: 'rgba(255, 130, 0, 0.08)',
          fill: false,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#ff8200',
          pointBorderWidth: 0,
        },
        {
          label: 'Anonymous',
          data: anonymousCounts,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          fill: false,
          tension: 0.35,
          pointRadius: 3,
          pointBackgroundColor: '#2563eb',
          pointBorderWidth: 0,
        },
      ],
    };
  }, [activityDays, activityPeriodReports]);

  const breakdown = useMemo(() => {
    const counts = new Map<string, number>();
    counts.set('Maintenance', activityPeriodReports.filter((item) => item.bucket === 'Maintenance').length);
    counts.set('Discipline', activityPeriodReports.filter((item) => item.bucket === 'Discipline').length);
    counts.set('Anonymous', activityPeriodReports.filter((item) => item.bucket === 'Anonymous').length);

    const entries = Array.from(counts.entries()).filter(([, value]) => value > 0);
    const palette = ['#008542', '#ff8200', '#2563eb'];

    return {
      labels: entries.map(([label]) => label),
      datasets: [{ data: entries.map(([, value]) => value), backgroundColor: palette.slice(0, entries.length), borderWidth: 0, cutout: '68%' }],
    };
  }, [activityPeriodReports]);

  const totalReportSparkline = useMemo(() => {
    const dailyTotals = trendData.labels.map((_, index) =>
      trendData.datasets.reduce((sum, dataset) => sum + ((dataset.data[index] as number) || 0), 0)
    );
    const maxValue = Math.max(...dailyTotals, 1);
    const width = 72;
    const height = 20;
    const points = dailyTotals
      .map((value, index) => {
        const x = dailyTotals.length === 1 ? width / 2 : (index / (dailyTotals.length - 1)) * width;
        const y = height - (value / maxValue) * (height - 2) - 1;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    const latest = dailyTotals[dailyTotals.length - 1] || 0;
    const previous = dailyTotals[dailyTotals.length - 2] || 0;
    const rising = latest >= previous;
    return { points, rising };
  }, [trendData]);

  if (!authLoading && !token) {
    router.replace('/login');
  }
  if (!token) {
    return <PageSkeleton />;
  }

  if (!authLoading && user && user.role !== role) {
    return <div className="text-red-600">Access denied.</div>;
  }

  if (authLoading || loading) {
    return <PageSkeleton />;
  }

  const viewAllHref = dataset === 'cases' ? '/cases' : '/inbox';
  const metricDesktopColumnsClass =
    metricKeys.length >= 5 ? 'xl:grid-cols-5' : metricKeys.length === 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3';

  return (
    <div className="w-full space-y-4 xl:space-y-5">
      <DashboardAIInsights refreshToken={refreshToken} />

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </div>
      )}

      <StatsStrip desktopColumnsClass={metricDesktopColumnsClass}>
        {metricKeys.map((key) => {
          const metric = metricMap[key];
          const Icon = metric.icon;
          const tone = toneClasses[metric.tone];

          return (
            <StatCard
              key={metric.label}
              label={metric.label}
              value={metric.value}
              icon={<Icon size={16} />}
              iconClassName={tone.icon}
              className={tone.border}
            />
          );
        })}
      </StatsStrip>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
          <div className="mb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Report Activity</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Campus reports across maintenance, discipline, and anonymous channels.
                </p>
              </div>
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800/60">
                {REPORT_ACTIVITY_PERIODS.map((period) => (
                  <button
                    key={period.days}
                    type="button"
                    onClick={() => setActivityDays(period.days)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                      activityDays === period.days
                        ? 'bg-white text-kmuGreen shadow-sm dark:bg-slate-900 dark:text-emerald-300'
                        : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800/60">
              <span className="font-medium text-slate-600 dark:text-slate-300">Total reports</span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{activityPeriodReports.length}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${totalReportSparkline.rising ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}`}>
                {totalReportSparkline.rising ? '↗' : '↘'}
              </span>
              <svg viewBox="0 0 72 20" className="h-5 w-[72px]" aria-hidden="true">
                <polyline
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={totalReportSparkline.points}
                />
              </svg>
            </div>
          </div>
          <div className="h-[250px] xl:h-[230px]">
            <Line
              data={trendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: true,
                    position: 'top',
                    labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true, font: { size: 11 } },
                  },
                },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.15)' } },
                },
              }}
            />
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Report Distribution</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Breakdown for {activityPeriodLabel} across maintenance, discipline, and anonymous reports.
            </p>
          </div>
          <div className="relative mx-auto h-[190px] max-w-[210px]">
            <Doughnut data={breakdown} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-slate-900 dark:text-white">{activityPeriodReports.length}</span>
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                Reports
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-2.5">
            {breakdown.labels.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">No breakdown data available.</p>
            ) : (
              breakdown.labels.map((label, index) => (
                <div key={label} className="flex items-center justify-between gap-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: breakdown.datasets[0].backgroundColor[index] as string }} />
                    <span className="truncate text-slate-600 dark:text-slate-300">{label}</span>
                  </div>
                  <span className="font-medium text-slate-900 dark:text-white">{breakdown.datasets[0].data[index]}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.85fr)_minmax(280px,0.95fr)]">
        <article className="rounded-[24px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{focusLabel}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Latest visible items for this dashboard.</p>
            </div>
            <Link href={viewAllHref} className="text-xs font-medium text-kmuGreen hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {focusItems.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-500 dark:text-slate-400">{focusEmpty}</div>
            ) : dataset === 'cases' ? (
              (focusItems as CaseItem[]).map((item) => {
                const person = getCasePerson(item);
                const severityTone =
                  item.severity === 'Critical' || item.severity === 'High' ? 'orange' : item.status === 'Closed' ? 'emerald' : 'slate';
                const statusTone = item.status === 'Closed' ? 'emerald' : item.status === 'Under Investigation' ? 'amber' : 'slate';

                return (
                  <button
                    key={item._id || `${person.name}-${getCaseDate(item)}`}
                    type="button"
                    onClick={() => item._id && router.push(`/cases/${item._id}`)}
                    className="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{person.name}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{person.meta} • {person.detail}</p>
                      <p className="mt-2 truncate text-sm text-slate-600 dark:text-slate-300">{item.offenseType || item.offense_type || 'No offense type'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClasses[severityTone].badge}`}>{item.severity || 'No severity'}</span>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClasses[statusTone].badge}`}>{item.status || 'No status'}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateLabel(getCaseDate(item))}</span>
                    </div>
                  </button>
                );
              })
            ) : (
              (focusItems as AnonymousReport[]).map((item) => {
                const statusTone = item.status === 'Resolved' ? 'emerald' : item.status === 'In Progress' || item.status === 'Under Review' ? 'amber' : 'slate';

                return (
                  <Link
                    key={item._id || item.tracking_code || `${item.title}-${getReportDate(item)}`}
                    href={item.source === 'student' ? '/inbox' : (item.tracking_code ? `/anonymous-report?track=${encodeURIComponent(item.tracking_code)}` : '/anonymous-report')}
                    className="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.tracking_code || 'No tracking code'}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.category || 'No category'} • {item.location || 'No location'}</p>
                      <p className="mt-2 truncate text-sm text-slate-600 dark:text-slate-300">{item.title || 'No title'}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneClasses[statusTone].badge}`}>{item.status || 'No status'}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{formatDateLabel(getReportDate(item))}</span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
            <div className="mt-3 grid gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-700 transition hover:border-kmuGreen/30 hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <span>{action.label}</span>
                  <ArrowRight size={14} />
                </Link>
              ))}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
