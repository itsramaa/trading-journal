import { describe, it, expect } from 'vitest';
import { calculateTradingHealthScore, TradingHealthScore } from '../trading-health-score';
import type { AdvancedRiskMetrics } from '../advanced-risk-metrics';

function makeMetrics(overrides: Partial<AdvancedRiskMetrics> = {}): AdvancedRiskMetrics {
  return {
    sharpeRatio: 1.5, sortinoRatio: 2, calmarRatio: 1,
    valueAtRisk95: 100, valueAtRisk99: 200,
    maxDrawdown: 500, maxDrawdownPercent: 10,
    currentDrawdown: 0, currentDrawdownPercent: 0,
    avgDrawdownDuration: 3, maxDrawdownDuration: 5,
    recoveryFactor: 2, winStreakMax: 5, lossStreakMax: 3,
    expectancy: 15, kellyPercent: 20,
    ...overrides,
  };
}

describe('calculateTradingHealthScore', () => {
  it('returns score between 0-100', () => {
    const result = calculateTradingHealthScore(makeMetrics(), 55, 50, 1.8);
    expect(result.overall).toBeGreaterThanOrEqual(0);
    expect(result.overall).toBeLessThanOrEqual(100);
  });

  it('weights sum to 100%', () => {
    const result = calculateTradingHealthScore(makeMetrics(), 55, 50, 1.8);
    const totalWeight = result.breakdown.reduce((s, b) => s + b.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0);
  });

  it('assigns grade A+ for excellent metrics', () => {
    const result = calculateTradingHealthScore(
      makeMetrics({ sharpeRatio: 3, maxDrawdownPercent: 2, recoveryFactor: 5 }),
      65, 200, 3.0
    );
    expect(result.grade).toBe('A+');
    expect(result.label).toBe('Excellent');
  });

  it('assigns grade F for terrible metrics', () => {
    const result = calculateTradingHealthScore(
      makeMetrics({ sharpeRatio: -1, maxDrawdownPercent: 60, recoveryFactor: -1 }),
      10, 3, 0.3
    );
    expect(result.grade).toBe('F');
    expect(result.label).toBe('Needs Improvement');
  });

  it('has 6 breakdown items', () => {
    const result = calculateTradingHealthScore(makeMetrics(), 55, 50, 1.8);
    expect(result.breakdown.length).toBe(6);
  });

  it('penalizes low sample size', () => {
    const low = calculateTradingHealthScore(makeMetrics(), 55, 3, 1.8);
    const high = calculateTradingHealthScore(makeMetrics(), 55, 100, 1.8);
    expect(high.overall).toBeGreaterThan(low.overall);
  });

  it('returns consistent color tokens', () => {
    const result = calculateTradingHealthScore(makeMetrics(), 55, 50, 1.8);
    expect(result.color).toMatch(/^text-/);
  });

  it('handles zero metrics without NaN', () => {
    const result = calculateTradingHealthScore(
      makeMetrics({ sharpeRatio: 0, maxDrawdownPercent: 0, recoveryFactor: 0, winStreakMax: 0, lossStreakMax: 0 }),
      0, 0, 0
    );
    expect(Number.isFinite(result.overall)).toBe(true);
  });
});
