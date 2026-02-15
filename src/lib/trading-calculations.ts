/**
 * @module trading-calculations
 * @description Core trading analytics engine for client-side performance calculations.
 *
 * This module provides deterministic, auditable functions for computing trading
 * performance metrics from an array of {@link TradeEntry} objects. It serves as
 * the client-side complement to the server-side `get_trade_stats` RPC.
 *
 * ### Architecture
 * - **Server-side (canonical):** `get_trade_stats` RPC — source of truth for
 *   overall stats, handles pagination and DB-level filtering.
 * - **Client-side (this module):** Used for filtered subsets, export generation,
 *   AI quality scoring, and any scenario requiring direct array access.
 *
 * ### PnL Standard
 * All PnL calculations follow the platform-wide fallback chain:
 * ```
 * realized_pnl ?? pnl ?? 0
 * ```
 * This ensures consistency across Binance-synced trades (which have `realized_pnl`)
 * and local/paper trades (which use estimated `pnl`).
 *
 * ### Drawdown Standard
 * Max drawdown percentage uses the standardized formula:
 * ```
 * (peak_cumulative_pnl - current_cumulative_pnl) / (initial_balance + peak_cumulative_pnl) * 100
 * ```
 * Capped at 100% to prevent mathematically impossible values.
 *
 * @see {@link src/lib/advanced-risk-metrics.ts} for Sharpe, Sortino, VaR, Kelly calculations
 * @see {@link get_trade_stats} RPC for server-side canonical stats
 */

import type { TradeEntry, TradingStrategy } from "@/hooks/use-trade-entries";

/**
 * Aggregated trading performance statistics.
 *
 * Computed by {@link calculateTradingStats} from an array of closed trades.
 * All monetary values are in the trade's quote currency (e.g., USDT).
 */
export interface TradingStats {
  /** Total number of trades analyzed */
  totalTrades: number;
  /** Number of winning trades (PnL > 0) */
  wins: number;
  /** Number of losing trades (PnL < 0) */
  losses: number;
  /** Number of breakeven trades (PnL = 0) */
  breakeven: number;
  /** Win rate as a percentage (0–100) */
  winRate: number;
  /** Sum of all trade PnLs */
  totalPnl: number;
  /** Average PnL per trade */
  avgPnl: number;
  /** Average absolute Risk:Reward ratio; null if no trades have stop losses */
  avgRR: number | null;
  /** Gross profit / gross loss; Infinity if no losses; 0 if no wins */
  profitFactor: number;
  /** Expected value per trade: (Win% × AvgWin) - (Loss% × AvgLoss) */
  expectancy: number;
  /** Maximum peak-to-trough equity decline (absolute value) */
  maxDrawdown: number;
  /** Maximum drawdown as percentage of equity at peak (0–100, capped) */
  maxDrawdownPercent: number;
  /** Annualized Sharpe ratio (√252 scaling); null if zero variance */
  sharpeRatio: number | null;
  /** Sum of all positive PnLs */
  grossProfit: number;
  /** Sum of all negative PnLs (as positive number) */
  grossLoss: number;
  /** Largest single winning trade PnL */
  largestWin: number;
  /** Largest single losing trade PnL (as positive number) */
  largestLoss: number;
  /** Average winning trade PnL */
  avgWin: number;
  /** Average losing trade PnL (as positive number) */
  avgLoss: number;
  /** Longest winning streak */
  consecutiveWins: number;
  /** Longest losing streak */
  consecutiveLosses: number;
}

/**
 * Performance metrics for a single trading strategy.
 *
 * Computed by {@link calculateStrategyPerformance} by filtering trades
 * that reference a given strategy via the `trade_entry_strategies` junction.
 */
export interface StrategyPerformance {
  /** The strategy entity */
  strategy: TradingStrategy;
  /** Number of trades using this strategy */
  totalTrades: number;
  /** Winning trades count */
  wins: number;
  /** Losing trades count */
  losses: number;
  /** Win rate percentage (0–100) */
  winRate: number;
  /** Total PnL from this strategy */
  totalPnl: number;
  /** Average PnL per trade */
  avgPnl: number;
  /** Average R:R ratio; null if insufficient stop-loss data */
  avgRR: number | null;
  /** Strategy's PnL as a percentage of total portfolio PnL */
  contribution: number;
}

