/**
 * @module advanced-risk-metrics
 * @description Professional-grade risk analytics engine for portfolio-level metrics.
 *
 * Computes institutional-standard risk ratios and position sizing recommendations
 * from a time-series of trade outcomes. All calculations assume a single-asset
 * portfolio denominated in the trade's quote currency (e.g., USDT).
 *
 * ### Metrics Overview
 * | Metric | Purpose | Formula |
 * |--------|---------|---------|
 * | **Sharpe Ratio** | Risk-adjusted return | `(mean - Rf) / σ × √252` |
 * | **Sortino Ratio** | Downside risk-adjusted return | `mean / σ_down × √252` |
 * | **Calmar Ratio** | Return vs worst drawdown | `annualized_return / max_drawdown%` |
 * | **VaR (95/99)** | Maximum expected daily loss | Historical percentile method |
 * | **Kelly Criterion** | Optimal position size | `W - (1-W) / (avgWin/avgLoss)` |
 * | **Expectancy** | Expected profit per trade | `(W × avgWin) - (L × avgLoss)` |
 *
 * ### PnL Standard
 * Uses the platform-wide fallback: `realized_pnl ?? pnl ?? 0`
 *
 * @see {@link src/lib/trading-calculations.ts} for basic trading stats
 * @see {@link src/hooks/trading/use-trade-stats.ts} for the React hook wrapper
 */

/**
 * Complete suite of advanced risk metrics for a trading portfolio.
 *
 * All ratios are annualized using 252 trading days per year.
 * Monetary values are in the portfolio's quote currency.
 */
export interface AdvancedRiskMetrics {
  /**
   * Annualized Sharpe Ratio.
   * Measures excess return per unit of total volatility.
   * - `> 1.0` = Good risk-adjusted returns
   * - `> 2.0` = Very good
   * - `> 3.0` = Excellent
   */
  sharpeRatio: number;

  /**
   * Annualized Sortino Ratio.
   * Like Sharpe but only penalizes downside volatility.
   * Preferred for strategies with asymmetric return profiles.
   * Generally higher than Sharpe since upside volatility is excluded.
   */
  sortinoRatio: number;

  /**
   * Calmar Ratio: annualized return / max drawdown percentage.
   * Measures return relative to the worst historical drawdown.
   * - `> 1.0` = Returns exceed worst drawdown
   * - `> 3.0` = Excellent risk-adjusted performance
   */
  calmarRatio: number;

  /**
   * Value at Risk at 95% confidence (historical method).
   * Maximum expected single-trade loss with 95% probability.
   * Expressed as an absolute monetary value in quote currency.
   */
  valueAtRisk95: number;

  /**
   * Value at Risk at 99% confidence (historical method).
   * Maximum expected single-trade loss with 99% probability.
   */
  valueAtRisk99: number;

  /** Maximum peak-to-trough equity decline (absolute value in quote currency) */
  maxDrawdown: number;

  /** Maximum drawdown as a percentage of equity at peak */
  maxDrawdownPercent: number;

  /** Current distance from equity peak (absolute value) */
  currentDrawdown: number;

  /** Current drawdown as a percentage of equity at peak */
  currentDrawdownPercent: number;

  /** Average duration of drawdown periods (in trade counts, approximating days) */
  avgDrawdownDuration: number;

  /** Longest drawdown period (in trade counts) */
  maxDrawdownDuration: number;

  /**
   * Recovery Factor: net profit / max drawdown.
   * Indicates how efficiently capital is recovered after drawdowns.
   * - `> 1.0` = Net profit exceeds worst drawdown
   */
  recoveryFactor: number;

  /** Longest consecutive winning streak */
  winStreakMax: number;

  /** Longest consecutive losing streak */
  lossStreakMax: number;

  /**
   * Mathematical expectancy per trade.
   * `(winRate × avgWin) - (lossRate × avgLoss)`
   * Positive value indicates a profitable edge.
   */
  expectancy: number;

  /**
   * Kelly Criterion optimal bet size as a percentage (0–100).
   * `kelly = W - (1-W) / (avgWin / avgLoss)`
   * Clamped to 0 minimum (never suggests negative sizing).
   *
   * ⚠️ Full Kelly is aggressive; most traders use half-Kelly (kellyPercent / 2).
   */
  kellyPercent: number;
}

/**
 * Minimal trade shape required for risk metric calculations.
 * @internal
 */
