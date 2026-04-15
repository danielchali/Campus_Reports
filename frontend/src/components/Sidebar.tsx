"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSidebar } from '../context/SidebarContext';
import { useTheme } from '../context/ThemeContext';
import { getNavLinksForRole } from '../utils/navigation';

export default function Sidebar() {
  const [isResizing, setIsResizing] = useState(false);
  const { sidebarWidth, setSidebarWidth } = useSidebar();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const navLinks = getNavLinksForRole(user?.role);

  const sidebarBase =
    'fixed z-40 left-0 top-0 hidden h-full bg-gray-900 text-white shadow-lg border-r border-gray-800 transition-[width] duration-200 ease-in-out md:flex md:flex-col';
  const linkBase =
    'flex items-center gap-3 py-2 px-4 rounded-lg transition-all font-medium hover:bg-gray-200 dark:hover:bg-gray-800 text-sm sm:text-base';
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
    <aside className={sidebarBase} style={{ width: `${sidebarWidth}px` }}>
      <div className="flex flex-col items-center gap-2 pt-8 pb-4 border-b border-gray-800 dark:border-gray-800 border-gray-200 px-4 relative">
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
        {navLinks.filter((link) => !link.mobileOnly).map((link) => {
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
  );
}
