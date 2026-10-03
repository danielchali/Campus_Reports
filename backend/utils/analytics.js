const ISSUE_TAXONOMY = {
  lighting: ['light', 'lighting', 'bulb', 'lamp', 'electricity', 'electrical', 'power', 'socket', 'switch'],
  plumbing: ['water', 'pipe', 'plumbing', 'leak', 'toilet', 'tap', 'faucet', 'drain', 'sewer'],
  facilities: ['door', 'window', 'ceiling', 'floor', 'wall', 'furniture', 'desk', 'chair', 'building'],
  internet: ['internet', 'wifi', 'wi-fi', 'network', 'router', 'connection', 'online'],
  cleaning: ['clean', 'cleaning', 'dirt', 'waste', 'trash', 'rubbish', 'bin', 'sanitation'],
  security: ['security', 'gate', 'fence', 'camera', 'alarm', 'theft', 'unsafe'],
  hvac: ['air conditioning', 'aircon', 'ac ', 'ventilation', 'fan', 'cooling', 'heating'],
  other: [],
};

const DISCIPLINARY_TAXONOMY = {
  violence: ['fight', 'fighting', 'assault', 'attack', 'violence', 'threat'],
  harassment: ['harass', 'bully', 'bullying', 'intimidat', 'abuse'],
  theft: ['theft', 'stolen', 'steal', 'robbery', 'missing property'],
  academic_integrity: ['cheat', 'cheating', 'plagiarism', 'malpractice', 'exam', 'academic dishonesty'],
  substance_abuse: ['alcohol', 'drug', 'substance', 'drunk', 'smoking'],
  property_damage: ['damage', 'vandal', 'vandalism', 'broken property'],
  disruptive_behavior: ['disruptive', 'noise', 'disturbance', 'disruption'],
  other: [],
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function classifyText(text, taxonomy) {
  const normalized = normalize(text);
  const scores = Object.entries(taxonomy).map(([label, keywords]) => ({
    label,
    score: keywords.reduce((score, keyword) => score + (normalized.includes(keyword) ? 1 : 0), 0),
  }));
  scores.sort((a, b) => b.score - a.score);
  return scores[0]?.score ? scores[0].label : 'other';
}

export function classifyMaintenanceIssue(report) {
  const details = report?.details && typeof report.details === 'object' ? report.details : {};
  const aiKeywords = Array.isArray(report?.ai_keywords) ? report.ai_keywords.join(' ') : '';
  const text = [report?.title, report?.description, details.issueType, details.affectedAsset, aiKeywords].filter(Boolean).join(' ');
  return classifyText(text, ISSUE_TAXONOMY);
}

export function classifyDisciplinaryIssue(report) {
  const details = report?.details && typeof report.details === 'object' ? report.details : {};
  const aiKeywords = Array.isArray(report?.ai_keywords) ? report.ai_keywords.join(' ') : '';
  const text = [report?.title, report?.description, details.offenseType, report?.offense_type, aiKeywords].filter(Boolean).join(' ');
  return classifyText(text, DISCIPLINARY_TAXONOMY);
}

function countBy(items, classifier) {
  const counts = new Map();
  for (const item of items) {
    const label = classifier(item);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function countValues(items, getter) {
  const counts = new Map();
  for (const item of items) {
    const value = getter(item);
    if (!value) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function buildAnalyticsSummary({ studentReports = [], anonymousReports = [], cases = [], users = [], generatedAt = new Date() }) {
  const reports = [...studentReports, ...anonymousReports];
  const maintenanceReports = reports.filter((report) => report.category === 'maintenance_issue');
  const disciplinaryReports = reports.filter((report) => report.category === 'disciplinary_case');
  const combinedDisciplinary = [...disciplinaryReports, ...cases];
  const statusCounts = countValues(reports, (item) => item.status || 'Submitted');
  const roleCounts = countValues(users, (item) => item.role || 'unknown');
  const createdDates = reports.map((item) => new Date(item.createdAt || item.created_at || 0)).filter((date) => !Number.isNaN(date.getTime()));
  const last30Days = createdDates.filter((date) => date >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)).length;

  return {
    generatedAt,
    reportTypes: [
      { label: 'Disciplinary / Security', count: disciplinaryReports.length },
      { label: 'Maintenance', count: maintenanceReports.length },
    ].sort((a, b) => b.count - a.count),
    maintenanceIssues: countBy(maintenanceReports, classifyMaintenanceIssue),
    disciplinaryIssues: countBy(combinedDisciplinary, classifyDisciplinaryIssue),
    caseOffenses: countValues(cases, (item) => item.offense_type || 'Other'),
    statusCounts,
    totals: {
      reports: reports.length,
      studentReports: studentReports.length,
      anonymousReports: anonymousReports.length,
      maintenanceReports: maintenanceReports.length,
      disciplinaryReports: disciplinaryReports.length,
      cases: cases.length,
      reportsLast30Days: last30Days,
    },
    system: users.length
      ? {
          totalUsers: users.length,
          usersByRole: roleCounts,
          activeReportStatuses: statusCounts,
        }
      : null,
  };
}

export function buildWorkOrderSummary({ workOrders = [], generatedAt = new Date() } = {}) {
  const validCreatedDates = workOrders
    .map((item) => new Date(item.createdAt || 0))
    .filter((date) => !Number.isNaN(date.getTime()));
  const recentThreshold = new Date(generatedAt);
  recentThreshold.setDate(recentThreshold.getDate() - 30);
  const statusCounts = countValues(workOrders, (item) => item.status || 'Open');
  const priorityCounts = countValues(workOrders, (item) => item.priority || 'Normal');
  const issueTypes = countValues(workOrders, (item) => item.issue_type || item.issueType || 'Other');
  const active = workOrders.filter((item) => !['Completed', 'Cancelled'].includes(item.status)).length;

  return {
    total: workOrders.length,
    receivedLast30Days: validCreatedDates.filter((date) => date >= recentThreshold).length,
    active,
    open: workOrders.filter((item) => item.status === 'Open').length,
    inProgress: workOrders.filter((item) => item.status === 'In Progress').length,
    completed: workOrders.filter((item) => item.status === 'Completed').length,
    urgent: workOrders.filter((item) => item.priority === 'Urgent safety risk').length,
    statusCounts,
    priorityCounts,
    issueTypes,
    latestReceivedAt: validCreatedDates.length
      ? new Date(Math.max(...validCreatedDates.map((date) => date.getTime()))).toISOString()
      : null,
  };
}

export const ANALYTICS_TAXONOMY = {
  maintenance: Object.keys(ISSUE_TAXONOMY),
  disciplinary: Object.keys(DISCIPLINARY_TAXONOMY),
};
