/**
 * FeeHistoryTab - Display trading fees and rebates from Binance
 * Shows: COMMISSION, COMMISSION_REBATE, API_REBATE income types
 * Uses unified filters from parent TradeHistory page
 */
import { useMemo } from "react";
import { format } from "date-fns";
import { Percent, RefreshCw, Gift, TrendingDown, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useBinanceAllIncome, type BinanceIncome } from "@/features/binance";
import { BinanceNotConfiguredState } from "@/components/binance/BinanceNotConfiguredState";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/components/trading/DateRangeFilter";

interface FeeHistoryTabProps {
  isConnected: boolean;
  dateRange: DateRange;
  selectedPairs: string[];
  showFullHistory: boolean;
}

const FEE_INCOME_TYPES = ['COMMISSION', 'COMMISSION_REBATE', 'API_REBATE'];

export function FeeHistoryTab({ 
  isConnected, 
  dateRange, 
  selectedPairs, 
  showFullHistory 
}: FeeHistoryTabProps) {
  const { format: formatCurrency, formatPnl } = useCurrencyConversion();
  
  // Calculate days from dateRange for API call
  // Full history = 730 days (2 years) to support extended Binance history
  const days = useMemo(() => {
    if (showFullHistory) return 730; // Extended to 2 years
    if (dateRange.from && dateRange.to) {
      const diffMs = dateRange.to.getTime() - dateRange.from.getTime();
      return Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 7) || 365;
    }
    return 365; // Default 1 year lookback
  }, [dateRange, showFullHistory]);

  const { data: allIncome, isLoading, refetch, isFetching } = useBinanceAllIncome(days, 1000);

  // Filter to fee-related income only
  const feeIncome = useMemo(() => {
    if (!allIncome) return [];
    return allIncome.filter((item: BinanceIncome) => 
      FEE_INCOME_TYPES.includes(item.incomeType)
    );
  }, [allIncome]);

  // Apply unified filters from parent
  const filteredIncome = useMemo(() => {
    let filtered = feeIncome;
    
    // Apply date range filter
    if (dateRange.from) {
      const fromTime = dateRange.from.getTime();
      filtered = filtered.filter(item => item.time >= fromTime);
    }
    if (dateRange.to) {
      const toTime = dateRange.to.getTime();
      filtered = filtered.filter(item => item.time <= toTime);
    }
    
    // Apply pair filter from parent
    if (selectedPairs.length > 0) {
      filtered = filtered.filter(item => 
        selectedPairs.some(pair => item.symbol === pair || item.symbol?.includes(pair.replace('USDT', '')))
      );
    }
    
    return filtered;
  }, [feeIncome, dateRange, selectedPairs]);

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
      {/* Unified filter info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <span>Filters from trade history apply to this tab</span>
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
                    -{formatCurrency(summary.totalFees)}
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
                    +{formatCurrency(summary.totalRebates)}
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
                    {summary.netCost > 0 ? '-' : '+'}{formatCurrency(Math.abs(summary.netCost))}
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
          description="No trading fees or rebates recorded for the selected period and filters."
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
                          {formatPnl(item.income)}
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
