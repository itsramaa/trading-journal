-- Fix function search path for update_risk_profiles_updated_at
CREATE OR REPLACE FUNCTION public.update_risk_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;