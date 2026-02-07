-- Phase 4: Add missing columns for enhanced trade data
-- These columns enable storing detailed trade information from userTrades endpoint

-- Add leverage tracking
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS leverage INTEGER;

-- Add margin type (isolated/cross)
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS margin_type TEXT;

-- Add maker/taker indicator for fee calculation
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS is_maker BOOLEAN;

-- Add order type tracking
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS entry_order_type TEXT;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS exit_order_type TEXT;

-- Add hold time for position duration analysis
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS hold_time_minutes INTEGER;

-- Add funding fees tracking (separate from commission)
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS funding_fees NUMERIC DEFAULT 0;

-- Add index for faster binance_order_id lookups
CREATE INDEX IF NOT EXISTS idx_trade_entries_binance_order_id 
  ON trade_entries(binance_order_id) WHERE binance_order_id IS NOT NULL;

-- Add index for binance_trade_id which is used for deduplication
CREATE INDEX IF NOT EXISTS idx_trade_entries_binance_trade_id 
  ON trade_entries(binance_trade_id) WHERE binance_trade_id IS NOT NULL;

-- Comment explaining the columns
COMMENT ON COLUMN trade_entries.leverage IS 'Position leverage multiplier (e.g., 10, 20, 50)';
COMMENT ON COLUMN trade_entries.margin_type IS 'Margin mode: isolated or cross';
COMMENT ON COLUMN trade_entries.is_maker IS 'True if trade was maker (lower fees), false for taker';
COMMENT ON COLUMN trade_entries.entry_order_type IS 'Order type: LIMIT, MARKET, STOP, etc.';
COMMENT ON COLUMN trade_entries.exit_order_type IS 'Exit order type: LIMIT, MARKET, STOP_MARKET, etc.';
COMMENT ON COLUMN trade_entries.hold_time_minutes IS 'Duration position was held in minutes';
COMMENT ON COLUMN trade_entries.funding_fees IS 'Total funding fees paid/received during position hold';