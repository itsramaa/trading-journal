-- Create trigger to deduct from account when budget expense is added
CREATE OR REPLACE FUNCTION public.update_account_from_budget_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Handle INSERT: deduct from account
  IF TG_OP = 'INSERT' THEN
    IF NEW.account_id IS NOT NULL THEN
      UPDATE public.accounts 
      SET balance = balance - NEW.amount,
          updated_at = now()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  
  -- Handle DELETE: restore to account
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.account_id IS NOT NULL THEN
      UPDATE public.accounts 
      SET balance = balance + OLD.amount,
          updated_at = now()
      WHERE id = OLD.account_id;
    END IF;
    RETURN OLD;
  
  -- Handle UPDATE: adjust difference
  ELSIF TG_OP = 'UPDATE' THEN
    -- Restore old account
    IF OLD.account_id IS NOT NULL THEN
      UPDATE public.accounts 
      SET balance = balance + OLD.amount,
          updated_at = now()
      WHERE id = OLD.account_id;
    END IF;
    -- Deduct from new account
    IF NEW.account_id IS NOT NULL THEN
      UPDATE public.accounts 
      SET balance = balance - NEW.amount,
          updated_at = now()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for budget_transactions
DROP TRIGGER IF EXISTS update_account_from_budget_expense_trigger ON public.budget_transactions;
CREATE TRIGGER update_account_from_budget_expense_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.budget_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_from_budget_expense();

-- Fix emergency fund transactions to properly deduct from source account
CREATE OR REPLACE FUNCTION public.update_account_from_emergency_fund_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.account_id IS NOT NULL THEN
      -- For deposit to emergency fund, deduct from source account
      IF NEW.transaction_type = 'deposit' THEN
        UPDATE public.accounts 
        SET balance = balance - NEW.amount,
            updated_at = now()
        WHERE id = NEW.account_id;
      -- For withdrawal from emergency fund, add to destination account
      ELSIF NEW.transaction_type = 'withdrawal' THEN
        UPDATE public.accounts 
        SET balance = balance + NEW.amount,
            updated_at = now()
        WHERE id = NEW.account_id;
      END IF;
    END IF;
    RETURN NEW;
  
  -- Handle DELETE
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.account_id IS NOT NULL THEN
      -- Reverse deposit: add back to account
      IF OLD.transaction_type = 'deposit' THEN
        UPDATE public.accounts 
        SET balance = balance + OLD.amount,
            updated_at = now()
        WHERE id = OLD.account_id;
      -- Reverse withdrawal: deduct from account
      ELSIF OLD.transaction_type = 'withdrawal' THEN
        UPDATE public.accounts 
        SET balance = balance - OLD.amount,
            updated_at = now()
        WHERE id = OLD.account_id;
      END IF;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create trigger for emergency_fund_transactions
DROP TRIGGER IF EXISTS update_account_from_ef_transaction_trigger ON public.emergency_fund_transactions;
CREATE TRIGGER update_account_from_ef_transaction_trigger
  AFTER INSERT OR DELETE ON public.emergency_fund_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_from_emergency_fund_transaction();

-- Add entry_datetime and exit_datetime to trade_entries table
ALTER TABLE public.trade_entries 
ADD COLUMN IF NOT EXISTS entry_datetime TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS exit_datetime TIMESTAMPTZ;

-- Migrate existing data: copy trade_date to entry_datetime
UPDATE public.trade_entries 
SET entry_datetime = trade_date 
WHERE entry_datetime IS NULL;