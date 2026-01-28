-- Phase 1: Foundation - Database Schema Updates

-- 1. Enhance trading_strategies table with new columns per Markdown spec
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS timeframe text;
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS market_type text DEFAULT 'spot';
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS entry_rules jsonb DEFAULT '[]'::jsonb;
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS exit_rules jsonb DEFAULT '[]'::jsonb;
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS valid_pairs text[] DEFAULT ARRAY['BTC', 'ETH', 'BNB'];
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS min_confluences integer DEFAULT 4;
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS min_rr decimal(5,2) DEFAULT 1.5;
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. Create risk_profiles table for risk management
CREATE TABLE IF NOT EXISTS risk_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  risk_per_trade_percent decimal(5,2) DEFAULT 2.0,
  max_daily_loss_percent decimal(5,2) DEFAULT 5.0,
  max_weekly_drawdown_percent decimal(5,2) DEFAULT 10.0,
  max_position_size_percent decimal(5,2) DEFAULT 40.0,
  max_correlated_exposure decimal(5,2) DEFAULT 0.75,
  max_concurrent_positions integer DEFAULT 3,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on risk_profiles
ALTER TABLE risk_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for risk_profiles
CREATE POLICY "Users can view their own risk profiles"
  ON risk_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own risk profiles"
  ON risk_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk profiles"
  ON risk_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risk profiles"
  ON risk_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Create daily_risk_snapshots table for daily loss tracking
CREATE TABLE IF NOT EXISTS daily_risk_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  starting_balance decimal(24,8) NOT NULL,
  current_pnl decimal(24,8) DEFAULT 0,
  loss_limit_used_percent decimal(5,2) DEFAULT 0,
  positions_open integer DEFAULT 0,
  capital_deployed_percent decimal(5,2) DEFAULT 0,
  trading_allowed boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, snapshot_date)
);

-- Enable RLS on daily_risk_snapshots
ALTER TABLE daily_risk_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily_risk_snapshots
CREATE POLICY "Users can view their own risk snapshots"
  ON daily_risk_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own risk snapshots"
  ON daily_risk_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk snapshots"
  ON daily_risk_snapshots FOR UPDATE
  USING (auth.uid() = user_id);

-- 4. Enhance trade_entries table with AI and validation fields
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS confluences_met jsonb DEFAULT '[]'::jsonb;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS ai_quality_score decimal(3,1);
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS ai_confidence decimal(5,2);
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS emotional_state text;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS pre_trade_validation jsonb;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS post_trade_analysis jsonb;

-- 5. Create trigger to update updated_at on risk_profiles
CREATE OR REPLACE FUNCTION update_risk_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_risk_profiles_updated_at
  BEFORE UPDATE ON risk_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_risk_profiles_updated_at();