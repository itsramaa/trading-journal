
-- Ensure vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Store encryption key in Vault
SELECT vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'exchange_credentials_encryption_key',
  'Encryption key for exchange API credentials'
);

-- Helper to retrieve encryption key from Vault
CREATE OR REPLACE FUNCTION public.private_get_encryption_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'vault', 'extensions'
AS $$
DECLARE
  v_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'exchange_credentials_encryption_key'
  LIMIT 1;
  
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not found in Vault';
  END IF;
  
  RETURN v_key;
END;
$$;

REVOKE ALL ON FUNCTION public.private_get_encryption_key() FROM PUBLIC;

-- Migrate existing Base64 data to PGP encrypted
DO $$
DECLARE
  r RECORD;
  v_key TEXT;
  v_plain_key TEXT;
  v_plain_secret TEXT;
BEGIN
  SELECT decrypted_secret INTO v_key
  FROM vault.decrypted_secrets
  WHERE name = 'exchange_credentials_encryption_key'
  LIMIT 1;
  
  IF v_key IS NULL THEN
    RAISE EXCEPTION 'Encryption key not configured';
  END IF;
  
  FOR r IN SELECT id, api_key_encrypted, api_secret_encrypted FROM public.exchange_credentials
  LOOP
    BEGIN
      v_plain_key := convert_from(decode(r.api_key_encrypted, 'base64'), 'UTF8');
      v_plain_secret := convert_from(decode(r.api_secret_encrypted, 'base64'), 'UTF8');
      
      UPDATE public.exchange_credentials
      SET 
        api_key_encrypted = encode(extensions.pgp_sym_encrypt(v_plain_key, v_key), 'base64'),
        api_secret_encrypted = encode(extensions.pgp_sym_encrypt(v_plain_secret, v_key), 'base64'),
        updated_at = now()
      WHERE id = r.id;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to migrate credential %: %', r.id, SQLERRM;
    END;
  END LOOP;
END;
$$;

-- Update save_exchange_credential with PGP encryption
CREATE OR REPLACE FUNCTION public.save_exchange_credential(
  p_api_key text, 
  p_api_secret text, 
  p_exchange text DEFAULT 'binance'::text, 
  p_label text DEFAULT 'Main Account'::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_credential_id UUID;
  v_encryption_key TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;
  
  v_encryption_key := public.private_get_encryption_key();
  
  UPDATE exchange_credentials 
  SET is_active = false, updated_at = now()
  WHERE user_id = v_user_id AND exchange = p_exchange AND is_active = true;
  
  INSERT INTO exchange_credentials (
    user_id, exchange, api_key_encrypted, api_secret_encrypted,
    label, is_active, is_valid, last_validated_at
  )
  VALUES (
    v_user_id, p_exchange,
    encode(pgp_sym_encrypt(p_api_key, v_encryption_key), 'base64'),
    encode(pgp_sym_encrypt(p_api_secret, v_encryption_key), 'base64'),
    p_label, true, NULL, NULL
  )
  RETURNING id INTO v_credential_id;
  
  RETURN v_credential_id;
END;
$$;

-- Update get_decrypted_credential with PGP decryption
CREATE OR REPLACE FUNCTION public.get_decrypted_credential(
  p_user_id uuid, 
  p_exchange text DEFAULT 'binance'::text
)
RETURNS TABLE(
  id uuid, api_key text, api_secret text, label text, 
  permissions jsonb, is_valid boolean, last_validated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_encryption_key TEXT;
BEGIN
  v_encryption_key := public.private_get_encryption_key();
  
  RETURN QUERY
  SELECT 
    ec.id,
    pgp_sym_decrypt(decode(ec.api_key_encrypted, 'base64'), v_encryption_key),
    pgp_sym_decrypt(decode(ec.api_secret_encrypted, 'base64'), v_encryption_key),
    ec.label, ec.permissions, ec.is_valid, ec.last_validated_at
  FROM exchange_credentials ec
  WHERE ec.user_id = p_user_id AND ec.exchange = p_exchange AND ec.is_active = true
  LIMIT 1;
END;
$$;

-- Update get_credential_status with PGP decryption for masking
CREATE OR REPLACE FUNCTION public.get_credential_status(p_exchange text DEFAULT 'binance'::text)
RETURNS TABLE(
  id uuid, exchange text, label text, api_key_masked text, 
  is_valid boolean, permissions jsonb, 
  last_validated_at timestamp with time zone, created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_encryption_key TEXT;
  v_decrypted_key TEXT;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  
  v_encryption_key := public.private_get_encryption_key();
  
  RETURN QUERY
  WITH decrypted AS (
    SELECT 
      ec.id, ec.exchange, ec.label,
      pgp_sym_decrypt(decode(ec.api_key_encrypted, 'base64'), v_encryption_key) as plain_key,
      ec.is_valid, ec.permissions, ec.last_validated_at, ec.created_at
    FROM exchange_credentials ec
    WHERE ec.user_id = v_user_id AND ec.exchange = p_exchange AND ec.is_active = true
    LIMIT 1
  )
  SELECT 
    d.id, d.exchange, d.label,
    CASE 
      WHEN length(d.plain_key) > 8 
      THEN substring(d.plain_key from 1 for 4) || '****' || substring(d.plain_key from length(d.plain_key) - 3)
      ELSE '****'
    END,
    d.is_valid, d.permissions, d.last_validated_at, d.created_at
  FROM decrypted d;
END;
$$;
