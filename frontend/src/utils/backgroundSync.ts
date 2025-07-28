import { offlineApi } from './offlineApi';

class BackgroundSyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  // Start background sync with configurable interval (default: 5 minutes)
  start(intervalMinutes: number = 5): void {
    if (this.isRunning) {
      console.log('Background sync already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting background sync every ${intervalMinutes} minutes`);

    // Initial sync
    this.performSync();

    // Set up periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMinutes * 60 * 1000);
  }

  // Stop background sync
  stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.isRunning = false;
    console.log('Background sync stopped');
  }

  // Perform a single sync operation
  private async performSync(): Promise<void> {
    if (!navigator.onLine) {
      console.log('Skipping background sync - offline');
      return;
    }

    try {
      console.log('Performing background sync...');
      
      // Sync pending changes
      await offlineApi.syncAll();
      
      // Refresh critical data
      await this.refreshCriticalData();
      
      console.log('Background sync completed successfully');
    } catch (error) {
      console.error('Background sync failed:', error);
    }
  }

  // Refresh critical data in the background
  private async refreshCriticalData(): Promise<void> {
    try {
      const refreshPromises = [
        offlineApi.get('/students?limit=100').catch(err => console.warn('Failed to refresh students:', err)),
        offlineApi.get('/cases?limit=100').catch(err => console.warn('Failed to refresh cases:', err)),
      ];

      await Promise.allSettled(refreshPromises);
      console.log('Critical data refreshed');
    } catch (error) {
      console.error('Failed to refresh critical data:', error);
    }
  }

  // Get sync status
  isActive(): boolean {
    return this.isRunning;
  }

  // Force immediate sync
  async forceSync(): Promise<void> {
    console.log('Forcing immediate sync...');
    await this.performSync();
  }
}

// Export singleton instance
export const backgroundSync = new BackgroundSyncService();
export default backgroundSync; 