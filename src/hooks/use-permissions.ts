import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

export type AppRole = 'admin' | 'user';
export type SubscriptionTier = 'free' | 'pro' | 'business';

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}

export interface FeaturePermission {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  min_subscription: SubscriptionTier;
  admin_only: boolean;
}

// Feature keys for type safety
export const FEATURES = {
  // Free tier
  PORTFOLIO_VIEW: 'portfolio.view',
  PORTFOLIO_CREATE: 'portfolio.create',
  TRANSACTIONS_VIEW: 'transactions.view',
  TRANSACTIONS_CREATE: 'transactions.create',
  ACCOUNTS_VIEW: 'accounts.view',
  ACCOUNTS_CREATE: 'accounts.create',
  
  // Pro tier
  ANALYTICS_ADVANCED: 'analytics.advanced',
  TRADING_JOURNAL: 'trading.journal',
  TRADING_SESSIONS: 'trading.sessions',
  TRADING_AI_ANALYSIS: 'trading.ai_analysis',
  PORTFOLIO_AI_INSIGHTS: 'portfolio.ai_insights',
  FIRE_CALCULATOR: 'fire.calculator',
  FIRE_GOALS: 'fire.goals',
  FIRE_BUDGET: 'fire.budget',
  EXPORT_DATA: 'export.data',
  ALERTS_PRICE: 'alerts.price',
  
  // Business tier
  API_ACCESS: 'api.access',
  REPORTS_CUSTOM: 'reports.custom',
  MULTI_PORTFOLIO: 'multi_portfolio',
  
  // Admin only
  ADMIN_USERS: 'admin.users',
  ADMIN_ROLES: 'admin.roles',
  ADMIN_BILLING: 'admin.billing',
} as const;

export type FeatureKey = typeof FEATURES[keyof typeof FEATURES];

// Hook to fetch user roles
export function useUserRoles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-roles', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook to fetch all feature permissions
export function useFeaturePermissions() {
  return useQuery({
    queryKey: ['feature-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_permissions')
        .select('*');
      
      if (error) throw error;
      return data as FeaturePermission[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour (permissions rarely change)
  });
}

// Hook to get user subscription from user_settings
export function useUserSubscription() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return 'free' as SubscriptionTier;
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('subscription_plan, subscription_status, plan_expires_at')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        // If no settings exist, default to free
        if (error.code === 'PGRST116') return 'free' as SubscriptionTier;
        throw error;
      }
      
      // Check if subscription is active and not expired
      const isActive = data.subscription_status === 'active';
      const notExpired = !data.plan_expires_at || new Date(data.plan_expires_at) > new Date();
      
      if (isActive && notExpired) {
        return data.subscription_plan as SubscriptionTier;
      }
      
      return 'free' as SubscriptionTier;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60, // 1 minute (subscription can change)
  });
}

// Main hook for checking permissions
export function usePermissions() {
  const { user, isAuthenticated } = useAuth();
  const { data: roles = [], isLoading: rolesLoading } = useUserRoles();
  const { data: permissions = [], isLoading: permissionsLoading } = useFeaturePermissions();
  const { data: subscription = 'free', isLoading: subscriptionLoading } = useUserSubscription();

  const isLoading = rolesLoading || permissionsLoading || subscriptionLoading;

  // Check if user has a specific role
  const hasRole = (role: AppRole): boolean => {
    if (!isAuthenticated) return false;
    return roles.some(r => r.role === role);
  };

  // Check if user is admin
  const isAdmin = (): boolean => hasRole('admin');

  // Check if user has minimum subscription tier
  const hasSubscription = (minTier: SubscriptionTier): boolean => {
    if (!isAuthenticated) return false;
    
    const tierOrder: Record<SubscriptionTier, number> = {
      free: 0,
      pro: 1,
      business: 2,
    };
    
    return tierOrder[subscription] >= tierOrder[minTier];
  };

  // Check if user has permission for a feature
  const hasPermission = (featureKey: FeatureKey): boolean => {
    if (!isAuthenticated) return false;
    
    // Admins have all permissions
    if (isAdmin()) return true;
    
    const permission = permissions.find(p => p.feature_key === featureKey);
    if (!permission) return false;
    
    // Admin-only features require admin role
    if (permission.admin_only) return false;
    
    // Check subscription tier
    return hasSubscription(permission.min_subscription);
  };

  // Get required tier for a feature
  const getRequiredTier = (featureKey: FeatureKey): SubscriptionTier | null => {
    const permission = permissions.find(p => p.feature_key === featureKey);
    if (!permission) return null;
    return permission.min_subscription;
  };

  // Check if feature requires upgrade
  const requiresUpgrade = (featureKey: FeatureKey): boolean => {
    if (!isAuthenticated) return false;
    if (isAdmin()) return false;
    
    const permission = permissions.find(p => p.feature_key === featureKey);
    if (!permission) return false;
    if (permission.admin_only) return false;
    
    return !hasSubscription(permission.min_subscription);
  };

  return {
    isLoading,
    isAuthenticated,
    user,
    roles,
    subscription,
    isAdmin,
    hasRole,
    hasSubscription,
    hasPermission,
    getRequiredTier,
    requiresUpgrade,
    permissions,
  };
}

// Simple hook for permission guards
export function useRequirePermission(featureKey: FeatureKey) {
  const { hasPermission, isLoading, isAuthenticated, requiresUpgrade, getRequiredTier } = usePermissions();

  return {
    isAllowed: hasPermission(featureKey),
    isLoading,
    isAuthenticated,
    requiresUpgrade: requiresUpgrade(featureKey),
    requiredTier: getRequiredTier(featureKey),
  };
}

// Hook for admin-only features
export function useRequireAdmin() {
  const { isAdmin, isLoading, isAuthenticated } = usePermissions();

  return {
    isAllowed: isAdmin(),
    isLoading,
    isAuthenticated,
  };
}
