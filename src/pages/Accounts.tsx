/**
 * Accounts Page - Binance-centered account management
 * Primary: Binance Futures account with live data
 * Secondary: Paper trading accounts for backtesting
 */
import { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { 
  CandlestickChart, 
  FlaskConical, 
  Settings, 
  RefreshCw, 
  CheckCircle2, 
  XCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  ExternalLink,
  Download
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
import { BinanceTradeHistory } from "@/components/trading/BinanceTradeHistory";
import { useAccounts } from "@/hooks/use-accounts";
import { useAccountsRealtime } from "@/hooks/use-realtime";
import { 
  useBinanceConnectionStatus, 
  useBinanceBalance, 
  useBinancePositions,
  useRefreshBinanceData
} from "@/features/binance";
import { formatCurrency } from "@/lib/formatters";
import type { Account } from "@/types/account";

export default function Accounts() {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [defaultTransactionTab, setDefaultTransactionTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [activeTab, setActiveTab] = useState<'binance' | 'paper'>('binance');
  
  const { data: accounts } = useAccounts();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: balance, isLoading: balanceLoading, refetch: refetchBalance } = useBinanceBalance();
  const { data: positions, isLoading: positionsLoading } = useBinancePositions();
  const refreshBinance = useRefreshBinanceData();
  
  // Enable realtime updates for accounts
  useAccountsRealtime();

  const handleTransact = (accountId: string, type: 'deposit' | 'withdraw') => {
    const account = accounts?.find(a => a.id === accountId);
    setSelectedAccount(account);
    setDefaultTransactionTab(type);
    setTransactionDialogOpen(true);
  };

  const isConnected = connectionStatus?.isConnected;
  const activePositions = positions?.filter(p => p.positionAmt !== 0) || [];
  const backtestCount = accounts?.filter(a => a.account_type === 'trading' && a.metadata?.is_backtest).length || 0;

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
            <h1 className="text-3xl font-bold tracking-tight">Trading Accounts</h1>
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

        {/* Account Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]" aria-label="Account type tabs">
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

                  {/* Connection Status */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Status</CardTitle>
                      <CheckCircle2 className="h-4 w-4 text-profit" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-profit border-profit/30">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {connectionStatus?.permissions?.length || 0} permissions
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Active Positions Summary */}
                {activePositions.length > 0 && (
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

                {/* Recent Trades */}
                <BinanceTradeHistory limit={20} />
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
