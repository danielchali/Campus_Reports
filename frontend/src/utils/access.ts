export type AppRole =
  | "admin"
  | "security_officer"
  | "chief_security_officer"
  | "dean_of_students"
  | "warden"
  | "secretary"
  | "registrar"
  | "maintenance"
  | "student"
  | "general_user"
  | string;

export const PAGE_ACCESS = {
  adminUsers: ["admin"],
  analytics: [
    "admin",
    "chief_security_officer",
    "dean_of_students",
    "warden",
    "secretary",
    "registrar",
    "security_officer",
    "maintenance",
  ],
  audit: [
    "admin",
    "chief_security_officer",
    "dean_of_students",
    "warden",
    "secretary",
    "registrar",
    "security_officer",
    "maintenance",
  ],
  inbox: [
    "admin",
    "chief_security_officer",
    "dean_of_students",
    "warden",
    "secretary",
    "registrar",
    "security_officer",
    "maintenance",
  ],
  maintenanceIssues: [
    "admin",
    "dean_of_students",
    "warden",
    "secretary",
    "registrar",
    "maintenance",
  ],
  workOrders: [
    "admin",
    "dean_of_students",
    "warden",
    "secretary",
    "registrar",
    "maintenance",
  ],
  evidence: ["admin", "security_officer"],
  students: ["admin", "security_officer"],
  staff: [
    "admin",
    "chief_security_officer",
    "dean_of_students",
    "warden",
    "secretary",
    "registrar",
    "maintenance",
  ],
  cases: ["admin", "security_officer", "dean_of_students", "warden"],
  caseCreate: ["admin", "security_officer", "dean_of_students", "warden"],
  makeReport: ["student", "general_user"],
  myReports: ["student", "general_user"],
  formSettings: ["admin"],
  systemSettings: ["admin"],
  studentDashboard: ["student"],
  generalDashboard: ["general_user"],
} as const;

export type PageAccessKey = keyof typeof PAGE_ACCESS;

export function canAccessPage(role: AppRole | undefined, key: PageAccessKey) {
  if (!role) return false;
  return (PAGE_ACCESS[key] as readonly string[]).includes(role);
}
