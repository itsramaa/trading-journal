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
      account_balance_discrepancies: {
        Row: {
          account_id: string
          actual_balance: number
          created_at: string | null
          detected_at: string | null
          discrepancy: number
          expected_balance: number
          id: string
          resolution_method: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          actual_balance: number
          created_at?: string | null
          detected_at?: string | null
          discrepancy: number
          expected_balance: number
          id?: string
          resolution_method?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          actual_balance?: number
          created_at?: string | null
          detected_at?: string | null
          discrepancy?: number
          expected_balance?: number
          id?: string
          resolution_method?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_balance_discrepancies_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_balance_snapshots: {
        Row: {
          account_id: string | null
          balance: number
          created_at: string
          id: string
          metadata: Json | null
          realized_pnl_today: number | null
          snapshot_date: string
          source: string | null
          unrealized_pnl: number | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          balance?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          realized_pnl_today?: number | null
          snapshot_date: string
          source?: string | null
          unrealized_pnl?: number | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          balance?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          realized_pnl_today?: number | null
          snapshot_date?: string
          source?: string | null
          unrealized_pnl?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_balance_snapshots_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
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
          deleted_at: string | null
          description: string | null
          exchange: string | null
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
          deleted_at?: string | null
          description?: string | null
          exchange?: string | null
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
          deleted_at?: string | null
          description?: string | null
          exchange?: string | null
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
      api_rate_limits: {
        Row: {
          created_at: string
          endpoint_category: string
          exchange: string
          id: string
          last_request_at: string
          user_id: string
          weight_used: number
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint_category: string
          exchange?: string
          id?: string
          last_request_at?: string
          user_id: string
          weight_used?: number
          window_end?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint_category?: string
          exchange?: string
          id?: string
          last_request_at?: string
          user_id?: string
          weight_used?: number
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      backtest_results: {
        Row: {
          accuracy_notes: string | null
          assumptions: Json | null
          created_at: string
          equity_curve: Json
          final_capital: number
          id: string
          initial_capital: number
          metrics: Json
          pair: string
          period_end: string
          period_start: string
          simulation_version: string | null
          strategy_id: string | null
          trades: Json
          user_id: string
        }
        Insert: {
          accuracy_notes?: string | null
          assumptions?: Json | null
          created_at?: string
          equity_curve?: Json
          final_capital?: number
          id?: string
          initial_capital?: number
          metrics?: Json
          pair: string
          period_end: string
          period_start: string
          simulation_version?: string | null
          strategy_id?: string | null
          trades?: Json
          user_id: string
        }
        Update: {
          accuracy_notes?: string | null
          assumptions?: Json | null
          created_at?: string
          equity_curve?: Json
          final_capital?: number
          id?: string
          initial_capital?: number
          metrics?: Json
          pair?: string
          period_end?: string
          period_start?: string
          simulation_version?: string | null
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
      exchange_credentials: {
        Row: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at: string
          exchange: string
          id: string
          is_active: boolean
          is_valid: boolean | null
          label: string | null
          last_validated_at: string | null
          permissions: Json | null
          updated_at: string
          user_id: string
          validation_error: string | null
        }
        Insert: {
          api_key_encrypted: string
          api_secret_encrypted: string
          created_at?: string
          exchange?: string
          id?: string
          is_active?: boolean
          is_valid?: boolean | null
          label?: string | null
          last_validated_at?: string | null
          permissions?: Json | null
          updated_at?: string
          user_id: string
          validation_error?: string | null
        }
        Update: {
          api_key_encrypted?: string
          api_secret_encrypted?: string
          created_at?: string
          exchange?: string
          id?: string
          is_active?: boolean
          is_valid?: boolean | null
          label?: string | null
          last_validated_at?: string | null
          permissions?: Json | null
          updated_at?: string
          user_id?: string
          validation_error?: string | null
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          is_active: boolean
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          is_active?: boolean
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          is_active?: boolean
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
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
      sync_quota_usage: {
        Row: {
          created_at: string
          id: string
          last_sync_at: string
          sync_count: number
          sync_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_sync_at?: string
          sync_count?: number
          sync_date?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_sync_at?: string
          sync_count?: number
          sync_date?: string
          user_id?: string
        }
        Relationships: []
      }
      trade_entries: {
        Row: {
          ai_analysis_generated_at: string | null
          ai_confidence: number | null
          ai_model_version: string | null
          ai_quality_score: number | null
          bias_timeframe: string | null
          binance_order_id: number | null
          binance_trade_id: string | null
          chart_timeframe: string | null
          commission: number | null
          commission_asset: string | null
          confluence_score: number | null
          confluences_met: Json | null
          created_at: string
          deleted_at: string | null
          direction: string
          emotional_state: string | null
          entry_datetime: string | null
          entry_order_type: string | null
          entry_price: number
          entry_signal: string | null
          execution_timeframe: string | null
          exit_datetime: string | null
          exit_order_type: string | null
          exit_price: number | null
          fees: number | null
          funding_fees: number | null
          hold_time_minutes: number | null
          id: string
          is_maker: boolean | null
          lesson_learned: string | null
          leverage: number | null
          margin_type: string | null
          market_condition: string | null
          market_context: Json | null
          max_adverse_excursion: number | null
          notes: string | null
          pair: string
          pnl: number | null
          post_trade_analysis: Json | null
          pre_trade_validation: Json | null
          precision_timeframe: string | null
          quantity: number
          r_multiple: number | null
          realized_pnl: number | null
          result: string | null
          rule_compliance: Json | null
          screenshots: Json | null
          session: string | null
          source: string | null
          status: string
          stop_loss: number | null
          strategy_snapshot: Json | null
          tags: string[] | null
          take_profit: number | null
          trade_date: string
          trade_mode: string | null
          trade_rating: string | null
          trade_state: string
          trade_style: string | null
          trading_account_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_analysis_generated_at?: string | null
          ai_confidence?: number | null
          ai_model_version?: string | null
          ai_quality_score?: number | null
          bias_timeframe?: string | null
          binance_order_id?: number | null
          binance_trade_id?: string | null
          chart_timeframe?: string | null
          commission?: number | null
          commission_asset?: string | null
          confluence_score?: number | null
          confluences_met?: Json | null
          created_at?: string
          deleted_at?: string | null
          direction: string
          emotional_state?: string | null
          entry_datetime?: string | null
          entry_order_type?: string | null
          entry_price: number
          entry_signal?: string | null
          execution_timeframe?: string | null
          exit_datetime?: string | null
          exit_order_type?: string | null
          exit_price?: number | null
          fees?: number | null
          funding_fees?: number | null
          hold_time_minutes?: number | null
          id?: string
          is_maker?: boolean | null
          lesson_learned?: string | null
          leverage?: number | null
          margin_type?: string | null
          market_condition?: string | null
          market_context?: Json | null
          max_adverse_excursion?: number | null
          notes?: string | null
          pair: string
          pnl?: number | null
          post_trade_analysis?: Json | null
          pre_trade_validation?: Json | null
          precision_timeframe?: string | null
          quantity?: number
          r_multiple?: number | null
          realized_pnl?: number | null
          result?: string | null
          rule_compliance?: Json | null
          screenshots?: Json | null
          session?: string | null
          source?: string | null
          status?: string
          stop_loss?: number | null
          strategy_snapshot?: Json | null
          tags?: string[] | null
          take_profit?: number | null
          trade_date?: string
          trade_mode?: string | null
          trade_rating?: string | null
          trade_state?: string
          trade_style?: string | null
          trading_account_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_analysis_generated_at?: string | null
          ai_confidence?: number | null
          ai_model_version?: string | null
          ai_quality_score?: number | null
          bias_timeframe?: string | null
          binance_order_id?: number | null
          binance_trade_id?: string | null
          chart_timeframe?: string | null
          commission?: number | null
          commission_asset?: string | null
          confluence_score?: number | null
          confluences_met?: Json | null
          created_at?: string
          deleted_at?: string | null
          direction?: string
          emotional_state?: string | null
          entry_datetime?: string | null
          entry_order_type?: string | null
          entry_price?: number
          entry_signal?: string | null
          execution_timeframe?: string | null
          exit_datetime?: string | null
          exit_order_type?: string | null
          exit_price?: number | null
          fees?: number | null
          funding_fees?: number | null
          hold_time_minutes?: number | null
          id?: string
          is_maker?: boolean | null
          lesson_learned?: string | null
          leverage?: number | null
          margin_type?: string | null
          market_condition?: string | null
          market_context?: Json | null
          max_adverse_excursion?: number | null
          notes?: string | null
          pair?: string
          pnl?: number | null
          post_trade_analysis?: Json | null
          pre_trade_validation?: Json | null
          precision_timeframe?: string | null
          quantity?: number
          r_multiple?: number | null
          realized_pnl?: number | null
          result?: string | null
          rule_compliance?: Json | null
          screenshots?: Json | null
          session?: string | null
          source?: string | null
          status?: string
          stop_loss?: number | null
          strategy_snapshot?: Json | null
          tags?: string[] | null
          take_profit?: number | null
          trade_date?: string
          trade_mode?: string | null
          trade_rating?: string | null
          trade_state?: string
          trade_style?: string | null
          trading_account_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
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
      trading_strategies: {
        Row: {
          automation_score: number | null
          clone_count: number | null
          color: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          difficulty_level: string | null
          entry_rules: Json | null
          exit_rules: Json | null
          higher_timeframe: string | null
          id: string
          is_active: boolean | null
          is_shared: boolean | null
          last_cloned_at: string | null
          lower_timeframe: string | null
          market_type: string | null
          methodology: string | null
          min_confluences: number | null
          min_rr: number | null
          name: string
          session_preference: string[] | null
          share_token: string | null
          source: string | null
          source_url: string | null
          status: string | null
          tags: string[] | null
          timeframe: string | null
          trading_style: string | null
          updated_at: string
          user_id: string
          valid_pairs: string[] | null
          validation_score: number | null
          version: number | null
        }
        Insert: {
          automation_score?: number | null
          clone_count?: number | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          entry_rules?: Json | null
          exit_rules?: Json | null
          higher_timeframe?: string | null
          id?: string
          is_active?: boolean | null
          is_shared?: boolean | null
          last_cloned_at?: string | null
          lower_timeframe?: string | null
          market_type?: string | null
          methodology?: string | null
          min_confluences?: number | null
          min_rr?: number | null
          name: string
          session_preference?: string[] | null
          share_token?: string | null
          source?: string | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          timeframe?: string | null
          trading_style?: string | null
          updated_at?: string
          user_id: string
          valid_pairs?: string[] | null
          validation_score?: number | null
          version?: number | null
        }
        Update: {
          automation_score?: number | null
          clone_count?: number | null
          color?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          difficulty_level?: string | null
          entry_rules?: Json | null
          exit_rules?: Json | null
          higher_timeframe?: string | null
          id?: string
          is_active?: boolean | null
          is_shared?: boolean | null
          last_cloned_at?: string | null
          lower_timeframe?: string | null
          market_type?: string | null
          methodology?: string | null
          min_confluences?: number | null
          min_rr?: number | null
          name?: string
          session_preference?: string[] | null
          share_token?: string | null
          source?: string | null
          source_url?: string | null
          status?: string | null
          tags?: string[] | null
          timeframe?: string | null
          trading_style?: string | null
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
          active_trade_mode: string
          active_trading_style: string
          ai_settings: Json | null
          binance_daily_sync_quota: number | null
          created_at: string
          default_currency: string
          default_trading_account_id: string | null
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
          trade_retention_days: number | null
          updated_at: string
          use_binance_history: boolean | null
          user_id: string
        }
        Insert: {
          active_trade_mode?: string
          active_trading_style?: string
          ai_settings?: Json | null
          binance_daily_sync_quota?: number | null
          created_at?: string
          default_currency?: string
          default_trading_account_id?: string | null
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
          trade_retention_days?: number | null
          updated_at?: string
          use_binance_history?: boolean | null
          user_id: string
        }
        Update: {
          active_trade_mode?: string
          active_trading_style?: string
          ai_settings?: Json | null
          binance_daily_sync_quota?: number | null
          created_at?: string
          default_currency?: string
          default_trading_account_id?: string | null
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
          trade_retention_days?: number | null
          updated_at?: string
          use_binance_history?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_default_trading_account_id_fkey"
            columns: ["default_trading_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
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
      batch_insert_trades: { Args: { p_trades: Json }; Returns: Json }
      check_rate_limit: {
        Args: {
          p_category: string
          p_exchange: string
          p_user_id: string
          p_weight?: number
        }
        Returns: {
          allowed: boolean
          current_weight: number
          max_weight: number
          reset_at: string
        }[]
      }
      check_sync_quota: {
        Args: { p_user_id: string }
        Returns: {
          allowed: boolean
          current_count: number
          max_quota: number
        }[]
      }
      cleanup_old_rate_limits: { Args: never; Returns: number }
      cleanup_old_sync_quotas: { Args: never; Returns: number }
      cleanup_old_trades: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      cleanup_old_trades_all_users: {
        Args: never
        Returns: {
          trades_deleted: number
          user_id: string
        }[]
      }
      delete_exchange_credential: {
        Args: { p_credential_id: string }
        Returns: boolean
      }
      generate_share_token: { Args: never; Returns: string }
      get_account_level_stats: {
        Args: { p_status?: string; p_trade_mode?: string; p_user_id: string }
        Returns: {
          account_exchange: string
          account_id: string
          account_name: string
          avg_pnl_per_trade: number
          loss_count: number
          profit_factor: number
          total_pnl_gross: number
          total_pnl_net: number
          total_trades: number
          win_count: number
          win_rate: number
        }[]
      }
      get_credential_status: {
        Args: { p_exchange?: string }
        Returns: {
          api_key_masked: string
          created_at: string
          exchange: string
          id: string
          is_valid: boolean
          label: string
          last_validated_at: string
          permissions: Json
        }[]
      }
      get_decrypted_credential: {
        Args: { p_exchange?: string; p_user_id: string }
        Returns: {
          api_key: string
          api_secret: string
          id: string
          is_valid: boolean
          label: string
          last_validated_at: string
          permissions: Json
        }[]
      }
      get_deleted_trades: {
        Args: { p_since: string; p_user_id: string }
        Returns: {
          created_at: string
          deleted_at: string
          direction: string
          entry_price: number
          exit_price: number
          fees: number
          id: string
          pair: string
          pnl: number
          quantity: number
          realized_pnl: number
          result: string
          source: string
          status: string
          stop_loss: number
          take_profit: number
          trade_date: string
          updated_at: string
          user_id: string
        }[]
      }
      get_rate_limit_status: {
        Args: { p_exchange?: string }
        Returns: {
          endpoint_category: string
          max_weight: number
          reset_at: string
          usage_percent: number
          weight_used: number
        }[]
      }
      get_trade_stats:
        | {
            Args: {
              p_directions?: string[]
              p_end_date?: string
              p_pairs?: string[]
              p_sessions?: string[]
              p_source?: string
              p_start_date?: string
              p_status?: string
              p_strategy_ids?: string[]
              p_user_id: string
            }
            Returns: {
              avg_loss: number
              avg_pnl_per_trade: number
              avg_win: number
              breakeven_count: number
              loss_count: number
              profit_factor: number
              total_commission: number
              total_fees: number
              total_funding_fees: number
              total_pnl_gross: number
              total_pnl_net: number
              total_trades: number
              win_count: number
              win_rate: number
            }[]
          }
        | {
            Args: {
              p_directions?: string[]
              p_end_date?: string
              p_pairs?: string[]
              p_sessions?: string[]
              p_source?: string
              p_start_date?: string
              p_status?: string
              p_strategy_ids?: string[]
              p_trade_mode?: string
              p_user_id: string
            }
            Returns: {
              avg_loss: number
              avg_pnl_per_trade: number
              avg_win: number
              breakeven_count: number
              loss_count: number
              profit_factor: number
              total_commission: number
              total_fees: number
              total_funding_fees: number
              total_pnl_gross: number
              total_pnl_net: number
              total_trades: number
              win_count: number
              win_rate: number
            }[]
          }
        | {
            Args: {
              p_account_id?: string
              p_directions?: string[]
              p_end_date?: string
              p_pairs?: string[]
              p_sessions?: string[]
              p_source?: string
              p_start_date?: string
              p_status?: string
              p_strategy_ids?: string[]
              p_trade_mode?: string
              p_user_id: string
            }
            Returns: {
              avg_loss: number
              avg_pnl_per_trade: number
              avg_win: number
              breakeven_count: number
              loss_count: number
              profit_factor: number
              total_commission: number
              total_fees: number
              total_funding_fees: number
              total_pnl_gross: number
              total_pnl_net: number
              total_trades: number
              win_count: number
              win_rate: number
            }[]
          }
      get_trading_session: { Args: { trade_time: string }; Returns: string }
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
      increment_clone_count: {
        Args: { p_strategy_id: string }
        Returns: undefined
      }
      increment_sync_quota: { Args: { p_user_id: string }; Returns: number }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      permanent_delete_old_trades: { Args: never; Returns: number }
      restore_trade_entry: { Args: { p_trade_id: string }; Returns: boolean }
      save_exchange_credential: {
        Args: {
          p_api_key: string
          p_api_secret: string
          p_exchange?: string
          p_label?: string
        }
        Returns: string
      }
      update_credential_validation: {
        Args: {
          p_credential_id: string
          p_error?: string
          p_is_valid: boolean
          p_permissions?: Json
        }
        Returns: boolean
      }
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
