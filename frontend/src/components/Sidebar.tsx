"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../context/ThemeContext';
import { getNavLinksForRole, splitNavLinksForMobile } from '../utils/navigation';

export default function Sidebar() {
  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const { sidebarWidth, setSidebarWidth, isOpenMobile, setIsOpenMobile } = useSidebar();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const allNavLinks = getNavLinksForRole(user?.role);
  const { bottomNav, sidebarNav } = splitNavLinksForMobile(allNavLinks);

  const sidebarBase = `fixed z-50 left-0 top-0 h-full bg-white text-gray-900 shadow-lg border-r border-gray-200 dark:bg-gray-900 dark:text-white dark:border-gray-800 transition-all duration-300 ease-in-out flex flex-col ${
    isOpenMobile ? 'translate-x-0 w-[280px]' : '-translate-x-full md:translate-x-0'
  }`;

  const linkBase =
    'flex items-center gap-2 md:gap-3 py-2 px-3 md:px-4 rounded-lg transition-all font-medium hover:bg-gray-200 dark:hover:bg-gray-800 text-xs sm:text-sm md:text-base';
  const linkActive =
    'bg-kmuGreen text-white shadow dark:bg-kmuGreen dark:text-white';

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
    const syncViewport = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    syncViewport();
    window.addEventListener('resize', syncViewport);

    return () => {
      window.removeEventListener('resize', syncViewport);
    };
  }, []);

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
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}
      <aside className={sidebarBase} style={{ width: isDesktop ? `${sidebarWidth}px` : undefined }}>
        <div className="relative flex flex-col items-center gap-2 border-b border-gray-200 px-4 pb-4 pt-8 dark:border-gray-800">
          <img
            src="/kmu_logo.svg"
            alt="KMU Logo"
            width={64}
            height={64}
            className="mb-2 h-12 md:h-16 w-12 md:w-16 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              const fallback = document.createElement('div');
              fallback.className = 'mb-2 text-lg md:text-2xl font-bold text-gray-900 dark:text-white';
              fallback.textContent = 'KMU';
              e.currentTarget.parentNode?.appendChild(fallback);
            }}
          />
          <button
            className="mt-2 px-2 md:px-3 py-1 md:py-2 rounded bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-xs md:text-sm hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            <span className="inline-flex items-center gap-1 md:gap-2">
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              <span className="hidden md:inline">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </span>
          </button>
        </div>
        <nav className="sidebar-scroll flex flex-col gap-0.5 mt-4 md:mt-6 px-3 md:px-4 pb-6 flex-1 justify-start overflow-y-auto">
          {bottomNav.filter((link) => !link.mobileOnly).map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setIsOpenMobile(false)}
                className={`${linkBase} hidden md:flex ${pathname === link.path ? linkActive : ''} ${link.danger ? 'hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900 dark:hover:text-red-400' : ''} text-gray-900 dark:text-white`}
              >
                <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
          {sidebarNav.map((link) => {
            const Icon = link.icon;

            return link.label === 'Logout' ? (
              <button
                key={link.path}
                onClick={() => {
                  setIsOpenMobile(false);
                  logout();
                }}
                className={`${linkBase} md:hidden ${link.danger ? 'hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900 dark:hover:text-red-400' : ''} text-gray-900 dark:text-white`}
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
                onClick={() => setIsOpenMobile(false)}
                className={`${linkBase} ${pathname === link.path ? linkActive : ''} ${link.danger ? 'hover:bg-red-100 hover:text-red-700 dark:hover:bg-red-900 dark:hover:text-red-400' : ''} text-gray-900 dark:text-white`}
              >
                <span className="flex h-5 w-5 items-center justify-center" aria-hidden="true">
                  <Icon size={16} />
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
    </>
  );
}
