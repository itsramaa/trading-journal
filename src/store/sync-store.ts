/**
 * Global Sync Store - Persistent state for Binance Full Sync
 * 
 * This store ensures sync state persists across navigation.
 * The actual sync runs in useBinanceAggregatedSync hook,
 * but state is stored here globally.
 */

import { create } from 'zustand';
import type { AggregationProgress, AggregationResult } from '@/services/binance/types';

// =============================================================================
// Types
// =============================================================================

export type FullSyncStatus = 'idle' | 'running' | 'success' | 'error';

interface SyncStoreState {
  // Full Sync State
  fullSyncStatus: FullSyncStatus;
  fullSyncProgress: AggregationProgress | null;
  fullSyncResult: AggregationResult | null;
  fullSyncError: string | null;
  fullSyncStartTime: number | null;
  
  // Actions
  startFullSync: () => void;
  updateProgress: (progress: AggregationProgress) => void;
  completeFullSync: (result: AggregationResult) => void;
  failFullSync: (error: string) => void;
  resetFullSync: () => void;
}

// =============================================================================
// Store
// =============================================================================

export const useSyncStore = create<SyncStoreState>((set, get) => ({
  // Initial State
  fullSyncStatus: 'idle',
  fullSyncProgress: null,
  fullSyncResult: null,
  fullSyncError: null,
  fullSyncStartTime: null,
  
  // Actions
  startFullSync: () => {
    // Guard: prevent starting if already running
    if (get().fullSyncStatus === 'running') {
      console.warn('[SyncStore] Attempted to start sync while already running');
      return;
    }
    
    set({
      fullSyncStatus: 'running',
      fullSyncProgress: null,
      fullSyncResult: null,
      fullSyncError: null,
      fullSyncStartTime: Date.now(),
    });
  },
  
  updateProgress: (progress: AggregationProgress) => {
    set({ fullSyncProgress: progress });
  },
  
  completeFullSync: (result: AggregationResult) => {
    set({
      fullSyncStatus: 'success',
      fullSyncProgress: null,
      fullSyncResult: result,
      fullSyncError: null,
    });
  },
  
  failFullSync: (error: string) => {
    set({
      fullSyncStatus: 'error',
      fullSyncProgress: null,
      fullSyncError: error,
    });
  },
  
  resetFullSync: () => {
    set({
      fullSyncStatus: 'idle',
      fullSyncProgress: null,
      fullSyncResult: null,
      fullSyncError: null,
      fullSyncStartTime: null,
    });
  },
}));

// =============================================================================
// Selectors (for optimized re-renders)
// =============================================================================

export const selectIsFullSyncRunning = (state: SyncStoreState) => 
  state.fullSyncStatus === 'running';

export const selectFullSyncProgress = (state: SyncStoreState) => 
  state.fullSyncProgress;

export const selectFullSyncResult = (state: SyncStoreState) => 
  state.fullSyncResult;

export const selectFullSyncStatus = (state: SyncStoreState) => 
  state.fullSyncStatus;
