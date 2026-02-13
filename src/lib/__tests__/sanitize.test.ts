import { describe, it, expect } from 'vitest';
import {
  stripHtml,
  sanitizeText,
  sanitizePair,
  sanitizeNumber,
  sanitizeUuid,
  sanitizeEnum,
  sanitizePayload,
} from '../sanitize';

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<script>alert("xss")</script>Hello')).toBe('alert("xss")Hello');
    expect(stripHtml('<b>bold</b>')).toBe('bold');
    expect(stripHtml('no tags')).toBe('no tags');
  });
});

describe('sanitizeText', () => {
  it('returns empty string for non-string input', () => {
    expect(sanitizeText(123)).toBe('');
    expect(sanitizeText(null)).toBe('');
    expect(sanitizeText(undefined)).toBe('');
  });

  it('strips HTML and trims', () => {
    expect(sanitizeText('  <b>hello</b>  ')).toBe('hello');
  });

  it('enforces max length', () => {
    const long = 'a'.repeat(2000);
    expect(sanitizeText(long, 100).length).toBe(100);
  });

  it('uses default max length of 1000', () => {
    const long = 'a'.repeat(1500);
    expect(sanitizeText(long).length).toBe(1000);
  });
});

describe('sanitizePair', () => {
  it('returns uppercase alphanumeric pair', () => {
    expect(sanitizePair('btcusdt')).toBe('BTCUSDT');
    expect(sanitizePair('BTC/USDT')).toBe('BTC/USDT');
  });

  it('strips invalid characters', () => {
    expect(sanitizePair('BTC<>USDT')).toBe('BTCUSDT');
    expect(sanitizePair('BTC USDT')).toBe('BTCUSDT');
  });

  it('limits to 20 chars', () => {
    expect(sanitizePair('A'.repeat(30)).length).toBe(20);
  });

  it('returns empty for non-string', () => {
    expect(sanitizePair(42)).toBe('');
    expect(sanitizePair(null)).toBe('');
  });
});

describe('sanitizeNumber', () => {
  it('returns number for valid number', () => {
    expect(sanitizeNumber(42)).toBe(42);
    expect(sanitizeNumber(-3.14)).toBe(-3.14);
  });

  it('parses string numbers', () => {
    expect(sanitizeNumber('99.5')).toBe(99.5);
  });

  it('returns fallback for invalid input', () => {
    expect(sanitizeNumber('abc', -1)).toBe(-1);
    expect(sanitizeNumber(NaN)).toBe(0);
    expect(sanitizeNumber(Infinity)).toBe(0);
  });
});

describe('sanitizeUuid', () => {
  it('accepts valid UUID', () => {
    expect(sanitizeUuid('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('rejects invalid UUID', () => {
    expect(sanitizeUuid('not-a-uuid')).toBeNull();
    expect(sanitizeUuid(123)).toBeNull();
    expect(sanitizeUuid('')).toBeNull();
  });
});

describe('sanitizeEnum', () => {
  const allowed = ['long', 'short'] as const;

  it('returns value if in allowed list', () => {
    expect(sanitizeEnum('long', allowed, 'long')).toBe('long');
  });

  it('returns fallback for invalid value', () => {
    expect(sanitizeEnum('invalid', allowed, 'long')).toBe('long');
    expect(sanitizeEnum(42, allowed, 'short')).toBe('short');
  });
});

describe('sanitizePayload', () => {
  it('extracts and sanitizes fields by schema', () => {
    const result = sanitizePayload(
      { name: '<b>Test</b>', count: '42', active: true, id: '550e8400-e29b-41d4-a716-446655440000' },
      { name: 'string', count: 'number', active: 'boolean', id: 'uuid' }
    );
    expect(result.name).toBe('Test');
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
    expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('skips undefined/null fields', () => {
    const result = sanitizePayload({ name: 'ok' }, { name: 'string', missing: 'number' });
    expect(result).toEqual({ name: 'ok' });
  });

  it('returns empty for non-object', () => {
    expect(sanitizePayload(null, { x: 'string' })).toEqual({});
    expect(sanitizePayload('str', { x: 'string' })).toEqual({});
  });
});
