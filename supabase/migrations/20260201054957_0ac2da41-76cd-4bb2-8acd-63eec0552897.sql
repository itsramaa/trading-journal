-- Remove trading_sessions completely (0 rows, unused feature)

-- Step 1: Drop FK constraint on trade_entries
ALTER TABLE trade_entries 
DROP CONSTRAINT IF EXISTS trade_entries_session_id_fkey;

-- Step 2: Drop session_id column from trade_entries
ALTER TABLE trade_entries 
DROP COLUMN IF EXISTS session_id;

-- Step 3: Drop trading_sessions table
DROP TABLE IF EXISTS trading_sessions;