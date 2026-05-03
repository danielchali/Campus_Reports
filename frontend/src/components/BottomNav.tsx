"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { getNavLinksForRole, splitNavLinksForMobile } from '../utils/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const allNavLinks = getNavLinksForRole(user.role);
  const { bottomNav } = splitNavLinksForMobile(allNavLinks);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 md:hidden">
      <div className="flex overflow-x-auto px-1 sm:px-2 py-1.5 sm:py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {bottomNav.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.path;
          const commonClasses = `min-w-[64px] sm:min-w-[76px] flex-1 rounded-2xl px-2 sm:px-3 py-1.5 sm:py-2 text-center transition ${
            isActive
              ? 'bg-kmuGreen/10 text-kmuGreen dark:bg-kmuGreen/20'
              : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
          }`;

          if (link.label === 'Logout') {
            return (
              <button
                key={link.path}
                onClick={() => logout()}
                className={`${commonClasses} ${link.danger ? 'text-red-500 dark:text-red-400' : ''}`}
              >
                <span className="mx-auto flex h-5 w-5 items-center justify-center">
                  <Icon size={16} />
                </span>
                <span className="mt-1 block text-[10px] sm:text-[11px] font-medium leading-tight">{link.label}</span>
              </button>
            );
          }

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
