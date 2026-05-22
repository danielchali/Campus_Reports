import { API_BASE_URL } from "../config/constants";
import { authHeaders } from "./api";

export type WorkOrderStatus =
  | "Open"
  | "Assigned"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export type MaintenanceIssueSource = "student_report" | "anonymous_report";

export interface MaintenanceIssue {
  id: string;
  source: MaintenanceIssueSource;
  trackingCode: string;
  title: string;
  description: string;
  location: string;
  incidentDate?: string;
  submittedAt?: string;
  status: "Submitted" | "Under Review" | "In Progress" | "Resolved";
  issueType: string;
  priority: "Low" | "Normal" | "High" | "Urgent safety risk" | string;
  affectedAsset: string;
  accessInstructions: string;
  maintenanceWorkOrderId: string;
  routedToMaintenance: boolean;
  canCreateWorkOrder: boolean;
}

export interface WorkOrderUpdate {
  id: string;
  status: WorkOrderStatus;
  message: string;
  createdBy?: string;
  createdByRole?: string;
  createdAt: string;
}

export interface WorkOrderSignatures {
  partC: string;
  partD: string;
  partE: string;
}

export interface ManualWorkOrderInput {
  title: string;
  description: string;
  location: string;
  issueType?: string;
  priority?: WorkOrder["priority"];
  affectedAsset?: string;
  accessInstructions?: string;
  assignedTo?: string;
  requestedByName?: string;
  requestingDepartment?: string;
  message?: string;
}

export interface WorkOrder {
  id: string;
  workOrderId: string;
  sourceReportId: string;
  sourceTrackingCode: string;
  title: string;
  description: string;
  location: string;
  issueType: string;
  priority: "Low" | "Normal" | "High" | "Urgent safety risk";
  affectedAsset: string;
  accessInstructions: string;
  status: WorkOrderStatus;
  assignedTo: string;
  requestedByName: string;
  requestingDepartment: string;
  createdBy: string;
  createdByRole: string;
  createdAt: string;
  updatedAt: string;
  updates: WorkOrderUpdate[];
  signatures: WorkOrderSignatures;
}

export async function getWorkOrders(
  filters: { search?: string; status?: string; priority?: string } = {},
): Promise<WorkOrder[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);

  const query = params.toString();
  const res = await fetch(
    `${API_BASE_URL}/work-orders${query ? `?${query}` : ""}`,
    {
      headers: { ...authHeaders() },
    },
  );

  if (!res.ok) return [];
  return res.json();
}

export async function getMaintenanceIssues(
  filters: {
    search?: string;
    status?: string;
    source?: MaintenanceIssueSource;
  } = {},
): Promise<MaintenanceIssue[]> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status && filters.status !== "all")
    params.set("status", filters.status);
  if (filters.source) params.set("source", filters.source);

  const query = params.toString();
  const res = await fetch(
    `${API_BASE_URL}/work-orders/maintenance-issues${query ? `?${query}` : ""}`,
    {
      headers: { ...authHeaders() },
    },
  );

  if (!res.ok) return [];
  return res.json();
}

export async function createWorkOrder(
  reportId: string,
  message?: string,
): Promise<WorkOrder> {
  const res = await fetch(`${API_BASE_URL}/work-orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ reportId, message }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create work order");
  }

  return res.json();
}

export async function createManualWorkOrder(
  workOrderData: ManualWorkOrderInput,
): Promise<WorkOrder> {
  const res = await fetch(`${API_BASE_URL}/work-orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(workOrderData),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create work order");
  }

  return res.json();
}

export async function updateWorkOrderStatus(
  workOrderId: string,
  status: WorkOrderStatus,
  message: string,
  assignedTo?: string,
  signatures?: WorkOrderSignatures,
): Promise<WorkOrder | null> {
  const res = await fetch(`${API_BASE_URL}/work-orders/${workOrderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status, message, assignedTo, signatures }),
  });

  if (!res.ok) return null;
  return res.json();
}

export async function exportWorkOrderDocx(workOrderId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/work-orders/${workOrderId}/export-docx`, {
    headers: { ...authHeaders() },
  });

  if (!res.ok) {
    throw new Error("Failed to export work order");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "work_order.docx";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
