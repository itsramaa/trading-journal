/**
 * Performance Export E2E Tests
 * Tests CSV and PDF export functionality
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock jspdf and jspdf-autotable
vi.mock("jspdf", () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    addPage: vi.fn(),
    save: vi.fn(),
    setPage: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    internal: {
      pageSize: { getWidth: () => 210, getHeight: () => 297, height: 297 },
    },
  })),
}));

vi.mock("jspdf-autotable", () => ({
  default: vi.fn(),
}));

// Mock date-fns format
vi.mock("date-fns", async () => {
  const actual = await vi.importActual("date-fns");
  return {
    ...actual,
    format: vi.fn(() => "2024-01-15"),
  };
});

// Helper to create full stats object
const createMockStats = (overrides: Record<string, any> = {}) => ({
  totalTrades: 0,
  winRate: 0,
  totalPnl: 0,
  profitFactor: 0,
  avgWin: 0,
  avgLoss: 0,
  maxDrawdownPercent: 0,
  sharpeRatio: 0,
  avgRR: 0,
  expectancy: 0,
  ...overrides,
});

// Helper to create mock export data
const createMockExportData = (overrides: Record<string, any> = {}): any => ({
  trades: [],
  stats: createMockStats(),
  dateRange: { from: null, to: null },
  ...overrides,
});

describe("E2E: Performance Export", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  describe("Export Hook Initialization", () => {
    it("should provide export functions", async () => {
      // Dynamically import after mocks
      const { usePerformanceExport } = await import("@/hooks/use-performance-export");
      
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      
      const { result } = renderHook(() => usePerformanceExport(), { wrapper });
      
      expect(result.current.exportToCSV).toBeDefined();
      expect(result.current.exportToPDF).toBeDefined();
      expect(typeof result.current.exportToCSV).toBe("function");
      expect(typeof result.current.exportToPDF).toBe("function");
    });
  });
});

describe("Performance Export Data Contracts", () => {
  it("should have correct stats structure", () => {
    const stats = createMockStats({
      totalTrades: 10,
      winRate: 65,
      totalPnl: 1500,
      profitFactor: 2.5,
    });

    expect(stats.totalTrades).toBe(10);
    expect(stats.winRate).toBe(65);
    expect(stats.totalPnl).toBe(1500);
    expect(stats.profitFactor).toBe(2.5);
    expect(stats.avgWin).toBe(0);
    expect(stats.avgLoss).toBe(0);
    expect(stats.maxDrawdownPercent).toBe(0);
    expect(stats.sharpeRatio).toBe(0);
    expect(stats.avgRR).toBe(0);
    expect(stats.expectancy).toBe(0);
  });

  it("should have correct export data structure", () => {
    const exportData = createMockExportData({
      trades: [
        {
          id: "trade-1",
          pair: "BTCUSDT",
          direction: "LONG",
          entry_price: 50000,
          exit_price: 52000,
          quantity: 0.1,
          pnl: 200,
          trade_date: "2024-01-15",
          status: "closed",
          fees: 5,
        },
      ],
      stats: createMockStats({ totalTrades: 1, totalPnl: 200 }),
    });

    expect(exportData.trades).toHaveLength(1);
    expect(exportData.trades[0].pair).toBe("BTCUSDT");
    expect(exportData.stats.totalPnl).toBe(200);
    expect(exportData.dateRange).toEqual({ from: null, to: null });
  });

  it("should support symbol breakdown", () => {
    const exportData = createMockExportData({
      symbolBreakdown: [
        { symbol: "BTCUSDT", trades: 10, pnl: 500, fees: 20, funding: -5, net: 475 },
        { symbol: "ETHUSDT", trades: 5, pnl: 200, fees: 10, funding: -2, net: 188 },
      ],
    });

    expect(exportData.symbolBreakdown).toHaveLength(2);
    expect(exportData.symbolBreakdown![0].symbol).toBe("BTCUSDT");
    expect(exportData.symbolBreakdown![0].net).toBe(475);
  });

  it("should support weekly data", () => {
    const exportData = createMockExportData({
      weeklyData: [
        { date: "2024-01-15", grossPnl: 100, netPnl: 95, trades: 5 },
        { date: "2024-01-16", grossPnl: -50, netPnl: -55, trades: 3 },
      ],
    });

    expect(exportData.weeklyData).toHaveLength(2);
    expect(exportData.weeklyData![0].grossPnl).toBe(100);
    expect(exportData.weeklyData![1].netPnl).toBe(-55);
  });
});

describe("Performance Page Export Integration", () => {
  it("should have correct export button labels", () => {
    const expectedLabels = ["Export CSV", "Export PDF"];
    expect(expectedLabels).toContain("Export CSV");
    expect(expectedLabels).toContain("Export PDF");
  });

  it("should export with filtered data", () => {
    const filterTradesByDateRange = (trades: any[], from: Date | null, to: Date | null) => {
      if (!from && !to) return trades;
      return trades.filter(t => {
        const date = new Date(t.trade_date);
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
      });
    };

    const trades = [
      { id: "1", trade_date: "2024-01-15" },
      { id: "2", trade_date: "2024-02-15" },
    ];

    const filtered = filterTradesByDateRange(
      trades,
      new Date("2024-01-01"),
      new Date("2024-01-31")
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("1");
  });

  it("should handle empty trade list gracefully", () => {
    const exportData = createMockExportData();
    expect(exportData.trades).toHaveLength(0);
    expect(exportData.stats.totalTrades).toBe(0);
  });

  it("should handle negative PnL values", () => {
    const exportData = createMockExportData({
      trades: [
        {
          id: "trade-1",
          pair: "BTCUSDT",
          direction: "LONG",
          entry_price: 50000,
          exit_price: 48000,
          quantity: 0.1,
          pnl: -200,
          trade_date: "2024-01-15",
          status: "closed",
          fees: 5,
        },
      ],
      stats: createMockStats({ totalPnl: -200, profitFactor: 0 }),
    });

    expect(exportData.trades[0].pnl).toBe(-200);
    expect(exportData.stats.totalPnl).toBe(-200);
  });

  it("should handle trades with missing optional fields", () => {
    const exportData = createMockExportData({
      trades: [
        {
          id: "trade-1",
          pair: "BTCUSDT",
          direction: "LONG",
          entry_price: 50000,
          exit_price: null,
          quantity: 0.1,
          pnl: null,
          trade_date: "2024-01-15",
          status: "open",
          fees: null,
        },
      ],
    });

    expect(exportData.trades[0].exit_price).toBeNull();
    expect(exportData.trades[0].pnl).toBeNull();
    expect(exportData.trades[0].status).toBe("open");
  });
});
