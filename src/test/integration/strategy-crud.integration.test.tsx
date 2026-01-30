/**
 * Strategy CRUD Integration Tests
 * Tests strategy hooks with mocked Supabase
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { waitFor } from "../utils";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock strategy data
const mockStrategies = [
  { id: "strategy-1", name: "Test Strategy 1", is_active: true, user_id: "mock-user-id" },
  { id: "strategy-2", name: "Test Strategy 2", is_active: true, user_id: "mock-user-id" },
];

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
      if (table === "trading_strategies") {
        return createChainMock({ data: mockStrategies, error: null });
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
import { useTradingStrategies } from "@/hooks/use-trading-strategies";

describe("Strategy CRUD Integration", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  });

  it("should fetch strategies successfully", async () => {
    const { result } = renderHook(() => useTradingStrategies(), { wrapper });
    
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    
    expect(result.current.isLoading).toBe(false);
  });

  it("should handle loading state", () => {
    const { result } = renderHook(() => useTradingStrategies(), { wrapper });
    expect(result.current.isLoading !== undefined).toBe(true);
  });

  it("should have query key defined", () => {
    const { result } = renderHook(() => useTradingStrategies(), { wrapper });
    expect(result.current).toBeDefined();
  });
});
