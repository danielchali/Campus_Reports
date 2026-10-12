import type { GuidedReportFields } from './guidedReportBridge';
import { getTodayDateInputValue } from './dateTimeDefaults';

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

const MAINTENANCE_TERMS = [
  'broken',
  'not working',
  'faulty',
  'repair',
  'leak',
  'leaking',
  'plumbing',
  'electrical',
  'light',
  'stove',
  'toilet',
  'sink',
  'door',
  'window',
  'hazard',
  'maintenance',
];

const DISCIPLINARY_TERMS = [
  'disciplinary',
  'misconduct',
  'harassment',
  'bullying',
  'theft',
  'stolen',
  'fight',
  'violence',
  'threat',
  'assault',
  'security',
];

export function inferCategoryFromText(input: string, mode: GuidedReportMode): string | null {
  const normalized = normalize(input);
  if (!normalized) return null;

  const explicit = parseCategoryInput(input, mode);
  if (explicit) return explicit;

  if (MAINTENANCE_TERMS.some((term) => normalized.includes(term))) {
    return 'maintenance_issue';
  }

  if (DISCIPLINARY_TERMS.some((term) => normalized.includes(term))) {
    return 'disciplinary_case';
  }

  return null;
}

function toTitleCase(value: string) {
  return value
    .toLowerCase()
    .replace(/\b([a-z])/g, (match) => match.toUpperCase())
    .replace(/\b([a-z]+\d+[a-z]?)\b/gi, (match) => match.toUpperCase());
}

function cleanLocation(value: string) {
  return value
    .trim()
    .replace(/^[,\s-]+|[,\s.]+$/g, '')
    .slice(0, 200);
}

export function extractLocationFromText(input: string): string {
  const patterns = [
    /\b([a-z]{1,4}\d{2,4}[a-z]?)\b/i,
    /\b(?:in|at|inside|near|by|room|classroom|lab|hostel|building|block)\s+([a-z0-9][a-z0-9._/-]{1,30})\b/i,
  ];

  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match?.[1]) {
      const location = cleanLocation(match[1]);
      if (location) return location;
    }
  }

  return '';
}

export function buildLocalExtraction(input: string, mode: GuidedReportMode, preferredCategory = '') {
  const trimmed = input.trim();
  const category = inferCategoryFromText(trimmed, mode) || preferredCategory;
  const location = extractLocationFromText(trimmed);
  const title = toTitleCase(trimmed.replace(/\s+/g, ' ')).slice(0, 80);

  return {
    title,
    description: trimmed,
    category,
    location,
  };
}

