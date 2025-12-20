-- Update feature_permissions keys to match code constants
UPDATE public.feature_permissions SET feature_key = 'portfolio.view' WHERE feature_key = 'portfolio_view';
UPDATE public.feature_permissions SET feature_key = 'transactions.view' WHERE feature_key = 'transactions_view';
UPDATE public.feature_permissions SET feature_key = 'accounts.view' WHERE feature_key = 'accounts_view';
UPDATE public.feature_permissions SET feature_key = 'alerts.price' WHERE feature_key = 'price_alerts';
UPDATE public.feature_permissions SET feature_key = 'analytics.advanced' WHERE feature_key = 'analytics_advanced';
UPDATE public.feature_permissions SET feature_key = 'trading.journal' WHERE feature_key = 'trading_journal';
UPDATE public.feature_permissions SET feature_key = 'trading.sessions' WHERE feature_key = 'trading_sessions';
UPDATE public.feature_permissions SET feature_key = 'fire.calculator' WHERE feature_key = 'fire_calculator';
UPDATE public.feature_permissions SET feature_key = 'fire.budget' WHERE feature_key = 'fire_budget';
UPDATE public.feature_permissions SET feature_key = 'fire.goals' WHERE feature_key = 'fire_goals';
UPDATE public.feature_permissions SET feature_key = 'portfolio.ai_insights' WHERE feature_key = 'ai_insights';
UPDATE public.feature_permissions SET feature_key = 'export.data' WHERE feature_key = 'export_data';
UPDATE public.feature_permissions SET feature_key = 'multi_portfolio' WHERE feature_key = 'multi_portfolio';
UPDATE public.feature_permissions SET feature_key = 'admin.users' WHERE feature_key = 'admin_panel';

-- Add missing feature permissions that exist in code but not in database
INSERT INTO public.feature_permissions (feature_key, feature_name, description, min_subscription, admin_only)
VALUES 
  ('portfolio.create', 'Create Portfolio', 'Create new portfolios', 'free', false),
  ('transactions.create', 'Create Transactions', 'Add new transactions', 'free', false),
  ('accounts.create', 'Create Accounts', 'Add new accounts', 'free', false),
  ('trading.ai_analysis', 'Trading AI Analysis', 'AI-powered trading analysis', 'pro', false),
  ('api.access', 'API Access', 'Access to API', 'business', false),
  ('reports.custom', 'Custom Reports', 'Generate custom reports', 'business', false),
  ('admin.roles', 'Admin Roles', 'Manage user roles', 'business', true),
  ('admin.billing', 'Admin Billing', 'Manage billing', 'business', true)
ON CONFLICT (feature_key) DO NOTHING;