-- Backfill null trade_mode to 'live' for binance trades
UPDATE trade_entries SET trade_mode = 'live' WHERE trade_mode IS NULL AND source = 'binance';

-- Set default for future inserts
ALTER TABLE trade_entries ALTER COLUMN trade_mode SET DEFAULT 'live';