interface TradeInput {
  /** Estimated PnL (fallback if realized_pnl is absent) */
  pnl: number;
  /** Actual realized PnL from exchange (preferred over pnl) */
  realized_pnl?: number;
  /** ISO date string for chronological sorting */
  trade_date: string;
  /** Trade outcome: 'win', 'loss', or 'breakeven' */
  result?: string;
}

/** Risk-free rate assumption (simplified to 0 for crypto markets) */
const RISK_FREE_RATE = 0;

/** Standard trading days per year for annualization */
const TRADING_DAYS_PER_YEAR = 252;

/**
 * Computes a comprehensive suite of advanced risk metrics from trade history.
 *
 * ### Algorithm
 * 1. Sorts trades chronologically
 * 2. Builds an equity curve from cumulative PnL
 * 3. Computes return series (PnL / initialCapital)
 * 4. Derives all risk ratios from the return distribution
 * 5. Tracks drawdown periods with duration analysis
 *
 * ### Assumptions
 * - Returns are computed as simple returns (not log returns)
 * - Risk-free rate is 0% (appropriate for crypto)
 * - Annualization uses 252 trading days
 * - VaR uses the historical simulation method (non-parametric)
 *
 * @param trades - Array of closed trades with PnL and date information
 * @param initialCapital - Starting portfolio value for return calculations.
 *   Should use actual user capital for accurate ratios (default: 10,000).
 * @returns Complete {@link AdvancedRiskMetrics} with all values rounded to 2 decimal places
 *
 * @example
 * ```ts
 * const metrics = calculateAdvancedRiskMetrics(closedTrades, portfolio.totalCapital);
 * console.log(`Sharpe: ${metrics.sharpeRatio}, Kelly: ${metrics.kellyPercent}%`);
 * ```
 */