/**
 * Calculates the Risk:Reward (R) multiple achieved on a trade.
 *
 * The R-multiple measures how many units of risk were gained or lost:
 * - `R = reward / risk` where `risk = |entry_price - stop_loss|`
 * - Sign is determined by trade outcome: positive for wins, negative for losses
 *
 * @param trade - The trade entry to evaluate
 * @returns The R-multiple (positive for wins, negative for losses, 0 if no stop loss or zero risk)
 *
 * @example
 * ```ts
 * // Long trade: entry=100, exit=110, SL=95 → risk=5, reward=10 → R=+2.0
 * calculateRR({ entry_price: 100, exit_price: 110, stop_loss: 95, direction: 'LONG', result: 'win' })
 *
 * // Losing trade returns negative R
 * calculateRR({ entry_price: 100, exit_price: 95, stop_loss: 95, direction: 'LONG', result: 'loss' })
 * // → -1.0
 * ```
 */
export function calculateRR(trade: TradeEntry): number {
  if (!trade.stop_loss || !trade.entry_price) return 0;
  
  const risk = Math.abs(trade.entry_price - trade.stop_loss);
  if (risk === 0) return 0;
  
  const reward = trade.exit_price 
    ? Math.abs(trade.exit_price - trade.entry_price)
    : 0;
  
  const isWin = trade.result === 'win';
  
  let rr = reward / risk;
  if (!isWin) rr = -rr;
  
  return rr;
}

/**
 * Filters trades to those within a specified date range (inclusive).
 *
 * @param trades - Array of trades to filter
 * @param startDate - Earliest trade date to include (null = no lower bound)
 * @param endDate - Latest trade date to include (null = no upper bound)
 * @returns Filtered array of trades within the date range
 */
export function filterTradesByDateRange(
  trades: TradeEntry[],
  startDate: Date | null,
  endDate: Date | null
): TradeEntry[] {
  return trades.filter(trade => {
    const tradeDate = new Date(trade.trade_date);
    if (startDate && tradeDate < startDate) return false;
    if (endDate && tradeDate > endDate) return false;
    return true;
  });
}

/**
 * Filters trades to those associated with any of the specified strategies.
 *
 * Uses the many-to-many relationship via `trade_entry_strategies` junction table.
 * Returns all trades if `strategyIds` is empty (no filter applied).
 *
 * @param trades - Array of trades to filter
 * @param strategyIds - Strategy UUIDs to match against
 * @returns Filtered array of trades linked to at least one specified strategy
 */
export function filterTradesByStrategies(
  trades: TradeEntry[],
  strategyIds: string[]
): TradeEntry[] {
  if (strategyIds.length === 0) return trades;
  
  return trades.filter(trade => 
    trade.strategies?.some(s => strategyIds.includes(s.id))
  );
}

/**
 * Extracts the net PnL from a trade using the platform-wide fallback chain.
 *
 * Priority: `realized_pnl` → `pnl` → `0`
 *
 * This ensures consistency between:
 * - **Binance-synced trades:** Have accurate `realized_pnl` from the exchange
 * - **Paper/manual trades:** Use estimated `pnl` calculated from price difference
 *
 * @param t - The trade entry
 * @returns Net PnL value in quote currency
 * @internal
 */
function getTradeNetPnl(t: TradeEntry): number {
  return t.realized_pnl ?? t.pnl ?? 0;
}

