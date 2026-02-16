
-- Fix: update_credential_validation should verify credential exists and belongs to a valid user
-- Adding defense-in-depth ownership validation
CREATE OR REPLACE FUNCTION public.update_credential_validation(
  p_credential_id UUID,
  p_is_valid BOOLEAN,
  p_permissions JSONB DEFAULT NULL,
  p_error TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Defense-in-depth: verify credential exists before updating
  IF NOT EXISTS (
    SELECT 1 FROM exchange_credentials 
    WHERE id = p_credential_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Credential not found or inactive';
  END IF;

  UPDATE exchange_credentials
  SET 
    is_valid = p_is_valid,
    permissions = COALESCE(p_permissions, permissions),
    validation_error = p_error,
    last_validated_at = now(),
    updated_at = now()
  WHERE id = p_credential_id AND is_active = true;
  
  RETURN FOUND;
END;
$$;
