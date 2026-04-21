"use client";

import Link from 'next/link';
import { AlertCircle, ArrowRight, ClipboardList, FilePenLine, ShieldCheck, Wrench } from 'lucide-react';
import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { getStudentReportMetrics } from '../../utils/studentReports';

const categoryLabels = {
  disciplinary_case: 'Disciplinary Case',
  maintenance_issue: 'Maintenance Issue',
} as const;

export default function StudentDashboardPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  if (typeof window !== 'undefined') {
    if (!authLoading && !token) {
      router.replace('/login');
      return <div className="text-center text-kmuGreen">Redirecting to login...</div>;
    }

    if (authLoading) {
      return <div className="p-6 animate-pulse"><div className="h-8 w-56 bg-gray-200 dark:bg-gray-700 rounded mb-4" /><div className="h-28 bg-gray-200 dark:bg-gray-700 rounded" /></div>;
    }

    if (!user || user.role !== 'student') {
      return <div className="text-red-600">Access denied.</div>;
    }
  }

  const metrics = useMemo(() => {
    if (!user) {
      return { total: 0, anonymous: 0, open: 0, resolved: 0, recent: [] };
    }

    return getStudentReportMetrics({
      id: user.id,
      username: user.username,
      name: user.name,
    });
  }, [user]);

  return (
    <section className="max-w-6xl mx-auto space-y-6 md:space-y-8">
      <div className="rounded-2xl md:rounded-3xl bg-gradient-to-br from-kmuGreen via-emerald-600 to-emerald-800 text-white p-4 md:p-8 shadow-xl">
        <div className="max-w-3xl">
          <p className="uppercase tracking-[0.1em] md:tracking-[0.2em] text-xs md:text-sm text-emerald-100 mb-2 md:mb-3">
            Student Reporting Hub
          </p>
          <h1 className="text-2xl md:text-4xl font-bold mb-3 md:mb-4">
            Report concerns, track progress, and stay informed.
          </h1>
          <p className="text-emerald-50 text-sm md:text-lg leading-relaxed">
            Submit disciplinary or maintenance issues, choose whether your report is anonymous,
            and follow every update from one student-facing dashboard.
          </p>
          <div className="mt-4 md:mt-6 flex flex-col sm:flex-row flex-wrap gap-2 md:gap-3">
            <Link
              href="/make-report"
              className="inline-flex items-center justify-center gap-2 rounded-lg md:rounded-xl bg-white px-3 md:px-5 py-2 md:py-3 text-kmuGreen font-semibold text-sm md:text-base hover:bg-emerald-50 transition"
            >
              <FilePenLine size={16} />
              Make a Report
            </Link>
            <Link
              href="/my-reports"
              className="inline-flex items-center justify-center gap-2 rounded-lg md:rounded-xl border border-white/30 px-3 md:px-5 py-2 md:py-3 text-white font-semibold text-sm md:text-base hover:bg-white/10 transition"
            >
              <ClipboardList size={16} />
              View My Reports
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg md:rounded-2xl bg-white dark:bg-gray-800 p-3 md:p-5 shadow">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Total Reports</p>
          <p className="mt-2 md:mt-3 text-2xl md:text-3xl font-bold text-kmuGreen">{metrics.total}</p>
        </div>
        <div className="rounded-lg md:rounded-2xl bg-white dark:bg-gray-800 p-3 md:p-5 shadow">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Open Reports</p>
          <p className="mt-2 md:mt-3 text-2xl md:text-3xl font-bold text-amber-600">{metrics.open}</p>
        </div>
        <div className="rounded-lg md:rounded-2xl bg-white dark:bg-gray-800 p-3 md:p-5 shadow">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Anonymous Reports</p>
          <p className="mt-2 md:mt-3 text-2xl md:text-3xl font-bold text-sky-600">{metrics.anonymous}</p>
        </div>
        <div className="rounded-lg md:rounded-2xl bg-white dark:bg-gray-800 p-3 md:p-5 shadow">
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">Resolved</p>
          <p className="mt-2 md:mt-3 text-2xl md:text-3xl font-bold text-emerald-600">{metrics.resolved}</p>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-lg md:rounded-2xl bg-white dark:bg-gray-800 p-4 md:p-6 shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-0 mb-4 md:mb-6">
            <div>
              <h2 className="text-lg md:text-2xl font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Keep track of your most recent submissions and their latest status.
              </p>
            </div>
            <Link
              href="/my-reports"
              className="inline-flex items-center gap-2 text-kmuGreen hover:text-kmuOrange transition text-sm md:text-base"
            >
              See all
              <ArrowRight size={16} />
            </Link>
          </div>

          {metrics.recent.length === 0 ? (
            <div className="rounded-lg md:rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-4 md:p-8 text-center">
              <AlertCircle className="mx-auto mb-2 md:mb-3 text-kmuOrange" size={24} />
              <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white">No reports yet</h3>
              <p className="mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">
                Start by submitting your first report. You can choose a disciplinary case or a maintenance issue.
              </p>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {metrics.recent.map((report) => (
                <div
                  key={report.id}
                  className="rounded-lg md:rounded-2xl border border-gray-200 dark:border-gray-700 p-3 md:p-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 md:gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base truncate">{report.title}</h3>
                      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                        {categoryLabels[report.category]} • Tracking Code {report.trackingCode}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 whitespace-nowrap">
                      {report.status}
                    </span>
                  </div>
                  <p className="mt-2 md:mt-3 text-xs md:text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {report.updates[0]?.message || 'Report submitted successfully.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="rounded-lg md:rounded-2xl bg-white dark:bg-gray-800 p-4 md:p-6 shadow">
            <h2 className="text-base md:text-xl font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Report Types</h2>
            <div className="space-y-3 md:space-y-4">
              <div className="rounded-lg md:rounded-2xl bg-red-50 dark:bg-red-900/20 p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <ShieldCheck className="text-red-600 dark:text-red-300" size={18} />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Disciplinary Case</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Use this for misconduct, harassment, threats, theft, vandalism, or any behavior that needs formal review.
                </p>
              </div>
              <div className="rounded-lg md:rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-3 md:p-4">
                <div className="flex items-center gap-2 md:gap-3 mb-2">
                  <Wrench className="text-blue-600 dark:text-blue-300" size={18} />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm md:text-base">Maintenance Issue</h3>
                </div>
                <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
                  Use this for damaged facilities, broken lights, leaking taps, unsafe spaces, or infrastructure issues.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg md:rounded-2xl bg-white dark:bg-gray-800 p-4 md:p-6 shadow">
            <h2 className="text-base md:text-xl font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Anonymous Reporting</h2>
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400 leading-6">
              When you enable anonymous reporting, the report is marked as anonymous for handling and review. You can still
              track the report from your dashboard using its tracking code and status history.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
