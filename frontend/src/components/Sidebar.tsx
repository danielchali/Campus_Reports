"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from '@/components/icons';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { getNavLinksForRole, splitNavLinksForMobile, type NavLink } from '../utils/navigation';

const MOBILE_SIDEBAR_WIDTH = 'min(240px, calc(100vw - 4rem))';
const MIN_DESKTOP_SIDEBAR_WIDTH = 184;
const MAX_DESKTOP_SIDEBAR_WIDTH = 320;

export default function Sidebar() {
  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const {
    sidebarWidth,
    setSidebarWidth,
    isCollapsedDesktop,
    setIsCollapsedDesktop,
    isOpenMobile,
    setIsOpenMobile,
  } = useSidebar();
  const { user } = useAuth();
  const pathname = usePathname();

  const allNavLinks = getNavLinksForRole(user?.role);
  const { bottomNav, sidebarNav } = splitNavLinksForMobile(allNavLinks);
  const isCollapsed = isDesktop && isCollapsedDesktop;

  const sidebarBase = `fixed inset-y-0 left-0 z-50 flex h-full flex-col overflow-hidden border-r border-slate-200 bg-white text-slate-900 transition-[transform,width] duration-300 ease-in-out md:rounded-tr-[28px] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 ${
    isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-auto'
  }`;

  const linkBase =
    `flex items-center rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 ${
      isCollapsed ? 'justify-center gap-0' : 'gap-3'
    }`;
  const linkActive =
    'bg-slate-100 dark:bg-slate-800 text-kmuGreen dark:text-emerald-400 shadow-sm';
  const childLinkBase =
    'ml-6 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100';

  const isPathActive = (path: string) => {
    if (pathname === path) {
      return true;
    }

    if (path === '/cases') {
      return /^\/cases\/(?!new(?:\/|$))/.test(pathname);
    }

    return path !== '/admin' && pathname.startsWith(`${path}/`);
  };

  const isGroupActive = (link: NavLink) =>
    Boolean(link.children?.some((child) => isPathActive(child.path)));

  const renderIcon = (Icon: NavLink['icon'], isActive: boolean) => (
    <span className={`flex h-5 w-5 items-center justify-center ${isActive ? 'text-kmuGreen dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} aria-hidden="true">
      <Icon size={16} />
    </span>
  );

  const renderNavLink = (link: NavLink, extraClasses = '') => {
    const Icon = link.icon;
    const isActive = isPathActive(link.path);

    return (
      <Link
        key={link.path}
        href={link.path}
        onClick={() => setIsOpenMobile(false)}
        title={isCollapsed ? link.label : undefined}
        aria-label={isCollapsed ? link.label : undefined}
        className={`${linkBase} ${extraClasses} ${isActive ? linkActive : ''} ${link.danger ? 'hover:bg-red-500/20 hover:text-white' : ''}`}
      >
        {renderIcon(Icon, isActive)}
        {!isCollapsed && <span>{link.label}</span>}
      </Link>
    );
  };

  const renderNavItem = (link: NavLink, extraClasses = '') => {
    if (!link.children?.length) {
      return renderNavLink(link, extraClasses);
    }

    const Icon = link.icon;
    const groupIsActive = isGroupActive(link);
    const isOpen = openGroups[link.label] ?? groupIsActive;

    if (isCollapsed) {
      return renderNavLink(link, extraClasses);
    }

    return (
      <div key={link.label} className={extraClasses}>
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => setOpenGroups((current) => ({ ...current, [link.label]: !isOpen }))}
          className={`${linkBase} w-full justify-between ${groupIsActive ? linkActive : ''}`}
        >
          <span className="flex min-w-0 items-center gap-3">
            {renderIcon(Icon, groupIsActive)}
            <span className="truncate">{link.label}</span>
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        {isOpen && (
          <div className="mt-1 flex flex-col gap-1">
            {link.children.map((child) => {
              const ChildIcon = child.icon;
              const childIsActive = isPathActive(child.path);

              return (
                <Link
                  key={child.path}
                  href={child.path}
                  onClick={() => setIsOpenMobile(false)}
                  className={`${childLinkBase} ${childIsActive ? linkActive : ''}`}
                >
                  {renderIcon(ChildIcon, childIsActive)}
                  <span className="truncate">{child.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing || isCollapsedDesktop) {
      return;
    }

    const newWidth = e.clientX;
    if (newWidth >= MIN_DESKTOP_SIDEBAR_WIDTH && newWidth <= MAX_DESKTOP_SIDEBAR_WIDTH) {
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
      <aside
        className={sidebarBase}
        style={{ width: isDesktop ? `${sidebarWidth}px` : MOBILE_SIDEBAR_WIDTH }}
      >
        <div className={`px-5 pb-4 pt-6 ${isCollapsed ? 'px-3' : ''}`}>
          <div className="flex items-center justify-center">
            <img
              src="/kmu_logo.svg"
              alt="KMU Logo"
              width={80}
              height={80}
              className={`${isCollapsed ? 'h-11 w-11' : 'h-20 w-20'} object-contain`}
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
        <div className="hidden px-3 pb-2 md:block">
          <button
            type="button"
            onClick={() => setIsCollapsedDesktop(!isCollapsedDesktop)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label={isCollapsedDesktop ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsedDesktop ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsedDesktop ? <ChevronRight size={16} /> : <ChevronDown size={16} className="rotate-90" />}
            {!isCollapsed && <span>Collapse</span>}
          </button>
        </div>
        <nav className="sidebar-scroll mt-4 flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-6">
          {bottomNav.filter((link) => !link.mobileOnly).map((link) => {
            return link.children?.length
              ? renderNavItem(link, 'hidden md:block')
              : renderNavLink(link, 'hidden md:flex');
          })}
          {sidebarNav.map((link) => {
            return renderNavItem(link, link.mobileOnly ? 'md:hidden' : '');
          })}
        </nav>
        <div
          className={`absolute bottom-0 right-0 top-0 hidden w-1 cursor-col-resize bg-transparent hover:bg-kmuGreen/30 md:block ${isCollapsed ? 'md:hidden' : ''}`}
          onMouseDown={handleMouseDown}
          title="Drag to resize sidebar"
        />
      </aside>
    </>
  );
}
