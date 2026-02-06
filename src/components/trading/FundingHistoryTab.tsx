/**
 * FundingHistoryTab - Display funding rate payments from Binance
 * Shows: FUNDING_FEE income types (paid and received)
 */
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { Calendar, ArrowUpDown, RefreshCw, TrendingUp, TrendingDown, Filter, DollarSign } from "lucide-react";
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

interface FundingHistoryTabProps {
  isConnected: boolean;
  defaultDays?: number;
}

export function FundingHistoryTab({ isConnected, defaultDays = 30 }: FundingHistoryTabProps) {
  const [days, setDays] = useState<number>(defaultDays);
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');

  const { data: allIncome, isLoading, refetch, isFetching } = useBinanceAllIncome(days, 1000);

  // Filter to funding fee income only
  const fundingIncome = useMemo(() => {
    if (!allIncome) return [];
    return allIncome.filter((item: BinanceIncome) => 
      item.incomeType === 'FUNDING_FEE'
    );
  }, [allIncome]);

  // Get unique symbols for filter
  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(fundingIncome.map((item: BinanceIncome) => item.symbol).filter(Boolean));
    return Array.from(symbols).sort();
  }, [fundingIncome]);

  // Apply symbol filter
  const filteredIncome = useMemo(() => {
    if (symbolFilter === 'ALL') return fundingIncome;
    return fundingIncome.filter((item: BinanceIncome) => item.symbol === symbolFilter);
  }, [fundingIncome, symbolFilter]);

  // Calculate summary
  const summary = useMemo(() => {
    if (!filteredIncome.length) return null;

    let fundingPaid = 0;
    let fundingReceived = 0;
    let paidCount = 0;
    let receivedCount = 0;

    filteredIncome.forEach((item: BinanceIncome) => {
      if (item.income < 0) {
        fundingPaid += Math.abs(item.income);
        paidCount++;
      } else {
        fundingReceived += item.income;
        receivedCount++;
      }
    });

    return {
      fundingPaid,
      fundingReceived,
      netFunding: fundingReceived - fundingPaid,
      paidCount,
      receivedCount,
      totalCount: filteredIncome.length,
    };
  }, [filteredIncome]);

  if (!isConnected) {
    return (
      <BinanceNotConfiguredState
        title="Funding History Requires Exchange"
        description="Connect your Binance API to view funding rate payments."
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
                  <p className="text-xs text-muted-foreground">Funding Paid</p>
                  <p className="text-xl font-bold text-loss">
                    -{formatCurrency(summary.fundingPaid, 'USD')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.paidCount} payments (longs in contango)
                  </p>
                </div>
                <TrendingDown className="h-6 w-6 text-loss opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Funding Received</p>
                  <p className="text-xl font-bold text-profit">
                    +{formatCurrency(summary.fundingReceived, 'USD')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.receivedCount} payments (shorts in contango)
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 text-profit opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "border-2",
            summary.netFunding >= 0 ? "border-profit/30 bg-profit/5" : "border-loss/30 bg-loss/5"
          )}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Net Funding</p>
                  <p className={cn(
                    "text-xl font-bold",
                    summary.netFunding >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {summary.netFunding >= 0 ? '+' : ''}{formatCurrency(summary.netFunding, 'USD')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.totalCount} total intervals
                  </p>
                </div>
                <DollarSign className={cn(
                  "h-6 w-6 opacity-50",
                  summary.netFunding >= 0 ? "text-profit" : "text-loss"
                )} />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Details Table */}
      {filteredIncome.length === 0 ? (
        <EmptyState
          icon={ArrowUpDown}
          title="No funding records found"
          description="No funding rate payments recorded for the selected period."
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
                            variant={item.income >= 0 ? 'default' : 'destructive'}
                            className="text-xs"
                          >
                            {item.income >= 0 ? 'Received' : 'Paid'}
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
              Showing {filteredIncome.length} funding intervals
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
