-- Add Binance trade tracking columns to trade_entries
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS binance_trade_id TEXT;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS binance_order_id BIGINT;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS commission_asset TEXT;

-- Index untuk prevent duplicates dari Binance
CREATE UNIQUE INDEX IF NOT EXISTS idx_trade_entries_binance_trade_id 
ON trade_entries(binance_trade_id) WHERE binance_trade_id IS NOT NULL;