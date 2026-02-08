-- ============================================================================
-- DAILY SYNC QUOTA TRACKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sync_quota_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  sync_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sync_count INTEGER NOT NULL DEFAULT 1,
  last_sync_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_user_daily_quota UNIQUE (user_id, sync_date)
);

-- Enable RLS
ALTER TABLE public.sync_quota_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own quota usage"
  ON public.sync_quota_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quota usage"
  ON public.sync_quota_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quota usage"
  ON public.sync_quota_usage FOR UPDATE
  USING (auth.uid() = user_id);

-- Index for efficient lookup
CREATE INDEX idx_sync_quota_user_date ON public.sync_quota_usage(user_id, sync_date);

-- ============================================================================
-- FUNCTION: Check and increment sync quota
-- Returns: { allowed: boolean, current_count: int, max_quota: int }
-- ============================================================================
CREATE OR REPLACE FUNCTION public.check_sync_quota(p_user_id UUID)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, max_quota INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_quota INTEGER;
  v_current_count INTEGER;
BEGIN
  -- Get user's max quota from settings (default 10)
  SELECT COALESCE(binance_daily_sync_quota, 10) INTO v_max_quota
  FROM user_settings
  WHERE user_id = p_user_id;
  
  IF v_max_quota IS NULL THEN
    v_max_quota := 10;
  END IF;
  
  -- Get current usage for today
  SELECT COALESCE(squ.sync_count, 0) INTO v_current_count
  FROM sync_quota_usage squ
  WHERE squ.user_id = p_user_id AND squ.sync_date = CURRENT_DATE;
  
  IF v_current_count IS NULL THEN
    v_current_count := 0;
  END IF;
  
  RETURN QUERY SELECT 
    (v_current_count < v_max_quota),
    v_current_count,
    v_max_quota;
END;
$$;

-- ============================================================================
-- FUNCTION: Increment sync quota usage
-- ============================================================================
CREATE OR REPLACE FUNCTION public.increment_sync_quota(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  INSERT INTO sync_quota_usage (user_id, sync_date, sync_count, last_sync_at)
  VALUES (p_user_id, CURRENT_DATE, 1, now())
  ON CONFLICT (user_id, sync_date)
  DO UPDATE SET 
    sync_count = sync_quota_usage.sync_count + 1,
    last_sync_at = now()
  RETURNING sync_count INTO v_new_count;
  
  RETURN v_new_count;
END;
$$;

-- ============================================================================
-- FUNCTION: Cleanup old trades (retention policy - 1 year)
-- Returns number of deleted records
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_trades(p_retention_days INTEGER DEFAULT 365)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  v_cutoff_date := now() - (p_retention_days || ' days')::INTERVAL;
  
  -- Soft-delete old Binance trades (keep manual trades)
  UPDATE trade_entries
  SET deleted_at = now()
  WHERE source = 'binance'
    AND trade_date < v_cutoff_date
    AND deleted_at IS NULL;
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  -- Log cleanup
  RAISE NOTICE 'Cleaned up % old Binance trades older than %', v_deleted, v_cutoff_date;
  
  RETURN v_deleted;
END;
$$;

-- ============================================================================
-- FUNCTION: Cleanup old sync quota records (housekeeping)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_sync_quotas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM sync_quota_usage
  WHERE sync_date < CURRENT_DATE - INTERVAL '30 days';
  
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;