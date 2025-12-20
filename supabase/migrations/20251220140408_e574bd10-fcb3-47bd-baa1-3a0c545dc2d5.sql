-- Create function to update trading account balance when trade entry is closed
CREATE OR REPLACE FUNCTION public.update_trading_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_trading_account_id UUID;
  v_account_id UUID;
BEGIN
  -- Only process when trade is closed and has a trading_account_id
  IF NEW.status = 'closed' AND NEW.trading_account_id IS NOT NULL THEN
    -- Get the account_id from trading_accounts
    SELECT account_id INTO v_account_id
    FROM public.trading_accounts
    WHERE id = NEW.trading_account_id;
    
    IF v_account_id IS NOT NULL THEN
      -- For INSERT of a closed trade, add the realized P&L
      IF TG_OP = 'INSERT' THEN
        UPDATE public.accounts 
        SET balance = balance + COALESCE(NEW.realized_pnl, 0),
            updated_at = now()
        WHERE id = v_account_id;
        
        -- Also update trading_accounts current_balance
        UPDATE public.trading_accounts
        SET current_balance = current_balance + COALESCE(NEW.realized_pnl, 0),
            updated_at = now()
        WHERE id = NEW.trading_account_id;
      
      -- For UPDATE: if status changed from open to closed, add the P&L
      ELSIF TG_OP = 'UPDATE' AND OLD.status = 'open' AND NEW.status = 'closed' THEN
        UPDATE public.accounts 
        SET balance = balance + COALESCE(NEW.realized_pnl, 0),
            updated_at = now()
        WHERE id = v_account_id;
        
        UPDATE public.trading_accounts
        SET current_balance = current_balance + COALESCE(NEW.realized_pnl, 0),
            updated_at = now()
        WHERE id = NEW.trading_account_id;
      
      -- For UPDATE: if already closed trade P&L changes, adjust the difference
      ELSIF TG_OP = 'UPDATE' AND OLD.status = 'closed' AND NEW.status = 'closed' THEN
        UPDATE public.accounts 
        SET balance = balance + (COALESCE(NEW.realized_pnl, 0) - COALESCE(OLD.realized_pnl, 0)),
            updated_at = now()
        WHERE id = v_account_id;
        
        UPDATE public.trading_accounts
        SET current_balance = current_balance + (COALESCE(NEW.realized_pnl, 0) - COALESCE(OLD.realized_pnl, 0)),
            updated_at = now()
        WHERE id = NEW.trading_account_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to handle trade deletion (reverse the balance change)
CREATE OR REPLACE FUNCTION public.reverse_trading_account_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_account_id UUID;
BEGIN
  -- Only process if deleted trade was closed and had a trading_account_id
  IF OLD.status = 'closed' AND OLD.trading_account_id IS NOT NULL THEN
    SELECT account_id INTO v_account_id
    FROM public.trading_accounts
    WHERE id = OLD.trading_account_id;
    
    IF v_account_id IS NOT NULL THEN
      -- Reverse the realized P&L
      UPDATE public.accounts 
      SET balance = balance - COALESCE(OLD.realized_pnl, 0),
          updated_at = now()
      WHERE id = v_account_id;
      
      UPDATE public.trading_accounts
      SET current_balance = current_balance - COALESCE(OLD.realized_pnl, 0),
          updated_at = now()
      WHERE id = OLD.trading_account_id;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER on_trade_entry_balance_update
AFTER INSERT OR UPDATE ON public.trade_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_trading_account_balance();

-- Create trigger for DELETE
CREATE TRIGGER on_trade_entry_balance_delete
BEFORE DELETE ON public.trade_entries
FOR EACH ROW
EXECUTE FUNCTION public.reverse_trading_account_balance();