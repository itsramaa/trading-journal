-- Create account_balance_snapshots table for tracking historical balance and equity curve
CREATE TABLE IF NOT EXISTS public.account_balance_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL,
  balance NUMERIC NOT NULL DEFAULT 0,
  unrealized_pnl NUMERIC DEFAULT 0,
  realized_pnl_today NUMERIC DEFAULT 0,
  source TEXT DEFAULT 'manual', -- 'binance' | 'manual' | 'paper'
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure one snapshot per account per day
  UNIQUE(account_id, snapshot_date)
);

-- Create index for efficient queries
CREATE INDEX idx_balance_snapshots_user_date ON public.account_balance_snapshots(user_id, snapshot_date DESC);
CREATE INDEX idx_balance_snapshots_account ON public.account_balance_snapshots(account_id, snapshot_date DESC);

-- Enable RLS
ALTER TABLE public.account_balance_snapshots ENABLE ROW LEVEL SECURITY;

-- Users can view their own snapshots
CREATE POLICY "Users can view their own balance snapshots"
  ON public.account_balance_snapshots
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own snapshots
CREATE POLICY "Users can insert their own balance snapshots"
  ON public.account_balance_snapshots
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own snapshots
CREATE POLICY "Users can update their own balance snapshots"
  ON public.account_balance_snapshots
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own snapshots
CREATE POLICY "Users can delete their own balance snapshots"
  ON public.account_balance_snapshots
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comment on table
COMMENT ON TABLE public.account_balance_snapshots IS 'Daily balance snapshots for accounts to track equity growth over time';