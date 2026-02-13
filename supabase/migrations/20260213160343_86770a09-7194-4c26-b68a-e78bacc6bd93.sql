-- Phase 6: Add auth.uid() validation to SECURITY DEFINER functions
-- Prevents users from manipulating p_user_id to access other users' data

-- Fix check_rate_limit: validate caller matches p_user_id
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id text,
  p_category text,
  p_exchange text DEFAULT 'binance',
  p_weight integer DEFAULT 1
)
RETURNS TABLE(allowed boolean, current_weight integer, max_weight integer, reset_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_weight integer := 1200;
  v_window_minutes integer := 1;
  v_current_weight integer := 0;
  v_window_start timestamptz;
  v_window_end timestamptz;
BEGIN
  -- Security: ensure caller can only check their own rate limit
  IF p_user_id != auth.uid()::text THEN
    RAISE EXCEPTION 'Permission denied: cannot check rate limit for another user';
  END IF;

  v_window_start := date_trunc('minute', now());
  v_window_end := v_window_start + (v_window_minutes || ' minutes')::interval;

  SELECT COALESCE(arl.weight_used, 0) INTO v_current_weight
  FROM api_rate_limits arl
  WHERE arl.user_id = p_user_id
    AND arl.endpoint_category = p_category
    AND arl.exchange = p_exchange
    AND arl.window_start = v_window_start;

  IF v_current_weight + p_weight > v_max_weight THEN
    RETURN QUERY SELECT false, v_current_weight, v_max_weight, v_window_end;
    RETURN;
  END IF;

  INSERT INTO api_rate_limits (user_id, endpoint_category, exchange, weight_used, window_start, window_end, last_request_at)
  VALUES (p_user_id, p_category, p_exchange, p_weight, v_window_start, v_window_end, now())
  ON CONFLICT (user_id, endpoint_category, exchange, window_start)
  DO UPDATE SET weight_used = api_rate_limits.weight_used + p_weight, last_request_at = now();

  RETURN QUERY SELECT true, v_current_weight + p_weight, v_max_weight, v_window_end;
END;
$$;

-- Fix increment_sync_quota: validate caller matches p_user_id
CREATE OR REPLACE FUNCTION public.increment_sync_quota(p_user_id text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  -- Security: ensure caller can only increment their own quota
  IF p_user_id != auth.uid()::text THEN
    RAISE EXCEPTION 'Permission denied: cannot modify quota for another user';
  END IF;

  INSERT INTO sync_quota_usage (user_id, sync_date, sync_count, last_sync_at)
  VALUES (p_user_id, CURRENT_DATE, 1, now())
  ON CONFLICT (user_id, sync_date)
  DO UPDATE SET sync_count = sync_quota_usage.sync_count + 1, last_sync_at = now()
  RETURNING sync_count INTO v_count;

  RETURN v_count;
END;
$$;

-- Fix check_sync_quota: validate caller matches p_user_id
CREATE OR REPLACE FUNCTION public.check_sync_quota(p_user_id text)
RETURNS TABLE(allowed boolean, current_count integer, max_quota integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_max integer;
BEGIN
  -- Security: ensure caller can only check their own quota
  IF p_user_id != auth.uid()::text THEN
    RAISE EXCEPTION 'Permission denied: cannot check quota for another user';
  END IF;

  SELECT COALESCE(us.binance_daily_sync_quota, 5) INTO v_max
  FROM user_settings us WHERE us.user_id = p_user_id;

  IF v_max IS NULL THEN v_max := 5; END IF;

  SELECT COALESCE(squ.sync_count, 0) INTO v_count
  FROM sync_quota_usage squ
  WHERE squ.user_id = p_user_id AND squ.sync_date = CURRENT_DATE;

  IF v_count IS NULL THEN v_count := 0; END IF;

  RETURN QUERY SELECT (v_count < v_max), v_count, v_max;
END;
$$;