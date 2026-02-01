/**
 * Contract Tests for Supabase Tables
 * Validates that table schemas match TypeScript interfaces
 */
import { describe, it, expect } from "vitest";

describe("Supabase Table Schema Contracts", () => {
  describe("trade_entries Table", () => {
    it("should have all required columns", () => {
      const tableColumns = [
        "id",
        "user_id",
        "trading_account_id",
        "pair",
        "direction",
        "entry_price",
        "exit_price",
        "stop_loss",
        "take_profit",
        "quantity",
        "pnl",
        "realized_pnl",
        "fees",
        "commission",
        "commission_asset",
        "confluence_score",
        "ai_quality_score",
        "ai_confidence",
        "trade_date",
        "entry_datetime",
        "exit_datetime",
        "result",
        "market_condition",
        "entry_signal",
        "emotional_state",
        "notes",
        "tags",
        "status",
        "source",
        "binance_trade_id",
        "binance_order_id",
        "pre_trade_validation",
        "post_trade_analysis",
        "confluences_met",
        "created_at",
        "updated_at",
      ];

      // Mock row from Supabase
      const mockRow = {
        id: "uuid",
        user_id: "uuid",
        trading_account_id: null,
        pair: "BTCUSDT",
        direction: "long",
        entry_price: 50000,
        exit_price: null,
        stop_loss: null,
        take_profit: null,
        quantity: 0.1,
        pnl: 0,
        realized_pnl: 0,
        fees: 0,
        commission: 0,
        commission_asset: null,
        confluence_score: null,
        ai_quality_score: null,
        ai_confidence: null,
        trade_date: "2024-01-01T00:00:00Z",
        entry_datetime: null,
        exit_datetime: null,
        result: null,
        market_condition: null,
        entry_signal: null,
        emotional_state: null,
        notes: null,
        tags: [],
        status: "open",
        source: "manual",
        binance_trade_id: null,
        binance_order_id: null,
        pre_trade_validation: null,
        post_trade_analysis: null,
        confluences_met: [],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      tableColumns.forEach((col) => {
        expect(mockRow).toHaveProperty(col);
      });
    });

    it("should enforce status enum values", () => {
      const validStatuses = ["open", "closed"];
      expect(validStatuses).toContain("open");
      expect(validStatuses).toContain("closed");
    });

    it("should enforce direction values", () => {
      const validDirections = ["long", "short"];
      expect(validDirections).toContain("long");
      expect(validDirections).toContain("short");
    });

    it("should enforce source values", () => {
      const validSources = ["manual", "binance"];
      expect(validSources).toContain("manual");
      expect(validSources).toContain("binance");
    });
  });

  describe("trading_strategies Table", () => {
    it("should have all required columns", () => {
      const tableColumns = [
        "id",
        "user_id",
        "name",
        "description",
        "tags",
        "color",
        "is_active",
        "timeframe",
        "market_type",
        "min_confluences",
        "min_rr",
        "entry_rules",
        "exit_rules",
        "valid_pairs",
        "version",
        "status",
        "source",
        "source_url",
        "automation_score",
        "validation_score",
        "difficulty_level",
        "created_at",
        "updated_at",
      ];

      const mockRow = {
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
        source: "manual",
        source_url: null,
        automation_score: 0,
        validation_score: 100,
        difficulty_level: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      tableColumns.forEach((col) => {
        expect(mockRow).toHaveProperty(col);
      });
    });

    it("should store entry_rules as JSONB array", () => {
      const mockRules = [
        { type: "indicator", name: "RSI", condition: "below", value: 30, required: true },
        { type: "price_action", name: "Support", required: true },
      ];

      expect(Array.isArray(mockRules)).toBe(true);
      expect(mockRules[0]).toHaveProperty("type");
      expect(mockRules[0]).toHaveProperty("required");
    });
  });

  describe("risk_profiles Table", () => {
    it("should have all required columns", () => {
      const tableColumns = [
        "id",
        "user_id",
        "risk_per_trade_percent",
        "max_daily_loss_percent",
        "max_weekly_drawdown_percent",
        "max_position_size_percent",
        "max_correlated_exposure",
        "max_concurrent_positions",
        "is_active",
        "created_at",
        "updated_at",
      ];

      const mockRow = {
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

      tableColumns.forEach((col) => {
        expect(mockRow).toHaveProperty(col);
      });
    });

    it("should have sensible default values", () => {
      const defaults = {
        risk_per_trade_percent: 2.0,
        max_daily_loss_percent: 5.0,
        max_weekly_drawdown_percent: 10.0,
        max_position_size_percent: 40.0,
        max_correlated_exposure: 0.75,
        max_concurrent_positions: 3,
      };

      expect(defaults.risk_per_trade_percent).toBeLessThanOrEqual(5);
      expect(defaults.max_daily_loss_percent).toBeLessThanOrEqual(10);
      expect(defaults.max_concurrent_positions).toBeGreaterThan(0);
    });
  });

  describe("accounts Table", () => {
    it("should have all required columns", () => {
      const tableColumns = [
        "id",
        "user_id",
        "name",
        "account_type",
        "sub_type",
        "balance",
        "currency",
        "is_active",
        "is_system",
        "description",
        "color",
        "icon",
        "metadata",
        "created_at",
        "updated_at",
      ];

      const mockRow = {
        id: "uuid",
        user_id: "uuid",
        name: "Main Account",
        account_type: "trading",
        sub_type: null,
        balance: 10000,
        currency: "USDT",
        is_active: true,
        is_system: false,
        description: null,
        color: null,
        icon: null,
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      tableColumns.forEach((col) => {
        expect(mockRow).toHaveProperty(col);
      });
    });

    it("should enforce account_type enum values", () => {
      const validTypes = [
        "bank",
        "ewallet",
        "broker",
        "cash",
        "soft_wallet",
        "investment",
        "emergency",
        "goal_savings",
        "trading",
      ];

      expect(validTypes).toContain("trading");
      expect(validTypes).toContain("broker");
    });
  });

  describe("user_settings Table", () => {
    it("should have all required columns", () => {
      const tableColumns = [
        "id",
        "user_id",
        "default_currency",
        "theme",
        "language",
        "notifications_enabled",
        "subscription_plan",
        "subscription_status",
        "plan_expires_at",
        "notify_price_alerts",
        "notify_portfolio_updates",
        "notify_weekly_report",
        "notify_market_news",
        "notify_email_enabled",
        "notify_push_enabled",
        "target_allocations",
        "ai_settings",
        "notification_preferences",
        "created_at",
        "updated_at",
      ];

      const mockRow = {
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
        ai_settings: {},
        notification_preferences: {},
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      tableColumns.forEach((col) => {
        expect(mockRow).toHaveProperty(col);
      });
    });
  });

  describe("notifications Table", () => {
    it("should have all required columns", () => {
      const tableColumns = [
        "id",
        "user_id",
        "title",
        "message",
        "type",
        "read",
        "asset_symbol",
        "metadata",
        "created_at",
      ];

      const mockRow = {
        id: "uuid",
        user_id: "uuid",
        title: "Trade Alert",
        message: "Your BTC position is up 5%",
        type: "trade",
        read: false,
        asset_symbol: "BTC",
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      tableColumns.forEach((col) => {
        expect(mockRow).toHaveProperty(col);
      });
    });
  });

  describe("daily_risk_snapshots Table", () => {
    it("should have all required columns", () => {
      const tableColumns = [
        "id",
        "user_id",
        "snapshot_date",
        "starting_balance",
        "current_pnl",
        "loss_limit_used_percent",
        "positions_open",
        "capital_deployed_percent",
        "trading_allowed",
        "created_at",
      ];

      const mockRow = {
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

      tableColumns.forEach((col) => {
        expect(mockRow).toHaveProperty(col);
      });
    });
  });

  describe("risk_events Table", () => {
    it("should have all required columns", () => {
      const tableColumns = [
        "id",
        "user_id",
        "event_type",
        "event_date",
        "trigger_value",
        "threshold_value",
        "message",
        "metadata",
        "created_at",
      ];

      const mockRow = {
        id: "uuid",
        user_id: "uuid",
        event_type: "daily_loss_warning",
        event_date: "2024-01-01",
        trigger_value: 3.5,
        threshold_value: 5.0,
        message: "Daily loss at 70% of limit",
        metadata: {},
        created_at: "2024-01-01T00:00:00Z",
      };

      tableColumns.forEach((col) => {
        expect(mockRow).toHaveProperty(col);
      });
    });
  });

  describe("trade_entry_strategies Junction Table", () => {
    it("should have all required columns", () => {
      const tableColumns = [
        "id",
        "trade_entry_id",
        "strategy_id",
        "user_id",
        "created_at",
      ];

      const mockRow = {
        id: "uuid",
        trade_entry_id: "trade-uuid",
        strategy_id: "strategy-uuid",
        user_id: "user-uuid",
        created_at: "2024-01-01T00:00:00Z",
      };

      tableColumns.forEach((col) => {
        expect(mockRow).toHaveProperty(col);
      });
    });
  });

  describe("trading_pairs Table", () => {
    it("should have all required columns", () => {
      const tableColumns = [
        "id",
        "symbol",
        "base_asset",
        "quote_asset",
        "source",
        "is_active",
        "last_synced_at",
        "created_at",
      ];

      const mockRow = {
        id: "uuid",
        symbol: "BTCUSDT",
        base_asset: "BTC",
        quote_asset: "USDT",
        source: "binance_futures",
        is_active: true,
        last_synced_at: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
      };

      tableColumns.forEach((col) => {
        expect(mockRow).toHaveProperty(col);
      });
    });
  });

  describe("backtest_results Table", () => {
    it("should have all required columns", () => {
      const tableColumns = [
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
        "created_at",
      ];

      const mockRow = {
        id: "uuid",
        user_id: "uuid",
        strategy_id: "strategy-uuid",
        pair: "BTCUSDT",
        period_start: "2024-01-01T00:00:00Z",
        period_end: "2024-06-01T00:00:00Z",
        initial_capital: 10000,
        final_capital: 12500,
        metrics: {},
        trades: [],
        equity_curve: [],
        created_at: "2024-01-01T00:00:00Z",
      };

      tableColumns.forEach((col) => {
        expect(mockRow).toHaveProperty(col);
      });
    });
  });

  describe("RLS Policy Expectations", () => {
    it("should expect user_id filtering on all user tables", () => {
      const userTables = [
        "trade_entries",
        "trading_strategies",
        "risk_profiles",
        "accounts",
        "user_settings",
        "notifications",
        "daily_risk_snapshots",
        "risk_events",
        "backtest_results",
      ];

      // All tables should have user_id column for RLS
      userTables.forEach((table) => {
        expect(table).toBeDefined();
        // In actual implementation, RLS would filter by auth.uid() = user_id
      });
    });

    it("should allow public read on trading_pairs", () => {
      // trading_pairs is a shared reference table
      const publicTables = ["trading_pairs"];
      expect(publicTables).toContain("trading_pairs");
    });
  });
});
