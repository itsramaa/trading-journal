/**
 * Accounts Page - Binance-centered account management
 * Tabs: Accounts (merged Binance + Paper), Transactions, and Financial Summary
 * System-First: Aggregates Paper + Binance data in overview cards
 */
import { useState, useMemo } from "react";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  CandlestickChart, 
  FlaskConical, 
  Settings, 
  RefreshCw, 
  XCircle,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowDownUp,
  CircleDollarSign,
  Shield,
  Wifi
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { PageHeader } from "@/components/ui/page-header";
import { AddAccountForm } from "@/components/accounts/AddAccountForm";
import { AccountCardList } from "@/components/accounts/AccountCardList";
import { AccountTransactionDialog } from "@/components/accounts/AccountTransactionDialog";
import { BinanceTransactionHistoryTab } from "@/components/trading/BinanceTransactionHistory";
import { FinancialSummaryCard } from "@/components/accounts/FinancialSummaryCard";
import { AccountComparisonTable } from "@/components/accounts/AccountComparisonTable";
import { EditAccountDialog } from "@/components/accounts/EditAccountDialog";
import { BinanceNotConfiguredState } from "@/components/binance/BinanceNotConfiguredState";

import { useAccounts } from "@/hooks/use-accounts";
import { useAccountsRealtime } from "@/hooks/use-realtime";
import { 
  useBinanceConnectionStatus, 
  useBinanceBalance, 
  useBinancePositions,
  useRefreshBinanceData
} from "@/features/binance";
import { supabase } from "@/integrations/supabase/client";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { Account } from "@/types/account";
import { isPaperAccount } from "@/lib/account-utils";

