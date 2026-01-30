/**
 * Query Cache State Consistency Tests
 * Tests React Query cache invalidation and data consistency
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { QueryClient } from "@tanstack/react-query";

describe("Query Cache Consistency", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
      },
    });
  });

  describe("Cache Invalidation", () => {
    it("should invalidate trade-entries cache", async () => {
      // Set initial data
      queryClient.setQueryData(["trade-entries"], [
        { id: "1", pair: "BTCUSDT", pnl: 100 },
        { id: "2", pair: "ETHUSDT", pnl: -50 },
      ]);

      expect(queryClient.getQueryData(["trade-entries"])).toHaveLength(2);

      // Invalidate
      await queryClient.invalidateQueries({ queryKey: ["trade-entries"] });

      // Cache should be invalidated (stale)
      const state = queryClient.getQueryState(["trade-entries"]);
      expect(state?.isInvalidated).toBe(true);
    });

    it("should invalidate accounts cache on transaction", async () => {
      queryClient.setQueryData(["accounts"], [
        { id: "acc-1", balance: 10000 },
      ]);
      queryClient.setQueryData(["account-transactions"], []);

      // Simulate transaction that should invalidate both
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["account-transactions"] });

      expect(queryClient.getQueryState(["accounts"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["account-transactions"])?.isInvalidated).toBe(true);
    });

    it("should invalidate strategies cache", async () => {
      queryClient.setQueryData(["trading-strategies"], [
        { id: "strat-1", name: "Strategy 1" },
      ]);

      await queryClient.invalidateQueries({ queryKey: ["trading-strategies"] });

      expect(queryClient.getQueryState(["trading-strategies"])?.isInvalidated).toBe(true);
    });
  });

  describe("Cache Updates", () => {
    it("should update cache data directly", () => {
      queryClient.setQueryData(["trade-entries"], [
        { id: "1", pair: "BTCUSDT", pnl: 100 },
      ]);

      // Update cache
      queryClient.setQueryData(["trade-entries"], (old: any) => [
        ...old,
        { id: "2", pair: "ETHUSDT", pnl: 200 },
      ]);

      const data = queryClient.getQueryData(["trade-entries"]) as any[];
      expect(data).toHaveLength(2);
      expect(data[1].pair).toBe("ETHUSDT");
    });

    it("should remove item from cache", () => {
      queryClient.setQueryData(["trade-entries"], [
        { id: "1", pair: "BTCUSDT" },
        { id: "2", pair: "ETHUSDT" },
      ]);

      // Remove item
      queryClient.setQueryData(["trade-entries"], (old: any) =>
        old.filter((item: any) => item.id !== "1")
      );

      const data = queryClient.getQueryData(["trade-entries"]) as any[];
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe("2");
    });

    it("should update single item in cache", () => {
      queryClient.setQueryData(["trade-entries"], [
        { id: "1", pair: "BTCUSDT", pnl: 100 },
        { id: "2", pair: "ETHUSDT", pnl: 200 },
      ]);

      // Update single item
      queryClient.setQueryData(["trade-entries"], (old: any) =>
        old.map((item: any) =>
          item.id === "1" ? { ...item, pnl: 150 } : item
        )
      );

      const data = queryClient.getQueryData(["trade-entries"]) as any[];
      expect(data[0].pnl).toBe(150);
      expect(data[1].pnl).toBe(200);
    });
  });

  describe("Related Cache Invalidation", () => {
    it("should invalidate related caches when account changes", async () => {
      queryClient.setQueryData(["accounts"], [{ id: "1", balance: 10000 }]);
      queryClient.setQueryData(["account-transactions"], []);
      queryClient.setQueryData(["trading-accounts"], []);

      // Simulate account update that should invalidate related data
      await queryClient.invalidateQueries({ queryKey: ["accounts"] });
      await queryClient.invalidateQueries({ queryKey: ["account-transactions"] });
      await queryClient.invalidateQueries({ queryKey: ["trading-accounts"] });

      expect(queryClient.getQueryState(["accounts"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["account-transactions"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["trading-accounts"])?.isInvalidated).toBe(true);
    });

    it("should preserve unrelated caches", async () => {
      queryClient.setQueryData(["trade-entries"], [{ id: "1" }]);
      queryClient.setQueryData(["trading-strategies"], [{ id: "s1" }]);

      // Invalidate only trade entries
      await queryClient.invalidateQueries({ queryKey: ["trade-entries"] });

      // Strategies should not be invalidated
      expect(queryClient.getQueryState(["trade-entries"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["trading-strategies"])?.isInvalidated).toBeFalsy();
    });
  });

  describe("Query Key Matching", () => {
    it("should match partial query keys", async () => {
      queryClient.setQueryData(["trade-entries", "user-1"], [{ id: "1" }]);
      queryClient.setQueryData(["trade-entries", "user-2"], [{ id: "2" }]);

      // Invalidate all trade-entries regardless of user
      await queryClient.invalidateQueries({ queryKey: ["trade-entries"] });

      expect(queryClient.getQueryState(["trade-entries", "user-1"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["trade-entries", "user-2"])?.isInvalidated).toBe(true);
    });

    it("should match exact query keys when specified", async () => {
      queryClient.setQueryData(["trade-entries", "user-1"], [{ id: "1" }]);
      queryClient.setQueryData(["trade-entries", "user-2"], [{ id: "2" }]);

      // Invalidate only specific user's entries
      await queryClient.invalidateQueries({ 
        queryKey: ["trade-entries", "user-1"],
        exact: true,
      });

      expect(queryClient.getQueryState(["trade-entries", "user-1"])?.isInvalidated).toBe(true);
      expect(queryClient.getQueryState(["trade-entries", "user-2"])?.isInvalidated).toBeFalsy();
    });
  });

  describe("Cache Clearing", () => {
    it("should clear all cache", () => {
      queryClient.setQueryData(["trade-entries"], [{ id: "1" }]);
      queryClient.setQueryData(["accounts"], [{ id: "a1" }]);
      queryClient.setQueryData(["trading-strategies"], [{ id: "s1" }]);

      queryClient.clear();

      expect(queryClient.getQueryData(["trade-entries"])).toBeUndefined();
      expect(queryClient.getQueryData(["accounts"])).toBeUndefined();
      expect(queryClient.getQueryData(["trading-strategies"])).toBeUndefined();
    });

    it("should remove specific query from cache", () => {
      queryClient.setQueryData(["trade-entries"], [{ id: "1" }]);
      queryClient.setQueryData(["accounts"], [{ id: "a1" }]);

      queryClient.removeQueries({ queryKey: ["trade-entries"] });

      expect(queryClient.getQueryData(["trade-entries"])).toBeUndefined();
      expect(queryClient.getQueryData(["accounts"])).toBeDefined();
    });
  });
});
