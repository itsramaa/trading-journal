-- ============================================
-- TRIGGERS AND FUNCTIONS FOR NEW SCHEMA
-- ============================================

-- 1. Drop old triggers that reference dropped tables
DROP TRIGGER IF EXISTS update_trading_account_balance_trigger ON public.trade_entries;
DROP TRIGGER IF EXISTS reverse_trading_account_balance_trigger ON public.trade_entries;

-- 2. Function to sync holdings from portfolio_transactions
CREATE OR REPLACE FUNCTION public.sync_holdings_from_portfolio_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_asset_id UUID;
  v_portfolio_id UUID;
  v_user_id UUID;
  v_total_qty NUMERIC;
  v_total_cost NUMERIC;
  v_avg_cost NUMERIC;
BEGIN
  -- Determine which asset/portfolio/user we're working with
  IF TG_OP = 'DELETE' THEN
    v_asset_id := OLD.asset_id;
    v_portfolio_id := OLD.portfolio_id;
    v_user_id := OLD.user_id;
  ELSE
    v_asset_id := NEW.asset_id;
    v_portfolio_id := NEW.portfolio_id;
    v_user_id := NEW.user_id;
  END IF;

  -- Skip if no portfolio_id
  IF v_portfolio_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Calculate aggregates from all transactions for this asset in this portfolio
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN transaction_type IN ('BUY', 'TRANSFER_IN') THEN quantity
        WHEN transaction_type IN ('SELL', 'TRANSFER_OUT') THEN -quantity
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE 
        WHEN transaction_type IN ('BUY', 'TRANSFER_IN') THEN total_amount
        WHEN transaction_type IN ('SELL', 'TRANSFER_OUT') THEN -total_amount
        ELSE 0
      END
    ), 0)
  INTO v_total_qty, v_total_cost
  FROM public.portfolio_transactions
  WHERE asset_id = v_asset_id 
    AND portfolio_id = v_portfolio_id
    AND user_id = v_user_id;

  -- Calculate average cost (avoid division by zero)
  IF v_total_qty > 0 THEN
    v_avg_cost := v_total_cost / v_total_qty;
  ELSE
    v_avg_cost := 0;
  END IF;

  -- Ensure non-negative values
  v_total_qty := GREATEST(v_total_qty, 0);
  v_total_cost := GREATEST(v_total_cost, 0);

  -- Upsert the holding
  IF v_total_qty > 0 THEN
    INSERT INTO public.holdings (
      user_id, portfolio_id, asset_id, quantity, average_cost, total_cost, updated_at
    )
    VALUES (
      v_user_id, v_portfolio_id, v_asset_id, v_total_qty, v_avg_cost, v_total_cost, now()
    )
    ON CONFLICT (portfolio_id, asset_id) 
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      average_cost = EXCLUDED.average_cost,
      total_cost = EXCLUDED.total_cost,
      updated_at = now();
  ELSE
    -- If quantity is 0 or negative, delete the holding
    DELETE FROM public.holdings 
    WHERE portfolio_id = v_portfolio_id 
      AND asset_id = v_asset_id
      AND user_id = v_user_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create trigger for portfolio_transactions -> holdings sync
DROP TRIGGER IF EXISTS sync_holdings_trigger ON public.portfolio_transactions;
CREATE TRIGGER sync_holdings_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.portfolio_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_holdings_from_portfolio_transaction();

-- 4. Function to update account balance from portfolio transactions
CREATE OR REPLACE FUNCTION public.update_account_from_portfolio_tx()
RETURNS TRIGGER AS $$
DECLARE
  v_amount NUMERIC;
  v_account_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_account_id := NEW.payment_account_id;
    IF v_account_id IS NOT NULL THEN
      -- BUY/TRANSFER_IN = deduct from account, SELL/DIVIDEND = add to account
      IF NEW.transaction_type IN ('BUY', 'TRANSFER_IN') THEN
        v_amount := -NEW.total_amount;
      ELSIF NEW.transaction_type IN ('SELL', 'DIVIDEND', 'TRANSFER_OUT') THEN
        v_amount := NEW.total_amount;
      ELSE
        v_amount := 0;
      END IF;
      
      UPDATE public.accounts 
      SET balance = balance + v_amount, updated_at = now()
      WHERE id = v_account_id;
    END IF;
    RETURN NEW;
  
  ELSIF TG_OP = 'UPDATE' THEN
    -- Reverse old transaction
    IF OLD.payment_account_id IS NOT NULL THEN
      IF OLD.transaction_type IN ('BUY', 'TRANSFER_IN') THEN
        v_amount := OLD.total_amount;
      ELSIF OLD.transaction_type IN ('SELL', 'DIVIDEND', 'TRANSFER_OUT') THEN
        v_amount := -OLD.total_amount;
      ELSE
        v_amount := 0;
      END IF;
      UPDATE public.accounts SET balance = balance + v_amount, updated_at = now() WHERE id = OLD.payment_account_id;
    END IF;
    -- Apply new transaction
    IF NEW.payment_account_id IS NOT NULL THEN
      IF NEW.transaction_type IN ('BUY', 'TRANSFER_IN') THEN
        v_amount := -NEW.total_amount;
      ELSIF NEW.transaction_type IN ('SELL', 'DIVIDEND', 'TRANSFER_OUT') THEN
        v_amount := NEW.total_amount;
      ELSE
        v_amount := 0;
      END IF;
      UPDATE public.accounts SET balance = balance + v_amount, updated_at = now() WHERE id = NEW.payment_account_id;
    END IF;
    RETURN NEW;
  
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.payment_account_id IS NOT NULL THEN
      IF OLD.transaction_type IN ('BUY', 'TRANSFER_IN') THEN
        v_amount := OLD.total_amount;
      ELSIF OLD.transaction_type IN ('SELL', 'DIVIDEND', 'TRANSFER_OUT') THEN
        v_amount := -OLD.total_amount;
      ELSE
        v_amount := 0;
      END IF;
      UPDATE public.accounts SET balance = balance + v_amount, updated_at = now() WHERE id = OLD.payment_account_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. Create trigger for portfolio_transactions -> account balance sync
