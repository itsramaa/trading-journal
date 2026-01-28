-- Migration: Drop deprecated tables (Portfolio/Financial Freedom features)
-- Using CASCADE to handle dependencies

-- First drop ALL triggers explicitly on portfolio_transactions
DROP TRIGGER IF EXISTS trigger_sync_holdings ON portfolio_transactions;
DROP TRIGGER IF EXISTS on_portfolio_transaction_holdings_sync ON portfolio_transactions;
DROP TRIGGER IF EXISTS on_portfolio_transaction_account_update ON portfolio_transactions;
DROP TRIGGER IF EXISTS sync_holdings_trigger ON portfolio_transactions;
DROP TRIGGER IF EXISTS update_account_trigger ON portfolio_transactions;
DROP TRIGGER IF EXISTS on_budget_expense_account_update ON account_transactions;

-- Drop functions with CASCADE
DROP FUNCTION IF EXISTS sync_holdings_from_transaction() CASCADE;
DROP FUNCTION IF EXISTS sync_holdings_from_portfolio_transaction() CASCADE;
DROP FUNCTION IF EXISTS update_account_from_portfolio_transaction() CASCADE;
DROP FUNCTION IF EXISTS update_account_from_portfolio_tx() CASCADE;
DROP FUNCTION IF EXISTS update_account_from_budget_expense() CASCADE;
DROP FUNCTION IF EXISTS update_account_from_emergency_fund_transaction() CASCADE;
DROP FUNCTION IF EXISTS sync_budget_from_account_transaction() CASCADE;
DROP FUNCTION IF EXISTS sync_budget_spent_amount() CASCADE;
DROP FUNCTION IF EXISTS update_emergency_fund_balance() CASCADE;
DROP FUNCTION IF EXISTS record_portfolio_snapshot(uuid) CASCADE;

-- Drop tables with CASCADE
DROP TABLE IF EXISTS portfolio_history CASCADE;
DROP TABLE IF EXISTS holdings CASCADE;
DROP TABLE IF EXISTS portfolio_transactions CASCADE;
DROP TABLE IF EXISTS portfolios CASCADE;
DROP TABLE IF EXISTS price_alerts CASCADE;
DROP TABLE IF EXISTS price_cache CASCADE;
DROP TABLE IF EXISTS assets CASCADE;
DROP TABLE IF EXISTS debts CASCADE;
DROP TABLE IF EXISTS financial_goals CASCADE;
DROP TABLE IF EXISTS fire_settings CASCADE;
DROP TABLE IF EXISTS budget_categories CASCADE;
DROP TABLE IF EXISTS account_links CASCADE;