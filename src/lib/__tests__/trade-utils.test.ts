import { describe, it, expect } from 'vitest';
import {
  tradeNeedsEnrichment,
  tradeHasUnknownDirection,
  getDirectionBadgeVariant,
  getDirectionDisplay,
  getTradeResult,
  isTradeProfit,
  isTradeLoss,
  calculateRiskReward,
  formatRiskReward,
  tradeHasScreenshots,
  getScreenshotCount,
  getThumbnailUrl,
  tradeHasNotes,
  getNotesLineCount,
  hasMultipleNotes,
} from '../trade-utils';
import type { TradeEntry } from '@/hooks/use-trade-entries';

const makeTrade = (overrides: Partial<TradeEntry> = {}): TradeEntry => ({
  id: '1',
  user_id: 'u1',
  pair: 'BTCUSDT',
  direction: 'LONG',
  entry_price: 100,
  quantity: 1,
  status: 'closed',
  trade_date: '2026-01-01',
  trade_state: 'closed',
  created_at: '',
  updated_at: '',
  ...overrides,
} as TradeEntry);

describe('trade-utils', () => {
  describe('tradeNeedsEnrichment', () => {
    it('true for binance trade with no entry_price', () => {
      expect(tradeNeedsEnrichment(makeTrade({ source: 'binance', entry_price: 0 }))).toBe(true);
    });
    it('false for manual trade', () => {
      expect(tradeNeedsEnrichment(makeTrade({ source: 'manual', entry_price: 0 }))).toBe(false);
    });
    it('false for binance trade with entry_price', () => {
      expect(tradeNeedsEnrichment(makeTrade({ source: 'binance', entry_price: 100 }))).toBe(false);
    });
  });

  describe('tradeHasUnknownDirection', () => {
    it('true for UNKNOWN', () => {
      expect(tradeHasUnknownDirection(makeTrade({ direction: 'UNKNOWN' }))).toBe(true);
    });
    it('false for LONG', () => {
      expect(tradeHasUnknownDirection(makeTrade({ direction: 'LONG' }))).toBe(false);
    });
  });

  describe('getDirectionBadgeVariant', () => {
    it('returns long for LONG', () => expect(getDirectionBadgeVariant('LONG')).toBe('long'));
    it('returns short for SHORT', () => expect(getDirectionBadgeVariant('SHORT')).toBe('short'));
    it('returns outline for UNKNOWN', () => expect(getDirectionBadgeVariant('UNKNOWN')).toBe('outline'));
  });

  describe('getDirectionDisplay', () => {
    it('returns ? for UNKNOWN', () => expect(getDirectionDisplay('UNKNOWN')).toBe('?'));
    it('returns direction for known', () => expect(getDirectionDisplay('LONG')).toBe('LONG'));
  });

  describe('getTradeResult', () => {
    it('win for positive', () => expect(getTradeResult(100)).toBe('win'));
    it('loss for negative', () => expect(getTradeResult(-50)).toBe('loss'));
    it('breakeven for zero', () => expect(getTradeResult(0)).toBe('breakeven'));
    it('breakeven for null', () => expect(getTradeResult(null)).toBe('breakeven'));
    it('breakeven for undefined', () => expect(getTradeResult(undefined)).toBe('breakeven'));
  });

  describe('isTradeProfit / isTradeLoss', () => {
    it('profit true for positive', () => expect(isTradeProfit(10)).toBe(true));
    it('profit false for negative', () => expect(isTradeProfit(-10)).toBe(false));
    it('loss true for negative', () => expect(isTradeLoss(-10)).toBe(true));
    it('loss false for null', () => expect(isTradeLoss(null)).toBe(false));
  });

  describe('calculateRiskReward', () => {
    it('calculates R:R correctly', () => {
      const trade = makeTrade({ entry_price: 100, exit_price: 120, stop_loss: 90 });
      expect(calculateRiskReward(trade)).toBe(2);
    });
    it('returns 0 when stop_loss missing', () => {
      expect(calculateRiskReward(makeTrade({ stop_loss: undefined }))).toBe(0);
    });
    it('returns 0 when risk is zero', () => {
      const trade = makeTrade({ entry_price: 100, exit_price: 120, stop_loss: 100 });
      expect(calculateRiskReward(trade)).toBe(0);
    });
  });

  describe('formatRiskReward', () => {
    it('formats positive R:R', () => expect(formatRiskReward(2.5)).toBe('2.50:1'));
    it('returns dash for zero', () => expect(formatRiskReward(0)).toBe('-'));
    it('returns dash for negative', () => expect(formatRiskReward(-1)).toBe('-'));
  });

  describe('screenshot helpers', () => {
    it('detects screenshots', () => {
      expect(tradeHasScreenshots(makeTrade({ screenshots: [{ url: 'a.png' }] as any }))).toBe(true);
    });
    it('no screenshots for empty', () => {
      expect(tradeHasScreenshots(makeTrade({ screenshots: [] as any }))).toBe(false);
    });
    it('counts screenshots', () => {
      expect(getScreenshotCount(makeTrade({ screenshots: [{ url: 'a' }, { url: 'b' }] as any }))).toBe(2);
    });
    it('gets thumbnail url', () => {
      expect(getThumbnailUrl(makeTrade({ screenshots: [{ url: 'thumb.png' }] as any }))).toBe('thumb.png');
    });
    it('returns null for no screenshots', () => {
      expect(getThumbnailUrl(makeTrade())).toBe(null);
    });
  });

  describe('notes helpers', () => {
    it('detects notes', () => {
      expect(tradeHasNotes(makeTrade({ notes: 'hello' }))).toBe(true);
    });
    it('no notes for empty', () => {
      expect(tradeHasNotes(makeTrade({ notes: '' }))).toBe(false);
    });
    it('counts note lines', () => {
      expect(getNotesLineCount(makeTrade({ notes: 'line1\nline2\nline3' }))).toBe(3);
    });
    it('hasMultipleNotes true for 3+ lines', () => {
      expect(hasMultipleNotes(makeTrade({ notes: 'a\nb\nc' }))).toBe(true);
    });
    it('hasMultipleNotes false for 2 lines', () => {
      expect(hasMultipleNotes(makeTrade({ notes: 'a\nb' }))).toBe(false);
    });
  });
});
