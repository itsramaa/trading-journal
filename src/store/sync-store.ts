/**
 * Global Sync Store - Persistent state for Binance Full Sync
 * 
 * This store ensures sync state persists across navigation.
 * The actual sync runs in useBinanceAggregatedSync hook,
 * but state is stored here globally.
 * 
 * Features:
 * - Checkpoint-based resume capability
 * - LocalStorage persistence for crash recovery
 * - ETA calculation with phase weights
 * - Incremental sync support (tracks last sync timestamp)
 * - Sync Quality tracking
 */

import { create } from 'zustand';
import type { AggregationProgress, AggregationResult, SyncCheckpoint } from '@/services/binance/types';

// =============================================================================
// Constants
// =============================================================================

const CHECKPOINT_STORAGE_KEY = 'binance_sync_checkpoint';
const LAST_SYNC_STORAGE_KEY = 'binance_last_successful_sync';
const CHECKPOINT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// =============================================================================
// Types
// =============================================================================

export type FullSyncStatus = 'idle' | 'running' | 'success' | 'error';

export type SyncRangeDays = number | 'max' | 'incremental';

export type SyncQualityScore = 'Excellent' | 'Good' | 'Fair' | 'Poor' | null;

export interface ETAState {
  estimatedSeconds: number | null;
  startTime: number;
  lastPhaseTime: number;
  phaseTimes: Record<string, number>;
}

export interface LastSyncInfo {
  timestamp: number;
  endTime: number; // The actual endTime used in the sync
  tradesCount: number;
  matchRate: number;
  quality: SyncQualityScore;
}

interface SyncStoreState {
  // Full Sync State
  fullSyncStatus: FullSyncStatus;
  fullSyncProgress: AggregationProgress | null;
  fullSyncResult: AggregationResult | null;
  fullSyncError: string | null;
  fullSyncStartTime: number | null;
  
  // ETA tracking
  eta: ETAState | null;
  
  // Selected sync range
  selectedSyncRange: SyncRangeDays;
  
  // Checkpoint for resume capability
  checkpoint: SyncCheckpoint | null;
  
  // Last successful sync info (for incremental sync)
  lastSyncInfo: LastSyncInfo | null;
  
  // Actions
  startFullSync: () => void;
  updateProgress: (progress: AggregationProgress) => void;
  completeFullSync: (result: AggregationResult, syncQuality: SyncQualityScore, matchRate: number) => void;
  failFullSync: (error: string) => void;
  resetFullSync: () => void;
  setSyncRange: (days: SyncRangeDays) => void;
  
  // Checkpoint actions
  saveCheckpoint: (update: Partial<SyncCheckpoint>) => void;
  clearCheckpoint: () => void;
  loadCheckpoint: () => SyncCheckpoint | null;
  hasResumableSync: () => boolean;
  
  // Incremental sync helpers
  getIncrementalStartTime: () => number | null;
  canDoIncrementalSync: () => boolean;
}

// =============================================================================
// ETA Calculation Helpers
// =============================================================================

const PHASE_WEIGHTS: Record<string, number> = {
  'fetching-income': 0.10,
  'fetching-trades': 0.55, // Most time-consuming
  'grouping': 0.05,
  'aggregating': 0.10,
  'validating': 0.05,
  'inserting': 0.15,
};

function calculateETA(
  currentPhase: string,
  current: number,
  total: number,
  startTime: number,
  phaseTimes: Record<string, number>
): number | null {
  const elapsed = Date.now() - startTime;
  
  // Calculate phase progress weight
  const phases = Object.keys(PHASE_WEIGHTS);
  const currentPhaseIndex = phases.indexOf(currentPhase);
  if (currentPhaseIndex === -1) return null;
  
  // Sum completed phase weights
  let completedWeight = 0;
  for (let i = 0; i < currentPhaseIndex; i++) {
    completedWeight += PHASE_WEIGHTS[phases[i]];
  }
  
  // Add current phase partial weight
  const phaseProgress = total > 0 ? current / total : 0;
  const currentPhaseWeight = PHASE_WEIGHTS[currentPhase] || 0;
  completedWeight += currentPhaseWeight * phaseProgress;
  
  // Total progress (0-1)
  const totalProgress = completedWeight;
  
  if (totalProgress <= 0.01) return null; // Not enough data
  
  // Estimate total time and remaining
  const estimatedTotal = elapsed / totalProgress;
  const remaining = estimatedTotal - elapsed;
  
  return Math.max(0, Math.round(remaining / 1000));
}

