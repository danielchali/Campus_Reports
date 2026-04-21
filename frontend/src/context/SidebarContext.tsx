"use client";

import { createContext, useContext, useState } from 'react';

interface SidebarContextType {
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (isOpen: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType>({
  sidebarWidth: 256,
  setSidebarWidth: () => {},
  isOpenMobile: false,
  setIsOpenMobile: () => {},
});

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  return (
    <SidebarContext.Provider value={{ sidebarWidth, setSidebarWidth, isOpenMobile, setIsOpenMobile }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export { SidebarContext };