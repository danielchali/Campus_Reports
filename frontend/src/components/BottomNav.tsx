"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getNavLinksForRole } from '../utils/navigation';

export default function BottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [showMore, setShowMore] = useState(false);

  if (!user) {
    return null;
  }

  const allNavLinks = getNavLinksForRole(user.role);
  const bottomNavLinks = allNavLinks.slice(0, 5);
  const moreNavLinks = allNavLinks.slice(5);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-900/95 md:hidden">
        <div className="flex px-1 sm:px-2 py-1.5 sm:py-2">
          {bottomNavLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.path;
            const commonClasses = `flex-1 rounded-2xl px-2 sm:px-3 py-1.5 sm:py-2 text-center transition ${
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
          {moreNavLinks.length > 0 && (
            <button
              onClick={() => setShowMore(!showMore)}
              className="flex-1 rounded-2xl px-2 sm:px-3 py-1.5 sm:py-2 text-center transition text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
            >
              <span className="mx-auto flex h-5 w-5 items-center justify-center">
                <Menu size={16} />
              </span>
              <span className="mt-1 block text-[10px] sm:text-[11px] font-medium leading-tight">More</span>
            </button>
          )}
        </div>
      </nav>

      {/* More Menu Modal */}
      {showMore && moreNavLinks.length > 0 && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            onClick={() => setShowMore(false)}
          />
          <div className="fixed bottom-20 left-0 right-0 z-50 mx-3 rounded-2xl border border-gray-200 bg-white/95 backdrop-blur shadow-lg dark:border-gray-700 dark:bg-gray-900/95 md:hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white">More Options</h3>
              <button
                onClick={() => setShowMore(false)}
                className="flex h-6 w-6 items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-2 py-2">
              {moreNavLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.path;

                if (link.label === 'Logout') {
                  return (
                    <button
                      key={link.path}
                      onClick={() => {
                        logout();
                        setShowMore(false);
                      }}
                      className={`w-full rounded-xl px-4 py-3 text-left transition flex items-center gap-3 ${
                        link.danger
                          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
                          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="font-medium">{link.label}</span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setShowMore(false)}
                    className={`block rounded-xl px-4 py-3 transition ${
                      isActive
                        ? 'bg-kmuGreen/10 text-kmuGreen dark:bg-kmuGreen/20'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={20} />
                      <span className="font-medium">{link.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
