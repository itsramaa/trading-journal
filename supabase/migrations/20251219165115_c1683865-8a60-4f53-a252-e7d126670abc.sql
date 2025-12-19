-- Portfolio Assets Management Schema

-- Assets table (crypto, stocks, etc.)
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('crypto', 'us_stock', 'id_stock', 'other')),
  logo_url VARCHAR(500),
  coingecko_id VARCHAR(100),
  finnhub_symbol VARCHAR(20),
  fcs_id VARCHAR(50),
  alpha_symbol VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE(symbol, asset_type)
);

-- Portfolios table
CREATE TABLE public.portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Holdings table
CREATE TABLE public.holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  quantity DECIMAL(24,8) NOT NULL DEFAULT 0,
  average_cost DECIMAL(24,8) NOT NULL DEFAULT 0,
  total_cost DECIMAL(24,8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  UNIQUE(portfolio_id, asset_id)
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'TRANSFER_IN', 'TRANSFER_OUT', 'DIVIDEND', 'STAKING')),
  quantity DECIMAL(24,8) NOT NULL,
  price_per_unit DECIMAL(24,8) NOT NULL,
  total_amount DECIMAL(24,8) NOT NULL,
  fees DECIMAL(24,8) DEFAULT 0,
  notes TEXT,
  transaction_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Price cache table
CREATE TABLE public.price_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  current_price DECIMAL(24,8) NOT NULL,
  price_change_1h DECIMAL(10,4),
  price_change_24h DECIMAL(10,4),
  price_change_7d DECIMAL(10,4),
  market_cap DECIMAL(30,2),
  volume_24h DECIMAL(30,2),
  last_updated TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(asset_id)
);

-- User settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  default_currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  theme VARCHAR(20) NOT NULL DEFAULT 'dark',
  timezone VARCHAR(50) DEFAULT 'UTC',
  notifications_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

-- Enable RLS on all tables
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Assets policies (public read)
CREATE POLICY "Anyone can view assets" ON public.assets FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create assets" ON public.assets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Portfolios policies
CREATE POLICY "Users can view their own portfolios" ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own portfolios" ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own portfolios" ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own portfolios" ON public.portfolios FOR DELETE USING (auth.uid() = user_id);

-- Holdings policies
CREATE POLICY "Users can view holdings in their portfolios" ON public.holdings FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = holdings.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can create holdings in their portfolios" ON public.holdings FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = holdings.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can update holdings in their portfolios" ON public.holdings FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = holdings.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can delete holdings in their portfolios" ON public.holdings FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = holdings.portfolio_id AND portfolios.user_id = auth.uid()));

-- Transactions policies
CREATE POLICY "Users can view transactions in their portfolios" ON public.transactions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = transactions.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "Users can create transactions in their portfolios" ON public.transactions FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = transactions.portfolio_id AND portfolios.user_id = auth.uid()));

-- Price cache policies (public read)
CREATE POLICY "Anyone can view price cache" ON public.price_cache FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update price cache" ON public.price_cache FOR ALL USING (auth.uid() IS NOT NULL);

-- User settings policies
CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_portfolios_updated_at BEFORE UPDATE ON public.portfolios FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON public.holdings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_price_cache_updated_at BEFORE UPDATE ON public.price_cache FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some common crypto assets
INSERT INTO public.assets (symbol, name, asset_type, coingecko_id) VALUES
  ('BTC', 'Bitcoin', 'crypto', 'bitcoin'),
  ('ETH', 'Ethereum', 'crypto', 'ethereum'),
  ('BNB', 'BNB', 'crypto', 'binancecoin'),
  ('SOL', 'Solana', 'crypto', 'solana'),
  ('XRP', 'XRP', 'crypto', 'ripple'),
  ('ADA', 'Cardano', 'crypto', 'cardano'),
  ('DOGE', 'Dogecoin', 'crypto', 'dogecoin'),
  ('AVAX', 'Avalanche', 'crypto', 'avalanche-2'),
  ('DOT', 'Polkadot', 'crypto', 'polkadot'),
  ('MATIC', 'Polygon', 'crypto', 'matic-network');

-- Insert some US stocks
INSERT INTO public.assets (symbol, name, asset_type, finnhub_symbol, alpha_symbol) VALUES
  ('AAPL', 'Apple Inc.', 'us_stock', 'AAPL', 'AAPL'),
  ('MSFT', 'Microsoft Corporation', 'us_stock', 'MSFT', 'MSFT'),
  ('GOOGL', 'Alphabet Inc.', 'us_stock', 'GOOGL', 'GOOGL'),
  ('AMZN', 'Amazon.com Inc.', 'us_stock', 'AMZN', 'AMZN'),
  ('NVDA', 'NVIDIA Corporation', 'us_stock', 'NVDA', 'NVDA'),
  ('TSLA', 'Tesla Inc.', 'us_stock', 'TSLA', 'TSLA'),
  ('META', 'Meta Platforms Inc.', 'us_stock', 'META', 'META');

-- Create index for better query performance
CREATE INDEX idx_holdings_portfolio_id ON public.holdings(portfolio_id);
CREATE INDEX idx_transactions_portfolio_id ON public.transactions(portfolio_id);
CREATE INDEX idx_transactions_asset_id ON public.transactions(asset_id);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date DESC);
CREATE INDEX idx_price_cache_asset_id ON public.price_cache(asset_id);