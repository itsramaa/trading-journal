-- =====================================================
-- TIER 1 Database Integrity Hardening
-- Add CHECK constraints and modify unique index
-- =====================================================

-- 1. Add direction CHECK constraint (case-insensitive for compatibility)
ALTER TABLE trade_entries 
ADD CONSTRAINT trade_entries_direction_check 
CHECK (direction IN ('LONG', 'SHORT', 'long', 'short'));

-- 2. Add source CHECK constraint
ALTER TABLE trade_entries 
ADD CONSTRAINT trade_entries_source_check 
CHECK (source IS NULL OR source IN ('binance', 'manual', 'paper', 'import'));

-- 3. Drop existing global unique index on binance_trade_id
DROP INDEX IF EXISTS idx_trade_entries_binance_trade_id;

-- 4. Create per-user unique index for binance_trade_id
CREATE UNIQUE INDEX idx_trade_entries_binance_trade_per_user 
ON public.trade_entries (user_id, binance_trade_id) 
WHERE (binance_trade_id IS NOT NULL);

-- 5. Add amount constraint for account_transactions
ALTER TABLE account_transactions 
ADD CONSTRAINT account_transactions_amount_positive 
CHECK (amount > 0);

-- 6. Add risk profile percentage constraints
ALTER TABLE risk_profiles 
ADD CONSTRAINT risk_profiles_risk_per_trade_check 
CHECK (risk_per_trade_percent IS NULL OR (risk_per_trade_percent > 0 AND risk_per_trade_percent <= 100));

ALTER TABLE risk_profiles 
ADD CONSTRAINT risk_profiles_max_daily_loss_check 
CHECK (max_daily_loss_percent IS NULL OR (max_daily_loss_percent > 0 AND max_daily_loss_percent <= 100));

ALTER TABLE risk_profiles 
ADD CONSTRAINT risk_profiles_max_weekly_drawdown_check 
CHECK (max_weekly_drawdown_percent IS NULL OR (max_weekly_drawdown_percent > 0 AND max_weekly_drawdown_percent <= 100));

ALTER TABLE risk_profiles 
ADD CONSTRAINT risk_profiles_max_position_size_check 
CHECK (max_position_size_percent IS NULL OR (max_position_size_percent > 0 AND max_position_size_percent <= 100));

ALTER TABLE risk_profiles 
ADD CONSTRAINT risk_profiles_max_correlated_exposure_check 
CHECK (max_correlated_exposure IS NULL OR (max_correlated_exposure > 0 AND max_correlated_exposure <= 1));

ALTER TABLE risk_profiles 
ADD CONSTRAINT risk_profiles_max_concurrent_positions_check 
CHECK (max_concurrent_positions IS NULL OR max_concurrent_positions > 0);