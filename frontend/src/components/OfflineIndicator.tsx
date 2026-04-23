"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    // Set initial state
    setIsOffline(!navigator.onLine);

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline || !user) {
    return null;
  }

  return (
    <div className="fixed bottom-20 right-3 z-40 sm:bottom-6 sm:right-6">
      <div className="rounded-full border border-orange-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur dark:border-orange-900 dark:bg-gray-900/95">
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <span className="flex items-center text-red-600 dark:text-orange-400">
            <span className="mr-2 h-2 w-2 rounded-full bg-red-500 dark:bg-orange-400"></span>
            Offline
          </span>
          <span className="text-orange-600 dark:text-orange-300">
            Offline mode available
          </span>
        </div>
      </div>
    </div>
  );
}
