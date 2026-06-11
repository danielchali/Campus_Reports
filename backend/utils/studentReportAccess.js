export function isReportOwner(user, report) {
  const userId = String(user?.id || user?._id || "");
  const reportObj = report?.toObject ? report.toObject() : report;
  return (
    reportObj.owner_id === userId ||
    reportObj.owner_username === user?.username
  );
}

export function canViewReport(user, report) {
  const reportObj = report?.toObject ? report.toObject() : report;
  if (isReportOwner(user, reportObj)) return true;

  const role = user?.role;
  if (
    [
      "admin",
      "chief_security_officer",
      "assistant_dean",
      "security_officer",
    ].includes(role)
  ) {
    return true;
  }
  if (role === "dean_of_students") {
    return reportObj.owner_role === "student" || !!reportObj.student_involved;
  }
  if (["secretary", "registrar"].includes(role)) {
    return (
      reportObj.owner_role === "general_user" &&
      (reportObj.category === "maintenance_issue" || !reportObj.student_involved)
    );
  }
  if (role === "maintenance") {
    return (
      reportObj.category === "maintenance_issue" && !!reportObj.routed_to_maintenance
    );
  }
  return false;
}

export function getStaffReportScope(user) {
  const role = user?.role;
  if (role === "dean_of_students") {
    return { $or: [{ owner_role: "student" }, { student_involved: true }] };
  }
  if (["secretary", "registrar"].includes(role)) {
    return {
      $or: [
        { owner_role: "general_user", category: "maintenance_issue" },
        {
          owner_role: "general_user",
          category: "disciplinary_case",
          student_involved: false,
        },
      ],
    };
  }
  if (role === "maintenance") {
    return { category: "maintenance_issue", routed_to_maintenance: true };
  }
  return null;
}

export const CONTACT_EMAIL_ROLES = new Set([
  "admin",
  "chief_security_officer",
  "dean_of_students",
  "assistant_dean",
]);
