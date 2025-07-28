import React, { createContext, useContext, useState } from 'react';

interface SyncContextType {
  isSyncing: boolean;
  syncError: string | null;
  setSyncing: (v: boolean) => void;
  setSyncError: (e: string | null) => void;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [isSyncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  return (
    <SyncContext.Provider value={{ isSyncing, syncError, setSyncing, setSyncError }}>
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error('useSync must be used within SyncProvider');
  return context;
}