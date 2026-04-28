"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNavLinksForRole } from '../utils/navigation';

type Crumb = {
  href?: string;
  label: string;
};

const SEGMENT_LABELS: Record<string, string> = {
  admin: 'Admin',
  users: 'Manage Users',
  cases: 'Cases',
  new: 'New Case',
  reports: 'Reports',
  evidence: 'Evidence',
  students: 'Students',
  staff: 'Staff',
  profile: 'Profile & Settings',
  help: 'Help',
  audit: 'Audit Logs',
  settings: 'Settings',
  'my-reports': 'My Reports',
  'make-report': 'Make a Report',
  'security-dashboard': 'Dashboard',
  'student-dashboard': 'Dashboard',
  'general-dashboard': 'Dashboard',
  'secretary-dashboard': 'Dashboard',
  'assistant-dean-dashboard': 'Dashboard',
  'dean-of-students-dashboard': 'Dashboard',
  'chief-security-officer-dashboard': 'Dashboard',
  'maintenance-dashboard': 'Dashboard',
};

function formatSegmentLabel(segment: string, previousSegment?: string) {
  if (SEGMENT_LABELS[segment]) {
    return SEGMENT_LABELS[segment];
  }

  if (previousSegment === 'students') {
    return 'Student Details';
  }

  if (previousSegment === 'staff') {
    return 'Staff Details';
  }

  if (previousSegment === 'cases') {
    return 'Case Details';
  }

  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function Breadcrumbs() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const navLinks = getNavLinksForRole(user.role).filter((link) => link.path !== '/logout');
  const dashboardLink = navLinks.find((link) => link.label === 'Dashboard');
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  const crumbs: Crumb[] = [];

  if (dashboardLink) {
    crumbs.push({
      href: dashboardLink.path,
      label: dashboardLink.label,
    });
  }

  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    if (dashboardLink?.path === currentPath) {
      return;
    }

    const navMatch = navLinks.find((link) => link.path === currentPath);
    const label = navMatch?.label || formatSegmentLabel(segment, segments[index - 1]);
    const isLast = index === segments.length - 1;

    crumbs.push({
      href: isLast ? undefined : currentPath,
      label,
    });
  });

  if (crumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="sticky top-[56px] z-30 mb-2 overflow-x-auto">
      <ol className="flex min-w-max items-center gap-1 rounded-full border border-gray-200 bg-white/90 px-3 py-2 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800/90 dark:text-gray-300">
        <li className="flex items-center">
          <Home size={14} className="mr-1.5 text-kmuGreen" />
        </li>
        {crumbs.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-1">
            <ChevronRight size={14} className="text-gray-400" />
            {crumb.href ? (
              <Link href={crumb.href} className="whitespace-nowrap transition hover:text-kmuGreen">
                {crumb.label}
              </Link>
            ) : (
              <span className="whitespace-nowrap font-semibold text-kmuGreen">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
