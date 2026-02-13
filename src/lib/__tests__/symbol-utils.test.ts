import { describe, it, expect } from 'vitest';
import {
  getBaseSymbol,
  getQuoteAsset,
  formatSymbolDisplay,
  formatSymbolBase,
  isQuoteAsset,
  isUsdtPair,
  normalizePair,
  createPair,
  QUOTE_ASSETS,
} from '../symbol-utils';

describe('symbol-utils', () => {
  describe('getBaseSymbol', () => {
    it('extracts base from USDT pair', () => {
      expect(getBaseSymbol('BTCUSDT')).toBe('BTC');
    });
    it('extracts base from BUSD pair', () => {
      expect(getBaseSymbol('ETHBUSD')).toBe('ETH');
    });
    it('extracts base from BTC pair', () => {
      expect(getBaseSymbol('ETHBTC')).toBe('ETH');
    });
    it('extracts base with explicit quote', () => {
      expect(getBaseSymbol('ETHBTC', 'BTC')).toBe('ETH');
    });
    it('returns original for unknown quote', () => {
      expect(getBaseSymbol('XYZABC')).toBe('XYZABC');
    });
    it('returns empty for empty input', () => {
      expect(getBaseSymbol('')).toBe('');
    });
    it('handles USDC pair', () => {
      expect(getBaseSymbol('SOLUSDC')).toBe('SOL');
    });
  });

  describe('getQuoteAsset', () => {
    it('detects USDT', () => {
      expect(getQuoteAsset('BTCUSDT')).toBe('USDT');
    });
    it('detects BUSD', () => {
      expect(getQuoteAsset('ETHBUSD')).toBe('BUSD');
    });
    it('detects BTC', () => {
      expect(getQuoteAsset('ETHBTC')).toBe('BTC');
    });
    it('defaults to USDT for unknown', () => {
      expect(getQuoteAsset('XYZABC')).toBe('USDT');
    });
    it('defaults to USDT for empty', () => {
      expect(getQuoteAsset('')).toBe('USDT');
    });
  });

  describe('formatSymbolDisplay', () => {
    it('splits BTCUSDT correctly', () => {
      expect(formatSymbolDisplay('BTCUSDT')).toEqual({ base: 'BTC', quote: 'USDT' });
    });
    it('splits ETHBTC correctly', () => {
      expect(formatSymbolDisplay('ETHBTC')).toEqual({ base: 'ETH', quote: 'BTC' });
    });
  });

  describe('formatSymbolBase', () => {
    it('returns base only', () => {
      expect(formatSymbolBase('BTCUSDT')).toBe('BTC');
    });
  });

  describe('isQuoteAsset', () => {
    it('returns true for matching quote', () => {
      expect(isQuoteAsset('BTCUSDT', 'USDT')).toBe(true);
    });
    it('returns false for non-matching', () => {
      expect(isQuoteAsset('BTCUSDT', 'BTC')).toBe(false);
    });
  });

  describe('isUsdtPair', () => {
    it('true for USDT pair', () => {
      expect(isUsdtPair('BTCUSDT')).toBe(true);
    });
    it('false for BTC pair', () => {
      expect(isUsdtPair('ETHBTC')).toBe(false);
    });
  });

  describe('normalizePair', () => {
    it('uppercases and trims', () => {
      expect(normalizePair('  btcusdt  ')).toBe('BTCUSDT');
    });
  });

  describe('createPair', () => {
    it('creates pair from base and quote', () => {
      expect(createPair('btc', 'usdt')).toBe('BTCUSDT');
    });
  });

  describe('QUOTE_ASSETS', () => {
    it('contains expected assets', () => {
      expect(QUOTE_ASSETS).toContain('USDT');
      expect(QUOTE_ASSETS).toContain('BTC');
      expect(QUOTE_ASSETS).toContain('ETH');
    });
  });
});
