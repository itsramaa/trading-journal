/**
 * FundingHistoryTab - Display funding rate payments from local trade_entries
 * Uses aggregated funding_fees data from Full Sync (Local DB as Ledger of Truth)
 */
import { useMemo } from "react";
import { format } from "date-fns";
import { ArrowUpDown, TrendingUp, TrendingDown, DollarSign, Info, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { BinanceNotConfiguredState } from "@/components/binance/BinanceNotConfiguredState";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { useLocalFundingHistory, calculateFundingSummary, type LocalFundingRecord } from "@/hooks/use-local-fee-funding";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/components/trading/DateRangeFilter";

interface FundingHistoryTabProps {
  isConnected: boolean;
  dateRange: DateRange;
  selectedPairs: string[];
  showFullHistory: boolean;
}

export function FundingHistoryTab({ 
  isConnected, 
  dateRange, 
  selectedPairs, 
}: FundingHistoryTabProps) {
  const { format: formatCurrency, formatPnl } = useCurrencyConversion();
  
  const { data: fundingRecords, isLoading } = useLocalFundingHistory({
    dateRange,
    selectedPairs,
  });

  // Calculate summary
  const summary = useMemo(() => {
    if (!fundingRecords?.length) return null;
    return calculateFundingSummary(fundingRecords);
  }, [fundingRecords]);

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
      {/* Data source info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Database className="h-4 w-4" />
        <span>Data from Local DB (Full Sync)</span>
        <Info className="h-4 w-4 ml-2" />
        <span>Filters from trade history apply to this tab</span>
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
                    -{formatCurrency(summary.fundingPaid)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.paidCount} trades (longs in contango)
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
                    +{formatCurrency(summary.fundingReceived)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.receivedCount} trades (shorts in contango)
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
                    {formatPnl(summary.netFunding)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.totalCount} total trades
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
      {!fundingRecords?.length ? (
        <EmptyState
          icon={ArrowUpDown}
          title="No funding records found"
          description="Run Full Sync in Trade History to load funding data, or adjust your filters."
        />
      ) : (
        <Card>
          <CardContent className="pt-4">
            <div className="rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead className="text-right">Funding Fee</TableHead>
                    <TableHead className="text-right">Trade P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fundingRecords.map((record: LocalFundingRecord) => (
                    <TableRow key={record.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {record.entry_datetime 
                          ? format(new Date(record.entry_datetime), "MMM dd HH:mm")
                          : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {record.pair}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={record.direction === 'long' ? 'default' : 'destructive'}
                          className="text-xs"
                        >
                          {record.direction?.toUpperCase() || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-mono",
                        (record.funding_fees || 0) >= 0 ? "text-profit" : "text-loss"
                      )}>
                        {formatPnl(record.funding_fees || 0)}
                      </TableCell>
                      <TableCell className={cn(
                        "text-right font-mono",
                        (record.realized_pnl || 0) >= 0 ? "text-profit" : "text-loss"
                      )}>
                        {record.realized_pnl !== null 
                          ? formatCurrency(record.realized_pnl)
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Showing {fundingRecords.length} trades with funding fees
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
