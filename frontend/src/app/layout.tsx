"use client";

import '../globals.css';
import Image from 'next/image';
import Link from 'next/link';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useRouter } from 'next/navigation';
import { SyncProvider, useSync } from '../context/SyncContext';
import { useSyncManager } from '../hooks/useSyncManager';
import { useOfflineSync } from '../hooks/useOfflineSync';

import SyncManagerClient from '../components/SyncManagerClient';

import ServiceWorkerRegistration from '../components/ServiceWorkerRegistration';
import ConflictResolution from '../components/ConflictResolution';
import clsx from 'clsx';
import { API_BASE_URL } from '../config/constants';
import { onSyncError, offSyncError } from '../hooks/useSyncManager';

const navIcons = {
  dashboard: '🏠',
  cases: '📄',
  reports: '🧾',
  evidence: '📎',
  students: '👤',
  newcase: '➕',
  logout: '🚪',
  admin: '🛡️',
  academic: '🎓',
  dean: '👨‍🎓',
  audit: '🔍',
  users: '👥',

  profile: '👤',
  help: '❓',
};

function Sidebar() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  // Sidebar style classes
  const sidebarBase =
    'fixed z-40 left-0 top-0 h-full w-64 bg-gray-900 text-white shadow-lg border-r border-gray-800 transform transition-transform duration-200 ease-in-out';
  const linkBase =
    'flex items-center gap-3 py-2 px-4 rounded transition font-medium hover:bg-gray-200 dark:hover:bg-gray-800';
  const linkActive =
    'bg-kmuGreen text-white shadow dark:bg-kmuGreen dark:text-white';
  const sectionHeader =
    'uppercase text-xs text-gray-400 font-bold tracking-wider px-4 mt-6 mb-2';

  // Role-based navs
  let navLinks = [];
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
      { icon: navIcons.profile || '👤', label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help || '❓', label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true },
    ];
  } else if (user?.role === 'security_officer') {
    navLinks = [
      { icon: navIcons.dashboard, label: 'Home', path: '/security-dashboard' },
      { icon: navIcons.cases, label: 'Cases', path: '/cases' },
      { icon: navIcons.evidence, label: 'Evidence', path: '/evidence' },
      { icon: navIcons.students, label: 'Students', path: '/students' },
      { icon: navIcons.newcase, label: 'New Case', path: '/cases/new' },
      { icon: navIcons.profile || '👤', label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help || '❓', label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true },
    ];
  } else if (user?.role === 'academic_office') {
    navLinks = [
      { icon: navIcons.dashboard, label: 'Home', path: '/academic-dashboard' },
      { icon: navIcons.cases, label: 'Cases', path: '/cases' },
      { icon: navIcons.reports, label: 'Reports', path: '/reports' },
      { icon: navIcons.students, label: 'Students', path: '/students' },
      { icon: navIcons.newcase, label: 'New Case', path: '/cases/new' },
      { icon: navIcons.audit, label: 'Audit/Logs', path: '/audit' },
      { icon: navIcons.profile || '👤', label: 'Profile & Settings', path: '/profile' },
      { icon: navIcons.help || '❓', label: 'Help', path: '/help' },
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true },
    ];
  } else {
    navLinks = [
      { icon: navIcons.logout, label: 'Logout', path: '/logout', danger: true },
    ];
  }

  return (
    <>
      <div className={`fixed inset-0 bg-black bg-opacity-30 z-30 transition-opacity md:hidden ${open ? 'block' : 'hidden'}`} onClick={() => setOpen(false)} />
      <aside className={`${sidebarBase} ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:block dark:bg-gray-900 dark:text-white bg-white text-gray-900 w-64 md:w-64`}>
        <div className="flex flex-col items-center gap-2 pt-8 pb-4 border-b border-gray-800 dark:border-gray-800 border-gray-200">
          <img src="/kmu_logo.svg" alt="KMU Logo" width={64} height={64} className="mb-2" />
          <button
            className="mt-2 px-2 py-1 rounded bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm hover:bg-gray-300 dark:hover:bg-gray-700"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
          >
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
        <nav className="flex flex-col gap-1 mt-6">
          {navLinks.map(link =>
            link.label === 'Logout' ? (
              <button
                key={link.path}
                onClick={() => logout()}
                className={
                  `${linkBase} ${link.danger ? 'hover:bg-red-900 hover:text-red-400 dark:hover:text-red-400' : ''} text-gray-900 dark:text-white`}
              >
                <span className="text-xl">{link.icon}</span>
                <span>{link.label}</span>
              </button>
            ) : (
              <Link
                key={link.path}
                href={link.path}
                className={
                  `${linkBase} ${pathname === link.path ? linkActive : ''} ${link.danger ? 'hover:bg-red-900 hover:text-red-400 dark:hover:text-red-400' : ''} text-gray-900 dark:text-white`}
              >
                <span className="text-xl">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            )
          )}
        </nav>
      </aside>
      <button className="fixed top-3 left-3 z-50 p-2 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow border border-gray-200 dark:border-gray-700 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle sidebar">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-menu"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
      </button>
    </>
  );
}

