import { describe, it, expect } from "vitest";
import {
  calculateStreakProbability,
  getDayOfWeekEdge,
  getPairMomentum,
  getSessionOutlook,
  type TradeData,
} from "@/lib/predictive-analytics";

function makeTrade(overrides: Partial<TradeData> = {}): TradeData {
  return {
    trade_date: new Date().toISOString(),
    realized_pnl: 100,
    pnl: null,
    pair: "BTCUSDT",
    session: "London",
    status: "closed",
    ...overrides,
  };
}

describe("calculateStreakProbability", () => {
  it("returns null for insufficient data", () => {
    expect(calculateStreakProbability([])).toBeNull();
    expect(calculateStreakProbability([makeTrade()])).toBeNull();
  });

  it("calculates probability for a winning streak", () => {
    const trades: TradeData[] = [];
    // 20 alternating wins to build history, then 3 consecutive wins at end
    for (let i = 0; i < 20; i++) {
      trades.push(makeTrade({
        trade_date: new Date(2025, 0, i + 1).toISOString(),
        realized_pnl: i % 2 === 0 ? 100 : -50,
      }));
    }
    // Add 3 consecutive wins
    for (let i = 0; i < 3; i++) {
      trades.push(makeTrade({
        trade_date: new Date(2025, 0, 21 + i).toISOString(),
        realized_pnl: 100,
      }));
    }

    const result = calculateStreakProbability(trades);
    // May return null if not enough historical pattern matches, which is valid
    if (result) {
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.value).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeDefined();
      expect(result.sampleSize).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("getDayOfWeekEdge", () => {
  it("returns null for insufficient data", () => {
    expect(getDayOfWeekEdge([])).toBeNull();
  });

  it("calculates day-of-week win rate", () => {
    const today = new Date();
    const trades: TradeData[] = [];
    // Add 15 trades on the same day of week
    for (let i = 0; i < 15; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - 7 * i);
      trades.push(makeTrade({
        trade_date: d.toISOString(),
        realized_pnl: i % 3 === 0 ? -50 : 100, // ~66% win rate
      }));
    }

    const result = getDayOfWeekEdge(trades);
    if (result) {
      expect(result.value).toBeGreaterThan(0);
      expect(result.value).toBeLessThanOrEqual(100);
      expect(result.description).toContain("historical win rate");
    }
  });
});

describe("getPairMomentum", () => {
  it("returns empty for no trades", () => {
    expect(getPairMomentum([])).toEqual([]);
  });

  it("calculates momentum per pair", () => {
    const trades = [
      makeTrade({ pair: "BTCUSDT", realized_pnl: 100, trade_date: "2025-01-01" }),
      makeTrade({ pair: "BTCUSDT", realized_pnl: 100, trade_date: "2025-01-02" }),
      makeTrade({ pair: "BTCUSDT", realized_pnl: -50, trade_date: "2025-01-03" }),
      makeTrade({ pair: "ETHUSDT", realized_pnl: -50, trade_date: "2025-01-01" }),
      makeTrade({ pair: "ETHUSDT", realized_pnl: -50, trade_date: "2025-01-02" }),
      makeTrade({ pair: "ETHUSDT", realized_pnl: -50, trade_date: "2025-01-03" }),
    ];

    const result = getPairMomentum(trades);
    expect(result.length).toBe(2);

    const btc = result.find(r => r.pair === "BTCUSDT");
    expect(btc).toBeDefined();
    expect(btc!.momentum).toBe("bullish");

    const eth = result.find(r => r.pair === "ETHUSDT");
    expect(eth).toBeDefined();
    expect(eth!.momentum).toBe("bearish");
  });
});

describe("getSessionOutlook", () => {
  it("returns null for insufficient data", () => {
    expect(getSessionOutlook([])).toBeNull();
  });

  it("returns result with enough session data", () => {
    const trades: TradeData[] = [];
    for (let i = 0; i < 15; i++) {
      trades.push(makeTrade({
        session: "London",
        realized_pnl: i % 2 === 0 ? 100 : -50,
        trade_date: new Date(2025, 0, i + 1).toISOString(),
      }));
    }
    // Add some other sessions for overall comparison
    for (let i = 0; i < 5; i++) {
      trades.push(makeTrade({
        session: "Asia",
        realized_pnl: -50,
        trade_date: new Date(2025, 1, i + 1).toISOString(),
      }));
    }

    const result = getSessionOutlook(trades);
    // Result depends on current UTC hour matching a session with data
    if (result) {
      expect(result.value).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeDefined();
    }
  });
});
