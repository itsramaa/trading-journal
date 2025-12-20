import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions, FeatureKey, SubscriptionTier } from '@/hooks/use-permissions';
import { Loader2 } from 'lucide-react';
import { UpgradePrompt } from '@/components/auth/PermissionGate';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredFeature?: FeatureKey;
  requiredTier?: SubscriptionTier;
  adminOnly?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requiredFeature,
  requiredTier,
  adminOnly = false 
}: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth();
  const { 
    hasPermission, 
    hasSubscription, 
    isAdmin, 
    isLoading: permissionsLoading 
  } = usePermissions();
  const location = useLocation();

  const isLoading = loading || permissionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the intended destination
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Admin check
  if (adminOnly && !isAdmin()) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">This page requires administrator access.</p>
        </div>
      </div>
    );
  }

  // Feature permission check
  if (requiredFeature && !isAdmin() && !hasPermission(requiredFeature)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <UpgradePrompt requiredTier={requiredTier || 'pro'} featureKey={requiredFeature} />
      </div>
    );
  }

  // Subscription tier check
  if (requiredTier && !isAdmin() && !hasSubscription(requiredTier)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <UpgradePrompt requiredTier={requiredTier} />
      </div>
    );
  }

  return <>{children}</>;
}