DROP TRIGGER IF EXISTS update_account_from_portfolio_tx_trigger ON public.portfolio_transactions;
CREATE TRIGGER update_account_from_portfolio_tx_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.portfolio_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_from_portfolio_tx();

-- 6. Function to update trading account (accounts with type 'trading') from trade entries
CREATE OR REPLACE FUNCTION public.update_trading_account_from_trade()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process when trade is closed and has a trading_account_id
  IF NEW.status = 'closed' AND NEW.trading_account_id IS NOT NULL THEN
    -- For INSERT of a closed trade, add the realized P&L directly to accounts
    IF TG_OP = 'INSERT' THEN
      UPDATE public.accounts 
      SET balance = balance + COALESCE(NEW.realized_pnl, 0), updated_at = now()
      WHERE id = NEW.trading_account_id;
    
    -- For UPDATE: if status changed from open to closed, add the P&L
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'open' AND NEW.status = 'closed' THEN
      UPDATE public.accounts 
      SET balance = balance + COALESCE(NEW.realized_pnl, 0), updated_at = now()
      WHERE id = NEW.trading_account_id;
    
    -- For UPDATE: if already closed trade P&L changes, adjust the difference
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'closed' AND NEW.status = 'closed' THEN
      UPDATE public.accounts 
      SET balance = balance + (COALESCE(NEW.realized_pnl, 0) - COALESCE(OLD.realized_pnl, 0)), updated_at = now()
      WHERE id = NEW.trading_account_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Create trigger for trade_entries -> trading account balance sync
DROP TRIGGER IF EXISTS update_trading_account_from_trade_trigger ON public.trade_entries;
CREATE TRIGGER update_trading_account_from_trade_trigger
  AFTER INSERT OR UPDATE ON public.trade_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_trading_account_from_trade();

-- 8. Function to reverse trading account balance when trade is deleted
CREATE OR REPLACE FUNCTION public.reverse_trading_account_from_trade()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status = 'closed' AND OLD.trading_account_id IS NOT NULL THEN
    UPDATE public.accounts 
    SET balance = balance - COALESCE(OLD.realized_pnl, 0), updated_at = now()
    WHERE id = OLD.trading_account_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Create trigger for trade deletion
DROP TRIGGER IF EXISTS reverse_trading_account_from_trade_trigger ON public.trade_entries;
CREATE TRIGGER reverse_trading_account_from_trade_trigger
  BEFORE DELETE ON public.trade_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_trading_account_from_trade();

-- 10. Function to sync budget category spent_amount from account_transactions
CREATE OR REPLACE FUNCTION public.sync_budget_from_account_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_category_id UUID;
  v_total_spent NUMERIC;
BEGIN
  -- Determine which category we're working with
  IF TG_OP = 'DELETE' THEN
    v_category_id := OLD.category_id;
  ELSE
    v_category_id := NEW.category_id;
  END IF;

  -- Skip if no category
  IF v_category_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Calculate total spent for this category from expense transactions
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_spent
  FROM public.account_transactions
  WHERE category_id = v_category_id
    AND transaction_type = 'expense';

  -- Update the category's spent_amount
  UPDATE public.budget_categories
  SET spent_amount = v_total_spent, updated_at = now()
  WHERE id = v_category_id;

  -- If category changed on update, also recalculate old category
  IF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id AND OLD.category_id IS NOT NULL THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total_spent
    FROM public.account_transactions WHERE category_id = OLD.category_id AND transaction_type = 'expense';
    UPDATE public.budget_categories SET spent_amount = v_total_spent, updated_at = now() WHERE id = OLD.category_id;
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 11. Create trigger for account_transactions -> budget category sync
DROP TRIGGER IF EXISTS sync_budget_from_account_transaction_trigger ON public.account_transactions;
CREATE TRIGGER sync_budget_from_account_transaction_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.account_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_budget_from_account_transaction();

-- 12. Add foreign key from trade_entries.trading_account_id to accounts
ALTER TABLE public.trade_entries 
  DROP CONSTRAINT IF EXISTS trade_entries_trading_account_id_fkey;
ALTER TABLE public.trade_entries 
  ADD CONSTRAINT trade_entries_trading_account_id_fkey 
  FOREIGN KEY (trading_account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;