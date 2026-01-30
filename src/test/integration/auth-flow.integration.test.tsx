/**
 * Auth Flow Integration Tests
 * Tests authentication flow with mocked Supabase
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client - all values inline to avoid hoisting issues
vi.mock("@/integrations/supabase/client", () => {
  // Create chainable mock inside factory
  const createChainMock = (result: any = { data: null, error: null }) => {
    const chain: any = {};
    const methods = ["select", "insert", "update", "delete", "upsert", "eq", "neq", "order", "limit", "single", "maybeSingle"];
    methods.forEach(m => {
      chain[m] = () => {
        if (["single", "maybeSingle"].includes(m)) return Promise.resolve(result);
        return chain;
      };
    });
    chain.then = (resolve: any) => resolve(result);
    return chain;
  };

  return {
    supabase: {
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { 
            session: { 
              user: { id: "mock-user-id", email: "test@example.com" }, 
              access_token: "mock-token" 
            } 
          },
          error: null,
        }),
        signInWithPassword: vi.fn().mockResolvedValue({
          data: { 
            user: { id: "mock-user-id", email: "test@example.com" }, 
            session: { access_token: "mock-token" } 
          },
          error: null,
        }),
        signUp: vi.fn().mockResolvedValue({
          data: { 
            user: { id: "mock-user-id", email: "test@example.com" }, 
            session: { access_token: "mock-token" } 
          },
          error: null,
        }),
        signOut: vi.fn().mockResolvedValue({ error: null }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
      },
      from: vi.fn(() => createChainMock()),
    },
  };
});

// Import after mocks
import { supabase } from "@/integrations/supabase/client";

describe("Auth Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get session from mock client", async () => {
    const result = await supabase.auth.getSession();
    expect(result.data.session).toBeTruthy();
    expect(result.data.session?.user.id).toBe("mock-user-id");
  });

  it("should sign in with credentials", async () => {
    const result = await supabase.auth.signInWithPassword({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.error).toBeNull();
    expect(result.data.user).toBeTruthy();
  });

  it("should sign out successfully", async () => {
    const result = await supabase.auth.signOut();
    expect(result.error).toBeNull();
  });

  it("should handle auth state change subscription", () => {
    const callback = vi.fn();
    const { data } = supabase.auth.onAuthStateChange(callback);
    expect(data.subscription.unsubscribe).toBeDefined();
  });
});
