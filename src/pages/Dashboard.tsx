/**
 * Unified Dashboard - Single page showing all key features
 * Consolidates Portfolio, Financial Freedom, and Trading in one view
 */
import { useMemo, Suspense, lazy } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { PortfolioMetrics } from "@/components/dashboard/PortfolioMetrics";
import { AllocationChart } from "@/components/dashboard/AllocationChart";
import { QuickTip } from "@/components/ui/onboarding-tooltip";
import { useGlobalShortcuts } from "@/components/ui/keyboard-shortcut";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useHoldings, useTransactions, useDefaultPortfolio } from "@/hooks/use-portfolio";
import { useEmergencyFund } from "@/hooks/use-emergency-fund";
import { useDebts } from "@/hooks/use-debts";
import { useGoals } from "@/hooks/use-goals";
import { useFireSettings } from "@/hooks/use-fire-settings";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useAccounts } from "@/hooks/use-accounts";
import { useRealtime } from "@/hooks/use-realtime";
import { transformHoldings, transformTransactions, calculateMetrics, calculateAllocation } from "@/lib/data-transformers";
import { calculateTradingStats } from "@/lib/trading-calculations";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import type { AllocationItem } from "@/types/portfolio";
import { 
  TrendingUp, 
  TrendingDown,
  Shield, 
  Target, 
  Crown,
  PiggyBank,
  CreditCard,
  Activity,
  BarChart3,
  ArrowRight,
  Wallet,
  ChevronRight,
  Briefcase,
  LineChart,
  Plus,
  Receipt,
  BookOpen,
  Building2
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
    tables: ["accounts", "account_transactions", "holdings", "portfolio_transactions", "trade_entries", "financial_goals", "debts"],
  });
  const totalAccountBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + Number(acc.balance), 0);
  }, [accounts]);

  // Portfolio data
  const { data: defaultPortfolio } = useDefaultPortfolio();
  const { data: dbHoldings = [], isLoading: holdingsLoading } = useHoldings(defaultPortfolio?.id);
  const { data: dbTransactions = [], isLoading: transactionsLoading } = useTransactions(defaultPortfolio?.id, 5);

  // Financial Freedom data
  const { data: emergencyFund } = useEmergencyFund();
  const { data: debts = [] } = useDebts();
  const { data: goals = [] } = useGoals();
  const { data: fireSettings } = useFireSettings();

  // Trading data
  const { data: trades = [], isLoading: tradesLoading } = useTradeEntries();

  // Transform portfolio data
  const holdings = useMemo(() => transformHoldings(dbHoldings), [dbHoldings]);
  const transactions = useMemo(() => transformTransactions(dbTransactions), [dbTransactions]);
  const metrics = useMemo(() => {
    const baseMetrics = calculateMetrics(holdings);
    const oldestTx = dbTransactions.length > 0 
      ? new Date(Math.min(...dbTransactions.map(t => new Date(t.transaction_date).getTime())))
      : new Date();
    const yearsHeld = Math.max(0.1, (Date.now() - oldestTx.getTime()) / (365 * 24 * 60 * 60 * 1000));
    const cagr = baseMetrics.totalCostBasis > 0 
      ? (Math.pow(baseMetrics.totalValue / baseMetrics.totalCostBasis, 1 / yearsHeld) - 1) * 100 
      : 0;
    return { ...baseMetrics, cagr };
  }, [holdings, dbTransactions]);
  
  const allocationByType: AllocationItem[] = useMemo(() => {
    const marketAllocations = calculateAllocation(holdings);
    return marketAllocations.map(m => ({
      name: m.name,
      value: m.value,
      percentage: m.percentage,
      color: m.color,
    }));
  }, [holdings]);

  // Calculate FF metrics
  const ffMetrics = useMemo(() => {
    const totalEmergencyFund = emergencyFund ? Number(emergencyFund.current_balance) : 0;
    const monthlyExpenses = fireSettings?.monthly_expenses || 0;
    const monthlyIncome = fireSettings?.monthly_income || 0;
    const emergencyFundMonths = monthlyExpenses > 0 ? totalEmergencyFund / monthlyExpenses : 0;
    
    const totalDebt = debts.filter(d => d.is_active).reduce((sum, d) => sum + Number(d.current_balance), 0);
    const debtToIncomeRatio = monthlyIncome > 0 ? (totalDebt / (monthlyIncome * 12)) * 100 : 0;
    const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0;
    
    // Determine level
    let currentLevel = 1;
    if (emergencyFundMonths >= 6 && debtToIncomeRatio < 30) currentLevel = 2;
    if (emergencyFundMonths >= 12 && debtToIncomeRatio < 20) currentLevel = 3;

    const levelProgress = currentLevel === 1 
      ? Math.min(100, (emergencyFundMonths / 3) * 50 + (Math.max(0, 30 - debtToIncomeRatio) / 30) * 50)
      : currentLevel === 2 
        ? Math.min(100, (emergencyFundMonths / 12) * 50 + (Math.max(0, 20 - debtToIncomeRatio) / 20) * 50)
        : 100;

    return {
      currentLevel,
      levelProgress,
      savingsRate,
      emergencyFundMonths,
      debtToIncomeRatio,
      totalDebt,
      totalEmergencyFund,
      activeGoals: goals.filter(g => g.is_active).length,
      activeDebts: debts.filter(d => d.is_active).length,
    };
  }, [emergencyFund, debts, goals, fireSettings]);

  // Trading stats
  const tradingStats = useMemo(() => calculateTradingStats(trades), [trades]);

  const isLoading = holdingsLoading || transactionsLoading;

  const formatCurrency = (value: number) => {
    if (isIDR) {
      if (value >= 1000000000) return `Rp${(value / 1000000000).toFixed(1)}M`;
      if (value >= 1000000) return `Rp${(value / 1000000).toFixed(0)}jt`;
      return `Rp${value.toLocaleString()}`;
    }
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  const levelNames = ["Survival", "Stability", "Independence", "Freedom", "Purpose"];
  const levelColors = ["text-red-500", "text-orange-500", "text-yellow-500", "text-green-500", "text-purple-500"];

  return (
    <DashboardLayout>
      <div className="space-y-8">
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
                    {formatCurrencyUtil(Number(account.balance), account.currency)}
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
                  <p className="text-2xl font-bold">{formatCurrency(totalAccountBalance)}</p>
                </div>
                <Wallet className="h-8 w-8 text-primary/50" />
              </CardContent>
            </Card>
          )}
        </section>

        <Separator />

        {/* Quick Actions */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/portfolio">
                <Plus className="h-5 w-5 text-primary" />
                <span className="text-sm">Add Transaction</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/trading-journey/journal">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-sm">Log Trade</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/financial-freedom/budget">
                <Receipt className="h-5 w-5 text-primary" />
                <span className="text-sm">Add Expense</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" asChild>
              <Link to="/accounts">
                <Wallet className="h-5 w-5 text-primary" />
                <span className="text-sm">Manage Accounts</span>
              </Link>
            </Button>
          </div>
        </section>

        <Separator />

        {/* Quick Tip */}
        <QuickTip storageKey="dashboard_intro" className="mb-2">
          <strong>Pro tip:</strong> Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">⌘K</kbd> to quickly search, or <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">Shift+?</kbd> for all shortcuts.
        </QuickTip>

        {/* Portfolio Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('nav.portfolioOverview')}</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/portfolio" className="flex items-center gap-1">
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          
          {isLoading ? (
            <MetricsGridSkeleton />
          ) : (
            <>
              <PortfolioMetrics metrics={metrics} />
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Top Holdings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {holdings.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No holdings yet</p>
                    ) : (
                      <div className="space-y-3">
                        {holdings.slice(0, 5).map((holding) => (
                          <div key={holding.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                {holding.asset.symbol.slice(0, 2)}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{holding.asset.symbol}</p>
                                <p className="text-xs text-muted-foreground">{holding.asset.name}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">{formatCurrency(holding.value)}</p>
                              <p className={`text-xs ${holding.profitLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {holding.profitLossPercent >= 0 ? '+' : ''}{holding.profitLossPercent.toFixed(2)}%
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                <AllocationChart data={allocationByType} />
              </div>
            </>
          )}
        </section>

        <Separator />

        {/* Financial Freedom Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('nav.financialFreedom')}</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/financial-freedom/progress" className="flex items-center gap-1">
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Current Level */}
            <Card className="md:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium">Financial Freedom Level</CardTitle>
                  <Badge variant="outline" className={levelColors[ffMetrics.currentLevel - 1]}>
                    Level {ffMetrics.currentLevel}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className={`h-5 w-5 ${levelColors[ffMetrics.currentLevel - 1]}`} />
                    <span className="text-xl font-bold">{levelNames[ffMetrics.currentLevel - 1]}</span>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Progress to next level</span>
                      <span>{ffMetrics.levelProgress.toFixed(0)}%</span>
                    </div>
                    <Progress value={ffMetrics.levelProgress} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Savings Rate */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
                <PiggyBank className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ffMetrics.savingsRate.toFixed(1)}%</div>
                <div className={`mt-1 h-1 rounded-full ${
                  ffMetrics.savingsRate >= 50 ? "bg-green-500" : 
                  ffMetrics.savingsRate >= 30 ? "bg-yellow-500" : "bg-red-500"
                }`} />
              </CardContent>
            </Card>

            {/* Emergency Fund */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Emergency Fund</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{ffMetrics.emergencyFundMonths.toFixed(1)} mo</div>
                <div className={`mt-1 h-1 rounded-full ${
                  ffMetrics.emergencyFundMonths >= 6 ? "bg-green-500" : 
                  ffMetrics.emergencyFundMonths >= 3 ? "bg-yellow-500" : "bg-red-500"
                }`} />
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats Row */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Debt</p>
                    <p className="text-xl font-bold text-red-500">{formatCurrency(ffMetrics.totalDebt)}</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{ffMetrics.activeDebts} active debts</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Emergency Fund</p>
                    <p className="text-xl font-bold text-green-500">{formatCurrency(ffMetrics.totalEmergencyFund)}</p>
                  </div>
                  <Wallet className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{ffMetrics.emergencyFundMonths.toFixed(1)} months coverage</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active Goals</p>
                    <p className="text-xl font-bold">{ffMetrics.activeGoals}</p>
                  </div>
                  <Target className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Financial goals in progress</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Trading Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">{t('nav.tradingJourney')}</h2>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/trading-journey/summary" className="flex items-center gap-1">
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
                  {trades.slice(0, 3).map((trade) => (
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