/**
 * Computes comprehensive trading statistics from an array of trades.
 *
 * This is the **client-side** calculator used for:
 * - Performance page: stats from locally-filtered trades
 * - Bulk export: stats for PDF/CSV generation
 * - AI quality scoring: needs full trade array access
 *
 * For overall/canonical stats, use the `get_trade_stats` RPC instead.
 *
 * ### Calculation Details
 * - **Win Rate:** `wins / totalTrades × 100`
 * - **Profit Factor:** `grossProfit / grossLoss` (Infinity if no losses)
 * - **Expectancy:** `(winRate × avgWin) - (lossRate × avgLoss)`
 * - **Max Drawdown:** Peak-to-trough on cumulative PnL equity curve
 * - **Drawdown %:** `drawdown / (initialBalance + peak) × 100`, capped at 100%
 * - **Sharpe Ratio:** `(meanReturn / stdDev) × √252` (annualized, 0% risk-free rate)
 * - **Streaks:** Computed on chronologically sorted trades
 *
 * @param trades - Array of closed trade entries to analyze
 * @param initialBalance - Starting account balance for drawdown % calculation (default: 0)
 * @returns Complete {@link TradingStats} object with all computed metrics
 *
 * @example
 * ```ts
 * const stats = calculateTradingStats(closedTrades, 10000);
 * console.log(`Win Rate: ${stats.winRate}%, PF: ${stats.profitFactor}`);
 * ```
 */
export function calculateTradingStats(trades: TradeEntry[], initialBalance: number = 0): TradingStats {
  const emptyStats: TradingStats = {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    winRate: 0,
    totalPnl: 0,
    avgPnl: 0,
    avgRR: null,
    profitFactor: 0,
    expectancy: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    sharpeRatio: null,
    grossProfit: 0,
    grossLoss: 0,
    largestWin: 0,
    largestLoss: 0,
    avgWin: 0,
    avgLoss: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
  };

  if (trades.length === 0) return emptyStats;

  // Categorize trades by outcome
  const winningTrades = trades.filter(t => t.result === 'win');
  const losingTrades = trades.filter(t => t.result === 'loss');
  const breakevenTrades = trades.filter(t => t.result === 'breakeven');

  const wins = winningTrades.length;
  const losses = losingTrades.length;
  const breakeven = breakevenTrades.length;
  const totalTrades = trades.length;

  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  // PnL aggregation using standardized extraction
  const totalPnl = trades.reduce((sum, t) => sum + getTradeNetPnl(t), 0);
  const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

  const grossProfit = winningTrades.reduce((sum, t) => sum + getTradeNetPnl(t), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + getTradeNetPnl(t), 0));

  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const avgWin = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;

  // Expectancy: expected profit per trade
  const expectancy = ((winRate / 100) * avgWin) - (((100 - winRate) / 100) * avgLoss);

  const largestWin = winningTrades.length > 0 
    ? Math.max(...winningTrades.map(t => getTradeNetPnl(t)))
    : 0;
  const largestLoss = losingTrades.length > 0
    ? Math.abs(Math.min(...losingTrades.map(t => getTradeNetPnl(t))))
    : 0;

  // Average R:R from trades with stop losses
  const rrValues = trades.map(t => calculateRR(t)).filter(rr => rr !== 0);
  const avgRR = rrValues.length > 0 
    ? rrValues.reduce((sum, rr) => sum + Math.abs(rr), 0) / rrValues.length
    : null;

  // Max drawdown: peak-to-trough on chronologically sorted equity curve
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );
  
  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;
  
  for (const trade of sortedTrades) {
    cumulative += getTradeNetPnl(trade);
    if (cumulative > peak) peak = cumulative;
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  // Standardized drawdown % formula: drawdown / (initialBalance + peak) × 100
  const drawdownBase = initialBalance + peak;
  const maxDrawdownPercent = drawdownBase > 0 ? Math.min((maxDrawdown / drawdownBase) * 100, 100) : 0;

  // Simplified Sharpe Ratio (annualized, 0% risk-free rate)
  const pnlValues = trades.map(t => getTradeNetPnl(t));
  const meanReturn = avgPnl;
  const variance = pnlValues.reduce((sum, pnl) => sum + Math.pow(pnl - meanReturn, 2), 0) / pnlValues.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : null;

  // Consecutive win/loss streaks (chronological order)
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;

  for (const trade of sortedTrades) {
    if (trade.result === 'win') {
      currentWinStreak++;
      currentLossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    } else if (trade.result === 'loss') {
      currentLossStreak++;
      currentWinStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    }
  }

  return {
    totalTrades,
    wins,
    losses,
    breakeven,
    winRate,
    totalPnl,
    avgPnl,
    avgRR,
    profitFactor,
    expectancy,
    maxDrawdown,
    maxDrawdownPercent,
    sharpeRatio,
    grossProfit,
    grossLoss,
    largestWin,
    largestLoss,
    avgWin,
    avgLoss,
    consecutiveWins: maxWinStreak,
    consecutiveLosses: maxLossStreak,
  };
}

