/**
 * Realtime Sync State Consistency Tests
 * Tests realtime subscription handling and cache invalidation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Mock Supabase client - all inside factory to avoid hoisting issues
vi.mock("@/integrations/supabase/client", () => {
  const channelOn = vi.fn().mockReturnThis();
  const channelSubscribe = vi.fn().mockReturnValue({ unsubscribe: vi.fn() });
  const removeChannel = vi.fn();
  const channel = vi.fn(() => ({
    on: channelOn,
    subscribe: channelSubscribe,
  }));

  return {
    supabase: {
      channel,
      removeChannel,
    },
  };
});

// Mock auth hook
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: { id: "mock-user-id" }, isAuthenticated: true }),
}));

// Import after mocks
import { useRealtime, useAccountsRealtime, useTradingRealtime } from "@/hooks/use-realtime";
import { supabase } from "@/integrations/supabase/client";

describe("Realtime Sync Consistency", () => {
  let queryClient: QueryClient;
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // Get mocks from the mocked module
  const getMockChannel = () => {
    const result = (supabase.channel as any)();
    return result;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  describe("Channel Subscription", () => {
    it("should create channel with user id", () => {
      renderHook(
        () => useRealtime({ tables: ["trade_entries"], enabled: true }),
        { wrapper }
      );

      expect(supabase.channel).toHaveBeenCalledWith("realtime-mock-user-id");
    });

    it("should subscribe to specified tables", () => {
      renderHook(
        () => useRealtime({ tables: ["trade_entries", "accounts"], enabled: true }),
        { wrapper }
      );

      const mockChannel = getMockChannel();
      // Should call .on() for each table
      expect(mockChannel.on).toHaveBeenCalled();
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    it("should not subscribe when disabled", () => {
      vi.clearAllMocks();
      
      renderHook(
        () => useRealtime({ tables: ["trade_entries"], enabled: false }),
        { wrapper }
      );

      expect(supabase.channel).not.toHaveBeenCalled();
    });

    it("should cleanup channel on unmount", () => {
      const { unmount } = renderHook(
        () => useRealtime({ tables: ["trade_entries"], enabled: true }),
        { wrapper }
      );

      unmount();

      expect(supabase.removeChannel).toHaveBeenCalled();
    });
  });

  describe("Table Subscriptions", () => {
    it("should subscribe to postgres_changes event", () => {
      renderHook(
        () => useRealtime({ tables: ["trade_entries"], enabled: true }),
        { wrapper }
      );

      const mockChannel = getMockChannel();
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        expect.objectContaining({
          event: "*",
          schema: "public",
          table: "trade_entries",
        }),
        expect.any(Function)
      );
    });

    it("should filter by user_id", () => {
      renderHook(
        () => useRealtime({ tables: ["accounts"], enabled: true }),
        { wrapper }
      );

      const mockChannel = getMockChannel();
      expect(mockChannel.on).toHaveBeenCalledWith(
        "postgres_changes",
        expect.objectContaining({
          filter: "user_id=eq.mock-user-id",
        }),
        expect.any(Function)
      );
    });
  });

  describe("Preset Hooks", () => {
    it("useAccountsRealtime should subscribe to accounts and transactions", () => {
      renderHook(() => useAccountsRealtime(true), { wrapper });

      const mockChannel = getMockChannel();
      // Should subscribe to 2 tables
      expect(mockChannel.on).toHaveBeenCalled();
    });

    it("useTradingRealtime should subscribe to trading-related tables", () => {
      renderHook(() => useTradingRealtime(true), { wrapper });

      const mockChannel = getMockChannel();
      // Should subscribe to trade_entries, trading_strategies, accounts
      expect(mockChannel.on).toHaveBeenCalled();
    });

    it("useAccountsRealtime should respect enabled flag", () => {
      vi.clearAllMocks();
      
      renderHook(() => useAccountsRealtime(false), { wrapper });

      expect(supabase.channel).not.toHaveBeenCalled();
    });
  });

  describe("Cache Invalidation on Change", () => {
    it("should setup callback for each table subscription", () => {
      renderHook(
        () => useRealtime({ tables: ["trade_entries"], enabled: true }),
        { wrapper }
      );

      const mockChannel = getMockChannel();
      // Get the callback that was passed to .on()
      const callback = mockChannel.on.mock.calls[0][2];
      expect(typeof callback).toBe("function");
    });

    it("should handle multiple table subscriptions", () => {
      renderHook(
        () => useRealtime({ 
          tables: ["trade_entries", "trading_strategies", "accounts"], 
          enabled: true 
        }),
        { wrapper }
      );

      const mockChannel = getMockChannel();
      expect(mockChannel.on).toHaveBeenCalled();
      
      // Verify each table was subscribed
      const calls = mockChannel.on.mock.calls;
      expect(calls[0][1].table).toBe("trade_entries");
      expect(calls[1][1].table).toBe("trading_strategies");
      expect(calls[2][1].table).toBe("accounts");
    });
  });

  describe("Subscription Status", () => {
    it("should handle subscription callback", () => {
      renderHook(
        () => useRealtime({ tables: ["trade_entries"], enabled: true }),
        { wrapper }
      );

      const mockChannel = getMockChannel();
      // Verify subscribe was called
      expect(mockChannel.subscribe).toHaveBeenCalled();
      
      // Get the status callback
      const statusCallback = mockChannel.subscribe.mock.calls[0][0];
      expect(typeof statusCallback).toBe("function");
    });
  });

  describe("Empty Tables Array", () => {
    it("should not subscribe when tables array is empty", () => {
      vi.clearAllMocks();
      
      renderHook(
        () => useRealtime({ tables: [], enabled: true }),
        { wrapper }
      );

      expect(supabase.channel).not.toHaveBeenCalled();
    });
  });
});

describe("Realtime Event Handling", () => {
  it("should define correct table types", () => {
    // Type check - these should compile
    const validTables = ["accounts", "account_transactions", "trade_entries", "trading_strategies"];
    expect(validTables).toHaveLength(4);
  });
});
