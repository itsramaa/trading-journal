-- Create price_cache table
CREATE TABLE public.price_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL UNIQUE,
  price DECIMAL(24,8) NOT NULL,
  price_change_24h DECIMAL(24,8),
  price_change_percentage_24h DECIMAL(24,8),
  market_cap DECIMAL(24,8),
  volume_24h DECIMAL(24,8),
  currency TEXT NOT NULL DEFAULT 'USD',
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create portfolio_history table
CREATE TABLE public.portfolio_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  total_value DECIMAL(24,8) NOT NULL,
  total_cost DECIMAL(24,8) NOT NULL,
  total_gain_loss DECIMAL(24,8) NOT NULL,
  gain_loss_percentage DECIMAL(24,8) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  default_currency TEXT NOT NULL DEFAULT 'IDR',
  theme TEXT NOT NULL DEFAULT 'system',
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  language TEXT NOT NULL DEFAULT 'id',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_price_cache_symbol ON public.price_cache(symbol);
CREATE INDEX idx_portfolio_history_user_id ON public.portfolio_history(user_id);
CREATE INDEX idx_portfolio_history_recorded_at ON public.portfolio_history(recorded_at DESC);
CREATE INDEX idx_user_settings_user_id ON public.user_settings(user_id);

-- Enable RLS
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS for price_cache (public read)
CREATE POLICY "Anyone can view price cache" ON public.price_cache FOR SELECT USING (true);

-- RLS for portfolio_history
CREATE POLICY "Users can view their own portfolio history" ON public.portfolio_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own portfolio history" ON public.portfolio_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS for user_settings
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Add total_cost column to holdings table
ALTER TABLE public.holdings ADD COLUMN IF NOT EXISTS total_cost DECIMAL(24,8) NOT NULL DEFAULT 0;