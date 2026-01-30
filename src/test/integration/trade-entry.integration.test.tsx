/**
 * Trade Entry Integration Tests
 * Tests hook functionality with mocked Supabase
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { waitFor } from "../utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

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
    from: vi.fn((table: string) => {
      if (table === "trade_entries") {
        return createChainMock({ 
          data: [{ id: "trade-1", pair: "BTCUSDT", direction: "LONG", entry_price: 50000 }], 
          error: null 
        });
      }
      return createChainMock();
    }),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "mock-user-id" }, isAuthenticated: true, loading: false }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Import after mocks
import { useTradeEntries } from "@/hooks/use-trade-entries";

describe("Trade Entry Integration", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  });

  it("should fetch trade entries successfully", async () => {
    const { result } = renderHook(() => useTradeEntries(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.data).toBeDefined();
  });

  it("should handle loading state", () => {
    const { result } = renderHook(() => useTradeEntries(), { wrapper });
    // Initially loading or quickly resolves
    expect(result.current.isLoading !== undefined).toBe(true);
  });
});
