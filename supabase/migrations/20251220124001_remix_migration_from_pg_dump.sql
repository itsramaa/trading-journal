CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: account_transaction_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_transaction_type AS ENUM (
    'deposit',
    'withdrawal',
    'transfer_in',
    'transfer_out'
);


--
-- Name: account_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.account_type AS ENUM (
    'bank',
    'ewallet',
    'broker',
    'cash',
    'soft_wallet'
);


--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'user'
);


--
-- Name: subscription_tier; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_tier AS ENUM (
    'free',
    'pro',
    'business'
);


--
-- Name: get_user_subscription(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_subscription(_user_id uuid) RETURNS public.subscription_tier
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(
    (SELECT subscription_plan::public.subscription_tier 
     FROM public.user_settings 
     WHERE user_id = _user_id
     LIMIT 1),
    'free'::public.subscription_tier
  )
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.users_profile (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name');
  RETURN NEW;
END;
$$;


--
-- Name: handle_new_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user_role() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: has_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_permission(_user_id uuid, _feature_key text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.feature_permissions fp
    WHERE fp.feature_key = _feature_key
      AND (
        -- Admin bypass: admins have all permissions
        public.is_admin(_user_id)
        OR (
          -- Non-admin check: must meet subscription AND not be admin-only
          NOT fp.admin_only
          AND public.has_subscription(_user_id, fp.min_subscription)
        )
      )
  )
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: has_subscription(uuid, public.subscription_tier); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_subscription(_user_id uuid, _min_tier public.subscription_tier) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT CASE 
    WHEN _min_tier = 'free' THEN TRUE
    WHEN _min_tier = 'pro' THEN public.get_user_subscription(_user_id) IN ('pro', 'business')
    WHEN _min_tier = 'business' THEN public.get_user_subscription(_user_id) = 'business'
    ELSE FALSE
  END
$$;


--
-- Name: is_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;


--
-- Name: record_portfolio_snapshot(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.record_portfolio_snapshot(p_portfolio_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_total_value NUMERIC;
  v_total_cost NUMERIC;
  v_total_gain_loss NUMERIC;
  v_gain_loss_pct NUMERIC;
  v_currency TEXT;
BEGIN
  -- Get portfolio info
  SELECT user_id, currency 
  INTO v_user_id, v_currency
  FROM public.portfolios
  WHERE id = p_portfolio_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Portfolio not found';
  END IF;

  -- Calculate totals from holdings with price
  SELECT 
    COALESCE(SUM(
      h.quantity * COALESCE(pc.price, a.current_price, h.average_cost)
    ), 0),
    COALESCE(SUM(h.total_cost), 0)
  INTO v_total_value, v_total_cost
  FROM public.holdings h
  JOIN public.assets a ON a.id = h.asset_id
  LEFT JOIN public.price_cache pc ON UPPER(pc.symbol) = UPPER(a.symbol)
  WHERE h.portfolio_id = p_portfolio_id;

  v_total_gain_loss := v_total_value - v_total_cost;
  
  IF v_total_cost > 0 THEN
    v_gain_loss_pct := (v_total_gain_loss / v_total_cost) * 100;
  ELSE
    v_gain_loss_pct := 0;
  END IF;

  -- Insert history record
  INSERT INTO public.portfolio_history (
    user_id, portfolio_id, total_value, total_cost, 
    total_gain_loss, gain_loss_percentage, currency, recorded_at
  )
  VALUES (
    v_user_id, p_portfolio_id, v_total_value, v_total_cost,
    v_total_gain_loss, v_gain_loss_pct, v_currency, now()
  );
END;
$$;


--
-- Name: sync_budget_spent_amount(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_budget_spent_amount() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_category_id UUID;
  v_total_spent NUMERIC;
BEGIN
  -- Determine which category we're working with
  IF TG_OP = 'DELETE' THEN
    v_category_id := OLD.category_id;
  ELSE
    v_category_id := NEW.category_id;
  END IF;

  -- Calculate total spent for this category
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_spent
  FROM public.budget_transactions
  WHERE category_id = v_category_id;

  -- Update the category's spent_amount
  UPDATE public.budget_categories
  SET spent_amount = v_total_spent,
      updated_at = now()
  WHERE id = v_category_id;

  -- If we're updating and category changed, also update the old category
  IF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id THEN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total_spent
    FROM public.budget_transactions
    WHERE category_id = OLD.category_id;

    UPDATE public.budget_categories
    SET spent_amount = v_total_spent,
        updated_at = now()
    WHERE id = OLD.category_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: sync_holdings_from_transaction(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_holdings_from_transaction() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_asset_id UUID;
  v_portfolio_id UUID;
  v_user_id UUID;
  v_total_qty NUMERIC;
  v_total_cost NUMERIC;
  v_avg_cost NUMERIC;
BEGIN
  -- Determine which asset/portfolio/user we're working with
  IF TG_OP = 'DELETE' THEN
    v_asset_id := OLD.asset_id;
    v_portfolio_id := OLD.portfolio_id;
    v_user_id := OLD.user_id;
  ELSE
    v_asset_id := NEW.asset_id;
    v_portfolio_id := NEW.portfolio_id;
    v_user_id := NEW.user_id;
  END IF;

  -- Skip if no portfolio_id (some transactions might not be portfolio-linked)
  IF v_portfolio_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Calculate aggregates from all transactions for this asset in this portfolio
  SELECT 
    COALESCE(SUM(
      CASE 
        WHEN transaction_type IN ('BUY', 'TRANSFER_IN') THEN quantity
        WHEN transaction_type IN ('SELL', 'TRANSFER_OUT') THEN -quantity
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(
      CASE 
        WHEN transaction_type IN ('BUY', 'TRANSFER_IN') THEN total_amount
        WHEN transaction_type IN ('SELL', 'TRANSFER_OUT') THEN -total_amount
        ELSE 0
      END
    ), 0)
  INTO v_total_qty, v_total_cost
  FROM public.transactions
  WHERE asset_id = v_asset_id 
    AND portfolio_id = v_portfolio_id
    AND user_id = v_user_id;

  -- Calculate average cost (avoid division by zero)
  IF v_total_qty > 0 THEN
    v_avg_cost := v_total_cost / v_total_qty;
  ELSE
    v_avg_cost := 0;
  END IF;

  -- Ensure non-negative values
  v_total_qty := GREATEST(v_total_qty, 0);
  v_total_cost := GREATEST(v_total_cost, 0);

  -- Upsert the holding
  IF v_total_qty > 0 THEN
    INSERT INTO public.holdings (
      user_id, portfolio_id, asset_id, quantity, average_cost, total_cost, updated_at
    )
    VALUES (
      v_user_id, v_portfolio_id, v_asset_id, v_total_qty, v_avg_cost, v_total_cost, now()
    )
    ON CONFLICT (portfolio_id, asset_id) 
    DO UPDATE SET
      quantity = EXCLUDED.quantity,
      average_cost = EXCLUDED.average_cost,
      total_cost = EXCLUDED.total_cost,
      updated_at = now();
  ELSE
    -- If quantity is 0 or negative, delete the holding
    DELETE FROM public.holdings 
    WHERE portfolio_id = v_portfolio_id 
      AND asset_id = v_asset_id
      AND user_id = v_user_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;


--
-- Name: update_account_balance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_account_balance() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type IN ('deposit', 'transfer_in') THEN
      UPDATE public.accounts SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.account_id;
    ELSIF NEW.transaction_type IN ('withdrawal', 'transfer_out') THEN
      UPDATE public.accounts SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.account_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_accounts_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_accounts_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: update_emergency_fund_balance(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_emergency_fund_balance() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.transaction_type IN ('deposit', 'interest') THEN
      UPDATE public.emergency_funds 
      SET current_balance = current_balance + NEW.amount, updated_at = now() 
      WHERE id = NEW.emergency_fund_id;
    ELSIF NEW.transaction_type = 'withdrawal' THEN
      UPDATE public.emergency_funds 
      SET current_balance = current_balance - NEW.amount, updated_at = now() 
      WHERE id = NEW.emergency_fund_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.transaction_type IN ('deposit', 'interest') THEN
      UPDATE public.emergency_funds 
      SET current_balance = current_balance - OLD.amount, updated_at = now() 
      WHERE id = OLD.emergency_fund_id;
    ELSIF OLD.transaction_type = 'withdrawal' THEN
      UPDATE public.emergency_funds 
      SET current_balance = current_balance + OLD.amount, updated_at = now() 
      WHERE id = OLD.emergency_fund_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


SET default_table_access_method = heap;

--
-- Name: account_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id uuid NOT NULL,
    transaction_type public.account_transaction_type NOT NULL,
    amount numeric(24,8) NOT NULL,
    currency text NOT NULL,
    reference_id uuid,
    description text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    account_type public.account_type NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    balance numeric(24,8) DEFAULT 0 NOT NULL,
    description text,
    icon text,
    color text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    portfolio_id uuid,
    symbol text NOT NULL,
    name text NOT NULL,
    asset_type text NOT NULL,
    exchange text,
    sector text,
    logo_url text,
    current_price numeric(24,8),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    coingecko_id text,
    finnhub_symbol text,
    fcs_symbol text,
    alpha_symbol text
);


--
-- Name: budget_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id uuid,
    name text NOT NULL,
    icon text,
    color text,
    budgeted_amount numeric(24,8) DEFAULT 0 NOT NULL,
    spent_amount numeric(24,8) DEFAULT 0 NOT NULL,
    period text DEFAULT 'monthly'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: budget_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.budget_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id uuid,
    category_id uuid NOT NULL,
    amount numeric(24,8) NOT NULL,
    description text,
    transaction_date timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: debts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.debts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    debt_type text DEFAULT 'other'::text NOT NULL,
    original_balance numeric(24,8) NOT NULL,
    current_balance numeric(24,8) NOT NULL,
    interest_rate numeric(8,4) DEFAULT 0 NOT NULL,
    minimum_payment numeric(24,8) DEFAULT 0 NOT NULL,
    monthly_payment numeric(24,8) DEFAULT 0 NOT NULL,
    due_date integer,
    start_date date,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT debts_due_date_check CHECK (((due_date >= 1) AND (due_date <= 31)))
);


--
-- Name: emergency_fund_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_fund_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    emergency_fund_id uuid NOT NULL,
    account_id uuid,
    transaction_type text NOT NULL,
    amount numeric(24,8) NOT NULL,
    description text,
    transaction_date timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT emergency_fund_transactions_transaction_type_check CHECK ((transaction_type = ANY (ARRAY['deposit'::text, 'withdrawal'::text, 'interest'::text])))
);


--
-- Name: emergency_funds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emergency_funds (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text DEFAULT 'Emergency Fund'::text NOT NULL,
    current_balance numeric(24,8) DEFAULT 0 NOT NULL,
    monthly_expenses numeric(24,8) DEFAULT 0 NOT NULL,
    monthly_contribution numeric(24,8) DEFAULT 0 NOT NULL,
    target_months integer DEFAULT 6 NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature_key text NOT NULL,
    feature_name text NOT NULL,
    description text,
    min_subscription public.subscription_tier DEFAULT 'free'::public.subscription_tier NOT NULL,
    admin_only boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: financial_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    icon text DEFAULT 'other'::text NOT NULL,
    target_amount numeric DEFAULT 0 NOT NULL,
    current_amount numeric DEFAULT 0 NOT NULL,
    deadline date NOT NULL,
    monthly_contribution numeric DEFAULT 0 NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    color text DEFAULT 'blue'::text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: fire_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fire_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    current_age integer DEFAULT 30 NOT NULL,
    target_retirement_age integer DEFAULT 45 NOT NULL,
    monthly_income numeric DEFAULT 0 NOT NULL,
    monthly_expenses numeric DEFAULT 0 NOT NULL,
    expected_annual_return numeric DEFAULT 8 NOT NULL,
    inflation_rate numeric DEFAULT 3 NOT NULL,
    safe_withdrawal_rate numeric DEFAULT 4 NOT NULL,
    custom_fire_number numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: holdings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.holdings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    portfolio_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    quantity numeric(24,8) DEFAULT 0 NOT NULL,
    average_cost numeric(24,8) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    total_cost numeric(24,8) DEFAULT 0 NOT NULL
);


--
-- Name: portfolio_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    portfolio_id uuid,
    total_value numeric(24,8) NOT NULL,
    total_cost numeric(24,8) NOT NULL,
    total_gain_loss numeric(24,8) NOT NULL,
    gain_loss_percentage numeric(24,8) NOT NULL,
    currency text DEFAULT 'IDR'::text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: portfolios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    currency text DEFAULT 'IDR'::text NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: price_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    symbol text NOT NULL,
    target_price numeric(24,8) NOT NULL,
    condition text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    triggered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: price_cache; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_cache (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    symbol text NOT NULL,
    price numeric(24,8) NOT NULL,
    price_change_24h numeric(24,8),
    price_change_percentage_24h numeric(24,8),
    market_cap numeric(24,8),
    volume_24h numeric(24,8),
    currency text DEFAULT 'USD'::text NOT NULL,
    last_updated timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: trade_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trade_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    trading_account_id uuid,
    pair text NOT NULL,
    direction text NOT NULL,
    entry_price numeric(24,8) NOT NULL,
    exit_price numeric(24,8),
    stop_loss numeric(24,8),
    take_profit numeric(24,8),
    quantity numeric(24,8) DEFAULT 1 NOT NULL,
    pnl numeric(24,8) DEFAULT 0,
    fees numeric(24,8) DEFAULT 0,
    result text,
    market_condition text,
    confluence_score integer,
    entry_signal text,
    notes text,
    tags text[],
    trade_date timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    session_id uuid,
    status text DEFAULT 'closed'::text NOT NULL,
    realized_pnl numeric DEFAULT 0,
    CONSTRAINT trade_entries_status_check CHECK ((status = ANY (ARRAY['open'::text, 'closed'::text])))
);


--
-- Name: trade_entry_strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trade_entry_strategies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trade_entry_id uuid NOT NULL,
    strategy_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: trading_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trading_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    account_id uuid NOT NULL,
    name text NOT NULL,
    broker text,
    account_number text,
    initial_balance numeric(24,8) DEFAULT 0 NOT NULL,
    current_balance numeric(24,8) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_backtest boolean DEFAULT false NOT NULL
);


--
-- Name: trading_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trading_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_date date DEFAULT CURRENT_DATE NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone,
    mood text DEFAULT 'neutral'::text NOT NULL,
    rating integer DEFAULT 3 NOT NULL,
    trades_count integer DEFAULT 0 NOT NULL,
    pnl numeric DEFAULT 0 NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    notes text,
    market_condition text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trading_sessions_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: trading_strategies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trading_strategies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    tags text[] DEFAULT '{}'::text[],
    color text DEFAULT 'blue'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    portfolio_id uuid,
    asset_id uuid NOT NULL,
    transaction_type text NOT NULL,
    quantity numeric(24,8) NOT NULL,
    price_per_unit numeric(24,8) NOT NULL,
    total_amount numeric(24,8) NOT NULL,
    fee numeric(24,8) DEFAULT 0,
    transaction_date timestamp with time zone DEFAULT now() NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    account_id uuid
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'user'::public.app_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    default_currency text DEFAULT 'IDR'::text NOT NULL,
    theme text DEFAULT 'system'::text NOT NULL,
    notifications_enabled boolean DEFAULT true NOT NULL,
    language text DEFAULT 'id'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    subscription_plan text DEFAULT 'free'::text NOT NULL,
    subscription_status text DEFAULT 'active'::text NOT NULL,
    plan_expires_at timestamp with time zone,
    notify_price_alerts boolean DEFAULT true NOT NULL,
    notify_portfolio_updates boolean DEFAULT true NOT NULL,
    notify_weekly_report boolean DEFAULT false NOT NULL,
    notify_market_news boolean DEFAULT true NOT NULL,
    notify_email_enabled boolean DEFAULT true NOT NULL,
    notify_push_enabled boolean DEFAULT false NOT NULL,
    target_allocations jsonb DEFAULT '{"other": 5, "crypto": 20, "stock_id": 25, "stock_us": 40, "reksadana": 10}'::jsonb
);


--
-- Name: users_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users_profile (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    display_name text,
    avatar_url text,
    preferred_currency text DEFAULT 'IDR'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    bio text
);


--
-- Name: account_transactions account_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_transactions
    ADD CONSTRAINT account_transactions_pkey PRIMARY KEY (id);


--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: budget_categories budget_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_categories
    ADD CONSTRAINT budget_categories_pkey PRIMARY KEY (id);


--
-- Name: budget_transactions budget_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_transactions
    ADD CONSTRAINT budget_transactions_pkey PRIMARY KEY (id);


--
-- Name: debts debts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.debts
    ADD CONSTRAINT debts_pkey PRIMARY KEY (id);


--
-- Name: emergency_fund_transactions emergency_fund_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_fund_transactions
    ADD CONSTRAINT emergency_fund_transactions_pkey PRIMARY KEY (id);


--
-- Name: emergency_funds emergency_funds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_funds
    ADD CONSTRAINT emergency_funds_pkey PRIMARY KEY (id);


--
-- Name: feature_permissions feature_permissions_feature_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_permissions
    ADD CONSTRAINT feature_permissions_feature_key_key UNIQUE (feature_key);


--
-- Name: feature_permissions feature_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_permissions
    ADD CONSTRAINT feature_permissions_pkey PRIMARY KEY (id);


--
-- Name: financial_goals financial_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_goals
    ADD CONSTRAINT financial_goals_pkey PRIMARY KEY (id);


--
-- Name: fire_settings fire_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fire_settings
    ADD CONSTRAINT fire_settings_pkey PRIMARY KEY (id);


--
-- Name: holdings holdings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holdings
    ADD CONSTRAINT holdings_pkey PRIMARY KEY (id);


--
-- Name: holdings holdings_portfolio_asset_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holdings
    ADD CONSTRAINT holdings_portfolio_asset_unique UNIQUE (portfolio_id, asset_id);


--
-- Name: portfolio_history portfolio_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_history
    ADD CONSTRAINT portfolio_history_pkey PRIMARY KEY (id);


--
-- Name: portfolios portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);


--
-- Name: price_alerts price_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_pkey PRIMARY KEY (id);


--
-- Name: price_cache price_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_cache
    ADD CONSTRAINT price_cache_pkey PRIMARY KEY (id);


--
-- Name: price_cache price_cache_symbol_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_cache
    ADD CONSTRAINT price_cache_symbol_key UNIQUE (symbol);


--
-- Name: trade_entries trade_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_entries
    ADD CONSTRAINT trade_entries_pkey PRIMARY KEY (id);


--
-- Name: trade_entry_strategies trade_entry_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_entry_strategies
    ADD CONSTRAINT trade_entry_strategies_pkey PRIMARY KEY (id);


--
-- Name: trade_entry_strategies trade_entry_strategies_trade_entry_id_strategy_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_entry_strategies
    ADD CONSTRAINT trade_entry_strategies_trade_entry_id_strategy_id_key UNIQUE (trade_entry_id, strategy_id);


--
-- Name: trading_accounts trading_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trading_accounts
    ADD CONSTRAINT trading_accounts_pkey PRIMARY KEY (id);


--
-- Name: trading_sessions trading_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trading_sessions
    ADD CONSTRAINT trading_sessions_pkey PRIMARY KEY (id);


--
-- Name: trading_strategies trading_strategies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trading_strategies
    ADD CONSTRAINT trading_strategies_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: fire_settings unique_user_fire_settings; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fire_settings
    ADD CONSTRAINT unique_user_fire_settings UNIQUE (user_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: user_settings user_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);


--
-- Name: user_settings user_settings_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);


--
-- Name: users_profile users_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_profile
    ADD CONSTRAINT users_profile_pkey PRIMARY KEY (id);


--
-- Name: users_profile users_profile_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users_profile
    ADD CONSTRAINT users_profile_user_id_key UNIQUE (user_id);


--
-- Name: idx_account_transactions_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_transactions_account_id ON public.account_transactions USING btree (account_id);


--
-- Name: idx_account_transactions_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_transactions_created_at ON public.account_transactions USING btree (created_at DESC);


--
-- Name: idx_account_transactions_reference_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_transactions_reference_id ON public.account_transactions USING btree (reference_id);


--
-- Name: idx_account_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_transactions_user_id ON public.account_transactions USING btree (user_id);


--
-- Name: idx_accounts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_user_id ON public.accounts USING btree (user_id);


--
-- Name: idx_assets_alpha_symbol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_alpha_symbol ON public.assets USING btree (alpha_symbol) WHERE (alpha_symbol IS NOT NULL);


--
-- Name: idx_assets_coingecko_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_coingecko_id ON public.assets USING btree (coingecko_id) WHERE (coingecko_id IS NOT NULL);


--
-- Name: idx_assets_fcs_symbol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_fcs_symbol ON public.assets USING btree (fcs_symbol) WHERE (fcs_symbol IS NOT NULL);


--
-- Name: idx_assets_finnhub_symbol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_finnhub_symbol ON public.assets USING btree (finnhub_symbol) WHERE (finnhub_symbol IS NOT NULL);


--
-- Name: idx_assets_portfolio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_portfolio_id ON public.assets USING btree (portfolio_id);


--
-- Name: idx_assets_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_user_id ON public.assets USING btree (user_id);


--
-- Name: idx_budget_categories_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_categories_user_id ON public.budget_categories USING btree (user_id);


--
-- Name: idx_budget_transactions_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_transactions_category_id ON public.budget_transactions USING btree (category_id);


--
-- Name: idx_budget_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_budget_transactions_user_id ON public.budget_transactions USING btree (user_id);


--
-- Name: idx_feature_permissions_feature_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_feature_permissions_feature_key ON public.feature_permissions USING btree (feature_key);


--
-- Name: idx_holdings_portfolio_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holdings_portfolio_id ON public.holdings USING btree (portfolio_id);


--
-- Name: idx_holdings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_holdings_user_id ON public.holdings USING btree (user_id);


--
-- Name: idx_portfolio_history_recorded_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_history_recorded_at ON public.portfolio_history USING btree (recorded_at DESC);


--
-- Name: idx_portfolio_history_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolio_history_user_id ON public.portfolio_history USING btree (user_id);


--
-- Name: idx_portfolios_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portfolios_user_id ON public.portfolios USING btree (user_id);


--
-- Name: idx_price_alerts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_alerts_user_id ON public.price_alerts USING btree (user_id);


--
-- Name: idx_price_cache_symbol; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_price_cache_symbol ON public.price_cache USING btree (symbol);


--
-- Name: idx_trade_entries_trading_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_entries_trading_account_id ON public.trade_entries USING btree (trading_account_id);


--
-- Name: idx_trade_entries_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trade_entries_user_id ON public.trade_entries USING btree (user_id);


--
-- Name: idx_trading_accounts_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trading_accounts_account_id ON public.trading_accounts USING btree (account_id);


--
-- Name: idx_trading_accounts_is_backtest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trading_accounts_is_backtest ON public.trading_accounts USING btree (user_id, is_backtest);


--
-- Name: idx_trading_accounts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trading_accounts_user_id ON public.trading_accounts USING btree (user_id);


--
-- Name: idx_transactions_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_account_id ON public.transactions USING btree (account_id);


--
-- Name: idx_transactions_asset_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_asset_id ON public.transactions USING btree (asset_id);


--
-- Name: idx_transactions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_transactions_user_id ON public.transactions USING btree (user_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_user_settings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_settings_user_id ON public.user_settings USING btree (user_id);


--
-- Name: account_transactions on_account_transaction_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_account_transaction_insert AFTER INSERT ON public.account_transactions FOR EACH ROW EXECUTE FUNCTION public.update_account_balance();


--
-- Name: budget_transactions trigger_sync_budget_spent; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_budget_spent AFTER INSERT OR DELETE OR UPDATE ON public.budget_transactions FOR EACH ROW EXECUTE FUNCTION public.sync_budget_spent_amount();


--
-- Name: transactions trigger_sync_holdings; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_sync_holdings AFTER INSERT OR DELETE OR UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.sync_holdings_from_transaction();


--
-- Name: emergency_fund_transactions trigger_update_emergency_fund_balance; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_emergency_fund_balance AFTER INSERT OR DELETE ON public.emergency_fund_transactions FOR EACH ROW EXECUTE FUNCTION public.update_emergency_fund_balance();


--
-- Name: accounts update_accounts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_accounts_updated_at();


--
-- Name: debts update_debts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_debts_updated_at BEFORE UPDATE ON public.debts FOR EACH ROW EXECUTE FUNCTION public.update_accounts_updated_at();


--
-- Name: emergency_funds update_emergency_funds_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_emergency_funds_updated_at BEFORE UPDATE ON public.emergency_funds FOR EACH ROW EXECUTE FUNCTION public.update_accounts_updated_at();


--
-- Name: financial_goals update_financial_goals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_financial_goals_updated_at BEFORE UPDATE ON public.financial_goals FOR EACH ROW EXECUTE FUNCTION public.update_accounts_updated_at();


--
-- Name: trading_sessions update_trading_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_trading_sessions_updated_at BEFORE UPDATE ON public.trading_sessions FOR EACH ROW EXECUTE FUNCTION public.update_accounts_updated_at();


--
-- Name: account_transactions account_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_transactions
    ADD CONSTRAINT account_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: assets assets_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: budget_categories budget_categories_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_categories
    ADD CONSTRAINT budget_categories_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: budget_transactions budget_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_transactions
    ADD CONSTRAINT budget_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: budget_transactions budget_transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.budget_transactions
    ADD CONSTRAINT budget_transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.budget_categories(id) ON DELETE CASCADE;


--
-- Name: emergency_fund_transactions emergency_fund_transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_fund_transactions
    ADD CONSTRAINT emergency_fund_transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: emergency_fund_transactions emergency_fund_transactions_emergency_fund_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emergency_fund_transactions
    ADD CONSTRAINT emergency_fund_transactions_emergency_fund_id_fkey FOREIGN KEY (emergency_fund_id) REFERENCES public.emergency_funds(id) ON DELETE CASCADE;


--
-- Name: holdings holdings_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holdings
    ADD CONSTRAINT holdings_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: holdings holdings_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.holdings
    ADD CONSTRAINT holdings_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: portfolio_history portfolio_history_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_history
    ADD CONSTRAINT portfolio_history_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: price_alerts price_alerts_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: trade_entries trade_entries_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_entries
    ADD CONSTRAINT trade_entries_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.trading_sessions(id) ON DELETE SET NULL;


--
-- Name: trade_entries trade_entries_trading_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_entries
    ADD CONSTRAINT trade_entries_trading_account_id_fkey FOREIGN KEY (trading_account_id) REFERENCES public.trading_accounts(id) ON DELETE SET NULL;


--
-- Name: trade_entry_strategies trade_entry_strategies_strategy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_entry_strategies
    ADD CONSTRAINT trade_entry_strategies_strategy_id_fkey FOREIGN KEY (strategy_id) REFERENCES public.trading_strategies(id) ON DELETE CASCADE;


--
-- Name: trade_entry_strategies trade_entry_strategies_trade_entry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trade_entry_strategies
    ADD CONSTRAINT trade_entry_strategies_trade_entry_id_fkey FOREIGN KEY (trade_entry_id) REFERENCES public.trade_entries(id) ON DELETE CASCADE;


--
-- Name: trading_accounts trading_accounts_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trading_accounts
    ADD CONSTRAINT trading_accounts_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE SET NULL;


--
-- Name: transactions transactions_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: user_roles Admins can delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT WITH CHECK ((public.is_admin(auth.uid()) OR ((auth.uid() = user_id) AND (role = 'user'::public.app_role))));


--
-- Name: feature_permissions Admins can modify permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can modify permissions" ON public.feature_permissions USING (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins can update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE USING (public.is_admin(auth.uid()));


--
-- Name: feature_permissions Anyone can read permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read permissions" ON public.feature_permissions FOR SELECT USING (true);


--
-- Name: price_cache Anyone can view price cache; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view price cache" ON public.price_cache FOR SELECT USING (true);


--
-- Name: fire_settings Users can create their own FIRE settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own FIRE settings" ON public.fire_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: accounts Users can create their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own accounts" ON public.accounts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: price_alerts Users can create their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own alerts" ON public.price_alerts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: assets Users can create their own assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own assets" ON public.assets FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: budget_categories Users can create their own budget categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own budget categories" ON public.budget_categories FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: budget_transactions Users can create their own budget transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own budget transactions" ON public.budget_transactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: debts Users can create their own debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own debts" ON public.debts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: emergency_fund_transactions Users can create their own emergency fund transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own emergency fund transactions" ON public.emergency_fund_transactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: emergency_funds Users can create their own emergency funds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own emergency funds" ON public.emergency_funds FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: financial_goals Users can create their own financial goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own financial goals" ON public.financial_goals FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: holdings Users can create their own holdings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own holdings" ON public.holdings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: portfolio_history Users can create their own portfolio history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own portfolio history" ON public.portfolio_history FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: portfolios Users can create their own portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own portfolios" ON public.portfolios FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: users_profile Users can create their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own profile" ON public.users_profile FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_settings Users can create their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own settings" ON public.user_settings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: trading_strategies Users can create their own strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own strategies" ON public.trading_strategies FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: trade_entries Users can create their own trade entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own trade entries" ON public.trade_entries FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: trade_entry_strategies Users can create their own trade strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own trade strategies" ON public.trade_entry_strategies FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: trading_accounts Users can create their own trading accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own trading accounts" ON public.trading_accounts FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: trading_sessions Users can create their own trading sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own trading sessions" ON public.trading_sessions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: account_transactions Users can create their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own transactions" ON public.account_transactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: transactions Users can create their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create their own transactions" ON public.transactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: fire_settings Users can delete their own FIRE settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own FIRE settings" ON public.fire_settings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: accounts Users can delete their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own accounts" ON public.accounts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: price_alerts Users can delete their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own alerts" ON public.price_alerts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: assets Users can delete their own assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own assets" ON public.assets FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: budget_categories Users can delete their own budget categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own budget categories" ON public.budget_categories FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: budget_transactions Users can delete their own budget transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own budget transactions" ON public.budget_transactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: debts Users can delete their own debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own debts" ON public.debts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: emergency_fund_transactions Users can delete their own emergency fund transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own emergency fund transactions" ON public.emergency_fund_transactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: emergency_funds Users can delete their own emergency funds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own emergency funds" ON public.emergency_funds FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: financial_goals Users can delete their own financial goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own financial goals" ON public.financial_goals FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: holdings Users can delete their own holdings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own holdings" ON public.holdings FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: portfolios Users can delete their own portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own portfolios" ON public.portfolios FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: trading_strategies Users can delete their own strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own strategies" ON public.trading_strategies FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: trade_entries Users can delete their own trade entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own trade entries" ON public.trade_entries FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: trade_entry_strategies Users can delete their own trade strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own trade strategies" ON public.trade_entry_strategies FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: trading_accounts Users can delete their own trading accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own trading accounts" ON public.trading_accounts FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: trading_sessions Users can delete their own trading sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own trading sessions" ON public.trading_sessions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: transactions Users can delete their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own transactions" ON public.transactions FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: fire_settings Users can update their own FIRE settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own FIRE settings" ON public.fire_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: accounts Users can update their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own accounts" ON public.accounts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: price_alerts Users can update their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own alerts" ON public.price_alerts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: assets Users can update their own assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own assets" ON public.assets FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: budget_categories Users can update their own budget categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own budget categories" ON public.budget_categories FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: budget_transactions Users can update their own budget transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own budget transactions" ON public.budget_transactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: debts Users can update their own debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own debts" ON public.debts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: emergency_funds Users can update their own emergency funds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own emergency funds" ON public.emergency_funds FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: financial_goals Users can update their own financial goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own financial goals" ON public.financial_goals FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: holdings Users can update their own holdings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own holdings" ON public.holdings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: portfolios Users can update their own portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own portfolios" ON public.portfolios FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: users_profile Users can update their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own profile" ON public.users_profile FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_settings Users can update their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own settings" ON public.user_settings FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: trading_strategies Users can update their own strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own strategies" ON public.trading_strategies FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: trade_entries Users can update their own trade entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own trade entries" ON public.trade_entries FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: trading_accounts Users can update their own trading accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own trading accounts" ON public.trading_accounts FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: trading_sessions Users can update their own trading sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own trading sessions" ON public.trading_sessions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: transactions Users can update their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own transactions" ON public.transactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: fire_settings Users can view their own FIRE settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own FIRE settings" ON public.fire_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: accounts Users can view their own accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own accounts" ON public.accounts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: price_alerts Users can view their own alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own alerts" ON public.price_alerts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: assets Users can view their own assets; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own assets" ON public.assets FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: budget_categories Users can view their own budget categories; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own budget categories" ON public.budget_categories FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: budget_transactions Users can view their own budget transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own budget transactions" ON public.budget_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: debts Users can view their own debts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own debts" ON public.debts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: emergency_fund_transactions Users can view their own emergency fund transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own emergency fund transactions" ON public.emergency_fund_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: emergency_funds Users can view their own emergency funds; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own emergency funds" ON public.emergency_funds FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: financial_goals Users can view their own financial goals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own financial goals" ON public.financial_goals FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: holdings Users can view their own holdings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own holdings" ON public.holdings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: portfolio_history Users can view their own portfolio history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own portfolio history" ON public.portfolio_history FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: portfolios Users can view their own portfolios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own portfolios" ON public.portfolios FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: users_profile Users can view their own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own profile" ON public.users_profile FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_settings Users can view their own settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own settings" ON public.user_settings FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: trading_strategies Users can view their own strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own strategies" ON public.trading_strategies FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: trade_entries Users can view their own trade entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own trade entries" ON public.trade_entries FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: trade_entry_strategies Users can view their own trade strategies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own trade strategies" ON public.trade_entry_strategies FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: trading_accounts Users can view their own trading accounts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own trading accounts" ON public.trading_accounts FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: trading_sessions Users can view their own trading sessions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own trading sessions" ON public.trading_sessions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: account_transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.account_transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: transactions Users can view their own transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own transactions" ON public.transactions FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: account_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: assets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: budget_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.budget_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: debts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;

--
-- Name: emergency_fund_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emergency_fund_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: emergency_funds; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.emergency_funds ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: financial_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: fire_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fire_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: holdings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolio_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolio_history ENABLE ROW LEVEL SECURITY;

--
-- Name: portfolios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;

--
-- Name: price_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: price_cache; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

--
-- Name: trade_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trade_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: trade_entry_strategies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trade_entry_strategies ENABLE ROW LEVEL SECURITY;

--
-- Name: trading_accounts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

--
-- Name: trading_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trading_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: trading_strategies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trading_strategies ENABLE ROW LEVEL SECURITY;

--
-- Name: transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: user_settings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

--
-- Name: users_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;