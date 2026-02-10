
-- Phase 1a: Add exchange column to accounts
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS exchange text DEFAULT 'manual';

-- Backfill: accounts linked to binance trades get exchange='binance'
UPDATE public.accounts a
SET exchange = 'binance'
WHERE EXISTS (
  SELECT 1 FROM public.trade_entries te
  WHERE te.trading_account_id = a.id
    AND te.source = 'binance'
)
AND (a.exchange IS NULL OR a.exchange = 'manual');

-- Phase 1b: Create new version of get_trade_stats with p_account_id
CREATE OR REPLACE FUNCTION public.get_trade_stats(
  p_user_id uuid,
  p_status text DEFAULT 'closed',
  p_start_date timestamptz DEFAULT NULL,
  p_end_date timestamptz DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_pairs text[] DEFAULT NULL,
  p_directions text[] DEFAULT NULL,
  p_strategy_ids uuid[] DEFAULT NULL,
  p_sessions text[] DEFAULT NULL,
  p_trade_mode text DEFAULT NULL,
  p_account_id uuid DEFAULT NULL
)
RETURNS TABLE(
  total_trades bigint,
  total_pnl_gross numeric,
  total_pnl_net numeric,
  total_fees numeric,
  total_commission numeric,
  total_funding_fees numeric,
  win_count bigint,
  loss_count bigint,
  breakeven_count bigint,
  win_rate numeric,
  avg_pnl_per_trade numeric,
  avg_win numeric,
  avg_loss numeric,
  profit_factor numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_trades AS (
    SELECT 
      te.id,
      te.realized_pnl,
      te.pnl,
      COALESCE(te.commission, 0) as commission,
      COALESCE(te.funding_fees, 0) as funding_fees,
      COALESCE(te.fees, 0) as fees,
      te.result
    FROM trade_entries te
    WHERE te.user_id = p_user_id
      AND te.deleted_at IS NULL
      AND (p_status IS NULL OR te.status = p_status)
      AND (p_start_date IS NULL OR te.trade_date >= p_start_date)
      AND (p_end_date IS NULL OR te.trade_date <= p_end_date)
      AND (p_source IS NULL OR te.source = p_source)
      AND (p_pairs IS NULL OR te.pair = ANY(p_pairs))
      AND (p_directions IS NULL OR te.direction = ANY(p_directions))
      AND (p_sessions IS NULL OR te.session = ANY(p_sessions))
      AND (p_trade_mode IS NULL OR te.trade_mode = p_trade_mode)
      AND (p_account_id IS NULL OR te.trading_account_id = p_account_id)
      AND (
        p_strategy_ids IS NULL 
        OR EXISTS (
          SELECT 1 FROM trade_entry_strategies tes 
          WHERE tes.trade_entry_id = te.id 
          AND tes.strategy_id = ANY(p_strategy_ids)
        )
      )
  ),
  trade_stats AS (
    SELECT
      COUNT(*) as total_trades,
      COALESCE(SUM(COALESCE(realized_pnl, pnl, 0)), 0) as total_pnl_gross,
      COALESCE(SUM(COALESCE(realized_pnl, pnl, 0) - COALESCE(commission, 0) - COALESCE(funding_fees, 0)), 0) as total_pnl_net,
      COALESCE(SUM(COALESCE(fees, 0)), 0) as total_fees,
      COALESCE(SUM(COALESCE(commission, 0)), 0) as total_commission,
      COALESCE(SUM(COALESCE(funding_fees, 0)), 0) as total_funding_fees,
      COUNT(*) FILTER (WHERE COALESCE(realized_pnl, pnl, 0) > 0) as win_count,
      COUNT(*) FILTER (WHERE COALESCE(realized_pnl, pnl, 0) < 0) as loss_count,
      COUNT(*) FILTER (WHERE COALESCE(realized_pnl, pnl, 0) = 0) as breakeven_count,
      AVG(COALESCE(realized_pnl, pnl, 0)) as avg_pnl_per_trade,
      AVG(COALESCE(realized_pnl, pnl, 0)) FILTER (WHERE COALESCE(realized_pnl, pnl, 0) > 0) as avg_win,
      AVG(COALESCE(realized_pnl, pnl, 0)) FILTER (WHERE COALESCE(realized_pnl, pnl, 0) < 0) as avg_loss,
      COALESCE(SUM(COALESCE(realized_pnl, pnl, 0)) FILTER (WHERE COALESCE(realized_pnl, pnl, 0) > 0), 0) as sum_wins,
      ABS(COALESCE(SUM(COALESCE(realized_pnl, pnl, 0)) FILTER (WHERE COALESCE(realized_pnl, pnl, 0) < 0), 0)) as sum_losses
    FROM filtered_trades
  )
  SELECT
    ts.total_trades,
    ts.total_pnl_gross,
    ts.total_pnl_net,
    ts.total_fees,
    ts.total_commission,
    ts.total_funding_fees,
    ts.win_count,
    ts.loss_count,
    ts.breakeven_count,
    CASE WHEN ts.total_trades > 0 THEN (ts.win_count::numeric / ts.total_trades * 100) ELSE 0 END as win_rate,
    COALESCE(ts.avg_pnl_per_trade, 0) as avg_pnl_per_trade,
    COALESCE(ts.avg_win, 0) as avg_win,
    COALESCE(ts.avg_loss, 0) as avg_loss,
    CASE 
      WHEN ts.sum_losses > 0 THEN (ts.sum_wins / ts.sum_losses)
      WHEN ts.sum_wins > 0 THEN 999.99
      ELSE 0 
    END as profit_factor
  FROM trade_stats ts;
END;
$$;

-- Phase 1c: Create get_account_level_stats RPC
CREATE OR REPLACE FUNCTION public.get_account_level_stats(
  p_user_id uuid,
  p_status text DEFAULT 'closed',
  p_trade_mode text DEFAULT NULL
)
RETURNS TABLE(
  account_id uuid,
  account_name text,
  account_exchange text,
  total_trades bigint,
  total_pnl_gross numeric,
  total_pnl_net numeric,
  win_count bigint,
  loss_count bigint,
  win_rate numeric,
  avg_pnl_per_trade numeric,
  profit_factor numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id as account_id,
    a.name as account_name,
    COALESCE(a.exchange, 'manual') as account_exchange,
    COUNT(te.id) as total_trades,
    COALESCE(SUM(COALESCE(te.realized_pnl, te.pnl, 0)), 0) as total_pnl_gross,
    COALESCE(SUM(COALESCE(te.realized_pnl, te.pnl, 0) - COALESCE(te.commission, 0) - COALESCE(te.funding_fees, 0)), 0) as total_pnl_net,
    COUNT(te.id) FILTER (WHERE COALESCE(te.realized_pnl, te.pnl, 0) > 0) as win_count,
    COUNT(te.id) FILTER (WHERE COALESCE(te.realized_pnl, te.pnl, 0) < 0) as loss_count,
    CASE WHEN COUNT(te.id) > 0 
      THEN (COUNT(te.id) FILTER (WHERE COALESCE(te.realized_pnl, te.pnl, 0) > 0)::numeric / COUNT(te.id) * 100) 
      ELSE 0 
    END as win_rate,
    CASE WHEN COUNT(te.id) > 0 
      THEN COALESCE(AVG(COALESCE(te.realized_pnl, te.pnl, 0)), 0) 
      ELSE 0 
    END as avg_pnl_per_trade,
    CASE 
      WHEN ABS(COALESCE(SUM(COALESCE(te.realized_pnl, te.pnl, 0)) FILTER (WHERE COALESCE(te.realized_pnl, te.pnl, 0) < 0), 0)) > 0 
      THEN COALESCE(SUM(COALESCE(te.realized_pnl, te.pnl, 0)) FILTER (WHERE COALESCE(te.realized_pnl, te.pnl, 0) > 0), 0) / ABS(COALESCE(SUM(COALESCE(te.realized_pnl, te.pnl, 0)) FILTER (WHERE COALESCE(te.realized_pnl, te.pnl, 0) < 0), 0))
      WHEN COALESCE(SUM(COALESCE(te.realized_pnl, te.pnl, 0)) FILTER (WHERE COALESCE(te.realized_pnl, te.pnl, 0) > 0), 0) > 0 THEN 999.99
      ELSE 0
    END as profit_factor
  FROM public.accounts a
  LEFT JOIN public.trade_entries te 
    ON te.trading_account_id = a.id 
    AND te.user_id = p_user_id
    AND te.deleted_at IS NULL
    AND (p_status IS NULL OR te.status = p_status)
    AND (p_trade_mode IS NULL OR te.trade_mode = p_trade_mode)
  WHERE a.user_id = p_user_id
    AND a.deleted_at IS NULL
    AND a.is_active = true
  GROUP BY a.id, a.name, a.exchange
  ORDER BY total_pnl_net DESC;
END;
$$;
