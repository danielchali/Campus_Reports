import { useEffect } from 'react';
import { useSync } from '../context/SyncContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config/constants';
import { authFetch } from '../utils/api';
import type { User, Case, Student, Evidence, AuditLog } from '../../types/global.d';

type Entity = 'students' | 'cases' | 'evidence' | 'users' | 'settings';
interface SyncData {
  id: string;
  [key: string]: any;
}

type Change = {
  entity: Entity;
  type: 'add' | 'update' | 'delete';
  data: SyncData;
};

let changeQueue: Change[] = [];

function isOnline() {
  return typeof window !== 'undefined' && window.navigator.onLine;
}

export const syncErrorListeners: ((msg: string) => void)[] = [];
export function onSyncError(listener: (msg: string) => void) {
  syncErrorListeners.push(listener);
}
export function offSyncError(listener: (msg: string) => void) {
  const idx = syncErrorListeners.indexOf(listener);
  if (idx !== -1) syncErrorListeners.splice(idx, 1);
}

export function useSyncManager() {
  const { isSyncing, setSyncing, syncError, setSyncError } = useSync();
  const { token } = useAuth();

  async function syncAll() {
    setSyncing(true);
    setSyncError(null);
    try {
      await pushChanges();
      await pullUpdates();
      setSyncing(false);
    } catch (err: any) {
      setSyncError(err?.message || 'Sync failed');
      syncErrorListeners.forEach(fn => fn(err?.message || 'Sync failed'));
      setSyncing(false);
    }
  }

  async function pushChanges() {
    for (const change of changeQueue) {
      try {
        const endpoint = `${API_BASE_URL}/${change.entity}`;
        let url = endpoint;
        let method = 'POST';
        
        if (change.type === 'update' || change.type === 'delete') {
          url = `${endpoint}/${change.data.id}`;
          method = change.type === 'update' ? 'PUT' : 'DELETE';
        }

        const response = await authFetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: change.type === 'delete' ? undefined : JSON.stringify(change.data),
        }, token);

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
      } catch (err) {
        throw err instanceof Error ? err : new Error('Unknown error during sync');
      }
    }
    changeQueue = [];
  }

  async function pullUpdates() {
    const entities: Entity[] = ['students', 'cases', 'evidence', 'users', 'settings'];
    const results: Record<Entity, any[]> = {} as any;
    for (const entity of entities) {
      try {
        const res = await authFetch(`${API_BASE_URL}/${entity}`, {}, token);
        if (!res.ok) throw new Error(await res.text());
        results[entity] = await res.json();
      } catch (err) {
        setSyncError(`Failed to fetch ${entity}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    return results;
  }

  function queueChange(entity: Entity, type: 'add' | 'update' | 'delete', data: any) {
    changeQueue.push({ entity, type, data });
    if (isOnline() && token) {
      syncAll();
    }
  }

  useEffect(() => {
    function handleOnline() {
      if (token) syncAll();
    }
    window.addEventListener('online', handleOnline);
    if (isOnline() && token) {
      syncAll();
    }
    return () => {
      window.removeEventListener('online', handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return { queueChange, isSyncing, syncError };
}