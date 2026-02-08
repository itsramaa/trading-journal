-- Fix function search path mutable warnings
ALTER FUNCTION public.get_trading_session(timestamptz) SET search_path = public;
ALTER FUNCTION public.set_trade_session() SET search_path = public;