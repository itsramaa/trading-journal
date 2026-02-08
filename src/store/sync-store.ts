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

export type SyncRangeDays = 30 | 90 | 180 | 365;

export interface ETAState {
  estimatedSeconds: number | null;
  startTime: number;
  lastPhaseTime: number;
  phaseTimes: Record<string, number>;
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
  
  // Actions
  startFullSync: () => void;
  updateProgress: (progress: AggregationProgress) => void;
  completeFullSync: (result: AggregationResult) => void;
  failFullSync: (error: string) => void;
  resetFullSync: () => void;
  setSyncRange: (days: SyncRangeDays) => void;
}

// =============================================================================
// ETA Calculation Helpers
// =============================================================================

const PHASE_WEIGHTS: Record<string, number> = {
  'fetching-income': 0.15,
  'fetching-trades': 0.60, // Most time-consuming
  'grouping': 0.05,
  'aggregating': 0.15,
  'validating': 0.05,
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
  
  // Actions
  startFullSync: () => {
    // Guard: prevent starting if already running
    if (get().fullSyncStatus === 'running') {
      console.warn('[SyncStore] Attempted to start sync while already running');
      return;
    }
    
    const now = Date.now();
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
    });
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
  
  completeFullSync: (result: AggregationResult) => {
    set({
      fullSyncStatus: 'success',
      fullSyncProgress: null,
      fullSyncResult: result,
      fullSyncError: null,
      eta: null,
    });
  },
  
  failFullSync: (error: string) => {
    set({
      fullSyncStatus: 'error',
      fullSyncProgress: null,
      fullSyncError: error,
      eta: null,
    });
  },
  
  resetFullSync: () => {
    set({
      fullSyncStatus: 'idle',
      fullSyncProgress: null,
      fullSyncResult: null,
      fullSyncError: null,
      fullSyncStartTime: null,
      eta: null,
    });
  },
  
  setSyncRange: (days: SyncRangeDays) => {
    set({ selectedSyncRange: days });
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
