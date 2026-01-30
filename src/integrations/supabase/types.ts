export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_transactions: {
        Row: {
          account_id: string
          amount: number
          category_id: string | null
          counterparty_account_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          notes: string | null
          portfolio_transaction_id: string | null
          reference_id: string | null
          sub_type: string | null
          trade_entry_id: string | null
          transaction_date: string | null
          transaction_type: Database["public"]["Enums"]["account_transaction_type"]
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          category_id?: string | null
          counterparty_account_id?: string | null
          created_at?: string
          currency: string
          description?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          portfolio_transaction_id?: string | null
          reference_id?: string | null
          sub_type?: string | null
          trade_entry_id?: string | null
          transaction_date?: string | null
          transaction_type: Database["public"]["Enums"]["account_transaction_type"]
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          category_id?: string | null
          counterparty_account_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          portfolio_transaction_id?: string | null
          reference_id?: string | null
          sub_type?: string | null
          trade_entry_id?: string | null
          transaction_date?: string | null
          transaction_type?: Database["public"]["Enums"]["account_transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transactions_counterparty_account_id_fkey"
            columns: ["counterparty_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_transactions_trade_entry_id_fkey"
            columns: ["trade_entry_id"]
            isOneToOne: false
            referencedRelation: "trade_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          color: string | null
          created_at: string
          currency: string
          description: string | null
          icon: string | null
          id: string
          is_active: boolean
          is_system: boolean
          metadata: Json | null
          name: string
          sub_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          balance?: number
          color?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          metadata?: Json | null
          name: string
          sub_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          color?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean
          is_system?: boolean
          metadata?: Json | null
          name?: string
          sub_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      backtest_results: {
        Row: {
          created_at: string
          equity_curve: Json
          final_capital: number
          id: string
          initial_capital: number
          metrics: Json
          pair: string
          period_end: string
          period_start: string
          strategy_id: string | null
          trades: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          equity_curve?: Json
          final_capital?: number
          id?: string
          initial_capital?: number
          metrics?: Json
          pair: string
          period_end: string
          period_start: string
          strategy_id?: string | null
          trades?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          equity_curve?: Json
          final_capital?: number
          id?: string
          initial_capital?: number
          metrics?: Json
          pair?: string
          period_end?: string
          period_start?: string
          strategy_id?: string | null
          trades?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backtest_results_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "trading_strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_risk_snapshots: {
        Row: {
          capital_deployed_percent: number | null
          created_at: string | null
          current_pnl: number | null
          id: string
          loss_limit_used_percent: number | null
          positions_open: number | null
          snapshot_date: string
          starting_balance: number
          trading_allowed: boolean | null
          user_id: string
        }
        Insert: {
          capital_deployed_percent?: number | null
          created_at?: string | null
          current_pnl?: number | null
          id?: string
          loss_limit_used_percent?: number | null
          positions_open?: number | null
          snapshot_date?: string
          starting_balance: number
          trading_allowed?: boolean | null
          user_id: string
        }
        Update: {
          capital_deployed_percent?: number | null
          created_at?: string | null
          current_pnl?: number | null
          id?: string
          loss_limit_used_percent?: number | null
          positions_open?: number | null
          snapshot_date?: string
          starting_balance?: number
          trading_allowed?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      feature_permissions: {
        Row: {
          admin_only: boolean
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          min_subscription: Database["public"]["Enums"]["subscription_tier"]
        }
        Insert: {
          admin_only?: boolean
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          min_subscription?: Database["public"]["Enums"]["subscription_tier"]
        }
        Update: {
          admin_only?: boolean
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          min_subscription?: Database["public"]["Enums"]["subscription_tier"]
        }
        Relationships: []
      }
      notifications: {
        Row: {
          asset_symbol: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          asset_symbol?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          asset_symbol?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      risk_events: {
        Row: {
          created_at: string | null
          event_date: string
          event_type: string
          id: string
          message: string
          metadata: Json | null
          threshold_value: number
          trigger_value: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_date?: string
          event_type: string
          id?: string
          message: string
          metadata?: Json | null
          threshold_value: number
          trigger_value: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_date?: string
          event_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          threshold_value?: number
          trigger_value?: number
          user_id?: string
        }
        Relationships: []
      }
      risk_profiles: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          max_concurrent_positions: number | null
          max_correlated_exposure: number | null
          max_daily_loss_percent: number | null
          max_position_size_percent: number | null
          max_weekly_drawdown_percent: number | null
          risk_per_trade_percent: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent_positions?: number | null
          max_correlated_exposure?: number | null
          max_daily_loss_percent?: number | null
          max_position_size_percent?: number | null
          max_weekly_drawdown_percent?: number | null
          risk_per_trade_percent?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          max_concurrent_positions?: number | null
          max_correlated_exposure?: number | null
          max_daily_loss_percent?: number | null
          max_position_size_percent?: number | null
          max_weekly_drawdown_percent?: number | null
          risk_per_trade_percent?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      trade_entries: {
        Row: {
          ai_confidence: number | null
          ai_quality_score: number | null
          binance_order_id: number | null
          binance_trade_id: string | null
          commission: number | null
          commission_asset: string | null
          confluence_score: number | null
          confluences_met: Json | null
          created_at: string
          direction: string
          emotional_state: string | null
          entry_datetime: string | null
          entry_price: number
          entry_signal: string | null
          exit_datetime: string | null
          exit_price: number | null
          fees: number | null
          id: string
          market_condition: string | null
          notes: string | null
          pair: string
          pnl: number | null
          post_trade_analysis: Json | null
          pre_trade_validation: Json | null
          quantity: number
          realized_pnl: number | null
          result: string | null
          session_id: string | null
          source: string | null
          status: string
          stop_loss: number | null
          tags: string[] | null
          take_profit: number | null
          trade_date: string
          trading_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_quality_score?: number | null
          binance_order_id?: number | null
          binance_trade_id?: string | null
          commission?: number | null
          commission_asset?: string | null
          confluence_score?: number | null
          confluences_met?: Json | null
          created_at?: string
          direction: string
          emotional_state?: string | null
          entry_datetime?: string | null
          entry_price: number
          entry_signal?: string | null
          exit_datetime?: string | null
          exit_price?: number | null
          fees?: number | null
          id?: string
          market_condition?: string | null
          notes?: string | null
          pair: string
          pnl?: number | null
          post_trade_analysis?: Json | null
          pre_trade_validation?: Json | null
          quantity?: number
          realized_pnl?: number | null
          result?: string | null
          session_id?: string | null
          source?: string | null
          status?: string
          stop_loss?: number | null
          tags?: string[] | null
          take_profit?: number | null
          trade_date?: string
          trading_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_quality_score?: number | null
          binance_order_id?: number | null
          binance_trade_id?: string | null
          commission?: number | null
          commission_asset?: string | null
          confluence_score?: number | null
          confluences_met?: Json | null
          created_at?: string
          direction?: string
          emotional_state?: string | null
          entry_datetime?: string | null
          entry_price?: number
          entry_signal?: string | null
          exit_datetime?: string | null
          exit_price?: number | null
          fees?: number | null
          id?: string
          market_condition?: string | null
          notes?: string | null
          pair?: string
          pnl?: number | null
          post_trade_analysis?: Json | null
          pre_trade_validation?: Json | null
          quantity?: number
          realized_pnl?: number | null
          result?: string | null
          session_id?: string | null
          source?: string | null
          status?: string
          stop_loss?: number | null
          tags?: string[] | null
          take_profit?: number | null
          trade_date?: string
          trading_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_entries_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "trading_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_entries_trading_account_id_fkey"
            columns: ["trading_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_entry_strategies: {
        Row: {
          created_at: string
          id: string
          strategy_id: string
          trade_entry_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          strategy_id: string
          trade_entry_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          strategy_id?: string
          trade_entry_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trade_entry_strategies_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "trading_strategies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_entry_strategies_trade_entry_id_fkey"
            columns: ["trade_entry_id"]
            isOneToOne: false
            referencedRelation: "trade_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      trading_pairs: {
        Row: {
          base_asset: string
          created_at: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          quote_asset: string
          source: string | null
          symbol: string
        }
        Insert: {
          base_asset: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          quote_asset: string
          source?: string | null
          symbol: string
        }
        Update: {
          base_asset?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          quote_asset?: string
          source?: string | null
          symbol?: string
        }
        Relationships: []
      }
      trading_sessions: {
        Row: {
          created_at: string
          end_time: string | null
          id: string
          is_active: boolean
          market_condition: string | null
          mood: string
          notes: string | null
          pnl: number
          rating: number
          session_date: string
          start_time: string
          tags: string[] | null
          trades_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_active?: boolean
          market_condition?: string | null
          mood?: string
          notes?: string | null
          pnl?: number
          rating?: number
          session_date?: string
          start_time: string
          tags?: string[] | null
          trades_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_time?: string | null
          id?: string
          is_active?: boolean
          market_condition?: string | null
          mood?: string
          notes?: string | null
          pnl?: number
          rating?: number
          session_date?: string
          start_time?: string
          tags?: string[] | null
          trades_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trading_strategies: {
        Row: {
          automation_score: number | null
          color: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          entry_rules: Json | null
          exit_rules: Json | null
          id: string
          is_active: boolean | null
          market_type: string | null
          min_confluences: number | null
          min_rr: number | null
          name: string
          source: string | null
          source_url: string | null
          status: string | null
          tags: string[] | null
          timeframe: string | null
          updated_at: string
          user_id: string
          valid_pairs: string[] | null
          validation_score: number | null
          version: number | null
        }
        Insert: {
          automation_score?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          entry_rules?: Json | null
          exit_rules?: Json | null
          id?: string
          is_active?: boolean | null
          market_type?: string | null
          min_confluences?: number | null
          min_rr?: number | null
          name: string
          source?: string | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          timeframe?: string | null
          updated_at?: string
          user_id: string
          valid_pairs?: string[] | null
          validation_score?: number | null
          version?: number | null
        }
        Update: {
          automation_score?: number | null
          color?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          entry_rules?: Json | null
          exit_rules?: Json | null
          id?: string
          is_active?: boolean | null
          market_type?: string | null
          min_confluences?: number | null
          min_rr?: number | null
          name?: string
          source?: string | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          timeframe?: string | null
          updated_at?: string
          user_id?: string
          valid_pairs?: string[] | null
          validation_score?: number | null
          version?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          ai_settings: Json | null
          created_at: string
          default_currency: string
          id: string
          language: string
          notification_preferences: Json | null
          notifications_enabled: boolean
          notify_email_enabled: boolean
          notify_market_news: boolean
          notify_portfolio_updates: boolean
          notify_price_alerts: boolean
          notify_push_enabled: boolean
          notify_weekly_report: boolean
          plan_expires_at: string | null
          subscription_plan: string
          subscription_status: string
          target_allocations: Json | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_settings?: Json | null
          created_at?: string
          default_currency?: string
          id?: string
          language?: string
          notification_preferences?: Json | null
          notifications_enabled?: boolean
          notify_email_enabled?: boolean
          notify_market_news?: boolean
          notify_portfolio_updates?: boolean
          notify_price_alerts?: boolean
          notify_push_enabled?: boolean
          notify_weekly_report?: boolean
          plan_expires_at?: string | null
          subscription_plan?: string
          subscription_status?: string
          target_allocations?: Json | null
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_settings?: Json | null
          created_at?: string
          default_currency?: string
          id?: string
          language?: string
          notification_preferences?: Json | null
          notifications_enabled?: boolean
          notify_email_enabled?: boolean
          notify_market_news?: boolean
          notify_portfolio_updates?: boolean
          notify_price_alerts?: boolean
          notify_push_enabled?: boolean
          notify_weekly_report?: boolean
          plan_expires_at?: string | null
          subscription_plan?: string
          subscription_status?: string
          target_allocations?: Json | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      users_profile: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          preferred_currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_currency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_currency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_subscription: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["subscription_tier"]
      }
      has_permission: {
        Args: { _feature_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_subscription: {
        Args: {
          _min_tier: Database["public"]["Enums"]["subscription_tier"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      account_transaction_type:
        | "deposit"
        | "withdrawal"
        | "transfer_in"
        | "transfer_out"
        | "expense"
        | "income"
        | "transfer"
      account_type:
        | "bank"
        | "ewallet"
        | "broker"
        | "cash"
        | "soft_wallet"
        | "investment"
        | "emergency"
        | "goal_savings"
        | "trading"
      app_role: "admin" | "user"
      subscription_tier: "free" | "pro" | "business"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_transaction_type: [
        "deposit",
        "withdrawal",
        "transfer_in",
        "transfer_out",
        "expense",
        "income",
        "transfer",
      ],
      account_type: [
        "bank",
        "ewallet",
        "broker",
        "cash",
        "soft_wallet",
        "investment",
        "emergency",
        "goal_savings",
        "trading",
      ],
      app_role: ["admin", "user"],
      subscription_tier: ["free", "pro", "business"],
    },
  },
} as const
