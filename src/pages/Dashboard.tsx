/**
 * Trading Dashboard - Main overview showing trading performance
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { QuickTip } from "@/components/ui/onboarding-tooltip";
import { useGlobalShortcuts } from "@/components/ui/keyboard-shortcut";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskSummaryCard } from "@/components/risk/RiskSummaryCard";
import { AIInsightsWidget } from "@/components/dashboard/AIInsightsWidget";
import { ActivePositionsTable } from "@/components/dashboard/ActivePositionsTable";
import { TodayPerformance } from "@/components/dashboard/TodayPerformance";
import { SystemStatusIndicator } from "@/components/dashboard/SystemStatusIndicator";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useAccounts } from "@/hooks/use-accounts";
import { useRealtime } from "@/hooks/use-realtime";
import { calculateTradingStats } from "@/lib/trading-calculations";
import { formatCurrency } from "@/lib/formatters";
import { MarketSessionsWidget } from "@/components/dashboard/MarketSessionsWidget";
import { 
  TrendingUp, 
  TrendingDown,
  Target, 
  Activity,
  BarChart3,
  ChevronRight,
  LineChart,
  BookOpen,
  Building2,
  Wallet,
  Shield,
  Globe,
} from "lucide-react";

const Dashboard = () => {
  const { t } = useTranslation();
  useGlobalShortcuts();
  
  const { data: settings } = useUserSettings();
  const currency = settings?.default_currency || 'USD';
  const isIDR = currency === 'IDR';

  // Accounts data
  const { data: accounts = [] } = useAccounts();
  
  // Enable realtime updates for dashboard data
  useRealtime({
    tables: ["accounts", "account_transactions", "trade_entries"],
  });
  
  const totalAccountBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  }, [accounts]);

  // Trading data
  const { data: trades = [], isLoading: tradesLoading } = useTradeEntries();

  // Trading stats
  const tradingStats = useMemo(() => calculateTradingStats(trades), [trades]);

  const formatCurrencyValue = (value: number) => {
    if (isIDR) {
      if (value >= 1000000000) return `Rp${(value / 1000000000).toFixed(1)}M`;
      if (value >= 1000000) return `Rp${(value / 1000000).toFixed(0)}jt`;
      return `Rp${value.toLocaleString()}`;
    }
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* System Status */}
        <SystemStatusIndicator />

        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.welcome')}</p>
        </div>

        {/* Accounts Summary - Top Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Accounts</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/accounts" className="flex items-center gap-1">
                Manage <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {accounts.slice(0, 4).map((account) => (
              <Card key={account.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground capitalize">{account.account_type}</span>
                    <Badge variant="outline" className="text-xs">{account.currency}</Badge>
                  </div>
                  <p className="font-medium truncate">{account.name}</p>
                  <p className="text-xl font-bold mt-1">
                    {formatCurrency(Number(account.balance), account.currency)}
                  </p>
                </CardContent>
              </Card>
            ))}
            {accounts.length === 0 && (
              <Card className="col-span-full">
                <CardContent className="py-6 text-center text-muted-foreground">
                  No accounts yet. <Link to="/accounts" className="text-primary hover:underline">Add your first account</Link>
                </CardContent>
              </Card>
            )}
          </div>
          
          {accounts.length > 0 && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="py-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance Across All Accounts</p>
                  <p className="text-2xl font-bold">{formatCurrencyValue(totalAccountBalance)}</p>
                </div>
                <Wallet className="h-8 w-8 text-primary/50" />
              </CardContent>
            </Card>
          )}
        </section>

        <Separator />

        {/* Portfolio Performance Overview */}
        {trades.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Portfolio Performance</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-2xl font-bold">{tradingStats.winRate.toFixed(1)}%</p>
                    </div>
                    <Target className="h-8 w-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Profit Factor</p>
                      <p className="text-2xl font-bold">
                        {tradingStats.profitFactor === Infinity ? '∞' : tradingStats.profitFactor.toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-primary/50" />
                  </div>
                </CardContent>
              </Card>
              <Card className={`${tradingStats.totalPnl >= 0 ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total P&L</p>
                      <p className={`text-2xl font-bold ${tradingStats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tradingStats.totalPnl >= 0 ? '+' : ''}${tradingStats.totalPnl.toFixed(2)}
                      </p>
                    </div>
                    {tradingStats.totalPnl >= 0 ? (
                      <TrendingUp className="h-8 w-8 text-green-500/50" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-red-500/50" />
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Expectancy</p>
                      <p className="text-2xl font-bold">${tradingStats.expectancy.toFixed(2)}</p>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        <Separator />

        {/* Quick Actions */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/trading">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-sm">Log Trade</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/sessions">
                <Activity className="h-5 w-5 text-primary" />
                <span className="text-sm">New Session</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/risk">
                <Shield className="h-5 w-5 text-primary" />
                <span className="text-sm">Risk Check</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/accounts">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="text-sm">Accounts</span>
              </Link>
            </Button>
          </div>
        </section>

        {/* Market Sessions */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Market Sessions</h2>
          </div>
          <MarketSessionsWidget />
        </section>
        {/* Active Positions + Today's Performance */}
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ActivePositionsTable />
            <TodayPerformance />
          </div>
        </section>

        {/* Risk Summary + AI Insights */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Risk Status & AI Insights</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/risk" className="flex items-center gap-1">
                View Details <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <RiskSummaryCard />
            <AIInsightsWidget />
          </div>
        </section>

        <Separator />

        {/* Quick Tip */}
        <QuickTip storageKey="dashboard_intro" className="mb-2">
          <strong>Pro tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">⌘K</kbd> to quickly search, or <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Shift+?</kbd> for all shortcuts.
        </QuickTip>

        {/* Trading Section */}
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

          {trades.length === 0 ? (
            <Card>
              <CardContent className="py-8">
                <EmptyState
                  icon={Activity}
                  title="No trades recorded"
                  description="Start logging your trades in the Trading Journal to see performance metrics here."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tradingStats.totalTrades}</div>
                  <p className="text-xs text-muted-foreground">
                    {tradingStats.wins} wins / {tradingStats.losses} losses
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                  {tradingStats.totalPnl >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${tradingStats.totalPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {tradingStats.totalPnl >= 0 ? "+" : ""}${tradingStats.totalPnl.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Avg: ${tradingStats.avgPnl.toFixed(2)}/trade
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tradingStats.winRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    Profit Factor: {tradingStats.profitFactor === Infinity ? '∞' : tradingStats.profitFactor.toFixed(2)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg R:R</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tradingStats.avgRR.toFixed(2)}:1</div>
                  <p className="text-xs text-muted-foreground">
                    Expectancy: ${tradingStats.expectancy.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Trades */}
          {trades.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Recent Trades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {trades.slice(0, 5).map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <Badge variant={trade.direction === "LONG" ? "default" : "secondary"} className="text-xs">
                          {trade.direction}
                        </Badge>
                        <span className="font-medium text-sm">{trade.pair}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={trade.result === 'win' ? 'default' : trade.result === 'loss' ? 'destructive' : 'secondary'} className="text-xs">
                          {trade.result || 'pending'}
                        </Badge>
                        <span className={`font-bold text-sm ${(trade.pnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {(trade.pnl || 0) >= 0 ? "+" : ""}${(trade.pnl || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
