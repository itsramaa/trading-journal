import { describe, it, expect } from 'vitest';
import {
  getCorrelation,
  checkCorrelationRisk,
  getCorrelationLabel,
  extractSymbols,
  CORRELATION_WARNING_THRESHOLD,
  CORRELATION_HIGH_THRESHOLD,
} from '../correlation-utils';

describe('getCorrelation', () => {
  it('returns 1 for same symbol', () => {
    expect(getCorrelation('BTCUSDT', 'BTCUSDT')).toBe(1);
  });

  it('returns known correlation for BTC-ETH', () => {
    expect(getCorrelation('BTCUSDT', 'ETHUSDT')).toBe(0.82);
  });

  it('returns same value regardless of order', () => {
    expect(getCorrelation('ETHUSDT', 'BTCUSDT')).toBe(0.82);
  });

  it('returns 0 for unknown pair', () => {
    expect(getCorrelation('BTCUSDT', 'UNKNOWNUSDT')).toBe(0);
  });
});

describe('checkCorrelationRisk', () => {
  it('returns null for single symbol', () => {
    expect(checkCorrelationRisk(['BTCUSDT'])).toBeNull();
  });

  it('returns null for empty array', () => {
    expect(checkCorrelationRisk([])).toBeNull();
  });

  it('detects correlated pairs above threshold', () => {
    const result = checkCorrelationRisk(['BTCUSDT', 'ETHUSDT']);
    expect(result).not.toBeNull();
    expect(result!.pairs).toHaveLength(1);
    expect(result!.pairs[0].correlation).toBe(0.82);
  });

  it('returns null for uncorrelated pairs', () => {
    const result = checkCorrelationRisk(['BTCUSDT', 'UNKNOWNUSDT']);
    expect(result).toBeNull();
  });

  it('counts high risk pairs correctly', () => {
    const result = checkCorrelationRisk(['BTCUSDT', 'ETHUSDT', 'SOLUSDT']);
    expect(result).not.toBeNull();
    expect(result!.highRiskCount).toBeGreaterThanOrEqual(1);
  });

  it('respects custom threshold', () => {
    const result = checkCorrelationRisk(['BTCUSDT', 'XRPUSDT'], 0.9);
    // BTC-XRP is 0.68, below 0.9
    expect(result).toBeNull();
  });
});

describe('getCorrelationLabel', () => {
  it('returns Very High for >= 0.9', () => {
    expect(getCorrelationLabel(0.95)).toBe('Very High');
  });

  it('returns High for >= 0.75', () => {
    expect(getCorrelationLabel(0.8)).toBe('High');
  });

  it('returns Moderate for >= 0.6', () => {
    expect(getCorrelationLabel(0.65)).toBe('Moderate');
  });

  it('returns Low for >= 0.4', () => {
    expect(getCorrelationLabel(0.45)).toBe('Low');
  });

  it('returns Very Low for < 0.4', () => {
    expect(getCorrelationLabel(0.2)).toBe('Very Low');
  });
});

describe('extractSymbols', () => {
  it('extracts unique symbols', () => {
    const result = extractSymbols([
      { symbol: 'BTCUSDT' },
      { symbol: 'ETHUSDT' },
      { symbol: 'BTCUSDT' },
    ]);
    expect(result).toEqual(['BTCUSDT', 'ETHUSDT']);
  });

  it('returns empty for empty input', () => {
    expect(extractSymbols([])).toEqual([]);
  });
});

describe('thresholds', () => {
  it('warning threshold is 0.6', () => {
    expect(CORRELATION_WARNING_THRESHOLD).toBe(0.6);
  });

  it('high threshold is 0.75', () => {
    expect(CORRELATION_HIGH_THRESHOLD).toBe(0.75);
  });
});
