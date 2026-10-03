const INACTIVE_MAINTENANCE_STATUSES = new Set([
  "Resolved",
  "Completed",
  "Closed",
]);

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function matchesMaintenanceIssue(report, locationKey, issueTypeKey) {
  const details = report?.details || {};
  return (
    normalizeKey(report?.location) === locationKey &&
    normalizeKey(details.issueType) === issueTypeKey
  );
}

/**
 * Finds an unresolved maintenance issue for the same room/location and issue
 * type across signed-in and anonymous reports. The comparison is normalized so
 * casing and repeated spaces cannot create a duplicate.
 */
export async function findActiveMaintenanceReportDuplicate({
  StudentReportModel,
  AnonymousReportModel,
  location,
  issueType,
  excludeId = "",
}) {
  const locationKey = normalizeKey(location);
  const issueTypeKey = normalizeKey(issueType);

  if (!locationKey || !issueTypeKey) return null;

  const activeQuery = {
    category: "maintenance_issue",
    status: { $nin: [...INACTIVE_MAINTENANCE_STATUSES] },
  };
  const [studentReports, anonymousReports] = await Promise.all([
    StudentReportModel.find(activeQuery).select("_id location details status"),
    AnonymousReportModel.find(activeQuery).select("_id location details status"),
  ]);

  return [...studentReports, ...anonymousReports].find((report) => {
    if (excludeId && String(report._id) === String(excludeId)) return false;
    return matchesMaintenanceIssue(report, locationKey, issueTypeKey);
  }) || null;
}

export function getMaintenanceDuplicateMessage(location, issueType) {
  return `An active ${String(issueType).trim()} maintenance report already exists for ${String(location).trim()}. A new report can be submitted after the existing issue is completed or closed.`;
}
