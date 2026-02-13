import { describe, it, expect } from 'vitest';
import {
  calculateRR,
  calculateTradingStats,
  calculateStrategyPerformance,
  generateEquityCurve,
  filterTradesByDateRange,
} from '../trading-calculations';
import type { TradeEntry, TradingStrategy } from '@/hooks/use-trade-entries';

// Helper to create minimal trade entries
function makeTrade(overrides: Partial<TradeEntry> = {}): TradeEntry {
  return {
    id: crypto.randomUUID(),
    user_id: 'u1',
    pair: 'BTCUSDT',
    direction: 'LONG',
    entry_price: 100,
    exit_price: 110,
    quantity: 1,
    pnl: 10,
    result: 'win',
    status: 'closed',
    trade_date: '2025-01-01',
    trade_state: 'closed',
    created_at: '',
    updated_at: '',
    stop_loss: 95,
    take_profit: 115,
    ...overrides,
  } as TradeEntry;
}

// ─── calculateRR ─────────────────────────────────────────────
describe('calculateRR', () => {
  it('returns positive R:R for winning long trade', () => {
    const rr = calculateRR(makeTrade({ entry_price: 100, exit_price: 110, stop_loss: 95, direction: 'LONG', result: 'win' }));
    expect(rr).toBeCloseTo(2); // reward=10, risk=5 → 2R
  });

  it('returns negative R:R for losing trade', () => {
    const rr = calculateRR(makeTrade({ entry_price: 100, exit_price: 95, stop_loss: 95, direction: 'LONG', result: 'loss', pnl: -5 }));
    expect(rr).toBeLessThan(0);
  });

  it('returns 0 when no stop loss', () => {
    expect(calculateRR(makeTrade({ stop_loss: null }))).toBe(0);
  });

  it('returns 0 when entry_price equals stop_loss (zero risk)', () => {
    expect(calculateRR(makeTrade({ entry_price: 100, stop_loss: 100 }))).toBe(0);
  });
});

// ─── calculateTradingStats ───────────────────────────────────
describe('calculateTradingStats', () => {
  it('returns empty stats for no trades', () => {
    const stats = calculateTradingStats([]);
    expect(stats.totalTrades).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.profitFactor).toBe(0);
  });

  it('calculates correctly for all wins', () => {
    const trades = [makeTrade({ pnl: 10 }), makeTrade({ pnl: 20 })];
    const stats = calculateTradingStats(trades);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(0);
    expect(stats.winRate).toBe(100);
    expect(stats.totalPnl).toBe(30);
    expect(stats.grossLoss).toBe(0);
    expect(stats.profitFactor).toBe(Infinity);
  });

  it('calculates correctly for all losses', () => {
    const trades = [
      makeTrade({ pnl: -10, result: 'loss' }),
      makeTrade({ pnl: -20, result: 'loss' }),
    ];
    const stats = calculateTradingStats(trades);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(2);
    expect(stats.winRate).toBe(0);
    expect(stats.totalPnl).toBe(-30);
    expect(stats.profitFactor).toBe(0);
  });

  it('calculates profit factor correctly for mixed trades', () => {
    const trades = [
      makeTrade({ pnl: 30, result: 'win' }),
      makeTrade({ pnl: -10, result: 'loss' }),
    ];
    const stats = calculateTradingStats(trades);
    expect(stats.profitFactor).toBeCloseTo(3);
    expect(stats.winRate).toBe(50);
  });

  it('calculates max drawdown from equity curve', () => {
    const trades = [
      makeTrade({ pnl: 20, result: 'win', trade_date: '2025-01-01' }),
      makeTrade({ pnl: -15, result: 'loss', trade_date: '2025-01-02' }),
      makeTrade({ pnl: -10, result: 'loss', trade_date: '2025-01-03' }),
    ];
    const stats = calculateTradingStats(trades);
    expect(stats.maxDrawdown).toBe(25); // peak 20, drops to -5
  });

  it('counts consecutive wins and losses', () => {
    const trades = [
      makeTrade({ result: 'win', trade_date: '2025-01-01' }),
      makeTrade({ result: 'win', trade_date: '2025-01-02' }),
      makeTrade({ result: 'loss', trade_date: '2025-01-03' }),
    ];
    const stats = calculateTradingStats(trades);
    expect(stats.consecutiveWins).toBe(2);
    expect(stats.consecutiveLosses).toBe(1);
  });

  it('handles breakeven trades', () => {
    const trades = [makeTrade({ pnl: 0, result: 'breakeven' })];
    const stats = calculateTradingStats(trades);
    expect(stats.breakeven).toBe(1);
    expect(stats.totalPnl).toBe(0);
  });

  it('is deterministic — same input produces same output', () => {
    const trades = [makeTrade({ pnl: 10 }), makeTrade({ pnl: -5, result: 'loss' })];
    const a = calculateTradingStats(trades);
    const b = calculateTradingStats(trades);
    expect(a).toEqual(b);
  });
});

// ─── calculateStrategyPerformance ────────────────────────────
describe('calculateStrategyPerformance', () => {
  const strategy: TradingStrategy = {
    id: 's1', name: 'Breakout', user_id: 'u1', created_at: '', updated_at: '',
  } as TradingStrategy;

  it('returns zero stats for strategy with no trades', () => {
    const perf = calculateStrategyPerformance([], [strategy]);
    expect(perf[0].totalTrades).toBe(0);
  });

  it('calculates strategy-level stats correctly', () => {
    const trades = [
      makeTrade({ pnl: 20, result: 'win', strategies: [strategy] }),
      makeTrade({ pnl: -5, result: 'loss', strategies: [strategy] }),
    ];
    const perf = calculateStrategyPerformance(trades, [strategy]);
    expect(perf[0].totalTrades).toBe(2);
    expect(perf[0].wins).toBe(1);
    expect(perf[0].totalPnl).toBe(15);
  });
});

// ─── generateEquityCurve ─────────────────────────────────────
describe('generateEquityCurve', () => {
  it('generates cumulative equity correctly', () => {
    const trades = [
      makeTrade({ pnl: 10, trade_date: '2025-01-01' }),
      makeTrade({ pnl: -3, trade_date: '2025-01-02', result: 'loss' }),
    ];
    const curve = generateEquityCurve(trades);
    expect(curve[0].cumulative).toBe(10);
    expect(curve[1].cumulative).toBe(7);
  });
});

// ─── filterTradesByDateRange ─────────────────────────────────
describe('filterTradesByDateRange', () => {
  const trades = [
    makeTrade({ trade_date: '2025-01-01' }),
    makeTrade({ trade_date: '2025-06-01' }),
    makeTrade({ trade_date: '2025-12-31' }),
  ];

  it('filters by start date', () => {
    const filtered = filterTradesByDateRange(trades, new Date('2025-06-01'), null);
    expect(filtered.length).toBe(2);
  });

  it('returns all when no range specified', () => {
    expect(filterTradesByDateRange(trades, null, null).length).toBe(3);
  });
});
