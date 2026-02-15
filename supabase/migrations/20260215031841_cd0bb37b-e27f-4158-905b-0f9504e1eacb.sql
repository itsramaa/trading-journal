
-- Phase 1: Historical context tables for percentile ranking

-- 1A. Volatility history - daily snapshots per symbol
CREATE TABLE public.volatility_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  annualized_volatility NUMERIC NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(symbol, snapshot_date)
);

ALTER TABLE public.volatility_history ENABLE ROW LEVEL SECURITY;

-- Public read (market data is not user-specific)
CREATE POLICY "Anyone can read volatility history"
  ON public.volatility_history FOR SELECT USING (true);

-- Only service role can insert (via edge functions)
CREATE POLICY "Service role can insert volatility history"
  ON public.volatility_history FOR INSERT
  WITH CHECK (true);

-- Index for percentile queries
CREATE INDEX idx_volatility_history_symbol_date 
  ON public.volatility_history(symbol, snapshot_date DESC);

-- 1B. Funding rate history - snapshots per symbol
CREATE TABLE public.funding_rate_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  funding_rate NUMERIC NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(symbol, snapshot_date)
);

ALTER TABLE public.funding_rate_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read funding rate history"
  ON public.funding_rate_history FOR SELECT USING (true);

CREATE POLICY "Service role can insert funding rate history"
  ON public.funding_rate_history FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_funding_rate_history_symbol_date 
  ON public.funding_rate_history(symbol, snapshot_date DESC);
