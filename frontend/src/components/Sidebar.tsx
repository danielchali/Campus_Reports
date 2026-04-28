"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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

  const sidebarBase = `fixed inset-y-0 left-0 z-50 flex h-full flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl transition-transform duration-300 ease-in-out ${
    isOpenMobile ? 'translate-x-0 w-[280px]' : '-translate-x-full md:translate-x-0 md:w-auto'
  }`;

  const linkBase =
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100';
  const linkActive =
    'bg-slate-100 dark:bg-slate-800 text-kmuGreen dark:text-emerald-400 shadow-sm';

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
        <div className="px-5 pb-4 pt-6">
          <div className="flex items-center justify-center">
            <img
              src="/kmu_logo.svg"
              alt="KMU Logo"
              width={80}
              height={80}
              className="h-20 w-20 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = document.createElement('div');
                fallback.className = 'text-2xl font-bold text-kmuGreen';
                fallback.textContent = 'KMU';
                e.currentTarget.parentNode?.appendChild(fallback);
              }}
            />
          </div>
        </div>
        <nav className="sidebar-scroll mt-4 flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-6">
          {bottomNav.filter((link) => !link.mobileOnly).map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setIsOpenMobile(false)}
                className={`${linkBase} hidden md:flex ${pathname === link.path ? linkActive : ''} ${link.danger ? 'hover:bg-red-500/20 hover:text-white' : ''}`}
              >
                <span className={`flex h-5 w-5 items-center justify-center ${pathname === link.path ? 'text-kmuGreen dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} aria-hidden="true">
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
                className={`${linkBase} md:hidden ${link.danger ? 'hover:bg-red-500/20 hover:text-white' : ''}`}
              >
                <span className="flex h-5 w-5 items-center justify-center text-slate-400 dark:text-slate-500" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span>{link.label}</span>
              </button>
            ) : (
              <Link
                key={link.path}
                href={link.path}
                onClick={() => setIsOpenMobile(false)}
                className={`${linkBase} ${pathname === link.path ? linkActive : ''} ${link.danger ? 'hover:bg-red-500/20 hover:text-white' : ''}`}
              >
                <span className={`flex h-5 w-5 items-center justify-center ${pathname === link.path ? 'text-kmuGreen dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div
          className="absolute bottom-0 right-0 top-0 hidden w-1 cursor-col-resize bg-slate-200/50 dark:bg-slate-800/50 hover:bg-kmuGreen/30 md:block"
          onMouseDown={handleMouseDown}
          title="Drag to resize sidebar"
        />
      </aside>
    </>
  );
}
