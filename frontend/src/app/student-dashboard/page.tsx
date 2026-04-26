"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageSkeleton, InlineSkeleton } from '../../components/PageSkeleton';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FilePenLine,
  FileText,
  Fingerprint,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStudentReportMetrics, type StudentReport } from '../../utils/studentReports';
import { API_BASE_URL } from '../../config/constants';
import { authHeaders } from '../../utils/api';

type StatementRequest = {
  _id: string;
  title: string;
  prompt: string;
  status: 'pending' | 'submitted' | 'expired' | 'cancelled';
  dueAt?: string;
  createdAt?: string;
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

  const metrics = useMemo(() => {
    if (!user) {
      return { total: 0, anonymous: 0, open: 0, resolved: 0, recent: [] as StudentReport[] };
    }

    return getStudentReportMetrics({
      id: user.id,
      username: user.username,
      name: user.name,
    });
  }, [user]);

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
    <div className="mx-auto max-w-[1600px] space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-5 py-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-kmuGreen">Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
              Welcome back, {user.name?.split(' ')[0] || 'Student'}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-300">
              Track your reports, check statement requests, and move into the main student workflows from one place.
            </p>
          </div>
          <div className="grid min-w-[280px] gap-3 sm:grid-cols-2">
            <Link
              href="/make-report"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              New report
            </Link>
            <Link
              href="/my-reports"
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
            >
              My reports
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-950 ${card.tone}`}>
                <Icon size={22} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{card.label}</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{card.value}</p>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{card.helper}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <article className="rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Reports</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">These entries follow the existing student report store in the app.</p>
            </div>
            <Link href="/my-reports" className="text-sm font-medium text-kmuGreen hover:underline">
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {metrics.recent.length === 0 ? (
              <div className="px-5 py-10 text-sm text-slate-500 dark:text-slate-400">
                No reports found. Start by creating a report.
              </div>
            ) : (
              metrics.recent.map((report) => (
                <div key={report.id} className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{report.title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {categoryLabels[report.category]} • {report.location}
                    </p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDate(report.submittedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColors[report.status]}`}>
                      {report.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push('/my-reports')}
                      className="rounded-full p-2 text-slate-400 transition hover:text-kmuGreen"
                      aria-label="Open reports"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link href="/make-report" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <FilePenLine size={18} />
                <span>New Report</span>
              </Link>
              <Link href="/make-report?anonymous=true" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <Fingerprint size={18} />
                <span>Anonymous Report</span>
              </Link>
              <Link href="/make-report?category=maintenance_issue" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <Wrench size={18} />
                <span>Maintenance Request</span>
              </Link>
              <Link href="/help" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <BookOpen size={18} />
                <span>Help</span>
              </Link>
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Statement Requests</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Fetched from the backend.</p>
              </div>
              {statementLoading && <InlineSkeleton rows={2} />}
            </div>

            <div className="space-y-3">
              {statementRequests.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 px-4 py-4 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
                  No statement requests at the moment.
                </div>
              ) : (
                statementRequests.slice(0, 5).map((request) => (
                  <div key={request._id} className="rounded-2xl bg-slate-50 px-4 py-4 dark:bg-slate-950">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{request.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          Created {formatDate(request.createdAt)}
                          {request.dueAt ? ` • Due ${formatDate(request.dueAt)}` : ''}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statementStatusColors[request.status]}`}>
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{request.prompt}</p>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Current Snapshot</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                <span className="text-slate-500 dark:text-slate-400">Maintenance reports</span>
                <span className="font-semibold text-slate-900 dark:text-white">{maintenanceCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                <span className="text-slate-500 dark:text-slate-400">Anonymous reports</span>
                <span className="font-semibold text-slate-900 dark:text-white">{metrics.anonymous}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-950">
                <span className="text-slate-500 dark:text-slate-400">Pending statements</span>
                <span className="font-semibold text-slate-900 dark:text-white">{pendingStatements}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
