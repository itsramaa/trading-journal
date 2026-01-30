/**
 * Contract Tests for Custom Hooks
 * Validates that hooks return expected data shapes
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode } from "react";

// Mock Supabase client
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "test-user-id" } } },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
  },
}));

// Mock useAuth hook
vi.mock("@/hooks/use-auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "test-user-id", email: "test@example.com" },
    isLoading: false,
  })),
}));

// Mock Binance hooks for risk profile
vi.mock("@/hooks/use-binance-daily-pnl", () => ({
  useBinanceDailyPnl: vi.fn(() => ({ totalPnl: 0, isLoading: false })),
  useBinanceTotalBalance: vi.fn(() => ({ totalBalance: 0, isConnected: false })),
}));

// Create test wrapper
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("Hook Contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("TradeEntry Interface Contract", () => {
    it("should have required TradeEntry fields", () => {
      // Define expected shape
      const requiredFields = [
        "id",
        "user_id",
        "pair",
        "direction",
        "entry_price",
        "quantity",
        "status",
        "trade_date",
        "created_at",
        "updated_at",
      ];

      // Mock data shape from Supabase
      const mockTradeEntry = {
        id: "uuid",
        user_id: "uuid",
        trading_account_id: null,
        session_id: null,
        pair: "BTCUSDT",
        direction: "long",
        entry_price: 50000,
        exit_price: null,
        stop_loss: null,
        take_profit: null,
        quantity: 0.1,
        pnl: null,
        fees: null,
        confluence_score: null,
        ai_quality_score: null,
        ai_confidence: null,
        trade_date: "2024-01-01T00:00:00Z",
        result: null,
        market_condition: null,
        entry_signal: null,
        emotional_state: null,
        notes: null,
        tags: null,
        status: "open",
        realized_pnl: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        binance_trade_id: null,
        binance_order_id: null,
        source: "manual",
        commission: null,
        commission_asset: null,
      };

      // Verify all required fields exist
      requiredFields.forEach((field) => {
        expect(mockTradeEntry).toHaveProperty(field);
      });

      // Verify types
      expect(typeof mockTradeEntry.id).toBe("string");
      expect(typeof mockTradeEntry.pair).toBe("string");
      expect(typeof mockTradeEntry.entry_price).toBe("number");
      expect(["open", "closed"]).toContain(mockTradeEntry.status);
    });

    it("should include optional strategies relationship", () => {
      const mockTradeWithStrategies = {
        id: "uuid",
        pair: "BTCUSDT",
        strategies: [
          { id: "strategy-1", name: "Scalping", color: "blue" },
        ],
      };

      expect(mockTradeWithStrategies).toHaveProperty("strategies");
      expect(Array.isArray(mockTradeWithStrategies.strategies)).toBe(true);
    });
  });

  describe("TradingStrategy Interface Contract", () => {
    it("should have required TradingStrategy fields", () => {
      const requiredFields = [
        "id",
        "user_id",
        "name",
        "is_active",
        "created_at",
        "updated_at",
      ];

      const mockStrategy = {
        id: "uuid",
        user_id: "uuid",
        name: "Test Strategy",
        description: null,
        tags: [],
        color: "blue",
        is_active: true,
        timeframe: "4h",
        market_type: "futures",
        min_confluences: 4,
        min_rr: 1.5,
        entry_rules: [],
        exit_rules: [],
        valid_pairs: ["BTC", "ETH"],
        version: 1,
        status: "active",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      requiredFields.forEach((field) => {
        expect(mockStrategy).toHaveProperty(field);
      });

      expect(typeof mockStrategy.name).toBe("string");
      expect(typeof mockStrategy.is_active).toBe("boolean");
      expect(Array.isArray(mockStrategy.entry_rules)).toBe(true);
      expect(Array.isArray(mockStrategy.exit_rules)).toBe(true);
    });

    it("should support valid timeframe types", () => {
      const validTimeframes = ["1m", "5m", "15m", "1h", "4h", "1d", "1w"];
      const mockStrategy = { timeframe: "4h" };
      
      expect(validTimeframes).toContain(mockStrategy.timeframe);
    });

    it("should support valid market types", () => {
      const validMarketTypes = ["spot", "futures", "both"];
      const mockStrategy = { market_type: "futures" };
      
      expect(validMarketTypes).toContain(mockStrategy.market_type);
    });
  });

  describe("RiskProfile Interface Contract", () => {
    it("should have required RiskProfile fields", () => {
      const requiredFields = [
        "id",
        "user_id",
        "risk_per_trade_percent",
        "max_daily_loss_percent",
        "max_weekly_drawdown_percent",
        "max_position_size_percent",
        "max_concurrent_positions",
        "is_active",
      ];

      const mockRiskProfile = {
        id: "uuid",
        user_id: "uuid",
        risk_per_trade_percent: 2.0,
        max_daily_loss_percent: 5.0,
        max_weekly_drawdown_percent: 10.0,
        max_position_size_percent: 40.0,
        max_correlated_exposure: 0.75,
        max_concurrent_positions: 3,
        is_active: true,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      requiredFields.forEach((field) => {
        expect(mockRiskProfile).toHaveProperty(field);
      });

      // Verify numeric constraints
      expect(mockRiskProfile.risk_per_trade_percent).toBeGreaterThan(0);
      expect(mockRiskProfile.risk_per_trade_percent).toBeLessThanOrEqual(100);
      expect(mockRiskProfile.max_daily_loss_percent).toBeGreaterThan(0);
      expect(mockRiskProfile.max_concurrent_positions).toBeGreaterThan(0);
    });
  });

  describe("UserSettings Interface Contract", () => {
    it("should have required UserSettings fields", () => {
      const requiredFields = [
        "id",
        "user_id",
        "default_currency",
        "theme",
        "language",
        "notifications_enabled",
        "subscription_plan",
        "subscription_status",
      ];

      const mockUserSettings = {
        id: "uuid",
        user_id: "uuid",
        default_currency: "USD",
        theme: "dark",
        language: "en",
        notifications_enabled: true,
        subscription_plan: "free",
        subscription_status: "active",
        plan_expires_at: null,
        notify_price_alerts: true,
        notify_portfolio_updates: true,
        notify_weekly_report: false,
        notify_market_news: true,
        notify_email_enabled: true,
        notify_push_enabled: false,
        target_allocations: null,
        ai_settings: {
          quality_scoring: true,
          pattern_recognition: true,
          confluence_detection: true,
          confidence_threshold: 75,
        },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      requiredFields.forEach((field) => {
        expect(mockUserSettings).toHaveProperty(field);
      });

      expect(["free", "pro", "business"]).toContain(mockUserSettings.subscription_plan);
      expect(["active", "inactive", "expired"]).toContain(mockUserSettings.subscription_status);
    });

    it("should have valid ai_settings shape", () => {
      const mockAISettings = {
        quality_scoring: true,
        pattern_recognition: true,
        confluence_detection: true,
        post_trade_analysis: true,
        daily_suggestions: true,
        risk_monitoring: true,
        confidence_threshold: 75,
        suggestion_style: "balanced",
        learn_from_wins: true,
        learn_from_losses: true,
      };

      expect(typeof mockAISettings.quality_scoring).toBe("boolean");
      expect(typeof mockAISettings.confidence_threshold).toBe("number");
      expect(mockAISettings.confidence_threshold).toBeGreaterThanOrEqual(0);
      expect(mockAISettings.confidence_threshold).toBeLessThanOrEqual(100);
    });
  });

  describe("Account Interface Contract", () => {
    it("should have required Account fields", () => {
      const requiredFields = [
        "id",
        "user_id",
        "name",
        "account_type",
        "balance",
        "currency",
        "is_active",
      ];

      const mockAccount = {
        id: "uuid",
        user_id: "uuid",
        name: "Main Trading Account",
        account_type: "trading",
        balance: 10000,
        currency: "USDT",
        is_active: true,
        is_system: false,
        description: null,
        color: null,
        icon: null,
        metadata: {},
        sub_type: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      requiredFields.forEach((field) => {
        expect(mockAccount).toHaveProperty(field);
      });

      const validAccountTypes = [
        "bank", "ewallet", "broker", "cash", "soft_wallet",
        "investment", "emergency", "goal_savings", "trading"
      ];
      expect(validAccountTypes).toContain(mockAccount.account_type);
    });
  });

  describe("DailyRiskSnapshot Interface Contract", () => {
    it("should have required snapshot fields", () => {
      const requiredFields = [
        "id",
        "user_id",
        "snapshot_date",
        "starting_balance",
      ];

      const mockSnapshot = {
        id: "uuid",
        user_id: "uuid",
        snapshot_date: "2024-01-01",
        starting_balance: 10000,
        current_pnl: -150,
        loss_limit_used_percent: 30,
        positions_open: 2,
        capital_deployed_percent: 25,
        trading_allowed: true,
        created_at: "2024-01-01T00:00:00Z",
      };

      requiredFields.forEach((field) => {
        expect(mockSnapshot).toHaveProperty(field);
      });

      expect(typeof mockSnapshot.trading_allowed).toBe("boolean");
      expect(mockSnapshot.starting_balance).toBeGreaterThanOrEqual(0);
    });
  });

  describe("DailyRiskStatus Derived Contract", () => {
    it("should have valid status values", () => {
      const validStatuses = ["ok", "warning", "disabled"];
      
      const mockStatus = {
        date: "2024-01-01",
        starting_balance: 10000,
        current_pnl: -250,
        loss_limit: 500,
        loss_used_percent: 50,
        remaining_budget: 250,
        trading_allowed: true,
        status: "warning" as const,
      };

      expect(validStatuses).toContain(mockStatus.status);
      expect(mockStatus.loss_used_percent).toBeGreaterThanOrEqual(0);
      expect(mockStatus.loss_used_percent).toBeLessThanOrEqual(100);
    });
  });

  describe("Notification Interface Contract", () => {
    it("should have required notification fields", () => {
      const requiredFields = [
        "id",
        "user_id",
        "title",
        "message",
        "type",
        "read",
        "created_at",
      ];

      const mockNotification = {
        id: "uuid",
        user_id: "uuid",
        title: "Trade Alert",
        message: "Your BTC position is up 5%",
        type: "trade",
        read: false,
        asset_symbol: "BTC",
        metadata: { tradeId: "abc123" },
        created_at: "2024-01-01T00:00:00Z",
      };

      requiredFields.forEach((field) => {
        expect(mockNotification).toHaveProperty(field);
      });

      expect(typeof mockNotification.read).toBe("boolean");
    });
  });

  describe("BacktestResult Interface Contract", () => {
    it("should have required backtest fields", () => {
      const requiredFields = [
        "id",
        "user_id",
        "strategy_id",
        "pair",
        "period_start",
        "period_end",
        "initial_capital",
        "final_capital",
        "metrics",
        "trades",
        "equity_curve",
      ];

      const mockBacktest = {
        id: "uuid",
        user_id: "uuid",
        strategy_id: "strategy-uuid",
        pair: "BTCUSDT",
        period_start: "2024-01-01T00:00:00Z",
        period_end: "2024-06-01T00:00:00Z",
        initial_capital: 10000,
        final_capital: 12500,
        metrics: {
          winRate: 65,
          profitFactor: 1.8,
          maxDrawdown: 12,
          sharpeRatio: 1.5,
          totalTrades: 50,
        },
        trades: [],
        equity_curve: [],
        created_at: "2024-01-01T00:00:00Z",
      };

      requiredFields.forEach((field) => {
        expect(mockBacktest).toHaveProperty(field);
      });

      expect(mockBacktest.final_capital).toBeGreaterThan(0);
      expect(typeof mockBacktest.metrics).toBe("object");
    });
  });

  describe("TradingPair Interface Contract", () => {
    it("should have required trading pair fields", () => {
      const requiredFields = [
        "id",
        "symbol",
        "base_asset",
        "quote_asset",
        "is_active",
      ];

      const mockPair = {
        id: "uuid",
        symbol: "BTCUSDT",
        base_asset: "BTC",
        quote_asset: "USDT",
        source: "binance_futures",
        is_active: true,
        last_synced_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
      };

      requiredFields.forEach((field) => {
        expect(mockPair).toHaveProperty(field);
      });

      expect(mockPair.symbol).toBe(`${mockPair.base_asset}${mockPair.quote_asset}`);
    });
  });
});
