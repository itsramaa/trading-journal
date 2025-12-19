-- Create enum for account types
CREATE TYPE public.account_type AS ENUM ('bank', 'ewallet', 'broker', 'cash', 'soft_wallet');

-- Create enum for transaction types (double entry)
CREATE TYPE public.account_transaction_type AS ENUM ('deposit', 'withdrawal', 'transfer_in', 'transfer_out');

-- Create accounts table
CREATE TABLE public.accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  account_type public.account_type NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  balance DECIMAL(24,8) NOT NULL DEFAULT 0,
  description TEXT,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create account_transactions table (double entry logging)
CREATE TABLE public.account_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  transaction_type public.account_transaction_type NOT NULL,
  amount DECIMAL(24,8) NOT NULL,
  currency TEXT NOT NULL,
  reference_id UUID, -- for linking transfer_in/transfer_out pairs
  description TEXT,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_accounts_user_id ON public.accounts(user_id);
CREATE INDEX idx_account_transactions_user_id ON public.account_transactions(user_id);
CREATE INDEX idx_account_transactions_account_id ON public.account_transactions(account_id);
CREATE INDEX idx_account_transactions_reference_id ON public.account_transactions(reference_id);
CREATE INDEX idx_account_transactions_created_at ON public.account_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for accounts
CREATE POLICY "Users can view their own accounts"
  ON public.accounts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own accounts"
  ON public.accounts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own accounts"
  ON public.accounts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own accounts"
  ON public.accounts FOR DELETE
  USING (auth.uid() = user_id);

-- RLS policies for account_transactions
CREATE POLICY "Users can view their own transactions"
  ON public.account_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions"
  ON public.account_transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to update account balance
CREATE OR REPLACE FUNCTION public.update_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type IN ('deposit', 'transfer_in') THEN
      UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.account_id;
    ELSIF NEW.transaction_type IN ('withdrawal', 'transfer_out') THEN
      UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-update balance
CREATE TRIGGER on_account_transaction_insert
  AFTER INSERT ON public.account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balance();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_accounts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_accounts_updated_at();