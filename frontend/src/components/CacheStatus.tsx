"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { offlineApi } from '../utils/offlineApi';

interface CacheStats {
  students: number;
  cases: number;
  evidence: number;
  users: number;
  settings: number;
}

export default function CacheStatus() {
  const { user, isOnline } = useAuth();
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (user) {
      loadCacheStats();
      // Show cache status briefly after login
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 5000);
    }
  }, [user]);

  const loadCacheStats = async () => {
    try {
      const stats = await offlineApi.getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  };

  const getOfflineStatus = () => {
    if (!cacheStats) return 'Loading...';
    
    const totalItems = cacheStats.students + cacheStats.cases + cacheStats.evidence + cacheStats.users;
    
    if (totalItems === 0) return 'No offline data';
    if (totalItems < 10) return 'Limited offline data';
    if (totalItems < 50) return 'Basic offline data';
    return 'Full offline data available';
  };

  const getStatusColor = () => {
    if (!cacheStats) return 'text-gray-500';
    
    const totalItems = cacheStats.students + cacheStats.cases + cacheStats.evidence + cacheStats.users;
    
    if (totalItems === 0) return 'text-red-500';
    if (totalItems < 10) return 'text-yellow-500';
    if (totalItems < 50) return 'text-blue-500';
    return 'text-green-500';
  };

  if (!user || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-40 max-w-sm border border-gray-200 dark:border-gray-700">
      <div className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
        
        <div className="mt-2">
          <span className={`text-xs ${getStatusColor()}`}>
            {getOfflineStatus()}
          </span>
        </div>

        {isExpanded && cacheStats && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Students:</span>
                <span className="font-medium">{cacheStats.students}</span>
              </div>
              <div className="flex justify-between">
                <span>Cases:</span>
                <span className="font-medium">{cacheStats.cases}</span>
              </div>
              <div className="flex justify-between">
                <span>Evidence:</span>
                <span className="font-medium">{cacheStats.evidence}</span>
              </div>
              <div className="flex justify-between">
                <span>Users:</span>
                <span className="font-medium">{cacheStats.users}</span>
              </div>
            </div>
            
            <button
              onClick={loadCacheStats}
              className="mt-2 w-full text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 transition"
            >
              Refresh Stats
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 