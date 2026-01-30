/**
 * Trading Dashboard - Main overview showing trading performance
 * Layout order:
 * 1. Quick Actions (no title), 2. System Status, 3. Market Sessions (no title),
 * 4. Active Positions, 5. Today's Activity (no title), 6. Risk & AI Insights
 */
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickTip, OnboardingTooltip } from "@/components/ui/onboarding-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskSummaryCard } from "@/components/risk/RiskSummaryCard";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { TodayPerformance } from "@/components/dashboard/TodayPerformance";
import { SystemStatusIndicator } from "@/components/dashboard/SystemStatusIndicator";
import { MarketSessionsWidget } from "@/components/dashboard/MarketSessionsWidget";
import { VolatilityMeterWidget } from "@/components/dashboard/VolatilityMeterWidget";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useRealtime } from "@/hooks/use-realtime";
import { 
  useBinanceConnectionStatus, 
  useBinancePositions
} from "@/features/binance";
import { formatCurrency } from "@/lib/formatters";
import { 
  ChevronRight,
  LineChart,
  BookOpen,
  Shield,
  AlertTriangle,
  Activity,
  CandlestickChart,
  ExternalLink,
} from "lucide-react";

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
  
  // Enable realtime updates for dashboard data
  useRealtime({
    tables: ["accounts", "account_transactions", "trade_entries"],
  });

  // Trading data
  const { data: trades = [] } = useTradeEntries();
  
  // Binance data for Active Positions
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: positions } = useBinancePositions();
  
  const isConnected = connectionStatus?.isConnected;
  const activePositions = positions?.filter(p => p.positionAmt !== 0) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.welcome')}</p>
        </div>

        {/* 1. Quick Actions - No title */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
            <Link to="/trading">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="text-sm">Add Trade</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
            <Link to="/accounts">
              <CandlestickChart className="h-5 w-5 text-primary" />
              <span className="text-sm">Add Account</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
            <Link to="/strategies">
              <LineChart className="h-5 w-5 text-primary" />
              <span className="text-sm">Add Strategy</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
            <Link to="/risk">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm">Risk Check</span>
            </Link>
          </Button>
        </div>

        {/* 2. System Status - No title (already built-in) */}
        <SystemStatusIndicator />

        {/* 3. Market Sessions - No title */}
        <MarketSessionsWidget />

        {/* 4. Active Positions Card */}
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
                  const isLong = position.positionAmt > 0;
                  const pnl = position.unrealizedProfit;
                  return (
                    <div 
                      key={position.symbol}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{position.symbol}</span>
                        <Badge variant={isLong ? "default" : "destructive"} className="text-xs">
                          {isLong ? 'LONG' : 'SHORT'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                          <span>Size</span>
                          <span className="font-mono-numbers">{Math.abs(position.positionAmt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Entry</span>
                          <span className="font-mono-numbers">${position.entryPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>P&L</span>
                          <span className={`font-mono-numbers font-medium ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, 'USD')}
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

        {/* Pro Tip */}
        <QuickTip storageKey="dashboard_intro" className="mb-2">
          <strong>Pro tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">⌘K</kbd> to quickly search, or <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Shift+?</kbd> for all shortcuts.
        </QuickTip>

        {/* 5. Today's Activity - No title */}
        <TodayPerformance />

        {/* 6. Risk & AI Insights */}
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
          <div className="grid gap-4 lg:grid-cols-3">
            <RiskSummaryCard />
            <AIInsightsWidget />
            <VolatilityMeterWidget />
          </div>
        </section>

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
