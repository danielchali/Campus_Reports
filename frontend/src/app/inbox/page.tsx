"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Filter,
  Paperclip,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Notification, { useNotification } from "../../components/Notification";
import { canAccessPage } from "../../utils/access";
import { PageSkeleton, CardSkeleton } from "../../components/PageSkeleton";
import {
  downloadStudentReportAttachment,
  getAllStudentReports,
  getUnreadStudentReportsCount,
  markAllStudentReportsSeen,
  markStudentReportSeen,
  updateStudentReportCategory,
  updateStudentReportStatus,
  type StudentReport,
  type StudentReportCategory,
  type StudentReportStatus,
} from "../../utils/studentReports";
import { getDisplayFullName } from "../../utils/userDisplay";

const categoryLabels = {
  disciplinary_case: "Disciplinary Case",
  maintenance_issue: "Maintenance Issue",
} as const;

const detailLabels: Record<string, string> = {
  peopleInvolved: "People Involved",
  witnesses: "Witnesses",
  riskLevel: "Safety / Security Risk",
  securityAction: "Immediate Action Taken",
  studentInvolved: "Learner/Student Involved",
  issueType: "Maintenance Issue Type",
  priority: "Priority",
  affectedAsset: "Affected Room, Fixture, or Asset",
  accessInstructions: "Access or Timing Notes",
};

const statusOptions: StudentReportStatus[] = [
  "Submitted",
  "Under Review",
  "In Progress",
  "Resolved",
];

