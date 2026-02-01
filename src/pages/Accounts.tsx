/**
 * Accounts Page - Binance-centered account management
 * Tabs: Accounts (merged Binance + Paper), Transactions, and Financial Summary
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
  ArrowDownUp,
  CircleDollarSign,
  Shield
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { AddAccountForm } from "@/components/accounts/AddAccountForm";
import { AccountCardList } from "@/components/accounts/AccountCardList";
import { AccountTransactionDialog } from "@/components/accounts/AccountTransactionDialog";
import { BinanceTransactionHistoryTab } from "@/components/trading/BinanceTransactionHistory";
import { FinancialSummaryCard } from "@/components/accounts/FinancialSummaryCard";
import { BinanceNotConfiguredState } from "@/components/binance/BinanceNotConfiguredState";

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
  const [activeTab, setActiveTab] = useState<'accounts' | 'transactions' | 'financial'>('accounts');
  
  const { data: accounts } = useAccounts();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: balance, isLoading: balanceLoading } = useBinanceBalance();
  const { data: positions } = useBinancePositions();
  const refreshBinance = useRefreshBinanceData();
  
  // Enable realtime updates for accounts
  useAccountsRealtime();

  const handleTransact = (accountId: string, type: 'deposit' | 'withdraw') => {
    const account = accounts?.find(a => a.id === accountId);
    setSelectedAccount(account);
    setDefaultTransactionTab(type);
    setTransactionDialogOpen(true);
  };

  const isConfigured = connectionStatus?.isConfigured ?? false;
  const isConnected = connectionStatus?.isConnected ?? false;
  const activePositions = positions?.filter(p => p.positionAmt !== 0) || [];
  const paperAccountsCount = accounts?.filter(a => a.account_type === 'trading' && a.metadata?.is_backtest).length || 0;
  const totalAccounts = (isConnected ? 1 : 0) + paperAccountsCount;

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
            <Button variant="outline" asChild>
              <Link to="/risk?tab=settings" aria-label="Open risk settings">
                <Shield className="h-4 w-4 mr-2" aria-hidden="true" />
                Risk Settings
              </Link>
            </Button>
          </div>
        </div>

        {/* Accounts Overview Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Accounts</CardTitle>
              <CandlestickChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalAccounts}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {isConnected ? '1 Binance' : '0 Binance'} + {paperAccountsCount} Paper
              </p>
            </CardContent>
          </Card>
          
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
                    {formatCurrency(balance?.totalWalletBalance || 0, 'USD')}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Binance wallet balance
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
              {(balance?.totalUnrealizedProfit || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-profit" />
              ) : (
                <TrendingDown className="h-4 w-4 text-loss" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activePositions.length}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {(balance?.totalUnrealizedProfit || 0) >= 0 ? '+' : ''}{formatCurrency(balance?.totalUnrealizedProfit || 0, 'USD')} unrealized
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Account Tabs */}
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
            {isConnected && (
              <>
                <TabsTrigger value="transactions" className="gap-2" aria-label="Transaction History">
                  <ArrowDownUp className="h-4 w-4" aria-hidden="true" />
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="financial" className="gap-2" aria-label="Financial Summary">
                  <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
                  Financial
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Accounts Tab - Merged Binance + Paper */}
          <TabsContent value="accounts" className="mt-6 space-y-6">
            {/* Binance Account Section */}
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
              )}
            </div>

            {/* Paper Trading Section */}
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

          {/* Financial Summary Tab */}
          {isConnected && (
            <TabsContent value="financial" className="mt-6">
              <FinancialSummaryCard showDetails={true} />
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
