/**
 * Trading Dashboard - Main overview showing trading performance
 * Reorganized per user spec:
 * 1. Pro Tip, 2. Quick Actions, 3. System Status, 4. Market Sessions,
 * 5. Binance Account (REPLACED Accounts), 6. Today Activity, 7. Risk & AI Insights, 8. Trading Journey
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QuickTip, OnboardingTooltip } from "@/components/ui/onboarding-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskSummaryCard } from "@/components/risk/RiskSummaryCard";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { BinancePositionsTable } from "@/components/dashboard/BinancePositionsTable";
import { BinanceBalanceWidget } from "@/components/dashboard/BinanceBalanceWidget";
import { TodayPerformance } from "@/components/dashboard/TodayPerformance";
import { SystemStatusIndicator } from "@/components/dashboard/SystemStatusIndicator";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useRealtime } from "@/hooks/use-realtime";
import { calculateTradingStats } from "@/lib/trading-calculations";
import { formatCurrency } from "@/lib/formatters";
import { MarketSessionsWidget } from "@/components/dashboard/MarketSessionsWidget";
import { 
  WinRateTooltip, 
  ProfitFactorTooltip, 
  ProfitLossTooltip,
  InfoTooltip 
} from "@/components/ui/info-tooltip";
import { 
  TrendingUp, 
  TrendingDown,
  Target, 
  Activity,
  BarChart3,
  ChevronRight,
  LineChart,
  BookOpen,
  Shield,
  Globe,
  Calendar,
  Flame,
  Trophy,
  AlertTriangle,
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
  
  const { data: settings } = useUserSettings();
  const currency = settings?.default_currency || 'USD';
  const isIDR = currency === 'IDR';
  
  // Enable realtime updates for dashboard data
  useRealtime({
    tables: ["accounts", "account_transactions", "trade_entries"],
  });

  // Trading data
  const { data: trades = [], isLoading: tradesLoading } = useTradeEntries();

  // Trading stats
  const tradingStats = useMemo(() => calculateTradingStats(trades), [trades]);

  // 7-Day Quick Stats
  const sevenDayStats = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentTrades = trades
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.welcome')}</p>
        </div>

        {/* Section 1: Pro Tip */}
        <QuickTip storageKey="dashboard_intro" className="mb-2">
          <strong>Pro tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">⌘K</kbd> to quickly search, or <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Shift+?</kbd> for all shortcuts.
        </QuickTip>

        {/* Section 2: Quick Actions */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-3">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/trading">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-sm">Log Trade</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/risk">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm">Risk Check</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/analytics">
                <LineChart className="h-5 w-5 text-primary" />
                <span className="text-sm">Analytics</span>
              </Link>
            </Button>
          </div>
        </section>

        {/* Section 3: System Status (ALL SYSTEMS NORMAL) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">System Status</h2>
          </div>
          <SystemStatusIndicator />
        </section>

        {/* Section 4: Market Sessions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Market Sessions</h2>
          </div>
          <MarketSessionsWidget />
        </section>

        {/* Section 5: Binance Account (REPLACED manual accounts) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Binance Account</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/settings?tab=exchange" className="flex items-center gap-1">
                Configure <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid gap-4 lg:grid-cols-2">
            <BinanceBalanceWidget />
            <BinancePositionsTable />
          </div>
        </section>

        {/* Section 6: Today's Activity */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Today's Activity</h2>
          </div>
          <TodayPerformance />
        </section>

        {/* Section 7: Risk & AI Insights */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Risk & AI Insights</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/risk" className="flex items-center gap-1">
                View Details <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <RiskSummaryCard />
            <AIInsightsWidget />
          </div>
        </section>

        {/* Section 8: Trading Journey - 7-Day Stats + Portfolio Performance OR CTA */}
        {trades.length > 0 ? (
          <>
            {/* 7-Day Quick Stats */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">7-Day Stats</h2>
              </div>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          Current Streak
                          <InfoTooltip content="Consecutive wins or losses from your most recent trades. A win streak shows momentum; a loss streak may signal time to pause and review your strategy." />
                        </p>
                        <p className={`text-xl font-bold ${sevenDayStats.streak.type === 'win' ? 'text-profit' : 'text-loss'}`}>
                          {sevenDayStats.streak.count > 0 ? (
                            sevenDayStats.streak.type === 'win' 
                              ? `${sevenDayStats.streak.count} Win${sevenDayStats.streak.count > 1 ? 's' : ''}` 
                              : `${sevenDayStats.streak.count} Loss${sevenDayStats.streak.count > 1 ? 'es' : ''}`
                          ) : 'No streak'}
                        </p>
                      </div>
                      <Flame className={`h-8 w-8 ${sevenDayStats.streak.type === 'win' ? 'text-profit/50' : 'text-loss/50'}`} aria-hidden="true" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          Best Day (7d)
                          <InfoTooltip content="Your highest single-day profit in the last 7 days. Analyze what made this day successful to replicate it." />
                        </p>
                        <p className="text-xl font-bold text-profit">
                          {sevenDayStats.bestDay.pnl > 0 ? `+$${sevenDayStats.bestDay.pnl.toFixed(2)}` : '-'}
                        </p>
                        {sevenDayStats.bestDay.date && (
                          <p className="text-xs text-muted-foreground">{sevenDayStats.bestDay.date}</p>
                        )}
                      </div>
                      <Trophy className="h-8 w-8 text-profit/50" aria-hidden="true" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          Worst Day (7d)
                          <InfoTooltip content="Your largest single-day loss in the last 7 days. Review these trades to identify mistakes and prevent future losses." />
                        </p>
                        <p className="text-xl font-bold text-loss">
                          {sevenDayStats.worstDay.pnl < 0 ? `$${sevenDayStats.worstDay.pnl.toFixed(2)}` : '-'}
                        </p>
                        {sevenDayStats.worstDay.date && (
                          <p className="text-xs text-muted-foreground">{sevenDayStats.worstDay.date}</p>
                        )}
                      </div>
                      <AlertTriangle className="h-8 w-8 text-loss/50" aria-hidden="true" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Trades (7d)</p>
                        <p className="text-xl font-bold">{sevenDayStats.trades7d}</p>
                      </div>
                      <Activity className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>

            {/* Portfolio Performance Overview */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Portfolio Performance</h2>
              </div>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          Win Rate <WinRateTooltip />
                        </p>
                        <p className="text-2xl font-bold">{tradingStats.winRate.toFixed(1)}%</p>
                      </div>
                      <Target className="h-8 w-8 text-primary/50" aria-hidden="true" />
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          Profit Factor <ProfitFactorTooltip />
                        </p>
                        <p className="text-2xl font-bold">
                          {tradingStats.profitFactor === Infinity ? '∞' : tradingStats.profitFactor.toFixed(2)}
                        </p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-primary/50" aria-hidden="true" />
                    </div>
                  </CardContent>
                </Card>
                <Card className={tradingStats.totalPnl >= 0 ? 'bg-profit-muted border-profit/20' : 'bg-loss-muted border-loss/20'}>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          Total P&L <ProfitLossTooltip />
                        </p>
                        <p className={`text-2xl font-bold ${tradingStats.totalPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {tradingStats.totalPnl >= 0 ? '+' : ''}${tradingStats.totalPnl.toFixed(2)}
                        </p>
                      </div>
                      {tradingStats.totalPnl >= 0 ? (
                        <TrendingUp className="h-8 w-8 text-profit/50" aria-hidden="true" />
                      ) : (
                        <TrendingDown className="h-8 w-8 text-loss/50" aria-hidden="true" />
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-muted/30">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          Expectancy 
                          <InfoTooltip content="Expected average profit per trade based on your win rate and average win/loss sizes. Positive expectancy means profitable over time." />
                        </p>
                        <p className="text-2xl font-bold">${tradingStats.expectancy.toFixed(2)}</p>
                      </div>
                      <Activity className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </section>
          </>
        ) : (
          /* Trading Journey CTA (if no trades) */
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
