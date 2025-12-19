-- Create users_profile table
CREATE TABLE public.users_profile (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  preferred_currency TEXT NOT NULL DEFAULT 'IDR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create portfolios table
CREATE TABLE public.portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'IDR',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create assets table
CREATE TABLE public.assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  exchange TEXT,
  sector TEXT,
  logo_url TEXT,
  current_price DECIMAL(24,8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create holdings table
CREATE TABLE public.holdings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  quantity DECIMAL(24,8) NOT NULL DEFAULT 0,
  average_cost DECIMAL(24,8) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  portfolio_id UUID REFERENCES public.portfolios(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL,
  quantity DECIMAL(24,8) NOT NULL,
  price_per_unit DECIMAL(24,8) NOT NULL,
  total_amount DECIMAL(24,8) NOT NULL,
  fee DECIMAL(24,8) DEFAULT 0,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create price_alerts table
CREATE TABLE public.price_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  target_price DECIMAL(24,8) NOT NULL,
  condition TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX idx_assets_user_id ON public.assets(user_id);
CREATE INDEX idx_assets_portfolio_id ON public.assets(portfolio_id);
CREATE INDEX idx_holdings_user_id ON public.holdings(user_id);
CREATE INDEX idx_holdings_portfolio_id ON public.holdings(portfolio_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_asset_id ON public.transactions(asset_id);
CREATE INDEX idx_price_alerts_user_id ON public.price_alerts(user_id);

-- Enable RLS
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for users_profile
CREATE POLICY "Users can view their own profile" ON public.users_profile FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.users_profile FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.users_profile FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for portfolios
CREATE POLICY "Users can view their own portfolios" ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own portfolios" ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own portfolios" ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own portfolios" ON public.portfolios FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for assets
CREATE POLICY "Users can view their own assets" ON public.assets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own assets" ON public.assets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own assets" ON public.assets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own assets" ON public.assets FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for holdings
CREATE POLICY "Users can view their own holdings" ON public.holdings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own holdings" ON public.holdings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own holdings" ON public.holdings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own holdings" ON public.holdings FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for transactions
CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for price_alerts
CREATE POLICY "Users can view their own alerts" ON public.price_alerts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own alerts" ON public.price_alerts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own alerts" ON public.price_alerts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own alerts" ON public.price_alerts FOR DELETE USING (auth.uid() = user_id);

-- Function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users_profile (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$;

-- Trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();