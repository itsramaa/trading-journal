/**
 * Accounts Page - Binance-centered account management
 * Primary: Binance Futures account with live data
 * Secondary: Paper trading accounts for backtesting
 * Includes: 7-Day Stats and Portfolio Performance
 */
import { useState, useMemo } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { 
  CandlestickChart, 
  FlaskConical, 
  Settings, 
  RefreshCw, 
  XCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  ExternalLink,
  Calendar,
  Flame,
  Trophy,
  AlertTriangle,
  BarChart3,
  Target,
  ArrowDownUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddAccountForm } from "@/components/accounts/AddAccountForm";
import { AccountCardList } from "@/components/accounts/AccountCardList";
import { AccountTransactionDialog } from "@/components/accounts/AccountTransactionDialog";
import { BinanceTransactionHistoryTab } from "@/components/trading/BinanceTransactionHistory";

import { useAccounts } from "@/hooks/use-accounts";
import { useAccountsRealtime } from "@/hooks/use-realtime";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { calculateTradingStats } from "@/lib/trading-calculations";
import { 
  useBinanceConnectionStatus, 
  useBinanceBalance, 
  useBinancePositions,
  useRefreshBinanceData
} from "@/features/binance";
import { formatCurrency } from "@/lib/formatters";
import { 
  WinRateTooltip, 
  ProfitFactorTooltip, 
  ProfitLossTooltip,
  InfoTooltip 
} from "@/components/ui/info-tooltip";
import type { Account } from "@/types/account";