export function createEmptyDraft(lockedCategory: string | null): GuidedReportDraft {
  return {
    category: lockedCategory || '',
    title: '',
    description: '',
    location: '',
    incidentDate: getTodayDateInputValue(),
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
    return getTodayDateInputValue();
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

export function getCampusReportsAssistantSystemPrompt(
  pathname: string,
  role?: string,
  extraContext?: string,
) {
  const normalizedRole = (role || 'unknown').toLowerCase();
  const pageNames: Array<[string, string]> = [
    ['/admin/system-settings', 'System Settings'],
    ['/admin/users', 'Manage Users'],
    ['/chief-security-officer-dashboard', 'Dashboard'],
    ['/dean-of-students-dashboard', 'Dashboard'],
    ['/maintenance-dashboard', 'Dashboard'],
    ['/security-dashboard', 'Dashboard'],
    ['/student-dashboard', 'Dashboard'],
    ['/registrar-dashboard', 'Dashboard'],
    ['/general-dashboard', 'Dashboard'],
    ['/warden-dashboard', 'Dashboard'],
    ['/maintenance-request', 'Maintenance Request'],
    ['/file-security-disciplinary-issue', 'Security/Disciplinary Issue'],
    ['/anonymous-report', 'Anonymous Report'],
    ['/make-report', 'Make a Report'],
    ['/my-reports', 'My Reports'],
    ['/maintenance-issues', 'Maintenance Issues'],
    ['/work-orders', 'Work Orders'],
    ['/cases/new', 'New Case'],
    ['/cases', 'Discipline Cases'],
    ['/evidence', 'Evidence'],
    ['/students', 'Students'],
    ['/staff', 'Staff'],
    ['/inbox', 'Inbox'],
    ['/analytics', 'Analytics'],
    ['/audit', 'Audit/Logs'],
    ['/profile', 'Profile & Settings'],
    ['/help', 'Help'],
    ['/sus-uat', 'UAT Survey'],
    ['/admin', 'Dashboard'],
  ];
  const profileLabel = normalizedRole === 'student' ? 'My Profile' : 'Profile & Settings';
  const currentPage = pathname === '/profile'
    ? profileLabel
    : pageNames.find(([path]) => pathname === path || pathname.startsWith(`${path}/`))?.[1] || 'the current page';

  const roleMap: Record<string, string> = {
    admin: 'Admin: Dashboard, Manage Users, System Settings, Discipline Cases, Inbox, Maintenance Issues, Analytics, Audit/Logs, Profile & Settings, Help',
    security_officer: 'Security Officer: Dashboard, Discipline Cases, Evidence, Students, New Case, Analytics, Audit/Logs, Profile & Settings, Help',
    chief_security_officer: 'Chief Security Officer: Dashboard, Inbox, Analytics, Audit/Logs, Profile & Settings, Help',
    dean_of_students: 'Dean of Students: Dashboard, Discipline Cases, New Case, Evidence, Students, Inbox, Maintenance Issues, Work Orders, Analytics, Audit/Logs, Profile & Settings, Help',
    warden: 'Warden: Dashboard, Inbox, Maintenance Issues, Work Orders, Analytics, Audit/Logs, Profile & Settings, Help',
    registrar: 'Registrar: Dashboard, Inbox, Maintenance Issues, Work Orders, Analytics, Audit/Logs, Profile & Settings, Help',
    secretary: 'Secretary: Dashboard, Inbox, Maintenance Issues, Work Orders, Analytics, Audit/Logs, Profile & Settings, Help',
    maintenance: 'Maintenance: Dashboard, Inbox, Maintenance Issues, Work Orders, Staff, Analytics, Audit/Logs, Profile & Settings, Help',
    student: `Student: Dashboard, My Reports, Maintenance Request, Security/Disciplinary Issue, ${profileLabel}, Help, UAT Survey`,
    general_user: 'General User: Dashboard, My Reports, Maintenance Request, Security/Disciplinary Issue, Help',
  };

  const modeBlocks = {
    student: [
      `Student guidance mode: help students navigate Dashboard, My Reports, Maintenance Request, Security/Disciplinary Issue, ${profileLabel}, and UAT Survey.`,
      'Explain the difference between Maintenance Request and Security/Disciplinary Issue, and guide the student toward the right form or dashboard.',
      'When the student is reporting a facility issue, point them to Maintenance Request. When they are describing misconduct, harassment, theft, threats, or safety concerns, guide them to Security/Disciplinary Issue.',
      'Keep explanations practical and simple. If they ask for status, explain how to review their reports in My Reports.',
    ],
    admin: [
      'Admin operations mode: focus on system management, user administration, role oversight, cases, work orders, analytics, dashboard summaries, and audit review.',
      'Use the available pages Dashboard, Manage Users, System Settings, Discipline Cases, Inbox, Maintenance Issues, Work Orders, Analytics, Audit/Logs, Profile & Settings, and Help.',
      'Do not suggest actions outside the admin workflow unless the user explicitly has that access and the current page shows it.',
    ],
    security: [
      'Security and disciplinary workflow mode: focus on incident intake, evidence review, case progression, student lookups, safety escalation, and investigation readiness.',
      'Use Dashboard, Discipline Cases, New Case, Evidence, Students, Analytics, and Audit/Logs appropriately depending on the role.',
      'Encourage fact-based summaries, evidence review, and escalation when the report involves threats, violence, harassment, theft, or risk to campus safety.',
    ],
    dean: [
      'Dean of Students mode: prioritize student welfare, disciplinary decisions, case review, evidence quality, and intervention guidance through Dashboard, Discipline Cases, New Case, Evidence, Students, Inbox, Maintenance Issues, Work Orders, Analytics, Audit/Logs, Profile & Settings, and Help.',
      'Support fair, evidence-based student case handling and ensure sanctions, follow-ups, and interventions are framed as student support and procedural review.',
    ],
    warden: [
      'Warden mode: prioritize resident oversight, incident follow-up, maintenance issues, and campus safety visibility through Dashboard, Inbox, Maintenance Issues, Work Orders, Analytics, Audit/Logs, Profile & Settings, and Help.',
      'Focus on monitoring residential or housing-related concerns, escalation paths, maintenance backlog, and communication with student welfare and security teams.',
      'If the user is asking about a disciplinary issue, direct them to the relevant case or evidence workflow but keep the guidance grounded in the current role permissions.',
    ],
    registrar: [
      'Registrar/Secretary mode: prioritize administrative documentation, record quality, inbox workflow, maintenance coordination, analytics reporting, and audit visibility through Dashboard, Inbox, Maintenance Issues, Work Orders, Analytics, Audit/Logs, Profile & Settings, and Help.',
      'Guide users toward clean data entry, processing support, and report preparation rather than disciplinary judgment or direct enforcement decisions.',
    ],
    maintenance: [
      'Maintenance mode: focus on maintenance issue triage, work-order assignment, facility repair tracking, staff coordination, and backlog visibility through Dashboard, Inbox, Maintenance Issues, Work Orders, Staff, Analytics, Audit/Logs, Profile & Settings, and Help.',
      'Encourage clear issue descriptions, asset details, urgency, and follow-up actions for facilities and infrastructure work.',
    ],
    chief_security: [
      'Chief Security Officer mode: focus on high-level security oversight, incident trends, evidence quality, safety escalation, analytics-based summary review, and audit visibility through Dashboard, Inbox, Analytics, Audit/Logs, Profile & Settings, and Help.',
      'Keep guidance at the leadership and oversight level: prioritize risk, patterns, escalation decisions, and evidence quality rather than routine case administration.',
    ],
    navigation: [
      'General navigation mode: explain which page to open for the user role and what each page is used for.',
      'If the user is a student or general user, prefer Dashboard and then My Reports, Maintenance Request, Security/Disciplinary Issue, My Profile or Help.',
      'If they are staff, security, dean, warden, registrar, secretary, maintenance, or chief security, guide them to Dashboard and then to Discipline Cases, Evidence, Maintenance Issues, Analytics, or Audit/Logs as appropriate.',
      'Always ground the answer in the available page names and permissions used by this app.',
    ],
  };

  const normalizedRoleForMode = normalizedRole === 'dean_of_students'
    ? 'dean'
    : normalizedRole === 'warden'
      ? 'warden'
      : normalizedRole === 'registrar' || normalizedRole === 'secretary'
        ? 'registrar'
        : normalizedRole === 'maintenance'
          ? 'maintenance'
          : normalizedRole === 'chief_security_officer'
            ? 'chief_security'
            : normalizedRole.includes('security') || normalizedRole.includes('dean')
              ? 'security'
              : normalizedRole === 'admin'
                ? 'admin'
                : normalizedRole === 'student' || normalizedRole === 'general_user'
                  ? 'student'
                  : 'navigation';

  const currentRoleMap = roleMap[normalizedRole] ||
    'Unknown or unauthenticated role: keep guidance generic and route-specific, and ask the user to confirm their page if they want precise navigation.';

  const modeGuidance = modeBlocks[normalizedRoleForMode as keyof typeof modeBlocks];

  return [
    'You are Campus Reports AI, the built-in assistant for the Campus Reports system.',
    'This product is a campus incident, disciplinary, maintenance, and operations workflow system for universities. It was created by Chali Daniel and Namonje Grace.',
    'Its purpose is to manage student records, security and disciplinary cases, anonymous reporting, statement requests, evidence, maintenance work orders, audit history, exports, and role-based dashboards.',
    'The app is implemented as a Next.js frontend with an Express/MongoDB backend and supports offline-capable PWA behavior.',
    'Primary app pages include Dashboard, Manage Users, System Settings, Discipline Cases, New Case, Evidence, Students, Staff, Maintenance Issues, Work Orders, My Reports, Maintenance Request, Security/Disciplinary Issue, Inbox, Analytics, Profile & Settings, My Profile, Help, Audit/Logs, and UAT Survey.',
    `User role: ${role || 'unknown'}. ${currentRoleMap}`,
    `Current page: ${currentPage}.`,
    ...(modeGuidance || []),
    extraContext ? `Extra context: ${extraContext}` : '',
    'Always guide the user based on the actual app structure in this codebase. Do not invent pages, URLs, dashboards, or actions that are not present here.',
    'When answering navigation questions, use the exact visible navbar or button label, including capitalization and slash marks. For secretary/registrar, call the destination Dashboard.',
    'Never show internal route paths such as /profile, /cases, or /student-dashboard to non-technical users.',
    'Respect least-privilege access. Do not suggest privileged admin or backend actions unless the current role is clearly allowed to do them.',
    'Never invent policies, records, students, staff members, evidence, or official rules. If you are unsure, ask the user what role and page they are on before giving route- or role-specific guidance.',
    'Keep responses short, practical, and clear. Use headings and bullet points when helpful.',
    'When filling in form fields, use visible field names and include exactly once: <form_suggestion>[{"field":"fieldName","value":"value"}]</form_suggestion> using only visible fields on this page.',
    'Do not invent hidden fields or system-only values.',
  ]
    .filter(Boolean)
    .join(' ');
}

export function getGuidedReportingSystemPrompt(
  pathname: string,
  mode: GuidedReportMode,
  role?: string,
) {
  return [
    'You are Campus Reports AI running a guided reporting assistant for the Campus Reports system.',
    'This app is the campus reporting workflow created by Chali Daniel and Namonje Grace, with student, maintenance, and disciplinary reporting flows.',
    `Current page: ${pathname === '/anonymous-report' ? 'Anonymous Report' : pathname === '/make-report' ? 'Make a Report' : 'the current reporting page'}. Mode: ${mode}. Role: ${role || 'unknown'}.`,
    'Your job is to help the user submit a campus incident or maintenance report accurately and safely.',
    'Ask one step at a time. Keep replies short and practical.',
    'Never invent policy, people, records, record IDs, or staff actions. Only use the current page and visible form fields.',
    'When drafting from a user narrative, produce factual, neutral wording. For form fills on this page, include exactly once: <form_suggestion>[{"field":"fieldId","value":"value"}]</form_suggestion> using visible field ids like title, description, location, incidentDate, anon-title, anon-desc, anon-location, anon-date, anon-email.',
    'When suggesting navigation, use exact visible labels such as Dashboard, My Reports, Maintenance Request, Security/Disciplinary Issue, Discipline Cases, Maintenance Issues, Make a Report, Anonymous Report, UAT Survey, and Help. Never show internal route paths to users.',
    'Do not invent pages or actions not present in this codebase.',
  ].join(' ');
}
