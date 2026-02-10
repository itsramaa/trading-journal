
-- Phase 1: Foundation Schema for Professional Trading Journal
-- Adds session context to user_settings + enrichment/lifecycle fields to trade_entries

-- ============================================
-- 1. user_settings: Session Context Fields
-- ============================================
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS active_trade_mode text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS active_trading_style text NOT NULL DEFAULT 'short_trade';

-- Validation trigger for trade_mode
CREATE OR REPLACE FUNCTION public.validate_user_settings_mode()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.active_trade_mode NOT IN ('paper', 'live') THEN
    RAISE EXCEPTION 'active_trade_mode must be paper or live, got: %', NEW.active_trade_mode;
  END IF;
  IF NEW.active_trading_style NOT IN ('scalping', 'short_trade', 'swing') THEN
    RAISE EXCEPTION 'active_trading_style must be scalping, short_trade, or swing, got: %', NEW.active_trading_style;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_user_settings_mode ON public.user_settings;
CREATE TRIGGER trg_validate_user_settings_mode
  BEFORE INSERT OR UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_settings_mode();

-- ============================================
-- 2. trade_entries: Lifecycle & Enrichment Fields
-- ============================================

-- Trade context (immutable per trade)
ALTER TABLE public.trade_entries
  ADD COLUMN IF NOT EXISTS trade_mode text,
  ADD COLUMN IF NOT EXISTS trade_style text;

-- Trade state machine
ALTER TABLE public.trade_entries
  ADD COLUMN IF NOT EXISTS trade_state text NOT NULL DEFAULT 'active';

-- Strategy snapshot (immutable JSONB copy at trade creation time)
ALTER TABLE public.trade_entries
  ADD COLUMN IF NOT EXISTS strategy_snapshot jsonb;

-- Post-trade review
ALTER TABLE public.trade_entries
  ADD COLUMN IF NOT EXISTS trade_rating text;

-- Performance metrics
ALTER TABLE public.trade_entries
  ADD COLUMN IF NOT EXISTS r_multiple numeric;
ALTER TABLE public.trade_entries
  ADD COLUMN IF NOT EXISTS max_adverse_excursion numeric;

-- 3-Timeframe enrichment (execution is mandatory concept, enforced in app)
ALTER TABLE public.trade_entries
  ADD COLUMN IF NOT EXISTS execution_timeframe text;
ALTER TABLE public.trade_entries
  ADD COLUMN IF NOT EXISTS bias_timeframe text;
ALTER TABLE public.trade_entries
  ADD COLUMN IF NOT EXISTS precision_timeframe text;

-- Structured post-trade fields
ALTER TABLE public.trade_entries
  ADD COLUMN IF NOT EXISTS lesson_learned text;
ALTER TABLE public.trade_entries
  ADD COLUMN IF NOT EXISTS rule_compliance jsonb;

-- Validation trigger for trade_entries enums
CREATE OR REPLACE FUNCTION public.validate_trade_entry_enums()
RETURNS TRIGGER AS $$
BEGIN
  -- trade_mode validation (nullable for legacy data)
  IF NEW.trade_mode IS NOT NULL AND NEW.trade_mode NOT IN ('paper', 'live') THEN
    RAISE EXCEPTION 'trade_mode must be paper or live, got: %', NEW.trade_mode;
  END IF;

  -- trade_style validation (nullable for legacy data)
  IF NEW.trade_style IS NOT NULL AND NEW.trade_style NOT IN ('scalping', 'short_trade', 'swing') THEN
    RAISE EXCEPTION 'trade_style must be scalping, short_trade, or swing, got: %', NEW.trade_style;
  END IF;

  -- trade_state validation
  IF NEW.trade_state NOT IN ('opening', 'partially_filled', 'active', 'closed', 'canceled', 'liquidated') THEN
    RAISE EXCEPTION 'trade_state must be one of opening/partially_filled/active/closed/canceled/liquidated, got: %', NEW.trade_state;
  END IF;

  -- trade_rating validation (nullable)
  IF NEW.trade_rating IS NOT NULL AND NEW.trade_rating NOT IN ('A', 'B', 'C', 'D', 'F') THEN
    RAISE EXCEPTION 'trade_rating must be A/B/C/D/F, got: %', NEW.trade_rating;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_validate_trade_entry_enums ON public.trade_entries;
CREATE TRIGGER trg_validate_trade_entry_enums
  BEFORE INSERT OR UPDATE ON public.trade_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_trade_entry_enums();

-- ============================================
-- 3. Backfill existing data
-- ============================================

-- Set trade_mode based on existing source field
UPDATE public.trade_entries
SET trade_mode = CASE
  WHEN source = 'binance' THEN 'live'
  WHEN source = 'manual' THEN 'paper'
  ELSE 'live'
END
WHERE trade_mode IS NULL;

-- Set trade_state based on existing status field
UPDATE public.trade_entries
SET trade_state = CASE
  WHEN status = 'open' THEN 'active'
  WHEN status = 'closed' THEN 'closed'
  ELSE 'active'
END;

-- Migrate chart_timeframe to execution_timeframe for existing data
UPDATE public.trade_entries
SET execution_timeframe = chart_timeframe
WHERE chart_timeframe IS NOT NULL AND execution_timeframe IS NULL;
