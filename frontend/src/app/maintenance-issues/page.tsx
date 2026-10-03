"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ClipboardList,
  PlusCircle,
  Search,
  Wrench,
} from "@/components/icons";
import { useAuth } from "../../context/AuthContext";
import { PageSkeleton, InlineSkeleton } from "../../components/PageSkeleton";
import Notification, { useNotification } from "../../components/Notification";
import { canAccessPage } from "../../utils/access";
import {
  createManualWorkOrder,
  createWorkOrder,
  getMaintenanceIssues,
  type MaintenanceIssue,
} from "../../utils/workOrders";

const statusOptions = [
  "all",
  "Submitted",
  "Under Review",
  "In Progress",
  "Resolved",
];

const priorityOptions = ["Low", "Normal", "High", "Urgent safety risk"];

const INITIAL_MANUAL_ISSUE = {
  title: "",
  description: "",
  location: "",
  issueType: "Other",
  priority: "Normal" as const,
  affectedAsset: "",
  accessInstructions: "",
  assignedTo: "",
};

export default function MaintenanceIssuesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { notification, showNotification, hideNotification } =
    useNotification();
  const [issues, setIssues] = useState<MaintenanceIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creatingId, setCreatingId] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualIssue, setManualIssue] = useState(INITIAL_MANUAL_ISSUE);
  const [creatingManual, setCreatingManual] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) router.replace("/login");
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!user || !canAccessPage(user.role, "maintenanceIssues")) return;
    let cancelled = false;

    async function loadIssues() {
      setLoading(true);
      const data = await getMaintenanceIssues({ search });
      if (!cancelled) {
        setIssues(data);
        setLoading(false);
      }
    }

    loadIssues().catch(() => {
      if (!cancelled) {
        setIssues([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, search]);

  if (!authLoading && !token) router.replace("/login");
  if (!token || !user) return <PageSkeleton />;
  if (!canAccessPage(user.role, "maintenanceIssues"))
    return <div className="text-red-600">Access denied.</div>;

  const filteredIssues = useMemo(() => {
    return issues.filter(
      (issue) => statusFilter === "all" || issue.status === statusFilter,
    );
  }, [issues, statusFilter]);

  async function handleCreateManualWorkOrder(event: React.FormEvent) {
    event.preventDefault();
    if (
      !manualIssue.title.trim() ||
      !manualIssue.description.trim() ||
      !manualIssue.location.trim()
    ) {
      showNotification(
        "error",
        "Title, description, and location are required.",
      );
      return;
    }

    try {
      setCreatingManual(true);
      const workOrder = await createManualWorkOrder({
        ...manualIssue,
        title: manualIssue.title.trim(),
        description: manualIssue.description.trim(),
        location: manualIssue.location.trim(),
        affectedAsset: manualIssue.affectedAsset.trim(),
        accessInstructions: manualIssue.accessInstructions.trim(),
        assignedTo: manualIssue.assignedTo.trim(),
        message: "Manual maintenance issue and work order created by staff.",
      });
      setManualIssue(INITIAL_MANUAL_ISSUE);
      setShowManualForm(false);
      showNotification(
        "success",
        `Manual work order ${workOrder.workOrderId} created.`,
      );
      router.push("/work-orders");
    } catch (err: any) {
      showNotification(
        "error",
        err?.message || "Failed to create manual work order.",
      );
    } finally {
      setCreatingManual(false);
    }
  }

  async function handleCreateWorkOrder(issue: MaintenanceIssue) {
    try {
      if (!issue.canCreateWorkOrder || issue.source !== "student_report") {
        showNotification(
          "info",
          "Work orders can only be created directly from student/user maintenance issues.",
        );
        return;
      }
      setCreatingId(issue.id);
      const workOrder = await createWorkOrder(
        issue.id,
        `Work order created from maintenance issue ${issue.trackingCode}.`,
      );
      setIssues((current) =>
        current.map((item) =>
          item.id === issue.id
            ? {
                ...item,
                maintenanceWorkOrderId: workOrder.workOrderId,
                status:
                  item.status === "Submitted" ? "In Progress" : item.status,
                canCreateWorkOrder: false,
              }
            : item,
        ),
      );
      showNotification(
        "success",
        `Work order ${workOrder.workOrderId} created.`,
      );
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to create work order.");
    } finally {
      setCreatingId(null);
    }
  }

  return (
    <>
      <section className="w-full space-y-6">
        <div className="rounded-3xl bg-white dark:bg-gray-800 p-6 shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3 text-kmuGreen">
                <Wrench size={26} />
                <h1 className="text-3xl font-bold">Maintenance Issues</h1>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Review submitted maintenance issues, inspect request details,
                and create dedicated work orders for maintenance follow-up.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowManualForm((current) => !current)}
                className="inline-flex items-center gap-2 rounded-xl bg-kmuGreen px-4 py-3 text-sm font-semibold text-white hover:bg-kmuOrange"
              >
                <PlusCircle size={18} />
                {showManualForm ? "Cancel Manual Issue" : "Create Manual Issue"}
              </button>
              <Link
                href="/work-orders"
                className="inline-flex items-center gap-2 rounded-xl border border-kmuGreen px-4 py-3 text-sm font-semibold text-kmuGreen hover:bg-kmuGreen/10"
              >
                <ClipboardList size={18} />
                View Work Orders
              </Link>
            </div>
          </div>
        </div>

        {showManualForm && (
          <form
            onSubmit={handleCreateManualWorkOrder}
            className="rounded-2xl bg-white p-5 shadow dark:bg-gray-800"
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create maintenance issue and work order
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use this for issues found by staff or administrators without a
                submitted user issue.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title *
                </span>
                <input
                  value={manualIssue.title}
                  onChange={(event) =>
                    setManualIssue((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Location *
                </span>
                <input
                  value={manualIssue.location}
                  onChange={(event) =>
                    setManualIssue((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Building, room, hostel, office..."
                  required
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Issue type
                </span>
                <input
                  value={manualIssue.issueType}
                  onChange={(event) =>
                    setManualIssue((current) => ({
                      ...current,
                      issueType: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Electrical, Plumbing, Carpentry..."
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Priority
                </span>
                <select
                  value={manualIssue.priority}
                  onChange={(event) =>
                    setManualIssue((current) => ({
                      ...current,
                      priority: event.target
                        .value as typeof manualIssue.priority,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {priorityOptions.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Affected Asset
                </span>
                <input
                  value={manualIssue.affectedAsset}
                  onChange={(event) =>
                    setManualIssue((current) => ({
                      ...current,
                      affectedAsset: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Door lock, sink, light fixture..."
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Assigned to
                </span>
                <input
                  value={manualIssue.assignedTo}
                  onChange={(event) =>
                    setManualIssue((current) => ({
                      ...current,
                      assignedTo: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Technician/team name"
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description *
                </span>
                <textarea
                  value={manualIssue.description}
                  onChange={(event) =>
                    setManualIssue((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  required
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Access instructions
                </span>
                <textarea
                  value={manualIssue.accessInstructions}
                  onChange={(event) =>
                    setManualIssue((current) => ({
                      ...current,
                      accessInstructions: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  rows={2}
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={creatingManual}
                className="rounded-xl bg-kmuGreen px-4 py-2 text-sm font-semibold text-white hover:bg-kmuOrange disabled:opacity-60"
              >
                {creatingManual ? "Creating..." : "Create Issue & Work Order"}
              </button>
            </div>
          </form>
        )}

        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow">
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <label className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search maintenance issues by title, tracking code, location..."
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-3 pl-11 pr-4 text-gray-900 dark:text-white"
              />
            </label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "all" ? "All statuses" : status}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow">
            <InlineSkeleton rows={5} />
          </div>
        ) : filteredIssues.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center text-gray-500 dark:text-gray-400">
            <AlertTriangle className="mx-auto mb-3 text-kmuOrange" />
            No maintenance issues match the current filters.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-white dark:bg-gray-800 shadow">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Issue
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Maintenance Detail
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredIssues.map((issue) => (
                    <tr
                      key={`${issue.source}-${issue.id}`}
                      className="align-top"
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {issue.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {issue.trackingCode} • {issue.location}
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
                          {issue.description}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-300">
                        <p>
                          <span className="font-medium">Type:</span>{" "}
                          {issue.issueType || "Other"}
                        </p>
                        <p>
                          <span className="font-medium">Priority:</span>{" "}
                          {issue.priority || "Normal"}
                        </p>
                        <p>
                          <span className="font-medium">Asset:</span>{" "}
                          {issue.affectedAsset || "Not specified"}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                          {issue.status}
                        </span>
                        {issue.maintenanceWorkOrderId && (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            WO: {issue.maintenanceWorkOrderId}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {issue.maintenanceWorkOrderId ? (
                          <Link
                            href="/work-orders"
                            className="text-sm font-semibold text-kmuGreen hover:underline"
                          >
                            Open work orders
                          </Link>
                        ) : issue.canCreateWorkOrder ? (
                          <button
                            type="button"
                            onClick={() => handleCreateWorkOrder(issue)}
                            disabled={creatingId === issue.id}
                            className="inline-flex items-center gap-2 rounded-xl bg-kmuGreen px-3 py-2 text-sm font-semibold text-white hover:bg-kmuOrange disabled:opacity-60"
                          >
                            <PlusCircle size={16} />
                            {creatingId === issue.id
                              ? "Creating..."
                              : "Create work order"}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Track only
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
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
