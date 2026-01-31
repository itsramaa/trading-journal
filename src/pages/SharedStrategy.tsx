/**
 * SharedStrategy - Public view for shared strategies (authenticated users only)
 */
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  TrendingUp, 
  Shield, 
  Target, 
  Tag, 
  ArrowLeft,
  Copy,
  CheckCircle2,
  XCircle,
  Share2,
  Lock,
  AlertTriangle
} from "lucide-react";
import { useSharedStrategy, useStrategySharing } from "@/hooks/use-strategy-sharing";
import { useAuth } from "@/hooks/use-auth";
import type { EntryRule, ExitRule } from "@/types/strategy";

export default function SharedStrategy() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: isAuthLoading } = useAuth();
  
  const { data: strategy, isLoading, error } = useSharedStrategy(token || '');
  const { cloneStrategy } = useStrategySharing();

  const handleClone = async () => {
    if (!token) return;
    try {
      await cloneStrategy.mutateAsync(token);
      navigate('/strategy');
    } catch {
      // Error handled by mutation
    }
  };

  // Show login prompt if not authenticated
  if (!isAuthLoading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto p-3 rounded-full bg-primary/10 w-fit mb-4">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              You need to be logged in to view shared strategies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => navigate('/auth')} className="w-full">
              Sign In to View
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || isAuthLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !strategy) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="p-4 rounded-full bg-loss/10 mb-4">
            <AlertTriangle className="h-10 w-10 text-loss" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Strategy Not Found</h2>
          <p className="text-muted-foreground text-center mb-6">
            This strategy may have been deleted or sharing was disabled by the owner.
          </p>
          <Button onClick={() => navigate('/strategy')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Strategies
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const entryRules = (strategy.entry_rules as unknown as EntryRule[] | null) || [];
  const exitRules = (strategy.exit_rules as unknown as ExitRule[] | null) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{strategy.name}</h1>
                  <Badge variant="outline" className="text-xs">
                    <Share2 className="h-3 w-3 mr-1" />
                    Shared
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  {strategy.description || 'No description provided'}
                </p>
              </div>
            </div>
          </div>
          <Button onClick={handleClone} disabled={cloneStrategy.isPending}>
            <Copy className="h-4 w-4 mr-2" />
            {cloneStrategy.isPending ? 'Cloning...' : 'Clone to My Account'}
          </Button>
        </div>

        {/* Alert */}
        <Alert>
          <Share2 className="h-4 w-4" />
          <AlertTitle>Shared Strategy</AlertTitle>
          <AlertDescription>
            This strategy was shared by another trader. Clone it to your account to use it in your trades and backtests.
          </AlertDescription>
        </Alert>

        {/* Strategy Details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Strategy Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {strategy.timeframe && (
                <Badge variant="outline">
                  <Clock className="h-3 w-3 mr-1" />
                  {strategy.timeframe}
                </Badge>
              )}
              <Badge variant="outline">
                <TrendingUp className="h-3 w-3 mr-1" />
                {strategy.market_type || 'spot'}
              </Badge>
              <Badge variant="outline">
                <Shield className="h-3 w-3 mr-1" />
                {strategy.min_confluences || 4} confluences
              </Badge>
              <Badge variant="outline">
                <Target className="h-3 w-3 mr-1" />
                {strategy.min_rr || 1.5}:1 R:R
              </Badge>
            </div>

            {/* Tags */}
            {strategy.tags && strategy.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {strategy.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Valid Pairs */}
            {strategy.valid_pairs && strategy.valid_pairs.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Valid Pairs</p>
                <div className="flex flex-wrap gap-1">
                  {strategy.valid_pairs.map((pair: string) => (
                    <Badge key={pair} variant="outline" className="text-xs">
                      {pair}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Entry Rules */}
        {entryRules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-profit" />
                Entry Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {entryRules.map((rule, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                  >
                    <Badge variant={rule.is_mandatory ? "default" : "secondary"} className="text-xs mt-0.5">
                      {rule.is_mandatory ? 'Required' : 'Optional'}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium capitalize">
                        {rule.type.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {rule.condition}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Exit Rules */}
        {exitRules.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <XCircle className="h-5 w-5 text-loss" />
                Exit Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {exitRules.map((rule, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border"
                  >
                    <Badge variant="outline" className="text-xs mt-0.5 capitalize">
                      {rule.type.replace('_', ' ')}
                    </Badge>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {rule.value} {rule.unit}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Clone CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-6 text-center">
            <h3 className="font-semibold mb-2">Ready to use this strategy?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Clone it to your account to track trades, run backtests, and analyze performance.
            </p>
            <Button onClick={handleClone} disabled={cloneStrategy.isPending}>
              <Copy className="h-4 w-4 mr-2" />
              {cloneStrategy.isPending ? 'Cloning...' : 'Clone Strategy'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
