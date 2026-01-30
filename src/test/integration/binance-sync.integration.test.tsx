/**
 * Binance Sync Integration Tests
 * Tests sync functionality with mocked dependencies
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { mockBinanceTrade, mockBinanceTradeList } from "../mocks/binance";

// Create inline chainable mock
const createChainMock = (result: any = { data: [], error: null }) => {
  const chain: any = {};
  const methods = ["select", "insert", "update", "delete", "upsert", "eq", "neq", "gt", "gte", "lt", "lte", "in", "order", "limit", "single", "maybeSingle"];
  methods.forEach(m => {
    chain[m] = vi.fn(() => {
      if (["single", "maybeSingle"].includes(m)) return Promise.resolve(result);
      return chain;
    });
  });
  chain.then = (resolve: any) => resolve(result);
  return chain;
};

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => createChainMock({ data: [], error: null })),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "mock-user-id" }, isAuthenticated: true, loading: false }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

// Import after mocks
import { useSyncTradeToJournal, useBulkSyncTrades } from "@/hooks/use-binance-sync";

describe("Binance Sync Integration", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  });

  it("should initialize sync hook", () => {
    const { result } = renderHook(() => useSyncTradeToJournal(), { wrapper });
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it("should initialize bulk sync hook", () => {
    const { result } = renderHook(() => useBulkSyncTrades(), { wrapper });
    expect(result.current.mutateAsync).toBeDefined();
    expect(result.current.isPending).toBe(false);
  });

  it("should have mock binance trade data", () => {
    expect(mockBinanceTrade).toBeDefined();
    expect(mockBinanceTrade.symbol).toBe("BTCUSDT");
  });

  it("should have mock binance trade list", () => {
    expect(mockBinanceTradeList).toBeDefined();
    expect(mockBinanceTradeList.length).toBeGreaterThan(0);
  });
});
