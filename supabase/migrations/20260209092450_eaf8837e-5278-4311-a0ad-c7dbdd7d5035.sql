-- Strategy Schema Enhancement: Add professional trading fields
-- Phase 1: Database Migration

-- Add methodology column (SMC, ICT, Price Action, etc.)
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS 
  methodology TEXT DEFAULT 'price_action';

-- Add trading style column (scalping, day_trading, swing, position)
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS 
  trading_style TEXT DEFAULT 'day_trading';

-- Add session preference array (london, ny, asian, all)
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS 
  session_preference TEXT[] DEFAULT ARRAY['all']::TEXT[];

-- Add higher timeframe for directional bias
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS 
  higher_timeframe TEXT;

-- Add lower timeframe for entry precision
ALTER TABLE trading_strategies ADD COLUMN IF NOT EXISTS 
  lower_timeframe TEXT;

-- Add comment for documentation
COMMENT ON COLUMN trading_strategies.methodology IS 'Trading methodology: indicator_based, price_action, smc, ict, wyckoff, elliott_wave, hybrid';
COMMENT ON COLUMN trading_strategies.trading_style IS 'Trading style: scalping, day_trading, swing, position';
COMMENT ON COLUMN trading_strategies.session_preference IS 'Preferred trading sessions: all, asian, london, ny';
COMMENT ON COLUMN trading_strategies.higher_timeframe IS 'Higher timeframe for directional bias (MTFA)';
COMMENT ON COLUMN trading_strategies.lower_timeframe IS 'Lower timeframe for entry precision (MTFA)';