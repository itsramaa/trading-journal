
-- Atomic batch insert RPC for sync pipeline
-- Wraps insert in a transaction: if one row fails, entire batch rolls back
CREATE OR REPLACE FUNCTION public.batch_insert_trades(p_trades jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  inserted_count integer;
BEGIN
  INSERT INTO trade_entries (
    user_id, pair, direction, entry_price, exit_price,
    quantity, realized_pnl, pnl, fees, commission,
    commission_asset, funding_fees, entry_datetime, exit_datetime,
    trade_date, hold_time_minutes, leverage, margin_type,
    is_maker, entry_order_type, exit_order_type, result,
    status, source, binance_trade_id, binance_order_id
  )
  SELECT
    (t->>'user_id')::uuid,
    t->>'pair', t->>'direction',
    (t->>'entry_price')::numeric, (t->>'exit_price')::numeric,
    (t->>'quantity')::numeric, (t->>'realized_pnl')::numeric,
    (t->>'pnl')::numeric, (t->>'fees')::numeric,
    (t->>'commission')::numeric, t->>'commission_asset',
    (t->>'funding_fees')::numeric,
    (t->>'entry_datetime')::timestamptz, (t->>'exit_datetime')::timestamptz,
    (t->>'trade_date')::timestamptz, (t->>'hold_time_minutes')::integer,
    (t->>'leverage')::integer, t->>'margin_type',
    (t->>'is_maker')::boolean, t->>'entry_order_type',
    t->>'exit_order_type', t->>'result',
    t->>'status', t->>'source',
    t->>'binance_trade_id', (t->>'binance_order_id')::bigint
  FROM jsonb_array_elements(p_trades) AS t;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;

  RETURN jsonb_build_object('inserted', inserted_count);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('error', SQLERRM, 'inserted', 0);
END;
$$;
