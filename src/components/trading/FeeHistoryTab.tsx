/**
 * FeeHistoryTab - Display trading fees and rebates from Binance
 * Shows: COMMISSION, COMMISSION_REBATE, API_REBATE income types
 */
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Calendar, Percent, RefreshCw, Gift, TrendingDown, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useBinanceAllIncome, type BinanceIncome } from "@/features/binance";
import { BinanceNotConfiguredState } from "@/components/binance/BinanceNotConfiguredState";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface FeeHistoryTabProps {
  isConnected: boolean;
  defaultDays?: number;
}

const FEE_INCOME_TYPES = ['COMMISSION', 'COMMISSION_REBATE', 'API_REBATE'];

export function FeeHistoryTab({ isConnected, defaultDays = 30 }: FeeHistoryTabProps) {
  const [days, setDays] = useState<number>(defaultDays);
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');

  const { data: allIncome, isLoading, refetch, isFetching } = useBinanceAllIncome(days, 1000);

  // Filter to fee-related income only
  const feeIncome = useMemo(() => {
    if (!allIncome) return [];
    return allIncome.filter((item: BinanceIncome) => 
      FEE_INCOME_TYPES.includes(item.incomeType)
    );
  }, [allIncome]);

  // Get unique symbols for filter
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(feeIncome.map((item: BinanceIncome) => item.symbol).filter(Boolean));
    return Array.from(symbols).sort();
  }, [feeIncome]);

  // Apply symbol filter
  const filteredIncome = useMemo(() => {
    if (symbolFilter === 'ALL') return feeIncome;
    return feeIncome.filter((item: BinanceIncome) => item.symbol === symbolFilter);
  }, [feeIncome, symbolFilter]);

  // Calculate summary
  const summary = useMemo(() => {
    if (!filteredIncome.length) return null;

    let totalFees = 0;
    let totalRebates = 0;
    let feeCount = 0;
    let rebateCount = 0;

    filteredIncome.forEach((item: BinanceIncome) => {
      if (item.incomeType === 'COMMISSION') {
        totalFees += Math.abs(item.income);
        feeCount++;
      } else {
        totalRebates += item.income;
        rebateCount++;
      }
    });

    return {
      totalFees,
      totalRebates,
      netCost: totalFees - totalRebates,
      feeCount,
      rebateCount,
    };
  }, [filteredIncome]);

  if (!isConnected) {
    return (
      <BinanceNotConfiguredState
        title="Fee History Requires Exchange"
        description="Connect your Binance API to view trading fees and rebates."
      />
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

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={days.toString()} onValueChange={(v) => setDays(parseInt(v))}>
            <SelectTrigger className="w-[130px]">
              <Calendar className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
              <SelectItem value="90">90 days</SelectItem>
              <SelectItem value="180">6 months</SelectItem>
              <SelectItem value="365">1 year</SelectItem>
            </SelectContent>
          </Select>

          {uniqueSymbols.length > 0 && (
            <Select value={symbolFilter} onValueChange={setSymbolFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Symbols</SelectItem>
                {uniqueSymbols.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-muted">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Trading Fees</p>
                  <p className="text-xl font-bold text-loss">
                    -{formatCurrency(summary.totalFees, 'USD')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.feeCount} transactions
                  </p>
                </div>
                <Percent className="h-6 w-6 text-loss opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Fee Rebates</p>
                  <p className="text-xl font-bold text-profit">
                    +{formatCurrency(summary.totalRebates, 'USD')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.rebateCount} rebates
                  </p>
                </div>
                <Gift className="h-6 w-6 text-profit opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-2",
            summary.netCost > 0 ? "border-loss/30 bg-loss/5" : "border-profit/30 bg-profit/5"
          )}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Net Fee Cost</p>
                  <p className={cn(
                    "text-xl font-bold",
                    summary.netCost > 0 ? "text-loss" : "text-profit"
                  )}>
                    {summary.netCost > 0 ? '-' : '+'}{formatCurrency(Math.abs(summary.netCost), 'USD')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fees minus rebates
                  </p>
                </div>
                <TrendingDown className={cn(
                  "h-6 w-6 opacity-50",
                  summary.netCost > 0 ? "text-loss" : "text-profit"
                )} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Details Table */}
      {filteredIncome.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="No fee records found"
          description="No trading fees or rebates recorded for the selected period."
        />
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIncome
                    .sort((a, b) => b.time - a.time)
                    .map((item: BinanceIncome) => (
                      <TableRow key={item.tranId}>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(item.time), "MMM dd HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={item.incomeType === 'COMMISSION' ? 'destructive' : 'default'}
                            className="text-xs"
                          >
                            {item.incomeType === 'COMMISSION' ? 'Fee' : 'Rebate'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.symbol || '-'}
                        </TableCell>
                        <TableCell className={cn(
                          "text-right font-mono",
                          item.income >= 0 ? "text-profit" : "text-loss"
                        )}>
                          {item.income >= 0 ? '+' : ''}{formatCurrency(item.income, 'USD')}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Showing {filteredIncome.length} records
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
