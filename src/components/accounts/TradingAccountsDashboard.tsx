import { useMemo } from "react";
import { CandlestickChart, TrendingUp, TrendingDown, Wallet, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAccounts } from "@/hooks/use-accounts";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { formatCurrency, formatCompactCurrency } from "@/lib/formatters";
import { useUserSettings } from "@/hooks/use-user-settings";

export function TradingAccountsDashboard() {
  const { data: settingsData } = useUserSettings();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: trades, isLoading: tradesLoading } = useTradeEntries();
  const currency = settingsData?.default_currency || 'USD';

  const stats = useMemo(() => {
    if (!accounts) return null;

    // Filter trading accounts (exclude funding)
    const tradingAccounts = accounts.filter(a => a.account_type === 'trading');
    const realAccounts = tradingAccounts.filter(a => !a.metadata?.is_backtest);
    const backtestAccounts = tradingAccounts.filter(a => a.metadata?.is_backtest);

    // Calculate balances
    const totalRealBalance = realAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
    const totalBacktestBalance = backtestAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
    
    // Calculate initial capital for real accounts
    const totalInitialCapital = realAccounts.reduce((sum, a) => {
      const initial = a.metadata?.initial_balance || Number(a.balance);
      return sum + Number(initial);
    }, 0);

    // Calculate P&L from trades
    const realizedPnL = trades?.filter(t => t.status === 'closed').reduce((sum, t) => sum + (t.realized_pnl || 0), 0) || 0;
    const unrealizedPnL = trades?.filter(t => t.status === 'open').reduce((sum, t) => sum + (t.pnl || 0), 0) || 0;

    // Total P&L percentage
    const totalPnL = realizedPnL + unrealizedPnL;
    const pnlPercentage = totalInitialCapital > 0 ? (totalPnL / totalInitialCapital) * 100 : 0;

    return {
      totalRealBalance,
      totalBacktestBalance,
      totalInitialCapital,
      realizedPnL,
      unrealizedPnL,
      totalPnL,
      pnlPercentage,
      realAccountsCount: realAccounts.length,
      backtestAccountsCount: backtestAccounts.length,
    };
  }, [accounts, trades]);

  const isLoading = accountsLoading || tradesLoading;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 w-24 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Trading Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Trading Balance</CardTitle>
          <CandlestickChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono-numbers">
            {formatCompactCurrency(stats.totalRealBalance, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.realAccountsCount} active account{stats.realAccountsCount !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>

      {/* Total P&L */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
          {stats.totalPnL >= 0 ? (
            <TrendingUp className="h-4 w-4 text-profit" />
          ) : (
            <TrendingDown className="h-4 w-4 text-loss" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold font-mono-numbers ${stats.totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
            {stats.totalPnL >= 0 ? '+' : ''}{formatCompactCurrency(stats.totalPnL, currency)}
          </div>
          <p className={`text-xs mt-1 ${stats.pnlPercentage >= 0 ? 'text-profit' : 'text-loss'}`}>
            {stats.pnlPercentage >= 0 ? '+' : ''}{stats.pnlPercentage.toFixed(2)}% overall
          </p>
        </CardContent>
      </Card>

      {/* Realized P&L */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Realized P&L</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold font-mono-numbers ${stats.realizedPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
            {stats.realizedPnL >= 0 ? '+' : ''}{formatCompactCurrency(stats.realizedPnL, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            From closed trades
          </p>
        </CardContent>
      </Card>

      {/* Paper Trading Balance */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paper Trading</CardTitle>
          <Wallet className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold font-mono-numbers">
            {formatCompactCurrency(stats.totalBacktestBalance, currency)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.backtestAccountsCount} backtest account{stats.backtestAccountsCount !== 1 ? 's' : ''}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
