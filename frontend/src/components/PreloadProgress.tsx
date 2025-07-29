"use client";

import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

export default function PreloadProgress() {
  const { isPreloading } = useAuth();
  const [showIndicator, setShowIndicator] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (isPreloading) {
      // Only show indicator if preloading takes longer than 2 seconds
      timeoutId = setTimeout(() => {
        setShowIndicator(true);
      }, 2000);
    } else {
      setShowIndicator(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isPreloading]);

  if (!showIndicator) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-3 py-2 rounded-lg shadow-lg z-50 max-w-sm opacity-90 hover:opacity-100 transition-opacity">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        <span className="text-xs font-medium">Preparing offline data...</span>
      </div>
    </div>
  );
} 