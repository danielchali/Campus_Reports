"use client";

import ManagementDashboard from '../../components/dashboard/ManagementDashboard';

export default function MaintenanceDashboard() {
  return (
    <ManagementDashboard
      role="maintenance"
      title="Maintenance Dashboard"
      subtitle="Track maintenance-facing reports, follow statement progress, and coordinate with staff teams while staying within role permissions."
      focusLabel="Recent Anonymous Reports"
      focusEmpty="No maintenance-facing reports match the current dashboard search."
      metricKeys={['totalReports', 'openReports', 'pendingStatements', 'submittedStatements', 'totalStaff']}
      dataset="anonymousReports"
      quickActions={[
        { href: '/anonymous-report', label: 'Open Anonymous Reports' },
        { href: '/staff', label: 'Open Staff Directory' },
        { href: '/reports', label: 'Open Reports' },
        { href: '/help', label: 'Help & Guidance' },
      ]}
    />
  );
}
