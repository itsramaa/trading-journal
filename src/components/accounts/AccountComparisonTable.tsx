/**
 * AccountComparisonTable - Side-by-side comparison of trading accounts
 * Mode-aware: filters accounts based on active trade mode (Paper/Live)
 */
import { useMemo } from "react";
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
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useAccountLevelStats } from "@/hooks/use-exchange-analytics";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { useModeVisibility } from "@/hooks/use-mode-visibility";

export function AccountComparisonTable() {
  const { data: accountStats, isLoading } = useAccountLevelStats({});
  const { formatPnl, format: formatCurrency } = useCurrencyConversion();
  const { showPaperData } = useModeVisibility();

  // Filter by mode: paper accounts have exchange = 'manual' or empty
  const activeStats = useMemo(() => {
    const all = accountStats?.filter(a => a.totalTrades > 0) || [];
    return all.filter(a => {
      const isPaper = !a.exchange || a.exchange === 'manual';
      return showPaperData ? isPaper : !isPaper;
    });
  }, [accountStats, showPaperData]);

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

  if (activeStats.length === 0) {
    return (
      <Card role="region" aria-label="Account performance comparison">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Account Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Complete trades across your accounts to unlock side-by-side performance comparison
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card role="region" aria-label="Account performance comparison">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Account Comparison
        </CardTitle>
        <CardDescription>
          Performance comparison across {showPaperData ? 'paper' : 'exchange'} accounts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account</TableHead>
                <TableHead>Exchange</TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1">Trades <InfoTooltip content="Total closed trades for this account." /></span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1">Win Rate <InfoTooltip content="Percentage of profitable trades. 60%+ is generally considered good." /></span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1">Net P&L <InfoTooltip content="Total profit/loss after all fees and commissions." /></span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1">Avg P&L <InfoTooltip content="Average profit/loss per trade." /></span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="flex items-center justify-end gap-1">Profit Factor <InfoTooltip content="Gross Profits ÷ Gross Losses. Above 1.0 = profitable. 1.5+ is good, 2.0+ is excellent." /></span>
                </TableHead>
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
                        {(!account.exchange || account.exchange === 'manual') ? 'Paper' : account.exchange}
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
