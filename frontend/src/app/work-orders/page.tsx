"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, ClipboardList, PlusCircle, Search, Wrench } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageSkeleton, InlineSkeleton } from "../../components/PageSkeleton";
import SignatureField from "../../components/SignatureField";
import Notification, { useNotification } from "../../components/Notification";
import { canAccessPage } from "../../utils/access";
import {
  getWorkOrders,
  updateWorkOrderStatus,
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

const WORK_ORDER_SIGNATURES_STORAGE_KEY = "work-order-signatures-v1";

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
  const [draftStatuses, setDraftStatuses] = useState<
    Record<string, WorkOrderStatus>
  >({});
  const [updateNotes, setUpdateNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [signatures, setSignatures] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !token) router.replace("/login");
  }, [authLoading, token, router]);

  useEffect(() => {
    try {
      const storedSignatures = window.localStorage.getItem(
        WORK_ORDER_SIGNATURES_STORAGE_KEY,
      );

      if (!storedSignatures) {
        return;
      }

      const parsedSignatures = JSON.parse(storedSignatures) as Record<
        string,
        string
      >;

      if (parsedSignatures && typeof parsedSignatures === "object") {
        setSignatures(parsedSignatures);
      }
    } catch {
      setSignatures({});
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        WORK_ORDER_SIGNATURES_STORAGE_KEY,
        JSON.stringify(signatures),
      );
    } catch {
      // ignore storage failures and keep in-memory signatures available
    }
  }, [signatures]);

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

  useEffect(() => {
    if (!workOrders.length) {
      return;
    }

    setSignatures((current) => {
      const next = { ...current };
      for (const workOrder of workOrders) {
        next[`${workOrder.id}:part-c-signature`] =
          current[`${workOrder.id}:part-c-signature`] ||
          workOrder.signatures?.partC ||
          "";
        next[`${workOrder.id}:part-d-signature`] =
          current[`${workOrder.id}:part-d-signature`] ||
          workOrder.signatures?.partD ||
          "";
        next[`${workOrder.id}:part-e-signature`] =
          current[`${workOrder.id}:part-e-signature`] ||
          workOrder.signatures?.partE ||
          "";
      }
      return next;
    });
  }, [workOrders]);

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

  async function saveStatus(workOrder: WorkOrder) {
    const status = draftStatuses[workOrder.id] || workOrder.status;
    const note =
      updateNotes[workOrder.id]?.trim() || `Work order updated to ${status}.`;
    setSavingId(workOrder.id);
    const updated = await updateWorkOrderStatus(
      workOrder.id,
      status,
      note,
      workOrder.assignedTo,
      {
        partC: signatures[`${workOrder.id}:part-c-signature`] || "",
        partD: signatures[`${workOrder.id}:part-d-signature`] || "",
        partE: signatures[`${workOrder.id}:part-e-signature`] || "",
      },
    );
    setSavingId(null);

    if (!updated) {
      showNotification("error", "Failed to update work order.");
      return;
    }

    setWorkOrders((current) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
    setUpdateNotes((current) => ({ ...current, [workOrder.id]: "" }));
    showNotification(
      "success",
      `${updated.workOrderId} updated to ${updated.status}.`,
    );
  }

  return (
    <>
      <section className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-3xl bg-white dark:bg-gray-800 p-6 shadow">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3 text-kmuGreen">
                <ClipboardList size={28} />
                <h1 className="text-3xl font-bold">Work Orders</h1>
              </div>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Track dedicated maintenance work orders created from approved
                maintenance issues.
              </p>
            </div>
            <Link
              href="/maintenance-issues"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-kmuGreen px-4 py-3 text-sm font-semibold text-white transition hover:bg-kmuOrange"
            >
              <PlusCircle size={18} />
              New Work Order
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <SummaryCard
            label="Total"
            value={summary.total}
            icon={<ClipboardList size={18} />}
          />
          <SummaryCard
            label="Open / Assigned"
            value={summary.open}
            icon={<Wrench size={18} />}
          />
          <SummaryCard
            label="In Progress"
            value={summary.inProgress}
            icon={<Wrench size={18} />}
          />
          <SummaryCard
            label="Completed"
            value={summary.completed}
            icon={<CheckCircle2 size={18} />}
          />
        </div>

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
            {workOrders.map((workOrder) => {
              const draftStatus =
                draftStatuses[workOrder.id] || workOrder.status;
              return (
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
                            Type:
                          </span>{" "}
                          {workOrder.issueType}
                        </p>
                        <p>
                          <span className="font-medium text-gray-900 dark:text-white">
                            Asset:
                          </span>{" "}
                          {workOrder.affectedAsset || "Not specified"}
                        </p>
                        <p>
                          <span className="font-medium text-gray-900 dark:text-white">
                            Source:
                          </span>{" "}
                          {workOrder.sourceTrackingCode}
                        </p>
                        <p>
                          <span className="font-medium text-gray-900 dark:text-white">
                            Created:
                          </span>{" "}
                          {new Date(workOrder.createdAt).toLocaleString()}
                        </p>
                      </div>
                      {workOrder.accessInstructions && (
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="font-medium text-gray-900 dark:text-white">
                            Access notes:
                          </span>{" "}
                          {workOrder.accessInstructions}
                        </p>
                      )}
                      <WorkOrderJobCard
                        workOrder={workOrder}
                        signatures={signatures}
                        onSignatureChange={(key, value) =>
                          setSignatures((current) => ({ ...current, [key]: value }))
                        }
                      />
                    </div>

                    <div className="w-full rounded-2xl border border-gray-200 dark:border-gray-700 p-4 lg:w-80">
                      <label className="block text-sm font-medium text-gray-900 dark:text-white">
                        Update status
                      </label>
                      <select
                        value={draftStatus}
                        onChange={(event) =>
                          setDraftStatuses((current) => ({
                            ...current,
                            [workOrder.id]: event.target
                              .value as WorkOrderStatus,
                          }))
                        }
                        className="mt-2 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                      >
                        {statusOptions
                          .filter((status) => status !== "all")
                          .map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                      </select>
                      <textarea
                        value={updateNotes[workOrder.id] || ""}
                        onChange={(event) =>
                          setUpdateNotes((current) => ({
                            ...current,
                            [workOrder.id]: event.target.value,
                          }))
                        }
                        rows={3}
                        placeholder="Add a work note..."
                        className="mt-3 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => saveStatus(workOrder)}
                        disabled={savingId === workOrder.id}
                        className="mt-3 w-full rounded-xl bg-kmuGreen px-4 py-2.5 text-sm font-semibold text-white hover:bg-kmuOrange disabled:opacity-60"
                      >
                        {savingId === workOrder.id
                          ? "Saving..."
                          : "Save work order update"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
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

function DashedLine({ value }: { value?: string }) {
  return (
    <span className="inline-flex min-h-[1.5rem] min-w-[9rem] flex-1 items-end border-b border-dashed border-slate-400 px-2 pb-0.5 text-sm font-medium text-slate-900 dark:border-slate-500 dark:text-slate-100">
      {value || ""}
    </span>
  );
}

function WorkOrderJobCard({
  workOrder,
  signatures,
  onSignatureChange,
}: {
  workOrder: WorkOrder;
  signatures: Record<string, string>;
  onSignatureChange: (key: string, value: string) => void;
}) {
  const formattedCreatedDate = new Date(
    workOrder.createdAt,
  ).toLocaleDateString();
  const latestCompletedUpdate = workOrder.updates.find(
    (update) => update.status === "Completed",
  );

  return (
    <div className="mt-5 rounded-2xl border border-slate-300 bg-slate-50 p-4 text-slate-900 shadow-inner dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 print:bg-white">
      <div className="border-b border-slate-300 pb-3 text-center dark:border-slate-700">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
          Kapasa Makasa University
        </p>
        <div className="mt-1 flex flex-wrap items-center justify-center gap-3">
          <h3 className="text-lg font-bold uppercase">
            Maintenance Request & Job Card
          </h3>
          <span className="rounded-md border border-red-200 bg-white px-2 py-1 text-sm font-semibold text-red-600 dark:border-red-900 dark:bg-slate-900">
            No. {workOrder.workOrderId}
          </span>
        </div>
      </div>

      <div className="mt-4 space-y-4 text-sm">
        <section>
          <h4 className="font-bold uppercase">
            Part A - To be completed by tenant or requesting department
          </h4>
          <div className="mt-2 grid gap-2 md:grid-cols-2">
            <label className="flex items-end gap-2">
              Department
              <NameOrDepartment value={workOrder.requestingDepartment} />
            </label>
            <label className="flex items-end gap-2">
              Name
              <DashedLine
                value={workOrder.requestedByName || workOrder.createdBy}
              />
            </label>
            <label className="flex items-end gap-2">
              Address / Location
              <DashedLine value={workOrder.location} />
            </label>
            <label className="flex items-end gap-2">
              Date
              <DashedLine value={formattedCreatedDate} />
            </label>
          </div>
          <label className="mt-2 flex items-end gap-2">
            Nature of complaint/request
            <DashedLine value={workOrder.description} />
          </label>
          <label className="mt-2 flex items-end gap-2">
            Affected asset
            <DashedLine
              value={workOrder.affectedAsset || workOrder.issueType}
            />
          </label>
        </section>

        <section>
          <h4 className="font-bold uppercase">
            Part B - Artisan's inspection report
          </h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Materials needed / inspection notes:
          </p>
          <div className="mt-2 space-y-2">
            <DashedLine />
            <DashedLine />
          </div>
        </section>

        <section>
          <h4 className="font-bold uppercase">
            Part C - Section supervisor approval
          </h4>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <label className="flex items-end gap-2">
              Approved by
              <DashedLine />
            </label>
                          <SignatureField
                label="Signature"
                value={signatures[`${workOrder.id}:part-c-signature`] || ""}
                onChange={(value) =>
                  onSignatureChange(`${workOrder.id}:part-c-signature`, value)
                }
                helperText="Draw section supervisor signature."
              />
            <label className="flex items-end gap-2">
              Date
              <DashedLine />
            </label>
          </div>
        </section>

        <section>
          <h4 className="font-bold uppercase">Part D - Completion of job</h4>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tenant / Head of Department confirmation:
          </p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <label className="flex items-end gap-2">
              Name
              <DashedLine />
            </label>
                          <SignatureField
                label="Signature"
                value={signatures[`${workOrder.id}:part-d-signature`] || ""}
                onChange={(value) =>
                  onSignatureChange(`${workOrder.id}:part-d-signature`, value)
                }
                helperText="Draw tenant or head of department signature."
              />
            <label className="flex items-end gap-2">
              Date
              <DashedLine />
            </label>
          </div>
        </section>

        <section>
          <h4 className="font-bold uppercase">
            Part E - Completed report (maintenance officer / foreman)
          </h4>
          <label className="mt-2 flex items-end gap-2">
            Work done
            <DashedLine value={latestCompletedUpdate?.message} />
          </label>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <label className="flex items-end gap-2">
              Name
              <DashedLine />
            </label>
                          <SignatureField
                label="Signature"
                value={signatures[`${workOrder.id}:part-e-signature`] || ""}
                onChange={(value) =>
                  onSignatureChange(`${workOrder.id}:part-e-signature`, value)
                }
                helperText="Draw maintenance officer or foreman signature."
              />
            <label className="flex items-end gap-2">
              Date
              <DashedLine />
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}

function NameOrDepartment({ value }: { value?: string }) {
  return <DashedLine value={value} />;
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white dark:bg-gray-800 p-5 shadow">
      <div className="flex items-center justify-between text-kmuGreen">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </span>
        {icon}
      </div>
      <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
