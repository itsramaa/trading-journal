/**
 * Accounts Page - Unified account overview
 * No tabs - Transactions and Financial belong in AccountDetail
 * Mode (Paper/Live) is a context filter, not a feature type
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
  Shield,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { PageHeader } from "@/components/ui/page-header";
import { AddAccountForm } from "@/components/accounts/AddAccountForm";
import { AccountCardList } from "@/components/accounts/AccountCardList";
import { AccountTransactionDialog } from "@/components/accounts/AccountTransactionDialog";
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [binanceDetailsOpen, setBinanceDetailsOpen] = useState(false);
  
  const { data: accounts } = useAccounts();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: balance, isLoading: balanceLoading } = useBinanceBalance();
  const { data: positions } = useBinancePositions();
  const refreshBinance = useRefreshBinanceData();
  
  useAccountsRealtime();
  const { format, formatPnl } = useCurrencyConversion();
  const { showExchangeData, showPaperData } = useModeVisibility();

  // Paper accounts
  const paperAccounts = useMemo(() => 
    accounts?.filter(a => isPaperAccount(a)) || [],
    [accounts]
  );
  const paperAccountIds = useMemo(() => paperAccounts.map(a => a.id), [paperAccounts]);

  // Query for open paper trades - filtered by paper account IDs
  const { data: paperOpenTradesCount } = useQuery({
    queryKey: ['paper-open-trades-count', paperAccountIds],
    queryFn: async () => {
      if (!paperAccountIds.length) return 0;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;
      
      const { count } = await supabase
        .from('trade_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'open')
        .in('trading_account_id', paperAccountIds);
      
      return count || 0;
    },
    enabled: showPaperData && paperAccountIds.length > 0,
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

  const isConfigured = showExchangeData && (connectionStatus?.isConfigured ?? false);
  const isConnected = showExchangeData && (connectionStatus?.isConnected ?? false);
  const activePositions = showExchangeData ? (positions?.filter(p => p.positionAmt !== 0) || []) : [];
  
  const paperAccountsCount = paperAccounts.length;
  const paperTotalBalance = useMemo(() => 
    paperAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [paperAccounts]
  );
  
  // Unified display values
  const binanceBalanceNum = isConnected ? (Number(balance?.totalWalletBalance) || 0) : 0;
  const displayBalance = showPaperData ? paperTotalBalance : binanceBalanceNum;
  const balanceSubtitle = showPaperData ? 'Paper balance' : (isConnected ? 'Binance wallet' : 'No accounts with balance');
  const displayCount = showPaperData ? paperAccountsCount : (isConnected ? 1 : 0);
  const countSubtitle = showPaperData ? `${paperAccountsCount} paper account${paperAccountsCount !== 1 ? 's' : ''}` : (isConnected ? '1 Binance' : 'No accounts');
  const displayPositions = showPaperData ? (paperOpenTradesCount || 0) : activePositions.length;

  return (
    <>
      <Helmet>
        <title>Trading Accounts | Trading Journal</title>
        <meta name="description" content="Manage your trading accounts and paper trading" />
      </Helmet>

      <div className="flex flex-col gap-6">
        {/* Page Header */}
        <PageHeader
          icon={CandlestickChart}
          title="Trading Accounts"
          description="Manage your trading accounts and track performance"
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

        {/* Unified Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3" role="region" aria-label="Accounts overview">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {balanceLoading && !showPaperData ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold font-mono-numbers">
                    {format(displayBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{balanceSubtitle}</p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Accounts</CardTitle>
              <CandlestickChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayCount}</div>
              <p className="text-xs text-muted-foreground mt-1">{countSubtitle}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
              {showPaperData ? (
                <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
              ) : (balance?.totalUnrealizedProfit || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-profit" />
              ) : (
                <TrendingDown className="h-4 w-4 text-loss" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayPositions}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {!showPaperData && isConnected && activePositions.length > 0 && (
                  <span className={`text-xs ${(balance?.totalUnrealizedProfit || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatPnl(balance?.totalUnrealizedProfit || 0)} unrealized
                  </span>
                )}
                {displayPositions === 0 && (
                  <span className="text-xs text-muted-foreground">No open positions</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Binance Connection Section - Live mode only */}
        {showExchangeData && (
          <div className="space-y-4">
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
              <Collapsible open={binanceDetailsOpen} onOpenChange={setBinanceDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-0 hover:bg-transparent">
                    <h2 className="text-lg font-semibold">Binance Futures Details</h2>
                    <Badge variant="secondary" className="bg-profit/20 text-profit">Live</Badge>
                    {binanceDetailsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-3">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
                        <Wallet className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        {balanceLoading ? <Skeleton className="h-8 w-32" /> : (
                          <>
                            <div className="text-2xl font-bold font-mono-numbers">{format(balance?.totalWalletBalance || 0)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total USDT balance</p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available</CardTitle>
                        <CandlestickChart className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        {balanceLoading ? <Skeleton className="h-8 w-32" /> : (
                          <>
                            <div className="text-2xl font-bold font-mono-numbers">{format(balance?.availableBalance || 0)}</div>
                            <p className="text-xs text-muted-foreground mt-1">For new positions</p>
                          </>
                        )}
                      </CardContent>
                    </Card>
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
                        {balanceLoading ? <Skeleton className="h-8 w-32" /> : (
                          <>
                            <div className={`text-2xl font-bold font-mono-numbers ${(balance?.totalUnrealizedProfit || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
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
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        )}

        {/* Section Header + Add Account */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">
              {showPaperData ? 'Paper Trading Accounts' : 'Trading Accounts'}
            </h2>
            {showPaperData && (
              <Badge variant="outline">
                <FlaskConical className="h-3 w-3 mr-1" />
                Simulated
              </Badge>
            )}
          </div>
          <AddAccountForm defaultIsBacktest={showPaperData} />
        </div>

        {/* Account Cards - Both modes, filtered */}
        <AccountCardList
          filterType="trading"
          excludeBacktest={!showPaperData}
          backtestOnly={showPaperData}
          onTransact={handleTransact}
          onEdit={handleEdit}
          emptyMessage={showPaperData 
            ? "No paper trading accounts yet. Create one to test your strategies risk-free."
            : "No live trading accounts yet. Add an account to track your real trades."}
        />

        {/* Account Comparison Table */}
        <AccountComparisonTable />
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