// =============================================================================
// LocalStorage Helpers
// =============================================================================

function loadCheckpointFromStorage(): SyncCheckpoint | null {
  try {
    const stored = localStorage.getItem(CHECKPOINT_STORAGE_KEY);
    if (!stored) return null;
    
    const checkpoint = JSON.parse(stored) as SyncCheckpoint;
    
    // Check if checkpoint is expired
    if (Date.now() - checkpoint.lastCheckpointTime > CHECKPOINT_EXPIRY_MS) {
      localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
      return null;
    }
    
    // Check if checkpoint is actually resumable (not idle or completed)
    if (checkpoint.currentPhase === 'idle') {
      localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
      return null;
    }
    
    return checkpoint;
  } catch (e) {
    console.error('[SyncStore] Failed to load checkpoint:', e);
    return null;
  }
}

function saveCheckpointToStorage(checkpoint: SyncCheckpoint): void {
  try {
    localStorage.setItem(CHECKPOINT_STORAGE_KEY, JSON.stringify(checkpoint));
  } catch (e) {
    console.error('[SyncStore] Failed to save checkpoint:', e);
  }
}

function clearCheckpointFromStorage(): void {
  try {
    localStorage.removeItem(CHECKPOINT_STORAGE_KEY);
  } catch (e) {
    console.error('[SyncStore] Failed to clear checkpoint:', e);
  }
}

// =============================================================================
// Last Sync Storage Helpers
// =============================================================================

function loadLastSyncInfo(): LastSyncInfo | null {
  try {
    const stored = localStorage.getItem(LAST_SYNC_STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as LastSyncInfo;
  } catch (e) {
    console.error('[SyncStore] Failed to load last sync info:', e);
    return null;
  }
}

function saveLastSyncInfo(info: LastSyncInfo): void {
  try {
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, JSON.stringify(info));
  } catch (e) {
    console.error('[SyncStore] Failed to save last sync info:', e);
  }
}

// =============================================================================
// Initial Checkpoint State
// =============================================================================

