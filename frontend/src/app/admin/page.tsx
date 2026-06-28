"use client";

import ManagementDashboard from '../../components/dashboard/ManagementDashboard';

export default function AdminPage() {
  return (
    <ManagementDashboard
      role="admin"
      focusLabel="Recent Campus Reports"
      focusEmpty="No recent incident or maintenance reports are available."
      metricKeys={['totalCampusReports', 'resolvedReports', 'pendingReviewReports', 'openReports']}
      dataset="anonymousReports"
      quickActions={[
        { href: '/cases/new', label: 'Create New Case' },
        { href: '/admin/users', label: 'Manage Users' },
        { href: '/admin/form-settings', label: 'Form & Portal Settings' },
        { href: '/students', label: 'View Students' },
        { href: '/inbox', label: 'Open Inbox' },
      ]}
    />
  );
}
