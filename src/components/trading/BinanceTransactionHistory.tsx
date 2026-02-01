/**
 * Binance Transaction History Tab - Deposits, Withdrawals, Transfers
 * For Accounts page
 */
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Calendar, 
  FileText, 
  RefreshCw, 
  TrendingDown, 
  TrendingUp,
  Wallet
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useTransactionSummary,
  getTransactionTypeLabel,
  getTransactionTypeVariant,
  useBinanceConnectionStatus,
} from "@/features/binance";
import { BinanceNotConfiguredState } from "@/components/binance/BinanceNotConfiguredState";
import { formatCurrency } from "@/lib/formatters";

export function BinanceTransactionHistoryTab() {
  const [days, setDays] = useState<number>(30);
  
  // Internal guard: check connection status (component self-defense)
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected ?? false;
  
  const { data: summary, transactions, isLoading, refetch } = useTransactionSummary(days);

  const sortedTransactions = useMemo(() => {
    if (!transactions) return [];
    return [...transactions].sort((a, b) => b.time - a.time);
  }, [transactions]);

  // Guard: show empty state if not connected
  if (!isConnected) {
    return (
      <div className="py-8">
        <BinanceNotConfiguredState
          title="Transaction History Requires Exchange"
          description="Connect your Binance API to view deposits, withdrawals, and transfer history."
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  const hasTransactions = sortedTransactions.length > 0;

  return (
    <div className="space-y-6">
      {/* Filter & Refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
              <ArrowDownCircle className="h-4 w-4 text-profit" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-profit">
                +{formatCurrency(summary.totalDeposits, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.depositCount} transaction{summary.depositCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Withdrawals</CardTitle>
              <ArrowUpCircle className="h-4 w-4 text-loss" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-loss">
                -{formatCurrency(summary.totalWithdrawals, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.withdrawalCount} transaction{summary.withdrawalCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Flow</CardTitle>
              {summary.netFlow >= 0 ? (
                <TrendingUp className="h-4 w-4 text-profit" />
              ) : (
                <TrendingDown className="h-4 w-4 text-loss" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${summary.netFlow >= 0 ? 'text-profit' : 'text-loss'}`}>
                {summary.netFlow >= 0 ? '+' : ''}{formatCurrency(summary.netFlow, 'USD')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last {days} days
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Transaction History Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-primary" />
            Transaction History
            {hasTransactions && (
              <Badge variant="secondary">{sortedTransactions.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasTransactions ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No transactions found</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                No deposits, withdrawals, or transfers found in the selected period. 
                Note: This shows internal transfers between Spot and Futures wallets.
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Info</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTransactions.map((tx) => {
                    const isDeposit = tx.type === 'DEPOSIT';
                    const Icon = isDeposit ? ArrowDownCircle : ArrowUpCircle;
                    
                    return (
                      <TableRow key={tx.tranId}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(tx.time), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getTransactionTypeVariant(tx.type)} className="gap-1">
                            <Icon className="h-3 w-3" />
                            {getTransactionTypeLabel(tx.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{tx.asset}</TableCell>
                        <TableCell className={`text-right font-mono ${isDeposit ? 'text-profit' : 'text-loss'}`}>
                          {isDeposit ? '+' : '-'}{formatCurrency(Math.abs(tx.amount), 'USD')}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {tx.info || "-"}
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
  );
}
