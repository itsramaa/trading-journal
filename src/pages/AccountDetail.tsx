import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { 
  ArrowLeft, 
  CandlestickChart, 
  FlaskConical,
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3
} from "lucide-react";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAccounts, useAccountTransactions } from "@/hooks/use-accounts";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { formatCurrency } from "@/lib/formatters";
import type { AccountType, AccountTransactionType } from "@/types/account";

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ElementType> = {
  trading: CandlestickChart,
  backtest: FlaskConical,
  funding: Wallet,
};

const TRANSACTION_TYPE_CONFIG: Record<
  AccountTransactionType,
  { label: string; icon: React.ElementType; color: string }
> = {
  deposit: { label: "Deposit", icon: ArrowDownCircle, color: "text-profit" },
  withdrawal: { label: "Withdrawal", icon: ArrowUpCircle, color: "text-loss" },
};

export default function AccountDetail() {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: transactions, isLoading: transactionsLoading } = useAccountTransactions(accountId);
  const { data: allTrades } = useTradeEntries();
  
  // Filter trades for this account
  const accountTrades = useMemo(() => {
    return allTrades?.filter(t => t.trading_account_id === accountId) || [];
  }, [allTrades, accountId]);

  // Filtering state
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountTransactionType | "all">("all");

  const account = accounts?.find((a) => a.id === accountId);
  const isBacktest = account?.metadata?.is_backtest === true;
  
  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter((tx) => {
      const matchesSearch = searchQuery === "" || 
        (tx.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
        (tx.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
      const matchesType = typeFilter === "all" || tx.transaction_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, typeFilter]);
  
  const Icon = account 
    ? (isBacktest ? FlaskConical : ACCOUNT_TYPE_ICONS[account.account_type]) 
    : CandlestickChart;

  // Calculate statistics
  const stats = useMemo(() => {
    if (!transactions?.length && !accountTrades.length) return null;
    
    const totalDeposits = transactions
      ?.filter((t) => t.transaction_type === "deposit")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    
    const totalWithdrawals = transactions
      ?.filter((t) => t.transaction_type === "withdrawal")
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
    
    const netFlow = totalDeposits - totalWithdrawals;

    // Trade statistics
    const realizedPnL = accountTrades
      .filter(t => t.status === 'closed')
      .reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
    
    const winningTrades = accountTrades.filter(t => t.result === 'win').length;
    const losingTrades = accountTrades.filter(t => t.result === 'loss').length;
    const totalClosedTrades = winningTrades + losingTrades;
    const winRate = totalClosedTrades > 0 ? (winningTrades / totalClosedTrades) * 100 : 0;

    return {
      totalDeposits,
      totalWithdrawals,
      netFlow,
      totalTransactions: transactions?.length || 0,
      realizedPnL,
      totalTrades: accountTrades.length,
      winRate,
      winningTrades,
      losingTrades,
    };
  }, [transactions, accountTrades]);

  if (accountsLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!account) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">Account not found</p>
          <Button onClick={() => navigate("/accounts")} className="mt-4">
            Back to Accounts
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>{account.name} | Trading Account</title>
        <meta name="description" content={`View trades and details for ${account.name}`} />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/accounts")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div 
            className={`flex h-12 w-12 items-center justify-center rounded-xl ${isBacktest ? 'bg-chart-4' : 'bg-primary'}`}
          >
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{account.name}</h1>
              {isBacktest && <Badge variant="secondary">Paper Trading</Badge>}
            </div>
            <p className="text-muted-foreground">
              {account.metadata?.broker || 'Trading Account'} • {account.currency}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(Number(account.balance), account.currency)}</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Realized P&L</p>
                  <p className={`text-xl font-bold ${(stats?.realizedPnL || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {(stats?.realizedPnL || 0) >= 0 ? '+' : ''}{formatCurrency(stats?.realizedPnL || 0, account.currency)}
                  </p>
                </div>
                {(stats?.realizedPnL || 0) >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-profit/50" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-loss/50" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  <p className="text-xl font-bold">
                    {stats?.winRate.toFixed(1) || 0}%
                  </p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.winningTrades || 0}W / {stats?.losingTrades || 0}L
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  <p className="text-xl font-bold">{stats?.totalTrades || 0}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <Link to="/trading-journey/journal" className="text-xs text-primary hover:underline mt-1 block">
                View in Journal →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net Flow</p>
                  <p className={`text-xl font-bold ${(stats?.netFlow || 0) >= 0 ? "text-profit" : "text-loss"}`}>
                    {formatCurrency(stats?.netFlow || 0, account.currency)}
                  </p>
                </div>
                <RefreshCw className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Deposit/Withdrawal History */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-lg">Transaction History</CardTitle>
                <CardDescription>Deposits and withdrawals</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex flex-col gap-3 mb-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="deposit">Deposits</SelectItem>
                  <SelectItem value="withdrawal">Withdrawals</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {transactionsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !filteredTransactions?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ArrowDownCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">
                  {transactions?.length ? "No matching transactions" : "No transactions yet"}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {transactions?.length 
                    ? "Try adjusting your search or filter." 
                    : "Start by making a deposit to fund your trading account."}
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => {
                      const config = TRANSACTION_TYPE_CONFIG[tx.transaction_type];
                      const TxIcon = config?.icon || ArrowDownCircle;
                      const isCredit = tx.transaction_type === "deposit";

                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(tx.created_at), "MMM dd, yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <TxIcon className={`h-4 w-4 ${config?.color || ''}`} />
                              <span>{config?.label || tx.transaction_type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {tx.description || tx.notes || "-"}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${isCredit ? "text-profit" : "text-loss"}`}>
                            {isCredit ? "+" : "-"}{formatCurrency(Number(tx.amount), tx.currency)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
