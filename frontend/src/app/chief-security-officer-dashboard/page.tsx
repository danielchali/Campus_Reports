"use client";

import ManagementDashboard from '../../components/dashboard/ManagementDashboard';

export default function ChiefSecurityOfficerDashboard() {
  return (
    <ManagementDashboard
      role="chief_security_officer"
      title="Chief Security Officer Dashboard"
      subtitle="Track anonymous report volume, statement-request progress, and staff-facing operations from the endpoints this role is allowed to use."
      focusLabel="Recent Campus Reports"
      focusEmpty="No recent incident or maintenance reports are available."
      metricKeys={['totalReports', 'openReports', 'pendingStatements', 'submittedStatements', 'totalStaff']}
      dataset="anonymousReports"
      quickActions={[
        { href: '/anonymous-report', label: 'Open Anonymous Reports' },
        { href: '/evidence', label: 'Review Evidence' },
        { href: '/reports', label: 'Open Reports' },
        { href: '/staff', label: 'Open Staff' },
      ]}
    />
  );
}
