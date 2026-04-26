"use client";

import '../globals.css';
import { useEffect, useState, Suspense, lazy } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Bell, ChevronDown, Menu, Moon, Search, Sun } from 'lucide-react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { SyncProvider } from '../context/SyncContext';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';
import { onSyncError, offSyncError } from '../hooks/useSyncManager';

import GlobalSearch from '../components/GlobalSearch';
import NotificationBell from '../components/NotificationBell';
import UserProfileMenu from '../components/UserProfileMenu';

const SyncManagerClient = lazy(() => import('../components/SyncManagerClient'));
const ServiceWorkerRegistration = lazy(() => import('../components/ServiceWorkerRegistration'));
const PreloadProgress = lazy(() => import('../components/PreloadProgress'));
const CacheStatus = lazy(() => import('../components/CacheStatus'));
const OfflineIndicator = lazy(() => import('../components/OfflineIndicator'));
const Breadcrumbs = lazy(() => import('../components/Breadcrumbs'));
const Sidebar = lazy(() => import('../components/Sidebar'));
const BottomNav = lazy(() => import('../components/BottomNav'));
const FloatingAIChatbot = lazy(() => import('../components/FloatingAIChatbot'));

const LoadingFallback = () => (
  <div className="p-4 md:p-6 animate-pulse" aria-hidden="true">
    <div className="space-y-4">
      <div className="h-10 w-48 rounded-xl bg-gray-200 dark:bg-gray-700" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-32 rounded-2xl bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-64 rounded-2xl bg-gray-200 dark:bg-gray-700" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-700" />
        <div className="h-40 rounded-2xl bg-gray-200 dark:bg-gray-700" />
      </div>
    </div>
  </div>
);

function TopNavbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { setIsOpenMobile } = useSidebar();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-[40] w-full border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex items-center justify-between gap-4 px-4 py-3 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <GlobalSearch />
          <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-white md:hidden">Campus Reports</h1>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />

          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? <Moon className="h-3.5 w-3.5 text-indigo-400" /> : <Sun className="h-3.5 w-3.5 text-amber-500" />}
            <div className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors duration-200 ${theme === 'dark' ? 'bg-indigo-500' : 'bg-slate-300'}`}>
              <span className={`absolute left-0.5 top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-transform duration-200 ${theme === 'dark' ? 'translate-x-4' : 'translate-x-0'}`} />
            </div>
          </button>

          <UserProfileMenu />
        </div>
      </div>
    </nav>
  );
}

function AppContent({ isLogin, children }: { isLogin: boolean; children: React.ReactNode }) {
  const { user } = useAuth();
  const { sidebarWidth } = useSidebar();
  const [isMobile, setIsMobile] = useState(true); // Default to true to avoid sidebar space on mobile during hydration
  const shouldShowNav = !isLogin && user;

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex min-h-screen">
      {shouldShowNav && (
        <Suspense fallback={<LoadingFallback />}>
          <Sidebar />
        </Suspense>
      )}

      <div 
        className={clsx("relative flex flex-1 flex-col min-w-0 min-h-screen")}
        style={shouldShowNav && !isMobile ? { marginLeft: `${sidebarWidth}px` } : undefined}
      >
        {shouldShowNav && <TopNavbar />}
        <main
          className={clsx('flex-1', {
            'bg-slate-50 px-3 pb-24 pt-4 sm:px-4 md:px-6 md:pb-8 md:pt-6 dark:bg-slate-950': !isLogin,
          })}
        >
          {shouldShowNav && (
            <Suspense fallback={null}>
              <Breadcrumbs />
            </Suspense>
          )}
          <Suspense fallback={<LoadingFallback />}>{children}</Suspense>
        </main>
        {shouldShowNav && (
          <div className="md:hidden">
            <Suspense fallback={null}>
              <BottomNav />
            </Suspense>
          </div>
        )}
        {shouldShowNav && (
          <Suspense fallback={null}>
            <FloatingAIChatbot />
          </Suspense>
        )}
      </div>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isLogin =
    pathname === '/login' ||
    pathname === '/' ||
    pathname === '/signup' ||
    pathname === '/test-login' ||
    pathname === '/anonymous-report';
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    onSyncError(handleSyncError);
    return () => offSyncError(handleSyncError);
  }, []);

  function handleSyncError(message: string) {
    setSyncError(message);
    setTimeout(() => setSyncError(null), 5000);
  }

  return (
    <html lang="en" suppressHydrationWarning className={theme === 'dark' ? 'dark' : ''}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="Campus Reports - Kapasa Makasa University Student Discipline Management System" />
        <meta name="theme-color" content="#10B981" />
        <link rel="preload" href="/kmu_logo.svg" as="image" type="image/svg+xml" />
        <link rel="dns-prefetch" href="//kmu-disciplinedesk.onrender.com" />
        <link rel="preconnect" href="https://kmu-disciplinedesk.onrender.com" />
        <title>Campus Reports</title>
      </head>
      <body className="min-h-screen">
        {syncError && <div className="fixed left-0 right-0 top-0 z-50 bg-red-600 p-3 text-center text-white">{syncError}</div>}

        <AuthProvider>
          <SyncProvider>
            <ThemeProvider>
              <SidebarProvider>
                <AppContent isLogin={isLogin}>{children}</AppContent>

                <Suspense fallback={null}>
                  <ServiceWorkerRegistration />
                </Suspense>
                <Suspense fallback={null}>
                  <PreloadProgress />
                </Suspense>
                <Suspense fallback={null}>
                  <CacheStatus />
                </Suspense>
                <Suspense fallback={null}>
                  <OfflineIndicator />
                </Suspense>
                <Suspense fallback={null}>
                  <SyncManagerClient />
                </Suspense>
              </SidebarProvider>
            </ThemeProvider>
          </SyncProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
