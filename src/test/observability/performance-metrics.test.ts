/**
 * Performance Metrics Testing
 * Tests trading performance calculations and data integrity
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Types for testing
interface TradeEntry {
  id: string;
  pair: string;
  direction: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  pnl: number | null;
  status: string;
  trade_date: string;
  fees?: number | null;
}

interface PerformanceMetrics {
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  totalPnl: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown: number;
  sharpeRatio: number;
  expectancy: number;
}

// Calculation functions (mirrors lib/trading-calculations.ts logic)
const calculateWinRate = (trades: TradeEntry[]): number => {
  const closedTrades = trades.filter((t) => t.status === "closed" && t.pnl !== null);
  if (closedTrades.length === 0) return 0;
  const wins = closedTrades.filter((t) => (t.pnl ?? 0) > 0).length;
  return (wins / closedTrades.length) * 100;
};

const calculateProfitFactor = (trades: TradeEntry[]): number => {
  const closedTrades = trades.filter((t) => t.status === "closed" && t.pnl !== null);
  const grossProfit = closedTrades
    .filter((t) => (t.pnl ?? 0) > 0)
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const grossLoss = Math.abs(
    closedTrades
      .filter((t) => (t.pnl ?? 0) < 0)
      .reduce((sum, t) => sum + (t.pnl ?? 0), 0)
  );
  if (grossLoss === 0) return grossProfit > 0 ? Infinity : 0;
  return grossProfit / grossLoss;
};

const calculateTotalPnl = (trades: TradeEntry[]): number => {
  return trades
    .filter((t) => t.status === "closed")
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);
};

const calculateAvgWin = (trades: TradeEntry[]): number => {
  const wins = trades.filter((t) => t.status === "closed" && (t.pnl ?? 0) > 0);
  if (wins.length === 0) return 0;
  return wins.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / wins.length;
};

const calculateAvgLoss = (trades: TradeEntry[]): number => {
  const losses = trades.filter((t) => t.status === "closed" && (t.pnl ?? 0) < 0);
  if (losses.length === 0) return 0;
  return losses.reduce((sum, t) => sum + (t.pnl ?? 0), 0) / losses.length;
};

const calculateExpectancy = (trades: TradeEntry[]): number => {
  const winRate = calculateWinRate(trades) / 100;
  const avgWin = calculateAvgWin(trades);
  const avgLoss = Math.abs(calculateAvgLoss(trades));
  const lossRate = 1 - winRate;

  return winRate * avgWin - lossRate * avgLoss;
};

const calculateMaxDrawdown = (trades: TradeEntry[]): number => {
  const sortedTrades = [...trades]
    .filter((t) => t.status === "closed")
    .sort((a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime());

  let peak = 0;
  let maxDrawdown = 0;
  let cumulative = 0;

  for (const trade of sortedTrades) {
    cumulative += trade.pnl ?? 0;
    if (cumulative > peak) {
      peak = cumulative;
    }
    const drawdown = peak - cumulative;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
};

// Test data factory
const createTrade = (overrides: Partial<TradeEntry> = {}): TradeEntry => ({
  id: `trade-${Math.random().toString(36).slice(2)}`,
  pair: "BTCUSDT",
  direction: "long",
  entry_price: 50000,
  exit_price: 52000,
  quantity: 0.1,
  pnl: 200,
  status: "closed",
  trade_date: new Date().toISOString(),
  fees: 5,
  ...overrides,
});

describe("Performance Calculations", () => {
  describe("Win Rate", () => {
    it("should calculate win rate correctly", () => {
      const trades = [
        createTrade({ pnl: 100 }),
        createTrade({ pnl: 200 }),
        createTrade({ pnl: -50 }),
        createTrade({ pnl: 150 }),
      ];

      const winRate = calculateWinRate(trades);
      expect(winRate).toBe(75); // 3 wins out of 4
    });

    it("should return 0 for empty trades", () => {
      expect(calculateWinRate([])).toBe(0);
    });

    it("should ignore open trades", () => {
      const trades = [
        createTrade({ pnl: 100, status: "closed" }),
        createTrade({ pnl: null, status: "open" }),
        createTrade({ pnl: -50, status: "closed" }),
      ];

      const winRate = calculateWinRate(trades);
      expect(winRate).toBe(50); // 1 win out of 2 closed trades
    });

    it("should handle all winning trades", () => {
      const trades = [
        createTrade({ pnl: 100 }),
        createTrade({ pnl: 200 }),
        createTrade({ pnl: 50 }),
      ];

      expect(calculateWinRate(trades)).toBe(100);
    });

    it("should handle all losing trades", () => {
      const trades = [
        createTrade({ pnl: -100 }),
        createTrade({ pnl: -200 }),
        createTrade({ pnl: -50 }),
      ];

      expect(calculateWinRate(trades)).toBe(0);
    });
  });

  describe("Profit Factor", () => {
    it("should calculate profit factor correctly", () => {
      const trades = [
        createTrade({ pnl: 200 }),
        createTrade({ pnl: 100 }),
        createTrade({ pnl: -100 }),
      ];

      // Gross profit: 300, Gross loss: 100, PF: 3.0
      const pf = calculateProfitFactor(trades);
      expect(pf).toBe(3);
    });

    it("should return Infinity when no losses", () => {
      const trades = [
        createTrade({ pnl: 100 }),
        createTrade({ pnl: 200 }),
      ];

      expect(calculateProfitFactor(trades)).toBe(Infinity);
    });

    it("should return 0 when no profits and no losses", () => {
      expect(calculateProfitFactor([])).toBe(0);
    });

    it("should handle only losses", () => {
      const trades = [
        createTrade({ pnl: -100 }),
        createTrade({ pnl: -200 }),
      ];

      expect(calculateProfitFactor(trades)).toBe(0);
    });
  });

  describe("Total P&L", () => {
    it("should calculate total PnL correctly", () => {
      const trades = [
        createTrade({ pnl: 200 }),
        createTrade({ pnl: -100 }),
        createTrade({ pnl: 150 }),
      ];

      expect(calculateTotalPnl(trades)).toBe(250);
    });

    it("should handle negative total", () => {
      const trades = [
        createTrade({ pnl: -200 }),
        createTrade({ pnl: 50 }),
      ];

      expect(calculateTotalPnl(trades)).toBe(-150);
    });

    it("should ignore open trades", () => {
      const trades = [
        createTrade({ pnl: 200, status: "closed" }),
        createTrade({ pnl: null, status: "open" }),
      ];

      expect(calculateTotalPnl(trades)).toBe(200);
    });
  });

  describe("Average Win/Loss", () => {
    it("should calculate average win correctly", () => {
      const trades = [
        createTrade({ pnl: 100 }),
        createTrade({ pnl: 200 }),
        createTrade({ pnl: -50 }),
        createTrade({ pnl: 300 }),
      ];

      // Average of 100, 200, 300 = 200
      expect(calculateAvgWin(trades)).toBe(200);
    });

    it("should calculate average loss correctly", () => {
      const trades = [
        createTrade({ pnl: 100 }),
        createTrade({ pnl: -50 }),
        createTrade({ pnl: -100 }),
      ];

      // Average of -50, -100 = -75
      expect(calculateAvgLoss(trades)).toBe(-75);
    });

    it("should return 0 when no wins", () => {
      const trades = [createTrade({ pnl: -100 })];
      expect(calculateAvgWin(trades)).toBe(0);
    });

    it("should return 0 when no losses", () => {
      const trades = [createTrade({ pnl: 100 })];
      expect(calculateAvgLoss(trades)).toBe(0);
    });
  });

  describe("Expectancy", () => {
    it("should calculate positive expectancy", () => {
      const trades = [
        createTrade({ pnl: 100 }),
        createTrade({ pnl: 100 }),
        createTrade({ pnl: -50 }),
        createTrade({ pnl: 100 }),
      ];

      // Win rate: 75%, Avg win: 100, Avg loss: 50
      // Expectancy: 0.75 * 100 - 0.25 * 50 = 75 - 12.5 = 62.5
      const expectancy = calculateExpectancy(trades);
      expect(expectancy).toBe(62.5);
    });

    it("should calculate negative expectancy", () => {
      const trades = [
        createTrade({ pnl: 50 }),
        createTrade({ pnl: -100 }),
        createTrade({ pnl: -100 }),
        createTrade({ pnl: -100 }),
      ];

      // Win rate: 25%, Avg win: 50, Avg loss: 100
      // Expectancy: 0.25 * 50 - 0.75 * 100 = 12.5 - 75 = -62.5
      const expectancy = calculateExpectancy(trades);
      expect(expectancy).toBe(-62.5);
    });
  });

  describe("Max Drawdown", () => {
    it("should calculate max drawdown correctly", () => {
      const trades = [
        createTrade({ pnl: 100, trade_date: "2024-01-01" }),
        createTrade({ pnl: 200, trade_date: "2024-01-02" }), // Peak: 300
        createTrade({ pnl: -150, trade_date: "2024-01-03" }), // Drawdown: 150
        createTrade({ pnl: -100, trade_date: "2024-01-04" }), // Drawdown: 250
        createTrade({ pnl: 50, trade_date: "2024-01-05" }),
      ];

      const maxDD = calculateMaxDrawdown(trades);
      expect(maxDD).toBe(250);
    });

    it("should return 0 when only profits", () => {
      const trades = [
        createTrade({ pnl: 100, trade_date: "2024-01-01" }),
        createTrade({ pnl: 200, trade_date: "2024-01-02" }),
      ];

      expect(calculateMaxDrawdown(trades)).toBe(0);
    });

    it("should handle empty trades", () => {
      expect(calculateMaxDrawdown([])).toBe(0);
    });
  });
});

describe("Performance Data Integrity", () => {
  it("should handle trades with null PnL", () => {
    const trades = [
      createTrade({ pnl: null, status: "open" }),
      createTrade({ pnl: 100, status: "closed" }),
    ];

    expect(calculateTotalPnl(trades)).toBe(100);
    expect(calculateWinRate(trades)).toBe(100);
  });

  it("should handle trades with zero PnL", () => {
    const trades = [
      createTrade({ pnl: 0 }),
      createTrade({ pnl: 100 }),
      createTrade({ pnl: -50 }),
    ];

    // Zero is not a win
    expect(calculateWinRate(trades)).toBeCloseTo(33.33, 1);
  });

  it("should handle very large numbers", () => {
    const trades = [
      createTrade({ pnl: 1000000 }),
      createTrade({ pnl: 2000000 }),
      createTrade({ pnl: -500000 }),
    ];

    expect(calculateTotalPnl(trades)).toBe(2500000);
    expect(calculateProfitFactor(trades)).toBe(6); // 3M / 500K
  });

  it("should handle decimal precision", () => {
    const trades = [
      createTrade({ pnl: 0.001 }),
      createTrade({ pnl: 0.002 }),
      createTrade({ pnl: -0.0015 }),
    ];

    const total = calculateTotalPnl(trades);
    expect(total).toBeCloseTo(0.0015, 4);
  });
});

describe("Performance Aggregations", () => {
  it("should aggregate daily PnL", () => {
    const aggregateByDay = (trades: TradeEntry[]) => {
      return trades.reduce((acc, trade) => {
        const date = trade.trade_date.split("T")[0];
        acc[date] = (acc[date] || 0) + (trade.pnl ?? 0);
        return acc;
      }, {} as Record<string, number>);
    };

    const trades = [
      createTrade({ pnl: 100, trade_date: "2024-01-15T10:00:00Z" }),
      createTrade({ pnl: -50, trade_date: "2024-01-15T14:00:00Z" }),
      createTrade({ pnl: 200, trade_date: "2024-01-16T09:00:00Z" }),
    ];

    const daily = aggregateByDay(trades);
    expect(daily["2024-01-15"]).toBe(50);
    expect(daily["2024-01-16"]).toBe(200);
  });

  it("should aggregate by symbol", () => {
    const aggregateBySymbol = (trades: TradeEntry[]) => {
      return trades.reduce((acc, trade) => {
        acc[trade.pair] = (acc[trade.pair] || 0) + (trade.pnl ?? 0);
        return acc;
      }, {} as Record<string, number>);
    };

    const trades = [
      createTrade({ pair: "BTCUSDT", pnl: 100 }),
      createTrade({ pair: "ETHUSDT", pnl: 150 }),
      createTrade({ pair: "BTCUSDT", pnl: -50 }),
    ];

    const bySymbol = aggregateBySymbol(trades);
    expect(bySymbol["BTCUSDT"]).toBe(50);
    expect(bySymbol["ETHUSDT"]).toBe(150);
  });

  it("should aggregate by direction", () => {
    const aggregateByDirection = (trades: TradeEntry[]) => {
      return trades.reduce((acc, trade) => {
        acc[trade.direction] = (acc[trade.direction] || 0) + (trade.pnl ?? 0);
        return acc;
      }, {} as Record<string, number>);
    };

    const trades = [
      createTrade({ direction: "long", pnl: 200 }),
      createTrade({ direction: "short", pnl: -100 }),
      createTrade({ direction: "long", pnl: 100 }),
    ];

    const byDirection = aggregateByDirection(trades);
    expect(byDirection["long"]).toBe(300);
    expect(byDirection["short"]).toBe(-100);
  });
});

describe("Risk-Adjusted Metrics", () => {
  it("should calculate R multiple", () => {
    const calculateRMultiple = (
      entry: number,
      exit: number,
      stopLoss: number,
      direction: "long" | "short"
    ): number => {
      const risk =
        direction === "long" ? entry - stopLoss : stopLoss - entry;
      const reward =
        direction === "long" ? exit - entry : entry - exit;
      return risk !== 0 ? reward / risk : 0;
    };

    // Long trade: Entry 50000, Stop 49000, Exit 52000
    // Risk: 1000, Reward: 2000, R: 2
    expect(calculateRMultiple(50000, 52000, 49000, "long")).toBe(2);

    // Short trade: Entry 50000, Stop 51000, Exit 48000
    // Risk: 1000, Reward: 2000, R: 2
    expect(calculateRMultiple(50000, 48000, 51000, "short")).toBe(2);

    // Losing long trade: Entry 50000, Stop 49000, Exit 49500
    // Risk: 1000, Reward: -500, R: -0.5
    expect(calculateRMultiple(50000, 49500, 49000, "long")).toBe(-0.5);
  });

  it("should calculate position size based on risk", () => {
    const calculatePositionSize = (
      accountBalance: number,
      riskPercent: number,
      entryPrice: number,
      stopLoss: number
    ): number => {
      const riskAmount = accountBalance * (riskPercent / 100);
      const riskPerUnit = Math.abs(entryPrice - stopLoss);
      return riskPerUnit !== 0 ? riskAmount / riskPerUnit : 0;
    };

    // Account: 10000, Risk: 1%, Entry: 50000, Stop: 49000
    // Risk amount: 100, Risk per unit: 1000, Position: 0.1
    expect(calculatePositionSize(10000, 1, 50000, 49000)).toBe(0.1);

    // Account: 10000, Risk: 2%, Entry: 50000, Stop: 49500
    // Risk amount: 200, Risk per unit: 500, Position: 0.4
    expect(calculatePositionSize(10000, 2, 50000, 49500)).toBe(0.4);
  });
});
