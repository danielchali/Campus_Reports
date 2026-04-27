"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, EyeOff, FileStack, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageSkeleton, InlineSkeleton } from '../../components/PageSkeleton';
import {
  getStudentReportsForUser,
  migrateLocalReports,
  type StudentReport,
} from '../../utils/studentReports';

const categoryLabels = {
  disciplinary_case: 'Disciplinary Case',
  maintenance_issue: 'Maintenance Issue',
} as const;

export default function MyReportsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reports, setReports] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      router.replace('/login');
    }
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!user || user.role !== 'student') return;

    const userId = user.id;
    const userUsername = user.username;
    const userName = user.name;
    let cancelled = false;

    async function fetchReports() {
      setLoading(true);
      try {
        // Run migration on first load
        await migrateLocalReports({ id: userId, username: userUsername, name: userName });

        const data = await getStudentReportsForUser({
          id: userId,
          username: userUsername,
          name: userName,
        }, search);
        if (!cancelled) setReports(data);
      } catch (err) {
        console.error('Failed to load reports:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReports();
    return () => { cancelled = true; };
  }, [user, search]);

  if (!authLoading && !token) {
    router.replace('/login');
  }
  if (!token || !user) {
    return <PageSkeleton />;
  }
  if (user.role !== 'student') {
    return <div className="text-red-600">Access denied.</div>;
  }

  const filteredReports = reports.filter((report) => {
    const matchesStatus = statusFilter === 'All' || report.status === statusFilter;
    return matchesStatus;
  });

  return (
    <section className="max-w-5xl mx-auto space-y-6 md:space-y-8">
      <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-gray-800 p-4 md:p-8 shadow">
        <h1 className="text-2xl md:text-4xl font-bold text-kmuGreen">My Reports</h1>
        <p className="mt-2 md:mt-3 text-gray-600 dark:text-gray-400 text-sm md:text-lg">
          Track every report you have submitted, review status changes, and keep your tracking codes handy.
        </p>
      </div>

      <div className="rounded-2xl md:rounded-3xl bg-white dark:bg-gray-800 p-4 md:p-6 shadow space-y-3 md:space-y-4">
        <div className="grid gap-2 md:gap-4 grid-cols-1 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <span className="sr-only">Search reports</span>
            <Search size={16} className="absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, tracking code, or category"
              className="w-full rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-9 md:pl-11 pr-3 md:pr-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg md:rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-gray-900 dark:text-white"
          >
            <option value="All">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        {loading ? (
          <div className="space-y-3 p-4">
            <InlineSkeleton rows={4} />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="rounded-lg md:rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-6 md:p-10 text-center">
            <FileStack className="mx-auto mb-2 md:mb-3 text-kmuOrange" size={24} />
            <h2 className="text-base md:text-xl font-semibold text-gray-900 dark:text-white">No reports found</h2>
            <p className="mt-2 text-xs md:text-sm text-gray-600 dark:text-gray-400">
              Submit a report first, or adjust your search and status filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3 md:space-y-4">
            {filteredReports.map((report) => {
              const expanded = expandedId === report.id;

              return (
                <article
                  key={report.id}
                  className="rounded-lg md:rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : report.id)}
                    className="w-full p-3 md:p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 md:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1 md:gap-2">
                          <h2 className="text-sm md:text-lg font-semibold text-gray-900 dark:text-white truncate">{report.title}</h2>
                          {report.anonymous && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 md:px-2.5 py-0.5 md:py-1 text-[10px] md:text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex-shrink-0">
                              <EyeOff size={10} />
                              <span className="hidden sm:inline">Anonymous</span>
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs md:text-sm text-gray-500 dark:text-gray-400 truncate">
                          {categoryLabels[report.category]} • {report.trackingCode} • Submitted{' '}
                          {new Date(report.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                        <span className="rounded-full bg-emerald-100 px-2 md:px-3 py-0.5 md:py-1 text-xs md:text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 whitespace-nowrap">
                          {report.status}
                        </span>
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-3 md:p-5 bg-gray-50 dark:bg-gray-900/20 space-y-4 md:space-y-5">
                      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Location</p>
                          <p className="mt-1 text-xs md:text-sm text-gray-900 dark:text-white">{report.location}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Incident Date</p>
                          <p className="mt-1 text-xs md:text-sm text-gray-900 dark:text-white">
                            {new Date(report.incidentDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</p>
                        <p className="mt-2 text-xs md:text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {report.description}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2 md:mb-3">Status Timeline</p>
                        <div className="space-y-2 md:space-y-3">
                          {report.updates.map((update) => (
                            <div
                              key={update.id}
                              className="rounded-lg md:rounded-xl bg-white dark:bg-gray-800 p-3 md:p-4 border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 md:gap-2">
                                <span className="font-semibold text-kmuGreen text-sm md:text-base">{update.status}</span>
                                <span className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(update.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="mt-1 md:mt-2 text-xs md:text-sm text-gray-700 dark:text-gray-300">{update.message}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
