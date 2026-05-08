import { API_BASE_URL } from "../config/constants";
import { authHeaders } from "./api";

export type StudentReportCategory = "disciplinary_case" | "maintenance_issue";

export type StudentReportStatus =
  | "Submitted"
  | "Under Review"
  | "In Progress"
  | "Resolved";

export interface StudentReportUpdate {
  id: string;
  status: StudentReportStatus;
  message: string;
  createdAt: string;
}

export interface StudentReportAttachment {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

export interface StudentReportDetails {
  [key: string]: string;
}

export interface StudentReport {
  id: string;
  trackingCode: string;
  title: string;
  description: string;
  category: StudentReportCategory;
  anonymous: boolean;
  location: string;
  incidentDate: string;
  submittedAt: string;
  status: StudentReportStatus;
  ownerId: string;
  ownerUsername: string;
  ownerName: string;
  updates: StudentReportUpdate[];
  seenBy?: string[];
  details?: StudentReportDetails;
  attachments?: StudentReportAttachment[];
  maintenanceWorkOrderId?: string;
}

export interface StudentIdentity {
  id: string;
  username: string;
  name?: string;
}

export interface CreateStudentReportInput {
  title: string;
  description: string;
  category: StudentReportCategory;
  anonymous: boolean;
  location: string;
  incidentDate: string;
  details?: StudentReportDetails;
  attachments?: File[];
}

export interface StaffIdentity {
  id: string;
  username: string;
  name?: string;
}

export interface StudentReportMetrics {
  total: number;
  anonymous: number;
  open: number;
  resolved: number;
  recent: StudentReport[];
}

// ─── localStorage key for migration ────────────────────────
const STORAGE_KEY = "student_reports_v1";
const MIGRATION_DONE_KEY = "student_reports_migrated_v1";

function readLocalReports(): any[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── API helpers ───────────────────────────────────────────

/**
 * Migrate any localStorage reports to the backend (one-time).
 * Called on first load after the migration.
 */
export async function migrateLocalReports(
  identity: StudentIdentity,
): Promise<number> {
  if (typeof window === "undefined") return 0;

  // Check if already migrated
  if (window.localStorage.getItem(MIGRATION_DONE_KEY)) return 0;

  const localReports = readLocalReports();
  if (localReports.length === 0) {
    window.localStorage.setItem(MIGRATION_DONE_KEY, "1");
    return 0;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/student-reports/migrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify({ reports: localReports }),
    });

    if (res.ok) {
      const data = await res.json();
      window.localStorage.setItem(MIGRATION_DONE_KEY, "1");
      // Clear localStorage reports after successful migration
      window.localStorage.removeItem(STORAGE_KEY);
      return data.migrated || 0;
    }
  } catch (err) {
    console.error("Migration failed, will retry next time:", err);
  }

  return 0;
}

/**
 * Create a student report via the backend API.
 */
export async function createStudentReport(
  input: CreateStudentReportInput,
  _identity: StudentIdentity,
): Promise<StudentReport> {
  const formData = new FormData();
  formData.append("title", input.title);
  formData.append("description", input.description);
  formData.append("category", input.category);
  formData.append("anonymous", String(input.anonymous));
  formData.append("location", input.location);
  formData.append("incidentDate", input.incidentDate);
  formData.append("details", JSON.stringify(input.details || {}));
  (input.attachments || []).forEach((file) => {
    formData.append("attachments", file);
  });

  const res = await fetch(`${API_BASE_URL}/student-reports`, {
    method: "POST",
    headers: { ...authHeaders() },
    body: formData,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to create report");
  }

  return res.json();
}

/**
 * Get reports for the logged-in student from the backend.
 */
export async function getStudentReportsForUser(
  _identity: StudentIdentity,
  search?: string,
): Promise<StudentReport[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const res = await fetch(
    `${API_BASE_URL}/student-reports/mine?${params.toString()}`,
    {
      headers: { ...authHeaders() },
    },
  );

  if (!res.ok) {
    console.error("Failed to fetch student reports");
    return [];
  }

  return res.json();
}

/**
 * Get all student reports (staff view) from the backend.
 */
export async function getAllStudentReports(
  search?: string,
): Promise<StudentReport[]> {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  const res = await fetch(
    `${API_BASE_URL}/student-reports?${params.toString()}`,
    {
      headers: { ...authHeaders() },
    },
  );

  if (!res.ok) {
    console.error("Failed to fetch all student reports");
    return [];
  }

  return res.json();
}

/**
 * Mark a report as seen by the current user.
 */
export async function markStudentReportSeen(
  reportId: string,
  _viewerId: string,
): Promise<StudentReport | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/student-reports/${reportId}/seen`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      },
    );

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Mark all reports as seen by the current user.
 */
export async function markAllStudentReportsSeen(
  _viewerId: string,
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/student-reports/mark-all-seen`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
    });
  } catch (err) {
    console.error("Failed to mark all as seen:", err);
  }
}

/**
 * Get unread count for staff.
 */
export async function getUnreadStudentReportsCount(
  _viewerId: string,
): Promise<number> {
  try {
    const res = await fetch(`${API_BASE_URL}/student-reports/unread-count`, {
      headers: { ...authHeaders() },
    });

    if (!res.ok) return 0;
    const data = await res.json();
    return data.count || 0;
  } catch {
    return 0;
  }
}

/**
 * Update a report's status (staff action).
 */
export async function updateStudentReportStatus(
  reportId: string,
  status: StudentReportStatus,
  message: string,
  _staffIdentity: StaffIdentity,
): Promise<StudentReport | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/student-reports/${reportId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ status, message }),
      },
    );

    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

/**
 * Get metrics for the logged-in student.
 */
export async function getStudentReportMetrics(
  _identity: StudentIdentity,
): Promise<StudentReportMetrics> {
  try {
    const res = await fetch(`${API_BASE_URL}/student-reports/metrics`, {
      headers: { ...authHeaders() },
    });

    if (!res.ok) {
      return { total: 0, anonymous: 0, open: 0, resolved: 0, recent: [] };
    }

    const data = await res.json();
    return {
      total: data.total || 0,
      anonymous: data.anonymous || 0,
      open: data.open || 0,
      resolved: data.resolved || 0,
      recent: data.recent || [],
    };
  } catch {
    return { total: 0, anonymous: 0, open: 0, resolved: 0, recent: [] };
  }
}

export function getStudentReportAttachmentDownloadUrl(
  reportId: string,
  attachmentId: string,
): string {
  return `${API_BASE_URL}/student-reports/${reportId}/attachments/${attachmentId}/download`;
}

export async function downloadStudentReportAttachment(
  reportId: string,
  attachmentId: string,
  filename: string,
): Promise<void> {
  const res = await fetch(
    getStudentReportAttachmentDownloadUrl(reportId, attachmentId),
    {
      headers: { ...authHeaders() },
    },
  );

  if (!res.ok) {
    throw new Error("Failed to download attachment");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
