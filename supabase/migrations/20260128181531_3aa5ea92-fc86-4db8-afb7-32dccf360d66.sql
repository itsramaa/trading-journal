-- Create trading_pairs table for centralized pairs from Binance API
CREATE TABLE IF NOT EXISTS public.trading_pairs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT UNIQUE NOT NULL,
  base_asset TEXT NOT NULL,
  quote_asset TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  source TEXT DEFAULT 'binance_futures',
  last_synced_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_trading_pairs_symbol ON public.trading_pairs(symbol);
CREATE INDEX idx_trading_pairs_is_active ON public.trading_pairs(is_active);

-- RLS Policy (public read, system write via service role)
ALTER TABLE public.trading_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trading pairs"
ON public.trading_pairs FOR SELECT
USING (true);

-- Insert/Update/Delete only via service role (edge function)