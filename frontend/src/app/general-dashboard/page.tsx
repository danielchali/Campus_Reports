"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  FilePenLine,
  FileText,
  Fingerprint,
  Megaphone,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton } from '../../components/PageSkeleton';
import { getStudentReportsForUser, type StudentReport } from '../../utils/studentReports';

const categoryLabels = {
  disciplinary_case: 'Incident',
  maintenance_issue: 'Maintenance',
} as const;

const statusColors = {
  Submitted: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'Under Review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'In Progress': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  Resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
} as const;

function formatDate(value?: string) {
  if (!value) return 'No date';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function GeneralDashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!user || user.role !== 'general_user') return;

    const currentUser = user;
    let cancelled = false;

    async function fetchReports() {
      setLoading(true);
      try {
        const data = await getStudentReportsForUser(
          { id: currentUser.id, username: currentUser.username, name: currentUser.name },
        );
        if (!cancelled) setReports(data);
      } catch (err) {
        console.error('Failed to load general user reports:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReports();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const summary = useMemo(() => {
    const total = reports.length;
    const resolved = reports.filter((report) => report.status === 'Resolved').length;
    const inProgress = reports.filter((report) => report.status === 'In Progress' || report.status === 'Under Review').length;
    const open = reports.filter((report) => report.status === 'Submitted').length;
    const maintenance = reports.filter((report) => report.category === 'maintenance_issue').length;

    return { total, resolved, inProgress, open, maintenance };
  }, [reports]);

  const recentReports = useMemo(() => [...reports].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).slice(0, 5), [reports]);

  if (!authLoading && !token) {
    router.replace('/login');
  }
  if (!token || !user) {
    return <PageSkeleton />;
  }
  if (user.role !== 'general_user') {
    return <div className="text-red-600">Access denied.</div>;
  }
  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 xl:space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-kmuGreen/10 text-kmuGreen">
              <ClipboardList size={18} />
            </div>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Welcome back, {user.name?.split(' ')[0] || 'User'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Submit campus issues, request maintenance, and track your reports.
          </p>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'My Reports', value: summary.total, helper: 'Total submitted items', icon: ClipboardList, tone: 'text-rose-700 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-300' },
          { label: 'Resolved', value: summary.resolved, helper: 'Completed or closed', icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300' },
          { label: 'In Progress', value: summary.inProgress, helper: 'Being reviewed now', icon: Clock3, tone: 'text-orange-700 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-300' },
          { label: 'Open', value: summary.open, helper: 'Awaiting action', icon: FileText, tone: 'text-violet-700 bg-violet-50 dark:bg-violet-900/20 dark:text-violet-300' },
          { label: 'Maintenance', value: summary.maintenance, helper: 'Maintenance requests raised', icon: Wrench, tone: 'text-sky-700 bg-sky-50 dark:bg-sky-900/20 dark:text-sky-300' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${card.tone}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{card.label}</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">{card.value}</p>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,0.95fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">My Recent Reports</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Incident and maintenance reports you have submitted.</p>
            </div>
            <Link href="/my-reports" className="text-xs font-medium text-kmuGreen hover:underline">
              View all
            </Link>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentReports.length === 0 ? (
              <div className="px-4 py-8 text-sm text-slate-500 dark:text-slate-400">
                No reports found yet. Start by creating a new report or maintenance request.
              </div>
            ) : (
              recentReports.map((report) => (
                <Link
                  key={report.id}
                  href="/my-reports"
                  className="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{report.title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {report.location} • {report.trackingCode}
                    </p>
                    <p className="mt-2 truncate text-sm text-slate-600 dark:text-slate-300">{categoryLabels[report.category]}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <span className="rounded-full bg-kmuGreen/10 px-2.5 py-1 text-[11px] font-semibold text-kmuGreen dark:bg-kmuGreen/20 dark:text-emerald-300">
                      {categoryLabels[report.category]}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColors[report.status]}`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(report.submittedAt)}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </article>

        <div className="space-y-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Quick Actions</h2>
            <div className="mt-3 grid gap-2 grid-cols-2">
              <Link href="/make-report" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <FilePenLine size={16} />
                <span>New Report</span>
              </Link>
              <Link href="/anonymous-report" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <Fingerprint size={16} />
                <span>Anonymous</span>
              </Link>
              <Link href="/make-report?category=maintenance_issue" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <Wrench size={16} />
                <span>Maintenance</span>
              </Link>
              <Link href="/help" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 transition hover:text-kmuGreen dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                <BookOpen size={16} />
                <span>Knowledge Base</span>
              </Link>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Announcements</h2>
            <div className="mt-3 space-y-2">
              {[
                'Submit maintenance issues with the exact building and room for faster response.',
                'Use anonymous reporting when you need to hide your identity.',
                'Track progress anytime from your reports page using the saved tracking code.',
              ].map((note) => (
                <div key={note} className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  {note}
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">How It Works</h2>
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
              <div className="flex flex-col items-center rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <Megaphone size={16} className="text-kmuOrange" />
                <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Submit</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <Clock3 size={16} className="text-kmuGreen" />
                <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Review</span>
              </div>
              <div className="flex flex-col items-center rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-950">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Resolve</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