/**
 * Computes performance metrics for each trading strategy.
 *
 * Groups trades by their associated strategies (many-to-many relationship)
 * and calculates per-strategy statistics including PnL contribution percentage.
 * Results are sorted by total PnL descending.
 *
 * @param trades - All closed trades to analyze
 * @param strategies - Available strategies to compute performance for
 * @returns Array of {@link StrategyPerformance} sorted by PnL (best first)
 *
 * @example
 * ```ts
 * const perfs = calculateStrategyPerformance(trades, strategies);
 * perfs.forEach(p => {
 *   console.log(`${p.strategy.name}: ${p.winRate}% WR, ${p.contribution}% contribution`);
 * });
 * ```
 */
export function calculateStrategyPerformance(
  trades: TradeEntry[],
  strategies: TradingStrategy[]
): StrategyPerformance[] {
  const totalPnl = trades.reduce((sum, t) => sum + getTradeNetPnl(t), 0);

  return strategies.map(strategy => {
    const strategyTrades = trades.filter(t => 
      t.strategies?.some(s => s.id === strategy.id)
    );

    if (strategyTrades.length === 0) {
      return {
        strategy,
        totalTrades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnl: 0,
        avgPnl: 0,
        avgRR: null,
        contribution: 0,
      };
    }

    const wins = strategyTrades.filter(t => t.result === 'win').length;
    const losses = strategyTrades.filter(t => t.result === 'loss').length;
    const strategyPnl = strategyTrades.reduce((sum, t) => sum + getTradeNetPnl(t), 0);
    
    const rrValues = strategyTrades.map(t => calculateRR(t)).filter(rr => rr !== 0);
    const avgRR = rrValues.length > 0
      ? rrValues.reduce((sum, rr) => sum + Math.abs(rr), 0) / rrValues.length
      : null;

    return {
      strategy,
      totalTrades: strategyTrades.length,
      wins,
      losses,
      winRate: (wins / strategyTrades.length) * 100,
      totalPnl: strategyPnl,
      avgPnl: strategyPnl / strategyTrades.length,
      avgRR,
      contribution: totalPnl !== 0 ? (strategyPnl / Math.abs(totalPnl)) * 100 : 0,
    };
  }).sort((a, b) => b.totalPnl - a.totalPnl);
}

/**
 * Generates equity curve data points from an array of trades.
 *
 * Sorts trades chronologically and computes a running cumulative PnL.
 * Each point includes the individual trade PnL and the cumulative balance,
 * suitable for charting with libraries like Recharts.
 *
 * @param trades - Array of closed trades (will be sorted by date internally)
 * @returns Array of equity curve data points with cumulative PnL
 *
 * @example
 * ```ts
 * const curve = generateEquityCurve(trades);
 * // [{ date: 'Jan 5', cumulative: 150, pnl: 150, pair: 'BTCUSDT', ... }, ...]
 * ```
 */
export function generateEquityCurve(trades: TradeEntry[]) {
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );

  let cumulative = 0;
  return sortedTrades.map(trade => {
    const pnl = getTradeNetPnl(trade);
    cumulative += pnl;
    return {
      date: new Date(trade.trade_date).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      }),
      fullDate: trade.trade_date,
      pnl,
      cumulative,
      pair: trade.pair,
      direction: trade.direction,
    };
  });
}
