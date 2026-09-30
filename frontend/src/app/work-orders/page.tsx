"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  FilePenLine,
  PlusCircle,
  Search,
  Wrench,
} from "@/components/icons";
import { useAuth } from "../../context/AuthContext";
import { PageSkeleton, InlineSkeleton } from "../../components/PageSkeleton";
import { StatCard, StatsStrip } from "../../components/StatsStrip";
import Notification, { useNotification } from "../../components/Notification";
import WorkOrderJobCardModal from "../../components/WorkOrderJobCardModal";
import { canAccessPage } from "../../utils/access";
import {
  createManualWorkOrder,
  getWorkOrders,
  exportWorkOrder,
  type WorkOrder,
  type WorkOrderStatus,
} from "../../utils/workOrders";

const statusOptions: Array<"all" | WorkOrderStatus> = [
  "all",
  "Open",
  "Assigned",
  "In Progress",
  "Completed",
  "Cancelled",
];
const priorityOptions = ["all", "Low", "Normal", "High", "Urgent safety risk"];

const INITIAL_MANUAL_WORK_ORDER = {
  title: "",
  description: "",
  location: "",
  issueType: "Other",
  priority: "Normal" as const,
  affectedAsset: "",
  accessInstructions: "",
  assignedTo: "",
  requestedByName: "",
  requestingDepartment: "",
};

