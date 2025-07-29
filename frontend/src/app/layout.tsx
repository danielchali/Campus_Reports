"use client";

import '../globals.css';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { useState, useEffect, createContext, useContext, Suspense, lazy } from 'react';
import { usePathname } from 'next/navigation';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { useRouter } from 'next/navigation';
import { SyncProvider, useSync } from '../context/SyncContext';
import { useSyncManager } from '../hooks/useSyncManager';
import { useOfflineSync } from '../hooks/useOfflineSync';
import { SidebarProvider, useSidebar } from '../context/SidebarContext';

// Lazy load heavy components
const SyncManagerClient = lazy(() => import('../components/SyncManagerClient'));
const ServiceWorkerRegistration = lazy(() => import('../components/ServiceWorkerRegistration'));
const PreloadProgress = lazy(() => import('../components/PreloadProgress'));
const CacheStatus = lazy(() => import('../components/CacheStatus'));
const OfflineIndicator = lazy(() => import('../components/OfflineIndicator'));

import clsx from 'clsx';
import { API_BASE_URL } from '../config/constants';
import { onSyncError, offSyncError } from '../hooks/useSyncManager';

// Optimized nav icons - using simple emojis for faster loading
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

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-kmuGreen"></div>
  </div>
);

// Lazy load Sidebar component
const Sidebar = lazy(() => import('../components/Sidebar'));

function TopNavbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            KMU Discipline Desk
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {user.name || user.username}
          </span>
          <button
            onClick={logout}
            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
        </nav>
  );
}

function AppContent({ isLogin, children }: { isLogin: boolean; children: React.ReactNode }) {
  const { user } = useAuth();
  const { sidebarWidth } = useSidebar();
  const [isMobile, setIsMobile] = useState(false);
  const shouldShowNav = !isLogin && user;

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Lazy load Sidebar */}
      {shouldShowNav && (
        <Suspense fallback={<LoadingFallback />}>
          <Sidebar />
        </Suspense>
      )}
      
      {/* Main content */}
      <div
        className="flex-1 flex flex-col relative"
        style={{
          marginLeft: shouldShowNav && !isMobile ? `${sidebarWidth}px` : '0px'
        }}
      >
        {/* Hide top navbar on mobile */}
        <div className="hidden md:block">
          {shouldShowNav && <TopNavbar />}
        </div>
        <main className="flex-1 px-2 py-2 md:px-6 md:py-8 overflow-x-hidden">
          <Suspense fallback={<LoadingFallback />}>
            {children}
          </Suspense>
        </main>
        </div>
              </div>
    );
  }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme } = useTheme();
  const isLogin = pathname === "/login" || pathname === "/";
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    onSyncError(handleSyncError);
    return () => offSyncError(handleSyncError);
  }, []);

  function handleSyncError(msg: string) {
    setSyncError(msg);
    setTimeout(() => setSyncError(null), 5000);
  }

  return (
    <html lang="en" suppressHydrationWarning className={theme === 'dark' ? 'dark' : ''}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="KMU Discipline Desk - Student Discipline Management System" />
        <meta name="theme-color" content="#10B981" />
        
        {/* Preload critical resources */}
        <link rel="preload" href="/kmu_logo.svg" as="image" type="image/svg+xml" />
        <link rel="preload" href="/api/health" as="fetch" crossOrigin="anonymous" />
        
        {/* DNS prefetch for external domains */}
        <link rel="dns-prefetch" href="//kmu-disciplinedesk.onrender.com" />
        
        {/* Preconnect to API */}
        <link rel="preconnect" href="https://kmu-disciplinedesk.onrender.com" />
        
        <title>KMU Discipline Desk</title>
      </head>
      <body className="min-h-screen">
        {syncError && (
          <div className="fixed top-0 left-0 right-0 bg-red-600 text-white p-3 text-center z-50">
            {syncError}
          </div>
        )}
        
        <AuthProvider>
          <SyncProvider>
            <ThemeProvider>
              <SidebarProvider>
                <AppContent isLogin={isLogin}>
                    {children}
                </AppContent>
              
                {/* Lazy load PWA components */}
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