"use client";

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, EyeOff, FileStack, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStudentReportsForUser } from '../../utils/studentReports';

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

  const reports = useMemo(() => {
    if (!user) {
      return [];
    }

    return getStudentReportsForUser({
      id: user.id,
      username: user.username,
      name: user.name,
    });
  }, [user]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesStatus = statusFilter === 'All' || report.status === statusFilter;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        report.title.toLowerCase().includes(query) ||
        report.trackingCode.toLowerCase().includes(query) ||
        report.description.toLowerCase().includes(query) ||
        categoryLabels[report.category].toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [reports, search, statusFilter]);

  return (
    <section className="max-w-5xl mx-auto space-y-8">
      <div className="rounded-3xl bg-white dark:bg-gray-800 p-8 shadow">
        <h1 className="text-4xl font-bold text-kmuGreen">My Reports</h1>
        <p className="mt-3 text-gray-600 dark:text-gray-400 text-lg">
          Track every report you have submitted, review status changes, and keep your tracking codes handy.
        </p>
      </div>

      <div className="rounded-3xl bg-white dark:bg-gray-800 p-6 shadow space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <span className="sr-only">Search reports</span>
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, tracking code, or category"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-11 pr-4 py-3 text-gray-900 dark:text-white"
            />
          </label>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white"
          >
            <option value="All">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Under Review">Under Review</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        {filteredReports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-10 text-center">
            <FileStack className="mx-auto mb-3 text-kmuOrange" size={28} />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">No reports found</h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Submit a report first, or adjust your search and status filters.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const expanded = expandedId === report.id;

              return (
                <article
                  key={report.id}
                  className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : report.id)}
                    className="w-full p-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{report.title}</h2>
                          {report.anonymous && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              <EyeOff size={12} />
                              Anonymous
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {categoryLabels[report.category]} • {report.trackingCode} • Submitted{' '}
                          {new Date(report.submittedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {report.status}
                        </span>
                        {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-900/20 space-y-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Location</p>
                          <p className="mt-1 text-gray-900 dark:text-white">{report.location}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Incident Date</p>
                          <p className="mt-1 text-gray-900 dark:text-white">
                            {new Date(report.incidentDate).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</p>
                        <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {report.description}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Status Timeline</p>
                        <div className="space-y-3">
                          {report.updates.map((update) => (
                            <div
                              key={update.id}
                              className="rounded-xl bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-semibold text-kmuGreen">{update.status}</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(update.createdAt).toLocaleString()}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{update.message}</p>
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
