"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Paperclip,
  ShieldAlert,
  Wrench,
  X,
} from "@/components/icons";
import { useAuth } from "../../context/AuthContext";
import Notification, { useNotification } from "../../components/Notification";
import { canAccessPage } from "../../utils/access";
import { PageSkeleton, CardSkeleton } from "../../components/PageSkeleton";
import { StatCard, StatsStrip } from "../../components/StatsStrip";
import {
  downloadStudentReportAttachment,
  getStudentReportAttachmentDownloadUrl,
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
  affectedAsset: "Affected Asset",
  accessInstructions: "Access or Timing Notes",
};

function isImageAttachment(mimeType = "", filename = "") {
  const extension = filename.split(".").pop()?.toLowerCase();
  return (
    mimeType.startsWith("image/") ||
    ["jpg", "jpeg", "png", "gif", "bmp", "webp"].includes(extension || "")
  );
}

const statusOptions: StudentReportStatus[] = [
  "Submitted",
  "Under Review",
  "In Progress",
  "Resolved",
];

export default function InboxPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { notification, showNotification, hideNotification } =
    useNotification();

  const [reports, setReports] = useState<StudentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState("");
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
  const [attachmentPreview, setAttachmentPreview] = useState<{
    name: string;
    url: string;
  } | null>(null);
  const reportRefs = useRef<Record<string, HTMLElement | null>>({});
  const selectedReportId = searchParams.get("reportId")?.trim() || null;

  const visibleReports = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return reports
      .filter((report) => {
        if (categoryFilter && report.category !== categoryFilter) return false;
        if (statusFilter && report.status !== statusFilter) return false;
        if (visibilityFilter === "anonymous" && !report.anonymous) return false;
        if (visibilityFilter === "named" && report.anonymous) return false;
        if (!normalizedSearch) return true;

        const searchableText = [
          report.title,
          report.description,
          report.trackingCode,
          report.location,
          report.category,
          report.status,
          report.ownerName,
          report.ownerUsername,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      })
      .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
  }, [reports, search, categoryFilter, statusFilter, visibilityFilter]);

  const reportStats = useMemo(
    () => ({
      disciplinary: reports.filter(
        (report) => report.category === "disciplinary_case",
      ).length,
      maintenance: reports.filter(
        (report) => report.category === "maintenance_issue",
      ).length,
      inProgress: reports.filter((report) => report.status === "In Progress")
        .length,
      resolved: reports.filter((report) => report.status === "Resolved").length,
    }),
    [reports],
  );

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

    let cancelled = false;

    async function fetchReports() {
      setLoading(true);
      try {
        const allReports = await getAllStudentReports();
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
  }, [user]);

  useEffect(() => {
    if (!selectedReportId) return;

    setSearch("");
    setCategoryFilter("");
    setStatusFilter("");
    setVisibilityFilter("");

    const selectedReport = reports.find(
      (report) => report.id === selectedReportId,
    );
    if (!selectedReport) return;

    setExpandedId(selectedReport.id);
    const scrollTimer = window.setTimeout(() => {
      reportRefs.current[selectedReport.id]?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 0);

    return () => window.clearTimeout(scrollTimer);
  }, [reports, selectedReportId]);

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

  useEffect(() => {
    return () => {
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview.url);
      }
    };
  }, [attachmentPreview]);

  function closeAttachmentPreview() {
    if (attachmentPreview) {
      URL.revokeObjectURL(attachmentPreview.url);
    }
    setAttachmentPreview(null);
  }

  async function openAttachmentPreview(
    reportId: string,
    attachmentId: string,
    filename: string,
  ) {
    try {
      if (attachmentPreview) {
        URL.revokeObjectURL(attachmentPreview.url);
      }

      const response = await fetch(
        getStudentReportAttachmentDownloadUrl(reportId, attachmentId),
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      if (!response.ok) {
        throw new Error("Failed to open attachment preview");
      }

      setAttachmentPreview({
        name: filename,
        url: URL.createObjectURL(await response.blob()),
      });
    } catch (error) {
      console.error("Failed to open attachment preview:", error);
      showNotification("error", "Failed to open attachment preview.");
    }
  }

  async function refreshReports() {
    const allReports = await getAllStudentReports();
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

  function clearFilters() {
    setSearch("");
    setCategoryFilter("");
    setStatusFilter("");
    setVisibilityFilter("");
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
        <StatsStrip desktopColumnsClass="md:grid-cols-3 lg:grid-cols-6">
          <StatCard
            label="Total Reports"
            value={reports.length}
            valueClassName="text-kmuGreen"
          />
          <StatCard
            label="Unread"
            value={unreadCount}
            valueClassName="text-blue-600"
          />
          <StatCard
            label="Disciplinary"
            value={reportStats.disciplinary}
            valueClassName="text-orange-600"
          />
          <StatCard
            label="Maintenance"
            value={reportStats.maintenance}
            valueClassName="text-purple-600"
          />
          <StatCard
            label="In Progress"
            value={reportStats.inProgress}
            valueClassName="text-yellow-600"
          />
          <StatCard
            label="Resolved"
            value={reportStats.resolved}
            valueClassName="text-emerald-600"
          />
        </StatsStrip>

        <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.8fr)_repeat(3,minmax(0,0.9fr))]">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search reports, tracking codes, locations, or reporters"
              className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Categories</option>
              <option value="disciplinary_case">Disciplinary Case</option>
              <option value="maintenance_issue">Maintenance Issue</option>
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <select
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value)}
              className="rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">Anonymous + named</option>
              <option value="anonymous">Anonymous only</option>
              <option value="named">Named only</option>
            </select>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Showing {visibleReports.length} of {reports.length} report
              {reports.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={clearFilters}
                className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
              >
                Clear Filters
              </button>
              <button
                type="button"
                onClick={handleMarkAllSeen}
                className="inline-flex items-center gap-2 rounded bg-kmuGreen px-4 py-2 text-sm font-medium text-white transition hover:bg-kmuOrange"
              >
                <CheckCheck size={16} />
                Mark all as seen
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : visibleReports.length === 0 ? (
            <div className="rounded-2xl bg-white dark:bg-gray-800 p-8 shadow text-center text-gray-500 dark:text-gray-400">
              No student reports match the selected filters.
            </div>
          ) : (
            visibleReports.map((report) => {
              const isSeen = !!user && (report.seenBy || []).includes(user.id);
              const isExpanded = expandedId === report.id;
              const isSelectedReport = selectedReportId === report.id;
              const draftStatus = statusDrafts[report.id] || report.status;
              const draftCategory =
                categoryDrafts[report.id] || report.category;

              return (
                <article
                  key={report.id}
                  ref={(element) => {
                    reportRefs.current[report.id] = element;
                  }}
                  className={`rounded-2xl bg-white dark:bg-gray-800 shadow overflow-hidden transition-all ${
                    isSelectedReport
                      ? "border-2 border-kmuOrange bg-amber-50/40 ring-4 ring-kmuOrange/20 dark:border-kmuOrange dark:bg-amber-950/20"
                      : `border ${
                          isSeen
                            ? "border-gray-200 dark:border-gray-700"
                            : "border-blue-300 dark:border-blue-700"
                        }`
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
                                  {report.attachments.map((attachment) => {
                                    const isImage = isImageAttachment(
                                      attachment.mimeType,
                                      attachment.originalName,
                                    );

                                    return (
                                    <button
                                      key={attachment.id}
                                      type="button"
                                      onClick={() =>
                                        isImage
                                          ? openAttachmentPreview(
                                              report.id,
                                              attachment.id,
                                              attachment.originalName,
                                            )
                                          : downloadStudentReportAttachment(
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
                                        {isImage
                                          ? "Preview"
                                          : `${Math.ceil(attachment.size / 1024)} KB`}
                                      </span>
                                    </button>
                                    );
                                  })}
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

      {attachmentPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Preview of ${attachmentPreview.name}`}
          onClick={closeAttachmentPreview}
        >
          <div
            className="relative max-h-full w-full max-w-4xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeAttachmentPreview}
              className="absolute right-3 top-3 rounded-full bg-slate-950/70 p-2 text-white transition hover:bg-slate-900"
              aria-label="Close image preview"
            >
              <X size={20} />
            </button>
            <img
              src={attachmentPreview.url}
              alt={`Submitted attachment preview: ${attachmentPreview.name}`}
              className="mx-auto max-h-[82vh] w-auto rounded-2xl bg-white object-contain shadow-2xl"
            />
            <p className="mt-3 truncate text-center text-sm font-medium text-white">
              {attachmentPreview.name}
            </p>
          </div>
        </div>
      )}

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
