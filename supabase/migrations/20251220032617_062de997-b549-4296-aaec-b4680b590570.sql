-- Create app_role enum for role types
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create subscription_tier enum for subscription levels
CREATE TYPE public.subscription_tier AS ENUM ('free', 'pro', 'business');

-- Create user_roles table (separate from profiles per security best practices)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role public.app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create security definer function to get user subscription tier
CREATE OR REPLACE FUNCTION public.get_user_subscription(_user_id UUID)
RETURNS public.subscription_tier
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT subscription_plan::public.subscription_tier 
     FROM public.user_settings 
     WHERE user_id = _user_id
     LIMIT 1),
    'free'::public.subscription_tier
  )
$$;

-- Create function to check if user has minimum subscription tier
CREATE OR REPLACE FUNCTION public.has_subscription(_user_id UUID, _min_tier public.subscription_tier)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE 
    WHEN _min_tier = 'free' THEN TRUE
    WHEN _min_tier = 'pro' THEN public.get_user_subscription(_user_id) IN ('pro', 'business')
    WHEN _min_tier = 'business' THEN public.get_user_subscription(_user_id) = 'business'
    ELSE FALSE
  END
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- RLS Policies for user_roles table
-- Users can view their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Only admins can insert roles
CREATE POLICY "Admins can insert roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (public.is_admin(auth.uid()) OR (auth.uid() = user_id AND role = 'user'));

-- Only admins can update roles
CREATE POLICY "Admins can update roles" 
ON public.user_roles 
FOR UPDATE 
USING (public.is_admin(auth.uid()));

-- Only admins can delete roles
CREATE POLICY "Admins can delete roles" 
ON public.user_roles 
FOR DELETE 
USING (public.is_admin(auth.uid()));

-- Create trigger to auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to create user role on auth.users insert
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Create permissions table for fine-grained access control
CREATE TABLE public.feature_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature_key TEXT NOT NULL UNIQUE,
    feature_name TEXT NOT NULL,
    description TEXT,
    min_subscription public.subscription_tier NOT NULL DEFAULT 'free',
    admin_only BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.feature_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can read permissions (needed for UI to show/hide features)
CREATE POLICY "Anyone can read permissions" 
ON public.feature_permissions 
FOR SELECT 
USING (TRUE);

-- Only admins can modify permissions
CREATE POLICY "Admins can modify permissions" 
ON public.feature_permissions 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Insert default feature permissions
INSERT INTO public.feature_permissions (feature_key, feature_name, description, min_subscription, admin_only) VALUES
-- Free tier features
('portfolio.view', 'View Portfolio', 'View portfolio dashboard and holdings', 'free', FALSE),
('portfolio.create', 'Create Portfolio', 'Create new portfolios', 'free', FALSE),
('transactions.view', 'View Transactions', 'View transaction history', 'free', FALSE),
('transactions.create', 'Add Transactions', 'Add new transactions', 'free', FALSE),
('accounts.view', 'View Accounts', 'View account balances', 'free', FALSE),
('accounts.create', 'Create Accounts', 'Create new accounts', 'free', FALSE),

-- Pro tier features
('analytics.advanced', 'Advanced Analytics', 'Access advanced analytics and charts', 'pro', FALSE),
('trading.journal', 'Trading Journal', 'Access trading journal features', 'pro', FALSE),
('trading.sessions', 'Trading Sessions', 'Track trading sessions', 'pro', FALSE),
('trading.ai_analysis', 'AI Trading Analysis', 'AI-powered trading insights', 'pro', FALSE),
('portfolio.ai_insights', 'AI Portfolio Insights', 'AI-powered portfolio analysis', 'pro', FALSE),
('fire.calculator', 'FIRE Calculator', 'Financial independence calculator', 'pro', FALSE),
('fire.goals', 'Financial Goals', 'Goal tracking and planning', 'pro', FALSE),
('fire.budget', 'Budget Tracker', 'Budget management tools', 'pro', FALSE),
('export.data', 'Export Data', 'Export portfolio and transaction data', 'pro', FALSE),
('alerts.price', 'Price Alerts', 'Set price alerts for assets', 'pro', FALSE),

-- Business tier features
('api.access', 'API Access', 'Programmatic API access', 'business', FALSE),
('reports.custom', 'Custom Reports', 'Generate custom reports', 'business', FALSE),
('multi_portfolio', 'Multiple Portfolios', 'Manage unlimited portfolios', 'business', FALSE),

-- Admin only features
('admin.users', 'Manage Users', 'View and manage all users', 'free', TRUE),
('admin.roles', 'Manage Roles', 'Assign and remove user roles', 'free', TRUE),
('admin.billing', 'Manage Billing', 'View and manage billing', 'free', TRUE);

-- Function to check if user has permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Create index for performance
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_feature_permissions_feature_key ON public.feature_permissions(feature_key);