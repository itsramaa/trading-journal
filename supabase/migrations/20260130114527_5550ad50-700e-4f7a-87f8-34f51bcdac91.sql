-- Add new columns to trading_strategies for backtesting & YouTube import
ALTER TABLE public.trading_strategies
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_url TEXT NULL,
ADD COLUMN IF NOT EXISTS validation_score INTEGER DEFAULT 100,
ADD COLUMN IF NOT EXISTS automation_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS difficulty_level TEXT NULL;

-- Create backtest_results table
CREATE TABLE IF NOT EXISTS public.backtest_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  strategy_id UUID REFERENCES public.trading_strategies(id) ON DELETE CASCADE,
  pair TEXT NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  initial_capital DECIMAL NOT NULL DEFAULT 10000,
  final_capital DECIMAL NOT NULL DEFAULT 10000,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  trades JSONB NOT NULL DEFAULT '[]'::jsonb,
  equity_curve JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on backtest_results
ALTER TABLE public.backtest_results ENABLE ROW LEVEL SECURITY;

-- RLS policies for backtest_results
CREATE POLICY "Users can view their own backtest results"
ON public.backtest_results
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own backtest results"
ON public.backtest_results
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backtest results"
ON public.backtest_results
FOR DELETE
USING (auth.uid() = user_id);