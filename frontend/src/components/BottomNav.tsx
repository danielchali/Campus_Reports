"use client";

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { getNavLinksForRole, isNavigationPathActive, splitNavLinksForMobile } from '../utils/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  const allNavLinks = getNavLinksForRole(user.role);
  const { bottomNav } = splitNavLinksForMobile(allNavLinks);
  const isStudent = user.role === 'student';
  const navItems = isStudent
    ? allNavLinks.filter((link) => ['Dashboard', 'My Reports', 'Maintenance Request', 'Security/Disciplinary Issue'].includes(link.label)).slice(0, 4)
    : bottomNav;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 md:hidden">
      <div className={isStudent ? 'grid grid-cols-4 gap-1 px-1 py-1.5 sm:px-2 sm:py-2' : 'flex overflow-x-auto px-1 py-1.5 sm:px-2 sm:py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'}>
        {navItems.map((link) => {
          const Icon = link.icon;
          const isActive = isNavigationPathActive(pathname, link.path, searchParams);
          const commonClasses = `${isStudent ? 'w-full min-w-0' : 'min-w-[64px] flex-1 sm:min-w-[76px]'} rounded-2xl px-2 py-1.5 text-center transition sm:px-3 sm:py-2 ${
            isActive
              ? 'bg-kmuGreen/10 text-kmuGreen dark:bg-kmuGreen/20'
              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }`;

          return (
            <Link key={link.path} href={link.path} className={commonClasses}>
              <span className="mx-auto flex h-5 w-5 items-center justify-center">
                <Icon size={16} />
              </span>
              <span className="mt-1 block text-[10px] sm:text-[11px] font-medium leading-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
