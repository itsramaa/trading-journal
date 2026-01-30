/**
 * Risk Profile Integration Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { waitFor } from "../utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useRiskProfile, useUpsertRiskProfile } from "@/hooks/use-risk-profile";
import { createMockSupabaseClient } from "../mocks/supabase";

const mockSupabase = createMockSupabaseClient();

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "mock-user-id" }, isAuthenticated: true, loading: false }),
}));
vi.mock("@/hooks/use-binance-daily-pnl", () => ({
  useBinanceDailyPnl: () => ({ totalPnl: 0, isLoading: false }),
  useBinanceTotalBalance: () => ({ totalBalance: 10000, isConnected: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("Risk Profile Integration", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("should fetch risk profile", async () => {
    const { result } = renderHook(() => useRiskProfile(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it("should upsert risk profile", async () => {
    const { result } = renderHook(() => useUpsertRiskProfile(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ risk_per_trade_percent: 2 });
    });
    expect(result.current.isSuccess).toBe(true);
  });
});
