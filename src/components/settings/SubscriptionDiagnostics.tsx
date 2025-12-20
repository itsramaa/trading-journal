/**
 * Subscription Diagnostics Component
 * Shows real-time subscription data and allows force refresh
 */
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, CheckCircle2, XCircle, AlertTriangle, Crown, Database, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUserSettings, userSettingsKeys } from "@/hooks/use-user-settings";
import { usePermissions, FEATURES, SubscriptionTier } from "@/hooks/use-permissions";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

export function SubscriptionDiagnostics() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useUserSettings();
  const { subscription, hasSubscription, isAdmin, isLoading: permissionsLoading } = usePermissions();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleSyncRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Force invalidate all subscription-related caches
      await queryClient.invalidateQueries({ queryKey: userSettingsKeys.current() });
      await queryClient.invalidateQueries({ queryKey: ['user-subscription', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['user-roles', user?.id] });
      await queryClient.invalidateQueries({ queryKey: ['feature-permissions'] });

      // Refetch to get fresh data
      await refetchSettings();

      toast.success("Subscription data refreshed successfully!");
    } catch (error) {
      toast.error("Failed to refresh subscription data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = settingsLoading || permissionsLoading;

  // Parse dates
  const expiresAt = settings?.plan_expires_at ? new Date(settings.plan_expires_at) : null;
  const isExpired = expiresAt && expiresAt < new Date();
  const updatedAt = settings?.updated_at ? new Date(settings.updated_at) : null;

  // Permission test results
  const permissionTests: { label: string; feature: string; minTier: SubscriptionTier; hasAccess: boolean }[] = [
    { label: "Portfolio View (Free)", feature: FEATURES.PORTFOLIO_VIEW, minTier: "free", hasAccess: hasSubscription("free") },
    { label: "FIRE Calculator (Pro)", feature: FEATURES.FIRE_CALCULATOR, minTier: "pro", hasAccess: hasSubscription("pro") },
    { label: "Trading Journal (Pro)", feature: FEATURES.TRADING_JOURNAL, minTier: "pro", hasAccess: hasSubscription("pro") },
    { label: "API Access (Business)", feature: FEATURES.API_ACCESS, minTier: "business", hasAccess: hasSubscription("business") },
  ];

  const tierColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    pro: "bg-primary text-primary-foreground",
    business: "bg-yellow-500 text-yellow-950",
  };

  return (
    <Card className="border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle>Subscription Diagnostics</CardTitle>
              <CardDescription>Debug subscription state and permission gating</CardDescription>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncRefresh}
            disabled={isRefreshing || isLoading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
            Sync & Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Database Values */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Database Values (user_settings)
          </h4>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">subscription_plan</p>
              <Badge className={tierColors[settings?.subscription_plan || "free"]}>
                {settings?.subscription_plan || "free"}
              </Badge>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">subscription_status</p>
              <Badge variant={settings?.subscription_status === "active" ? "default" : "secondary"}>
                {settings?.subscription_status || "unknown"}
              </Badge>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">plan_expires_at</p>
              <div className="flex items-center gap-2">
                {expiresAt ? (
                  <>
                    <span className="text-sm font-medium">{format(expiresAt, "MMM d, yyyy")}</span>
                    {isExpired ? (
                      <XCircle className="h-4 w-4 text-destructive" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    )}
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">null</span>
                )}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">updated_at</p>
              <span className="text-sm font-medium">
                {updatedAt ? format(updatedAt, "MMM d, HH:mm:ss") : "—"}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Computed Values */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Computed Permission State
          </h4>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">Active Subscription (usePermissions)</p>
              <Badge className={tierColors[subscription]}>
                <Crown className="h-3 w-3 mr-1" />
                {subscription}
              </Badge>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">Is Admin</p>
              <Badge variant={isAdmin() ? "default" : "secondary"}>
                {isAdmin() ? "Yes" : "No"}
              </Badge>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground mb-1">User ID</p>
              <span className="text-xs font-mono break-all">{user?.id || "—"}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Permission Tests */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Permission Gating Tests</h4>
          <div className="space-y-2">
            {permissionTests.map((test) => (
              <div
                key={test.feature}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  {test.hasAccess ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-sm">{test.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    min: {test.minTier}
                  </Badge>
                  <Badge variant={test.hasAccess ? "default" : "secondary"} className="text-xs">
                    {test.hasAccess ? "ALLOWED" : "DENIED"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Summary */}
        <div className={cn(
          "rounded-lg p-4 flex items-center gap-3",
          subscription === "business" ? "bg-yellow-500/10 border border-yellow-500/30" :
          subscription === "pro" ? "bg-primary/10 border border-primary/30" :
          "bg-muted"
        )}>
          {subscription !== "free" ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium">Subscription Active</p>
                <p className="text-sm text-muted-foreground">
                  Your {subscription.toUpperCase()} plan is active and all features are unlocked.
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="font-medium">Free Plan Detected</p>
                <p className="text-sm text-muted-foreground">
                  If you upgraded but still see "free", try clicking "Sync & Refresh" above.
                </p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
