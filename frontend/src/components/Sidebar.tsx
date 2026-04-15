"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  Clipboard,
  ClipboardList,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Lock,
  LogOut,
  Moon,
  Paperclip,
  Plus,
  Search,
  Shield,
  Sun,
  type LucideIcon,
  User,
  UserCog,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../context/ThemeContext';

const navIcons = {
  dashboard: LayoutDashboard,
  cases: FileText,
  reports: ClipboardList,
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

type NavLink = {
  icon: LucideIcon;
  label: string;
  path: string;
  danger?: boolean;
  mobileOnly?: boolean;
};

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { sidebarWidth, setSidebarWidth } = useSidebar();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const sidebarBase =
    'fixed z-40 left-0 top-0 h-full bg-gray-900 text-white shadow-lg border-r border-gray-800 transform transition-transform duration-200 ease-in-out';
  const linkBase =
    'flex items-center gap-3 py-2 px-4 rounded-lg transition-all font-medium hover:bg-gray-200 dark:hover:bg-gray-800 text-sm sm:text-base';
  const linkActive =
    'bg-kmuGreen text-white shadow dark:bg-kmuGreen dark:text-white';

  let navLinks: NavLink[] = [];

  if (user?.role === 'admin') {
    navLinks = [
      { icon: navIcons.admin, label: 'Admin Panel', path: '/admin' },
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
  } else if (user?.role === 'security_officer') {
    navLinks = [
      { icon: navIcons.dashboard, label: 'Home', path: '/security-dashboard' },
      { icon: navIcons.cases, label: 'Cases', path: '/cases' },
      { icon: navIcons.evidence, label: 'Evidence', path: '/evidence' },
      { icon: navIcons.students, label: 'Students', path: '/students' },
      { icon: navIcons.newcase, label: 'New Case', path: '/cases/new' },
      { icon: navIcons.profile, label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help, label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true },
    ];
  } else if (user?.role === 'chief_security_officer') {
    navLinks = [
      { icon: navIcons.security, label: 'Home', path: '/chief-security-officer-dashboard' },
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
  } else if (user?.role === 'dean_of_students') {
    navLinks = [
      { icon: navIcons.dean, label: 'Home', path: '/dean-of-students-dashboard' },
      { icon: navIcons.students, label: 'Students', path: '/students' },
      { icon: navIcons.cases, label: 'Cases', path: '/cases' },
      { icon: navIcons.reports, label: 'Reports', path: '/reports' },
      { icon: navIcons.audit, label: 'Audit/Logs', path: '/audit' },
      { icon: navIcons.profile, label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help, label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true },
    ];
  } else if (user?.role === 'assistant_dean') {
    navLinks = [
      { icon: navIcons.assistant, label: 'Home', path: '/assistant-dean-dashboard' },
      { icon: navIcons.students, label: 'Students', path: '/students' },
      { icon: navIcons.cases, label: 'Cases', path: '/cases' },
      { icon: navIcons.reports, label: 'Reports', path: '/reports' },
      { icon: navIcons.profile, label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help, label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true },
    ];
  } else if (user?.role === 'secretary') {
    navLinks = [
      { icon: navIcons.secretary, label: 'Home', path: '/secretary-dashboard' },
      { icon: navIcons.students, label: 'Students', path: '/students' },
      { icon: navIcons.cases, label: 'Cases', path: '/cases' },
      { icon: navIcons.reports, label: 'Reports', path: '/reports' },
      { icon: navIcons.profile, label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help, label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true },
    ];
  } else {
    navLinks = [
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true, mobileOnly: true },
    ];
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) {
      return;
    }

    const newWidth = e.clientX;
    if (newWidth >= 200 && newWidth <= 400) {
      setSidebarWidth(newWidth);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  return (
    <>
      <div
        className={`fixed inset-0 bg-black bg-opacity-30 z-30 transition-opacity md:hidden ${open ? 'block' : 'hidden'}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`${sidebarBase} ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 dark:bg-gray-900 dark:text-white bg-white text-gray-900`}
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="flex flex-col items-center gap-2 pt-8 pb-4 border-b border-gray-800 dark:border-gray-800 border-gray-200 px-4 relative">
          <button
            className="absolute top-2 right-2 p-2 rounded-lg bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src="/kmu_logo.svg"
            alt="KMU Logo"
            width={64}
            height={64}
            className="mb-2 h-16 w-16 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = 'text-2xl font-bold text-white mb-2';
              fallback.textContent = 'KMU';
              e.currentTarget.parentNode?.appendChild(fallback);
            }}
          />
          <button
            className="mt-2 px-3 py-2 rounded bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            <span className="inline-flex items-center gap-2">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </span>
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 mt-6 px-4 pb-6 flex-1 justify-start overflow-y-auto">
          {navLinks
            .filter((link) => !link.mobileOnly || isMobile)
            .map((link) => {
              const Icon = link.icon;

              return link.label === 'Logout' ? (
                <button
                  key={link.path}
                  onClick={() => logout()}
                  className={`${linkBase} ${link.danger ? 'hover:bg-red-900 hover:text-red-400 dark:hover:text-red-400' : ''} text-gray-900 dark:text-white`}
                >
                  <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span>{link.label}</span>
                </button>
              ) : (
                <Link
                  key={link.path}
                  href={link.path}
                  className={`${linkBase} ${pathname === link.path ? linkActive : ''} ${link.danger ? 'hover:bg-red-900 hover:text-red-400 dark:hover:text-red-400' : ''} text-gray-900 dark:text-white`}
                  onClick={() => setOpen(false)}
                >
                  <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
        </nav>
        <div
          className="absolute right-0 top-0 bottom-0 w-1 bg-gray-600 hover:bg-gray-500 cursor-col-resize hidden md:block"
          onMouseDown={handleMouseDown}
          title="Drag to resize sidebar"
        />
      </aside>
      <button
        className="absolute top-4 left-4 z-50 p-3 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-lg border border-gray-200 dark:border-gray-700 md:hidden hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setOpen(!open)}
        aria-label="Toggle sidebar"
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
    </>
  );
}
