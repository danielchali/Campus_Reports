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
      return <div className="text-center text-kmuGreen">Loading...</div>;
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
    <section className="max-w-6xl mx-auto space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-kmuGreen via-emerald-600 to-emerald-800 text-white p-8 shadow-xl">
        <div className="max-w-3xl">
          <p className="uppercase tracking-[0.2em] text-sm text-emerald-100 mb-3">
            Student Reporting Hub
          </p>
          <h1 className="text-4xl font-bold mb-4">
            Report concerns, track progress, and stay informed.
          </h1>
          <p className="text-emerald-50 text-lg leading-relaxed">
            Submit disciplinary or maintenance issues, choose whether your report is anonymous,
            and follow every update from one student-facing dashboard.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/make-report"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-kmuGreen font-semibold hover:bg-emerald-50 transition"
            >
              <FilePenLine size={18} />
              Make a Report
            </Link>
            <Link
              href="/my-reports"
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-5 py-3 text-white font-semibold hover:bg-white/10 transition"
            >
              <ClipboardList size={18} />
              View My Reports
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Reports</p>
          <p className="mt-3 text-3xl font-bold text-kmuGreen">{metrics.total}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Open Reports</p>
          <p className="mt-3 text-3xl font-bold text-amber-600">{metrics.open}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Anonymous Reports</p>
          <p className="mt-3 text-3xl font-bold text-sky-600">{metrics.anonymous}</p>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow">
          <p className="text-sm text-gray-500 dark:text-gray-400">Resolved</p>
          <p className="mt-3 text-3xl font-bold text-emerald-600">{metrics.resolved}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Keep track of your most recent submissions and their latest status.
              </p>
            </div>
            <Link
              href="/my-reports"
              className="inline-flex items-center gap-2 text-kmuGreen hover:text-kmuOrange transition"
            >
              See all
              <ArrowRight size={16} />
            </Link>
          </div>

          {metrics.recent.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-8 text-center">
              <AlertCircle className="mx-auto mb-3 text-kmuOrange" size={28} />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">No reports yet</h3>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Start by submitting your first report. You can choose a disciplinary case or a maintenance issue.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {metrics.recent.map((report) => (
                <div
                  key={report.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{report.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {categoryLabels[report.category]} • Tracking Code {report.trackingCode}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                      {report.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">
                    {report.updates[0]?.message || 'Report submitted successfully.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Report Types</h2>
            <div className="space-y-4">
              <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldCheck className="text-red-600 dark:text-red-300" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Disciplinary Case</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use this for misconduct, harassment, threats, theft, vandalism, or any behavior that needs formal review.
                </p>
              </div>
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Wrench className="text-blue-600 dark:text-blue-300" size={20} />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Maintenance Issue</h3>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Use this for damaged facilities, broken lights, leaking taps, unsafe spaces, or infrastructure issues.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Anonymous Reporting</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-6">
              When you enable anonymous reporting, the report is marked as anonymous for handling and review. You can still
              track the report from your dashboard using its tracking code and status history.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
