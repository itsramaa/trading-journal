import { useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet";
import { 
  ArrowLeft, 
  CandlestickChart, 
  FlaskConical,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Search,
  Filter,
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Activity,
  Percent,
  DollarSign,
  Flame
} from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar
} from "recharts";
import { useAccounts, useAccountTransactions } from "@/hooks/use-accounts";
import { useAccountAnalytics } from "@/hooks/use-account-analytics";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { AccountType, AccountTransactionType } from "@/types/account";
import { isPaperAccount } from "@/lib/account-utils";

const ACCOUNT_TYPE_ICONS: Record<AccountType, React.ElementType> = {
  trading: CandlestickChart,
  backtest: FlaskConical,
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
  const { data: allTrades } = useModeFilteredTrades();
  const { data: stats, isLoading: statsLoading } = useAccountAnalytics({ 
    accountId: accountId || '' 
  });
  const { format: formatCurrency, formatPnl } = useCurrencyConversion();
  
  // Filter trades for this account (for equity curve and strategy breakdown)
  const accountTrades = useMemo(() => {
    return allTrades?.filter(t => t.trading_account_id === accountId && t.status === 'closed') || [];
  }, [allTrades, accountId]);

  // Equity curve data
  const equityData = useMemo(() => {
    if (!accountTrades.length) return [];
    const sorted = [...accountTrades].sort(
      (a, b) => new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
    );
    let cumulative = 0;
    let peak = 0;
    return sorted.map((trade) => {
      const pnl = trade.realized_pnl || trade.pnl || 0;
      cumulative += pnl;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
      return {
        date: format(new Date(trade.trade_date), 'MMM d'),
        pnl,
        cumulative,
        drawdown: -drawdown,
      };
    });
  }, [accountTrades]);

  // Strategy breakdown
  const strategyBreakdown = useMemo(() => {
    if (!accountTrades.length) return [];
    const map = new Map<string, { name: string; trades: number; pnl: number; wins: number }>();
    for (const trade of accountTrades) {
      const strategies = trade.strategies;
      if (!strategies?.length) {
        const key = 'untagged';
        const existing = map.get(key) || { name: 'No Strategy', trades: 0, pnl: 0, wins: 0 };
        existing.trades++;
        existing.pnl += trade.realized_pnl || trade.pnl || 0;
        if (trade.result === 'win') existing.wins++;
        map.set(key, existing);
      } else {
        for (const s of strategies) {
          const existing = map.get(s.id) || { name: s.name, trades: 0, pnl: 0, wins: 0 };
          existing.trades++;
          existing.pnl += trade.realized_pnl || trade.pnl || 0;
          if (trade.result === 'win') existing.wins++;
          map.set(s.id, existing);
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.pnl - a.pnl);
  }, [accountTrades]);

  // Filtering state for transactions
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountTransactionType | "all">("all");
  const [activeTab, setActiveTab] = useState("overview");

  const account = accounts?.find((a) => a.id === accountId);
  const isBacktest = account ? isPaperAccount(account) : false;
  
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

  // Capital flow stats
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
  
  const Icon = account 
    ? (isBacktest ? FlaskConical : ACCOUNT_TYPE_ICONS[account.account_type]) 
    : CandlestickChart;

  if (accountsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Account not found</p>
        <Button onClick={() => navigate("/accounts")} className="mt-4">
          Back to Accounts
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{account.name} | Trading Account</title>
        <meta name="description" content={`Analytics and details for ${account.name}`} />
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
              {account.exchange && account.exchange !== 'manual' && (
                <Badge variant="outline" className="capitalize">{account.exchange}</Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              {account.metadata?.broker || 'Trading Account'} • {account.currency}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(Number(account.balance))}</p>
          </div>
        </div>

        {/* Key Metrics Row */}
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Net P&L</p>
                  {statsLoading ? <Skeleton className="h-7 w-24" /> : (
                    <p className={`text-xl font-bold ${(stats?.totalPnlNet || 0) >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatPnl(stats?.totalPnlNet || 0)}
                    </p>
                  )}
                </div>
                {(stats?.totalPnlNet || 0) >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-profit/50" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-loss/50" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Gross: {formatPnl(stats?.totalPnlGross || 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Return on Capital</p>
                  {statsLoading ? <Skeleton className="h-7 w-16" /> : (() => {
                    const initialBalance = account.metadata?.initial_balance || Number(account.balance);
                    const roc = initialBalance > 0 ? ((stats?.totalPnlNet || 0) / initialBalance) * 100 : 0;
                    return (
                      <p className={`text-xl font-bold ${roc >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {roc >= 0 ? '+' : ''}{roc.toFixed(2)}%
                      </p>
                    );
                  })()}
                </div>
                <Percent className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                <InfoTooltip content="Net P&L ÷ Initial Capital × 100. Based on first deposit or current balance if no initial balance recorded." variant="help" />
                {' '}vs initial capital
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                  {statsLoading ? <Skeleton className="h-7 w-16" /> : (
                    <p className="text-xl font-bold">{(stats?.winRate || 0).toFixed(1)}%</p>
                  )}
                </div>
                <Target className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats?.winCount || 0}W / {stats?.lossCount || 0}L
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Profit Factor</p>
                  {statsLoading ? <Skeleton className="h-7 w-16" /> : (
                    <p className={`text-xl font-bold ${(stats?.profitFactor || 0) >= 1 ? 'text-profit' : 'text-loss'}`}>
                      {(stats?.profitFactor || 0) >= 999 ? '∞' : (stats?.profitFactor || 0).toFixed(2)}
                    </p>
                  )}
                </div>
                <Activity className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg Win: {formatCurrency(Math.abs(stats?.avgWin || 0))}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Trades</p>
                  {statsLoading ? <Skeleton className="h-7 w-12" /> : (
                    <p className="text-xl font-bold">{stats?.totalTrades || 0}</p>
                  )}
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg P&L: {formatPnl(stats?.avgPnlPerTrade || 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          {/* Overview Tab - Equity Curve + Drawdown */}
          <TabsContent value="overview" className="space-y-6 mt-4">
            {/* Equity Curve */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Equity Curve</CardTitle>
                <CardDescription>Cumulative P&L over time for this account</CardDescription>
              </CardHeader>
              <CardContent>
                {equityData.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No closed trades yet</p>
                    <p className="text-sm">Complete trades to see equity curve</p>
                  </div>
                ) : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis 
                          tickFormatter={(v) => `$${v.toFixed(0)}`} 
                          className="text-xs" 
                          tick={{ fill: 'hsl(var(--muted-foreground))' }} 
                        />
                        <Tooltip
                          formatter={(value: number) => [formatCurrency(value), 'Cumulative P&L']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                        <Area 
                          type="monotone" 
                          dataKey="cumulative" 
                          stroke="hsl(var(--primary))" 
                          fill="hsl(var(--primary)/0.15)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Drawdown Chart */}
            {equityData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Drawdown</CardTitle>
                <CardDescription>
                  Peak-to-trough decline from highest equity point
                  <InfoTooltip content="Drawdown is calculated from peak cumulative P&L, not from initial balance. If all trades are losses, drawdown may show 0% since no peak was established." variant="help" />
                </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={equityData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis 
                          tickFormatter={(v) => `${v.toFixed(0)}%`} 
                          className="text-xs" 
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                          domain={['auto', 0]}
                        />
                        <Tooltip
                          formatter={(value: number) => [`${Math.abs(value).toFixed(2)}%`, 'Drawdown']}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                        <Area 
                          type="monotone" 
                          dataKey="drawdown" 
                          stroke="hsl(var(--destructive))" 
                          fill="hsl(var(--destructive)/0.2)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fee Breakdown */}
            {(stats?.totalFees || 0) > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Fee Breakdown</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Commission</p>
                      <p className="text-lg font-semibold text-loss">{formatCurrency(stats?.totalCommission || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Funding Fees</p>
                      <p className="text-lg font-semibold text-loss">{formatCurrency(stats?.totalFundingFees || 0)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Fees</p>
                      <p className="text-lg font-semibold text-loss">{formatCurrency(stats?.totalFees || 0)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Capital Flow Summary */}
            {flowStats && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Capital Flow</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Deposits</p>
                      <p className="text-lg font-semibold text-profit">+{formatCurrency(flowStats.totalDeposits)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Withdrawals</p>
                      <p className="text-lg font-semibold text-loss">-{formatCurrency(flowStats.totalWithdrawals)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        Net Flow
                        <InfoTooltip content="Deposits minus Withdrawals" />
                      </p>
                      <p className={`text-lg font-semibold ${flowStats.netFlow >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {formatPnl(flowStats.netFlow)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Strategies Tab */}
          <TabsContent value="strategies" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Strategy Breakdown</CardTitle>
                <CardDescription>Performance per strategy on this account</CardDescription>
              </CardHeader>
              <CardContent>
                {strategyBreakdown.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Flame className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No strategy data</p>
                    <p className="text-sm">Tag trades with strategies to see breakdown</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Strategy</TableHead>
                          <TableHead className="text-right">Trades</TableHead>
                          <TableHead className="text-right">Win Rate</TableHead>
                          <TableHead className="text-right">P&L</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {strategyBreakdown.map((s, i) => {
                          const winRate = s.trades > 0 ? (s.wins / s.trades) * 100 : 0;
                          return (
                            <TableRow key={i}>
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell className="text-right">{s.trades}</TableCell>
                              <TableCell className="text-right">{winRate.toFixed(1)}%</TableCell>
                              <TableCell className={`text-right font-mono ${s.pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                                {formatPnl(s.pnl)}
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
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="mt-4">
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
                                {isCredit ? "+" : "-"}{formatCurrency(Number(tx.amount))}
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
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
