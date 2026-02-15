/**
 * AccountDetail Page - Unified detail view for both Paper and Live accounts.
 * 
 * Layout is 100% identical between modes. Only data source and business rules differ:
 * - Paper: full CRUD, data from DB
 * - Live (Binance virtual): read-only, data from exchange API + synced trades
 */
import { useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { AccountDetailHeader } from "@/components/accounts/detail/AccountDetailHeader";
import { AccountDetailMetrics } from "@/components/accounts/detail/AccountDetailMetrics";
import { AccountDetailOverview } from "@/components/accounts/detail/AccountDetailOverview";
import { AccountDetailTransactions } from "@/components/accounts/detail/AccountDetailTransactions";
import { AccountDetailFinancial } from "@/components/accounts/detail/AccountDetailFinancial";

import { useAccounts, useAccountTransactions } from "@/hooks/use-accounts";
import { useAccountAnalytics } from "@/hooks/use-account-analytics";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";

import {
  useBinanceConnectionStatus,
  useBinanceBalance,
  useBinancePositions,
  useRefreshBinanceData,
} from "@/features/binance";
import { isPaperAccount } from "@/lib/account-utils";

export default function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab }, { replace: true });
  };

  const isBinanceVirtual = accountId === 'binance';

  // DB account hooks (skip for binance virtual)
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: transactions, isLoading: transactionsLoading } = useAccountTransactions(
    isBinanceVirtual ? undefined : accountId
  );
  const { data: allTrades } = useModeFilteredTrades();

  // Analytics: for Binance virtual, fetch live trade stats (no specific account_id)
  const { data: stats, isLoading: statsLoading } = useAccountAnalytics({
    accountId: isBinanceVirtual ? null : (accountId || null),
    tradeMode: isBinanceVirtual ? 'live' : undefined,
  });

  // Binance hooks (always called, data used only when isBinanceVirtual)
  const { data: connectionStatus, isLoading: binanceStatusLoading } = useBinanceConnectionStatus();
  const { data: binanceBalance, isLoading: binanceBalanceLoading } = useBinanceBalance();
  const { data: binancePositions } = useBinancePositions();
  const refreshBinance = useRefreshBinanceData();

  const isConnected = connectionStatus?.isConnected ?? false;
  const activePositions = binancePositions?.filter(p => p.positionAmt !== 0) || [];

  const account = isBinanceVirtual ? null : accounts?.find((a) => a.id === accountId);

  // Derived values - unified across modes
  const displayName = isBinanceVirtual ? 'Binance Futures' : (account?.name || '');
  const displayBalance = isBinanceVirtual
    ? (Number(binanceBalance?.totalWalletBalance) || 0)
    : Number(account?.balance || 0);
  const displaySubtitle = isBinanceVirtual
    ? 'Connected Exchange • USDT'
    : `${account?.metadata?.broker || 'Trading Account'} • ${account?.currency}`;
  const initialBalance = isBinanceVirtual
    ? Math.max((Number(binanceBalance?.totalWalletBalance) || 0) - (stats?.totalPnlNet || 0), 1)
    : (account?.metadata?.initial_balance ?? Number(account?.balance));
  const unrealizedPnl = Number(binanceBalance?.totalUnrealizedProfit) || 0;

  // Filter trades for this account (equity curve + strategy breakdown)
  // For Binance virtual: use all live-mode closed trades
  const accountTrades = useMemo(() => {
    if (isBinanceVirtual) {
      return allTrades?.filter(t => t.trade_mode === 'live' && t.status === 'closed') || [];
    }
    return allTrades?.filter(t => t.trading_account_id === accountId && t.status === 'closed') || [];
  }, [allTrades, accountId, isBinanceVirtual]);

  // Equity curve data
  const equityData = useMemo(() => {
    if (!accountTrades.length) return [];
    const sorted = [...accountTrades].sort(
      (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    );
    let cumulative = 0;
    let peak = 0;
    return sorted.map((trade) => {
      const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
      cumulative += pnl;
      if (cumulative > peak) peak = cumulative;
      // Use initialBalance + peak as denominator to get realistic drawdown %
      const drawdownBase = initialBalance + peak;
      const drawdown = Math.min(
        drawdownBase > 0 ? ((peak - cumulative) / drawdownBase) * 100 : 0,
        100
      );
      return {
        date: format(new Date(trade.trade_date), 'MMM d'),
        pnl,
        cumulative,
        drawdown: -drawdown,
      };
    });
  }, [accountTrades, initialBalance]);


  // Capital flow stats (DB accounts only)
  const flowStats = useMemo(() => {
    if (!transactions?.length) return null;
    const totalDeposits = transactions
      .filter((t) => t.transaction_type === "deposit")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalWithdrawals = transactions
      .filter((t) => t.transaction_type === "withdrawal")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    return { totalDeposits, totalWithdrawals, netFlow: totalDeposits - totalWithdrawals };
  }, [transactions]);

  // Loading states
  const isLoading = isBinanceVirtual ? (binanceStatusLoading || binanceBalanceLoading) : accountsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  // Not found checks
  if (isBinanceVirtual && !isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Binance not connected</p>
        <Button onClick={() => navigate("/accounts")} className="mt-4">Back to Accounts</Button>
      </div>
    );
  }

  if (!isBinanceVirtual && !account) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Account not found</p>
        <Button onClick={() => navigate("/accounts")} className="mt-4">Back to Accounts</Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{displayName} | Trading Account</title>
        <meta name="description" content={`Analytics and details for ${displayName}`} />
      </Helmet>

      <div className="space-y-6">
        {/* Header - identical layout, different actions */}
        <AccountDetailHeader
          account={account}
          isBinanceVirtual={isBinanceVirtual}
          displayName={displayName}
          displayBalance={displayBalance}
          displaySubtitle={displaySubtitle}
          onRefresh={() => refreshBinance.mutate()}
          isRefreshing={refreshBinance.isPending}
          unrealizedPnl={isBinanceVirtual ? unrealizedPnl : undefined}
        />

        {/* Metrics - identical 5 cards, same labels */}
        <AccountDetailMetrics
          stats={stats}
          statsLoading={statsLoading}
          isBinanceVirtual={isBinanceVirtual}
          displayBalance={displayBalance}
          initialBalance={initialBalance}
          unrealizedPnl={isBinanceVirtual ? unrealizedPnl : undefined}
          activePositionsCount={isBinanceVirtual ? activePositions.length : undefined}
        />

        {/* Tabs - identical 3 tabs for both modes */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
           <TabsList>
             <TabsTrigger value="overview">Overview</TabsTrigger>
             <TabsTrigger value="transactions">Transactions</TabsTrigger>
             <TabsTrigger value="financial">Financial</TabsTrigger>
           </TabsList>

          <TabsContent value="overview" className="mt-4">
            <AccountDetailOverview
              equityData={equityData}
              stats={stats}
              flowStats={flowStats}
              isBinanceVirtual={isBinanceVirtual}
              activePositions={isBinanceVirtual ? activePositions : undefined}
            />
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <AccountDetailTransactions
              transactions={transactions}
              transactionsLoading={transactionsLoading}
              isBinanceVirtual={isBinanceVirtual}
            />
          </TabsContent>

          <TabsContent value="financial" className="mt-4">
            <AccountDetailFinancial
              stats={stats}
              statsLoading={statsLoading}
              initialBalance={initialBalance}
              totalTrades={stats?.totalTrades || 0}
            />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