export default function InboxPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { notification, showNotification, hideNotification } =
    useNotification();

  const [reports, setReports] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<
    Record<string, StudentReportStatus>
  >({});
  const [categoryDrafts, setCategoryDrafts] = useState<
    Record<string, StudentReportCategory>
  >({});
  const [updateMessages, setUpdateMessages] = useState<Record<string, string>>(
    {},
  );
  const [unreadCount, setUnreadCount] = useState(0);

  const filteredReports = useMemo(() => {
    return reports
      .filter((report) => {
        const matchesCategory =
          categoryFilter === "all" || report.category === categoryFilter;
        const matchesStatus =
          statusFilter === "all" || report.status === statusFilter;
        const matchesVisibility =
          visibilityFilter === "all" ||
          (visibilityFilter === "anonymous" && report.anonymous) ||
          (visibilityFilter === "named" && !report.anonymous);

        return matchesCategory && matchesStatus && matchesVisibility;
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          return (
            new Date(a.submittedAt).getTime() -
            new Date(b.submittedAt).getTime()
          );
        }

        if (sortBy === "status") {
          return a.status.localeCompare(b.status);
        }

        return (
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
        );
      });
  }, [reports, categoryFilter, statusFilter, visibilityFilter, sortBy]);

  if (typeof window !== "undefined") {
    if (!authLoading && !token) {
      router.replace("/login");
    }
    if (!token) {
      return <PageSkeleton />;
    }

    if (!user || !canAccessPage(user.role, "inbox")) {
      return <div className="text-red-600">Access denied.</div>;
    }
  }

  useEffect(() => {
    if (!user) return;

    const userId = user.id;
    const userUsername = user.username;
    const userName = user.name;
    let cancelled = false;

    async function fetchReports() {
      setLoading(true);
      try {
        const allReports = await getAllStudentReports(search);
        if (!cancelled) setReports(allReports);
      } catch (err) {
        console.error("Failed to load reports:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReports();
    return () => {
      cancelled = true;
    };
  }, [user, search]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    async function fetchUnread() {
      try {
        const count = await getUnreadStudentReportsCount("");
        if (!cancelled) setUnreadCount(count);
      } catch {
        // ignore
      }
    }

    fetchUnread();
    return () => {
      cancelled = true;
    };
  }, [reports, user]);

  async function refreshReports() {
    const allReports = await getAllStudentReports(search);
    setReports(allReports);
  }

  async function handleMarkSeen(reportId: string) {
    if (!user) {
      return;
    }

    await markStudentReportSeen(reportId, user.id);
    await refreshReports();
  }

  async function handleMarkAllSeen() {
    if (!user) {
      return;
    }

    await markAllStudentReportsSeen(user.id);
    await refreshReports();
    showNotification("success", "All student reports marked as seen.");
  }

  async function handleApplyCategory(report: StudentReport) {
    const nextCategory = categoryDrafts[report.id] || report.category;
    if (nextCategory === report.category) {
      showNotification(
        "info",
        `Report ${report.trackingCode} is already marked as ${categoryLabels[report.category]}.`,
      );
      return;
    }

    const updatedReport = await updateStudentReportCategory(
      report.id,
      nextCategory,
      `Category corrected to ${categoryLabels[nextCategory]}.`,
    );

    if (!updatedReport) {
      showNotification("error", "Failed to reroute report category.");
      return;
    }

    await refreshReports();
    showNotification(
      "success",
      `Report ${report.trackingCode} rerouted to ${categoryLabels[nextCategory]}.`,
    );
  }

  async function handleApplyStatus(report: StudentReport) {
    if (!user) {
      return;
    }

    const nextStatus = statusDrafts[report.id] || report.status;
    if (nextStatus === report.status) {
      showNotification(
        "info",
        `Report ${report.trackingCode} is already marked as ${report.status}.`,
      );
      return;
    }
    const message =
      updateMessages[report.id]?.trim() ||
      `Your report has been updated to ${nextStatus}.`;

    await updateStudentReportStatus(report.id, nextStatus, message, {
      id: user.id,
      username: user.username,
      name: user.name,
    });

    await refreshReports();
    showNotification(
      "success",
      `Report ${report.trackingCode} updated to ${nextStatus}.`,
    );
  }

  return (
    <>
      <section className="w-full space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-kmuGreen">
              Student Report Inbox
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Review incoming student reports, track new submissions, and update
              follow-up status from one shared inbox.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
                <option key={status} value={status}>
                  {status}
                </option>
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
              {filteredReports.length} report
              {filteredReports.length === 1 ? "" : "s"} found
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
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
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
              const draftCategory =
                categoryDrafts[report.id] || report.category;

              return (
                <article
                  key={report.id}
                  className={`rounded-2xl bg-white dark:bg-gray-800 shadow overflow-hidden border ${
                    isSeen
                      ? "border-gray-200 dark:border-gray-700"
                      : "border-blue-300 dark:border-blue-700"
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
                        {!isSeen && (
                          <div className="mt-2 h-2.5 w-2.5 rounded-full bg-blue-600" />
                        )}
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                              {report.title}
                            </h2>
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
                            {report.anonymous
                              ? "Reporter hidden"
                              : `Reporter: ${getDisplayFullName(report.ownerName, report.ownerUsername)}`}{" "}
                            • {report.location} • Tracking code{" "}
                            {report.trackingCode}
                          </p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Submitted{" "}
                            {new Date(report.submittedAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp size={18} />
                      ) : (
                        <ChevronDown size={18} />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-5 bg-gray-50 dark:bg-gray-900/20 space-y-6">
                      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                              Description
                            </p>
                            <p className="mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {report.description}
                            </p>
                          </div>

                          {report.details &&
                            Object.values(report.details).some(Boolean) && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  Report Details
                                </p>
                                <div className="mt-2 grid gap-2 md:grid-cols-2">
                                  {Object.entries(report.details)
                                    .filter(([, value]) => Boolean(value))
                                    .map(([key, value]) => (
                                      <div
                                        key={key}
                                        className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
                                      >
                                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                          {detailLabels[key] || key}
                                        </p>
                                        <p className="mt-1 text-sm text-gray-900 dark:text-white">
                                          {value}
                                        </p>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}

                          {report.attachments &&
                            report.attachments.length > 0 && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                  Evidence / Files
                                </p>
                                <div className="mt-2 space-y-2">
                                  {report.attachments.map((attachment) => (
                                    <button
                                      key={attachment.id}
                                      type="button"
                                      onClick={() =>
                                        downloadStudentReportAttachment(
                                          report.id,
                                          attachment.id,
                                          attachment.originalName,
                                        )
                                      }
                                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 text-left text-sm text-gray-700 dark:text-gray-200 hover:border-kmuGreen"
                                    >
                                      <span className="inline-flex min-w-0 items-center gap-2">
                                        <Paperclip
                                          size={14}
                                          className="flex-shrink-0 text-kmuGreen"
                                        />
                                        <span className="truncate">
                                          {attachment.originalName}
                                        </span>
                                      </span>
                                      <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
                                        {Math.ceil(attachment.size / 1024)} KB
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
                              Timeline
                            </p>
                            <div className="space-y-3">
                              {report.updates.map((update) => (
                                <div
                                  key={update.id}
                                  className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="font-semibold text-kmuGreen">
                                      {update.status}
                                    </span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(
                                        update.createdAt,
                                      ).toLocaleString()}
                                    </span>
                                  </div>
                                  <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                                    {update.message}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Update handling status
                          </h3>
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
                                    [report.id]: e.target
                                      .value as StudentReportStatus,
                                  }))
                                }
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white"
                              >
                                {statusOptions.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                                Update note
                              </label>
                              <textarea
                                value={updateMessages[report.id] || ""}
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
                              disabled={draftStatus === report.status}
                              title={
                                draftStatus === report.status
                                  ? "Select a different status to save an update."
                                  : "Save status update"
                              }
                              className="rounded-xl bg-kmuGreen px-4 py-3 text-white font-medium transition hover:bg-kmuOrange disabled:cursor-not-allowed disabled:bg-gray-400"
                            >
                              Save status update
                            </button>
                          </div>

                          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              Correct report category
                            </h4>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              If this report was submitted to the wrong queue,
                              reroute it so the proper office can handle it.
                            </p>
                            <div className="mt-3 grid gap-3">
                              <select
                                value={draftCategory}
                                onChange={(e) =>
                                  setCategoryDrafts((current) => ({
                                    ...current,
                                    [report.id]: e.target
                                      .value as StudentReportCategory,
                                  }))
                                }
                                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white"
                              >
                                {Object.entries(categoryLabels).map(
                                  ([value, label]) => (
                                    <option key={value} value={value}>
                                      {label}
                                    </option>
                                  ),
                                )}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleApplyCategory(report)}
                                disabled={draftCategory === report.category}
                                className="rounded-xl bg-amber-600 px-4 py-3 text-white font-medium transition hover:bg-kmuOrange disabled:cursor-not-allowed disabled:bg-gray-400"
                              >
                                Reroute category
                              </button>
                            </div>
                          </div>

                          <div className="rounded-xl bg-gray-50 dark:bg-gray-900/30 p-4 text-sm text-gray-600 dark:text-gray-400">
                            <div className="flex items-center gap-2 mb-2">
                              {report.category === "disciplinary_case" ? (
                                <ShieldAlert
                                  size={16}
                                  className="text-red-500"
                                />
                              ) : (
                                <Wrench size={16} className="text-blue-500" />
                              )}
                              <span className="font-medium text-gray-900 dark:text-white">
                                Handling notes
                              </span>
                            </div>
                            <p>
                              Use this area to move reports from new intake to
                              review, work in progress, or resolved. The status
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
