/**
 * Trading Dashboard - Main overview showing trading performance
 * Layout: Clean 2-column grid with clear visual hierarchy
 */
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickTip, OnboardingTooltip } from "@/components/ui/onboarding-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskSummaryCard } from "@/components/risk/RiskSummaryCard";
import { RiskMetricsCards } from "@/components/dashboard/RiskMetricsCards";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { SystemStatusIndicator } from "@/components/dashboard/SystemStatusIndicator";
import { ADLRiskWidget } from "@/components/dashboard/ADLRiskWidget";
import { MarketScoreWidget } from "@/components/dashboard/MarketScoreWidget";
import { SmartQuickActions } from "@/components/dashboard/SmartQuickActions";
import { PortfolioOverviewCard } from "@/components/dashboard/PortfolioOverviewCard";
import { DashboardAnalyticsSummary } from "@/components/dashboard/DashboardAnalyticsSummary";
import { EquityCurveChart } from "@/components/analytics/EquityCurveChart";
import { GoalTrackingWidget } from "@/components/dashboard/GoalTrackingWidget";
import { WidgetErrorBoundary } from "@/components/ErrorBoundary";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useRealtime } from "@/hooks/use-realtime";
import { useBinanceConnectionStatus } from "@/features/binance";
import { usePositions } from "@/hooks/use-positions";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { 
  ChevronRight,
  LineChart,
  Activity,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";

// First-time user onboarding steps
const DASHBOARD_ONBOARDING_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Deriverse",
    description: "Track your trades, analyze patterns, and improve your trading with AI insights.",
  },
  {
    id: "quick-actions",
    title: "Quick Actions",
    description: "Log trades, start sessions, and check your risk from the Quick Actions section below.",
  },
  {
    id: "ai-insights",
    title: "AI-Powered Analysis",
    description: "Get personalized recommendations based on your trading history after 5+ trades.",
  },
];

const Dashboard = () => {
  const { format, formatPnl } = useCurrencyConversion();
  
  // Enable realtime updates for dashboard data
  useRealtime({
    tables: ["accounts", "account_transactions", "trade_entries"],
  });

  // Trading data
  const { data: trades = [] } = useTradeEntries();
  
  // Mode visibility (C-01)
  const { showExchangeData } = useModeVisibility();
  
  // Binance data for Active Positions — only in Live mode
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { positions: activePositions } = usePositions();
  
  const isConnected = showExchangeData && (connectionStatus?.isConnected ?? false);

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          icon={Activity}
          title="Dashboard"
          description="Your trading overview at a glance"
        />

        {/* Row 1: Portfolio Overview */}
        <PortfolioOverviewCard />

        {/* Row 2: Quick Actions */}
        <SmartQuickActions />

        {/* Row 3: Analytics Summary (sparkline) */}
        <DashboardAnalyticsSummary />

        {/* Row 4: Market Score + System Status - Side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          <MarketScoreWidget symbol="BTCUSDT" compact />
          <SystemStatusIndicator />
        </div>

        {/* Row 5: Active Positions (conditional) */}
        {isConnected && activePositions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-5 w-5" />
                    Active Positions
                    <Badge variant="outline" className="text-xs">{activePositions.length}</Badge>
                  </CardTitle>
                  <CardDescription>Open positions on Binance Futures</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="https://www.binance.com/en/futures" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Open Binance Futures in new tab"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                    Binance
                  </a>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {activePositions.map((position) => {
                  const isLong = position.side === 'LONG';
                  const pnl = position.unrealizedPnl;
                  return (
                    <div 
                      key={`${position.source}-${position.symbol}`}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{position.symbol}</span>
                        <Badge variant={isLong ? "default" : "destructive"} className="text-xs">
                          {position.side}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Size</span>
                          <span className="font-mono-numbers">{position.size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Entry</span>
                          <span className="font-mono-numbers">{format(position.entryPrice)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>P&L</span>
                          <span className={`font-mono-numbers font-medium ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {formatPnl(pnl)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Row 6: Risk Summary + ADL Risk - Side by side */}
        <div className="grid gap-4 lg:grid-cols-2">
          <RiskSummaryCard />
          <ADLRiskWidget />
        </div>

        {/* Row 7: Equity Curve + Goal Tracking */}
        <div className="grid gap-4 lg:grid-cols-3">
          <WidgetErrorBoundary name="Equity Curve">
            <EquityCurveChart className="lg:col-span-2" />
          </WidgetErrorBoundary>
          <WidgetErrorBoundary name="Goal Tracking">
            <GoalTrackingWidget />
          </WidgetErrorBoundary>
        </div>

        {/* Row 8: Advanced Risk Metrics */}
        <RiskMetricsCards />

        {/* Row 9: AI Insights */}
        <AIInsightsWidget />

        {/* Pro Tip (dismissible) */}
        <QuickTip storageKey="dashboard_intro" className="mb-2">
          <strong>Pro tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">⌘K</kbd> to quickly search, or <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Shift+?</kbd> for all shortcuts.
        </QuickTip>

        {/* Trading Journey CTA (if no trades) */}
        {trades.length === 0 && (
          <Card>
            <CardContent className="py-8">
              <EmptyState
                icon={Activity}
                title="Start Your Trading Analytics"
                description="Log your first trade to begin tracking your performance and receiving AI-powered insights."
                action={{
                  label: "Log First Trade",
                  onClick: () => window.location.href = '/trading',
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* First-Time User Onboarding */}
      <OnboardingTooltip 
        steps={DASHBOARD_ONBOARDING_STEPS} 
        storageKey="dashboard" 
      />
    </>
  );
};

export default Dashboard;
