"use client";

import { useMemo, useState } from "react";
import { FileDown, Save, X } from "@/components/icons";
import SignatureField from "./SignatureField";
import {
  canEditWorkOrderPart,
  workOrderPartLabel,
  type WorkOrderPart,
} from "../utils/workOrderPermissions";
import {
  exportWorkOrderDocx,
  updateWorkOrderJobCard,
  type WorkOrder,
  type WorkOrderJobCard,
  type WorkOrderStatus,
} from "../utils/workOrders";
import { getTodayDateInputValue } from "../utils/dateTimeDefaults";

const statusOptions: WorkOrderStatus[] = [
  "Open",
  "Assigned",
  "In Progress",
  "Completed",
  "Cancelled",
];

const priorityOptions = ["Low", "Normal", "High", "Urgent safety risk"] as const;

type DraftState = {
  title: string;
  description: string;
  location: string;
  requestingDepartment: string;
  requestedByName: string;
  affectedAsset: string;
  issueType: string;
  priority: WorkOrder["priority"];
  accessInstructions: string;
  jobCard: WorkOrderJobCard;
  signatures: WorkOrder["signatures"];
  status: WorkOrderStatus;
  assignedTo: string;
  updateNote: string;
};

function buildDraft(workOrder: WorkOrder): DraftState {
  return {
    title: workOrder.title,
    description: workOrder.description,
    location: workOrder.location,
    requestingDepartment: workOrder.requestingDepartment,
    requestedByName: workOrder.requestedByName || workOrder.createdBy,
    affectedAsset: workOrder.affectedAsset,
    issueType: workOrder.issueType,
    priority: workOrder.priority,
    accessInstructions: workOrder.accessInstructions,
    jobCard: {
      partBNotes: workOrder.jobCard?.partBNotes || ["", ""],
      partCApprovedBy: workOrder.jobCard?.partCApprovedBy || "",
      partCDate: workOrder.jobCard?.partCDate || getTodayDateInputValue(),
      partDName: workOrder.jobCard?.partDName || "",
      partDDate: workOrder.jobCard?.partDDate || getTodayDateInputValue(),
      partEName: workOrder.jobCard?.partEName || "",
      partEDate: workOrder.jobCard?.partEDate || getTodayDateInputValue(),
      partEWorkDone: workOrder.jobCard?.partEWorkDone || "",
    },
    signatures: {
      partC: workOrder.signatures?.partC || "",
      partD: workOrder.signatures?.partD || "",
      partE: workOrder.signatures?.partE || "",
    },
    status: workOrder.status,
    assignedTo: workOrder.assignedTo,
    updateNote: "",
  };
}

function FormInput({
  label,
  value,
  onChange,
  disabled,
  type = "text",
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:disabled:bg-slate-900"
      />
    </label>
  );
}

