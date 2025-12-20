import React from 'react';
import { usePermissions, FeatureKey, SubscriptionTier } from '@/hooks/use-permissions';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2, Lock, Crown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface PermissionGateProps {
  children: React.ReactNode;
  feature: FeatureKey;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}

// Component to gate access to features based on permissions
export function PermissionGate({ 
  children, 
  feature, 
  fallback,
  showUpgrade = true 
}: PermissionGateProps) {
  const { hasPermission, isLoading, isAuthenticated, requiresUpgrade, getRequiredTier } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (hasPermission(feature)) {
    return <>{children}</>;
  }

  if (requiresUpgrade(feature) && showUpgrade) {
    const requiredTier = getRequiredTier(feature);
    return (
      <UpgradePrompt 
        requiredTier={requiredTier || 'pro'} 
        featureKey={feature}
      />
    );
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <Lock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <CardTitle>Access Restricted</CardTitle>
        <CardDescription>
          You don't have permission to access this feature.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

interface UpgradePromptProps {
  requiredTier: SubscriptionTier;
  featureKey?: string;
}

export function UpgradePrompt({ requiredTier, featureKey }: UpgradePromptProps) {
  const tierNames: Record<SubscriptionTier, string> = {
    free: 'Free',
    pro: 'Pro',
    business: 'Business',
  };

  const tierColors: Record<SubscriptionTier, string> = {
    free: 'text-muted-foreground',
    pro: 'text-primary',
    business: 'text-yellow-500',
  };

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <Crown className={`h-12 w-12 mx-auto mb-4 ${tierColors[requiredTier]}`} />
        <CardTitle>Upgrade Required</CardTitle>
        <CardDescription>
          This feature requires a <span className={`font-semibold ${tierColors[requiredTier]}`}>{tierNames[requiredTier]}</span> subscription.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button asChild>
          <Link to="/upgrade">
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to {tierNames[requiredTier]}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface AdminGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Component to gate access to admin-only features
export function AdminGate({ children, fallback }: AdminGateProps) {
  const { isAdmin, isLoading, isAuthenticated } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (isAdmin()) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader className="text-center">
        <Lock className="h-12 w-12 mx-auto text-destructive mb-4" />
        <CardTitle>Admin Access Required</CardTitle>
        <CardDescription>
          This feature is only available to administrators.
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

interface SubscriptionGateProps {
  children: React.ReactNode;
  minTier: SubscriptionTier;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}

// Component to gate access based on subscription tier
export function SubscriptionGate({ 
  children, 
  minTier, 
  fallback,
  showUpgrade = true 
}: SubscriptionGateProps) {
  const { hasSubscription, isLoading, isAuthenticated, isAdmin } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (isAdmin() || hasSubscription(minTier)) {
    return <>{children}</>;
  }

  if (showUpgrade) {
    return <UpgradePrompt requiredTier={minTier} />;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
}
