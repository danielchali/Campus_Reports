"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageSkeleton } from '../PageSkeleton';
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
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';

ChartJS.register(ArcElement, CategoryScale, Filler, Legend, LineElement, LinearScale, PointElement, Tooltip);

type SupportedRole =
  | 'admin'
  | 'chief_security_officer'
  | 'dean_of_students'
  | 'assistant_dean'
  | 'secretary'
  | 'maintenance';

type MetricKey =
  | 'totalCases'
  | 'openCases'
  | 'pendingCases'
  | 'resolvedCases'
  | 'highPriorityCases'
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
  title: string;
  subtitle: string;
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
  _id?: string;
  tracking_code?: string;
  title?: string;
  category?: string;
  status?: string;
  location?: string;
  createdAt?: string;
  incident_date?: string;
};

type StatementRequest = {
  _id?: string;
  title?: string;
  status?: string;
  studentId?: string;
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
    return ['/cases', '/students', '/staff', '/users'] as const;
  }

  return ['/anonymous-reports', '/staff', '/statement-requests/staff'] as const;
}

export default function ManagementDashboard({
  role,
  title,
  subtitle,
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
  const [statementRequests, setStatementRequests] = useState<StatementRequest[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      setAnonymousReports(Array.isArray(resolved['/anonymous-reports']) ? resolved['/anonymous-reports'] : []);
      setStatementRequests(Array.isArray(resolved['/statement-requests/staff']) ? resolved['/statement-requests/staff'] : []);

      const hasAnyData =
        Boolean((Array.isArray(resolved['/cases']) ? resolved['/cases'] : resolved['/cases']?.cases || []).length) ||
        Boolean((Array.isArray(resolved['/students']) ? resolved['/students'] : resolved['/students']?.students || []).length) ||
        Boolean((Array.isArray(resolved['/staff']) ? resolved['/staff'] : resolved['/staff']?.staff || []).length) ||
        Boolean((Array.isArray(resolved['/users']) ? resolved['/users'] : resolved['/users']?.users || []).length) ||
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
  }, [role, token]);

  if (!authLoading && !token) {
    router.replace('/login');
  }
  if (!token) {
    return <PageSkeleton />;
  }

  if (!authLoading && user && user.role !== role) {
    return <div className="text-red-600">Access denied.</div>;
  }

  const summary = useMemo(() => {
    const totalCases = cases.length;
    const openCases = cases.filter((item) => item.status === 'Open').length;
    const pendingCases = cases.filter((item) => item.status === 'Open' || item.status === 'Under Investigation').length;
    const resolvedCases = cases.filter((item) => item.status === 'Closed').length;
    const highPriorityCases = cases.filter((item) => item.severity === 'High' || item.severity === 'Critical').length;

    const totalReports = anonymousReports.length;
    const openReports = anonymousReports.filter((item) => item.status !== 'Resolved').length;
    const pendingStatements = statementRequests.filter((item) => item.status === 'pending').length;
    const submittedStatements = statementRequests.filter((item) => item.status === 'submitted').length;

    return {
      totalCases,
      openCases,
      pendingCases,
      resolvedCases,
      highPriorityCases,
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
    totalStudents: { label: 'Students', value: summary.totalStudents, tone: 'green', icon: GraduationCap, helper: 'Fetched student records' },
    totalStaff: { label: 'Staff', value: summary.totalStaff, tone: 'slate', icon: Briefcase, helper: 'Fetched staff records' },
    totalUsers: { label: 'Users', value: summary.totalUsers, tone: 'slate', icon: Users, helper: 'Fetched user accounts' },
    totalReports: { label: 'Anonymous Reports', value: summary.totalReports, tone: 'green', icon: FileStack, helper: 'Allowed report records' },
    openReports: { label: 'Open Reports', value: summary.openReports, tone: 'amber', icon: Clock3, helper: 'Not yet resolved' },
    pendingStatements: { label: 'Pending Statements', value: summary.pendingStatements, tone: 'orange', icon: AlertTriangle, helper: 'Student replies outstanding' },
    submittedStatements: { label: 'Submitted Statements', value: summary.submittedStatements, tone: 'emerald', icon: CheckCircle2, helper: 'Received from students' },
  };

  const filteredCases = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return cases;

    return cases.filter((item) => {
      const person = getCasePerson(item);
      return [person.name, person.meta, person.detail, item.offenseType, item.offense_type, item.severity, item.status].some((value) =>
        value?.toLowerCase().includes(query),
      );
    });
  }, [cases, search]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return anonymousReports;

    return anonymousReports.filter((item) =>
      [item.title, item.tracking_code, item.category, item.status, item.location].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    );
  }, [anonymousReports, search]);

  const primaryItems: Array<CaseItem | AnonymousReport> = dataset === 'cases' ? filteredCases : filteredReports;

  const focusItems = useMemo(() => {
    if (dataset === 'cases') {
      const roleFiltered = filteredCases.filter((item) => {
        if (role === 'assistant_dean') return item.status === 'Open' || item.status === 'Under Investigation';
        if (role === 'dean_of_students') return item.severity === 'High' || item.severity === 'Critical';
        if (role === 'chief_security_officer') return item.severity === 'High' || item.severity === 'Critical';
        return true;
      });

      return [...roleFiltered]
        .sort((a, b) => new Date(getCaseDate(b)).getTime() - new Date(getCaseDate(a)).getTime())
        .slice(0, 8);
    }

    return [...filteredReports]
      .sort((a, b) => new Date(getReportDate(b)).getTime() - new Date(getReportDate(a)).getTime())
      .slice(0, 8);
  }, [dataset, filteredCases, filteredReports, role]);

  const trendData = useMemo(() => {
    const labels: string[] = [];
    const counts: number[] = [];
    const today = new Date();

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(today);
      date.setDate(today.getDate() - offset);
      labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

      const count = primaryItems.filter((item: any) => {
        const raw = dataset === 'cases' ? getCaseDate(item as CaseItem) : getReportDate(item as AnonymousReport);
        if (!raw) return false;
        return new Date(raw).toDateString() === date.toDateString();
      }).length;

      counts.push(count);
    }

    return {
      labels,
      datasets: [
        {
          label: dataset === 'cases' ? 'Cases' : 'Reports',
          data: counts,
          borderColor: '#008542',
          backgroundColor: 'rgba(0, 133, 66, 0.10)',
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointBackgroundColor: '#ff8200',
          pointBorderWidth: 0,
        },
      ],
    };
  }, [dataset, primaryItems]);

  const breakdown = useMemo(() => {
    const counts = new Map<string, number>();

    if (dataset === 'cases') {
      cases.forEach((item) => {
        const label = item.offenseType || item.offense_type || 'Unspecified';
        counts.set(label, (counts.get(label) || 0) + 1);
      });
    } else {
      anonymousReports.forEach((item) => {
        const label = item.category || 'Unspecified';
        counts.set(label, (counts.get(label) || 0) + 1);
      });
    }

    const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
    const palette = ['#008542', '#ff8200', '#1d4ed8', '#ea580c', '#7c3aed', '#64748b'];

    return {
      labels: entries.map(([label]) => label),
      datasets: [{ data: entries.map(([, value]) => value), backgroundColor: palette.slice(0, entries.length), borderWidth: 0, cutout: '68%' }],
    };
  }, [anonymousReports, cases, dataset]);

  if (authLoading || loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 w-72 rounded-2xl bg-slate-200 dark:bg-slate-800" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-32 rounded-3xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <div className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800 xl:col-span-2" />
          <div className="h-80 rounded-3xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </div>
    );
  }

  const displayName = user?.name || user?.username || 'User';
  const viewAllHref = dataset === 'cases' ? '/cases' : '/anonymous-report';

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-kmuGreen">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">{subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[260px] flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950 xl:min-w-[320px] xl:flex-none">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={dataset === 'cases' ? 'Search cases, people, programs...' : 'Search reports, tracking codes, locations...'}
                className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
              />
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-kmuGreen/10 text-kmuGreen dark:bg-kmuGreen/20 dark:text-emerald-300">
                <UserRound size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{displayName}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{user?.role?.replaceAll('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metricKeys.map((key) => {
          const metric = metricMap[key];
          const Icon = metric.icon;
          const tone = toneClasses[metric.tone];

          return (
            <article key={metric.label} className={`rounded-[28px] border bg-white p-5 shadow-sm dark:bg-slate-900 ${tone.border}`}>
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${tone.icon}`}>
                <Icon size={22} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{metric.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{metric.value}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{metric.helper}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:col-span-2">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{dataset === 'cases' ? 'Case Activity' : 'Report Activity'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Last seven days from endpoints this role is allowed to access.</p>
          </div>
          <div className="h-[320px]">
            <Line
              data={trendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { display: false } },
                  y: { beginAtZero: true, grid: { color: 'rgba(148, 163, 184, 0.15)' } },
                },
              }}
            />
          </div>
        </article>

        <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{dataset === 'cases' ? 'Offense Breakdown' : 'Category Breakdown'}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Current distribution for the visible dataset.</p>
          </div>
          <div className="relative mx-auto h-[220px] max-w-[240px]">
            <Doughnut data={breakdown} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold text-slate-900 dark:text-white">{primaryItems.length}</span>
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {dataset === 'cases' ? 'Cases' : 'Reports'}
              </span>
            </div>
          </div>
          <div className="mt-6 space-y-3">
            {breakdown.labels.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">No breakdown data available.</p>
            ) : (
              breakdown.labels.map((label, index) => (
                <div key={label} className="flex items-center justify-between gap-3 text-sm">
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

      <section className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <article className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{focusLabel}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Refined by the current dashboard search.</p>
            </div>
            <Link href={viewAllHref} className="text-sm font-medium text-kmuGreen hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {focusItems.length === 0 ? (
              <div className="px-5 py-10 text-sm text-slate-500 dark:text-slate-400">{focusEmpty}</div>
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
                    className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40 md:flex-row md:items-center md:justify-between"
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
                const statusTone = item.status === 'Resolved' ? 'emerald' : item.status === 'In Progress' ? 'amber' : 'slate';
                return (
                  <Link
                    key={item._id || item.tracking_code}
                    href="/anonymous-report"
                    className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{item.title || 'Untitled report'}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.tracking_code || 'No tracking code'} • {item.location || 'No location'}</p>
                      <p className="mt-2 truncate text-sm text-slate-600 dark:text-slate-300">{item.category || 'No category'}</p>
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

        <div className="space-y-6">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
            <div className="mt-4 grid gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-kmuGreen/30 hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <span>{action.label}</span>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">System Snapshot</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {dataset === 'cases' ? 'Visible Cases' : 'Visible Reports'}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{primaryItems.length}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Staff Loaded</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{summary.totalStaff}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Pending Statements</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{summary.pendingStatements}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Submitted Statements</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{summary.submittedStatements}</p>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
