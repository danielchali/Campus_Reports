import { CONTACT_EMAIL_ROLES, isReportOwner } from "./studentReportAccess.js";

export function redactStudentReportForViewer(mappedReport, reportDoc, viewer) {
  const reportObj = reportDoc?.toObject ? reportDoc.toObject() : reportDoc;
  if (!reportObj?.anonymous || isReportOwner(viewer, reportObj)) {
    return mappedReport;
  }

  return {
    ...mappedReport,
    ownerId: undefined,
    ownerUsername: undefined,
    ownerName: undefined,
    ownerRole: undefined,
    reporterHidden: true,
  };
}

export function mapAnonymousReportForStaff(doc, viewerRole) {
  const obj = doc?.toObject ? doc.toObject() : doc;
  const safe = {
    id: String(obj._id),
    _id: String(obj._id),
    tracking_code: obj.tracking_code,
    trackingCode: obj.tracking_code,
    category: obj.category,
    title: obj.title,
    description: obj.description,
    location: obj.location,
    incident_date: obj.incident_date,
    incidentDate: obj.incident_date,
    status: obj.status,
    details: obj.details || {},
    ai_summary: obj.ai_summary || "",
    ai_priority: obj.ai_priority || "Medium",
    ai_priority_score: obj.ai_priority_score ?? 50,
    ai_keywords: obj.ai_keywords || [],
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
    submitted_at: obj.createdAt,
    hasContactEmail: Boolean(obj.contact_email),
  };

  if (CONTACT_EMAIL_ROLES.has(viewerRole) && obj.contact_email) {
    safe.contact_email = obj.contact_email;
  }

  return safe;
}

export function mapAnonymousReportsForStaff(docs, viewerRole) {
  return (docs || []).map((doc) => mapAnonymousReportForStaff(doc, viewerRole));
}
