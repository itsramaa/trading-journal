import { describe, it, expect } from 'vitest';
import { calculateAdvancedRiskMetrics, AdvancedRiskMetrics } from '../advanced-risk-metrics';

function makeTrade(pnl: number, date: string, result?: string) {
  return { pnl, realized_pnl: pnl, trade_date: date, result: result ?? (pnl >= 0 ? 'win' : 'loss') };
}

describe('calculateAdvancedRiskMetrics', () => {
  it('returns empty metrics for no trades', () => {
    const m = calculateAdvancedRiskMetrics([], 10000);
    expect(m.sharpeRatio).toBe(0);
    expect(m.maxDrawdown).toBe(0);
    expect(m.kellyPercent).toBe(0);
  });

  it('calculates with single winning trade', () => {
    const m = calculateAdvancedRiskMetrics([makeTrade(100, '2025-01-01')], 10000);
    expect(m.maxDrawdown).toBe(0);
    expect(m.winStreakMax).toBe(1);
    expect(m.lossStreakMax).toBe(0);
    expect(m.recoveryFactor).toBe(0); // no drawdown
  });

  it('calculates max drawdown correctly', () => {
    const trades = [
      makeTrade(200, '2025-01-01'),
      makeTrade(-300, '2025-01-02', 'loss'),
      makeTrade(50, '2025-01-03'),
    ];
    const m = calculateAdvancedRiskMetrics(trades, 10000);
    // equity: 10000 → 10200 → 9900 → 9950. peak=10200, dd=300
    expect(m.maxDrawdown).toBe(300);
  });

  it('calculates streaks correctly', () => {
    const trades = [
      makeTrade(10, '2025-01-01'),
      makeTrade(20, '2025-01-02'),
      makeTrade(-5, '2025-01-03', 'loss'),
      makeTrade(-3, '2025-01-04', 'loss'),
      makeTrade(-1, '2025-01-05', 'loss'),
    ];
    const m = calculateAdvancedRiskMetrics(trades, 10000);
    expect(m.winStreakMax).toBe(2);
    expect(m.lossStreakMax).toBe(3);
  });

  it('calculates kelly percent ≥ 0', () => {
    const trades = [
      makeTrade(50, '2025-01-01'),
      makeTrade(-30, '2025-01-02', 'loss'),
    ];
    const m = calculateAdvancedRiskMetrics(trades, 10000);
    expect(m.kellyPercent).toBeGreaterThanOrEqual(0);
  });

  it('handles all-loss scenario', () => {
    const trades = [
      makeTrade(-10, '2025-01-01', 'loss'),
      makeTrade(-20, '2025-01-02', 'loss'),
    ];
    const m = calculateAdvancedRiskMetrics(trades, 10000);
    expect(m.winStreakMax).toBe(0);
    expect(m.kellyPercent).toBe(0);
    expect(m.expectancy).toBeLessThan(0);
  });

  it('handles identical returns (zero std dev)', () => {
    const trades = [
      makeTrade(10, '2025-01-01'),
      makeTrade(10, '2025-01-02'),
      makeTrade(10, '2025-01-03'),
    ];
    const m = calculateAdvancedRiskMetrics(trades, 10000);
    // stdDev = 0 → sharpe should be 0 (guarded)
    expect(m.sharpeRatio).toBe(0);
    expect(m.sortinoRatio).toBe(0);
  });

  it('returns numeric values (no NaN/Infinity)', () => {
    const trades = [makeTrade(100, '2025-01-01'), makeTrade(-50, '2025-01-02', 'loss')];
    const m = calculateAdvancedRiskMetrics(trades, 10000);
    for (const [key, val] of Object.entries(m)) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });
});
