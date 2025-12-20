-- Seed feature_permissions with required RBAC permissions
INSERT INTO public.feature_permissions (feature_key, feature_name, description, min_subscription, admin_only)
VALUES 
  ('portfolio_view', 'View Portfolio', 'View portfolio holdings and balances', 'free', false),
  ('transactions_view', 'View Transactions', 'View transaction history', 'free', false),
  ('accounts_view', 'View Accounts', 'View account balances', 'free', false),
  ('analytics_advanced', 'Advanced Analytics', 'Access advanced portfolio analytics', 'pro', false),
  ('fire_calculator', 'FIRE Calculator', 'Financial independence calculator', 'pro', false),
  ('fire_budget', 'Budget Management', 'Budget tracking and management', 'pro', false),
  ('fire_goals', 'Financial Goals', 'Set and track financial goals', 'pro', false),
  ('trading_journal', 'Trading Journal', 'Log and analyze trades', 'pro', false),
  ('trading_sessions', 'Trading Sessions', 'Track trading sessions', 'pro', false),
  ('ai_insights', 'AI Insights', 'AI-powered portfolio insights', 'pro', false),
  ('price_alerts', 'Price Alerts', 'Set price alerts on assets', 'free', false),
  ('export_data', 'Export Data', 'Export transaction history', 'pro', false),
  ('multi_portfolio', 'Multiple Portfolios', 'Manage multiple portfolios', 'pro', false),
  ('admin_panel', 'Admin Panel', 'Access admin configuration', 'business', true)
ON CONFLICT (feature_key) DO NOTHING;

-- Grant service role permission to insert/update price_cache
CREATE POLICY "Service role can manage price cache"
ON public.price_cache
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Also allow authenticated users to read price cache (already exists but ensuring)
-- The existing policy "Anyone can view price cache" should cover this