-- ============================================
-- STEP 3: ADD NEW COLUMNS
-- ============================================

-- Add new columns to accounts
ALTER TABLE public.accounts 
  ADD COLUMN IF NOT EXISTS sub_type text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add new columns to account_transactions
ALTER TABLE public.account_transactions
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.budget_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trade_entry_id uuid REFERENCES public.trade_entries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS portfolio_transaction_id uuid REFERENCES public.portfolio_transactions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sub_type text,
  ADD COLUMN IF NOT EXISTS counterparty_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS transaction_date timestamptz DEFAULT now();

-- Add target_account_id to financial_goals
ALTER TABLE public.financial_goals
  ADD COLUMN IF NOT EXISTS target_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Add payment_account_id to debts
ALTER TABLE public.debts
  ADD COLUMN IF NOT EXISTS payment_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Add notification_preferences to user_settings
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS notification_preferences jsonb DEFAULT '{
    "enabled": true,
    "email": true,
    "push": false,
    "price_alerts": true,
    "portfolio_updates": true,
    "market_news": true,
    "weekly_report": false
  }'::jsonb;

-- Add trade_entries FK to accounts (replacing old trading_accounts table)
ALTER TABLE public.trade_entries 
  ADD CONSTRAINT trade_entries_trading_account_id_fkey 
    FOREIGN KEY (trading_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_account_transactions_category_id ON public.account_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_trade_entry_id ON public.account_transactions(trade_entry_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_transaction_date ON public.account_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_goals_target_account ON public.financial_goals(target_account_id);
CREATE INDEX IF NOT EXISTS idx_debts_payment_account ON public.debts(payment_account_id);