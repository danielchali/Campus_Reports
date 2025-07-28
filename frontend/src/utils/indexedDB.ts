export interface IndexedDBConfig {
  name: string;
  version: number;
  stores: {
    [key: string]: {
      keyPath: string;
      indexes?: Array<{
        name: string;
        keyPath: string;
        options?: IDBIndexParameters;
      }>;
    };
  };
}

const DB_CONFIG: IndexedDBConfig = {
  name: 'KMUDisciplineDesk',
  version: 1,
  stores: {
    students: {
      keyPath: '_id',
      indexes: [
        { name: 'studentId', keyPath: 'studentId' },
        { name: 'fullName', keyPath: 'fullName' },
        { name: 'department', keyPath: 'department' }
      ]
    },
    cases: {
      keyPath: '_id',
      indexes: [
        { name: 'studentId', keyPath: 'student_id' },
        { name: 'status', keyPath: 'status' },
        { name: 'severity', keyPath: 'severity' },
        { name: 'offenseType', keyPath: 'offense_type' },
        { name: 'createdAt', keyPath: 'createdAt' }
      ]
    },
    evidence: {
      keyPath: '_id',
      indexes: [
        { name: 'caseId', keyPath: 'case_id' },
        { name: 'fileName', keyPath: 'fileName' },
        { name: 'uploadedAt', keyPath: 'uploadedAt' }
      ]
    },
    users: {
      keyPath: '_id',
      indexes: [
        { name: 'username', keyPath: 'username' },
        { name: 'role', keyPath: 'role' },
        { name: 'email', keyPath: 'email' }
      ]
    },

    settings: {
      keyPath: 'key',
      indexes: [
        { name: 'category', keyPath: 'category' }
      ]
    },
    syncQueue: {
      keyPath: 'id',
      indexes: [
        { name: 'entity', keyPath: 'entity' },
        { name: 'action', keyPath: 'action' },
        { name: 'timestamp', keyPath: 'timestamp' },
        { name: 'synced', keyPath: 'synced' }
      ]
    },
    queuedRequests: {
      keyPath: 'id',
      indexes: [
        { name: 'method', keyPath: 'method' },
        { name: 'url', keyPath: 'url' },
        { name: 'timestamp', keyPath: 'timestamp' }
      ]
    }
  }
};

class IndexedDBService {
  private db: IDBDatabase | null = null;
  private config: IndexedDBConfig;

  constructor(config: IndexedDBConfig = DB_CONFIG) {
    this.config = config;
  }

  async init(): Promise<void> {
    if (this.db) return;

    // Check if we're in a browser environment with IndexedDB support
    if (typeof window === 'undefined' || !window.indexedDB) {
      throw new Error('IndexedDB is not available in this environment');
    }

    return new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.config.name, this.config.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        Object.entries(this.config.stores).forEach(([storeName, storeConfig]) => {
          if (!db.objectStoreNames.contains(storeName)) {
            const objectStore = db.createObjectStore(storeName, { keyPath: storeConfig.keyPath });

            // Create indexes
            storeConfig.indexes?.forEach(index => {
              objectStore.createIndex(index.name, index.keyPath, index.options);
            });
          }
        });
      };
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAll<T>(storeName: string, indexName?: string, indexValue?: any): Promise<T[]> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      let request: IDBRequest;

      if (indexName && indexValue !== undefined) {
        const index = store.index(indexName);
        request = index.getAll(indexValue);
      } else {
        request = store.getAll();
      }

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async put<T>(storeName: string, data: T): Promise<string> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result as string);
    });
  }

  async putAll<T>(storeName: string, dataArray: T[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      let completed = 0;
      const total = dataArray.length;

      if (total === 0) {
        resolve();
        return;
      }

      dataArray.forEach(data => {
        const request = store.put(data);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
      });
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(storeName: string): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async count(storeName: string): Promise<number> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Sync queue methods
  async addToSyncQueue(entity: string, action: 'create' | 'update' | 'delete', data: any): Promise<void> {
    const syncItem = {
      entity,
      action,
      data,
      timestamp: Date.now(),
      synced: false
    };

    await this.put('syncQueue', syncItem);
  }

  async getSyncQueue(): Promise<any[]> {
    return this.getAll('syncQueue');
  }

  async markSynced(id: number): Promise<void> {
    const item = await this.get('syncQueue', id.toString());
    if (item) {
      (item as any).synced = true;
      await this.put('syncQueue', item);
    }
  }

  async clearSyncedItems(): Promise<void> {
    const allItems = await this.getAll('syncQueue');
    const syncedItems = allItems.filter((item: any) => item.synced);
    
    for (const item of syncedItems) {
      await this.delete('syncQueue', (item as any).id);
    }
  }

  // Queue requests for offline mode
  async queueRequest(method: string, url: string, data?: any): Promise<void> {
    const queuedRequest = {
      method,
      url,
      data,
      timestamp: Date.now()
    };

    await this.put('queuedRequests', queuedRequest);
  }

  async getQueuedRequests(): Promise<any[]> {
    return this.getAll('queuedRequests');
  }

  async removeQueuedRequest(id: number): Promise<void> {
    await this.delete('queuedRequests', id.toString());
  }

  // Utility methods
  async isOnline(): Promise<boolean> {
    return navigator.onLine;
  }

  async getLastSyncTime(storeName: string): Promise<number | null> {
    const setting = await this.get('settings', `lastSync_${storeName}`);
    return setting ? (setting as any).value : null;
  }

  async setLastSyncTime(storeName: string, timestamp: number): Promise<void> {
    await this.put('settings', {
      key: `lastSync_${storeName}`,
      value: timestamp,
      category: 'sync'
    });
  }

  // Close database connection
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const indexedDB = new IndexedDBService();
export default indexedDB; 