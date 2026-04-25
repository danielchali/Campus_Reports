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

  const sidebarBase = `fixed inset-y-0 left-0 z-50 flex h-full flex-col overflow-hidden border-r border-emerald-800/40 bg-gradient-to-b from-kmuGreen to-kmuGreen-dark text-white shadow-2xl transition-transform duration-300 ease-in-out md:translate-x-0 ${
    isOpenMobile ? 'translate-x-0 w-[280px]' : '-translate-x-full md:w-auto'
  }`;

  const linkBase =
    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/86 transition hover:bg-white/10 hover:text-white';
  const linkActive =
    'bg-white/16 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]';

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
        <div className="border-b border-white/10 px-5 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 p-2 shadow-sm">
              <img
                src="/kmu_logo.svg"
                alt="KMU Logo"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = document.createElement('div');
                  fallback.className = 'text-lg font-bold text-kmuGreen';
                  fallback.textContent = 'KMU';
                  e.currentTarget.parentNode?.appendChild(fallback);
                }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/65">Campus</p>
              <p className="text-2xl font-semibold leading-none text-white">Reports</p>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/8 px-3 py-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/70">Dark Mode</span>
            <button 
              onClick={toggleTheme}
              className={`flex h-6 w-12 items-center rounded-full p-1 transition-colors duration-300 ${theme === 'dark' ? 'bg-white/25' : 'bg-white/40'}`}
            >
              <motion.div 
                layout
                className="h-4 w-4 rounded-full bg-white shadow-sm"
                animate={{ x: theme === 'dark' ? 24 : 0 }}
              />
            </button>
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
                <span className="flex h-5 w-5 items-center justify-center text-white/80" aria-hidden="true">
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
                <span className="flex h-5 w-5 items-center justify-center text-white/80" aria-hidden="true">
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
                <span className="flex h-5 w-5 items-center justify-center text-white/80" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
        <div
          className="absolute bottom-0 right-0 top-0 hidden w-1 cursor-col-resize bg-white/5 hover:bg-white/20 md:block"
          onMouseDown={handleMouseDown}
          title="Drag to resize sidebar"
        />
      </aside>
    </>
  );
}
