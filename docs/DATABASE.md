# Database Schema

## Core Tables Overview

| Table | Purpose | RLS |
|-------|---------|-----|
| `accounts` | Trading/backtest accounts | ✅ |
| `trade_entries` | Individual trades (40+ fields) | ✅ |
| `trade_entry_strategies` | Trade-Strategy junction | ✅ |
| `trading_strategies` | Strategy definitions | ✅ |
| `risk_profiles` | User risk parameters | ✅ |
| `daily_risk_snapshots` | Daily risk tracking | ✅ |
| `risk_events` | Risk event audit trail | ✅ |
| `user_settings` | User preferences | ✅ |
| `account_transactions` | Deposits, withdrawals, transfers | ✅ |
| `account_balance_snapshots` | Balance history | ✅ |
| `trading_pairs` | Trading pair reference | ✅ |
| `backtest_results` | Backtest output | ✅ |
| `notifications` | User notifications | ✅ |
| `users_profile` | User profile data | ✅ |
| `feature_permissions` | Feature gating | ✅ |
| `user_roles` | User role assignment | ✅ |

## Entity Relationship Diagram

```
auth.users (Supabase Auth)
    │
    ├──► accounts (1:N)
    │       │
    │       ├──► account_transactions (1:N)
    │       └──► account_balance_snapshots (1:N)
    │
    ├──► trade_entries (1:N)
    │       │
    │       └──► trade_entry_strategies (N:M) ──► trading_strategies
    │
    ├──► trading_strategies (1:N)
    │       │
    │       └──► backtest_results (1:N)
    │
    ├──► risk_profiles (1:1)
    │
    ├──► daily_risk_snapshots (1:N)
    │
    ├──► risk_events (1:N)
    │
    ├──► user_settings (1:1)
    │
    ├──► users_profile (1:1)
    │
    ├──► notifications (1:N)
    │
    └──► user_roles (1:N)
```

## Table Details

### accounts

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  account_type account_type NOT NULL,
  sub_type TEXT,
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  is_system BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Account Types:**
```typescript
type account_type = 
  | 'trading'     // Binance trading account
  | 'broker'      // Paper trading
  | 'bank'        // Bank account
  | 'ewallet'     // E-wallet
  | 'cash'        // Cash
  | 'investment'  // Investment
  | 'emergency'   // Emergency fund
  | 'goal_savings'// Savings goal
```

### trade_entries

```sql
CREATE TABLE trade_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Core trade data
  pair TEXT NOT NULL,
  direction TEXT NOT NULL,  -- 'LONG' | 'SHORT'
  entry_price NUMERIC NOT NULL,
  exit_price NUMERIC,
  quantity NUMERIC DEFAULT 1,
  status TEXT DEFAULT 'pending',
  result TEXT,
  
  -- P&L
  pnl NUMERIC,
  realized_pnl NUMERIC,
  fees NUMERIC,
  commission NUMERIC,
  commission_asset TEXT,
  
  -- Binance sync
  binance_trade_id TEXT,
  binance_order_id BIGINT,
  source TEXT,  -- 'binance' | 'paper' | 'manual'
  
  -- Trade plan
  stop_loss NUMERIC,
  take_profit NUMERIC,
  entry_signal TEXT,
  chart_timeframe TEXT,
  
  -- Timestamps
  trade_date DATE DEFAULT CURRENT_DATE,
  entry_datetime TIMESTAMPTZ,
  exit_datetime TIMESTAMPTZ,
  
  -- AI & Analysis
  ai_quality_score NUMERIC,
  ai_confidence NUMERIC,
  confluence_score NUMERIC,
  confluences_met JSONB,
  pre_trade_validation JSONB,
  post_trade_analysis JSONB,
  
  -- Context
  market_condition TEXT,
  market_context JSONB,
  emotional_state TEXT,
  
  -- Media & Notes
  screenshots JSONB,
  notes TEXT,
  tags TEXT[],
  
  -- Relations
  trading_account_id UUID REFERENCES accounts(id),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Key Fields:**
- `binance_trade_id`: Link ke Binance transaction
- `source`: Origin of trade data
- `market_context`: JSONB dengan sentiment, fear/greed, events
- `post_trade_analysis`: AI-generated analysis

### trading_strategies

```sql
CREATE TABLE trading_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  
  -- Rules (JSONB)
  entry_rules JSONB,
  exit_rules JSONB,
  
  -- Configuration
  timeframe TEXT,
  market_type TEXT,
  valid_pairs TEXT[],
  min_confluences INTEGER,
  min_rr NUMERIC,
  
  -- Metadata
  color TEXT,
  tags TEXT[],
  source TEXT,
  source_url TEXT,
  difficulty_level TEXT,
  
  -- Sharing
  is_shared BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  clone_count INTEGER DEFAULT 0,
  last_cloned_at TIMESTAMPTZ,
  
  -- Scoring
  validation_score NUMERIC,
  automation_score NUMERIC,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  status TEXT,
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### risk_profiles

