/**
 * useTradeHistoryFilters - Encapsulated filter state management
 * SRP: Single hook for all Trade History filter logic
 * DRY: Reusable across Trade History and Trading Journal
 */

import { useState, useMemo, useCallback } from "react";
import { subYears } from "date-fns";
import { TRADE_HISTORY_CONFIG } from "@/lib/constants/trade-history";
import type { DateRange } from "@/components/trading/DateRangeFilter";

// Import types from components for consistency
import type { TradingSession } from "@/lib/session-utils";

// Types must match TradeHistoryFilters component
export type ResultFilter = 'all' | 'profit' | 'loss' | 'breakeven';
export type DirectionFilter = 'all' | 'LONG' | 'SHORT';
export type SessionFilter = 'all' | TradingSession;
export type SortByAI = 'none' | 'asc' | 'desc';

export interface TradeHistoryFiltersState {
  dateRange: DateRange;
  resultFilter: ResultFilter;
  directionFilter: DirectionFilter;
  sessionFilter: SessionFilter;
  selectedStrategyIds: string[];
  selectedPairs: string[];
  sortByAI: SortByAI;
  showFullHistory: boolean;
}

export interface UseTradeHistoryFiltersOptions {
  /** Use default start date (1 year back) */
  useDefaultStartDate?: boolean;
  /** Initial filter values */
  initialFilters?: Partial<TradeHistoryFiltersState>;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_START_DATE = subYears(new Date(), 1).toISOString().split('T')[0];

const DEFAULT_FILTERS: TradeHistoryFiltersState = {
  dateRange: { from: null, to: null },
  resultFilter: 'all',
  directionFilter: 'all',
  sessionFilter: 'all',
  selectedStrategyIds: [],
  selectedPairs: [],
  sortByAI: 'none',
  showFullHistory: false,
};

// ============================================================================
// HOOK
// ============================================================================

export function useTradeHistoryFilters(options: UseTradeHistoryFiltersOptions = {}) {
  const { useDefaultStartDate = true, initialFilters = {} } = options;

  // State initialization with optional overrides
  const [dateRange, setDateRange] = useState<DateRange>(
    initialFilters.dateRange ?? DEFAULT_FILTERS.dateRange
  );
  const [resultFilter, setResultFilter] = useState<ResultFilter>(
    initialFilters.resultFilter ?? DEFAULT_FILTERS.resultFilter
  );
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>(
    initialFilters.directionFilter ?? DEFAULT_FILTERS.directionFilter
  );
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>(
    initialFilters.sessionFilter ?? DEFAULT_FILTERS.sessionFilter
  );
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>(
    initialFilters.selectedStrategyIds ?? DEFAULT_FILTERS.selectedStrategyIds
  );
  const [selectedPairs, setSelectedPairs] = useState<string[]>(
    initialFilters.selectedPairs ?? DEFAULT_FILTERS.selectedPairs
  );
  const [sortByAI, setSortByAI] = useState<SortByAI>(
    initialFilters.sortByAI ?? DEFAULT_FILTERS.sortByAI
  );
  const [showFullHistory, setShowFullHistory] = useState(
    initialFilters.showFullHistory ?? DEFAULT_FILTERS.showFullHistory
  );

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  /** Check if any filter is active */
  const hasActiveFilters = useMemo(() => 
    dateRange.from !== null || 
    dateRange.to !== null ||
    resultFilter !== 'all' ||
    directionFilter !== 'all' ||
    sessionFilter !== 'all' ||
    selectedStrategyIds.length > 0 ||
    selectedPairs.length > 0,
    [dateRange, resultFilter, directionFilter, sessionFilter, selectedStrategyIds, selectedPairs]
  );

  /** Count of active filter categories */
  const activeFilterCount = useMemo(() => 
    [
      dateRange.from !== null || dateRange.to !== null,
      resultFilter !== 'all',
      directionFilter !== 'all',
      sessionFilter !== 'all',
      selectedStrategyIds.length > 0,
      selectedPairs.length > 0,
    ].filter(Boolean).length,
    [dateRange, resultFilter, directionFilter, sessionFilter, selectedStrategyIds, selectedPairs]
  );

  /** Start date for queries (with fallback to default if no filter set) */
  const effectiveStartDate = useMemo(() => {
    if (showFullHistory) return undefined;
    if (dateRange.from) return dateRange.from.toISOString().split('T')[0];
    if (useDefaultStartDate) return DEFAULT_START_DATE;
    return undefined;
  }, [showFullHistory, dateRange.from, useDefaultStartDate]);

  /** End date for queries */
  const effectiveEndDate = useMemo(() => {
    return dateRange.to?.toISOString().split('T')[0];
  }, [dateRange.to]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /** Clear all filters to default state */
  const clearAllFilters = useCallback(() => {
    setDateRange({ from: null, to: null });
    setResultFilter('all');
    setDirectionFilter('all');
    setSessionFilter('all');
    setSelectedStrategyIds([]);
    setSelectedPairs([]);
    setSortByAI('none');
    setShowFullHistory(false);
  }, []);

  /** Toggle full history mode */
  const toggleFullHistory = useCallback(() => {
    setShowFullHistory(prev => !prev);
  }, []);

  // ============================================================================
  // RETURN VALUE
  // ============================================================================

  return {
    // State values
    filters: {
      dateRange,
      resultFilter,
      directionFilter,
      sessionFilter,
      selectedStrategyIds,
      selectedPairs,
      sortByAI,
      showFullHistory,
    },
    
    // Setters
    setters: {
      setDateRange,
      setResultFilter,
      setDirectionFilter,
      setSessionFilter,
      setSelectedStrategyIds,
      setSelectedPairs,
      setSortByAI,
      setShowFullHistory,
    },
    
    // Computed values
    computed: {
      hasActiveFilters,
      activeFilterCount,
      effectiveStartDate,
      effectiveEndDate,
    },
    
    // Actions
    actions: {
      clearAllFilters,
      toggleFullHistory,
    },
    
    // Constants (for external use)
    constants: {
      defaultStartDate: DEFAULT_START_DATE,
      pageSize: TRADE_HISTORY_CONFIG.pagination.defaultPageSize,
    },
  };
}

// Re-export filter types for convenience
export type { DateRange };
