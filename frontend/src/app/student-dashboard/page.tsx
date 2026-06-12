"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageSkeleton, InlineSkeleton } from '../../components/PageSkeleton';
import { StatCard, StatsStrip } from '../../components/StatsStrip';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FilePenLine,
  FileText,
  Fingerprint,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStudentReportMetrics, type StudentReport, type StudentReportMetrics } from '../../utils/studentReports';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';
import { getDisplayFirstName } from '../../utils/userDisplay';
import { useDashboardRealtime } from '../../hooks/useDashboardRealtime';

type StatementRequest = {
  _id: string;
  title: string;
  prompt: string;
  status: 'pending' | 'submitted' | 'expired' | 'cancelled';
  dueAt?: string;
  createdAt?: string;
  caseMongoId?: string;
  caseNumber?: string;
};

const categoryLabels = {
  disciplinary_case: 'Disciplinary Case',
  maintenance_issue: 'Maintenance Issue',
} as const;

const statusColors = {
  Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Under Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'In Progress': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
} as const;

const statementStatusColors = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  submitted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  expired: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
} as const;

function formatDate(value?: string) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function StudentDashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [statementRequests, setStatementRequests] = useState<StatementRequest[]>([]);
  const [statementLoading, setStatementLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  const [reportMetrics, setReportMetrics] = useState<StudentReportMetrics>({ total: 0, anonymous: 0, open: 0, resolved: 0, recent: [] as StudentReport[] });
  const [refreshToken, setRefreshToken] = useState(0);

  const handleRealtimeRefresh = useCallback(() => {
    setRefreshToken((current) => current + 1);
  }, []);

  useDashboardRealtime(handleRealtimeRefresh, Boolean(token), ['student-reports']);

  useEffect(() => {
    if (!user || user.role !== 'student') return;

    const userId = user.id;
    const userUsername = user.username;
    const userName = user.name;
    let cancelled = false;

    async function fetchMetrics() {
      try {
        const data = await getStudentReportMetrics({ id: userId, username: userUsername, name: userName });
        if (!cancelled) setReportMetrics(data);
      } catch (err) {
        console.error('Failed to load report metrics:', err);
      }
    }

    fetchMetrics();
    return () => { cancelled = true; };
  }, [user, refreshToken]);

  const metrics = reportMetrics;

  useEffect(() => {
    async function fetchStatementRequests() {
      setStatementLoading(true);

      try {
        const res = await fetch(`${API_BASE_URL}/statement-requests/student`, {
          headers: { ...authHeaders() },
        });

        if (res.ok) {
          const data = await res.json();
          setStatementRequests(Array.isArray(data) ? data : []);
        } else {
          setStatementRequests([]);
        }
      } catch (fetchError) {
        console.error('Failed to load statement requests', fetchError);
        setStatementRequests([]);
      } finally {
        setStatementLoading(false);
      }
    }

    if (token && user?.role === 'student') {
      fetchStatementRequests();
    }
  }, [token, user?.role]);

  if (!authLoading && !token) {
    router.replace('/login');
  }
  if (!token) {
    return <PageSkeleton />;
  }
  if (!user) {
    return <PageSkeleton />;
  }
  if (user.role !== 'student') {
    return <div className="text-red-600">Access denied.</div>;
  }

  const progressCount = Math.max(metrics.open - metrics.resolved, 0);
  const maintenanceCount = metrics.recent.filter((report) => report.category === 'maintenance_issue').length;
  const pendingStatements = statementRequests.filter((request) => request.status === 'pending').length;

  const summaryCards = [
    { label: 'My Reports', value: metrics.total, helper: 'Current report records', icon: ClipboardList, tone: 'text-kmuGreen' },
    { label: 'Resolved', value: metrics.resolved, helper: 'Marked complete', icon: CheckCircle2, tone: 'text-emerald-600' },
    { label: 'In Progress', value: progressCount, helper: 'Still being handled', icon: Clock3, tone: 'text-amber-600' },
    { label: 'Open', value: metrics.open, helper: 'Awaiting final resolution', icon: FileText, tone: 'text-indigo-600' },
    { label: 'Anonymous', value: metrics.anonymous, helper: 'Submitted anonymously', icon: Fingerprint, tone: 'text-purple-600' },
    { label: 'Maintenance', value: maintenanceCount, helper: 'From your recent reports', icon: Wrench, tone: 'text-blue-600' },
  ];

  return (
    <div className="w-full space-y-4 xl:space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kmuGreen/10 text-kmuGreen">
              <ClipboardList size={18} />
            </div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Welcome back, {getDisplayFirstName(user.name, user.username, 'Student')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track reports, check statement requests, and manage workflows.
          </p>
        </div>
      </section>

      <StatsStrip desktopColumnsClass="xl:grid-cols-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={<Icon size={16} />}
              iconClassName={`bg-slate-50 dark:bg-slate-950 ${card.tone}`}
            />
          );
        })}
      </StatsStrip>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,0.95fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Recent Reports</h2>
            </div>
            <Link href="/my-reports" className="text-xs font-medium text-kmuGreen hover:underline">
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {metrics.recent.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-500 dark:text-slate-400">
                No reports found. Start by creating a report.
              </div>
            ) : (
              metrics.recent.map((report) => (
                <div key={report.id} className="flex flex-col gap-2 px-4 py-2.5 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{report.title}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {categoryLabels[report.category]} • {report.location}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatDate(report.submittedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[report.status]}`}>
                      {report.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push('/my-reports')}
                      className="rounded-full p-1.5 text-slate-400 transition hover:text-kmuGreen"
                      aria-label="Open reports"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
            <div className="mt-3 grid gap-2 grid-cols-2">
              <Link href="/make-report?guided=true" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <FilePenLine size={16} />
                <span>New Report</span>
              </Link>
              <Link href="/make-report?anonymous=true" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <Fingerprint size={16} />
                <span>Anonymous</span>
              </Link>
              <Link href="/make-report?category=maintenance_issue" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <Wrench size={16} />
                <span>Maintenance</span>
              </Link>
              <Link href="/help" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <BookOpen size={16} />
                <span>Help</span>
              </Link>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-white">Statement Requests</h2>
              </div>
              {statementLoading && <InlineSkeleton rows={2} />}
            </div>

            <div className="space-y-2">
              {statementRequests.length === 0 ? (
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  No statement requests at the moment.
                </div>
              ) : (
                statementRequests.slice(0, 4).map((request) => (
                  <div key={request._id} className="rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-medium text-slate-900 dark:text-white">{request.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {formatDate(request.createdAt)}
                          {request.dueAt ? ` • Due ${formatDate(request.dueAt)}` : ''}
                          {request.caseNumber ? ` • Case ${request.caseNumber}` : ''}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statementStatusColors[request.status]}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{request.prompt}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Current Snapshot</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div className="flex flex-col items-center rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Maintenance</span>
                <span className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">{maintenanceCount}</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Anonymous</span>
                <span className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">{metrics.anonymous}</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <span className="text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Pending</span>
                <span className="mt-0.5 text-lg font-semibold text-slate-900 dark:text-white">{pendingStatements}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
