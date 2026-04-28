"use client";

import ManagementDashboard from '../../components/dashboard/ManagementDashboard';

export default function AssistantDeanDashboard() {
  return (
    <ManagementDashboard
      role="assistant_dean"
      title="Assistant Dean Dashboard"
      subtitle="Keep incoming anonymous reports visible, monitor statement-request progress, and work within the current RBAC boundaries."
      focusLabel="Recent Campus Reports"
      focusEmpty="No recent incident or maintenance reports are available."
      metricKeys={['totalReports', 'openReports', 'pendingStatements', 'submittedStatements', 'totalStaff']}
      dataset="anonymousReports"
      quickActions={[
        { href: '/anonymous-report', label: 'Open Anonymous Reports' },
        { href: '/staff', label: 'Open Staff' },
        { href: '/reports', label: 'Open Reports' },
        { href: '/audit', label: 'Audit Logs' },
      ]}
    />
  );
}
