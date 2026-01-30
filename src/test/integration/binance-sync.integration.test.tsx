/**
 * Binance Sync Integration Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useSyncTradeToJournal, useBulkSyncTrades } from "@/hooks/use-binance-sync";
import { createMockSupabaseClient } from "../mocks/supabase";
import { mockBinanceTrade, mockBinanceTradeList } from "../mocks/binance";

const mockSupabase = createMockSupabaseClient();

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "mock-user-id" }, isAuthenticated: true, loading: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

describe("Binance Sync Integration", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("should sync single trade", async () => {
    const { result } = renderHook(() => useSyncTradeToJournal(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ binanceTrade: mockBinanceTrade });
    });
    expect(result.current.isSuccess).toBe(true);
  });

  it("should bulk sync trades", async () => {
    const { result } = renderHook(() => useBulkSyncTrades(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ trades: mockBinanceTradeList });
    });
    expect(result.current.isSuccess).toBe(true);
  });
});