function FormSection({
  part,
  role,
  title,
  children,
}: {
  part: WorkOrderPart;
  role: string;
  title: string;
  children: React.ReactNode;
}) {
  const editable = canEditWorkOrderPart(role, part);

  return (
    <section
      className={`rounded-2xl border p-4 md:p-5 ${
        editable
          ? "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
          : "border-slate-200 bg-slate-50 opacity-90 dark:border-slate-800 dark:bg-slate-950"
      }`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
          {title}
        </h4>
        {!editable ? (
          <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Read only — {workOrderPartLabel(part)}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export default function WorkOrderJobCardModal({
  workOrder,
  userRole,
  onClose,
  onSaved,
}: {
  workOrder: WorkOrder;
  userRole: string;
  onClose: () => void;
  onSaved: (updated: WorkOrder) => void;
}) {
  const [draft, setDraft] = useState<DraftState>(() => buildDraft(workOrder));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const formattedCreatedDate = useMemo(
    () => new Date(workOrder.createdAt).toLocaleDateString(),
    [workOrder.createdAt],
  );

  const canEditA = canEditWorkOrderPart(userRole, "partA");
  const canEditB = canEditWorkOrderPart(userRole, "partB");
  const canEditC = canEditWorkOrderPart(userRole, "partC");
  const canEditD = canEditWorkOrderPart(userRole, "partD");
  const canEditE = canEditWorkOrderPart(userRole, "partE");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const updated = await updateWorkOrderJobCard(workOrder.id, {
        ...(canEditA
          ? {
              partA: {
                title: draft.title,
                description: draft.description,
                location: draft.location,
                requestingDepartment: draft.requestingDepartment,
                requestedByName: draft.requestedByName,
                affectedAsset: draft.affectedAsset,
                issueType: draft.issueType,
                priority: draft.priority,
                accessInstructions: draft.accessInstructions,
              },
            }
          : {}),
        jobCard: {
          ...(canEditB ? { partBNotes: draft.jobCard.partBNotes } : {}),
          ...(canEditC
            ? {
                partCApprovedBy: draft.jobCard.partCApprovedBy,
                partCDate: draft.jobCard.partCDate,
              }
            : {}),
          ...(canEditD
            ? {
                partDName: draft.jobCard.partDName,
                partDDate: draft.jobCard.partDDate,
              }
            : {}),
          ...(canEditE
            ? {
                partEName: draft.jobCard.partEName,
                partEDate: draft.jobCard.partEDate,
                partEWorkDone: draft.jobCard.partEWorkDone,
              }
            : {}),
        },
        signatures: {
          ...(canEditC ? { partC: draft.signatures.partC } : {}),
          ...(canEditD ? { partD: draft.signatures.partD } : {}),
          ...(canEditE ? { partE: draft.signatures.partE } : {}),
        },
        status: draft.status,
        message:
          draft.updateNote.trim() ||
          `Job card saved. Status: ${draft.status}.`,
        assignedTo: draft.assignedTo,
      });

      if (!updated) {
        throw new Error("Failed to save job card.");
      }

      onSaved(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save job card.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-8">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-kmuGreen">
              Maintenance Request & Job Card
            </p>
            <h2 className="truncate text-lg font-bold text-slate-900 dark:text-white md:text-xl">
              {workOrder.workOrderId} — {workOrder.title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => exportWorkOrderDocx(workOrder.id)}
              className="inline-flex items-center gap-1 rounded-xl border border-kmuGreen px-3 py-2 text-xs font-semibold text-kmuGreen hover:bg-kmuGreen/10"
            >
              <FileDown size={14} />
              Export
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Close job card"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 md:px-8 md:py-8">
        <div className="rounded-2xl border border-slate-300 bg-white p-5 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <img
            src="/kmu_logo.svg"
            alt="KMU Logo"
            className="mx-auto mb-3 h-14 w-14"
          />
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            Kapasa Makasa University
          </p>
          <h3 className="mt-1 text-xl font-bold uppercase text-slate-900 dark:text-white">
            Maintenance Request & Job Card
          </h3>
          <p className="mt-2 text-sm font-semibold text-red-600">
            No. {workOrder.workOrderId}
          </p>
        </div>

        <FormSection
          part="partA"
          role={userRole}
          title="Part A — To be completed by tenant or requesting department"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="Department"
              value={draft.requestingDepartment}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  requestingDepartment: value,
                }))
              }
              disabled={!canEditA}
            />
            <FormInput
              label="Name"
              value={draft.requestedByName}
              onChange={(value) =>
                setDraft((current) => ({ ...current, requestedByName: value }))
              }
              disabled={!canEditA}
            />
            <FormInput
              label="Address / Location"
              value={draft.location}
              onChange={(value) =>
                setDraft((current) => ({ ...current, location: value }))
              }
              disabled={!canEditA}
            />
            <FormInput
              label="Date"
              value={formattedCreatedDate}
              onChange={() => undefined}
              disabled
            />
            <FormInput
              label="Title"
              value={draft.title}
              onChange={(value) =>
                setDraft((current) => ({ ...current, title: value }))
              }
              disabled={!canEditA}
            />
            <FormInput
              label="Issue type"
              value={draft.issueType}
              onChange={(value) =>
                setDraft((current) => ({ ...current, issueType: value }))
              }
              disabled={!canEditA}
            />
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Priority
              </span>
              <select
                value={draft.priority}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    priority: event.target.value as WorkOrder["priority"],
                  }))
                }
                disabled={!canEditA}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                {priorityOptions.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </label>
            <FormInput
              label="Affected asset"
              value={draft.affectedAsset}
              onChange={(value) =>
                setDraft((current) => ({ ...current, affectedAsset: value }))
              }
              disabled={!canEditA}
            />
          </div>
          <label className="mt-4 block space-y-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Nature of complaint / request
            </span>
            <textarea
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              disabled={!canEditA}
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <label className="mt-4 block space-y-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Access instructions
            </span>
            <textarea
              value={draft.accessInstructions}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  accessInstructions: event.target.value,
                }))
              }
              disabled={!canEditA}
              rows={2}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
        </FormSection>

        <FormSection
          part="partB"
          role={userRole}
          title="Part B — Artisan's inspection report"
        >
          <p className="mb-3 text-xs text-slate-500">
            Materials needed / inspection notes
          </p>
          <div className="space-y-3">
            <FormInput
              label="Inspection note 1"
              value={draft.jobCard.partBNotes[0]}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  jobCard: {
                    ...current.jobCard,
                    partBNotes: [value, current.jobCard.partBNotes[1]],
                  },
                }))
              }
              disabled={!canEditB}
            />
            <FormInput
              label="Inspection note 2"
              value={draft.jobCard.partBNotes[1]}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  jobCard: {
                    ...current.jobCard,
                    partBNotes: [current.jobCard.partBNotes[0], value],
                  },
                }))
              }
              disabled={!canEditB}
            />
          </div>
        </FormSection>

        <FormSection
          part="partC"
          role={userRole}
          title="Part C — Section supervisor approval"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="Approved by"
              value={draft.jobCard.partCApprovedBy}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  jobCard: { ...current.jobCard, partCApprovedBy: value },
                }))
              }
              disabled={!canEditC}
            />
            <FormInput
              label="Date"
              type="date"
              value={draft.jobCard.partCDate}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  jobCard: { ...current.jobCard, partCDate: value },
                }))
              }
              disabled={!canEditC}
            />
          </div>
          <div className="mt-4">
            <SignatureField
              label="Part C Signature"
              value={draft.signatures.partC}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  signatures: { ...current.signatures, partC: value },
                }))
              }
              disabled={!canEditC}
              helperText="Tap the pen icon to sign Part C."
            />
          </div>
        </FormSection>

        <FormSection
          part="partD"
          role={userRole}
          title="Part D — Completion of job"
        >
          <p className="mb-3 text-xs text-slate-500">
            Tenant / Head of Department confirmation
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="Name"
              value={draft.jobCard.partDName}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  jobCard: { ...current.jobCard, partDName: value },
                }))
              }
              disabled={!canEditD}
            />
            <FormInput
              label="Date"
              type="date"
              value={draft.jobCard.partDDate}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  jobCard: { ...current.jobCard, partDDate: value },
                }))
              }
              disabled={!canEditD}
            />
          </div>
          <div className="mt-4">
            <SignatureField
              label="Part D Signature"
              value={draft.signatures.partD}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  signatures: { ...current.signatures, partD: value },
                }))
              }
              disabled={!canEditD}
              helperText="Tap the pen icon to sign Part D."
            />
          </div>
        </FormSection>

        <FormSection
          part="partE"
          role={userRole}
          title="Part E — Completed report (maintenance officer / foreman)"
        >
          <label className="mb-4 block space-y-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Work done
            </span>
            <textarea
              value={draft.jobCard.partEWorkDone}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  jobCard: {
                    ...current.jobCard,
                    partEWorkDone: event.target.value,
                  },
                }))
              }
              disabled={!canEditE}
              rows={3}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <FormInput
              label="Name"
              value={draft.jobCard.partEName}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  jobCard: { ...current.jobCard, partEName: value },
                }))
              }
              disabled={!canEditE}
            />
            <FormInput
              label="Date"
              type="date"
              value={draft.jobCard.partEDate}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  jobCard: { ...current.jobCard, partEDate: value },
                }))
              }
              disabled={!canEditE}
            />
          </div>
          <div className="mt-4">
            <SignatureField
              label="Part E Signature"
              value={draft.signatures.partE}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  signatures: { ...current.signatures, partE: value },
                }))
              }
              disabled={!canEditE}
              helperText="Tap the pen icon to sign Part E."
            />
          </div>
        </FormSection>

        <section className="rounded-2xl border border-slate-300 bg-white p-4 md:p-5 dark:border-slate-700 dark:bg-slate-900">
          <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
            Work order handling
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Status
              </span>
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as WorkOrderStatus,
                  }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <FormInput
              label="Assigned to"
              value={draft.assignedTo}
              onChange={(value) =>
                setDraft((current) => ({ ...current, assignedTo: value }))
              }
            />
          </div>
          <label className="mt-4 block space-y-1">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Work note
            </span>
            <textarea
              value={draft.updateNote}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  updateNote: event.target.value,
                }))
              }
              rows={3}
              placeholder="Optional note to record with this save..."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
          </label>
        </section>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 md:-mx-8 md:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-kmuGreen px-5 py-2.5 text-sm font-semibold text-white hover:bg-kmuOrange disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? "Saving..." : "Save job card"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
