/**
 * Advanced Risk Metrics Calculator
 * Sharpe, Sortino, Calmar, VaR, Max Drawdown with recovery time
 */

export interface AdvancedRiskMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  valueAtRisk95: number;     // 95th percentile daily loss
  valueAtRisk99: number;     // 99th percentile daily loss
  maxDrawdown: number;       // absolute value
  maxDrawdownPercent: number;
  currentDrawdown: number;
  currentDrawdownPercent: number;
  avgDrawdownDuration: number; // in days
  maxDrawdownDuration: number; // in days
  recoveryFactor: number;     // net profit / max drawdown
  winStreakMax: number;
  lossStreakMax: number;
  expectancy: number;
  kellyPercent: number;
}

interface TradeInput {
  pnl: number;
  realized_pnl?: number;
  trade_date: string;
  result?: string;
}

const RISK_FREE_RATE = 0; // Simplified
const TRADING_DAYS_PER_YEAR = 252;

export function calculateAdvancedRiskMetrics(
  trades: TradeInput[],
  initialCapital: number = 10000
): AdvancedRiskMetrics {
  if (trades.length === 0) {
    return getEmptyMetrics();
  }

  const sorted = [...trades].sort(
    (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );

  const pnls = sorted.map(t => t.realized_pnl ?? t.pnl ?? 0);
  const returns = pnls.map(pnl => pnl / initialCapital);

  // Equity curve
  let equity = initialCapital;
  const equityCurve = [initialCapital];
  for (const pnl of pnls) {
    equity += pnl;
    equityCurve.push(equity);
  }

  // Mean and std dev of returns
  const meanReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  // Sharpe Ratio (annualized)
  const sharpeRatio = stdDev > 0 
    ? ((meanReturn - RISK_FREE_RATE / TRADING_DAYS_PER_YEAR) / stdDev) * Math.sqrt(TRADING_DAYS_PER_YEAR) 
    : 0;

  // Sortino Ratio (only downside deviation)
  const downsideReturns = returns.filter(r => r < 0);
  const downsideVariance = downsideReturns.length > 0
    ? downsideReturns.reduce((s, r) => s + Math.pow(r, 2), 0) / returns.length
    : 0;
  const downsideDev = Math.sqrt(downsideVariance);
  const sortinoRatio = downsideDev > 0 
    ? (meanReturn / downsideDev) * Math.sqrt(TRADING_DAYS_PER_YEAR) 
    : 0;

  // Max Drawdown
  let peak = equityCurve[0];
  let maxDD = 0;
  let maxDDPercent = 0;
  let drawdownStart = 0;
  let maxDDDuration = 0;
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
        drawdownStart = currentDDStart;
      }
    }
  }
  if (inDrawdown) {
    drawdownDurations.push(equityCurve.length - 1 - currentDDStart);
  }

  maxDDDuration = drawdownDurations.length > 0 ? Math.max(...drawdownDurations) : 0;
  const avgDDDuration = drawdownDurations.length > 0 
    ? drawdownDurations.reduce((s, d) => s + d, 0) / drawdownDurations.length 
    : 0;

  // Current drawdown
  const currentEquity = equityCurve[equityCurve.length - 1];
  const currentDD = Math.max(0, peak - currentEquity);
  const currentDDPercent = peak > 0 ? (currentDD / peak) * 100 : 0;

  // Calmar Ratio (annualized return / max drawdown)
  const totalReturn = (currentEquity - initialCapital) / initialCapital;
  const annualizedReturn = trades.length > 0 
    ? totalReturn * (TRADING_DAYS_PER_YEAR / trades.length) 
    : 0;
  const calmarRatio = maxDDPercent > 0 ? (annualizedReturn * 100) / maxDDPercent : 0;

  // Value at Risk (Historical method)
  const sortedReturns = [...returns].sort((a, b) => a - b);
  const var95Index = Math.floor(sortedReturns.length * 0.05);
  const var99Index = Math.floor(sortedReturns.length * 0.01);
  const valueAtRisk95 = sortedReturns.length > 0 
    ? Math.abs(sortedReturns[var95Index] || 0) * initialCapital 
    : 0;
  const valueAtRisk99 = sortedReturns.length > 0 
    ? Math.abs(sortedReturns[var99Index] || 0) * initialCapital 
    : 0;

  // Recovery Factor
  const netProfit = currentEquity - initialCapital;
  const recoveryFactor = maxDD > 0 ? netProfit / maxDD : 0;

  // Streaks
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

  // Expectancy & Kelly
  const wins = pnls.filter(p => p > 0);
  const losses = pnls.filter(p => p < 0);
  const winRate = pnls.length > 0 ? wins.length / pnls.length : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, w) => s + w, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, l) => s + l, 0) / losses.length) : 0;
  const expectancy = (winRate * avgWin) - ((1 - winRate) * avgLoss);
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
    maxDrawdownPercent: Number(maxDDPercent.toFixed(2)),
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
