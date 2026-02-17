
-- Remove overly permissive INSERT policies on market data tables
-- Edge functions use service_role key which bypasses RLS, so these policies are unnecessary

-- Drop permissive INSERT policy on volatility_history
DROP POLICY IF EXISTS "Authenticated can insert volatility history" ON public.volatility_history;

-- Drop permissive INSERT policy on funding_rate_history  
DROP POLICY IF EXISTS "Authenticated can insert funding rate history" ON public.funding_rate_history;
