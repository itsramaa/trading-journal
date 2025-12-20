-- Create a function to update account balance when portfolio transactions are created/updated/deleted
CREATE OR REPLACE FUNCTION public.update_account_from_portfolio_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_amount NUMERIC;
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    IF NEW.account_id IS NOT NULL THEN
      -- Calculate amount based on transaction type
      -- BUY/TRANSFER_IN = deduct from account (we're spending money)
      -- SELL/DIVIDEND/TRANSFER_OUT = add to account (we're receiving money)
      IF NEW.transaction_type IN ('BUY', 'TRANSFER_IN') THEN
        v_amount = -NEW.total_amount;
      ELSIF NEW.transaction_type IN ('SELL', 'DIVIDEND', 'TRANSFER_OUT') THEN
        v_amount = NEW.total_amount;
      ELSE
        v_amount = 0;
      END IF;
      
      UPDATE public.accounts 
      SET balance = balance + v_amount,
          updated_at = now()
      WHERE id = NEW.account_id;
      
      RAISE NOTICE 'Updated account % balance by %', NEW.account_id, v_amount;
    END IF;
    RETURN NEW;
  
  -- Handle UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    -- If account_id changed or transaction details changed, reverse old and apply new
    IF OLD.account_id IS NOT NULL AND (OLD.account_id IS DISTINCT FROM NEW.account_id OR OLD.total_amount IS DISTINCT FROM NEW.total_amount OR OLD.transaction_type IS DISTINCT FROM NEW.transaction_type) THEN
      -- Reverse the old transaction
      IF OLD.transaction_type IN ('BUY', 'TRANSFER_IN') THEN
        v_amount = OLD.total_amount; -- Add back what was deducted
      ELSIF OLD.transaction_type IN ('SELL', 'DIVIDEND', 'TRANSFER_OUT') THEN
        v_amount = -OLD.total_amount; -- Remove what was added
      ELSE
        v_amount = 0;
      END IF;
      
      UPDATE public.accounts 
      SET balance = balance + v_amount,
          updated_at = now()
      WHERE id = OLD.account_id;
    END IF;
    
    -- Apply the new transaction
    IF NEW.account_id IS NOT NULL THEN
      IF NEW.transaction_type IN ('BUY', 'TRANSFER_IN') THEN
        v_amount = -NEW.total_amount;
      ELSIF NEW.transaction_type IN ('SELL', 'DIVIDEND', 'TRANSFER_OUT') THEN
        v_amount = NEW.total_amount;
      ELSE
        v_amount = 0;
      END IF;
      
      UPDATE public.accounts 
      SET balance = balance + v_amount,
          updated_at = now()
      WHERE id = NEW.account_id;
    END IF;
    RETURN NEW;
  
  -- Handle DELETE
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.account_id IS NOT NULL THEN
      -- Reverse the transaction
      IF OLD.transaction_type IN ('BUY', 'TRANSFER_IN') THEN
        v_amount = OLD.total_amount; -- Add back what was deducted
      ELSIF OLD.transaction_type IN ('SELL', 'DIVIDEND', 'TRANSFER_OUT') THEN
        v_amount = -OLD.total_amount; -- Remove what was added
      ELSE
        v_amount = 0;
      END IF;
      
      UPDATE public.accounts 
      SET balance = balance + v_amount,
          updated_at = now()
      WHERE id = OLD.account_id;
      
      RAISE NOTICE 'Reversed account % balance by %', OLD.account_id, v_amount;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_portfolio_transaction_account_update ON public.transactions;
CREATE TRIGGER on_portfolio_transaction_account_update
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_from_portfolio_transaction();