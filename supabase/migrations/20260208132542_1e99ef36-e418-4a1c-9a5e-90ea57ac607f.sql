-- Update get_trade_stats to include session filtering
CREATE OR REPLACE FUNCTION public.get_trade_stats(
  p_user_id uuid, 
  p_status text DEFAULT 'closed'::text, 
  p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone, 
  p_source text DEFAULT NULL::text, 
  p_pairs text[] DEFAULT NULL::text[], 
  p_directions text[] DEFAULT NULL::text[], 
  p_strategy_ids uuid[] DEFAULT NULL::uuid[], 
  p_sessions text[] DEFAULT NULL::text[]
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
AS $function$
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
      te.result,
      te.direction,
      te.pair,
      te.trade_date,
      te.source,
      te.session
    FROM trade_entries te
    WHERE te.user_id = p_user_id
      AND te.deleted_at IS NULL
      AND (p_status IS NULL OR te.status = p_status)
      AND (p_start_date IS NULL OR te.trade_date >= p_start_date)
      AND (p_end_date IS NULL OR te.trade_date <= p_end_date)
      AND (p_source IS NULL OR te.source = p_source)
      AND (p_pairs IS NULL OR te.pair = ANY(p_pairs))
      AND (p_directions IS NULL OR te.direction = ANY(p_directions))
      -- Session filter now applied at DB level
      AND (p_sessions IS NULL OR te.session = ANY(p_sessions))
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
      -- Gross P&L (before fees)
      COALESCE(SUM(COALESCE(realized_pnl, pnl, 0)), 0) as total_pnl_gross,
      -- Net P&L (after fees)
      COALESCE(SUM(COALESCE(realized_pnl, pnl, 0) - COALESCE(commission, 0) - COALESCE(funding_fees, 0)), 0) as total_pnl_net,
      -- Fee breakdown
      COALESCE(SUM(COALESCE(fees, 0)), 0) as total_fees,
      COALESCE(SUM(COALESCE(commission, 0)), 0) as total_commission,
      COALESCE(SUM(COALESCE(funding_fees, 0)), 0) as total_funding_fees,
      -- Win/Loss counts
      COUNT(*) FILTER (WHERE COALESCE(realized_pnl, pnl, 0) > 0) as win_count,
      COUNT(*) FILTER (WHERE COALESCE(realized_pnl, pnl, 0) < 0) as loss_count,
      COUNT(*) FILTER (WHERE COALESCE(realized_pnl, pnl, 0) = 0) as breakeven_count,
      -- Average calculations
      AVG(COALESCE(realized_pnl, pnl, 0)) as avg_pnl_per_trade,
      AVG(COALESCE(realized_pnl, pnl, 0)) FILTER (WHERE COALESCE(realized_pnl, pnl, 0) > 0) as avg_win,
      AVG(COALESCE(realized_pnl, pnl, 0)) FILTER (WHERE COALESCE(realized_pnl, pnl, 0) < 0) as avg_loss,
      -- For profit factor
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
    CASE 
      WHEN ts.total_trades > 0 THEN (ts.win_count::numeric / ts.total_trades * 100)
      ELSE 0 
    END as win_rate,
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
$function$;