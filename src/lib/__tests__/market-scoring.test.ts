import { describe, it, expect } from 'vitest';
import {
  calculateCompositeScore,
  calculateTradingBias,
  calculateDataQuality,
  determineVolatilityLevel,
  calculateStopMultiplier,
  determinePositionAdjustment,
  determineEventRiskLevel,
  getFearGreedLabel,
} from '../market-scoring';

describe('calculateCompositeScore', () => {
  it('returns 50 for empty context', () => {
    expect(calculateCompositeScore({})).toBe(50);
  });

  it('increases score for high technical score', () => {
    const score = calculateCompositeScore({
      sentiment: { technicalScore: 80 },
    });
    expect(score).toBeGreaterThan(50);
  });

  it('decreases score for low technical score', () => {
    const score = calculateCompositeScore({
      sentiment: { technicalScore: 20 },
    });
    expect(score).toBeLessThan(50);
  });

  it('clamps between 0 and 100', () => {
    const high = calculateCompositeScore({
      sentiment: { technicalScore: 100, onChainScore: 100, macroScore: 100 },
      momentum: { priceChange24h: 20 },
    });
    expect(high).toBeLessThanOrEqual(100);
    expect(high).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateTradingBias', () => {
  it('returns LONG_FAVORABLE for high score', () => {
    expect(calculateTradingBias(70, {})).toBe('LONG_FAVORABLE');
  });

  it('returns SHORT_FAVORABLE for low score', () => {
    expect(calculateTradingBias(30, {})).toBe('SHORT_FAVORABLE');
  });

  it('returns NEUTRAL for mid score', () => {
    expect(calculateTradingBias(50, {})).toBe('NEUTRAL');
  });

  it('returns AVOID for very high event risk', () => {
    expect(calculateTradingBias(70, {
      events: { hasHighImpactToday: true, riskLevel: 'VERY_HIGH' },
    })).toBe('AVOID');
  });

  it('returns AVOID for high vol + high event risk', () => {
    expect(calculateTradingBias(60, {
      volatility: { level: 'high' },
      events: { riskLevel: 'HIGH' },
    })).toBe('AVOID');
  });
});

describe('calculateDataQuality', () => {
  it('returns 0 for empty context', () => {
    expect(calculateDataQuality({})).toBe(0);
  });

  it('returns 100 for full context', () => {
    const quality = calculateDataQuality({
      sentiment: { technicalScore: 50, onChainScore: 50, macroScore: 50, overall: 'neutral' as const, confidence: 50 },
      fearGreed: { value: 50, label: 'Neutral' },
      volatility: { level: 'medium', value: 3, suggestedStopMultiplier: 1.5 },
      events: { riskLevel: 'LOW', hasHighImpactToday: false, positionSizeAdjustment: 'normal', highImpactCount: 0 },
      momentum: { priceChange24h: 0, isTopGainer: false, isTopLoser: false, rank24h: 50 },
    });
    expect(quality).toBe(100);
  });
});

describe('determineVolatilityLevel', () => {
  it('returns low for < 2', () => {
    expect(determineVolatilityLevel(1.5)).toBe('low');
  });
  it('returns medium for 2-5', () => {
    expect(determineVolatilityLevel(3)).toBe('medium');
  });
  it('returns high for >= 5', () => {
    expect(determineVolatilityLevel(6)).toBe('high');
  });
});

describe('calculateStopMultiplier', () => {
  it('returns 1.0 for low', () => {
    expect(calculateStopMultiplier('low')).toBe(1.0);
  });
  it('returns 1.5 for medium', () => {
    expect(calculateStopMultiplier('medium')).toBe(1.5);
  });
  it('returns 2.0 for high', () => {
    expect(calculateStopMultiplier('high')).toBe(2.0);
  });
});

describe('determinePositionAdjustment', () => {
  it('returns normal for 0 events', () => {
    expect(determinePositionAdjustment(0)).toBe('normal');
  });
  it('returns reduce_30% for 1 event', () => {
    expect(determinePositionAdjustment(1)).toBe('reduce_30%');
  });
  it('returns reduce_50% for 2+ events', () => {
    expect(determinePositionAdjustment(2)).toBe('reduce_50%');
  });
});

describe('determineEventRiskLevel', () => {
  it('returns LOW for 0', () => {
    expect(determineEventRiskLevel(0)).toBe('LOW');
  });
  it('returns MODERATE for 1', () => {
    expect(determineEventRiskLevel(1)).toBe('MODERATE');
  });
  it('returns HIGH for 2', () => {
    expect(determineEventRiskLevel(2)).toBe('HIGH');
  });
  it('returns VERY_HIGH for 3+', () => {
    expect(determineEventRiskLevel(3)).toBe('VERY_HIGH');
  });
});

describe('getFearGreedLabel', () => {
  it('returns Extreme Fear for <= 20', () => {
    expect(getFearGreedLabel(10)).toBe('Extreme Fear');
  });
  it('returns Fear for 21-40', () => {
    expect(getFearGreedLabel(30)).toBe('Fear');
  });
  it('returns Neutral for 41-60', () => {
    expect(getFearGreedLabel(50)).toBe('Neutral');
  });
  it('returns Greed for 61-80', () => {
    expect(getFearGreedLabel(70)).toBe('Greed');
  });
  it('returns Extreme Greed for > 80', () => {
    expect(getFearGreedLabel(90)).toBe('Extreme Greed');
  });
});
