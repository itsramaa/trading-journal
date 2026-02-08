/**
 * Trade History Constants
 * Centralized configuration for Trade History and Trading Journal modules
 * Single source of truth for pagination, lookback, and display settings
 */

// ============================================================================
// PAGINATION & LOOKBACK CONFIG
// ============================================================================

export const TRADE_HISTORY_CONFIG = {
  pagination: {
    defaultPageSize: 50,
    maxPageSize: 100,
  },
  lookback: {
    /** Default lookback in days (1 year) */
    defaultDays: 365,
    /** Lookback for enrichment operations (2 years) */
    enrichmentDays: 730,
    /** Maximum history supported (3 years) */
    maxHistoryDays: 1095,
  },
  tabs: {
    defaultJournal: 'active',
    defaultHistory: 'all',
  },
  export: {
    csvDelimiter: ',',
    dateFormat: 'yyyy-MM-dd',
  },
} as const;

// ============================================================================
// CONFLUENCE SCALE
// ============================================================================

export const CONFLUENCE_SCALE = {
  MIN: 0,
  MAX: 5,
  /** Format confluence score for display */
  format: (score: number | null | undefined): string => {
    if (score === null || score === undefined) return '-';
    return `${score}/${CONFLUENCE_SCALE.MAX}`;
  },
} as const;

// ============================================================================
// VIEW MODES
// ============================================================================

export type ViewMode = 'list' | 'gallery';

export const VIEW_MODE_CONFIG = {
  default: 'gallery' as ViewMode,
  skeletonCount: {
    list: 5,
    gallery: 8,
  },
} as const;

// ============================================================================
// EMPTY STATE MESSAGES
// ============================================================================

export const EMPTY_STATE_MESSAGES = {
  NO_TRADES: {
    title: 'No trades found',
    description: 'No trades match your current filters. Try adjusting the filters above.',
  },
  NO_BINANCE_TRADES: (isConnected: boolean) => ({
    title: 'No Binance trades',
    description: isConnected
      ? 'No Binance trades match your filters.'
      : 'Connect Binance in Settings to import trades.',
  }),
  NO_PAPER_TRADES: {
    title: 'No paper trades',
    description: 'No paper trades match your filters.',
  },
  NO_FEE_RECORDS: {
    title: 'No fee records found',
    description: 'Run Full Sync in Trade History to load fee data, or adjust your filters.',
  },
  NO_FUNDING_RECORDS: {
    title: 'No funding records found',
    description: 'Run Full Sync in Trade History to load funding data, or adjust your filters.',
  },
  LOAD_ERROR: (message?: string) => ({
    title: 'Failed to load trades',
    description: message || 'An error occurred while loading trades.',
  }),
} as const;

// ============================================================================
// CSV EXPORT HEADERS
// ============================================================================

export const CSV_EXPORT_HEADERS = [
  'Date',
  'Pair',
  'Direction',
  'Entry',
  'Exit',
  'P&L',
  'Result',
  'Notes',
] as const;

// ============================================================================
// DATA SOURCE INFO LABELS
// ============================================================================

export const DATA_SOURCE_LABELS = {
  localDb: 'Data from Local DB (Full Sync)',
  filterApplied: 'Filters from trade history apply to this tab',
} as const;
