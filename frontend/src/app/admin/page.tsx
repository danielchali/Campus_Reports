"use client";

import ManagementDashboard from '../../components/dashboard/ManagementDashboard';

export default function AdminPage() {
  return (
    <ManagementDashboard
      role="admin"
      title="Welcome back, Admin"
      subtitle="Monitor case activity, review operational load, and move into the main management tools from one place."
      focusLabel="Recent Campus Reports"
      focusEmpty="No recent incident or maintenance reports are available."
      metricKeys={['totalCampusReports', 'resolvedReports', 'pendingReviewReports', 'openReports']}
      dataset="anonymousReports"
      quickActions={[
        { href: '/cases/new', label: 'Create New Case' },
        { href: '/admin/users', label: 'Manage Users' },
        { href: '/students', label: 'View Students' },
        { href: '/reports', label: 'Open Reports' },
      ]}
    />
  );
}
