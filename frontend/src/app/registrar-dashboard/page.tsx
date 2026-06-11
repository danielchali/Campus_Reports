"use client";

import ManagementDashboard from "../../components/dashboard/ManagementDashboard";

export default function RegistrarDashboard() {
  return (
    <ManagementDashboard
      role="registrar"
      title="Registrar Dashboard"
      subtitle="Follow anonymous report intake, keep statement-request work visible, and use only the data sources this role can access."
      focusLabel="Recent Campus Reports"
      focusEmpty="No recent incident or maintenance reports are available."
      metricKeys={[
        "totalReports",
        "openReports",
        "pendingStatements",
        "submittedStatements",
        "totalStaff",
      ]}
      dataset="anonymousReports"
      quickActions={[
        { href: "/anonymous-report", label: "Open Anonymous Reports" },
        { href: "/staff", label: "Open Staff" },
        { href: "/inbox", label: "Open Inbox" },
        { href: "/profile", label: "Profile & Settings" },
      ]}
    />
  );
}
