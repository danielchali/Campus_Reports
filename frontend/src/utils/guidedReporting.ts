import type { GuidedReportFields } from './guidedReportBridge';

export type GuidedReportMode = 'logged_in' | 'anonymous';

export type GuidedStepId =
  | 'welcome'
  | 'category'
  | 'narrative'
  | 'title'
  | 'location'
  | 'date'
  | 'maintenance_details'
  | 'disciplinary_details'
  | 'privacy'
  | 'review'
  | 'done';

export type GuidedReportDraft = {
  category: string;
  title: string;
  description: string;
  location: string;
  incidentDate: string;
  anonymous: boolean;
  contactEmail: string;
  issueType: string;
  priority: string;
  riskLevel: string;
  peopleInvolved: string;
  witnesses: string;
  securityAction: string;
  affectedAsset: string;
  accessInstructions: string;
  studentInvolved: boolean;
};

export type ReportingContext = {
  mode: GuidedReportMode;
  lockedCategory: string | null;
};

export function createEmptyDraft(lockedCategory: string | null): GuidedReportDraft {
  return {
    category: lockedCategory || '',
    title: '',
    description: '',
    location: '',
    incidentDate: new Date().toISOString().slice(0, 10),
    anonymous: false,
    contactEmail: '',
    issueType: 'Electrical',
    priority: 'Normal',
    riskLevel: 'Medium',
    peopleInvolved: '',
    witnesses: '',
    securityAction: '',
    affectedAsset: '',
    accessInstructions: '',
    studentInvolved: false,
  };
}

export function getReportingContext(pathname: string): ReportingContext | null {
  if (pathname === '/make-report') {
    const params = new URLSearchParams(
      typeof window !== 'undefined' ? window.location.search : '',
    );
    const category = params.get('category');
    const lockedCategory =
      category === 'maintenance_issue' || category === 'disciplinary_case'
        ? category
        : null;
    return { mode: 'logged_in', lockedCategory };
  }

  if (pathname === '/anonymous-report') {
    return { mode: 'anonymous', lockedCategory: null };
  }

  return null;
}

export function isReportingRoute(pathname: string) {
  return pathname === '/make-report' || pathname === '/anonymous-report';
}

export function buildStepSequence(
  ctx: ReportingContext,
  draft: GuidedReportDraft,
): GuidedStepId[] {
  const steps: GuidedStepId[] = ['welcome'];

  if (!ctx.lockedCategory) {
    steps.push('category');
  }

  steps.push('narrative', 'title', 'location', 'date');

  if (draft.category === 'maintenance_issue') {
    steps.push('maintenance_details');
  } else if (draft.category === 'disciplinary_case') {
    steps.push('disciplinary_details');
  }

  steps.push('privacy', 'review', 'done');
  return steps;
}

export function getStepPrompt(
  step: GuidedStepId,
  ctx: ReportingContext,
  draft: GuidedReportDraft,
): string {
  switch (step) {
    case 'welcome':
      return ctx.mode === 'anonymous'
        ? "I'm Campus Reports AI. I'll walk you through an anonymous report step by step — category, what happened, location, and date — then fill the form for you to review and submit."
        : "I'm Campus Reports AI. I'll guide you through this report step by step and fill the form as we go. Tap **Start guided report** or type anything to begin.";
    case 'category':
      return 'What type of report is this? Choose one:\n• **Disciplinary** — misconduct, harassment, theft, violence\n• **Maintenance** — broken equipment, leaks, hazards\n• **Other** — anything else (anonymous only)';
    case 'narrative':
      return 'In your own words, describe what happened. Include who or what was involved, when it happened, and why it needs attention. I will draft a clear title and description for you.';
    case 'title':
      return draft.title
        ? `Suggested title:\n**${draft.title}**\n\nReply **yes** to keep it, or type a different title.`
        : 'Give this report a short title (under 80 characters).';
    case 'location':
      return 'Where did this happen? (building, hostel, classroom, lab, walkway, etc.)';
    case 'date':
      return `When did it happen? Reply with a date (YYYY-MM-DD) or **today**. Default so far: ${draft.incidentDate || 'not set'}.`;
    case 'maintenance_details':
      return 'Maintenance details — reply with issue type and priority, or tap a quick option.\nExamples: **Electrical / High** or **Plumbing / Urgent safety risk**';
    case 'disciplinary_details':
      return 'How urgent is the safety risk? Choose **Low**, **Medium**, **High**, or **Immediate threat**. You can also add people involved or witnesses in one message.';
    case 'privacy':
      return ctx.mode === 'anonymous'
        ? 'Optional: provide an email for status updates (your identity stays anonymous), or reply **skip** to continue without one.'
        : 'Should this report be handled anonymously from your account? Reply **yes** or **no**.';
    case 'review':
      return buildReviewMessage(ctx, draft);
    case 'done':
      return 'The form is filled. Scroll to review everything, attach evidence if needed, then submit. I can still answer questions about the form.';
    default:
      return 'How can I help with your report?';
  }
}

