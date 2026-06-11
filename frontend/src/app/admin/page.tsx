"use client";

import ManagementDashboard from '../../components/dashboard/ManagementDashboard';
import { useAuth } from '../../context/AuthContext';
import { getDisplayFirstName } from '../../utils/userDisplay';

export default function AdminPage() {
  const { user } = useAuth();
  const adminFirstName = getDisplayFirstName(user?.name, null, 'Admin');

  return (
    <ManagementDashboard
      role="admin"
      title={`Welcome back, ${adminFirstName}`}
      subtitle="Monitor case activity, review operational load, and move into the main management tools from one place."
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
