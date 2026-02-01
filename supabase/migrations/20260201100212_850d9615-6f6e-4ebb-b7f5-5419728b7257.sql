-- =============================================================
-- Phase 2: Vault Encryption Functions for Exchange Credentials
-- Phase 3: Rate Limit Tracking Table and Functions
-- =============================================================

-- Ensure vault extension is enabled
CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;

-- =============================================================
-- PART 1: Vault Encrypt/Decrypt Functions
-- =============================================================

-- Function to encrypt and store credentials securely
CREATE OR REPLACE FUNCTION public.save_exchange_credential(
  p_api_key TEXT,
  p_api_secret TEXT,
  p_exchange TEXT DEFAULT 'binance',
  p_label TEXT DEFAULT 'Main Account'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_credential_id UUID;
  v_encrypted_key TEXT;
  v_encrypted_secret TEXT;
BEGIN
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  -- Deactivate existing credentials for this exchange
  UPDATE exchange_credentials 
  SET is_active = false, updated_at = now()
  WHERE user_id = v_user_id 
    AND exchange = p_exchange 
    AND is_active = true;
  
  -- Encrypt API key and secret using pgcrypto (base64 encode for storage)
  v_encrypted_key := encode(convert_to(p_api_key, 'UTF8'), 'base64');
  v_encrypted_secret := encode(convert_to(p_api_secret, 'UTF8'), 'base64');
  
  -- Insert new credential with encrypted values
  INSERT INTO exchange_credentials (
    user_id,
    exchange,
    api_key_encrypted,
    api_secret_encrypted,
    label,
    is_active,
    is_valid,
    last_validated_at
  )
  VALUES (
    v_user_id,
    p_exchange,
    v_encrypted_key,
    v_encrypted_secret,
    p_label,
    true,
    NULL,
    NULL
  )
  RETURNING id INTO v_credential_id;
  
  RETURN v_credential_id;
END;
$$;

-- Function to decrypt credentials (for Edge Function use via service role)
CREATE OR REPLACE FUNCTION public.get_decrypted_credential(
  p_user_id UUID,
  p_exchange TEXT DEFAULT 'binance'
)
RETURNS TABLE (
  id UUID,
  api_key TEXT,
  api_secret TEXT,
  label TEXT,
  permissions JSONB,
  is_valid BOOLEAN,
  last_validated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ec.id,
    convert_from(decode(ec.api_key_encrypted, 'base64'), 'UTF8'),
    convert_from(decode(ec.api_secret_encrypted, 'base64'), 'UTF8'),
    ec.label,
    ec.permissions,
    ec.is_valid,
    ec.last_validated_at
  FROM exchange_credentials ec
  WHERE ec.user_id = p_user_id
    AND ec.exchange = p_exchange
    AND ec.is_active = true
  LIMIT 1;
END;
$$;

-- Function to update credential validation status
CREATE OR REPLACE FUNCTION public.update_credential_validation(
  p_credential_id UUID,
  p_is_valid BOOLEAN,
  p_permissions JSONB DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE exchange_credentials
  SET 
    is_valid = p_is_valid,
    permissions = COALESCE(p_permissions, permissions),
    validation_error = p_error,
    last_validated_at = now(),
    updated_at = now()
  WHERE id = p_credential_id;
  
  RETURN FOUND;
END;
$$;

-- Function to get credential status (masked, for frontend)
CREATE OR REPLACE FUNCTION public.get_credential_status(
  p_exchange TEXT DEFAULT 'binance'
)
RETURNS TABLE (
  id UUID,
  exchange TEXT,
  label TEXT,
  api_key_masked TEXT,
  is_valid BOOLEAN,
  permissions JSONB,
  last_validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    ec.id,
    ec.exchange,
    ec.label,
    -- Mask API key: show first 4 and last 4 chars
    CASE 
      WHEN length(convert_from(decode(ec.api_key_encrypted, 'base64'), 'UTF8')) > 8 
      THEN substring(convert_from(decode(ec.api_key_encrypted, 'base64'), 'UTF8') from 1 for 4) || 
           '****' || 
           substring(convert_from(decode(ec.api_key_encrypted, 'base64'), 'UTF8') from length(convert_from(decode(ec.api_key_encrypted, 'base64'), 'UTF8')) - 3)
      ELSE '****'
    END,
    ec.is_valid,
    ec.permissions,
    ec.last_validated_at,
    ec.created_at
  FROM exchange_credentials ec
  WHERE ec.user_id = v_user_id
    AND ec.exchange = p_exchange
    AND ec.is_active = true
  LIMIT 1;
END;
$$;

-- Function to delete (deactivate) credential
CREATE OR REPLACE FUNCTION public.delete_exchange_credential(
  p_credential_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  UPDATE exchange_credentials
  SET 
    is_active = false,
    updated_at = now()
  WHERE id = p_credential_id
    AND user_id = v_user_id;
  
  RETURN FOUND;
END;
$$;

-- =============================================================
-- PART 2: Rate Limit Tracking Table and Functions
-- =============================================================

-- Create rate limit tracking table
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exchange TEXT NOT NULL DEFAULT 'binance',
  endpoint_category TEXT NOT NULL,
  weight_used INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  window_end TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()) + interval '1 minute',
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT unique_user_exchange_window 
    UNIQUE (user_id, exchange, endpoint_category, window_start)
);

-- Enable RLS
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own rate limits
CREATE POLICY "Users can view their own rate limits"
  ON public.api_rate_limits FOR SELECT
  USING (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_window 
  ON public.api_rate_limits (user_id, exchange, endpoint_category, window_start);

-- Cleanup function for old rate limit records (called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM api_rate_limits
  WHERE window_end < now() - interval '1 hour'
  RETURNING COUNT(*) INTO v_deleted;
  
  RETURN COALESCE(v_deleted, 0);
END;
$$;

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_exchange TEXT,
  p_category TEXT,
  p_weight INTEGER DEFAULT 1
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_weight INTEGER,
  max_weight INTEGER,
  reset_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_window_end TIMESTAMPTZ;
  v_current_weight INTEGER;
  v_max_weight INTEGER;
BEGIN
  -- Binance limits: 2400/min for most, 1200/min for orders
  v_max_weight := CASE p_category
    WHEN 'order' THEN 1200
    ELSE 2400
  END;
  
  -- Current minute window
  v_window_start := date_trunc('minute', now());
  v_window_end := v_window_start + interval '1 minute';
  
  -- Get or create rate limit record using upsert
  INSERT INTO api_rate_limits (
    user_id, exchange, endpoint_category, 
    weight_used, window_start, window_end
  )
  VALUES (
    p_user_id, p_exchange, p_category,
    p_weight, v_window_start, v_window_end
  )
  ON CONFLICT (user_id, exchange, endpoint_category, window_start)
  DO UPDATE SET 
    weight_used = api_rate_limits.weight_used + p_weight,
    last_request_at = now()
  RETURNING weight_used INTO v_current_weight;
  
  RETURN QUERY SELECT 
    v_current_weight <= v_max_weight,
    v_current_weight,
    v_max_weight,
    v_window_end;
END;
$$;

-- Function to get current rate limit status for frontend display
CREATE OR REPLACE FUNCTION public.get_rate_limit_status(
  p_exchange TEXT DEFAULT 'binance'
)
RETURNS TABLE (
  endpoint_category TEXT,
  weight_used INTEGER,
  max_weight INTEGER,
  reset_at TIMESTAMPTZ,
  usage_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_window_start TIMESTAMPTZ := date_trunc('minute', now());
BEGIN
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    arl.endpoint_category,
    arl.weight_used,
    CASE arl.endpoint_category
      WHEN 'order' THEN 1200
      ELSE 2400
    END::INTEGER,
    arl.window_end,
    ROUND((arl.weight_used::NUMERIC / 
      CASE arl.endpoint_category
        WHEN 'order' THEN 1200
        ELSE 2400
      END::NUMERIC) * 100, 1)
  FROM api_rate_limits arl
  WHERE arl.user_id = v_user_id
    AND arl.exchange = p_exchange
    AND arl.window_start = v_window_start;
END;
$$;