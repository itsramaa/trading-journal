-- Fix rating constraint to allow 0 (unrated)
ALTER TABLE public.trading_sessions DROP CONSTRAINT trading_sessions_rating_check;
ALTER TABLE public.trading_sessions ADD CONSTRAINT trading_sessions_rating_check CHECK (rating >= 0 AND rating <= 5);