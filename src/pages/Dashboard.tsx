/**
 * Trading Dashboard - Main overview showing trading performance
 * Layout order:
 * 1. Quick Actions (no title), 2. 7-Day Stats (no title), 3. Market Score, 4. System Status, 
 * 5. Market Sessions, 6. Active Positions, 7. Today's Activity, 8. Risk & AI Insights
 */
import { useMemo } from "react";
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
import { ADLRiskWidget } from "@/components/dashboard/ADLRiskWidget";
import { MarketScoreWidget } from "@/components/dashboard/MarketScoreWidget";
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
  Flame,
  Trophy,
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

  // 7-Day Quick Stats
  const sevenDayStats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTrades = (trades || [])
      .filter(t => t.status === 'closed' && new Date(t.trade_date) >= sevenDaysAgo)
      .sort((a, b) => new Date(b.trade_date).getTime() - new Date(a.trade_date).getTime());
    
    // Calculate streak (consecutive wins or losses from most recent)
    let streak = { type: 'win' as 'win' | 'loss', count: 0 };
    if (recentTrades.length > 0) {
      const firstResult = recentTrades[0].result;
      streak.type = firstResult === 'win' ? 'win' : 'loss';
      for (const trade of recentTrades) {
        if (trade.result === streak.type) {
          streak.count++;
        } else {
          break;
        }
      }
    }
    
    // Calculate best/worst day
    const byDay = recentTrades.reduce((acc, t) => {
      const day = new Date(t.trade_date).toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + (t.realized_pnl || 0);
      return acc;
    }, {} as Record<string, number>);
    
    const days = Object.entries(byDay).sort((a, b) => b[1] - a[1]);
    const bestDay = days[0] ? { date: days[0][0], pnl: days[0][1] } : { date: '', pnl: 0 };
    const worstDay = days[days.length - 1] ? { date: days[days.length - 1][0], pnl: days[days.length - 1][1] } : { date: '', pnl: 0 };
    
    return { streak, bestDay, worstDay, trades7d: recentTrades.length };
  }, [trades]);

  const hasTrades = trades.filter(t => t.status === 'closed').length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.welcome')}</p>
        </div>

        {/* 1. 7-Day Stats - At top with title */}
        {hasTrades && (
          <>
            <h2 className="text-lg font-semibold">7-Day Stats</h2>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Streak</p>
                      <p className={`text-2xl font-bold ${sevenDayStats.streak.type === 'win' ? 'text-profit' : 'text-loss'}`}>
                        {sevenDayStats.streak.count} {sevenDayStats.streak.type === 'win' ? 'W' : 'L'}
                      </p>
                    </div>
                    <Flame className={`h-8 w-8 ${sevenDayStats.streak.type === 'win' ? 'text-profit' : 'text-loss'}`} />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Trades (7D)</p>
                      <p className="text-2xl font-bold">{sevenDayStats.trades7d}</p>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Best Day</p>
                      <p className={`text-2xl font-bold ${sevenDayStats.bestDay.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {sevenDayStats.bestDay.pnl >= 0 ? '+' : ''}{formatCurrency(sevenDayStats.bestDay.pnl, 'USD')}
                      </p>
                    </div>
                    <Trophy className="h-8 w-8 text-profit" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Worst Day</p>
                      <p className={`text-2xl font-bold ${sevenDayStats.worstDay.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {sevenDayStats.worstDay.pnl >= 0 ? '+' : ''}{formatCurrency(sevenDayStats.worstDay.pnl, 'USD')}
                      </p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-loss" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* 2. Quick Actions - No title */}
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

        {/* 3. Market Score Widget */}
        <MarketScoreWidget symbol="BTCUSDT" />

        {/* 4. System Status - No title (already built-in) */}
        <SystemStatusIndicator />

        {/* 5. Market Sessions - No title */}
        <MarketSessionsWidget />

        {/* 5. Active Positions Card */}
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

        {/* 6. Today's Activity - No title */}
        <TodayPerformance />

        {/* 7. Risk & AI Insights */}
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
