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
      account_links: {
        Row: {
          child_account_id: string
          created_at: string
          id: string
          link_type: string
          parent_account_id: string
          user_id: string
        }
        Insert: {
          child_account_id: string
          created_at?: string
          id?: string
          link_type?: string
          parent_account_id: string
          user_id: string
        }
        Update: {
          child_account_id?: string
          created_at?: string
          id?: string
          link_type?: string
          parent_account_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_links_child_account_id_fkey"
            columns: ["child_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_links_parent_account_id_fkey"
            columns: ["parent_account_id"]
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
            foreignKeyName: "account_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
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
            foreignKeyName: "account_transactions_portfolio_transaction_id_fkey"
            columns: ["portfolio_transaction_id"]
            isOneToOne: false
            referencedRelation: "portfolio_transactions"
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
      assets: {
        Row: {
          alpha_symbol: string | null
          asset_type: string
          coingecko_id: string | null
          created_at: string
          current_price: number | null
          exchange: string | null
          fcs_symbol: string | null
          finnhub_symbol: string | null
          id: string
          logo_url: string | null
          name: string
          portfolio_id: string | null
          sector: string | null
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          alpha_symbol?: string | null
          asset_type: string
          coingecko_id?: string | null
          created_at?: string
          current_price?: number | null
          exchange?: string | null
          fcs_symbol?: string | null
          finnhub_symbol?: string | null
          id?: string
          logo_url?: string | null
          name: string
          portfolio_id?: string | null
          sector?: string | null
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          alpha_symbol?: string | null
          asset_type?: string
          coingecko_id?: string | null
          created_at?: string
          current_price?: number | null
          exchange?: string | null
          fcs_symbol?: string | null
          finnhub_symbol?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          portfolio_id?: string | null
          sector?: string | null
          symbol?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          account_id: string | null
          budgeted_amount: number
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          period: string
          spent_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          budgeted_amount?: number
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          period?: string
          spent_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          budgeted_amount?: number
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          period?: string
          spent_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
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
      debts: {
        Row: {
          created_at: string
          current_balance: number
          debt_type: string
          due_date: number | null
          id: string
          interest_rate: number
          is_active: boolean
          minimum_payment: number
          monthly_payment: number
          name: string
          notes: string | null
          original_balance: number
          payment_account_id: string | null
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_balance: number
          debt_type?: string
          due_date?: number | null
          id?: string
          interest_rate?: number
          is_active?: boolean
          minimum_payment?: number
          monthly_payment?: number
          name: string
          notes?: string | null
          original_balance: number
          payment_account_id?: string | null
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_balance?: number
          debt_type?: string
          due_date?: number | null
          id?: string
          interest_rate?: number
          is_active?: boolean
          minimum_payment?: number
          monthly_payment?: number
          name?: string
          notes?: string | null
          original_balance?: number
          payment_account_id?: string | null
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_payment_account_id_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
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
      financial_goals: {
        Row: {
          color: string | null
          created_at: string
          current_amount: number
          deadline: string
          icon: string
          id: string
          is_active: boolean
          monthly_contribution: number
          name: string
          notes: string | null
          priority: string
          target_account_id: string | null
          target_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          current_amount?: number
          deadline: string
          icon?: string
          id?: string
          is_active?: boolean
          monthly_contribution?: number
          name: string
          notes?: string | null
          priority?: string
          target_account_id?: string | null
          target_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          current_amount?: number
          deadline?: string
          icon?: string
          id?: string
          is_active?: boolean
          monthly_contribution?: number
          name?: string
          notes?: string | null
          priority?: string
          target_account_id?: string | null
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_goals_target_account_id_fkey"
            columns: ["target_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      fire_settings: {
        Row: {
          created_at: string
          current_age: number
          custom_fire_number: number | null
          expected_annual_return: number
          id: string
          inflation_rate: number
          monthly_expenses: number
          monthly_income: number
          safe_withdrawal_rate: number
          target_retirement_age: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_age?: number
          custom_fire_number?: number | null
          expected_annual_return?: number
          id?: string
          inflation_rate?: number
          monthly_expenses?: number
          monthly_income?: number
          safe_withdrawal_rate?: number
          target_retirement_age?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_age?: number
          custom_fire_number?: number | null
          expected_annual_return?: number
          id?: string
          inflation_rate?: number
          monthly_expenses?: number
          monthly_income?: number
          safe_withdrawal_rate?: number
          target_retirement_age?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      holdings: {
        Row: {
          asset_id: string
          average_cost: number
          created_at: string
          id: string
          portfolio_id: string
          quantity: number
          total_cost: number
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_id: string
          average_cost?: number
          created_at?: string
          id?: string
          portfolio_id: string
          quantity?: number
          total_cost?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_id?: string
          average_cost?: number
          created_at?: string
          id?: string
          portfolio_id?: string
          quantity?: number
          total_cost?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "holdings_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
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
      portfolio_history: {
        Row: {
          created_at: string
          currency: string
          gain_loss_percentage: number
          id: string
          portfolio_id: string | null
          recorded_at: string
          total_cost: number
          total_gain_loss: number
          total_value: number
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          gain_loss_percentage: number
          id?: string
          portfolio_id?: string | null
          recorded_at?: string
          total_cost: number
          total_gain_loss: number
          total_value: number
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          gain_loss_percentage?: number
          id?: string
          portfolio_id?: string | null
          recorded_at?: string
          total_cost?: number
          total_gain_loss?: number
          total_value?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_history_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_transactions: {
        Row: {
          account_id: string | null
          asset_id: string
          created_at: string
          fee: number | null
          holding_id: string | null
          id: string
          notes: string | null
          payment_account_id: string | null
          portfolio_id: string | null
          price_per_unit: number
          quantity: number
          total_amount: number
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          asset_id: string
          created_at?: string
          fee?: number | null
          holding_id?: string | null
          id?: string
          notes?: string | null
          payment_account_id?: string | null
          portfolio_id?: string | null
          price_per_unit: number
          quantity: number
          total_amount: number
          transaction_date?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          asset_id?: string
          created_at?: string
          fee?: number | null
          holding_id?: string | null
          id?: string
          notes?: string | null
          payment_account_id?: string | null
          portfolio_id?: string | null
          price_per_unit?: number
          quantity?: number
          total_amount?: number
          transaction_date?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portfolio_tx_holding_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "portfolio_tx_payment_account_fkey"
            columns: ["payment_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      price_alerts: {
        Row: {
          asset_id: string
          condition: string
          created_at: string
          id: string
          is_active: boolean
          symbol: string
          target_price: number
          triggered_at: string | null
          user_id: string
        }
        Insert: {
          asset_id: string
          condition: string
          created_at?: string
          id?: string
          is_active?: boolean
          symbol: string
          target_price: number
          triggered_at?: string | null
          user_id: string
        }
        Update: {
          asset_id?: string
          condition?: string
          created_at?: string
          id?: string
          is_active?: boolean
          symbol?: string
          target_price?: number
          triggered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_alerts_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      price_cache: {
        Row: {
          created_at: string
          currency: string
          id: string
          last_updated: string
          market_cap: number | null
          price: number
          price_change_24h: number | null
          price_change_percentage_24h: number | null
          symbol: string
          volume_24h: number | null
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          last_updated?: string
          market_cap?: number | null
          price: number
          price_change_24h?: number | null
          price_change_percentage_24h?: number | null
          symbol: string
          volume_24h?: number | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          last_updated?: string
          market_cap?: number | null
          price?: number
          price_change_24h?: number | null
          price_change_percentage_24h?: number | null
          symbol?: string
          volume_24h?: number | null
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
          color: string | null
          created_at: string
          description: string | null
          entry_rules: Json | null
          exit_rules: Json | null
          id: string
          is_active: boolean | null
          market_type: string | null
          min_confluences: number | null
          min_rr: number | null
          name: string
          status: string | null
          tags: string[] | null
          timeframe: string | null
          updated_at: string
          user_id: string
          valid_pairs: string[] | null
          version: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          entry_rules?: Json | null
          exit_rules?: Json | null
          id?: string
          is_active?: boolean | null
          market_type?: string | null
          min_confluences?: number | null
          min_rr?: number | null
          name: string
          status?: string | null
          tags?: string[] | null
          timeframe?: string | null
          updated_at?: string
          user_id: string
          valid_pairs?: string[] | null
          version?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          entry_rules?: Json | null
          exit_rules?: Json | null
          id?: string
          is_active?: boolean | null
          market_type?: string | null
          min_confluences?: number | null
          min_rr?: number | null
          name?: string
          status?: string | null
          tags?: string[] | null
          timeframe?: string | null
          updated_at?: string
          user_id?: string
          valid_pairs?: string[] | null
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
      record_portfolio_snapshot: {
        Args: { p_portfolio_id: string }
        Returns: undefined
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
