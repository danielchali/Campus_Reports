"use client";

import ManagementDashboard from '../../components/dashboard/ManagementDashboard';

export default function WardenDashboard() {
  return (
    <ManagementDashboard
      role="warden"
      focusLabel="Recent Campus Reports"
      focusEmpty="No recent incident or maintenance reports are available."
      metricKeys={['totalReports', 'openReports', 'pendingStatements', 'submittedStatements', 'totalStaff']}
      dataset="anonymousReports"
      quickActions={[
        { href: '/inbox', label: 'Open Inbox' },
        { href: '/work-orders', label: 'Open Work Orders' },
        { href: '/analytics', label: 'Open Analytics' },
        { href: '/cases/new', label: 'Create a Case' },
      ]}
    />
  );
}
