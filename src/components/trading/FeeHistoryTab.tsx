/**
 * FeeHistoryTab - Display trading fees from local trade_entries
 * Uses aggregated commission data from Full Sync (Local DB as Ledger of Truth)
 */
import { useMemo } from "react";
import { format } from "date-fns";
import { Percent, TrendingDown, Calculator, Info, Database } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { BinanceNotConfiguredState } from "@/components/binance/BinanceNotConfiguredState";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { useLocalFeeHistory, calculateFeeSummary, type LocalFeeRecord } from "@/hooks/use-local-fee-funding";
import { cn } from "@/lib/utils";
import type { DateRange } from "@/components/trading/DateRangeFilter";

interface FeeHistoryTabProps {
  isConnected: boolean;
  dateRange: DateRange;
  selectedPairs: string[];
  showFullHistory: boolean;
}

export function FeeHistoryTab({ 
  isConnected, 
  dateRange, 
  selectedPairs, 
}: FeeHistoryTabProps) {
  const { format: formatCurrency } = useCurrencyConversion();
  
  const { data: feeRecords, isLoading } = useLocalFeeHistory({
    dateRange,
    selectedPairs,
  });

  // Calculate summary
  const summary = useMemo(() => {
    if (!feeRecords?.length) return null;
    return calculateFeeSummary(feeRecords);
  }, [feeRecords]);

  if (!isConnected) {
    return (
      <BinanceNotConfiguredState
        title="Fee History Requires Exchange"
        description="Connect your Binance API to view trading fees."
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
        <span>Data dari Local DB (Full Sync)</span>
        <Info className="h-4 w-4 ml-2" />
        <span>Filters dari trade history apply ke tab ini</span>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-muted">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Total Fees</p>
                  <p className="text-xl font-bold text-loss">
                    -{formatCurrency(summary.totalFees)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {summary.tradeCount} trades
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
                  <p className="text-xs text-muted-foreground">Avg Fee / Trade</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(summary.avgFeePerTrade)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    per closed position
                  </p>
                </div>
                <Calculator className="h-6 w-6 text-muted-foreground opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-loss/30 bg-loss/5">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Net Impact</p>
                  <p className="text-xl font-bold text-loss">
                    -{formatCurrency(summary.totalFees)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Reduces P&L
                  </p>
                </div>
                <TrendingDown className="h-6 w-6 text-loss opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Details Table */}
      {!feeRecords?.length ? (
        <EmptyState
          icon={Percent}
          title="No fee records found"
          description="Run Full Sync in Trade History to load fee data, or adjust your filters."
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
                    <TableHead className="text-right">Commission</TableHead>
                    <TableHead className="text-right">Trade P&L</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeRecords.map((record: LocalFeeRecord) => (
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
                      <TableCell className="text-right font-mono text-loss">
                        -{formatCurrency(record.commission || 0)}
                        {record.commission_asset && (
                          <span className="text-xs text-muted-foreground ml-1">
                            ({record.commission_asset})
                          </span>
                        )}
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
              Showing {feeRecords.length} trades with fees
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
