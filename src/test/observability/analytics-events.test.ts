/**
 * Analytics Events Testing
 * Tests event tracking functionality and data integrity
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create a fresh localStorage mock for each test
let mockStorage: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    mockStorage = {};
  }),
};

// Mock localStorage before imports
Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Import after mocks are set up
import {
  trackEvent,
  getEvents,
  getEventsByName,
  getEventCounts,
  clearEvents,
  ANALYTICS_EVENTS,
} from "@/lib/analytics";

describe("Analytics Events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {};
  });

  afterEach(() => {
    mockStorage = {};
  });

  describe("Event Constants", () => {
    it("should have all required trade entry events", () => {
      expect(ANALYTICS_EVENTS.TRADE_ENTRY_WIZARD_START).toBe("trade_entry_wizard_start");
      expect(ANALYTICS_EVENTS.TRADE_ENTRY_WIZARD_COMPLETE).toBe("trade_entry_wizard_complete");
      expect(ANALYTICS_EVENTS.TRADE_ENTRY_WIZARD_ABANDON).toBe("trade_entry_wizard_abandon");
      expect(ANALYTICS_EVENTS.TRADE_ENTRY_QUICK).toBe("trade_entry_quick");
    });

    it("should have all required navigation events", () => {
      expect(ANALYTICS_EVENTS.PAGE_VIEW).toBe("page_view");
    });

    it("should have all required AI events", () => {
      expect(ANALYTICS_EVENTS.AI_INSIGHT_VIEW).toBe("ai_insight_view");
      expect(ANALYTICS_EVENTS.AI_RECOMMENDATION_FOLLOW).toBe("ai_recommendation_follow");
    });

    it("should have all required risk management events", () => {
      expect(ANALYTICS_EVENTS.RISK_PROFILE_SAVE).toBe("risk_profile_save");
      expect(ANALYTICS_EVENTS.POSITION_SIZE_CALCULATE).toBe("position_size_calculate");
    });

    it("should have all required session events", () => {
      expect(ANALYTICS_EVENTS.SESSION_START).toBe("session_start");
      expect(ANALYTICS_EVENTS.SESSION_END).toBe("session_end");
    });
  });

  describe("trackEvent", () => {
    it("should store event in localStorage", () => {
      trackEvent("test_event");

      expect(localStorageMock.setItem).toHaveBeenCalled();
      const storedValue = localStorageMock.setItem.mock.calls[0][1];
      const events = JSON.parse(storedValue);
      
      expect(events).toHaveLength(1);
      expect(events[0].event).toBe("test_event");
    });

    it("should include timestamp in event", () => {
      const beforeTime = Date.now();
      trackEvent("test_event");
      const afterTime = Date.now();

      const storedValue = localStorageMock.setItem.mock.calls[0][1];
      const events = JSON.parse(storedValue);
      
      expect(events[0].timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(events[0].timestamp).toBeLessThanOrEqual(afterTime);
    });

    it("should include optional data in event", () => {
      trackEvent("test_event", { step: "setup", pair: "BTCUSDT" });

      const storedValue = localStorageMock.setItem.mock.calls[0][1];
      const events = JSON.parse(storedValue);
      
      expect(events[0].data).toEqual({ step: "setup", pair: "BTCUSDT" });
    });

    it("should append to existing events", () => {
      mockStorage["usage_events"] = JSON.stringify([
        { event: "existing_event", timestamp: 1000 },
      ]);

      trackEvent("new_event");

      const storedValue = localStorageMock.setItem.mock.calls[0][1];
      const events = JSON.parse(storedValue);
      
      expect(events).toHaveLength(2);
      expect(events[0].event).toBe("existing_event");
      expect(events[1].event).toBe("new_event");
    });

    it("should limit events to MAX_EVENTS (100)", () => {
      // Pre-fill with 100 events
      const existingEvents = Array.from({ length: 100 }, (_, i) => ({
        event: `event_${i}`,
        timestamp: i,
      }));
      mockStorage["usage_events"] = JSON.stringify(existingEvents);

      trackEvent("overflow_event");

      const storedValue = localStorageMock.setItem.mock.calls[0][1];
      const events = JSON.parse(storedValue);
      
      expect(events).toHaveLength(100);
      expect(events[99].event).toBe("overflow_event");
      expect(events[0].event).toBe("event_1"); // First event dropped
    });

    it("should handle localStorage errors gracefully", () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error("Storage unavailable");
      });

      // Should not throw
      expect(() => trackEvent("test_event")).not.toThrow();
    });
  });

  describe("getEvents", () => {
    it("should return empty array when no events", () => {
      const events = getEvents();
      expect(events).toEqual([]);
    });

    it("should return all stored events", () => {
      mockStorage["usage_events"] = JSON.stringify([
        { event: "event_1", timestamp: 1000 },
        { event: "event_2", timestamp: 2000 },
      ]);

      const events = getEvents();
      
      expect(events).toHaveLength(2);
      expect(events[0].event).toBe("event_1");
      expect(events[1].event).toBe("event_2");
    });

    it("should handle corrupted localStorage gracefully", () => {
      mockStorage["usage_events"] = "invalid json";

      const events = getEvents();
      expect(events).toEqual([]);
    });
  });

  describe("getEventsByName", () => {
    it("should filter events by name", () => {
      mockStorage["usage_events"] = JSON.stringify([
        { event: "page_view", timestamp: 1000, data: { page: "/dashboard" } },
        { event: "trade_entry", timestamp: 2000 },
        { event: "page_view", timestamp: 3000, data: { page: "/journal" } },
      ]);

      const pageViews = getEventsByName("page_view");
      
      expect(pageViews).toHaveLength(2);
      expect(pageViews[0].data?.page).toBe("/dashboard");
      expect(pageViews[1].data?.page).toBe("/journal");
    });

    it("should return empty array when no matching events", () => {
      mockStorage["usage_events"] = JSON.stringify([
        { event: "other_event", timestamp: 1000 },
      ]);

      const events = getEventsByName("nonexistent");
      expect(events).toEqual([]);
    });
  });

  describe("getEventCounts", () => {
    it("should count events by name", () => {
      mockStorage["usage_events"] = JSON.stringify([
        { event: "page_view", timestamp: 1000 },
        { event: "trade_entry", timestamp: 2000 },
        { event: "page_view", timestamp: 3000 },
        { event: "page_view", timestamp: 4000 },
        { event: "trade_entry", timestamp: 5000 },
      ]);

      const counts = getEventCounts();
      
      expect(counts).toEqual({
        page_view: 3,
        trade_entry: 2,
      });
    });

    it("should return empty object when no events", () => {
      const counts = getEventCounts();
      expect(counts).toEqual({});
    });
  });

  describe("clearEvents", () => {
    it("should remove all events from localStorage", () => {
      mockStorage["usage_events"] = JSON.stringify([
        { event: "event_1", timestamp: 1000 },
      ]);

      clearEvents();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith("usage_events");
    });
  });
});

describe("Analytics Integration Patterns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage = {};
  });

  it("should track trade entry wizard flow", () => {
    // Start wizard
    trackEvent(ANALYTICS_EVENTS.TRADE_ENTRY_WIZARD_START, { step: "setup" });
    
    // Complete wizard
    trackEvent(ANALYTICS_EVENTS.TRADE_ENTRY_WIZARD_COMPLETE, {
      pair: "BTCUSDT",
      direction: "long",
      duration_ms: 45000,
    });

    const storedValue = localStorageMock.setItem.mock.calls[1][1];
    const events = JSON.parse(storedValue);
    
    expect(events).toHaveLength(2);
    expect(events[0].event).toBe("trade_entry_wizard_start");
    expect(events[1].event).toBe("trade_entry_wizard_complete");
    expect(events[1].data.pair).toBe("BTCUSDT");
  });

  it("should track page navigation", () => {
    trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, { page: "/dashboard" });
    trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, { page: "/journal" });
    trackEvent(ANALYTICS_EVENTS.PAGE_VIEW, { page: "/risk" });

    const storedValue = localStorageMock.setItem.mock.calls[2][1];
    const events = JSON.parse(storedValue);
    const pageViews = events.filter((e: any) => e.event === "page_view");
    
    expect(pageViews).toHaveLength(3);
  });

  it("should track AI feature usage", () => {
    trackEvent(ANALYTICS_EVENTS.AI_INSIGHT_VIEW, {
      insight_type: "pattern_recognition",
      confidence: 85,
    });
    
    trackEvent(ANALYTICS_EVENTS.AI_RECOMMENDATION_FOLLOW, {
      recommendation: "reduce_position",
      followed: true,
    });

    const storedValue = localStorageMock.setItem.mock.calls[1][1];
    const events = JSON.parse(storedValue);
    
    expect(events[0].event).toBe("ai_insight_view");
    expect(events[1].event).toBe("ai_recommendation_follow");
  });

  it("should track risk management actions", () => {
    trackEvent(ANALYTICS_EVENTS.RISK_PROFILE_SAVE, {
      risk_per_trade: 2,
      max_daily_loss: 5,
    });
    
    trackEvent(ANALYTICS_EVENTS.POSITION_SIZE_CALCULATE, {
      pair: "ETHUSDT",
      calculated_size: 0.5,
    });

    const storedValue = localStorageMock.setItem.mock.calls[1][1];
    const events = JSON.parse(storedValue);
    
    expect(events[0].event).toBe("risk_profile_save");
    expect(events[1].event).toBe("position_size_calculate");
  });
});
