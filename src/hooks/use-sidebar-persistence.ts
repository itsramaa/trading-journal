/**
 * Hook for persisting sidebar expanded/collapsed state to localStorage
 */
import { useState, useEffect, useCallback } from "react";

const SIDEBAR_STATE_KEY = "trading-journey-sidebar-state";

export type SidebarState = "expanded" | "collapsed";

interface UseSidebarPersistenceReturn {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export function useSidebarPersistence(defaultOpen = true): UseSidebarPersistenceReturn {
  // Initialize from localStorage or default
  const [sidebarOpen, setSidebarOpenState] = useState<boolean>(() => {
    if (typeof window === "undefined") return defaultOpen;
    
    const stored = localStorage.getItem(SIDEBAR_STATE_KEY);
    if (stored === null) return defaultOpen;
    
    return stored === "expanded";
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STATE_KEY, sidebarOpen ? "expanded" : "collapsed");
  }, [sidebarOpen]);

  const setSidebarOpen = useCallback((open: boolean) => {
    setSidebarOpenState(open);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpenState((prev) => !prev);
  }, []);

  return {
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
  };
}
