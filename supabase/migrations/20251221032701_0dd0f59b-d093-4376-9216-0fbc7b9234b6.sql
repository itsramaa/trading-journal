-- ============================================
-- STEP 1: DROP OLD TABLES & CREATE NEW TABLES
-- ============================================

-- Drop triggers that depend on old tables first
DROP TRIGGER IF EXISTS update_emergency_fund_balance_trigger ON public.emergency_fund_transactions;
DROP TRIGGER IF EXISTS update_account_from_emergency_fund_transaction_trigger ON public.emergency_fund_transactions;
DROP TRIGGER IF EXISTS sync_budget_spent_amount_trigger ON public.budget_transactions;
DROP TRIGGER IF EXISTS update_account_from_budget_expense_trigger ON public.budget_transactions;

-- Drop foreign key constraint from trade_entries to trading_accounts
ALTER TABLE public.trade_entries DROP CONSTRAINT IF EXISTS trade_entries_trading_account_id_fkey;

-- Drop old tables
DROP TABLE IF EXISTS public.emergency_fund_transactions CASCADE;
DROP TABLE IF EXISTS public.emergency_funds CASCADE;
DROP TABLE IF EXISTS public.trading_accounts CASCADE;
DROP TABLE IF EXISTS public.budget_transactions CASCADE;

-- Rename transactions to portfolio_transactions
ALTER TABLE public.transactions RENAME TO portfolio_transactions;

-- Create account_links table
CREATE TABLE public.account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  child_account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  link_type text NOT NULL DEFAULT 'general',
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(parent_account_id, child_account_id)
);

-- Enable RLS on account_links
ALTER TABLE public.account_links ENABLE ROW LEVEL SECURITY;

-- RLS policies for account_links
CREATE POLICY "Users can view their own account links"
  ON public.account_links FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own account links"
  ON public.account_links FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own account links"
  ON public.account_links FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own account links"
  ON public.account_links FOR DELETE
  USING (auth.uid() = user_id);

-- Add missing columns to portfolio_transactions (renamed from transactions)
ALTER TABLE public.portfolio_transactions
  ADD COLUMN IF NOT EXISTS holding_id uuid,
  ADD COLUMN IF NOT EXISTS payment_account_id uuid;

-- Add foreign key constraints to portfolio_transactions
ALTER TABLE public.portfolio_transactions 
  ADD CONSTRAINT portfolio_tx_holding_fkey 
    FOREIGN KEY (holding_id) REFERENCES public.holdings(id) ON DELETE SET NULL;

ALTER TABLE public.portfolio_transactions 
  ADD CONSTRAINT portfolio_tx_payment_account_fkey 
    FOREIGN KEY (payment_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;

-- Create indexes for account_links
CREATE INDEX idx_account_links_parent ON public.account_links(parent_account_id);
CREATE INDEX idx_account_links_child ON public.account_links(child_account_id);
CREATE INDEX idx_account_links_user ON public.account_links(user_id);