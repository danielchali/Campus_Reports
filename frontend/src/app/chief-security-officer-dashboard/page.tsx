"use client";

import ManagementDashboard from '../../components/dashboard/ManagementDashboard';

export default function ChiefSecurityOfficerDashboard() {
  return (
    <ManagementDashboard
      role="chief_security_officer"
      focusLabel="Recent Campus Reports"
      focusEmpty="No recent incident or maintenance reports are available."
      metricKeys={['totalReports', 'openReports', 'pendingStatements', 'submittedStatements', 'totalStaff']}
      dataset="anonymousReports"
      quickActions={[
        { href: '/anonymous-report', label: 'Open Anonymous Reports' },
        { href: '/evidence', label: 'Review Evidence' },
        { href: '/inbox', label: 'Open Inbox' },
        { href: '/staff', label: 'Open Staff' },
      ]}
    />
  );
}
