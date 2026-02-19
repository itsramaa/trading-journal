
-- Fix trigger functions that incorrectly reference 'trading_accounts' 
-- The correct table is 'accounts', and trading_account_id in trade_entries references accounts.id directly

CREATE OR REPLACE FUNCTION public.update_trading_account_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only process when trade is closed and has a trading_account_id
  IF NEW.status = 'closed' AND NEW.trading_account_id IS NOT NULL THEN
    -- For INSERT of a closed trade, add the realized P&L
    IF TG_OP = 'INSERT' THEN
      UPDATE public.accounts 
      SET balance = balance + COALESCE(NEW.realized_pnl, 0),
          updated_at = now()
      WHERE id = NEW.trading_account_id;
    
    -- For UPDATE: if status changed from open to closed, add the P&L
    ELSIF TG_OP = 'UPDATE' AND OLD.status != 'closed' AND NEW.status = 'closed' THEN
      UPDATE public.accounts 
      SET balance = balance + COALESCE(NEW.realized_pnl, 0),
          updated_at = now()
      WHERE id = NEW.trading_account_id;
    
    -- For UPDATE: if already closed trade P&L changes, adjust the difference
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'closed' AND NEW.status = 'closed' THEN
      UPDATE public.accounts 
      SET balance = balance + (COALESCE(NEW.realized_pnl, 0) - COALESCE(OLD.realized_pnl, 0)),
          updated_at = now()
      WHERE id = NEW.trading_account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reverse_trading_account_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only process if deleted trade was closed and had a trading_account_id
  IF OLD.status = 'closed' AND OLD.trading_account_id IS NOT NULL THEN
    -- Reverse the realized P&L directly on accounts
    UPDATE public.accounts 
    SET balance = balance - COALESCE(OLD.realized_pnl, 0),
        updated_at = now()
    WHERE id = OLD.trading_account_id;
  END IF;
  
  RETURN OLD;
END;
$function$;
