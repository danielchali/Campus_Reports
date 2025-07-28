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
    <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white p-3 text-center z-50">
      <div className="flex items-center justify-center space-x-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="font-medium">You're offline</span>
        <span className="text-sm opacity-90">- KMU Discipline Desk is working offline</span>
      </div>
    </div>
  );
} 