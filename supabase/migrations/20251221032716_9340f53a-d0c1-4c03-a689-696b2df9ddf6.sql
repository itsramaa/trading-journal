-- ============================================
-- STEP 2: EXTEND ENUMS
-- ============================================

-- Extend account_type enum
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'investment';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'emergency';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'goal_savings';
ALTER TYPE public.account_type ADD VALUE IF NOT EXISTS 'trading';

-- Extend account_transaction_type enum
ALTER TYPE public.account_transaction_type ADD VALUE IF NOT EXISTS 'expense';
ALTER TYPE public.account_transaction_type ADD VALUE IF NOT EXISTS 'income';
ALTER TYPE public.account_transaction_type ADD VALUE IF NOT EXISTS 'transfer';