export default function Accounts() {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [defaultTransactionTab, setDefaultTransactionTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'financial'>('accounts');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  
  const { data: accounts } = useAccounts();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: balance, isLoading: balanceLoading } = useBinanceBalance();
  const { data: positions } = useBinancePositions();
  const refreshBinance = useRefreshBinanceData();
  
  // Enable realtime updates for accounts
  useAccountsRealtime();
  
  // Currency conversion
  const { format, formatPnl } = useCurrencyConversion();

  // Query for open paper trades (System-First: internal data)
  const { data: paperOpenTradesCount } = useQuery({
    queryKey: ['paper-open-trades-count'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { count } = await supabase
        .from('trade_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'open')
        .not('trading_account_id', 'is', null);
      
      return count || 0;
    },
    staleTime: 30 * 1000,
  });

  const handleTransact = (accountId: string, type: 'deposit' | 'withdraw') => {
    const account = accounts?.find(a => a.id === accountId);
    setSelectedAccount(account);
    setDefaultTransactionTab(type);
    setTransactionDialogOpen(true);
  };

  const handleEdit = (account: Account) => {
    setEditAccount(account);
    setEditDialogOpen(true);
  };

  const { showExchangeData, showExchangeBalance, showPaperData } = useModeVisibility();

  const isConfigured = showExchangeData && (connectionStatus?.isConfigured ?? false);
  const isConnected = showExchangeData && (connectionStatus?.isConnected ?? false);
  const activePositions = showExchangeData ? (positions?.filter(p => p.positionAmt !== 0) || []) : [];
  
  // Paper accounts calculation (System-First)
  const paperAccounts = useMemo(() => 
    showPaperData 
      ? (accounts?.filter(a => isPaperAccount(a)) || [])
      : [],
    [accounts, showPaperData]
  );
  const paperAccountsCount = paperAccounts.length;
  const paperTotalBalance = useMemo(() => 
    paperAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [paperAccounts]
  );
  
  // Combined totals (mode-aware)
  const binanceBalanceNum = isConnected ? (Number(balance?.totalWalletBalance) || 0) : 0;
  // Mode-isolated balance: show only relevant data per mode
  const displayTotalBalance = showPaperData ? paperTotalBalance : binanceBalanceNum;
  
  const binancePositionsCount = activePositions.length;
  // Mode-isolated positions
  const displayActivePositions = showPaperData ? (paperOpenTradesCount || 0) : binancePositionsCount;
  
  const totalAccounts = showPaperData ? paperAccountsCount : (isConnected ? 1 : 0);

  return (
    <>
      <Helmet>
        <title>Trading Accounts | Trading Journal</title>
        <meta name="description" content="Manage your Binance Futures account and paper trading accounts" />
      </Helmet>

      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <PageHeader
          icon={CandlestickChart}
          title="Trading Accounts"
          description="View your Binance Futures account and manage paper trading"
        >
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
          <Button variant="outline" asChild>
            <Link to="/risk?tab=settings" aria-label="Open risk settings">
              <Shield className="h-4 w-4 mr-2" aria-hidden="true" />
              Risk Settings
            </Link>
          </Button>
        </PageHeader>

        {/* Accounts Overview Cards - System-First: Aggregated Data */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
              <CandlestickChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAccounts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {showPaperData ? `${paperAccountsCount} Paper` : (isConnected ? '1 Binance' : 'No accounts')}
              </p>
            </CardContent>
          </Card>
          
          {/* Total Balance - Aggregated Binance + Paper */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold font-mono-numbers">
                    {format(displayTotalBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {showPaperData ? 'Paper balance' : (isConnected ? 'Binance balance' : 'No accounts with balance')}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Active Positions - Aggregated Binance + Paper */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
              {showPaperData ? (
                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
              ) : (balance?.totalUnrealizedProfit || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-profit" />
              ) : (
                <TrendingDown className="h-4 w-4 text-loss" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayActivePositions}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {!showPaperData && isConnected && binancePositionsCount > 0 && (
                  <span className={`text-xs ${(balance?.totalUnrealizedProfit || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatPnl(balance?.totalUnrealizedProfit || 0)} unrealized
                  </span>
                )}
                {displayActivePositions === 0 && (
                  <span className="text-xs text-muted-foreground">No open positions</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Tabs - Always visible, exchange tabs disabled when not connected */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3 lg:w-[500px]" aria-label="Account type tabs">
            <TabsTrigger value="accounts" className="gap-2" aria-label={`All Accounts - ${totalAccounts} accounts`}>
              <CandlestickChart className="h-4 w-4" aria-hidden="true" />
              Accounts
              {totalAccounts > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs" aria-hidden="true">
                  {totalAccounts}
                </Badge>
              )}
            </TabsTrigger>
            
            {/* Transactions Tab - Always visible */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex w-full">
                  <TabsTrigger 
                    value="transactions" 
                    className="gap-2 w-full" 
                    disabled={!isConnected || !showExchangeData}
                    aria-label="Transaction History"
                  >
                    <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
                    Transactions
                    {(!isConnected || !showExchangeData) && (
                      <Wifi className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    )}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              {(!isConnected || !showExchangeData) && (
                <TooltipContent>
                  <p>{!showExchangeData ? 'Switch to Live mode' : 'Requires Binance connection'}</p>
                </TooltipContent>
              )}
            </Tooltip>
            
            {/* Financial Tab - Always visible */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex w-full">
                  <TabsTrigger 
                    value="financial" 
                    className="gap-2 w-full" 
                    disabled={!isConnected || !showExchangeData}
                    aria-label="Financial Summary"
                  >
                    <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
                    Financial
                    {(!isConnected || !showExchangeData) && (
                      <Wifi className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                    )}
                  </TabsTrigger>
                </span>
              </TooltipTrigger>
              {(!isConnected || !showExchangeData) && (
                <TooltipContent>
                  <p>{!showExchangeData ? 'Switch to Live mode' : 'Requires Binance connection'}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TabsList>

          {/* Accounts Tab - Mode-aware: Binance (Live) + Paper */}
          <TabsContent value="accounts" className="mt-6 space-y-6">
            {/* Binance Account Section — Live mode only */}
            {showExchangeData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">Binance Futures</h2>
                  {isConnected && (
                    <Badge variant="secondary" className="bg-profit/20 text-profit">Live</Badge>
                  )}
                </div>
              </div>
              
              {!isConfigured ? (
                <Card className="border-dashed">
                  <CardContent className="py-0">
                    <BinanceNotConfiguredState 
                      title="Binance Not Configured"
                      description="Connect your Binance Futures API to view real-time balance and positions."
                    />
                  </CardContent>
                </Card>
              ) : !isConnected ? (
                <Card className="border-dashed">
                  <CardContent className="py-8">
                    <div className="text-center max-w-md mx-auto">
                      <XCircle className="h-12 w-12 mx-auto mb-4 text-loss/60" />
                      <h3 className="text-lg font-semibold mb-2">Connection Error</h3>
                      <p className="text-muted-foreground mb-4">
                        Unable to connect to Binance. Please check your API credentials.
                      </p>
                      <Button asChild>
                        <Link to="/settings?tab=exchange">
                          <Settings className="h-4 w-4 mr-2" />
                          Check API Settings
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
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
                            {format(balance?.totalWalletBalance || 0)}
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
                            {format(balance?.availableBalance || 0)}
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
                            {formatPnl(balance?.totalUnrealizedProfit || 0)}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activePositions.length} active position{activePositions.length !== 1 ? 's' : ''}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
            )}

            {/* Account Comparison Table */}
            <AccountComparisonTable />

            {/* Paper Trading Section — Paper mode only */}
            {showPaperData && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">Paper Trading</h2>
                    <Badge variant="outline">
                      <FlaskConical className="h-3 w-3 mr-1" />
                      Simulated
                    </Badge>
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
                  onEdit={handleEdit}
                  emptyMessage="No paper trading accounts yet. Create one to test your strategies risk-free."
                />
              </div>
            )}
          </TabsContent>

          {/* Transactions Tab - Always rendered, component handles empty state */}
          <TabsContent value="transactions" className="mt-6">
            <BinanceTransactionHistoryTab />
          </TabsContent>

          {/* Financial Summary Tab - Summary cards only, details moved to Trade History */}
          <TabsContent value="financial" className="mt-6">
            <FinancialSummaryCard />
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

      <EditAccountDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        account={editAccount}
      />
    </>
  );
}
