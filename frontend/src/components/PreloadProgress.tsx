"use client";

import { useAuth } from '../context/AuthContext';

export default function PreloadProgress() {
  const { isPreloading } = useAuth();

  if (!isPreloading) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
      <div className="flex items-center space-x-3">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        <div>
          <h3 className="font-semibold text-sm">Preloading Data</h3>
          <p className="text-xs opacity-90">Preparing offline functionality...</p>
        </div>
      </div>
    </div>
  );
} 