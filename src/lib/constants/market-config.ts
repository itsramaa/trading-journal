/**
 * Market Configuration Constants
 * Single source of truth for market-related display settings
 * Eliminates hardcoded symbol lists and display limits across components
 */

// ============================================
// Default Symbol Lists
// ============================================

/** Primary watchlist symbols for market data displays */
export const DEFAULT_WATCHLIST_SYMBOLS = [
  'BTCUSDT',
  'ETHUSDT', 
  'SOLUSDT',
  'XRPUSDT',
  'BNBUSDT',
] as const;

/** Quick-access symbols for sentiment widget dropdown */
export const QUICK_ACCESS_SYMBOLS = [
  { value: 'BTCUSDT', label: 'BTC' },
  { value: 'ETHUSDT', label: 'ETH' },
  { value: 'SOLUSDT', label: 'SOL' },
  { value: 'XRPUSDT', label: 'XRP' },
] as const;

/** Default symbol for new views */
export const DEFAULT_SYMBOL = 'BTCUSDT';

// ============================================
// Display Limits
// ============================================

export const DISPLAY_LIMITS = {
  /** Maximum whale activity items to display */
  WHALE_ACTIVITY: 6,
  /** Maximum trading opportunities to display */
  TRADING_OPPORTUNITIES: 6,
  /** Maximum symbols in multi-symbol fetches */
  MAX_SYMBOLS_FETCH: 10,
  /** Skeleton loading count for lists */
  SKELETON_COUNT: 5,
} as const;

// ============================================
// Time Periods
// ============================================

/** Available periods for sentiment analysis */
export const SENTIMENT_PERIODS = [
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1H' },
  { value: '4h', label: '4H' },
] as const;

/** Default period for sentiment analysis */
export const DEFAULT_SENTIMENT_PERIOD = '1h';

// ============================================
// Data Sources
// ============================================

/** Data source attribution for Market Data page */
export const MARKET_DATA_SOURCES = ['Binance', 'CoinGecko', 'Alternative.me'] as const;

/** Format sources for display */
export function formatDataSources(): string {
  return `Sources: ${MARKET_DATA_SOURCES.join(', ')}`;
}

// ============================================
// Badge Labels
// ============================================

export const BADGE_LABELS = {
  /** Label when showing top watchlist symbols */
  TOP_WATCHLIST: `Top ${DEFAULT_WATCHLIST_SYMBOLS.length}`,
  /** Format for additional symbol badge */
  formatAdditionalSymbol: (symbol: string) => `+${symbol}`,
} as const;

// ============================================
// Type Exports
// ============================================

export type WatchlistSymbol = typeof DEFAULT_WATCHLIST_SYMBOLS[number];
export type SentimentPeriod = typeof SENTIMENT_PERIODS[number]['value'];
