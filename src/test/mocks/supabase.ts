import { vi } from "vitest";
import type { Session, User } from "@supabase/supabase-js";
import {
  createMockTradeEntry,
  createMockStrategy,
  createMockRiskProfile,
  createMockAccount,
  createMockUserSettings,
} from "../utils";

/**
 * Create a mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  const mockUser: User = {
    id: "mock-user-id",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    role: "authenticated",
    updated_at: new Date().toISOString(),
  };

  const mockSession: Session = {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: mockUser,
  };

  // Query builder mock
  const createQueryBuilder = () => {
    const builder = {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lt: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      containedBy: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    return builder;
  };

  // Table-specific data
  const tableData: Record<string, unknown[]> = {
    trade_entries: [
      createMockTradeEntry({ id: "trade-1" }),
      createMockTradeEntry({ id: "trade-2", status: "open", pnl: null }),
    ],
    trading_strategies: [
      createMockStrategy({ id: "strategy-1" }),
      createMockStrategy({ id: "strategy-2", name: "Scalping Strategy" }),
    ],
    risk_profiles: [createMockRiskProfile()],
    accounts: [
      createMockAccount({ id: "account-1" }),
      createMockAccount({ id: "account-2", name: "Binance Main" }),
    ],
    user_settings: [createMockUserSettings()],
    notifications: [],
    account_transactions: [],
    trade_entry_strategies: [],
    trading_pairs: [
      { id: "1", symbol: "BTCUSDT", base_asset: "BTC", quote_asset: "USDT", is_active: true },
      { id: "2", symbol: "ETHUSDT", base_asset: "ETH", quote_asset: "USDT", is_active: true },
      { id: "3", symbol: "BNBUSDT", base_asset: "BNB", quote_asset: "USDT", is_active: true },
    ],
  };

  const mockSupabase = {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: mockUser },
        error: null,
      }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: null },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: {
          subscription: {
            id: "mock-subscription-id",
            unsubscribe: vi.fn(),
          },
        },
      }),
      refreshSession: vi.fn().mockResolvedValue({
        data: { session: mockSession },
        error: null,
      }),
    },

    from: vi.fn((table: string) => {
      const builder = createQueryBuilder();
      
      // Override then to return table-specific data
      builder.then = vi.fn().mockImplementation(async () => ({
        data: tableData[table] || [],
        error: null,
      }));

      builder.select = vi.fn().mockImplementation(() => {
        const selectBuilder = { ...builder };
        selectBuilder.then = vi.fn().mockImplementation(async () => ({
          data: tableData[table] || [],
          error: null,
        }));
        return selectBuilder;
      });

      builder.single = vi.fn().mockImplementation(async () => ({
        data: tableData[table]?.[0] || null,
        error: null,
      }));

      builder.insert = vi.fn().mockImplementation((data) => {
        const insertBuilder = { ...builder };
        insertBuilder.select = vi.fn().mockReturnThis();
        insertBuilder.single = vi.fn().mockResolvedValue({
          data: { id: "new-id", ...data },
          error: null,
        });
        insertBuilder.then = vi.fn().mockResolvedValue({
          data: Array.isArray(data) ? data : [data],
          error: null,
        });
        return insertBuilder;
      });

      builder.update = vi.fn().mockImplementation((data: Record<string, unknown>) => {
        const updateBuilder = { ...builder };
        updateBuilder.eq = vi.fn().mockReturnThis();
        updateBuilder.select = vi.fn().mockReturnThis();
        const existingData = tableData[table]?.[0] as Record<string, unknown> | undefined;
        updateBuilder.single = vi.fn().mockResolvedValue({
          data: existingData ? { ...existingData, ...data } : data,
          error: null,
        });
        updateBuilder.then = vi.fn().mockResolvedValue({
          data: existingData ? [{ ...existingData, ...data }] : [data],
          error: null,
        });
        return updateBuilder;
      });

      builder.delete = vi.fn().mockImplementation(() => {
        const deleteBuilder = { ...builder };
        deleteBuilder.eq = vi.fn().mockReturnThis();
        deleteBuilder.then = vi.fn().mockResolvedValue({
          data: null,
          error: null,
        });
        return deleteBuilder;
      });

      return builder;
    }),

    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({
        status: "SUBSCRIBED",
        unsubscribe: vi.fn(),
      }),
    }),

    removeChannel: vi.fn().mockResolvedValue("ok"),

    functions: {
      invoke: vi.fn().mockImplementation(async (functionName: string, options?: { body?: unknown }) => {
        // Default success responses for edge functions
        const responses: Record<string, unknown> = {
          "binance-futures": { success: true, data: {} },
          "trade-quality": { success: true, data: { score: 7, recommendation: "execute" } },
          "confluence-detection": { success: true, data: { score: 4, isValid: true } },
          "dashboard-insights": { success: true, data: { insights: [] } },
        };

        return {
          data: responses[functionName] || { success: true },
          error: null,
        };
      }),
    },

    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "test-path" }, error: null }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/file" } }),
        list: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },

    // Expose mock data for test assertions
    _mockData: tableData,
    _mockUser: mockUser,
    _mockSession: mockSession,
  };

  return mockSupabase;
}

/**
 * Create mock for unauthenticated state
 */
export function createUnauthenticatedMockSupabase() {
  const mock = createMockSupabaseClient();
  
  mock.auth.getSession = vi.fn().mockResolvedValue({
    data: { session: null },
    error: null,
  });
  
  mock.auth.getUser = vi.fn().mockResolvedValue({
    data: { user: null },
    error: null,
  });

  return mock;
}

/**
 * Create mock with specific auth error
 */
export function createAuthErrorMockSupabase(errorMessage = "Invalid credentials") {
  const mock = createMockSupabaseClient();
  
  mock.auth.signInWithPassword = vi.fn().mockResolvedValue({
    data: { user: null, session: null },
    error: { message: errorMessage, status: 401 },
  });

  return mock;
}

// Export types for test helpers
export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