function AppContent({ isLogin, children }: { isLogin: boolean; children: React.ReactNode }) {
  const { user } = useAuth();
  const shouldShowNav = !isLogin && user;
  
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      {shouldShowNav && <Sidebar />}
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Hide top navbar on mobile */}
        <div className="hidden md:block">
          {shouldShowNav && <TopNavbar />}
        </div>
        <main className="flex-1 px-3 py-2 md:px-6 md:py-8 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

function TopNavbar() {
  const { user, token } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { syncStatus, conflicts, syncAll, clearAllConflicts } = useOfflineSync();
  const [showConflicts, setShowConflicts] = useState(false);
  const router = useRouter();
  
  if (!user) return null;

  return (
    <nav className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 shadow border-b border-gray-200 dark:border-gray-800">
      <span className="font-bold text-xl text-kmuGreen dark:text-kmuGreen">KMU DisciplineDesk</span>
      <div className="flex gap-4 items-center">
        {(user.role === 'admin' || user.role === 'security_officer' || user.role === 'academic_office') && (
          <button onClick={() => router.push('/cases/new')} className="text-kmuOrange dark:text-kmuOrange hover:underline font-medium">+ New Case</button>
        )}
        {(user.role === 'admin' || user.role === 'security_officer') && (
          <button onClick={() => router.push('/evidence')} className="text-purple-600 dark:text-purple-400 hover:underline font-medium">Upload Evidence</button>
        )}
        {/* Dark mode toggle */}
        {/* Offline/Sync status */}
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              syncStatus.isOnline 
                ? (syncStatus.error 
                    ? 'bg-red-100 text-red-700' 
                    : syncStatus.isSyncing 
                      ? 'bg-yellow-100 text-yellow-700' 
                      : 'bg-green-100 text-green-700')
                : 'bg-red-100 text-red-700'
            }`}
            title={syncStatus.isOnline 
              ? (syncStatus.error 
                  ? 'Sync Error' 
                  : syncStatus.isSyncing 
                    ? 'Syncing...' 
                    : 'Online')
              : 'Offline'
            }
          >
            {syncStatus.isOnline 
              ? (syncStatus.error 
                  ? 'Sync Error' 
                  : syncStatus.isSyncing 
                    ? 'Syncing...' 
                    : 'Online')
              : 'Offline'
            }
          </span>
          
          {syncStatus.pendingChanges > 0 && (
            <button
              onClick={syncAll}
              disabled={syncStatus.isSyncing || !syncStatus.isOnline}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Sync ({syncStatus.pendingChanges})
            </button>
          )}
          
          {conflicts.length > 0 && (
            <button
              onClick={() => setShowConflicts(true)}
              className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
            >
              Conflicts ({conflicts.length})
            </button>
          )}
        </div>
              </div>
        
        {/* Conflict Resolution Modal */}
        {showConflicts && (
          <ConflictResolution
            conflicts={conflicts}
            onResolve={async (conflictId, useLocal) => {
              // This will be implemented in the useOfflineSync hook
              // For now, we'll use a placeholder
              console.log('Resolving conflict:', conflictId, useLocal);
            }}
            onClearAll={clearAllConflicts}
            onClose={() => setShowConflicts(false)}
          />
        )}
      </nav>
    );
  }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isLogin = pathname === "/login" || pathname === "/";
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    function handleSyncError(msg: string) {
      setSyncError(msg);
    }
    onSyncError(handleSyncError);
    return () => offSyncError(handleSyncError);
  }, []);

  return (
    <html lang="en" suppressHydrationWarning className={theme === 'dark' ? 'dark' : ''}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1f2937" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="KMU Desk" />
        <link rel="apple-touch-icon" href="/kmu_logo.svg" />
      </head>
      <body className="min-h-screen">
        {syncError && (
          <div className="bg-red-600 text-white text-center py-2 font-semibold">
            Sync error: {syncError}
          </div>
        )}
        <AuthProvider>
          <SyncProvider>
            <ThemeProvider>
              <AppContent isLogin={isLogin}>
                {children}
              </AppContent>
              
              {/* Service Worker Registration */}
              <ServiceWorkerRegistration />
            </ThemeProvider>
          </SyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}