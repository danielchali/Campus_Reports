import type { StudentReportCategory } from './studentReports';
import type { GuidedReportFields } from './guidedReportBridge';

export function applyGuidedFieldsToMakeReport(
  fields: GuidedReportFields,
  handlers: {
    lockedCategory: StudentReportCategory | null;
    setCategory: (value: StudentReportCategory) => void;
    setTitle: (value: string) => void;
    setDescription: (value: string) => void;
    setLocation: (value: string) => void;
    setIncidentDate: (value: string) => void;
    setAnonymous: (value: boolean) => void;
    setIssueType: (value: string) => void;
    setPriority: (value: string) => void;
    setRiskLevel: (value: string) => void;
    setPeopleInvolved: (value: string) => void;
    setWitnesses: (value: string) => void;
    setSecurityAction: (value: string) => void;
    setAffectedAsset: (value: string) => void;
    setAccessInstructions: (value: string) => void;
    setStudentInvolved: (value: boolean) => void;
  },
) {
  if (
    !handlers.lockedCategory &&
    (fields.category === 'disciplinary_case' || fields.category === 'maintenance_issue')
  ) {
    handlers.setCategory(fields.category);
  }

  if (fields.title) handlers.setTitle(fields.title);
  if (fields.description) handlers.setDescription(fields.description);
  if (fields.location) handlers.setLocation(fields.location);
  if (fields.incidentDate) handlers.setIncidentDate(fields.incidentDate);
  if (fields.anonymous !== undefined) handlers.setAnonymous(fields.anonymous === 'true');
  if (fields.issueType) handlers.setIssueType(fields.issueType);
  if (fields.priority) handlers.setPriority(fields.priority);
  if (fields.riskLevel) handlers.setRiskLevel(fields.riskLevel);
  if (fields.peopleInvolved) handlers.setPeopleInvolved(fields.peopleInvolved);
  if (fields.witnesses) handlers.setWitnesses(fields.witnesses);
  if (fields.securityAction) handlers.setSecurityAction(fields.securityAction);
  if (fields.affectedAsset) handlers.setAffectedAsset(fields.affectedAsset);
  if (fields.accessInstructions) handlers.setAccessInstructions(fields.accessInstructions);
  if (fields.studentInvolved !== undefined) {
    handlers.setStudentInvolved(fields.studentInvolved === 'true');
  }
}

export type AnonymousCategory = 'disciplinary_case' | 'maintenance_issue' | 'other';

export function applyGuidedFieldsToAnonymousReport(
  fields: GuidedReportFields,
  handlers: {
    setCategory: (value: AnonymousCategory) => void;
    setTitle: (value: string) => void;
    setDescription: (value: string) => void;
    setLocation: (value: string) => void;
    setIncidentDate: (value: string) => void;
    setContactEmail: (value: string) => void;
  },
) {
  if (
    fields.category === 'disciplinary_case' ||
    fields.category === 'maintenance_issue' ||
    fields.category === 'other'
  ) {
    handlers.setCategory(fields.category);
  }

  if (fields.title) handlers.setTitle(fields.title);
  if (fields.description) handlers.setDescription(fields.description);
  if (fields.location) handlers.setLocation(fields.location);
  if (fields.incidentDate) handlers.setIncidentDate(fields.incidentDate);
  if (fields.contactEmail) handlers.setContactEmail(fields.contactEmail);
}
