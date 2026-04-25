"use client";

import ManagementDashboard from '../../components/dashboard/ManagementDashboard';

export default function AdminPage() {
  return (
    <ManagementDashboard
      role="admin"
      title="Welcome back, Admin"
      subtitle="Monitor case activity, review operational load, and move into the main management tools from one place."
      focusLabel="Recent Cases"
      focusEmpty="No cases match the current dashboard search."
      metricKeys={['totalCases', 'resolvedCases', 'pendingCases', 'highPriorityCases', 'totalUsers']}
      quickActions={[
        { href: '/cases/new', label: 'Create New Case' },
        { href: '/admin/users', label: 'Manage Users' },
        { href: '/students', label: 'View Students' },
        { href: '/reports', label: 'Open Reports' },
      ]}
    />
  );
}
