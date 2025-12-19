-- Add account_id to transactions table for linking portfolio transactions to accounts
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);

-- Create budget_categories table for Financial Freedom module
CREATE TABLE public.budget_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  budgeted_amount DECIMAL(24,8) NOT NULL DEFAULT 0,
  spent_amount DECIMAL(24,8) NOT NULL DEFAULT 0,
  period TEXT NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create budget_transactions table for tracking expenses
CREATE TABLE public.budget_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  category_id UUID NOT NULL REFERENCES public.budget_categories(id) ON DELETE CASCADE,
  amount DECIMAL(24,8) NOT NULL,
  description TEXT,
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trading_accounts table to link trading activities to accounts
CREATE TABLE public.trading_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  broker TEXT,
  account_number TEXT,
  initial_balance DECIMAL(24,8) NOT NULL DEFAULT 0,
  current_balance DECIMAL(24,8) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trade_entries table for trading journal with account link
CREATE TABLE public.trade_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trading_account_id UUID REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  pair TEXT NOT NULL,
  direction TEXT NOT NULL,
  entry_price DECIMAL(24,8) NOT NULL,
  exit_price DECIMAL(24,8),
  stop_loss DECIMAL(24,8),
  take_profit DECIMAL(24,8),
  quantity DECIMAL(24,8) NOT NULL DEFAULT 1,
  pnl DECIMAL(24,8) DEFAULT 0,
  fees DECIMAL(24,8) DEFAULT 0,
  result TEXT,
  market_condition TEXT,
  confluence_score INTEGER,
  entry_signal TEXT,
  notes TEXT,
  tags TEXT[],
  trade_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_budget_categories_user_id ON public.budget_categories(user_id);
CREATE INDEX idx_budget_transactions_user_id ON public.budget_transactions(user_id);
CREATE INDEX idx_budget_transactions_category_id ON public.budget_transactions(category_id);
CREATE INDEX idx_trading_accounts_user_id ON public.trading_accounts(user_id);
CREATE INDEX idx_trading_accounts_account_id ON public.trading_accounts(account_id);
CREATE INDEX idx_trade_entries_user_id ON public.trade_entries(user_id);
CREATE INDEX idx_trade_entries_trading_account_id ON public.trade_entries(trading_account_id);

-- Enable RLS
ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for budget_categories
CREATE POLICY "Users can view their own budget categories" ON public.budget_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own budget categories" ON public.budget_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budget categories" ON public.budget_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budget categories" ON public.budget_categories FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for budget_transactions
CREATE POLICY "Users can view their own budget transactions" ON public.budget_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own budget transactions" ON public.budget_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budget transactions" ON public.budget_transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budget transactions" ON public.budget_transactions FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for trading_accounts
CREATE POLICY "Users can view their own trading accounts" ON public.trading_accounts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own trading accounts" ON public.trading_accounts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trading accounts" ON public.trading_accounts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trading accounts" ON public.trading_accounts FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for trade_entries
CREATE POLICY "Users can view their own trade entries" ON public.trade_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own trade entries" ON public.trade_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own trade entries" ON public.trade_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own trade entries" ON public.trade_entries FOR DELETE USING (auth.uid() = user_id);