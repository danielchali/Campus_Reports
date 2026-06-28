"use client";

import ManagementDashboard from '../../components/dashboard/ManagementDashboard';

export default function AssistantDeanDashboard() {
  return (
    <ManagementDashboard
      role="assistant_dean"
      focusLabel="Recent Campus Reports"
      focusEmpty="No recent incident or maintenance reports are available."
      metricKeys={['totalReports', 'openReports', 'pendingStatements', 'submittedStatements', 'totalStaff']}
      dataset="anonymousReports"
      quickActions={[
        { href: '/anonymous-report', label: 'Open Anonymous Reports' },
        { href: '/staff', label: 'Open Staff' },
        { href: '/inbox', label: 'Open Inbox' },
        { href: '/audit', label: 'Audit Logs' },
      ]}
    />
  );
}
