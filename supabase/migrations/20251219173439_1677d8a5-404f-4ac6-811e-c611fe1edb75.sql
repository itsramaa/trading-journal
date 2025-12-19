-- Create portfolio_history table to track portfolio value over time
CREATE TABLE public.portfolio_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_value NUMERIC NOT NULL DEFAULT 0,
  total_cost NUMERIC NOT NULL DEFAULT 0,
  profit_loss NUMERIC NOT NULL DEFAULT 0,
  day_change NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_portfolio_history_portfolio_date ON public.portfolio_history(portfolio_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE public.portfolio_history ENABLE ROW LEVEL SECURITY;

-- RLS policies - users can only see their own portfolio history
CREATE POLICY "Users can view their portfolio history"
ON public.portfolio_history FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = portfolio_history.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their portfolio history"
ON public.portfolio_history FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = portfolio_history.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
);

-- Create price_alerts table for price alert functionality
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  target_price NUMERIC NOT NULL,
  condition VARCHAR NOT NULL CHECK (condition IN ('above', 'below')),
  is_triggered BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Create index for efficient querying
CREATE INDEX idx_price_alerts_user ON public.price_alerts(user_id, is_active);
CREATE INDEX idx_price_alerts_asset ON public.price_alerts(asset_id, is_active);

-- Enable RLS
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for price_alerts
CREATE POLICY "Users can view their own price alerts"
ON public.price_alerts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own price alerts"
ON public.price_alerts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own price alerts"
ON public.price_alerts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price alerts"
ON public.price_alerts FOR DELETE
USING (auth.uid() = user_id);

-- Add UPDATE and DELETE policies to transactions table
CREATE POLICY "Users can update transactions in their portfolios"
ON public.transactions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = transactions.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete transactions in their portfolios"
ON public.transactions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM portfolios
    WHERE portfolios.id = transactions.portfolio_id
    AND portfolios.user_id = auth.uid()
  )
);