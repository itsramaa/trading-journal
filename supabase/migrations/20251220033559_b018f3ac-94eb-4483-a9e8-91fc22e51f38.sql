-- Add target_allocations column to user_settings for portfolio rebalancing
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS target_allocations jsonb DEFAULT '{"crypto": 20, "stock_us": 40, "stock_id": 25, "reksadana": 10, "other": 5}'::jsonb;

-- Add is_backtest flag to trading_accounts for paper trading/backtesting
ALTER TABLE public.trading_accounts 
ADD COLUMN IF NOT EXISTS is_backtest boolean NOT NULL DEFAULT false;

-- Create index for better performance when filtering backtest accounts
CREATE INDEX IF NOT EXISTS idx_trading_accounts_is_backtest ON public.trading_accounts (user_id, is_backtest);

COMMENT ON COLUMN public.user_settings.target_allocations IS 'User-configurable target allocations for portfolio rebalancing (percentages by asset type)';
COMMENT ON COLUMN public.trading_accounts.is_backtest IS 'Flag to identify paper trading/backtesting accounts that should be isolated from main accounts';