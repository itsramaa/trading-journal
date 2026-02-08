-- Add column to control whether Binance history is used in Trade History
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS use_binance_history BOOLEAN DEFAULT true;

-- Add column to track per-user API quota (for multi-user rate limit isolation)
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS binance_daily_sync_quota INTEGER DEFAULT 10;

-- Add index for faster user settings lookup
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Comment for documentation
COMMENT ON COLUMN public.user_settings.use_binance_history IS 'When true, include Binance trades in history. When false, only show non-Binance (paper/manual) trades.';
COMMENT ON COLUMN public.user_settings.binance_daily_sync_quota IS 'Daily sync quota per user to prevent abuse. Default 10 syncs per day.';