/**
 * BinanceIncomeHistory - Display income/P&L history from Binance Futures API
 * Uses /fapi/v1/income endpoint to fetch ALL trades across ALL symbols
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  History, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Zap,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { useBinanceIncomeHistory, useBinanceConnectionStatus, BinanceIncome } from "@/features/binance";
import { formatCurrency } from "@/lib/formatters";

type IncomeFilter = 'REALIZED_PNL' | 'COMMISSION' | 'FUNDING_FEE' | 'ALL';

interface BinanceIncomeHistoryProps {
  showHeader?: boolean;
  limit?: number;
  defaultFilter?: IncomeFilter;
}

export function BinanceIncomeHistory({ 
  showHeader = true, 
  limit = 100,
  defaultFilter = 'REALIZED_PNL'
}: BinanceIncomeHistoryProps) {
  const [incomeFilter, setIncomeFilter] = useState<IncomeFilter>(defaultFilter);
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected;
  
  // Fetch income with optional type filter
  const oneDayAgo = useMemo(() => Date.now() - (24 * 60 * 60 * 1000), []);
  const { 
    data: incomeData, 
    isLoading, 
    error,
    refetch,
    isFetching
  } = useBinanceIncomeHistory(
    incomeFilter === 'ALL' ? undefined : incomeFilter,
    oneDayAgo,
    limit
  );

  // Get unique symbols for filter dropdown
  const uniqueSymbols = useMemo(() => {
    if (!incomeData) return [];
    const symbols = new Set(incomeData.map((item: BinanceIncome) => item.symbol).filter(Boolean));
    return Array.from(symbols).sort();
  }, [incomeData]);

  // Filter by symbol if selected
  const filteredData = useMemo(() => {
    if (!incomeData) return [];
    let filtered = incomeData;
    
    if (symbolFilter !== 'ALL') {
      filtered = filtered.filter((item: BinanceIncome) => item.symbol === symbolFilter);
    }
    
    // Filter out zero-value entries
    filtered = filtered.filter((item: BinanceIncome) => item.income !== 0);
    
    return filtered.sort((a: BinanceIncome, b: BinanceIncome) => b.time - a.time);
  }, [incomeData, symbolFilter]);

  // Calculate summary stats
  const summary = useMemo(() => {
    if (!filteredData.length) return null;
    
    const totalIncome = filteredData.reduce((sum: number, item: BinanceIncome) => sum + item.income, 0);
    const positive = filteredData.filter((item: BinanceIncome) => item.income > 0).length;
    const negative = filteredData.filter((item: BinanceIncome) => item.income < 0).length;
    
    return { totalIncome, positive, negative, count: filteredData.length };
  }, [filteredData]);

  // Not connected state
  if (!isConnected) {
    return (
      <Card className="border-dashed">
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-muted-foreground" />
              Binance Income History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Connect Binance API to view income history
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Binance Income History
              <Badge variant="outline" className="text-xs text-profit ml-2">
                <Zap className="h-3 w-3 mr-1" />
                All Symbols
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={incomeFilter} onValueChange={(v) => setIncomeFilter(v as IncomeFilter)}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REALIZED_PNL">P&L Only</SelectItem>
                  <SelectItem value="COMMISSION">Fees Only</SelectItem>
                  <SelectItem value="FUNDING_FEE">Funding</SelectItem>
                  <SelectItem value="ALL">All Types</SelectItem>
                </SelectContent>
              </Select>
              {uniqueSymbols.length > 0 && (
                <Select value={symbolFilter} onValueChange={setSymbolFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Symbols</SelectItem>
                    {uniqueSymbols.map(symbol => (
                      <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`p-3 rounded-lg ${summary.totalIncome >= 0 ? 'bg-profit/10' : 'bg-loss/10'}`}>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className={`font-semibold ${summary.totalIncome >= 0 ? 'text-profit' : 'text-loss'}`}>
                {summary.totalIncome >= 0 ? '+' : ''}{formatCurrency(summary.totalIncome, 'USD')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-profit/10">
              <p className="text-xs text-muted-foreground">Wins</p>
              <p className="font-semibold text-profit">{summary.positive}</p>
            </div>
            <div className="p-3 rounded-lg bg-loss/10">
              <p className="text-xs text-muted-foreground">Losses</p>
              <p className="font-semibold text-loss">{summary.negative}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-sm text-destructive mb-3">Failed to fetch income history</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item: BinanceIncome) => (
                  <TableRow key={`${item.tranId}-${item.time}`}>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(item.time), "MM/dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-mono">
                        {item.symbol || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={item.incomeType === 'REALIZED_PNL' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {item.incomeType === 'REALIZED_PNL' ? 'P&L' : 
                         item.incomeType === 'COMMISSION' ? 'Fee' :
                         item.incomeType === 'FUNDING_FEE' ? 'Funding' :
                         item.incomeType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono-numbers flex items-center justify-end gap-1 ${item.income >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {item.income >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                        {item.income >= 0 ? '+' : ''}{formatCurrency(item.income, 'USD')}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No income records found in the last 24 hours</p>
            <p className="text-xs">Trades will appear here after you close positions</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