export default function WorkOrdersPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const { notification, showNotification, hideNotification } =
    useNotification();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualWorkOrder, setManualWorkOrder] = useState(INITIAL_MANUAL_WORK_ORDER);
  const [creatingManual, setCreatingManual] = useState(false);
  const [activeWorkOrderId, setActiveWorkOrderId] = useState<string | null>(null);

  const activeWorkOrder = useMemo(
    () => workOrders.find((item) => item.id === activeWorkOrderId) || null,
    [activeWorkOrderId, workOrders],
  );

  useEffect(() => {
    if (!authLoading && !token) router.replace("/login");
  }, [authLoading, token, router]);

  useEffect(() => {
    if (!user || !canAccessPage(user.role, "workOrders")) return;
    let cancelled = false;

    async function loadWorkOrders() {
      setLoading(true);
      const data = await getWorkOrders({
        search,
        status: statusFilter === "all" ? "" : statusFilter,
        priority: priorityFilter === "all" ? "" : priorityFilter,
      });
      if (!cancelled) {
        setWorkOrders(data);
        setLoading(false);
      }
    }

    loadWorkOrders().catch(() => {
      if (!cancelled) {
        setWorkOrders([]);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, search, statusFilter, priorityFilter]);

  if (!authLoading && !token) router.replace("/login");
  if (!token || !user) return <PageSkeleton />;
  if (!canAccessPage(user.role, "workOrders"))
    return <div className="text-red-600">Access denied.</div>;

  const summary = useMemo(() => {
    const open = workOrders.filter(
      (item) => item.status === "Open" || item.status === "Assigned",
    ).length;
    const inProgress = workOrders.filter(
      (item) => item.status === "In Progress",
    ).length;
    const completed = workOrders.filter(
      (item) => item.status === "Completed",
    ).length;
    return { total: workOrders.length, open, inProgress, completed };
  }, [workOrders]);

  async function handleCreateManualWorkOrder(event: React.FormEvent) {
    event.preventDefault();
    if (
      !manualWorkOrder.title.trim() ||
      !manualWorkOrder.description.trim() ||
      !manualWorkOrder.location.trim()
    ) {
      showNotification("error", "Title, description, and location are required.");
      return;
    }

    try {
      setCreatingManual(true);
      const workOrder = await createManualWorkOrder({
        ...manualWorkOrder,
        title: manualWorkOrder.title.trim(),
        description: manualWorkOrder.description.trim(),
        location: manualWorkOrder.location.trim(),
        affectedAsset: manualWorkOrder.affectedAsset.trim(),
        accessInstructions: manualWorkOrder.accessInstructions.trim(),
        assignedTo: manualWorkOrder.assignedTo.trim(),
        requestedByName: manualWorkOrder.requestedByName.trim(),
        requestingDepartment: manualWorkOrder.requestingDepartment.trim(),
        message: "Manual maintenance work order created by staff.",
      });
      setWorkOrders((current) => [workOrder, ...current]);
      setManualWorkOrder(INITIAL_MANUAL_WORK_ORDER);
      setShowManualForm(false);
      showNotification("success", `Manual work order ${workOrder.workOrderId} created.`);
    } catch (err: any) {
      showNotification("error", err?.message || "Failed to create manual work order.");
    } finally {
      setCreatingManual(false);
    }
  }

  function handleJobCardSaved(updated: WorkOrder) {
    setWorkOrders((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    showNotification("success", `${updated.workOrderId} job card saved.`);
  }

  return (
    <>
      {activeWorkOrder ? (
        <WorkOrderJobCardModal
          workOrder={activeWorkOrder}
          userRole={user.role}
          onClose={() => setActiveWorkOrderId(null)}
          onSaved={handleJobCardSaved}
        />
      ) : (
        <section className="w-full space-y-6">
          <div className="rounded-3xl bg-white dark:bg-gray-800 p-6 shadow">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-3 text-kmuGreen">
                  <ClipboardList size={28} />
                  <h1 className="text-3xl font-bold">Work Orders</h1>
                </div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">
                  Open a full-screen job card to complete each section, sign by
                  role, and save progress.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowManualForm((current) => !current)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-kmuGreen px-4 py-3 text-sm font-semibold text-white transition hover:bg-kmuOrange"
                >
                  <PlusCircle size={18} />
                  {showManualForm ? "Cancel New Work Order" : "New Work Order"}
                </button>
                <Link
                  href="/maintenance-issues"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-kmuGreen px-4 py-3 text-sm font-semibold text-kmuGreen transition hover:bg-kmuGreen/10"
                >
                  <Wrench size={18} />
                  Maintenance Issues
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
                Create work order without a submitted report
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Use this for staff-observed maintenance issues or verbal/offline
                requests.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title *
                </span>
                <input
                  value={manualWorkOrder.title}
                  onChange={(event) =>
                    setManualWorkOrder((current) => ({
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
                  value={manualWorkOrder.location}
                  onChange={(event) =>
                    setManualWorkOrder((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description *
                </span>
                <textarea
                  value={manualWorkOrder.description}
                  onChange={(event) =>
                    setManualWorkOrder((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                />
              </label>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={creatingManual}
                className="rounded-xl bg-kmuGreen px-4 py-2 text-sm font-semibold text-white hover:bg-kmuOrange disabled:opacity-60"
              >
                {creatingManual ? "Creating..." : "Create Work Order"}
              </button>
            </div>
            </form>
          )}

        <StatsStrip desktopColumnsClass="md:grid-cols-4">
          <StatCard
            label="Total"
            value={summary.total}
            icon={<ClipboardList size={18} />}
          />
          <StatCard
            label="Open / Assigned"
            value={summary.open}
            icon={<Wrench size={18} />}
          />
          <StatCard
            label="In Progress"
            value={summary.inProgress}
            icon={<Wrench size={18} />}
          />
          <StatCard
            label="Completed"
            value={summary.completed}
            icon={<CheckCircle2 size={18} />}
          />
        </StatsStrip>

        <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_220px]">
            <label className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search work orders by ID, issue, location, asset..."
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
            <select
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-4 py-3 text-gray-900 dark:text-white"
            >
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>
                  {priority === "all" ? "All priorities" : priority}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow">
            <InlineSkeleton rows={5} />
          </div>
        ) : workOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center text-gray-500 dark:text-gray-400">
            No work orders found.
          </div>
        ) : (
          <div className="space-y-4">
            {workOrders.map((workOrder) => (
              <article
                key={workOrder.id}
                className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {workOrder.title}
                      </h2>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {workOrder.workOrderId}
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        {workOrder.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      {workOrder.description}
                    </p>
                    <div className="mt-4 grid gap-2 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-2">
                      <p>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Location:
                        </span>{" "}
                        {workOrder.location}
                      </p>
                      <p>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Priority:
                        </span>{" "}
                        {workOrder.priority}
                      </p>
                      <p>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Department:
                        </span>{" "}
                        {workOrder.requestingDepartment || "Not specified"}
                      </p>
                      <p>
                        <span className="font-medium text-gray-900 dark:text-white">
                          Created:
                        </span>{" "}
                        {new Date(workOrder.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 lg:w-56">
                    <button
                      type="button"
                      onClick={() => setActiveWorkOrderId(workOrder.id)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-kmuGreen px-4 py-2.5 text-sm font-semibold text-white hover:bg-kmuOrange"
                    >
                      <FilePenLine size={16} />
                      Open job card
                    </button>
                    <label className="inline-flex items-center justify-center gap-2 rounded-xl border border-kmuGreen px-4 py-2.5 text-sm font-semibold text-kmuGreen hover:bg-kmuGreen/10">
                      Export
                      <select
                        defaultValue=""
                        aria-label={`Export ${workOrder.workOrderId} format`}
                        onChange={(event) => {
                          const format = event.target.value as "docx" | "pdf";
                          if (format) exportWorkOrder(workOrder.id, format);
                          event.currentTarget.value = "";
                        }}
                        className="cursor-pointer bg-transparent text-sm font-semibold text-kmuGreen outline-none"
                      >
                        <option value="" disabled>Format</option>
                        <option value="docx">DOCX</option>
                        <option value="pdf">PDF</option>
                      </select>
                    </label>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
        </section>
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
