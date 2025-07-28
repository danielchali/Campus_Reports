import { useEffect, useState, useCallback } from 'react';
import { offlineApi, ApiResponse } from '../utils/offlineApi';
import { indexedDB } from '../utils/indexedDB';
import { useAuth } from '../context/AuthContext';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSync: number | null;
  pendingChanges: number;
  conflicts: number;
  error: string | null;
}

export interface SyncConflict {
  id: string;
  entity: string;
  local: any;
  remote: any;
  timestamp: number;
}

export function useOfflineSync() {
  const { token } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    pendingChanges: 0,
    conflicts: 0,
    error: null
  });
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  // Check online status
  const checkOnlineStatus = useCallback(() => {
    const isOnline = navigator.onLine;
    setSyncStatus(prev => ({ ...prev, isOnline }));
  }, []);

  // Update sync status
  const updateSyncStatus = useCallback(async () => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        return;
      }
      
      const status = await offlineApi.getSyncStatus();
      setSyncStatus(prev => ({
        ...prev,
        lastSync: status.lastSync,
        pendingChanges: status.pendingChanges,
        conflicts: status.conflicts
      }));
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }, []);

  // Sync all changes
  const syncAll = useCallback(async () => {
    if (!token || !navigator.onLine) {
      setSyncStatus(prev => ({ ...prev, error: 'Cannot sync while offline or not authenticated' }));
      return;
    }

    setSyncStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      await offlineApi.syncAll();
      await updateSyncStatus();
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncStatus(prev => ({ 
        ...prev, 
        isSyncing: false, 
        error: error instanceof Error ? error.message : 'Sync failed' 
      }));
    }
  }, [token, updateSyncStatus]);

  // Load conflicts
  const loadConflicts = useCallback(async () => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        return;
      }
      
      const syncQueue = await indexedDB.getSyncQueue();
      const conflictItems = syncQueue.filter(item => item.type === 'conflict' && !item.resolved);
      
      const formattedConflicts: SyncConflict[] = conflictItems.map(item => ({
        id: item.id,
        entity: item.entity,
        local: item.local,
        remote: item.remote,
        timestamp: item.timestamp
      }));

      setConflicts(formattedConflicts);
    } catch (error) {
      console.error('Failed to load conflicts:', error);
    }
  }, []);

  // Resolve conflict
  const resolveConflict = useCallback(async (conflictId: string, useLocal: boolean) => {
    try {
      const conflict = conflicts.find(c => c.id === conflictId);
      if (!conflict) return;

      if (useLocal) {
        // Use local data
        await offlineApi.put(`/${conflict.entity}/${conflict.local._id || conflict.local.id}`, conflict.local);
      } else {
        // Use remote data
        await indexedDB.put(conflict.entity, conflict.remote);
      }

      // Mark conflict as resolved
      await indexedDB.put('syncQueue', {
        id: conflictId,
        type: 'conflict',
        resolved: true,
        resolvedAt: Date.now(),
        useLocal
      });

      // Reload conflicts and update status
      await loadConflicts();
      await updateSyncStatus();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      setSyncStatus(prev => ({ 
        ...prev, 
        error: 'Failed to resolve conflict' 
      }));
    }
  }, [conflicts, loadConflicts, updateSyncStatus]);

  // Clear all conflicts
  const clearAllConflicts = useCallback(async () => {
    try {
      const syncQueue = await indexedDB.getSyncQueue();
      const conflictItems = syncQueue.filter(item => item.type === 'conflict');
      
      for (const item of conflictItems) {
        await indexedDB.delete('syncQueue', item.id);
      }

      setConflicts([]);
      await updateSyncStatus();
    } catch (error) {
      console.error('Failed to clear conflicts:', error);
    }
  }, [updateSyncStatus]);

  // Clear cache
  const clearCache = useCallback(async () => {
    try {
      await offlineApi.clearCache();
      await updateSyncStatus();
      setConflicts([]);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, [updateSyncStatus]);

  // Initialize sync
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }
    
    checkOnlineStatus();
    updateSyncStatus();
    loadConflicts();

    // Set up event listeners
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);

    // Set up periodic status updates
    const statusInterval = setInterval(updateSyncStatus, 30000); // Every 30 seconds

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', checkOnlineStatus);
        window.removeEventListener('offline', checkOnlineStatus);
      }
      clearInterval(statusInterval);
    };
  }, [checkOnlineStatus, updateSyncStatus, loadConflicts]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (syncStatus.isOnline && token && syncStatus.pendingChanges > 0) {
      const syncTimeout = setTimeout(syncAll, 2000); // Wait 2 seconds after coming online
      return () => clearTimeout(syncTimeout);
    }
  }, [syncStatus.isOnline, token, syncStatus.pendingChanges, syncAll]);

  return {
    syncStatus,
    conflicts,
    syncAll,
    resolveConflict,
    clearAllConflicts,
    clearCache,
    updateSyncStatus
  };
}

// Hook for using offline API with automatic sync
export function useOfflineApi() {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiCall = useCallback(async <T>(
    method: 'get' | 'post' | 'put' | 'delete',
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('Offline API requires browser environment');
    }
    
    setIsLoading(true);
    setError(null);

    try {
      let response: ApiResponse<T>;

      switch (method) {
        case 'get':
          response = await offlineApi.get<T>(endpoint);
          break;
        case 'post':
          response = await offlineApi.post<T>(endpoint, data);
          break;
        case 'put':
          response = await offlineApi.put<T>(endpoint, data);
          break;
        case 'delete':
          response = await offlineApi.delete<T>(endpoint);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }

      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'API call failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    apiCall,
    isLoading,
    error,
    clearError: () => setError(null)
  };
} 