function buildReviewMessage(ctx: ReportingContext, draft: GuidedReportDraft) {
  const lines = [
    '**Review your report**',
    `• Category: ${formatCategory(draft.category)}`,
    `• Title: ${draft.title || '(not set)'}`,
    `• Location: ${draft.location || '(not set)'}`,
    `• Date: ${draft.incidentDate || '(not set)'}`,
    `• Description: ${draft.description ? `${draft.description.slice(0, 120)}${draft.description.length > 120 ? '…' : ''}` : '(not set)'}`,
  ];

  if (draft.category === 'maintenance_issue') {
    lines.push(`• Issue type: ${draft.issueType}`, `• Priority: ${draft.priority}`);
  }

  if (draft.category === 'disciplinary_case') {
    lines.push(`• Risk level: ${draft.riskLevel}`);
  }

  if (ctx.mode === 'anonymous') {
    lines.push(`• Contact email: ${draft.contactEmail || 'none'}`);
  } else {
    lines.push(`• Anonymous mode: ${draft.anonymous ? 'yes' : 'no'}`);
  }

  lines.push('\nReply **apply** to fill the form, or tell me what to change.');
  return lines.join('\n');
}

export function getQuickReplies(
  step: GuidedStepId,
  ctx: ReportingContext,
): string[] {
  switch (step) {
    case 'welcome':
      return ['Start guided report'];
    case 'category':
      return ctx.mode === 'anonymous'
        ? ['Disciplinary', 'Maintenance', 'Other']
        : ['Disciplinary', 'Maintenance'];
    case 'title':
      return ['Yes, use suggested title'];
    case 'date':
      return ['Today'];
    case 'maintenance_details':
      return ['Electrical / High', 'Plumbing / Normal', 'Skip extras'];
    case 'disciplinary_details':
      return ['Low', 'Medium', 'High', 'Immediate threat'];
    case 'privacy':
      return ctx.mode === 'anonymous' ? ['Skip email'] : ['Yes, anonymous', 'No, use my account'];
    case 'review':
      return ['Apply to form'];
    default:
      return [];
  }
}

export function getStepLabel(step: GuidedStepId): string {
  const labels: Record<GuidedStepId, string> = {
    welcome: 'Welcome',
    category: 'Category',
    narrative: 'What happened',
    title: 'Title',
    location: 'Location',
    date: 'Date',
    maintenance_details: 'Maintenance details',
    disciplinary_details: 'Disciplinary details',
    privacy: 'Privacy',
    review: 'Review',
    done: 'Complete',
  };
  return labels[step];
}

export function parseCategoryInput(input: string, mode: GuidedReportMode): string | null {
  const normalized = input.trim().toLowerCase();
  if (normalized.includes('maint')) return 'maintenance_issue';
  if (normalized.includes('discipl') || normalized.includes('security') || normalized.includes('misconduct')) {
    return 'disciplinary_case';
  }
  if (mode === 'anonymous' && normalized.includes('other')) return 'other';
  return null;
}

