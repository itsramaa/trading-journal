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
          created_at: string
          currency: string
          description: string | null
          id: string
          metadata: Json | null
          notes: string | null
          reference_id: string | null
          transaction_type: Database["public"]["Enums"]["account_transaction_type"]
          user_id: string
        }
        Insert: {
          account_id: string
          amount: number
          created_at?: string
          currency: string
          description?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          reference_id?: string | null
          transaction_type: Database["public"]["Enums"]["account_transaction_type"]
          user_id: string
        }
        Update: {
          account_id?: string
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          notes?: string | null
          reference_id?: string | null
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
          name: string
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
          name: string
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
          name?: string
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
      budget_transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string
          created_at: string
          description: string | null
          id: string
          transaction_date: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          transaction_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
        ]
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
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_fund_transactions: {
        Row: {
          account_id: string | null
          amount: number
          created_at: string
          description: string | null
          emergency_fund_id: string
          id: string
          transaction_date: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          amount: number
          created_at?: string
          description?: string | null
          emergency_fund_id: string
          id?: string
          transaction_date?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          amount?: number
          created_at?: string
          description?: string | null
          emergency_fund_id?: string
          id?: string
          transaction_date?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_fund_transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "emergency_fund_transactions_emergency_fund_id_fkey"
            columns: ["emergency_fund_id"]
            isOneToOne: false
            referencedRelation: "emergency_funds"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_funds: {
        Row: {
          created_at: string
          currency: string
          current_balance: number
          id: string
          is_active: boolean
          monthly_contribution: number
          monthly_expenses: number
          name: string
          notes: string | null
          target_months: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          monthly_contribution?: number
          monthly_expenses?: number
          name?: string
          notes?: string | null
          target_months?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          is_active?: boolean
          monthly_contribution?: number
          monthly_expenses?: number
          name?: string
          notes?: string | null
          target_months?: number
          updated_at?: string
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
          target_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      trade_entries: {
        Row: {
          confluence_score: number | null
          created_at: string
          direction: string
          entry_price: number
          entry_signal: string | null
          exit_price: number | null
          fees: number | null
          id: string
          market_condition: string | null
          notes: string | null
          pair: string
          pnl: number | null
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
          confluence_score?: number | null
          created_at?: string
          direction: string
          entry_price: number
          entry_signal?: string | null
          exit_price?: number | null
          fees?: number | null
          id?: string
          market_condition?: string | null
          notes?: string | null
          pair: string
          pnl?: number | null
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
          confluence_score?: number | null
          created_at?: string
          direction?: string
          entry_price?: number
          entry_signal?: string | null
          exit_price?: number | null
          fees?: number | null
          id?: string
          market_condition?: string | null
          notes?: string | null
          pair?: string
          pnl?: number | null
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
            referencedRelation: "trading_accounts"
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
      trading_accounts: {
        Row: {
          account_id: string
          account_number: string | null
          broker: string | null
          created_at: string
          currency: string
          current_balance: number
          id: string
          initial_balance: number
          is_active: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id: string
          account_number?: string | null
          broker?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          is_active?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string
          account_number?: string | null
          broker?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          id?: string
          initial_balance?: number
          is_active?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trading_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
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
          id: string
          is_active: boolean | null
          name: string
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          account_id: string | null
          asset_id: string
          created_at: string
          fee: number | null
          id: string
          notes: string | null
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
          id?: string
          notes?: string | null
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
          id?: string
          notes?: string | null
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
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          id?: string
          language?: string
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
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          id?: string
          language?: string
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
      account_type: "bank" | "ewallet" | "broker" | "cash" | "soft_wallet"
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
      ],
      account_type: ["bank", "ewallet", "broker", "cash", "soft_wallet"],
      app_role: ["admin", "user"],
      subscription_tier: ["free", "pro", "business"],
    },
  },
} as const