function createEmptyCheckpoint(): SyncCheckpoint {
  return {
    currentPhase: 'idle',
    incomeData: null,
    tradesBySymbol: {},
    ordersBySymbol: {},
    processedSymbols: [],
    failedSymbols: [],
    allSymbols: [],
    syncStartTime: Date.now(),
    syncRangeDays: 90,
    lastCheckpointTime: Date.now(),
    timeRange: {
      startTime: 0,
      endTime: 0,
    },
    insertedTradeIds: [],
  };
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
  eta: null,
  selectedSyncRange: 90, // Default 90 days (optimized)
  checkpoint: loadCheckpointFromStorage(), // Load on init
  lastSyncInfo: loadLastSyncInfo(), // Load last sync info for incremental sync
  
  // Actions
  startFullSync: () => {
    // Guard: prevent starting if already running
    if (get().fullSyncStatus === 'running') {
      console.warn('[SyncStore] Attempted to start sync while already running');
      return;
    }
    
    const now = Date.now();
    const newCheckpoint = createEmptyCheckpoint();
    newCheckpoint.syncStartTime = now;
    const selectedRange = get().selectedSyncRange;
    // For checkpoint, convert 'incremental' to number
    newCheckpoint.syncRangeDays = selectedRange === 'incremental' ? 7 : selectedRange;
    newCheckpoint.lastCheckpointTime = now;
    
    set({
      fullSyncStatus: 'running',
      fullSyncProgress: null,
      fullSyncResult: null,
      fullSyncError: null,
      fullSyncStartTime: now,
      eta: {
        estimatedSeconds: null,
        startTime: now,
        lastPhaseTime: now,
        phaseTimes: {},
      },
      checkpoint: newCheckpoint,
    });
    
    // Save initial checkpoint
    saveCheckpointToStorage(newCheckpoint);
  },
  
  updateProgress: (progress: AggregationProgress) => {
    const state = get();
    const startTime = state.fullSyncStartTime || Date.now();
    const phaseTimes = state.eta?.phaseTimes || {};
    
    // Track phase completion time
    if (state.fullSyncProgress?.phase !== progress.phase && state.eta) {
      phaseTimes[state.fullSyncProgress?.phase || ''] = Date.now() - state.eta.lastPhaseTime;
    }
    
    const estimatedSeconds = calculateETA(
      progress.phase,
      progress.current,
      progress.total,
      startTime,
      phaseTimes
    );
    
    set({ 
      fullSyncProgress: progress,
      eta: {
        estimatedSeconds,
        startTime,
        lastPhaseTime: Date.now(),
        phaseTimes,
      },
    });
  },
  
  completeFullSync: (result: AggregationResult, syncQuality: SyncQualityScore, matchRate: number) => {
    // Clear checkpoint on success
    clearCheckpointFromStorage();
    
    // Save last sync info for incremental sync
    const lastSyncInfo: LastSyncInfo = {
      timestamp: Date.now(),
      endTime: Date.now(),
      tradesCount: result.stats.validTrades,
      matchRate,
      quality: syncQuality,
    };
    saveLastSyncInfo(lastSyncInfo);
    
    set({
      fullSyncStatus: 'success',
      fullSyncProgress: null,
      fullSyncResult: result,
      fullSyncError: null,
      eta: null,
      checkpoint: null,
      lastSyncInfo,
    });
  },
  
  failFullSync: (error: string) => {
    // Keep checkpoint on failure for potential retry
    set({
      fullSyncStatus: 'error',
      fullSyncProgress: null,
      fullSyncError: error,
      eta: null,
    });
  },
  
  resetFullSync: () => {
    clearCheckpointFromStorage();
    
    set({
      fullSyncStatus: 'idle',
      fullSyncProgress: null,
      fullSyncResult: null,
      fullSyncError: null,
      fullSyncStartTime: null,
      eta: null,
      checkpoint: null,
    });
  },
  
  setSyncRange: (days: SyncRangeDays) => {
    set({ selectedSyncRange: days });
  },
  
  // Checkpoint Actions
  saveCheckpoint: (update: Partial<SyncCheckpoint>) => {
    const current = get().checkpoint || createEmptyCheckpoint();
    const newCheckpoint: SyncCheckpoint = {
      ...current,
      ...update,
      lastCheckpointTime: Date.now(),
    };
    
    set({ checkpoint: newCheckpoint });
    saveCheckpointToStorage(newCheckpoint);
  },
  
  clearCheckpoint: () => {
    clearCheckpointFromStorage();
    set({ checkpoint: null });
  },
  
  loadCheckpoint: () => {
    const checkpoint = loadCheckpointFromStorage();
    if (checkpoint) {
      set({ checkpoint });
    }
    return checkpoint;
  },
  
  hasResumableSync: () => {
    const checkpoint = get().checkpoint || loadCheckpointFromStorage();
    if (!checkpoint) return false;
    
    // Check if it's a valid resumable state
    const resumablePhases = ['fetching-income', 'fetching-trades', 'grouping', 'aggregating', 'inserting'];
    return resumablePhases.includes(checkpoint.currentPhase);
  },
  
  // Incremental sync helpers
  getIncrementalStartTime: () => {
    const lastSync = get().lastSyncInfo;
    if (!lastSync) return null;
    
    // Start from last sync end time (with small overlap for safety)
    const OVERLAP_MS = 5 * 60 * 1000; // 5 minutes overlap
    return lastSync.endTime - OVERLAP_MS;
  },
  
  canDoIncrementalSync: () => {
    const lastSync = get().lastSyncInfo;
    if (!lastSync) return false;
    
    // Can do incremental if last sync was within 30 days
    const MAX_INCREMENTAL_AGE_MS = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - lastSync.timestamp < MAX_INCREMENTAL_AGE_MS;
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

export const selectSyncETA = (state: SyncStoreState) => 
  state.eta?.estimatedSeconds;

export const selectSyncRange = (state: SyncStoreState) => 
  state.selectedSyncRange;

export const selectCheckpoint = (state: SyncStoreState) =>
  state.checkpoint;

export const selectHasResumableSync = (state: SyncStoreState) =>
  state.hasResumableSync();

export const selectLastSyncInfo = (state: SyncStoreState) =>
  state.lastSyncInfo;

export const selectCanDoIncrementalSync = (state: SyncStoreState) =>
  state.canDoIncrementalSync();

export const selectSyncQuality = (state: SyncStoreState) =>
  state.lastSyncInfo?.quality ?? null;