export function calculateAdvancedRiskMetrics(
  trades: TradeInput[],
  initialCapital: number = 10000
): AdvancedRiskMetrics {
  if (trades.length === 0) {
    return getEmptyMetrics();
  }

  // Sort chronologically for time-series analysis
  const sorted = [...trades].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );

  // Extract PnL using platform-standard fallback chain
  const pnls = sorted.map(t => t.realized_pnl ?? t.pnl ?? 0);
  const returns = pnls.map(pnl => pnl / initialCapital);

  // Build equity curve: [initialCapital, ..., finalEquity]
  let equity = initialCapital;
  const equityCurve = [initialCapital];
  for (const pnl of pnls) {
    equity += pnl;
    equityCurve.push(equity);
  }

  // === Return Distribution Statistics ===
  const meanReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Sharpe Ratio: (mean_return - Rf) / σ × √252
  const sharpeRatio = stdDev > 0 
    ? ((meanReturn - RISK_FREE_RATE / TRADING_DAYS_PER_YEAR) / stdDev) * Math.sqrt(TRADING_DAYS_PER_YEAR) 
    : 0;

  // Sortino Ratio: uses only downside deviation (σ_down)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.length > 0
    ? downsideReturns.reduce((s, r) => s + Math.pow(r, 2), 0) / returns.length
    : 0;
  const downsideDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDev > 0 
    ? (meanReturn / downsideDev) * Math.sqrt(TRADING_DAYS_PER_YEAR) 
    : 0;

  // === Drawdown Analysis ===
  let peak = equityCurve[0];
  let maxDD = 0;
  let maxDDPercent = 0;
  let currentDDStart = 0;
  let inDrawdown = false;
  const drawdownDurations: number[] = [];

  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i] > peak) {
      peak = equityCurve[i];
      if (inDrawdown) {
        drawdownDurations.push(i - currentDDStart);
        inDrawdown = false;
      }
    } else {
      if (!inDrawdown) {
        currentDDStart = i;
        inDrawdown = true;
      }
      const dd = peak - equityCurve[i];
      const ddPercent = (dd / peak) * 100;
      if (dd > maxDD) {
        maxDD = dd;
        maxDDPercent = ddPercent;
      }
    }
  }
  if (inDrawdown) {
    drawdownDurations.push(equityCurve.length - 1 - currentDDStart);
  }

  const maxDDDuration = drawdownDurations.length > 0 ? Math.max(...drawdownDurations) : 0;
  const avgDDDuration = drawdownDurations.length > 0 
    ? drawdownDurations.reduce((s, d) => s + d, 0) / drawdownDurations.length 
    : 0;

  // Current drawdown state
  const currentEquity = equityCurve[equityCurve.length - 1];
  const currentDD = Math.max(0, peak - currentEquity);
  const currentDDPercent = peak > 0 ? (currentDD / peak) * 100 : 0;

  // Calmar Ratio: annualized_return / max_drawdown_percent
  const totalReturn = (currentEquity - initialCapital) / initialCapital;
  const annualizedReturn = trades.length > 0 
    ? totalReturn * (TRADING_DAYS_PER_YEAR / trades.length) 
    : 0;
  const calmarRatio = maxDDPercent > 0 ? (annualizedReturn * 100) / maxDDPercent : 0;

  // === Value at Risk (Historical Simulation Method) ===
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95Index = Math.floor(sortedReturns.length * 0.05);
  const var99Index = Math.floor(sortedReturns.length * 0.01);
  const valueAtRisk95 = sortedReturns.length > 0 
    ? Math.abs(sortedReturns[var95Index] || 0) * initialCapital 
    : 0;
  const valueAtRisk99 = sortedReturns.length > 0 
    ? Math.abs(sortedReturns[var99Index] || 0) * initialCapital 
    : 0;

  // Recovery Factor: net_profit / max_drawdown
  const netProfit = currentEquity - initialCapital;
  const recoveryFactor = maxDD > 0 ? netProfit / maxDD : 0;

  // === Streak Analysis ===
  let currentWinStreak = 0, maxWinStreak = 0;
  let currentLossStreak = 0, maxLossStreak = 0;
  for (const pnl of pnls) {
    if (pnl > 0) {
      currentWinStreak++;
      currentLossStreak = 0;
      maxWinStreak = Math.max(maxWinStreak, currentWinStreak);
    } else if (pnl < 0) {
      currentLossStreak++;
      currentWinStreak = 0;
      maxLossStreak = Math.max(maxLossStreak, currentLossStreak);
    }
  }

  // === Expectancy & Kelly Criterion ===
  const wins = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p < 0);
  const winRate = pnls.length > 0 ? wins.length / pnls.length : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, w) => s + w, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, l) => s + l, 0) / losses.length) : 0;

  // Expectancy = (W × avgWin) - (L × avgLoss)
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);

  // Kelly % = W - (1-W) / (avgWin / avgLoss), clamped to [0, 100]
  const kellyPercent = avgLoss > 0 
    ? Math.max(0, (winRate - ((1 - winRate) / (avgWin / avgLoss))) * 100) 
    : 0;

  return {
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    sortinoRatio: Number(sortinoRatio.toFixed(2)),
    calmarRatio: Number(calmarRatio.toFixed(2)),
    valueAtRisk95: Number(valueAtRisk95.toFixed(2)),
    valueAtRisk99: Number(valueAtRisk99.toFixed(2)),
    maxDrawdown: Number(maxDD.toFixed(2)),
    maxDrawdownPercent: Number(Math.min(maxDDPercent, 100).toFixed(2)),
    currentDrawdown: Number(currentDD.toFixed(2)),
    currentDrawdownPercent: Number(currentDDPercent.toFixed(2)),
    avgDrawdownDuration: Number(avgDDDuration.toFixed(1)),
    maxDrawdownDuration: maxDDDuration,
    recoveryFactor: Number(recoveryFactor.toFixed(2)),
    winStreakMax: maxWinStreak,
    lossStreakMax: maxLossStreak,
    expectancy: Number(expectancy.toFixed(2)),
    kellyPercent: Number(kellyPercent.toFixed(1)),
  };
}

/**
 * Returns a zeroed-out metrics object for empty trade arrays.
 * Ensures consumers always receive a valid {@link AdvancedRiskMetrics} shape.
 * @internal
 */
function getEmptyMetrics(): AdvancedRiskMetrics {
  return {
    sharpeRatio: 0, sortinoRatio: 0, calmarRatio: 0,
    valueAtRisk95: 0, valueAtRisk99: 0,
    maxDrawdown: 0, maxDrawdownPercent: 0,
    currentDrawdown: 0, currentDrawdownPercent: 0,
    avgDrawdownDuration: 0, maxDrawdownDuration: 0,
    recoveryFactor: 0, winStreakMax: 0, lossStreakMax: 0,
    expectancy: 0, kellyPercent: 0,
  };
}
