import type { LucideIcon } from 'lucide-react';
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
} from 'lucide-react';

export type NavLink = {
  icon: LucideIcon;
  label: string;
  path: string;
  danger?: boolean;
  mobileOnly?: boolean;
};

const navIcons = {
  dashboard: LayoutDashboard,
  cases: FileText,
  reports: ClipboardList,
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
  profile: User,
  help: HelpCircle,
  security: Lock,
  assistant: Briefcase,
  secretary: Clipboard,
} as const;

export function getNavLinksForRole(role?: string): NavLink[] {
  if (role === 'admin') {
    return [
      { icon: navIcons.admin, label: 'Dashboard', path: '/admin' },
      { icon: navIcons.users, label: 'Manage Users', path: '/admin/users' },
      { icon: navIcons.cases, label: 'Cases', path: '/cases' },
      { icon: navIcons.reports, label: 'Reports', path: '/reports' },
      { icon: navIcons.students, label: 'Students', path: '/students' },
      { icon: navIcons.evidence, label: 'Evidence', path: '/evidence' },
      { icon: navIcons.newcase, label: 'New Case', path: '/cases/new' },
      { icon: navIcons.audit, label: 'Audit/Logs', path: '/audit' },
      { icon: navIcons.profile, label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help, label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true },
    ];
  }

  if (role === 'security_officer') {
    return [
      { icon: navIcons.dashboard, label: 'Dashboard', path: '/security-dashboard' },
      { icon: navIcons.cases, label: 'Cases', path: '/cases' },
      { icon: navIcons.evidence, label: 'Evidence', path: '/evidence' },
      { icon: navIcons.students, label: 'Students', path: '/students' },
      { icon: navIcons.newcase, label: 'New Case', path: '/cases/new' },
      { icon: navIcons.audit, label: 'Audit/Logs', path: '/audit' },
      { icon: navIcons.profile, label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help, label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true },
    ];
  }

  if (role === 'chief_security_officer') {
    return [
      { icon: navIcons.security, label: 'Dashboard', path: '/chief-security-officer-dashboard' },
      { icon: navIcons.cases, label: 'Cases', path: '/cases' },
      { icon: navIcons.reports, label: 'Reports', path: '/reports' },
      { icon: navIcons.students, label: 'Students', path: '/students' },
      { icon: navIcons.evidence, label: 'Evidence', path: '/evidence' },
      { icon: navIcons.newcase, label: 'New Case', path: '/cases/new' },
      { icon: navIcons.audit, label: 'Audit/Logs', path: '/audit' },
      { icon: navIcons.profile, label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help, label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true },
    ];
  }

  if (role === 'dean_of_students') {
    return [
      { icon: navIcons.dean, label: 'Dashboard', path: '/dean-of-students-dashboard' },
      { icon: navIcons.students, label: 'Students', path: '/students' },
      { icon: navIcons.cases, label: 'Cases', path: '/cases' },
      { icon: navIcons.reports, label: 'Reports', path: '/reports' },
      { icon: navIcons.audit, label: 'Audit/Logs', path: '/audit' },
      { icon: navIcons.profile, label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help, label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true },
    ];
  }

  if (role === 'assistant_dean') {
    return [
      { icon: navIcons.assistant, label: 'Dashboard', path: '/assistant-dean-dashboard' },
      { icon: navIcons.students, label: 'Students', path: '/students' },
      { icon: navIcons.cases, label: 'Cases', path: '/cases' },
      { icon: navIcons.reports, label: 'Reports', path: '/reports' },
      { icon: navIcons.audit, label: 'Audit/Logs', path: '/audit' },
      { icon: navIcons.profile, label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help, label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true },
    ];
  }

  if (role === 'secretary') {
    return [
      { icon: navIcons.secretary, label: 'Dashboard', path: '/secretary-dashboard' },
      { icon: navIcons.students, label: 'Students', path: '/students' },
      { icon: navIcons.cases, label: 'Cases', path: '/cases' },
      { icon: navIcons.reports, label: 'Reports', path: '/reports' },
      { icon: navIcons.audit, label: 'Audit/Logs', path: '/audit' },
      { icon: navIcons.profile, label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help, label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true },
    ];
  }

  if (role === 'student') {
    return [
      { icon: navIcons.dashboard, label: 'Dashboard', path: '/student-dashboard' },
      { icon: navIcons.myReports, label: 'My Reports', path: '/my-reports' },
      { icon: navIcons.makeReport, label: 'Make a Report', path: '/make-report' },
      { icon: navIcons.profile, label: 'My Profile', path: '/profile' },
      { icon: navIcons.help, label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true },
    ];
  }

  return [{ icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true }];
}

export function splitNavLinksForMobile(navLinks: NavLink[]) {
  const bottomNav: NavLink[] = [];
  const sidebarNav: NavLink[] = [];

  const settingsLabels = [
    'Manage Users',
    'Audit/Logs',
    'Help',
    'Admin Panel',
    'Logout',
  ];

  for (const link of navLinks) {
    // Skip profile links entirely (they are in the top navbar)
    if (link.label === 'Profile & Settings' || link.label === 'My Profile') {
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

  // Ensure logout is always in sidebarNav if it's in navLinks
  // But our settingsLabels already includes 'Logout'

  return { bottomNav, sidebarNav };
}
