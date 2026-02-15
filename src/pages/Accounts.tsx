/**
 * Accounts Page - Unified account overview
 * No tabs - Transactions and Financial belong in AccountDetail
 * Mode (Paper/Live) is a context filter, not a feature type
 */
import { useState, useMemo } from "react";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { 
  CandlestickChart, 
  Settings, 
  RefreshCw, 
  Wallet,
  TrendingUp,
  TrendingDown,
  Shield
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/ui/info-tooltip";

import { PageHeader } from "@/components/ui/page-header";
import { AddAccountForm } from "@/components/accounts/AddAccountForm";
import { AccountCardList } from "@/components/accounts/AccountCardList";
import { AccountTransactionDialog } from "@/components/accounts/AccountTransactionDialog";
import { AccountComparisonTable } from "@/components/accounts/AccountComparisonTable";
import { EditAccountDialog } from "@/components/accounts/EditAccountDialog";

import { useAccounts } from "@/hooks/use-accounts";
import { useAccountsRealtime } from "@/hooks/use-realtime";
import { 
  useBinanceConnectionStatus, 
  useBinanceBalance, 
  useBinancePositions,
  useRefreshBinanceData
} from "@/features/binance";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { isPaperAccount } from "@/lib/account-utils";
import { useOpenTradesCount } from "@/hooks/use-open-trades-count";
import type { Account } from "@/types/account";


export default function Accounts() {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | undefined>();
  const [defaultTransactionTab, setDefaultTransactionTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  
  
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: balance, isLoading: balanceLoading } = useBinanceBalance();
  const { data: positions } = useBinancePositions();
  const refreshBinance = useRefreshBinanceData();
  
  useAccountsRealtime();
  const { format, formatPnl } = useCurrencyConversion();
  const { showExchangeData, showPaperData } = useModeVisibility();

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

  const isConnected = showExchangeData && (connectionStatus?.isConnected ?? false);
  const activePositions = isConnected ? (positions?.filter(p => p.positionAmt !== 0) || []) : [];
  
  // Filter accounts by mode for summary
  const modeAccounts = useMemo(() => 
    (accounts || []).filter(a => {
      const paper = isPaperAccount(a);
      return showPaperData ? paper : !paper;
    }), [accounts, showPaperData]);

  // Mode-filtered account IDs for open trades query
  const modeAccountIds = useMemo(() => modeAccounts.map(a => a.id), [modeAccounts]);

  // Query for open trades - extracted to hook
  const { data: openTradesCount } = useOpenTradesCount(modeAccountIds);

  const totalDbBalance = useMemo(() => 
    modeAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0),
    [modeAccounts]);
  
  // Unified display values - mode-filtered
  const binanceBalanceNum = isConnected ? (Number(balance?.totalWalletBalance) || 0) : 0;
  const displayBalance = totalDbBalance + binanceBalanceNum;
  const modeAccountsCount = modeAccounts.length;
  const displayCount = modeAccountsCount + (isConnected ? 1 : 0);
  const displayPositions = (openTradesCount || 0) + (isConnected ? activePositions.length : 0);

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
            <Link to="/risk-analytics?tab=settings" aria-label="Open risk settings">
              <Shield className="h-4 w-4 mr-2" aria-hidden="true" />
              Risk Settings
            </Link>
          </Button>
        </PageHeader>

        {/* Unified Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3" role="region" aria-label="Accounts overview">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Balance
                <InfoTooltip content="Total balance across all accounts in the active mode. Live mode includes connected exchange wallet balance." />
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {(balanceLoading || accountsLoading) ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <>
                  <div className="text-2xl font-bold font-mono-numbers">
                    {format(displayBalance)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {showPaperData ? 'Paper accounts' : 'Exchange accounts'}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Accounts
                <InfoTooltip content="Number of active trading accounts in the current mode." />
              </CardTitle>
              <CandlestickChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayCount}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {showPaperData ? 'Paper accounts' : 'Exchange accounts'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Open Positions
                <InfoTooltip content="Trades with status 'open' plus active exchange positions." />
              </CardTitle>
              {displayPositions > 0 ? (
                showExchangeData && (balance?.totalUnrealizedProfit || 0) < 0 ? (
                  <TrendingDown className="h-4 w-4 text-loss" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-profit" />
                )
              ) : (
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{displayPositions}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {isConnected && activePositions.length > 0 && (
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

        {/* Section Header + Add Account (Paper mode only) */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Trading Accounts</h2>
          {showPaperData && <AddAccountForm />}
        </div>

        {/* Account Cards - filtered by mode */}
        <AccountCardList
          filterType="trading"
          paperOnly={showPaperData}
          onTransact={handleTransact}
          onEdit={handleEdit}
          emptyMessage={showPaperData 
            ? "No paper accounts yet. Create one to get started." 
            : "No exchange accounts found. Connect your exchange in API Settings."}
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
