/**
 * Trading Analytics Calculations
 * Deterministic and auditable calculations for trading performance
 */

import type { TradeEntry, TradingStrategy } from "@/hooks/use-trade-entries";

export interface TradingStats {
  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgRR: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  grossProfit: number;
  grossLoss: number;
  largestWin: number;
  largestLoss: number;
  avgWin: number;
  avgLoss: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}

export interface StrategyPerformance {
  strategy: TradingStrategy;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  avgRR: number;
  contribution: number;
}

/**
 * Calculate R:R (Risk-Reward Ratio) for a trade
 * Returns actual R multiple achieved
 */
export function calculateRR(trade: TradeEntry): number {
  if (!trade.stop_loss || !trade.entry_price) return 0;
  
  const risk = Math.abs(trade.entry_price - trade.stop_loss);
  if (risk === 0) return 0;
  
  const reward = trade.exit_price 
    ? Math.abs(trade.exit_price - trade.entry_price)
    : 0;
  
  // Adjust sign based on trade direction and result
  const isLong = trade.direction.toUpperCase() === 'LONG';
  const isWin = trade.result === 'win';
  
  let rr = reward / risk;
  if (!isWin) rr = -rr;
  
  return rr;
}

/**
 * Filter trades by date range
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
 * Filter trades by strategy IDs
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
 * Calculate comprehensive trading statistics (CLIENT-SIDE).
 * 
 * This is a **client-side calculator** for filtered/subset data used in:
 * - Performance.tsx: stats from locally-filtered trades (date range, strategy filters)
 * - BulkExport.tsx: stats for export generation (needs local data access)
 * - FinalChecklist.tsx: stats for AI quality scoring (needs full trade array)
 * 
 * For **overall/canonical stats**, use the `get_trade_stats` RPC which is the
 * server-side source of truth (handles pagination, consistent filtering at DB level).
 * 
 * All calculations are deterministic and based on actual trade data.
 */
// Helper: standardized PnL extraction matching unified hooks
function getTradeNetPnl(t: TradeEntry): number {
  return t.realized_pnl ?? t.pnl ?? 0;
}

export function calculateTradingStats(trades: TradeEntry[], initialBalance: number = 0): TradingStats {
  const emptyStats: TradingStats = {
    totalTrades: 0,
    wins: 0,
    losses: 0,
    breakeven: 0,
    winRate: 0,
    totalPnl: 0,
    avgPnl: 0,
    avgRR: 0,
    profitFactor: 0,
    expectancy: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    sharpeRatio: 0,
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

  // Categorize trades
  const winningTrades = trades.filter(t => t.result === 'win');
  const losingTrades = trades.filter(t => t.result === 'loss');
  const breakevenTrades = trades.filter(t => t.result === 'breakeven');

  // Basic counts
  const wins = winningTrades.length;
  const losses = losingTrades.length;
  const breakeven = breakevenTrades.length;
  const totalTrades = trades.length;

  // Win rate
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

  // P&L calculations
  const totalPnl = trades.reduce((sum, t) => sum + getTradeNetPnl(t), 0);
  const avgPnl = totalTrades > 0 ? totalPnl / totalTrades : 0;

  // Gross profit and loss
  const grossProfit = winningTrades.reduce((sum, t) => sum + getTradeNetPnl(t), 0);
  const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + getTradeNetPnl(t), 0));

  // Profit factor
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  // Average win/loss
  const avgWin = wins > 0 ? grossProfit / wins : 0;
  const avgLoss = losses > 0 ? grossLoss / losses : 0;

  // Expectancy: (Win% × Avg Win) - (Loss% × Avg Loss)
  const expectancy = ((winRate / 100) * avgWin) - (((100 - winRate) / 100) * avgLoss);

  // Largest win/loss
  const largestWin = winningTrades.length > 0 
    ? Math.max(...winningTrades.map(t => getTradeNetPnl(t)))
    : 0;
  const largestLoss = losingTrades.length > 0
    ? Math.abs(Math.min(...losingTrades.map(t => getTradeNetPnl(t))))
    : 0;

  // R:R calculation
  const rrValues = trades.map(t => calculateRR(t)).filter(rr => rr !== 0);
  const avgRR = rrValues.length > 0 
    ? rrValues.reduce((sum, rr) => sum + Math.abs(rr), 0) / rrValues.length
    : 0;

  // Max drawdown calculation (equity curve based)
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
  
  const drawdownBase = initialBalance + peak;
  const maxDrawdownPercent = drawdownBase > 0 ? Math.min((maxDrawdown / drawdownBase) * 100, 100) : 0;

  // Sharpe Ratio (simplified: using daily returns)
  // Sharpe = (Mean Return - Risk Free Rate) / Std Dev of Returns
  // Using 0% risk-free rate for simplicity
  const pnlValues = trades.map(t => getTradeNetPnl(t));
  const meanReturn = avgPnl;
  const variance = pnlValues.reduce((sum, pnl) => sum + Math.pow(pnl - meanReturn, 2), 0) / pnlValues.length;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

  // Consecutive wins/losses
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
 * Calculate performance metrics per strategy
 */
export function calculateStrategyPerformance(
  trades: TradeEntry[],
  strategies: TradingStrategy[]
): StrategyPerformance[] {
  const totalPnl = trades.reduce((sum, t) => sum + getTradeNetPnl(t), 0);

  return strategies.map(strategy => {
    // Find trades that use this strategy
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
        avgRR: 0,
        contribution: 0,
      };
    }

    const wins = strategyTrades.filter(t => t.result === 'win').length;
    const losses = strategyTrades.filter(t => t.result === 'loss').length;
    const strategyPnl = strategyTrades.reduce((sum, t) => sum + getTradeNetPnl(t), 0);
    
    const rrValues = strategyTrades.map(t => calculateRR(t)).filter(rr => rr !== 0);
    const avgRR = rrValues.length > 0
      ? rrValues.reduce((sum, rr) => sum + Math.abs(rr), 0) / rrValues.length
      : 0;

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
 * Generate equity curve data from trades
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
