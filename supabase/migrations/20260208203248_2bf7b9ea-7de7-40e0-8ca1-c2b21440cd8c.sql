-- ============================================================================
-- ADD RETENTION PERIOD SETTING TO USER_SETTINGS
-- Options: 180 (6 months), 365 (1 year), 730 (2 years), NULL (never delete)
-- ============================================================================

ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS trade_retention_days INTEGER DEFAULT 365;

-- Add comment for documentation
COMMENT ON COLUMN public.user_settings.trade_retention_days IS 
  'Number of days to retain Binance trades. Options: 180 (6mo), 365 (1yr), 730 (2yr), NULL (keep forever)';

-- ============================================================================
-- UPDATE cleanup_old_trades TO RESPECT PER-USER RETENTION SETTINGS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.cleanup_old_trades_all_users()
RETURNS TABLE(user_id UUID, trades_deleted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_deleted INTEGER;
  v_cutoff_date TIMESTAMPTZ;
BEGIN
  -- Loop through all users with retention settings
  FOR v_user IN 
    SELECT us.user_id, COALESCE(us.trade_retention_days, 365) as retention_days
    FROM user_settings us
    WHERE us.trade_retention_days IS NOT NULL
  LOOP
    v_cutoff_date := now() - (v_user.retention_days || ' days')::INTERVAL;
    
    -- Soft-delete old Binance trades for this user
    UPDATE trade_entries
    SET deleted_at = now()
    WHERE trade_entries.user_id = v_user.user_id
      AND source = 'binance'
      AND trade_date < v_cutoff_date
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    
    IF v_deleted > 0 THEN
      RAISE NOTICE 'Cleaned up % old trades for user % (retention: % days)', 
        v_deleted, v_user.user_id, v_user.retention_days;
    END IF;
    
    user_id := v_user.user_id;
    trades_deleted := v_deleted;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- ============================================================================
-- EDGE FUNCTION FOR CRON TO CALL (wrapper for cleanup)
-- ============================================================================
-- Note: The actual cron setup will be done via SQL insert (not migration)
-- because it contains project-specific URLs