```sql
CREATE TABLE risk_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  
  risk_per_trade_percent NUMERIC DEFAULT 2,
  max_daily_loss_percent NUMERIC DEFAULT 5,
  max_weekly_drawdown_percent NUMERIC DEFAULT 10,
  max_position_size_percent NUMERIC DEFAULT 40,
  max_correlated_exposure NUMERIC DEFAULT 0.75,
  max_concurrent_positions INTEGER DEFAULT 3,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### daily_risk_snapshots

```sql
CREATE TABLE daily_risk_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  snapshot_date DATE DEFAULT CURRENT_DATE,
  starting_balance NUMERIC NOT NULL,
  current_pnl NUMERIC,
  loss_limit_used_percent NUMERIC,
  positions_open INTEGER,
  capital_deployed_percent NUMERIC,
  trading_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### risk_events

```sql
CREATE TABLE risk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,  -- 'warning_70' | 'warning_90' | 'limit_reached' | 'trading_disabled' | 'trading_enabled'
  event_date DATE DEFAULT CURRENT_DATE,
  trigger_value NUMERIC NOT NULL,
  threshold_value NUMERIC NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## RLS Policies

All tables implement Row-Level Security dengan base policy:

```sql
-- Base policy pattern
CREATE POLICY "Users can only access own data"
ON table_name
FOR ALL
USING (auth.uid() = user_id);
```

Exceptions:
- `trading_strategies` dengan `is_shared = true` dapat diakses via `share_token`
- `trading_pairs` public read untuk semua authenticated users

## Database Functions

```sql
-- Generate unique share token
CREATE FUNCTION generate_share_token() 
RETURNS TEXT AS $$
  SELECT encode(gen_random_bytes(16), 'hex');
$$ LANGUAGE sql;

-- Get user subscription tier
CREATE FUNCTION get_user_subscription(_user_id UUID)
RETURNS subscription_tier;

-- Check feature permission
CREATE FUNCTION has_permission(_feature_key TEXT, _user_id UUID)
RETURNS BOOLEAN;

-- Check user role
CREATE FUNCTION has_role(_role app_role, _user_id UUID)
RETURNS BOOLEAN;

-- Check subscription level
CREATE FUNCTION has_subscription(_min_tier subscription_tier, _user_id UUID)
RETURNS BOOLEAN;

-- Check if admin
CREATE FUNCTION is_admin(_user_id UUID)
RETURNS BOOLEAN;
```

## Enum Types

```sql
-- Account types
CREATE TYPE account_type AS ENUM (
  'bank', 'ewallet', 'broker', 'cash', 
  'soft_wallet', 'investment', 'emergency', 
  'goal_savings', 'trading'
);

-- Transaction types
CREATE TYPE account_transaction_type AS ENUM (
  'deposit', 'withdrawal', 'transfer_in', 
  'transfer_out', 'expense', 'income', 'transfer'
);

-- User roles
CREATE TYPE app_role AS ENUM ('admin', 'user');

-- Subscription tiers
CREATE TYPE subscription_tier AS ENUM ('free', 'pro', 'business');
```

## Realtime Subscriptions

Tables dengan realtime enabled:
- `accounts`
- `account_transactions`
- `trade_entries`
- `trading_strategies`

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE account_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE trade_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE trading_strategies;
```
