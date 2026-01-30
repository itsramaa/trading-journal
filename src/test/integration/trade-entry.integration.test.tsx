/**
 * Trade Entry Integration Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { waitFor } from "../utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useTradeEntries, useCreateTradeEntry } from "@/hooks/use-trade-entries";
import { createMockSupabaseClient } from "../mocks/supabase";

const mockSupabase = createMockSupabaseClient();

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "mock-user-id" }, isAuthenticated: true, loading: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("Trade Entry Integration", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("should fetch trade entries", async () => {
    const { result } = renderHook(() => useTradeEntries(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it("should create trade entry", async () => {
    const { result } = renderHook(() => useCreateTradeEntry(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ pair: "BTCUSDT", direction: "LONG", entry_price: 50000 });
    });
    expect(result.current.isSuccess).toBe(true);
  });
});
