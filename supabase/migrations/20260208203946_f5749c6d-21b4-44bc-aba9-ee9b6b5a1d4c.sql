-- ============================================================================
-- Database Migration: Add restore function and cleanup notification trigger
-- FIXED: Drop existing function first to change return type
-- ============================================================================

-- 1. Drop existing cleanup function to change return type
DROP FUNCTION IF EXISTS public.cleanup_old_trades_all_users();

-- 2. Create RPC function to fetch soft-deleted trades (bypasses RLS filter)
CREATE OR REPLACE FUNCTION public.get_deleted_trades(
  p_user_id UUID,
  p_since TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  pair TEXT,
  direction TEXT,
  entry_price NUMERIC,
  exit_price NUMERIC,
  stop_loss NUMERIC,
  take_profit NUMERIC,
  quantity NUMERIC,
  pnl NUMERIC,
  fees NUMERIC,
  trade_date DATE,
  result TEXT,
  status TEXT,
  realized_pnl NUMERIC,
  source TEXT,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return trades that were soft-deleted within the recovery window
  RETURN QUERY
  SELECT 
    te.id,
    te.user_id,
    te.pair,
    te.direction,
    te.entry_price,
    te.exit_price,
    te.stop_loss,
    te.take_profit,
    te.quantity,
    te.pnl,
    te.fees,
    te.trade_date,
    te.result,
    te.status,
    te.realized_pnl,
    te.source,
    te.deleted_at,
    te.created_at,
    te.updated_at
  FROM trade_entries te
  WHERE te.user_id = p_user_id
    AND te.deleted_at IS NOT NULL
    AND te.deleted_at >= p_since
  ORDER BY te.deleted_at DESC;
END;
$$;

-- 3. Recreate cleanup function with new return type
CREATE OR REPLACE FUNCTION public.cleanup_old_trades_all_users()
RETURNS TABLE (user_id UUID, trades_deleted BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user RECORD;
  v_cutoff_date TIMESTAMPTZ;
  v_deleted_count BIGINT;
BEGIN
  FOR v_user IN 
    SELECT us.user_id, COALESCE(us.trade_retention_days, 365) as retention_days
    FROM user_settings us
    WHERE us.trade_retention_days IS NOT NULL
  LOOP
    -- Calculate cutoff date based on user's retention setting
    v_cutoff_date := now() - (v_user.retention_days || ' days')::INTERVAL;
    
    -- Soft delete old Binance trades (set deleted_at instead of hard delete)
    WITH deleted AS (
      UPDATE trade_entries
      SET deleted_at = now()
      WHERE trade_entries.user_id = v_user.user_id
        AND source = 'binance'
        AND trade_date < v_cutoff_date
        AND deleted_at IS NULL
      RETURNING id
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;
    
    -- Only return rows where trades were actually deleted
    IF v_deleted_count > 0 THEN
      user_id := v_user.user_id;
      trades_deleted := v_deleted_count;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$;

-- 4. Create permanent delete function for grace period expiry
CREATE OR REPLACE FUNCTION public.permanent_delete_old_trades()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Permanently delete trades that have been soft-deleted for more than 30 days
  WITH deleted AS (
    DELETE FROM trade_entries
    WHERE deleted_at IS NOT NULL
      AND deleted_at < now() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*)::INTEGER INTO v_deleted_count FROM deleted;
  
  RETURN v_deleted_count;
END;
$$;

-- 5. Create restore function that bypasses RLS
CREATE OR REPLACE FUNCTION public.restore_trade_entry(p_trade_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Get the current user's ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Update the trade to restore it (only if it belongs to the current user)
  UPDATE trade_entries
  SET deleted_at = NULL
  WHERE id = p_trade_id
    AND user_id = v_user_id
    AND deleted_at IS NOT NULL;
  
  -- Check if any row was updated
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Trade not found or not authorized';
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 6. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_deleted_trades(UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_trade_entry(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_trades_all_users() TO service_role;
GRANT EXECUTE ON FUNCTION public.permanent_delete_old_trades() TO service_role;