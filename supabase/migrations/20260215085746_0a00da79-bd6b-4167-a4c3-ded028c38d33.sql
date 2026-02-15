
ALTER TABLE trading_strategies
  ADD COLUMN IF NOT EXISTS position_sizing_model text DEFAULT 'fixed_percent',
  ADD COLUMN IF NOT EXISTS position_sizing_value numeric DEFAULT 2,
  ADD COLUMN IF NOT EXISTS trade_management jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_leverage integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS margin_mode text DEFAULT 'cross';
