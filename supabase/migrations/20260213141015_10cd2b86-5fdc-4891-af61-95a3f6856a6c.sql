-- Prevent core field updates on live/binance trades (server-side immutability)
CREATE OR REPLACE FUNCTION public.prevent_live_trade_core_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.source = 'binance' OR OLD.trade_mode = 'live' THEN
    IF NEW.entry_price IS DISTINCT FROM OLD.entry_price
       OR NEW.direction IS DISTINCT FROM OLD.direction
       OR NEW.quantity IS DISTINCT FROM OLD.quantity
       OR NEW.stop_loss IS DISTINCT FROM OLD.stop_loss
    THEN
      RAISE EXCEPTION 'Cannot modify core fields of live/binance trades';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_prevent_live_trade_core_update
  BEFORE UPDATE ON public.trade_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_live_trade_core_update();