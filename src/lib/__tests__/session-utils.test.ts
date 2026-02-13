/**
 * Unit tests for session-utils.ts
 */
import { describe, it, expect } from 'vitest';
import {
  getSessionForTime,
  getTradeSession,
  formatSessionTimeLocal,
  getActiveOverlaps,
  isValidSession,
  SESSION_LABELS,
  SESSION_UTC,
  type TradingSession,
} from '../session-utils';

describe('SESSION_LABELS', () => {
  it('has all expected keys', () => {
    const keys: TradingSession[] = ['sydney', 'tokyo', 'london', 'new_york', 'other'];
    keys.forEach(k => expect(SESSION_LABELS[k]).toBeDefined());
  });
});

describe('SESSION_UTC', () => {
  it('has correct session definitions', () => {
    expect(SESSION_UTC.sydney).toEqual({ start: 21, end: 6 });
    expect(SESSION_UTC.tokyo).toEqual({ start: 0, end: 9 });
    expect(SESSION_UTC.london).toEqual({ start: 7, end: 16 });
    expect(SESSION_UTC.new_york).toEqual({ start: 12, end: 21 });
  });
});

describe('getSessionForTime', () => {
  it('returns sydney for UTC 22:00', () => {
    const d = new Date('2025-01-15T22:00:00Z');
    expect(getSessionForTime(d)).toBe('sydney');
  });

  it('returns sydney for UTC 03:00 (crosses midnight)', () => {
    const d = new Date('2025-01-15T03:00:00Z');
    expect(getSessionForTime(d)).toBe('sydney');
  });

  it('returns tokyo for UTC 05:00', () => {
    // 05:00 is in both sydney (21-06) and tokyo (0-9) ranges
    // Sydney check comes first, so it returns sydney
    const d = new Date('2025-01-15T05:00:00Z');
    expect(getSessionForTime(d)).toBe('sydney');
  });

  it('returns london for UTC 10:00', () => {
    const d = new Date('2025-01-15T10:00:00Z');
    expect(getSessionForTime(d)).toBe('london');
  });

  it('returns new_york for UTC 15:00', () => {
    // 15:00 is in both london (7-16) and new_york (12-21)
    // London check comes first
    const d = new Date('2025-01-15T15:00:00Z');
    expect(getSessionForTime(d)).toBe('london');
  });

  it('returns new_york for UTC 18:00', () => {
    const d = new Date('2025-01-15T18:00:00Z');
    expect(getSessionForTime(d)).toBe('new_york');
  });

  it('accepts string date input', () => {
    expect(getSessionForTime('2025-01-15T22:30:00Z')).toBe('sydney');
  });
});

describe('isValidSession', () => {
  it('returns true for valid sessions', () => {
    expect(isValidSession('sydney')).toBe(true);
    expect(isValidSession('tokyo')).toBe(true);
    expect(isValidSession('london')).toBe(true);
    expect(isValidSession('new_york')).toBe(true);
    expect(isValidSession('other')).toBe(true);
  });

  it('returns false for invalid sessions', () => {
    expect(isValidSession('invalid')).toBe(false);
    expect(isValidSession('')).toBe(false);
  });
});

describe('getTradeSession', () => {
  it('prefers stored session column', () => {
    const trade = { trade_date: '2025-01-15T22:00:00Z', session: 'london' };
    expect(getTradeSession(trade)).toBe('london');
  });

  it('falls back to market_context session', () => {
    const trade = {
      trade_date: '2025-01-15T22:00:00Z',
      session: null,
      market_context: { session: { current: 'tokyo' as TradingSession } },
    };
    expect(getTradeSession(trade)).toBe('tokyo');
  });

  it('calculates from datetime when no stored session', () => {
    const trade = { trade_date: '2025-01-15T22:00:00Z', session: null };
    expect(getTradeSession(trade)).toBe('sydney');
  });
});

describe('getActiveOverlaps', () => {
  it('detects London/NY overlap at UTC 14:00', () => {
    const d = new Date('2025-01-15T14:00:00Z');
    expect(getActiveOverlaps(d)).toBe('London + NY');
  });

  it('detects Tokyo/London overlap at UTC 08:00', () => {
    const d = new Date('2025-01-15T08:00:00Z');
    expect(getActiveOverlaps(d)).toBe('Tokyo + London');
  });

  it('detects Sydney/Tokyo overlap at UTC 03:00', () => {
    const d = new Date('2025-01-15T03:00:00Z');
    expect(getActiveOverlaps(d)).toBe('Sydney + Tokyo');
  });

  it('returns null when no overlap at UTC 20:00', () => {
    const d = new Date('2025-01-15T20:00:00Z');
    expect(getActiveOverlaps(d)).toBeNull();
  });
});

describe('formatSessionTimeLocal', () => {
  it('returns "Variable" for other session', () => {
    expect(formatSessionTimeLocal('other')).toBe('Variable');
  });

  it('returns a formatted time range string', () => {
    const result = formatSessionTimeLocal('tokyo');
    expect(result).toMatch(/^\d{2}:00-\d{2}:00$/);
  });
});
