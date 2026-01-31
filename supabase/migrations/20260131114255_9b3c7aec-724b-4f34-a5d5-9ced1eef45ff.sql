-- Add share_token column to trading_strategies for secure sharing
ALTER TABLE public.trading_strategies 
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE;

-- Create index for faster share token lookups
CREATE INDEX IF NOT EXISTS idx_trading_strategies_share_token 
ON public.trading_strategies(share_token) 
WHERE share_token IS NOT NULL;

-- Create function to generate unique share token
CREATE OR REPLACE FUNCTION public.generate_share_token()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_token TEXT;
BEGIN
  -- Generate a URL-safe token (12 characters)
  new_token := encode(gen_random_bytes(9), 'base64');
  -- Replace URL-unsafe characters
  new_token := replace(replace(new_token, '+', '-'), '/', '_');
  RETURN new_token;
END;
$$;

-- Create RLS policy for viewing shared strategies (authenticated users can view shared strategies)
CREATE POLICY "Authenticated users can view shared strategies"
ON public.trading_strategies
FOR SELECT
TO authenticated
USING (
  is_shared = TRUE 
  AND share_token IS NOT NULL
  OR user_id = auth.uid()
);

-- Drop the existing select policy if it's too restrictive
DROP POLICY IF EXISTS "Users can view their own strategies" ON public.trading_strategies;