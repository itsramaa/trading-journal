/**
 * Auth Flow Integration Tests
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockSupabaseClient } from "../mocks/supabase";

const mockSupabase = createMockSupabaseClient();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: mockSupabase,
}));

describe("Auth Flow Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get session from mock client", async () => {
    const session = await mockSupabase.auth.getSession();
    expect(session.data.session).toBeTruthy();
  });

  it("should sign in with credentials", async () => {
    const result = await mockSupabase.auth.signInWithPassword({
      email: "test@example.com",
      password: "password123",
    });
    expect(result.error).toBeNull();
  });

  it("should sign out", async () => {
    const result = await mockSupabase.auth.signOut();
    expect(result.error).toBeNull();
  });
});
