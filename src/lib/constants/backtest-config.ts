/**
 * Backtest Configuration Constants
 * Centralized defaults, filters, and comparison config for backtesting system
 */

// =============================================================================
// BACKTEST DEFAULTS
// =============================================================================

export const BACKTEST_DEFAULTS = {
  // Capital & Fees
  INITIAL_CAPITAL: 10000,
  COMMISSION_RATE: 0.0004,    // 0.04% (Binance taker fee)
  SLIPPAGE: 0.001,            // 0.1%
  RISK_PER_TRADE: 0.02,       // 2%
  
  // Period
  PERIOD_MONTHS: 3,
  DEFAULT_PAIR: 'BTC',
  
  // Input constraints
  MIN_CAPITAL: 100,
  CAPITAL_STEP: 100,
  MIN_COMMISSION: 0,
  MAX_COMMISSION: 1,
  COMMISSION_STEP: 0.01,
  MIN_SLIPPAGE: 0,
  MAX_SLIPPAGE: 2,
  SLIPPAGE_STEP: 0.01,
  MIN_RISK_PER_TRADE: 0.5,
  MAX_RISK_PER_TRADE: 10,
  RISK_PER_TRADE_STEP: 0.5,
  MAX_LEVERAGE: 125,
} as const;

// Exchange-specific commission rates for reference
export const EXCHANGE_COMMISSION_RATES = {
  BINANCE_FUTURES: {
    MAKER: 0.02,  // 0.02%
    TAKER: 0.04,  // 0.04%
  },
  BINANCE_SPOT: {
    MAKER: 0.1,   // 0.1%
    TAKER: 0.1,   // 0.1%
  },
} as const;

// =============================================================================
// BACKTEST FILTERS
// =============================================================================

export const BACKTEST_FILTERS = {
  // Event buffer configuration
  EVENT_BUFFER: {
    DEFAULT_HOURS: 4,
    MIN_HOURS: 0,
    MAX_HOURS: 48,
    STEP_HOURS: 4,
  },
  
  // Reliability thresholds
  MIN_TRADES_FOR_RELIABILITY: 30,
  
  // Session labels with hours (UTC)
  SESSION_LABELS: {
    all: 'All Sessions',
    asian: 'Asian Session (00:00-08:00 UTC)',
    london: 'London Session (08:00-16:00 UTC)',
    ny: 'New York Session (13:00-22:00 UTC)',
  },
  
  // Volatility labels
  VOLATILITY_LABELS: {
    all: 'All Volatility Levels',
    low: 'Low Volatility Only',
    medium: 'Medium Volatility Only',
    high: 'High Volatility Only',
  },
} as const;

// =============================================================================
// COMPARISON CONFIG
// =============================================================================

export const COMPARISON_CONFIG = {
  // Max results to compare
  MAX_SELECTIONS: 4,
  
  // Chart colors (HSL design tokens)
  CHART_COLORS: [
    'hsl(var(--primary))',      // Blue
    'hsl(var(--chart-2))',      // Green  
    'hsl(var(--chart-3))',      // Orange
    'hsl(var(--chart-4))',      // Red
  ],
  
  // Badge color classes
  COLOR_CLASSES: [
    'bg-primary text-primary-foreground',
    'bg-chart-2 text-primary-foreground',
    'bg-chart-3 text-primary-foreground',
    'bg-chart-4 text-primary-foreground',
  ],
  
  // Summary metrics to highlight
  SUMMARY_METRICS: ['totalReturn', 'winRate', 'sharpeRatio', 'maxDrawdown'] as const,
  
  // UI dimensions
  SCROLL_AREA_HEIGHT: 200,
  CHART_HEIGHT: 350,
} as const;

// =============================================================================
// METRICS CONFIGURATION
// =============================================================================

export interface MetricConfig {
  key: string;
  label: string;
  format: (value: number) => string;
  higherIsBetter: boolean;
}

export const METRICS_CONFIG: MetricConfig[] = [
  { key: 'totalReturn', label: 'Total Return', format: (v) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`, higherIsBetter: true },
  { key: 'winRate', label: 'Win Rate', format: (v) => `${(v * 100).toFixed(1)}%`, higherIsBetter: true },
  { key: 'maxDrawdown', label: 'Max Drawdown', format: (v) => `-${v.toFixed(2)}%`, higherIsBetter: false },
  { key: 'sharpeRatio', label: 'Sharpe Ratio', format: (v) => v.toFixed(2), higherIsBetter: true },
  { key: 'profitFactor', label: 'Profit Factor', format: (v) => v === Infinity ? '∞' : v.toFixed(2), higherIsBetter: true },
  { key: 'expectancy', label: 'Expectancy', format: (v) => `$${v.toFixed(2)}`, higherIsBetter: true },
  { key: 'calmarRatio', label: 'Calmar Ratio', format: (v) => v.toFixed(2), higherIsBetter: true },
  { key: 'totalTrades', label: 'Total Trades', format: (v) => v.toString(), higherIsBetter: true },
  { key: 'avgWin', label: 'Avg Win', format: (v) => `$${v.toFixed(2)}`, higherIsBetter: true },
  { key: 'avgLoss', label: 'Avg Loss', format: (v) => `-$${v.toFixed(2)}`, higherIsBetter: false },
  { key: 'avgRiskReward', label: 'Avg R:R', format: (v) => v.toFixed(2), higherIsBetter: true },
  { key: 'consecutiveWins', label: 'Max Consec. Wins', format: (v) => v.toString(), higherIsBetter: true },
  { key: 'consecutiveLosses', label: 'Max Consec. Losses', format: (v) => v.toString(), higherIsBetter: false },
];

// Helper to get metric config by key
export function getMetricConfig(key: string): MetricConfig | undefined {
  return METRICS_CONFIG.find(m => m.key === key);
}
