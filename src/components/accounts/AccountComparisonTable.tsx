/**
 * AccountComparisonTable - Side-by-side comparison of all trading accounts
 * Uses get_account_level_stats RPC for server-side aggregation
 */
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, BarChart3, ExternalLink } from "lucide-react";
import { useAccountLevelStats } from "@/hooks/use-exchange-analytics";
import { useTradeMode } from "@/hooks/use-trade-mode";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

export function AccountComparisonTable() {
  const { tradeMode } = useTradeMode();
  const { data: accountStats, isLoading } = useAccountLevelStats({ tradeMode });
  const { formatPnl, format: formatCurrency } = useCurrencyConversion();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show accounts that have trades
  const activeStats = accountStats?.filter(a => a.totalTrades > 0) || [];

  if (activeStats.length === 0) {
    return null; // Don't show comparison if no accounts have trades
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Account Comparison
        </CardTitle>
        <CardDescription>
          Performance comparison across all accounts ({tradeMode} mode)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Exchange</TableHead>
                <TableHead className="text-right">Trades</TableHead>
                <TableHead className="text-right">Win Rate</TableHead>
                <TableHead className="text-right">Net P&L</TableHead>
                <TableHead className="text-right">Avg P&L</TableHead>
                <TableHead className="text-right">Profit Factor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeStats.map((account) => {
                const pf = account.profitFactor >= 999 ? '∞' : account.profitFactor.toFixed(2);
                return (
                  <TableRow key={account.accountId} className="hover:bg-muted/50">
                    <TableCell>
                      <Link 
                        to={`/accounts/${account.accountId}`}
                        className="font-medium text-primary hover:underline flex items-center gap-1"
                      >
                        {account.accountName}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">
                        {account.exchange}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{account.totalTrades}</TableCell>
                    <TableCell className="text-right">
                      <span className={account.winRate >= 50 ? 'text-profit' : 'text-loss'}>
                        {account.winRate.toFixed(1)}%
                      </span>
                    </TableCell>
                    <TableCell className={`text-right font-mono ${account.totalPnlNet >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatPnl(account.totalPnlNet)}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${account.avgPnlPerTrade >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {formatPnl(account.avgPnlPerTrade)}
                    </TableCell>
                    <TableCell className={`text-right ${account.profitFactor >= 1 ? 'text-profit' : 'text-loss'}`}>
                      {pf}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