export function parseBooleanInput(input: string): boolean | null {
  const normalized = input.trim().toLowerCase();
  if (['yes', 'y', 'true', 'anonymous', 'skip email'].some((token) => normalized === token || normalized.startsWith(`${token} `))) {
    if (normalized.includes('no')) return false;
    return normalized.includes('yes') || normalized.includes('anonymous') || normalized === 'y' || normalized === 'true';
  }
  if (['no', 'n', 'false', 'account'].some((token) => normalized === token || normalized.includes(token))) {
    return false;
  }
  return null;
}

export function parseDateInput(input: string): string | null {
  const normalized = input.trim().toLowerCase();
  if (normalized === 'today') {
    return new Date().toISOString().slice(0, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }
  return null;
}

export function parseMaintenanceDetails(input: string, draft: GuidedReportDraft): GuidedReportDraft {
  if (normalize(input).includes('skip')) return draft;

  const next = { ...draft };
  const lower = input.toLowerCase();
  const issueTypes = [
    'Electrical',
    'Plumbing',
    'Furniture or fittings',
    'Cleaning or sanitation',
    'IT or classroom equipment',
    'Building safety hazard',
    'Other',
  ];

  for (const issueType of issueTypes) {
    if (lower.includes(issueType.toLowerCase())) {
      next.issueType = issueType;
      break;
    }
  }

  if (lower.includes('urgent')) next.priority = 'Urgent safety risk';
  else if (lower.includes('high')) next.priority = 'High';
  else if (lower.includes('low')) next.priority = 'Low';
  else if (lower.includes('normal')) next.priority = 'Normal';

  return next;
}

export function parseDisciplinaryDetails(input: string, draft: GuidedReportDraft): GuidedReportDraft {
  const next = { ...draft };
  const lower = input.toLowerCase();

  if (lower.includes('immediate')) next.riskLevel = 'Immediate threat';
  else if (lower.includes('high')) next.riskLevel = 'High';
  else if (lower.includes('medium')) next.riskLevel = 'Medium';
  else if (lower.includes('low')) next.riskLevel = 'Low';

  const peopleMatch = input.match(/people[:\s]+(.+?)(?:;|$)/i);
  const witnessMatch = input.match(/witness[:\s]+(.+?)(?:;|$)/i);
  if (peopleMatch?.[1]) next.peopleInvolved = peopleMatch[1].trim();
  if (witnessMatch?.[1]) next.witnesses = witnessMatch[1].trim();

  return next;
}

export function draftToGuidedFields(draft: GuidedReportDraft): GuidedReportFields {
  const fields: GuidedReportFields = {
    category: draft.category,
    title: draft.title,
    description: draft.description,
    location: draft.location,
    incidentDate: draft.incidentDate,
    anonymous: draft.anonymous ? 'true' : 'false',
    contactEmail: draft.contactEmail,
    issueType: draft.issueType,
    priority: draft.priority,
    riskLevel: draft.riskLevel,
    peopleInvolved: draft.peopleInvolved,
    witnesses: draft.witnesses,
    securityAction: draft.securityAction,
    affectedAsset: draft.affectedAsset,
    accessInstructions: draft.accessInstructions,
    studentInvolved: draft.studentInvolved ? 'true' : 'false',
  };

  return Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined && value !== ''),
  ) as GuidedReportFields;
}

export function formatCategory(category: string) {
  if (category === 'maintenance_issue') return 'Maintenance Issue';
  if (category === 'disciplinary_case') return 'Disciplinary Case';
  if (category === 'other') return 'Other';
  return category || 'Not selected';
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function getGuidedReportingSystemPrompt(pathname: string, mode: GuidedReportMode) {
  return [
    'You are Campus Reports AI running a guided reporting assistant.',
    `Route: ${pathname}. Mode: ${mode}.`,
    'Your job is to help the user submit a campus incident or maintenance report accurately.',
    'Ask one step at a time. Keep replies short and practical.',
    'Never invent policy, people, or record IDs.',
    'When drafting from a user narrative, produce factual, neutral wording.',
    'For form fills on this page, include exactly once: <form_suggestion>[{"field":"fieldId","value":"value"}]</form_suggestion> using visible field ids like title, description, location, incidentDate, anon-title, anon-desc, anon-location, anon-date, anon-email.',
  ].join(' ');
}
