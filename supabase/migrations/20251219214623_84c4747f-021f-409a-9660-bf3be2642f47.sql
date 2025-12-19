-- =====================================================
-- TASK 1: Holdings Sync Trigger (Transactions → Holdings)
-- =====================================================

-- Function to sync holdings when transactions are created/updated/deleted
CREATE OR REPLACE FUNCTION public.sync_holdings_from_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Skip if no portfolio_id (some transactions might not be portfolio-linked)
  IF v_portfolio_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
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
  FROM public.transactions
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

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create unique constraint on holdings for upsert to work
ALTER TABLE public.holdings 
DROP CONSTRAINT IF EXISTS holdings_portfolio_asset_unique;

ALTER TABLE public.holdings 
ADD CONSTRAINT holdings_portfolio_asset_unique 
UNIQUE (portfolio_id, asset_id);

-- Create trigger for transactions
DROP TRIGGER IF EXISTS trigger_sync_holdings ON public.transactions;

CREATE TRIGGER trigger_sync_holdings
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_holdings_from_transaction();

-- =====================================================
-- TASK 2: Budget Spent Amount Sync Trigger
-- =====================================================

-- Function to sync budget_categories.spent_amount from budget_transactions
CREATE OR REPLACE FUNCTION public.sync_budget_spent_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Calculate total spent for this category
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_spent
  FROM public.budget_transactions
  WHERE category_id = v_category_id;

  -- Update the category's spent_amount
  UPDATE public.budget_categories
  SET spent_amount = v_total_spent,
      updated_at = now()
  WHERE id = v_category_id;

  -- If we're updating and category changed, also update the old category
  IF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_spent
    FROM public.budget_transactions
    WHERE category_id = OLD.category_id;

    UPDATE public.budget_categories
    SET spent_amount = v_total_spent,
        updated_at = now()
    WHERE id = OLD.category_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for budget_transactions
DROP TRIGGER IF EXISTS trigger_sync_budget_spent ON public.budget_transactions;

CREATE TRIGGER trigger_sync_budget_spent
AFTER INSERT OR UPDATE OR DELETE ON public.budget_transactions
FOR EACH ROW
EXECUTE FUNCTION public.sync_budget_spent_amount();

-- =====================================================
-- TASK 3: Portfolio History Recording Helper
-- =====================================================

-- Function to record current portfolio snapshot (can be called by cron/edge function)
CREATE OR REPLACE FUNCTION public.record_portfolio_snapshot(p_portfolio_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_total_value NUMERIC;
  v_total_cost NUMERIC;
  v_total_gain_loss NUMERIC;
  v_gain_loss_pct NUMERIC;
  v_currency TEXT;
BEGIN
  -- Get portfolio info
  SELECT user_id, currency 
  INTO v_user_id, v_currency
  FROM public.portfolios
  WHERE id = p_portfolio_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Portfolio not found';
  END IF;

  -- Calculate totals from holdings with price
  SELECT 
    COALESCE(SUM(
      h.quantity * COALESCE(pc.price, a.current_price, h.average_cost)
    ), 0),
    COALESCE(SUM(h.total_cost), 0)
  INTO v_total_value, v_total_cost
  FROM public.holdings h
  JOIN public.assets a ON a.id = h.asset_id
  LEFT JOIN public.price_cache pc ON UPPER(pc.symbol) = UPPER(a.symbol)
  WHERE h.portfolio_id = p_portfolio_id;

  v_total_gain_loss := v_total_value - v_total_cost;
  
  IF v_total_cost > 0 THEN
    v_gain_loss_pct := (v_total_gain_loss / v_total_cost) * 100;
  ELSE
    v_gain_loss_pct := 0;
  END IF;

  -- Insert history record
  INSERT INTO public.portfolio_history (
    user_id, portfolio_id, total_value, total_cost, 
    total_gain_loss, gain_loss_percentage, currency, recorded_at
  )
  VALUES (
    v_user_id, p_portfolio_id, v_total_value, v_total_cost,
    v_total_gain_loss, v_gain_loss_pct, v_currency, now()
  );
END;
$$;

-- =====================================================
-- TASK 4: Initial Data Reconciliation
-- =====================================================

-- Reconcile all existing holdings based on transactions
-- This will fix any existing data inconsistencies
DO $$
DECLARE
  rec RECORD;
BEGIN
  -- For each unique portfolio/asset combination in transactions
  FOR rec IN 
    SELECT DISTINCT 
      t.user_id, 
      t.portfolio_id, 
      t.asset_id
    FROM public.transactions t
    WHERE t.portfolio_id IS NOT NULL
  LOOP
    -- Trigger the sync by doing a dummy update (this will activate our trigger)
    -- Actually, let's just calculate directly
    DECLARE
      v_total_qty NUMERIC;
      v_total_cost NUMERIC;
      v_avg_cost NUMERIC;
    BEGIN
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
      FROM public.transactions
      WHERE asset_id = rec.asset_id 
        AND portfolio_id = rec.portfolio_id
        AND user_id = rec.user_id;

      v_total_qty := GREATEST(v_total_qty, 0);
      v_total_cost := GREATEST(v_total_cost, 0);
      
      IF v_total_qty > 0 THEN
        v_avg_cost := v_total_cost / v_total_qty;
        
        INSERT INTO public.holdings (
          user_id, portfolio_id, asset_id, quantity, average_cost, total_cost, updated_at
        )
        VALUES (
          rec.user_id, rec.portfolio_id, rec.asset_id, v_total_qty, v_avg_cost, v_total_cost, now()
        )
        ON CONFLICT (portfolio_id, asset_id) 
        DO UPDATE SET
          quantity = EXCLUDED.quantity,
          average_cost = EXCLUDED.average_cost,
          total_cost = EXCLUDED.total_cost,
          updated_at = now();
      END IF;
    END;
  END LOOP;

  -- Reconcile budget spent amounts
  UPDATE public.budget_categories bc
  SET spent_amount = COALESCE((
    SELECT SUM(amount) 
    FROM public.budget_transactions bt 
    WHERE bt.category_id = bc.id
  ), 0),
  updated_at = now();
END $$;