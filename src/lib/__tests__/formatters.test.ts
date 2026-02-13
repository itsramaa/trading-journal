/**
 * Unit tests for formatters.ts
 */
import { describe, it, expect } from 'vitest';
import {
  formatWinRate,
  formatPercentUnsigned,
  formatPercent,
  formatNumber,
  formatCurrency,
  formatPnl,
  formatCompactCurrency,
  formatQuantity,
  formatRatio,
  formatFee,
  formatRelativeTime,
} from '../formatters';

describe('formatWinRate', () => {
  it('formats standard win rate', () => {
    expect(formatWinRate(65.5)).toBe('65.5%');
  });

  it('formats 0%', () => {
    expect(formatWinRate(0)).toBe('0.0%');
  });

  it('formats 100%', () => {
    expect(formatWinRate(100)).toBe('100.0%');
  });
});

describe('formatPercentUnsigned', () => {
  it('formats positive value', () => {
    expect(formatPercentUnsigned(12.345)).toBe('12.35%');
  });

  it('formats zero', () => {
    expect(formatPercentUnsigned(0)).toBe('0.00%');
  });

  it('formats negative value (no sign removal)', () => {
    expect(formatPercentUnsigned(-5.1)).toBe('-5.10%');
  });
});

describe('formatPercent', () => {
  it('adds + sign for positive', () => {
    expect(formatPercent(10)).toBe('+10.00%');
  });

  it('keeps - sign for negative', () => {
    expect(formatPercent(-3.5)).toBe('-3.50%');
  });

  it('shows +0.00% for zero', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });
});

describe('formatNumber', () => {
  it('formats with max decimals', () => {
    expect(formatNumber(1.23456789)).toBe('1.2346');
  });

  it('removes trailing zeros', () => {
    expect(formatNumber(1.1)).toBe('1.1');
  });

  it('formats integer', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

describe('formatCurrency', () => {
  it('formats USD', () => {
    const result = formatCurrency(1234.56, 'USD');
    expect(result).toContain('$');
    expect(result).toContain('1,234');
  });

  it('formats IDR without decimals', () => {
    const result = formatCurrency(50000, 'IDR');
    expect(result).toContain('Rp');
  });
});

describe('formatPnl', () => {
  it('adds + for positive', () => {
    const result = formatPnl(100, 'USD');
    expect(result).toContain('+');
  });

  it('adds - for negative', () => {
    const result = formatPnl(-50, 'USD');
    expect(result).toContain('-');
  });
});

describe('formatCompactCurrency', () => {
  it('formats thousands with K', () => {
    const result = formatCompactCurrency(5000, 'USD');
    expect(result).toContain('K');
  });

  it('formats millions with M', () => {
    const result = formatCompactCurrency(2500000, 'USD');
    expect(result).toContain('M');
  });

  it('formats small values normally', () => {
    const result = formatCompactCurrency(50, 'USD');
    expect(result).toContain('$');
  });
});

describe('formatQuantity', () => {
  it('formats crypto with up to 8 decimals', () => {
    expect(formatQuantity(0.00012345, 'CRYPTO')).toBe('0.00012345');
  });

  it('formats whole number stocks', () => {
    const result = formatQuantity(100, 'US');
    expect(result).toBe('100');
  });
});

describe('formatRatio', () => {
  it('formats R:R ratio', () => {
    expect(formatRatio(2.5)).toBe('2.50:1');
  });
});

describe('formatFee', () => {
  it('formats fee with asset', () => {
    expect(formatFee(0.1234, 'USDT')).toBe('0.1234 USDT');
  });
});

describe('formatRelativeTime', () => {
  it('returns "Just now" for recent time', () => {
    expect(formatRelativeTime(new Date())).toBe('Just now');
  });

  it('returns minutes ago', () => {
    const d = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(d)).toBe('5m ago');
  });
});
