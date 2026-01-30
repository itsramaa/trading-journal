/**
 * Strategy CRUD Integration Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { waitFor } from "../utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { useTradingStrategies, useCreateTradingStrategy, useDeleteTradingStrategy } from "@/hooks/use-trading-strategies";
import { createMockSupabaseClient } from "../mocks/supabase";

const mockSupabase = createMockSupabaseClient();

vi.mock("@/integrations/supabase/client", () => ({ supabase: mockSupabase }));
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "mock-user-id" }, isAuthenticated: true, loading: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("Strategy CRUD Integration", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  });

  it("should fetch strategies", async () => {
    const { result } = renderHook(() => useTradingStrategies(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeDefined();
  });

  it("should create strategy", async () => {
    const { result } = renderHook(() => useCreateTradingStrategy(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ name: "Test Strategy" });
    });
    expect(result.current.isSuccess).toBe(true);
  });

  it("should delete strategy", async () => {
    const { result } = renderHook(() => useDeleteTradingStrategy(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync("strategy-1");
    });
    expect(result.current.isSuccess).toBe(true);
  });
});
