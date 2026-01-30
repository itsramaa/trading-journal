/**
 * App Store State Consistency Tests
 * Tests Zustand store persistence and state management
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "@testing-library/react";
import { useAppStore, convertCurrency, type Currency, type Notification } from "@/store/app-store";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get store() { return store; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("App Store State Consistency", () => {
  beforeEach(() => {
    // Reset store to initial state
    const { getState } = useAppStore;
    act(() => {
      getState().setCurrency("USD");
      getState().setCurrencyPair({ base: "USD", quote: "IDR" });
      getState().setExchangeRate(15800);
      getState().clearNotifications();
      getState().setSearchQuery("");
      getState().setSearchOpen(false);
      getState().setChatbotOpen(false);
      getState().setChatbotInitialPrompt(null);
    });
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Currency State", () => {
    it("should set currency correctly", () => {
      const { getState } = useAppStore;
      
      act(() => {
        getState().setCurrency("IDR");
      });
      
      expect(getState().currency).toBe("IDR");
    });

    it("should set currency pair correctly", () => {
      const { getState } = useAppStore;
      
      act(() => {
        getState().setCurrencyPair({ base: "BTC", quote: "USDT" });
      });
      
      expect(getState().currencyPair).toEqual({ base: "BTC", quote: "USDT" });
    });

    it("should update exchange rate", () => {
      const { getState } = useAppStore;
      
      act(() => {
        getState().setExchangeRate(16000);
      });
      
      expect(getState().exchangeRate).toBe(16000);
    });
  });

  describe("Notifications State", () => {
    it("should add notification with auto-generated id and timestamp", () => {
      const { getState } = useAppStore;
      
      act(() => {
        getState().addNotification({
          type: "price_alert",
          title: "BTC Alert",
          message: "BTC reached $50,000",
          assetSymbol: "BTC",
        });
      });
      
      const notifications = getState().notifications;
      expect(notifications).toHaveLength(1);
      expect(notifications[0].id).toBeDefined();
      expect(notifications[0].createdAt).toBeInstanceOf(Date);
      expect(notifications[0].read).toBe(false);
      expect(notifications[0].title).toBe("BTC Alert");
    });

    it("should maintain notification order (newest first)", () => {
      const { getState } = useAppStore;
      
      act(() => {
        getState().addNotification({
          type: "system",
          title: "First",
          message: "First notification",
        });
      });
      
      act(() => {
        getState().addNotification({
          type: "system",
          title: "Second",
          message: "Second notification",
        });
      });
      
      act(() => {
        getState().addNotification({
          type: "system",
          title: "Third",
          message: "Third notification",
        });
      });
      
      const notifications = getState().notifications;
      expect(notifications).toHaveLength(3);
      expect(notifications[0].title).toBe("Third");
      expect(notifications[1].title).toBe("Second");
      expect(notifications[2].title).toBe("First");
    });

    it("should mark single notification as read", () => {
      const { getState } = useAppStore;
      
      act(() => {
        getState().addNotification({
          type: "system",
          title: "Test",
          message: "Test message",
        });
      });
      
      const notificationId = getState().notifications[0].id;
      
      act(() => {
        getState().markAsRead(notificationId);
      });
      
      expect(getState().notifications[0].read).toBe(true);
    });

    it("should mark all notifications as read", () => {
      const { getState } = useAppStore;
      
      act(() => {
        getState().addNotification({ type: "system", title: "1", message: "1" });
        getState().addNotification({ type: "system", title: "2", message: "2" });
        getState().addNotification({ type: "system", title: "3", message: "3" });
      });
      
      expect(getState().unreadCount()).toBe(3);
      
      act(() => {
        getState().markAllAsRead();
      });
      
      expect(getState().unreadCount()).toBe(0);
      expect(getState().notifications.every(n => n.read)).toBe(true);
    });

    it("should clear all notifications", () => {
      const { getState } = useAppStore;
      
      act(() => {
        getState().addNotification({ type: "system", title: "1", message: "1" });
        getState().addNotification({ type: "system", title: "2", message: "2" });
      });
      
      expect(getState().notifications).toHaveLength(2);
      
      act(() => {
        getState().clearNotifications();
      });
      
      expect(getState().notifications).toHaveLength(0);
    });

    it("should calculate unread count correctly", () => {
      const { getState } = useAppStore;
      
      act(() => {
        getState().addNotification({ type: "system", title: "1", message: "1" });
        getState().addNotification({ type: "system", title: "2", message: "2" });
        getState().addNotification({ type: "system", title: "3", message: "3" });
      });
      
      expect(getState().unreadCount()).toBe(3);
      
      const firstId = getState().notifications[0].id;
      act(() => {
        getState().markAsRead(firstId);
      });
      
      expect(getState().unreadCount()).toBe(2);
    });
  });

  describe("Search State", () => {
    it("should update search query", () => {
      const { getState } = useAppStore;
      
      act(() => {
        getState().setSearchQuery("BTCUSDT");
      });
      
      expect(getState().searchQuery).toBe("BTCUSDT");
    });

    it("should toggle search open state", () => {
      const { getState } = useAppStore;
      
      expect(getState().isSearchOpen).toBe(false);
      
      act(() => {
        getState().setSearchOpen(true);
      });
      
      expect(getState().isSearchOpen).toBe(true);
      
      act(() => {
        getState().setSearchOpen(false);
      });
      
      expect(getState().isSearchOpen).toBe(false);
    });
  });

  describe("Chatbot State", () => {
    it("should toggle chatbot open state", () => {
      const { getState } = useAppStore;
      
      expect(getState().isChatbotOpen).toBe(false);
      
      act(() => {
        getState().setChatbotOpen(true);
      });
      
      expect(getState().isChatbotOpen).toBe(true);
    });

    it("should set chatbot initial prompt", () => {
      const { getState } = useAppStore;
      
      act(() => {
        getState().setChatbotInitialPrompt("Analyze my trades");
      });
      
      expect(getState().chatbotInitialPrompt).toBe("Analyze my trades");
      
      act(() => {
        getState().setChatbotInitialPrompt(null);
      });
      
      expect(getState().chatbotInitialPrompt).toBeNull();
    });

    it("should sync chatbot state across components", () => {
      const { getState } = useAppStore;
      
      // Simulate opening from header
      act(() => {
        getState().setChatbotOpen(true);
        getState().setChatbotInitialPrompt("Help me");
      });
      
      // State should be consistent
      expect(getState().isChatbotOpen).toBe(true);
      expect(getState().chatbotInitialPrompt).toBe("Help me");
    });
  });
});

describe("Currency Conversion Helper", () => {
  it("should return same amount for same currency", () => {
    expect(convertCurrency(100, "USD", "USD", 15800)).toBe(100);
    expect(convertCurrency(100, "IDR", "IDR", 15800)).toBe(100);
  });

  it("should convert USD to IDR correctly", () => {
    expect(convertCurrency(100, "USD", "IDR", 15800)).toBe(1580000);
  });

  it("should convert IDR to USD correctly", () => {
    expect(convertCurrency(158000, "IDR", "USD", 15800)).toBe(10);
  });

  it("should handle different exchange rates", () => {
    expect(convertCurrency(100, "USD", "IDR", 16000)).toBe(1600000);
    expect(convertCurrency(100, "USD", "IDR", 14000)).toBe(1400000);
  });
});
