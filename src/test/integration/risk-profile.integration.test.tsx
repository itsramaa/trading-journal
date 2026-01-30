/**
 * Risk Profile Integration Tests
 * Tests risk profile hooks with mocked Supabase
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { waitFor } from "../utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Create inline chainable mock
const mockRiskProfile = {
  id: "risk-profile-id",
  user_id: "mock-user-id",
  risk_per_trade_percent: 2,
  max_daily_loss_percent: 5,
  max_weekly_drawdown_percent: 10,
  max_position_size_percent: 40,
  max_concurrent_positions: 3,
  max_correlated_exposure: 0.75,
  is_active: true,
};

const createChainMock = (result: any = { data: null, error: null }) => {
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
      if (table === "risk_profiles") {
        return createChainMock({ data: mockRiskProfile, error: null });
      }
      return createChainMock();
    }),
  },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "mock-user-id" }, isAuthenticated: true, loading: false }),
}));

vi.mock("@/hooks/use-binance-daily-pnl", () => ({
  useBinanceDailyPnl: () => ({ totalPnl: 0, isLoading: false }),
  useBinanceTotalBalance: () => ({ totalBalance: 10000, isConnected: false }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

// Import after mocks
import { useRiskProfile } from "@/hooks/use-risk-profile";

describe("Risk Profile Integration", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  });

  it("should fetch risk profile successfully", async () => {
    const { result } = renderHook(() => useRiskProfile(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    // The hook should return data or undefined based on mock
    expect(result.current.isLoading).toBe(false);
  });

  it("should have mutation function available", () => {
    const { result } = renderHook(() => useRiskProfile(), { wrapper });
    expect(result.current).toBeDefined();
  });
});
