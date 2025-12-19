import { useMemo } from "react";
import { useHoldings, useTransactions, usePortfolioHistory, useDefaultPortfolio } from "@/hooks/use-portfolio";

interface MonthlyReturn {
  month: string;
  return: number;
}

interface RiskMetric {
  metric: string;
  value: number;
}

interface AssetPerformance {
  symbol: string;
  name: string;
  return: number;
  value: number;
  weight: number;
  contribution: number;
}

export interface AnalyticsMetrics {
  totalValue: number;
  totalCostBasis: number;
  totalProfitLoss: number;
  totalProfitLossPercent: number;
  cagr: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  volatility: number;
  beta: number;
  alpha: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  calmarRatio: number;
  monthlyReturns: MonthlyReturn[];
  riskMetrics: RiskMetric[];
  assetPerformance: AssetPerformance[];
}

export function useAnalyticsData() {
  const { data: defaultPortfolio } = useDefaultPortfolio();
  const { data: holdings = [], isLoading: holdingsLoading } = useHoldings(defaultPortfolio?.id);
  const { data: transactions = [], isLoading: transactionsLoading } = useTransactions(defaultPortfolio?.id);
  const { data: history = [], isLoading: historyLoading } = usePortfolioHistory(defaultPortfolio?.id, 'ALL');

  const analytics = useMemo<AnalyticsMetrics>(() => {
    // Calculate total value and cost basis from holdings
    let totalValue = 0;
    let totalCostBasis = 0;

    holdings.forEach(h => {
      const currentPrice = h.price_cache?.price || h.assets?.current_price || h.average_cost;
      const value = Number(h.quantity) * Number(currentPrice);
      totalValue += value;
      totalCostBasis += Number(h.total_cost);
    });

    const totalProfitLoss = totalValue - totalCostBasis;
    const totalProfitLossPercent = totalCostBasis > 0 ? (totalProfitLoss / totalCostBasis) * 100 : 0;

    // Calculate CAGR from oldest transaction
    const oldestTransaction = transactions.length > 0 
      ? new Date(Math.min(...transactions.map(t => new Date(t.transaction_date).getTime())))
      : new Date();
    const yearsHeld = Math.max(0.1, (Date.now() - oldestTransaction.getTime()) / (365 * 24 * 60 * 60 * 1000));
    const cagr = totalCostBasis > 0 
      ? (Math.pow(totalValue / totalCostBasis, 1 / yearsHeld) - 1) * 100 
      : 0;

    // Calculate monthly returns from portfolio history
    const monthlyReturns: MonthlyReturn[] = [];
    const monthlyValues: Record<string, { start: number; end: number }> = {};

    history.forEach(h => {
      const date = new Date(h.recorded_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      
      if (!monthlyValues[monthKey]) {
        monthlyValues[monthKey] = { start: Number(h.total_value), end: Number(h.total_value) };
      } else {
        monthlyValues[monthKey].end = Number(h.total_value);
      }
    });

    const months = Object.keys(monthlyValues).sort();
    const returns: number[] = [];
    
    for (let i = 0; i < months.length; i++) {
      const monthData = monthlyValues[months[i]];
      let monthReturn = 0;
      
      if (i > 0) {
        const prevEnd = monthlyValues[months[i - 1]].end;
        if (prevEnd > 0) {
          monthReturn = ((monthData.end - prevEnd) / prevEnd) * 100;
        }
      } else if (monthData.start > 0) {
        monthReturn = ((monthData.end - monthData.start) / monthData.start) * 100;
      }
      
      returns.push(monthReturn);
      
      const date = new Date(months[i] + '-01');
      monthlyReturns.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        return: parseFloat(monthReturn.toFixed(1)),
      });
    }

    // If no history, generate from current data
    if (monthlyReturns.length === 0) {
      const currentMonth = new Date().toLocaleDateString('en-US', { month: 'short' });
      monthlyReturns.push({ month: currentMonth, return: parseFloat(totalProfitLossPercent.toFixed(1)) });
    }

    // Calculate volatility (standard deviation of returns)
    const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const variance = returns.length > 0 
      ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length 
      : 0;
    const volatility = Math.sqrt(variance) * Math.sqrt(12); // Annualized

    // Calculate win/loss statistics from transactions
    const realizedPnL: number[] = [];
    transactions.forEach(t => {
      if (t.transaction_type === 'SELL') {
        // Simplified P&L calculation - in reality would need cost basis tracking
        const pnl = Number(t.total_amount) - (Number(t.quantity) * Number(t.price_per_unit) * 0.9); // Assume 10% profit on sells
        realizedPnL.push(pnl);
      }
    });

    const wins = realizedPnL.filter(p => p > 0);
    const losses = realizedPnL.filter(p => p < 0);
    const winRate = realizedPnL.length > 0 ? (wins.length / realizedPnL.length) * 100 : 50;
    const avgWin = wins.length > 0 ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((a, b) => a + b, 0) / losses.length : 0;
    const profitFactor = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 1;

    // Calculate max drawdown from history
    let peak = 0;
    let maxDrawdown = 0;
    history.forEach(h => {
      const value = Number(h.total_value);
      if (value > peak) peak = value;
      const drawdown = peak > 0 ? ((value - peak) / peak) * 100 : 0;
      if (drawdown < maxDrawdown) maxDrawdown = drawdown;
    });

    // Calculate Sharpe Ratio (assuming 5% risk-free rate)
    const riskFreeRate = 5;
    const excessReturn = (cagr - riskFreeRate);
    const sharpeRatio = volatility > 0 ? excessReturn / volatility : 0;

    // Calculate Sortino Ratio (using downside deviation)
    const negativeReturns = returns.filter(r => r < 0);
    const downsideVariance = negativeReturns.length > 0 
      ? negativeReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / negativeReturns.length 
      : 1;
    const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(12);
    const sortinoRatio = downsideDeviation > 0 ? excessReturn / downsideDeviation : 0;

    // Calculate Calmar Ratio
    const calmarRatio = Math.abs(maxDrawdown) > 0 ? cagr / Math.abs(maxDrawdown) : 0;

    // Beta and Alpha (simplified - assume market return of 10%)
    const marketReturn = 10;
    const beta = volatility > 0 ? Math.min(2, Math.max(0.5, volatility / 20)) : 1;
    const alpha = cagr - (riskFreeRate + beta * (marketReturn - riskFreeRate));

    // Risk metrics for radar chart (normalized to 0-100)
    const riskMetrics: RiskMetric[] = [
      { metric: 'Volatility', value: Math.min(100, Math.max(0, 100 - volatility * 2)) },
      { metric: 'Sharpe', value: Math.min(100, Math.max(0, sharpeRatio * 30 + 50)) },
      { metric: 'Sortino', value: Math.min(100, Math.max(0, sortinoRatio * 25 + 50)) },
      { metric: 'Beta', value: Math.min(100, Math.max(0, (2 - beta) * 50)) },
      { metric: 'Alpha', value: Math.min(100, Math.max(0, alpha * 5 + 50)) },
      { metric: 'Diversification', value: Math.min(100, holdings.length * 15) },
    ];

    // Asset performance attribution
    const assetPerformance: AssetPerformance[] = holdings.map(h => {
      const currentPrice = h.price_cache?.price || h.assets?.current_price || h.average_cost;
      const value = Number(h.quantity) * Number(currentPrice);
      const costBasis = Number(h.total_cost);
      const profitLoss = value - costBasis;
      const profitLossPercent = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
      const weight = totalValue > 0 ? (value / totalValue) * 100 : 0;
      const contribution = (profitLossPercent * weight) / 100;

      return {
        symbol: h.assets?.symbol || 'Unknown',
        name: h.assets?.name || 'Unknown',
        return: profitLossPercent,
        value,
        weight,
        contribution,
      };
    }).sort((a, b) => b.contribution - a.contribution);

    return {
      totalValue,
      totalCostBasis,
      totalProfitLoss,
      totalProfitLossPercent,
      cagr,
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(1)),
      volatility: parseFloat(volatility.toFixed(1)),
      beta: parseFloat(beta.toFixed(2)),
      alpha: parseFloat(alpha.toFixed(1)),
      winRate: parseFloat(winRate.toFixed(1)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      avgWin: parseFloat((avgWin / 1000000).toFixed(1)), // Convert to percentage-like
      avgLoss: parseFloat((avgLoss / 1000000).toFixed(1)),
      calmarRatio: parseFloat(calmarRatio.toFixed(2)),
      monthlyReturns,
      riskMetrics,
      assetPerformance,
    };
  }, [holdings, transactions, history]);

  return {
    analytics,
    isLoading: holdingsLoading || transactionsLoading || historyLoading,
    hasData: holdings.length > 0,
  };
}
