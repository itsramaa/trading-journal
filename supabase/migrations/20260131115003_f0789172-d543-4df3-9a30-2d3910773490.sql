-- Add clone tracking columns to trading_strategies
ALTER TABLE public.trading_strategies
ADD COLUMN IF NOT EXISTS clone_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_cloned_at TIMESTAMP WITH TIME ZONE;

-- Create index for efficient querying of shared strategies
CREATE INDEX IF NOT EXISTS idx_trading_strategies_clone_stats 
ON public.trading_strategies(user_id, is_shared, clone_count DESC)
WHERE is_shared = true;