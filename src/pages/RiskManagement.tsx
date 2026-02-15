/**
 * Risk Management Page - Per Trading Journey Markdown spec
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { QuickTip } from "@/components/ui/onboarding-tooltip";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Shield, AlertTriangle, History, LayoutDashboard, CheckCircle } from "lucide-react";
import { 
  DailyLossTracker, 
  RiskEventLog, 
  CorrelationMatrix,
  RiskProfileSummaryCard,
} from "@/components/risk";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { TooltipProvider, Tooltip as RadixTooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useRiskProfile } from "@/hooks/use-risk-profile";
import { useRiskEvents } from "@/hooks/use-risk-events";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";

export default function RiskManagement() {
  const { data: riskProfile, isLoading: profileLoading } = useRiskProfile();
  const { events: riskEvents } = useRiskEvents();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [retryKey, setRetryKey] = useState(0);

  const activeTab = searchParams.get("tab") || "overview";
  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  const navigateToSettings = () => {
    navigate('/settings?tab=trading');
  };

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={Shield}
          title="Risk Management"
          description="Configure and monitor your trading risk parameters"
        />
        <MetricsGridSkeleton />
      </div>
    );
  }

  return (
    <ErrorBoundary title="Risk Management" onRetry={() => setRetryKey(k => k + 1)}>
      <div key={retryKey} className="space-y-6" role="region" aria-label="Risk Management">
        <PageHeader
          icon={Shield}
          title="Risk Management"
          description="Configure and monitor your trading risk parameters"
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex">
            <TooltipProvider>
              <RadixTooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="overview" className="gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="hidden sm:inline">Overview</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent><p className="text-sm">Daily loss tracking, risk profile summary, alerts, and position correlation</p></TooltipContent>
              </RadixTooltip>
              <RadixTooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="history" className="gap-2">
                    <History className="h-4 w-4" />
                    <span className="hidden sm:inline">History</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent><p className="text-sm">Full log of risk events, liquidations, and margin changes</p></TooltipContent>
              </RadixTooltip>
            </TooltipProvider>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <QuickTip storageKey="risk-daily-limit">
              Your daily loss limit protects your capital. When you reach 100%, 
              new trades will be blocked until the next trading day. This is your 
              most important safeguard against overtrading.
            </QuickTip>
            
            <DailyLossTracker />
            
            <div className="grid gap-6 lg:grid-cols-2">
              <RiskProfileSummaryCard 
                riskProfile={riskProfile} 
                onConfigureClick={navigateToSettings} 
              />

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-chart-4" />
                    Risk Alerts
                    <InfoTooltip content="Recent threshold breaches and warnings from your daily loss tracker and correlation checks." />
                  </CardTitle>
                  <CardDescription>
                    Recent risk events and warnings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {riskEvents && riskEvents.length > 0 ? (
                    <div className="space-y-3">
                      {riskEvents.slice(0, 3).map((event) => (
                        <div 
                          key={event.id} 
                          className="flex items-start gap-3 p-2 rounded-lg bg-muted/50"
                        >
                          <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                            event.event_type.includes('limit_reached') || event.event_type.includes('disabled')
                              ? 'text-loss' 
                              : 'text-chart-4'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{event.message}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.created_at || event.event_date), 'MMM dd, HH:mm')}
                            </p>
                          </div>
                          <TooltipProvider>
                            <RadixTooltip>
                              <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {event.trigger_value.toFixed(0)}%
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent><p className="text-sm">The loss limit percentage that triggered this alert</p></TooltipContent>
                            </RadixTooltip>
                          </TooltipProvider>
                        </div>
                      ))}
                      {riskEvents.length > 3 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{riskEvents.length - 3} more events in History tab
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 py-4">
                      <CheckCircle className="h-8 w-8 text-profit" />
                      <div>
                        <p className="font-medium">All Clear</p>
                        <p className="text-sm text-muted-foreground">
                          No active risk alerts. Trading within parameters.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <CorrelationMatrix />
          </TabsContent>

          <TabsContent value="history">
            <RiskEventLog />
          </TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
