import type { LucideIcon } from "@/components/icons";
import {
  Briefcase,
  Clipboard,
  ClipboardList,
  FilePenLine,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Lock,
  LogOut,
  Paperclip,
  Plus,
  Search,
  Shield,
  User,
  UserCog,
  Wrench,
} from "@/components/icons";

export type NavLink = {
  icon: LucideIcon;
  label: string;
  path: string;
  danger?: boolean;
  mobileOnly?: boolean;
  children?: NavLink[];
};

const navIcons = {
  dashboard: LayoutDashboard,
  cases: FileText,
  inbox: ClipboardList,
  maintenanceIssues: Wrench,
  workOrders: Clipboard,
  myReports: ClipboardList,
  makeReport: FilePenLine,
  evidence: Paperclip,
  students: User,
  newcase: Plus,
  logout: LogOut,
  admin: Shield,
  dean: GraduationCap,
  audit: Search,
  users: UserCog,
  staff: Briefcase,
  profile: User,
  help: HelpCircle,
  security: Lock,
  assistant: Briefcase,
  secretary: Clipboard,
  maintenance: Wrench,
} as const;

export function getNavLinksForRole(role?: string): NavLink[] {
  if (role === "admin") {
    return [
      { icon: navIcons.admin, label: "Dashboard", path: "/admin" },
      { icon: navIcons.users, label: "Manage Users", path: "/admin/users" },
      { icon: navIcons.workOrders, label: "System Settings", path: "/admin/system-settings" },
      {
        icon: navIcons.cases,
        label: "Disciplinary",
        path: "/cases",
        children: [
          { icon: navIcons.cases, label: "Discipline Cases", path: "/cases" },
          { icon: navIcons.newcase, label: "New Case", path: "/cases/new" },
          { icon: navIcons.evidence, label: "Evidence", path: "/evidence" },
          { icon: navIcons.students, label: "Students", path: "/students" },
        ],
      },
      { icon: navIcons.inbox, label: "Inbox", path: "/inbox" },
      {
        icon: navIcons.maintenance,
        label: "Maintenance",
        path: "/maintenance-issues",
        children: [
          {
            icon: navIcons.maintenanceIssues,
            label: "Maintenance Issues",
            path: "/maintenance-issues",
          },
          { icon: navIcons.workOrders, label: "Work Orders", path: "/work-orders" },
        ],
      },
      { icon: navIcons.audit, label: "Audit/Logs", path: "/audit" },
      { icon: navIcons.profile, label: "Profile & Settings", path: "/profile" },
      { icon: navIcons.help, label: "Help", path: "/help" },
      {
        icon: navIcons.logout,
        label: "Logout",
        path: "/logout",
        danger: true,
        mobileOnly: true,
      },
    ];
  }

  if (role === "security_officer") {
    return [
      {
        icon: navIcons.dashboard,
        label: "Dashboard",
        path: "/security-dashboard",
      },
      { icon: navIcons.cases, label: "Discipline Cases", path: "/cases" },
      { icon: navIcons.evidence, label: "Evidence", path: "/evidence" },
      { icon: navIcons.students, label: "Students", path: "/students" },
      { icon: navIcons.newcase, label: "New Case", path: "/cases/new" },
      { icon: navIcons.audit, label: "Audit/Logs", path: "/audit" },
      { icon: navIcons.profile, label: "Profile & Settings", path: "/profile" },
      { icon: navIcons.help, label: "Help", path: "/help" },
      {
        icon: navIcons.logout,
        label: "Logout",
        path: "/logout",
        danger: true,
        mobileOnly: true,
      },
    ];
  }

  if (role === "chief_security_officer") {
    return [
      {
        icon: navIcons.security,
        label: "Dashboard",
        path: "/chief-security-officer-dashboard",
      },
      { icon: navIcons.inbox, label: "Inbox", path: "/inbox" },
      { icon: navIcons.audit, label: "Audit/Logs", path: "/audit" },
      { icon: navIcons.profile, label: "Profile & Settings", path: "/profile" },
      { icon: navIcons.help, label: "Help", path: "/help" },
      {
        icon: navIcons.logout,
        label: "Logout",
        path: "/logout",
        danger: true,
        mobileOnly: true,
      },
    ];
  }

  if (role === "dean_of_students") {
    return [
      {
        icon: navIcons.dean,
        label: "Dashboard",
        path: "/dean-of-students-dashboard",
      },
      {
        icon: navIcons.cases,
        label: "Disciplinary",
        path: "/cases",
        children: [
          { icon: navIcons.cases, label: "Discipline Cases", path: "/cases" },
          { icon: navIcons.newcase, label: "New Case", path: "/cases/new" },
          { icon: navIcons.evidence, label: "Evidence", path: "/evidence" },
          { icon: navIcons.students, label: "Students", path: "/students" },
        ],
      },
      { icon: navIcons.inbox, label: "Inbox", path: "/inbox" },
      {
        icon: navIcons.maintenanceIssues,
        label: "Maintenance Issues",
        path: "/maintenance-issues",
      },
      { icon: navIcons.workOrders, label: "Work Orders", path: "/work-orders" },
      { icon: navIcons.audit, label: "Audit/Logs", path: "/audit" },
      { icon: navIcons.profile, label: "Profile & Settings", path: "/profile" },
      { icon: navIcons.help, label: "Help", path: "/help" },
      {
        icon: navIcons.logout,
        label: "Logout",
        path: "/logout",
        danger: true,
        mobileOnly: true,
      },
    ];
  }

  if (role === "assistant_dean") {
    return [
      {
        icon: navIcons.assistant,
        label: "Dashboard",
        path: "/assistant-dean-dashboard",
      },
      { icon: navIcons.inbox, label: "Inbox", path: "/inbox" },
      {
        icon: navIcons.maintenanceIssues,
        label: "Maintenance Issues",
        path: "/maintenance-issues",
      },
      { icon: navIcons.workOrders, label: "Work Orders", path: "/work-orders" },
      { icon: navIcons.audit, label: "Audit/Logs", path: "/audit" },
      { icon: navIcons.profile, label: "Profile & Settings", path: "/profile" },
      { icon: navIcons.help, label: "Help", path: "/help" },
      {
        icon: navIcons.logout,
        label: "Logout",
        path: "/logout",
        danger: true,
        mobileOnly: true,
      },
    ];
  }

  if (role === "secretary") {
    return [
      {
        icon: navIcons.secretary,
        label: "Dashboard",
        path: "/secretary-dashboard",
      },
      { icon: navIcons.inbox, label: "Inbox", path: "/inbox" },
      {
        icon: navIcons.maintenanceIssues,
        label: "Maintenance Issues",
        path: "/maintenance-issues",
      },
      { icon: navIcons.workOrders, label: "Work Orders", path: "/work-orders" },
      { icon: navIcons.audit, label: "Audit/Logs", path: "/audit" },
      { icon: navIcons.profile, label: "Profile & Settings", path: "/profile" },
      { icon: navIcons.help, label: "Help", path: "/help" },
      {
        icon: navIcons.logout,
        label: "Logout",
        path: "/logout",
        danger: true,
        mobileOnly: true,
      },
    ];
  }

  if (role === "registrar") {
    return [
      {
        icon: navIcons.secretary,
        label: "Dashboard",
        path: "/registrar-dashboard",
      },
      { icon: navIcons.inbox, label: "Inbox", path: "/inbox" },
      {
        icon: navIcons.maintenanceIssues,
        label: "Maintenance Issues",
        path: "/maintenance-issues",
      },
      { icon: navIcons.workOrders, label: "Work Orders", path: "/work-orders" },
      { icon: navIcons.audit, label: "Audit/Logs", path: "/audit" },
      { icon: navIcons.profile, label: "Profile & Settings", path: "/profile" },
      { icon: navIcons.help, label: "Help", path: "/help" },
      {
        icon: navIcons.logout,
        label: "Logout",
        path: "/logout",
        danger: true,
        mobileOnly: true,
      },
    ];
  }

  if (role === "maintenance") {
    return [
      {
        icon: navIcons.maintenance,
        label: "Dashboard",
        path: "/maintenance-dashboard",
      },
      { icon: navIcons.inbox, label: "Inbox", path: "/inbox" },
      {
        icon: navIcons.maintenanceIssues,
        label: "Maintenance Issues",
        path: "/maintenance-issues",
      },
      { icon: navIcons.workOrders, label: "Work Orders", path: "/work-orders" },
      { icon: navIcons.staff, label: "Staff", path: "/staff" },
      { icon: navIcons.audit, label: "Audit/Logs", path: "/audit" },
      { icon: navIcons.profile, label: "Profile & Settings", path: "/profile" },
      { icon: navIcons.help, label: "Help", path: "/help" },
      {
        icon: navIcons.logout,
        label: "Logout",
        path: "/logout",
        danger: true,
        mobileOnly: true,
      },
    ];
  }

  if (role === "student") {
    return [
      {
        icon: navIcons.dashboard,
        label: "Dashboard",
        path: "/student-dashboard",
      },
      { icon: navIcons.myReports, label: "My Reports", path: "/my-reports" },
      {
        icon: navIcons.maintenance,
        label: "Maintenance Request",
        path: "/maintenance-request",
      },
      {
        icon: navIcons.makeReport,
        label: "Security/Disciplinary Issue",
        path: "/file-security-disciplinary-issue",
      },
      { icon: navIcons.profile, label: "My Profile", path: "/profile" },
      { icon: navIcons.help, label: "Help", path: "/help" },
      {
        icon: navIcons.logout,
        label: "Logout",
        path: "/logout",
        danger: true,
        mobileOnly: true,
      },
    ];
  }

  if (role === "general_user") {
    return [
      {
        icon: navIcons.dashboard,
        label: "Dashboard",
        path: "/general-dashboard",
      },
      { icon: navIcons.myReports, label: "My Reports", path: "/my-reports" },
      {
        icon: navIcons.maintenance,
        label: "Maintenance Request",
        path: "/maintenance-request",
      },
      {
        icon: navIcons.makeReport,
        label: "Security/Disciplinary Issue",
        path: "/file-security-disciplinary-issue",
      },
      { icon: navIcons.help, label: "Knowledge Base", path: "/help" },
      {
        icon: navIcons.logout,
        label: "Logout",
        path: "/logout",
        danger: true,
        mobileOnly: true,
      },
    ];
  }

  return [
    {
      icon: navIcons.logout,
      label: "Logout",
      path: "/logout",
      danger: true,
      mobileOnly: true,
    },
  ];
}

export function splitNavLinksForMobile(navLinks: NavLink[]) {
  const bottomNav: NavLink[] = [];
  const sidebarNav: NavLink[] = [];

  const settingsLabels = [
    "Manage Users",
    "System Settings",
    "Audit/Logs",
    "Help",
    "Admin Panel",
    "Logout",
  ];

  for (const link of navLinks) {
    // Skip profile links entirely (they are in the top navbar)
    if (link.label === "Profile & Settings" || link.label === "My Profile") {
      continue;
    }

    if (settingsLabels.includes(link.label)) {
      sidebarNav.push(link);
    } else {
      if (bottomNav.length < 4) {
        bottomNav.push(link);
      } else {
        sidebarNav.push(link);
      }
    }
  }

  return { bottomNav, sidebarNav };
}
