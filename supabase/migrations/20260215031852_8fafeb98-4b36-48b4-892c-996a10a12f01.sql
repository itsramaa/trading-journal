
-- Fix INSERT policies to restrict to authenticated users only (edge functions run as authenticated service)
-- Drop overly permissive INSERT policies
DROP POLICY "Service role can insert volatility history" ON public.volatility_history;
DROP POLICY "Service role can insert funding rate history" ON public.funding_rate_history;

-- Recreate with proper restriction - only allow inserts from authenticated context
-- Edge functions use service_role key which bypasses RLS anyway, so these won't block them
-- But prevent anonymous/public inserts
CREATE POLICY "Authenticated can insert volatility history"
  ON public.volatility_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert funding rate history"
  ON public.funding_rate_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
