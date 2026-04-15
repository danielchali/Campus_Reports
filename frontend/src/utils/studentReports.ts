export type StudentReportCategory = 'disciplinary_case' | 'maintenance_issue';

export type StudentReportStatus =
  | 'Submitted'
  | 'Under Review'
  | 'In Progress'
  | 'Resolved';

export interface StudentReportUpdate {
  id: string;
  status: StudentReportStatus;
  message: string;
  createdAt: string;
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
}

export interface StaffIdentity {
  id: string;
  username: string;
  name?: string;
}

const STORAGE_KEY = 'student_reports_v1';

function readReports(): StudentReport[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeReports(reports: StudentReport[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

function generateId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
}

function generateTrackingCode() {
  return `KMU-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Date.now()
    .toString()
    .slice(-4)}`;
}

export function getStudentReportsForUser(identity: StudentIdentity): StudentReport[] {
  return readReports()
    .filter(
      (report) =>
        report.ownerId === identity.id || report.ownerUsername === identity.username,
    )
    .sort(
      (a, b) =>
        new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
    );
}

export function createStudentReport(
  input: CreateStudentReportInput,
  identity: StudentIdentity,
): StudentReport {
  const report: StudentReport = {
    id: generateId('report'),
    trackingCode: generateTrackingCode(),
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    anonymous: input.anonymous,
    location: input.location.trim(),
    incidentDate: input.incidentDate,
    submittedAt: new Date().toISOString(),
    status: 'Submitted',
    ownerId: identity.id,
    ownerUsername: identity.username,
    ownerName: identity.name || identity.username,
    seenBy: [],
    updates: [
      {
        id: generateId('update'),
        status: 'Submitted',
        message:
          'Your report has been received and is waiting for review by the appropriate office.',
        createdAt: new Date().toISOString(),
      },
    ],
  };

  const reports = readReports();
  writeReports([report, ...reports]);
  return report;
}

export function getAllStudentReports(): StudentReport[] {
  return readReports().sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  );
}

export function markStudentReportSeen(reportId: string, viewerId: string) {
  const reports = readReports();
  const updatedReports = reports.map((report) => {
    if (report.id !== reportId) {
      return report;
    }

    const seenBy = new Set(report.seenBy || []);
    seenBy.add(viewerId);

    return {
      ...report,
      seenBy: Array.from(seenBy),
    };
  });

  writeReports(updatedReports);
  return updatedReports.find((report) => report.id === reportId) || null;
}

export function markAllStudentReportsSeen(viewerId: string) {
  const reports = readReports().map((report) => {
    const seenBy = new Set(report.seenBy || []);
    seenBy.add(viewerId);

    return {
      ...report,
      seenBy: Array.from(seenBy),
    };
  });

  writeReports(reports);
  return reports;
}

export function getUnreadStudentReportsCount(viewerId: string) {
  return getAllStudentReports().filter(
    (report) => !(report.seenBy || []).includes(viewerId),
  ).length;
}

export function updateStudentReportStatus(
  reportId: string,
  status: StudentReportStatus,
  message: string,
  staffIdentity: StaffIdentity,
) {
  const reports = readReports();
  const updatedReports = reports.map((report) => {
    if (report.id !== reportId) {
      return report;
    }

    const seenBy = new Set(report.seenBy || []);
    seenBy.add(staffIdentity.id);

    return {
      ...report,
      status,
      seenBy: Array.from(seenBy),
      updates: [
        {
          id: generateId('update'),
          status,
          message: message.trim(),
          createdAt: new Date().toISOString(),
        },
        ...report.updates,
      ],
    };
  });

  writeReports(updatedReports);
  return updatedReports.find((report) => report.id === reportId) || null;
}

export function getStudentReportMetrics(identity: StudentIdentity) {
  const reports = getStudentReportsForUser(identity);

  return {
    total: reports.length,
    anonymous: reports.filter((report) => report.anonymous).length,
    open: reports.filter((report) => report.status !== 'Resolved').length,
    resolved: reports.filter((report) => report.status === 'Resolved').length,
    recent: reports.slice(0, 5),
  };
}
