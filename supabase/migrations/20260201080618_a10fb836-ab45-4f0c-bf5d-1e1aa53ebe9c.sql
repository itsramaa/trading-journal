-- Phase 2: Soft Delete, Pagination Index, and AI Versioning

-- 1. Add deleted_at columns for soft delete
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Add AI versioning columns to trade_entries
ALTER TABLE trade_entries 
ADD COLUMN IF NOT EXISTS ai_model_version TEXT,
ADD COLUMN IF NOT EXISTS ai_analysis_generated_at TIMESTAMPTZ;

-- 3. Create partial indexes for efficient soft delete filtering
CREATE INDEX IF NOT EXISTS idx_trade_entries_active 
ON trade_entries (user_id, trade_date DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_trading_strategies_active 
ON trading_strategies (user_id, created_at DESC) 
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_accounts_active 
ON accounts (user_id, created_at DESC) 
WHERE deleted_at IS NULL;

-- 4. Create index for cursor-based pagination (composite for stable ordering)
CREATE INDEX IF NOT EXISTS idx_trade_entries_pagination 
ON trade_entries (user_id, trade_date DESC, id DESC)
WHERE deleted_at IS NULL;

-- 5. Update RLS policies to exclude soft-deleted records
-- trade_entries SELECT policy
DROP POLICY IF EXISTS "Users can view their own trade entries" ON trade_entries;
CREATE POLICY "Users can view their own trade entries" 
ON trade_entries FOR SELECT 
USING (auth.uid() = user_id AND deleted_at IS NULL);

-- trading_strategies: Update existing shared policy
DROP POLICY IF EXISTS "Authenticated users can view shared strategies" ON trading_strategies;
CREATE POLICY "Authenticated users can view shared strategies" 
ON trading_strategies FOR SELECT 
USING (
  (deleted_at IS NULL) AND 
  ((is_shared = true AND share_token IS NOT NULL) OR user_id = auth.uid())
);

-- accounts SELECT policy
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
CREATE POLICY "Users can view their own accounts" 
ON accounts FOR SELECT 
USING (auth.uid() = user_id AND deleted_at IS NULL);

-- 6. Create function for atomic clone count increment
CREATE OR REPLACE FUNCTION increment_clone_count(p_strategy_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE trading_strategies 
  SET clone_count = COALESCE(clone_count, 0) + 1, 
      last_cloned_at = NOW()
  WHERE id = p_strategy_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;