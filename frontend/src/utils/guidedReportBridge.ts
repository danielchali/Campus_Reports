export type GuidedReportFields = {
  category?: string;
  title?: string;
  description?: string;
  location?: string;
  incidentDate?: string;
  anonymous?: string;
  contactEmail?: string;
  issueType?: string;
  priority?: string;
  riskLevel?: string;
  peopleInvolved?: string;
  witnesses?: string;
  securityAction?: string;
  affectedAsset?: string;
  accessInstructions?: string;
  studentInvolved?: string;
};

export const GUIDED_APPLY_EVENT = 'campus-reports:guided-apply';

export function dispatchGuidedApply(fields: GuidedReportFields) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(GUIDED_APPLY_EVENT, {
      detail: fields,
    }),
  );
}

export function subscribeGuidedApply(handler: (fields: GuidedReportFields) => void) {
  if (typeof window === 'undefined') return () => undefined;

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent<GuidedReportFields>;
    handler(customEvent.detail || {});
  };

  window.addEventListener(GUIDED_APPLY_EVENT, listener);
  return () => window.removeEventListener(GUIDED_APPLY_EVENT, listener);
}

export function scrollToReportingForm() {
  if (typeof window === 'undefined') return;
  const form = document.querySelector('form');
  form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