export default function Accounts() {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [defaultTransactionTab, setDefaultTransactionTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [activeTab, setActiveTab] = useState<'binance' | 'paper' | 'transactions'>('binance');
  
  const { data: accounts } = useAccounts();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: balance, isLoading: balanceLoading } = useBinanceBalance();
  const { data: positions } = useBinancePositions();
  const refreshBinance = useRefreshBinanceData();
  const { data: trades = [] } = useTradeEntries();
  
  // Enable realtime updates for accounts
  useAccountsRealtime();

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

  const handleTransact = (accountId: string, type: 'deposit' | 'withdraw') => {
    const account = accounts?.find(a => a.id === accountId);
    setSelectedAccount(account);
    setDefaultTransactionTab(type);
    setTransactionDialogOpen(true);
  };

  const isConnected = connectionStatus?.isConnected;
  const activePositions = positions?.filter(p => p.positionAmt !== 0) || [];
  const backtestCount = accounts?.filter(a => a.account_type === 'trading' && a.metadata?.is_backtest).length || 0;
  const hasTrades = trades.length > 0;

  return (
    <DashboardLayout>
      <Helmet>
        <title>Trading Accounts | Trading Journal</title>
        <meta name="description" content="Manage your Binance Futures account and paper trading accounts" />
      </Helmet>

      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <CandlestickChart className="h-6 w-6 text-primary" />
              Trading Accounts
            </h1>
            <p className="text-muted-foreground">
              View your Binance Futures account and manage paper trading
            </p>
          </div>
          <div className="flex gap-2">
            {isConnected && (
              <Button 
                variant="outline" 
                onClick={() => refreshBinance.mutate()}
                disabled={refreshBinance.isPending}
                aria-label="Refresh Binance data"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshBinance.isPending ? 'animate-spin' : ''}`} aria-hidden="true" />
                Refresh
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link to="/settings?tab=exchange" aria-label="Open API settings">
                <Settings className="h-4 w-4 mr-2" aria-hidden="true" />
                API Settings
              </Link>
            </Button>
          </div>
        </div>

        {/* Portfolio Performance & 7-Day Stats (above tabs) */}
        {hasTrades && (
          <div className="space-y-6">
            {/* Portfolio Performance - No title/icon */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Win Rate
                        <WinRateTooltip />
                      </p>
                      <p className="text-2xl font-bold">{tradingStats.winRate.toFixed(1)}%</p>
                    </div>
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Profit Factor
                        <ProfitFactorTooltip />
                      </p>
                      <p className={`text-2xl font-bold ${tradingStats.profitFactor >= 1 ? 'text-profit' : 'text-loss'}`}>
                        {tradingStats.profitFactor.toFixed(2)}
                      </p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Expectancy
                        <InfoTooltip content="Average expected profit per trade based on your historical performance." />
                      </p>
                      <p className={`text-2xl font-bold ${tradingStats.expectancy >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {tradingStats.expectancy >= 0 ? '+' : ''}{formatCurrency(tradingStats.expectancy, 'USD')}
                      </p>
                    </div>
                    <ProfitLossTooltip />
                  </div>
                </CardContent>
              </Card>
            </div>

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
            </section>
          </div>
        )}

        {/* Account Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]" aria-label="Account type tabs">
            <TabsTrigger value="binance" className="gap-2" aria-label={`Binance Futures${isConnected ? ' - Connected' : ''}`}>
              <CandlestickChart className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Binance Futures</span>
              <span className="sm:hidden">Binance</span>
              {isConnected && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs bg-profit/20 text-profit" aria-label="Connected">
                  Live
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="paper" className="gap-2" aria-label={`Paper Trading${backtestCount > 0 ? ` - ${backtestCount} accounts` : ''}`}>
              <FlaskConical className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Paper Trading</span>
              <span className="sm:hidden">Paper</span>
              {backtestCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs" aria-hidden="true">
                  {backtestCount}
                </Badge>
              )}
            </TabsTrigger>
            {isConnected && (
              <TabsTrigger value="transactions" className="gap-2" aria-label="Transaction History">
                <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Transactions</span>
                <span className="sm:hidden">Txns</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Binance Account Tab */}
          <TabsContent value="binance" className="mt-6 space-y-6">
            {!isConnected ? (
              // Not Connected State
              <Card className="border-dashed">
                <CardContent className="py-12">
                  <div className="text-center max-w-md mx-auto">
                    <XCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-semibold mb-2">Binance Not Connected</h3>
                    <p className="text-muted-foreground mb-6">
                      Connect your Binance Futures API to view real-time balance, positions, and trade history.
                    </p>
                    <Button asChild>
                      <Link to="/settings?tab=exchange">
                        <Settings className="h-4 w-4 mr-2" />
                        Configure API Keys
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Binance Account Overview */}
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Wallet Balance */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                      <Wallet className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {balanceLoading ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        <>
                          <div className="text-2xl font-bold font-mono-numbers">
                            {formatCurrency(balance?.totalWalletBalance || 0, 'USD')}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Total USDT balance
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Available Balance */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Available</CardTitle>
                      <CandlestickChart className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      {balanceLoading ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        <>
                          <div className="text-2xl font-bold font-mono-numbers">
                            {formatCurrency(balance?.availableBalance || 0, 'USD')}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            For new positions
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Unrealized P&L */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
                      {(balance?.totalUnrealizedProfit || 0) >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-profit" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-loss" />
                      )}
                    </CardHeader>
                    <CardContent>
                      {balanceLoading ? (
                        <Skeleton className="h-8 w-32" />
                      ) : (
                        <>
                          <div className={`text-2xl font-bold font-mono-numbers ${
                            (balance?.totalUnrealizedProfit || 0) >= 0 ? 'text-profit' : 'text-loss'
                          }`}>
                            {(balance?.totalUnrealizedProfit || 0) >= 0 ? '+' : ''}
                            {formatCurrency(balance?.totalUnrealizedProfit || 0, 'USD')}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activePositions.length} active position{activePositions.length !== 1 ? 's' : ''}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

              </>
            )}
          </TabsContent>

          {/* Paper Trading Tab */}
          <TabsContent value="paper" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Paper Trading Accounts</h2>
                  <p className="text-sm text-muted-foreground">
                    Simulated accounts for backtesting and paper trading
                  </p>
                </div>
                <AddAccountForm />
              </div>
              <AccountCardList
                filterType="trading"
                backtestOnly
                onSelectAccount={(id) => {
                  const account = accounts?.find(a => a.id === id);
                  setSelectedAccount(account);
                }}
                onTransact={handleTransact}
                emptyMessage="No paper trading accounts yet. Create one to test your strategies risk-free."
              />
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          {isConnected && (
            <TabsContent value="transactions" className="mt-6">
              <BinanceTransactionHistoryTab />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Transaction Dialog */}
      <AccountTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        defaultAccount={selectedAccount}
        defaultTab={defaultTransactionTab}
      />
    </DashboardLayout>
  );
}
