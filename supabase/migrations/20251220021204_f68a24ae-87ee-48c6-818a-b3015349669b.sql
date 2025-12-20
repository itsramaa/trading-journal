-- Add status column to trade_entries for open/closed position tracking
ALTER TABLE public.trade_entries 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'closed' 
CHECK (status IN ('open', 'closed'));

-- Add realized_pnl and unrealized_pnl columns for explicit P&L tracking
ALTER TABLE public.trade_entries 
ADD COLUMN IF NOT EXISTS realized_pnl NUMERIC DEFAULT 0;

-- Update existing trades: if they have exit_price, they are closed with realized P&L
UPDATE public.trade_entries 
SET status = 'closed', realized_pnl = pnl 
WHERE exit_price IS NOT NULL;

-- Update existing trades: if no exit_price, they are open
UPDATE public.trade_entries 
SET status = 'open', realized_pnl = 0 
WHERE exit_price IS NULL;