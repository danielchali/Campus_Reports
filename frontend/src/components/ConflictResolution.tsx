"use client";

import { useState } from 'react';
import { SyncConflict } from '../hooks/useOfflineSync';

interface ConflictResolutionProps {
  conflicts: SyncConflict[];
  onResolve: (conflictId: string, useLocal: boolean) => Promise<void>;
  onClearAll: () => Promise<void>;
  onClose: () => void;
}

export default function ConflictResolution({ 
  conflicts, 
  onResolve, 
  onClearAll, 
  onClose 
}: ConflictResolutionProps) {
  const [resolving, setResolving] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);

  const handleResolve = async (conflictId: string, useLocal: boolean) => {
    setResolving(conflictId);
    try {
      await onResolve(conflictId, useLocal);
    } finally {
      setResolving(null);
    }
  };

  const handleClearAll = async () => {
    setClearing(true);
    try {
      await onClearAll();
      onClose();
    } finally {
      setClearing(false);
    }
  };

  const formatData = (data: any) => {
    if (typeof data === 'object') {
      return Object.entries(data)
        .filter(([key]) => !key.startsWith('_'))
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    return String(data);
  };

  const getEntityDisplayName = (entity: string) => {
    const displayNames: Record<string, string> = {
      students: 'Student',
      cases: 'Case',
      evidence: 'Evidence',
      users: 'User',
      
      settings: 'Setting'
    };
    return displayNames[entity] || entity;
  };

  if (conflicts.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Sync Conflicts ({conflicts.length})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear All'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Close
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)] p-6">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {getEntityDisplayName(conflict.entity)} Conflict
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(conflict.timestamp).toLocaleString()}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Local Version
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {formatData(conflict.local)}
                  </p>
                </div>

                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-2">
                    Server Version
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    {formatData(conflict.remote)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleResolve(conflict.id, true)}
                  disabled={resolving === conflict.id}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {resolving === conflict.id ? 'Resolving...' : 'Use Local'}
                </button>
                <button
                  onClick={() => handleResolve(conflict.id, false)}
                  disabled={resolving === conflict.id}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                >
                  {resolving === conflict.id ? 'Resolving...' : 'Use Server'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 