"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Filter,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Notification, { useNotification } from '../../components/Notification';
import {
  getAllStudentReports,
  getUnreadStudentReportsCount,
  markAllStudentReportsSeen,
  markStudentReportSeen,
  updateStudentReportStatus,
  type StudentReport,
  type StudentReportStatus,
} from '../../utils/studentReports';

const allowedRoles = [
  'admin',
  'chief_security_officer',
  'dean_of_students',
  'assistant_dean',
  'secretary',
  'security_officer',
];

const categoryLabels = {
  disciplinary_case: 'Disciplinary Case',
  maintenance_issue: 'Maintenance Issue',
} as const;

const statusOptions: StudentReportStatus[] = [
  'Submitted',
  'Under Review',
  'In Progress',
  'Resolved',
];

export default function ReportsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { notification, showNotification, hideNotification } = useNotification();

  const [reports, setReports] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [search, setSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<string, StudentReportStatus>>({});
  const [updateMessages, setUpdateMessages] = useState<Record<string, string>>({});

  if (typeof window !== 'undefined') {
    if (!authLoading && !token) {
      router.replace('/login');
      return <div className="text-center text-kmuGreen">Redirecting to login...</div>;
    }

    if (authLoading) {
      return <div className="text-center text-kmuGreen">Loading...</div>;
    }

    if (!user || !allowedRoles.includes(user.role)) {
      return <div className="text-red-600">Access denied.</div>;
    }
  }

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoading(true);
    const allReports = getAllStudentReports();
    setReports(allReports);
    setLoading(false);
  }, [user]);

  const unreadCount = useMemo(() => {
    if (!user) {
      return 0;
    }

    return getUnreadStudentReportsCount(user.id);
  }, [reports, user]);

  const unreadReports = useMemo(() => {
    if (!user) {
      return [];
    }

    return reports.filter((report) => !(report.seenBy || []).includes(user.id)).slice(0, 6);
  }, [reports, user]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reports
      .filter((report) => {
        const matchesCategory =
          categoryFilter === 'all' || report.category === categoryFilter;
        const matchesStatus =
          statusFilter === 'all' || report.status === statusFilter;
        const matchesVisibility =
          visibilityFilter === 'all' ||
          (visibilityFilter === 'anonymous' && report.anonymous) ||
          (visibilityFilter === 'named' && !report.anonymous);
        const matchesSearch =
          !query ||
          report.title.toLowerCase().includes(query) ||
          report.trackingCode.toLowerCase().includes(query) ||
          report.location.toLowerCase().includes(query) ||
          report.description.toLowerCase().includes(query) ||
          report.ownerName.toLowerCase().includes(query) ||
          categoryLabels[report.category].toLowerCase().includes(query);

        return matchesCategory && matchesStatus && matchesVisibility && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'oldest') {
          return new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
        }

        if (sortBy === 'status') {
          return a.status.localeCompare(b.status);
        }

        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
  }, [reports, search, categoryFilter, statusFilter, visibilityFilter, sortBy]);

  function refreshReports() {
    setReports(getAllStudentReports());
  }

  function handleMarkSeen(reportId: string) {
    if (!user) {
      return;
    }

    markStudentReportSeen(reportId, user.id);
    refreshReports();
  }

  function handleMarkAllSeen() {
    if (!user) {
      return;
    }

    markAllStudentReportsSeen(user.id);
    refreshReports();
    showNotification('success', 'All student reports marked as seen.');
  }

  function handleApplyStatus(report: StudentReport) {
    if (!user) {
      return;
    }

    const nextStatus = statusDrafts[report.id] || report.status;
    const message =
      updateMessages[report.id]?.trim() ||
      `Status updated to ${nextStatus} by ${user.name || user.username}.`;

    updateStudentReportStatus(
      report.id,
      nextStatus,
      message,
      { id: user.id, username: user.username, name: user.name },
    );

    refreshReports();
    showNotification('success', `Report ${report.trackingCode} updated to ${nextStatus}.`);
  }

  return (
    <>
      <section className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-kmuGreen">Student Report Inbox</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Review incoming student reports, track new submissions, and update follow-up status from one shared inbox.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowNotifications((current) => !current)}
              className="relative inline-flex items-center gap-2 rounded-xl bg-white dark:bg-gray-800 px-4 py-3 shadow hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <Bell size={18} className="text-kmuGreen" />
              <span className="font-medium text-gray-900 dark:text-white">Notifications</span>
              {unreadCount > 0 && (
                <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleMarkAllSeen}
              className="inline-flex items-center gap-2 rounded-xl bg-kmuGreen px-4 py-3 text-white font-medium hover:bg-kmuOrange transition"
            >
              <CheckCheck size={18} />
              Mark all as seen
            </button>
          </div>
        </div>

        {showNotifications && (
          <div className="rounded-2xl bg-white dark:bg-gray-800 shadow overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">New report notifications</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Facebook-style alert stream for recently submitted student reports.
                </p>
              </div>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                {unreadCount} new
              </span>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {unreadReports.length === 0 ? (
                <div className="px-5 py-6 text-gray-500 dark:text-gray-400">
                  No new student reports right now.
                </div>
              ) : (
                unreadReports.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => {
                      handleMarkSeen(report.id);
                      setExpandedId(report.id);
                      setShowNotifications(false);
                    }}
                    className="w-full px-5 py-4 text-left hover:bg-blue-50 dark:hover:bg-blue-900/10 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-600" />
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">{report.title}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {categoryLabels[report.category]} • {report.anonymous ? 'Anonymous' : report.ownerName}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(report.submittedAt).toLocaleString()}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white dark:bg-gray-800 shadow p-5 space-y-4">
          <div className="flex items-center gap-2 text-kmuOrange">
            <Filter size={18} />
            <h2 className="text-lg font-semibold">Filters</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title, tracking code, location..."
              className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white xl:col-span-2"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white"
            >
              <option value="all">All categories</option>
              <option value="disciplinary_case">Disciplinary Case</option>
              <option value="maintenance_issue">Maintenance Issue</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white"
            >
              <option value="all">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            <select
              value={visibilityFilter}
              onChange={(e) => setVisibilityFilter(e.target.value)}
              className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white"
            >
              <option value="all">Anonymous + named</option>
              <option value="anonymous">Anonymous only</option>
              <option value="named">Named only</option>
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredReports.length} report{filteredReports.length === 1 ? '' : 's'} found
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-2 text-sm text-gray-900 dark:text-white"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="status">Sort by status</option>
            </select>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow text-gray-500 dark:text-gray-400">
              Loading student reports...
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-8 shadow text-center text-gray-500 dark:text-gray-400">
              No student reports match the current filters.
            </div>
          ) : (
            filteredReports.map((report) => {
              const isSeen = !!user && (report.seenBy || []).includes(user.id);
              const isExpanded = expandedId === report.id;
              const draftStatus = statusDrafts[report.id] || report.status;

              return (
                <article
                  key={report.id}
                  className={`rounded-2xl bg-white dark:bg-gray-800 shadow overflow-hidden border ${
                    isSeen
                      ? 'border-gray-200 dark:border-gray-700'
                      : 'border-blue-300 dark:border-blue-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedId(isExpanded ? null : report.id);
                      if (!isSeen) {
                        handleMarkSeen(report.id);
                      }
                    }}
                    className="w-full px-5 py-5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {!isSeen && <div className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{report.title}</h2>
                            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                              {categoryLabels[report.category]}
                            </span>
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                              {report.status}
                            </span>
                            {report.anonymous ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                                <EyeOff size={12} />
                                Anonymous
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-medium text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                                <Eye size={12} />
                                Named
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {report.anonymous ? 'Reporter hidden' : report.ownerName} • {report.location} • Tracking code {report.trackingCode}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Submitted {new Date(report.submittedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-5 bg-gray-50 dark:bg-gray-900/20 space-y-6">
                      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Description</p>
                            <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{report.description}</p>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">Timeline</p>
                            <div className="space-y-3">
                              {report.updates.map((update) => (
                                <div
                                  key={update.id}
                                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-semibold text-kmuGreen">{update.status}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(update.createdAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{update.message}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Update handling status</h3>
                          <div className="grid gap-4">
                            <div>
                              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                Status
                              </label>
                              <select
                                value={draftStatus}
                                onChange={(e) =>
                                  setStatusDrafts((current) => ({
                                    ...current,
                                    [report.id]: e.target.value as StudentReportStatus,
                                  }))
                                }
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white"
                              >
                                {statusOptions.map((status) => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                Update note
                              </label>
                              <textarea
                                value={updateMessages[report.id] || ''}
                                onChange={(e) =>
                                  setUpdateMessages((current) => ({
                                    ...current,
                                    [report.id]: e.target.value,
                                  }))
                                }
                                rows={5}
                                placeholder="Add a follow-up note for the report timeline..."
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplyStatus(report)}
                              className="rounded-xl bg-kmuGreen px-4 py-3 text-white font-medium hover:bg-kmuOrange transition"
                            >
                              Save status update
                            </button>
                          </div>

                          <div className="rounded-xl bg-gray-50 dark:bg-gray-900/30 p-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2 mb-2">
                              {report.category === 'disciplinary_case' ? (
                                <ShieldAlert size={16} className="text-red-500" />
                              ) : (
                                <Wrench size={16} className="text-blue-500" />
                              )}
                              <span className="font-medium text-gray-900 dark:text-white">Handling notes</span>
                            </div>
                            <p>
                              Use this area to move reports from new intake to review, work in progress, or resolved. The status
                              timeline is visible in the student tracking view.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      {notification?.isVisible && (
        <Notification
          type={notification.type}
          message={notification.message}
          isVisible={notification.isVisible}
          onClose={hideNotification}
        />
      )}
    </>
  );
}
