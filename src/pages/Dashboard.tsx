/**
 * Trading Dashboard - Main overview showing trading performance
 * Layout order (streamlined per UX audit):
 * 1. Portfolio Overview (FIRST)
 * 2. Smart Quick Actions
 * 3. Active Positions (if any)
 * 4. Market Score Widget
 * 5. Risk Summary + ADL Risk
 * 6. System Status (compact)
 * 7. AI Insights Widget
 * 
 * REMOVED (moved to appropriate domains):
 * - 7-Day Stats → Performance (/performance)
 * - Analytics Summary → Merged into Portfolio Overview
 * - Strategy Clone Stats → Strategy (/strategies)
 * - Today Performance → Merged into Portfolio Overview
 * - Market Sessions → Conditional/removed
 */
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickTip, OnboardingTooltip } from "@/components/ui/onboarding-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskSummaryCard } from "@/components/risk/RiskSummaryCard";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { SystemStatusIndicator } from "@/components/dashboard/SystemStatusIndicator";
import { ADLRiskWidget } from "@/components/dashboard/ADLRiskWidget";
import { MarketScoreWidget } from "@/components/dashboard/MarketScoreWidget";
import { SmartQuickActions } from "@/components/dashboard/SmartQuickActions";
import { PortfolioOverviewCard } from "@/components/dashboard/PortfolioOverviewCard";
import { DashboardAnalyticsSummary } from "@/components/dashboard/DashboardAnalyticsSummary";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useRealtime } from "@/hooks/use-realtime";
import { useBinanceConnectionStatus } from "@/features/binance";
import { usePositions } from "@/hooks/use-positions";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { 
  ChevronRight,
  LineChart,
  AlertTriangle,
  Activity,
  ExternalLink,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

// First-time user onboarding steps (UCD + JTBD framework)
const DASHBOARD_ONBOARDING_STEPS = [
  {
    id: "welcome",
    title: "Welcome to Trading Journey",
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
  const { t } = useTranslation();
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
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.welcome')}</p>
        </div>

        {/* 1. Portfolio Overview - FIRST WIDGET (Enhanced with Today's metrics) */}
        <PortfolioOverviewCard />

        {/* 2. Smart Quick Actions - Context-aware */}
        <SmartQuickActions />

        {/* 3. Analytics Summary - 30-day performance sparkline */}
        <DashboardAnalyticsSummary />

        {/* 4. Active Positions Card (if any) */}
        {isConnected && activePositions.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Active Positions
                  </CardTitle>
                  <CardDescription>
                    Your current open positions on Binance Futures
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a 
                    href="https://www.binance.com/en/futures" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    aria-label="Open Binance Futures in new tab"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
                    Open Binance
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

        {/* 4. Market Score Widget */}
        <MarketScoreWidget symbol="BTCUSDT" />

        {/* 5. Risk Summary + ADL Risk */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Risk & AI Insights</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/risk" className="flex items-center gap-1">
                View Details <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          {/* Row 1: Risk Status + ADL Risk */}
          <div className="grid gap-4 md:grid-cols-2">
            <RiskSummaryCard />
            <ADLRiskWidget />
          </div>
          {/* Row 2: AI Insights full width */}
          <AIInsightsWidget />
        </section>

        {/* 6. System Status (Compact) */}
        <SystemStatusIndicator />

        {/* Pro Tip (dismissible) */}
        <QuickTip storageKey="dashboard_intro" className="mb-2">
          <strong>Pro tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">⌘K</kbd> to quickly search, or <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Shift+?</kbd> for all shortcuts.
        </QuickTip>

        {/* Trading Journey CTA (if no trades) */}
        {trades.length === 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{t('nav.tradingJourney')}</h2>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/trading" className="flex items-center gap-1">
                  View All <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  icon={Activity}
                  title="Start Your Trading Journey"
                  description="Log your first trade to begin tracking your performance and receiving AI-powered insights."
                  action={{
                    label: "Log First Trade",
                    onClick: () => window.location.href = '/trading',
                  }}
                />
              </CardContent>
            </Card>
          </section>
        )}
      </div>

      {/* First-Time User Onboarding */}
      <OnboardingTooltip 
        steps={DASHBOARD_ONBOARDING_STEPS} 
        storageKey="dashboard" 
      />
    </DashboardLayout>
  );
};

export default Dashboard;
