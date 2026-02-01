-- Phase 1: Critical Issues Resolution
-- 1.1 Balance Reconciliation System - Discrepancy tracking table
-- 1.3 Backtest Accuracy Disclaimer - Add metadata columns

-- Create account_balance_discrepancies table for reconciliation tracking
CREATE TABLE public.account_balance_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  expected_balance NUMERIC NOT NULL,
  actual_balance NUMERIC NOT NULL,
  discrepancy NUMERIC NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_method TEXT CHECK (resolution_method IN ('auto_fix', 'manual', 'ignored')),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.account_balance_discrepancies ENABLE ROW LEVEL SECURITY;

-- RLS policies for account_balance_discrepancies
CREATE POLICY "Users can view own discrepancies" 
ON public.account_balance_discrepancies FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own discrepancies"
ON public.account_balance_discrepancies FOR UPDATE
USING (auth.uid() = user_id);

-- Index for efficient queries
CREATE INDEX idx_account_balance_discrepancies_user_id 
ON public.account_balance_discrepancies (user_id);

CREATE INDEX idx_account_balance_discrepancies_unresolved 
ON public.account_balance_discrepancies (user_id, resolved) 
WHERE resolved = false;

-- Add backtest accuracy metadata columns to backtest_results
ALTER TABLE public.backtest_results 
ADD COLUMN assumptions JSONB DEFAULT '{}'::jsonb,
ADD COLUMN accuracy_notes TEXT,
ADD COLUMN simulation_version TEXT DEFAULT 'v1-simplified';