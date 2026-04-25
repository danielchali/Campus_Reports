"use client";

import ManagementDashboard from '../../components/dashboard/ManagementDashboard';

export default function DeanOfStudentsDashboard() {
  return (
    <ManagementDashboard
      role="dean_of_students"
      title="Dean of Students Dashboard"
      subtitle="Review anonymous report flow, keep statement work visible, and stay within the endpoints available to this role."
      focusLabel="Recent Anonymous Reports"
      focusEmpty="No reports match the current dashboard search."
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
