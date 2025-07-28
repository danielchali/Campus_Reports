import { indexedDB } from './indexedDB';
import { API_BASE_URL } from '../config/constants';

export interface ApiResponse<T> {
  data: T;
  offline: boolean;
  cached: boolean;
  timestamp: number;
}

export interface SyncConflict {
  local: any;
  remote: any;
  entity: string;
  id: string;
  timestamp: number;
}

class OfflineApiService {
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      throw new Error('Offline API service requires browser environment');
    }
    
    try {
      await indexedDB.init();
      this.isInitialized = true;
      console.log('Offline API service initialized');
    } catch (error) {
      console.error('Failed to initialize offline API service:', error);
      throw error;
    }
  }

  // Generic GET method with offline-first strategy
  async get<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    await this.init();
    
    try {
      // Try network first
      if (navigator.onLine) {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers,
          },
        });

        if (response.ok) {
          const data = await response.json();
          
          // Cache the response
          await this.cacheResponse(endpoint, data);
          
          return {
            data,
            offline: false,
            cached: false,
            timestamp: Date.now()
          };
        }
      }
    } catch (error) {
      console.log('Network request failed, using cached data:', error);
    }

    // Fallback to cached data
    const cachedData = await this.getCachedData(endpoint);
    if (cachedData) {
      return {
        data: cachedData,
        offline: true,
        cached: true,
        timestamp: Date.now()
      };
    }

    throw new Error('No data available offline');
  }

  // Generic POST method with offline queueing
  async post<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    await this.init();

    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers,
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const responseData = await response.json();
          
          // Cache the response
          await this.cacheResponse(endpoint, responseData);
          
          return {
            data: responseData,
            offline: false,
            cached: false,
            timestamp: Date.now()
          };
        }
      } catch (error) {
        console.log('Network POST failed, queuing for sync:', error);
      }
    }

    // Queue for offline sync
    const entity = this.getEntityFromEndpoint(endpoint);
    await indexedDB.addToSyncQueue(entity, 'create', data);
    
    // Store locally for immediate use
    const localId = `local_${Date.now()}`;
    const localData = { ...data, _id: localId, _local: true };
    await this.storeLocally(entity, localData);

    return {
      data: localData as T,
      offline: true,
      cached: true,
      timestamp: Date.now()
    };
  }

  // Generic PUT method with conflict resolution
  async put<T>(endpoint: string, data: any, options: RequestInit = {}): Promise<ApiResponse<T>> {
    await this.init();

    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...this.getAuthHeaders(),
            ...options.headers,
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          const responseData = await response.json();
          
          // Update local cache
          await this.updateLocalData(this.getEntityFromEndpoint(endpoint), responseData);
          
          return {
            data: responseData,
            offline: false,
            cached: false,
            timestamp: Date.now()
          };
        }
      } catch (error) {
        console.log('Network PUT failed, queuing for sync:', error);
      }
    }

    // Queue for offline sync
    const entity = this.getEntityFromEndpoint(endpoint);
    await indexedDB.addToSyncQueue(entity, 'update', data);
    
    // Update locally
    await this.updateLocalData(entity, data);

    return {
      data: data as T,
      offline: true,
      cached: true,
      timestamp: Date.now()
    };
  }

  // Generic DELETE method
  async delete<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    await this.init();

    if (navigator.onLine) {
      try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          method: 'DELETE',
          headers: {
            ...this.getAuthHeaders(),
            ...options.headers,
          },
        });

        if (response.ok) {
          // Remove from local cache
          const entity = this.getEntityFromEndpoint(endpoint);
          const id = this.getIdFromEndpoint(endpoint);
          if (id) {
            await this.removeLocalData(entity, id);
          }
          
          return {
            data: { success: true } as T,
            offline: false,
            cached: false,
            timestamp: Date.now()
          };
        }
      } catch (error) {
        console.log('Network DELETE failed, queuing for sync:', error);
      }
    }

    // Queue for offline sync
    const entity = this.getEntityFromEndpoint(endpoint);
    const id = this.getIdFromEndpoint(endpoint);
    if (id) {
      await indexedDB.addToSyncQueue(entity, 'delete', { id });
      
      // Mark as deleted locally
      await this.markAsDeleted(entity, id);
    }

    return {
      data: { success: true, offline: true } as T,
      offline: true,
      cached: true,
      timestamp: Date.now()
    };
  }

  // Sync all queued changes
  async syncAll(): Promise<void> {
    await this.init();
    
    if (!navigator.onLine) {
      throw new Error('Cannot sync while offline');
    }

    const syncQueue = await indexedDB.getSyncQueue();
    const unsyncedItems = syncQueue.filter(item => !item.synced);

    for (const item of unsyncedItems) {
      try {
        await this.syncItem(item);
        await indexedDB.markSynced(item.id);
      } catch (error) {
        console.error('Failed to sync item:', item, error);
      }
    }

    // Clean up synced items
    await indexedDB.clearSyncedItems();
  }

  // Sync a single item with conflict resolution
  private async syncItem(item: any): Promise<void> {
    const { entity, action, data } = item;
    
    try {
      switch (action) {
        case 'create':
          await this.syncCreate(entity, data);
          break;
        case 'update':
          await this.syncUpdate(entity, data);
          break;
        case 'delete':
          await this.syncDelete(entity, data);
          break;
      }
    } catch (error: any) {
      // Handle conflicts
      if (error.message?.includes('conflict')) {
        await this.handleConflict(entity, data, error);
      } else {
        throw error;
      }
    }
  }

  // Handle sync conflicts
  private async handleConflict(entity: string, localData: any, error: any): Promise<void> {
    const conflict: SyncConflict = {
      local: localData,
      remote: error.remoteData,
      entity,
      id: localData._id || localData.id,
      timestamp: Date.now()
    };

    // Store conflict for user resolution
    await indexedDB.put('syncQueue', {
      ...conflict,
      type: 'conflict',
      resolved: false
    });

    // For now, use "last write wins" strategy
    // In a real app, you'd show a UI for user to choose
    const useLocal = localData._timestamp > error.remoteData._timestamp;
    
    if (useLocal) {
      // Force update with local data
      await this.forceUpdate(entity, localData);
    } else {
      // Accept remote data
      await this.updateLocalData(entity, error.remoteData);
    }
  }

  // Cache management methods
  private async cacheResponse(endpoint: string, data: any): Promise<void> {
    const entity = this.getEntityFromEndpoint(endpoint);
    
    if (Array.isArray(data)) {
      await indexedDB.putAll(entity, data);
    } else if (data.cases) {
      await indexedDB.putAll('cases', data.cases);
    } else if (data.students) {
      await indexedDB.putAll('students', data.students);
    } else if (data.evidence) {
      await indexedDB.putAll('evidence', data.evidence);
    } else {
      await indexedDB.put(entity, data);
    }

    await indexedDB.setLastSyncTime(entity, Date.now());
  }

  private async getCachedData(endpoint: string): Promise<any> {
    const entity = this.getEntityFromEndpoint(endpoint);
    const id = this.getIdFromEndpoint(endpoint);
    
    if (id) {
      return await indexedDB.get(entity, id);
    } else {
      return await indexedDB.getAll(entity);
    }
  }

  private async storeLocally(entity: string, data: any): Promise<void> {
    await indexedDB.put(entity, data);
  }

  private async updateLocalData(entity: string, data: any): Promise<void> {
    await indexedDB.put(entity, data);
  }

  private async removeLocalData(entity: string, id: string): Promise<void> {
    await indexedDB.delete(entity, id);
  }

  private async markAsDeleted(entity: string, id: string): Promise<void> {
    const data = await indexedDB.get(entity, id);
    if (data) {
      (data as any)._deleted = true;
      (data as any)._deletedAt = Date.now();
      await indexedDB.put(entity, data);
    }
  }

  // Sync methods
  private async syncCreate(entity: string, data: any): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${entity}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Create failed: ${errorData.error || response.statusText}`);
    }

    const responseData = await response.json();
    await this.updateLocalData(entity, responseData);
  }

  private async syncUpdate(entity: string, data: any): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${entity}/${data._id || data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Update failed: ${errorData.error || response.statusText}`);
    }

    const responseData = await response.json();
    await this.updateLocalData(entity, responseData);
  }

  private async syncDelete(entity: string, data: any): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${entity}/${data.id}`, {
      method: 'DELETE',
      headers: {
        ...this.getAuthHeaders(),
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Delete failed: ${errorData.error || response.statusText}`);
    }

    await this.removeLocalData(entity, data.id);
  }

  private async forceUpdate(entity: string, data: any): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/${entity}/${data._id || data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeaders(),
        'X-Force-Update': 'true',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Force update failed: ${response.statusText}`);
    }
  }

  // Utility methods
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private getEntityFromEndpoint(endpoint: string): string {
    const parts = endpoint.split('/').filter(Boolean);
    return parts[0] || 'unknown';
  }

  private getIdFromEndpoint(endpoint: string): string | null {
    const parts = endpoint.split('/').filter(Boolean);
    return parts.length > 1 ? parts[1] : null;
  }

  // Get sync status
  async getSyncStatus(): Promise<{
    pendingChanges: number;
    lastSync: number | null;
    conflicts: number;
  }> {
    await this.init();
    
    const syncQueue = await indexedDB.getSyncQueue();
    const pendingChanges = syncQueue.filter(item => !item.synced).length;
    const conflicts = syncQueue.filter(item => item.type === 'conflict').length;
    const lastSync = await indexedDB.getLastSyncTime('global');

    return {
      pendingChanges,
      lastSync,
      conflicts
    };
  }

  // Clear all cached data
  async clearCache(): Promise<void> {
    await this.init();
    
    const stores = ['students', 'cases', 'evidence', 'users', 'settings'];
    for (const store of stores) {
      await indexedDB.clear(store);
    }
  }
}

// Export singleton instance
export const offlineApi = new OfflineApiService();
export default offlineApi; 