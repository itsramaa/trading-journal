/**
 * BinanceIncomeHistory - Full-featured income display from Binance Futures API
 * Supports ALL income types: P&L, Fees, Funding, Transfers, Rebates, etc.
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Filter,
  ChevronDown,
  Wallet,
  Gift,
  ArrowUpDown,
  DollarSign
} from "lucide-react";
import { format } from "date-fns";
import { 
  useBinanceAllIncome, 
  useBinanceConnectionStatus, 
  BinanceIncome,
  getIncomeTypeCategory,
  IncomeTypeCategory
} from "@/features/binance";
import { formatCurrency } from "@/lib/formatters";

type IncomeFilterType = 'ALL' | 'pnl' | 'fees' | 'funding' | 'transfers' | 'rewards' | 'other';

interface BinanceIncomeHistoryProps {
  showHeader?: boolean;
  limit?: number;
  defaultFilter?: IncomeFilterType;
  daysBack?: number;
}

// Income type display configuration
const incomeTypeConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  REALIZED_PNL: { label: 'P&L', color: 'default', icon: <DollarSign className="h-3 w-3" /> },
  COMMISSION: { label: 'Fee', color: 'secondary', icon: <Wallet className="h-3 w-3" /> },
  FUNDING_FEE: { label: 'Funding', color: 'outline', icon: <ArrowUpDown className="h-3 w-3" /> },
  TRANSFER: { label: 'Transfer', color: 'outline', icon: <Wallet className="h-3 w-3" /> },
  INTERNAL_TRANSFER: { label: 'Internal', color: 'outline', icon: <Wallet className="h-3 w-3" /> },
  COMMISSION_REBATE: { label: 'Rebate', color: 'default', icon: <Gift className="h-3 w-3" /> },
  API_REBATE: { label: 'API Rebate', color: 'default', icon: <Gift className="h-3 w-3" /> },
  REFERRAL_KICKBACK: { label: 'Referral', color: 'default', icon: <Gift className="h-3 w-3" /> },
  WELCOME_BONUS: { label: 'Bonus', color: 'default', icon: <Gift className="h-3 w-3" /> },
  CONTEST_REWARD: { label: 'Contest', color: 'default', icon: <Gift className="h-3 w-3" /> },
  INSURANCE_CLEAR: { label: 'Insurance', color: 'secondary', icon: <AlertCircle className="h-3 w-3" /> },
  COIN_SWAP_DEPOSIT: { label: 'Swap In', color: 'outline', icon: <Wallet className="h-3 w-3" /> },
  COIN_SWAP_WITHDRAW: { label: 'Swap Out', color: 'outline', icon: <Wallet className="h-3 w-3" /> },
  DELIVERED_SETTELMENT: { label: 'Settlement', color: 'secondary', icon: <Wallet className="h-3 w-3" /> },
  AUTO_EXCHANGE: { label: 'Exchange', color: 'secondary', icon: <Wallet className="h-3 w-3" /> },
};

export function BinanceIncomeHistory({ 
  showHeader = true, 
  limit = 200,
  defaultFilter = 'ALL',
  daysBack = 1
}: BinanceIncomeHistoryProps) {
  const [categoryFilter, setCategoryFilter] = useState<IncomeFilterType>(defaultFilter);
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected;
  
  // Fetch ALL income types in one call
  const { 
    data: incomeData, 
    isLoading, 
    error,
    refetch,
    isFetching
  } = useBinanceAllIncome(daysBack, limit);

  // Get unique symbols for filter dropdown
  const uniqueSymbols = useMemo(() => {
    if (!incomeData) return [];
    const symbols = new Set(incomeData.map((item: BinanceIncome) => item.symbol).filter(Boolean));
    return Array.from(symbols).sort();
  }, [incomeData]);

  // Calculate comprehensive summary
  const summary = useMemo(() => {
    if (!incomeData || incomeData.length === 0) return null;
    
    const byType: Record<string, { total: number; count: number }> = {};
    let grossPnl = 0;
    let totalFees = 0;
    let totalFunding = 0;
    let totalRebates = 0;
    let totalTransfers = 0;
    let wins = 0;
    let losses = 0;
    
    incomeData.forEach((item: BinanceIncome) => {
      const type = item.incomeType;
      
      if (!byType[type]) {
        byType[type] = { total: 0, count: 0 };
      }
      byType[type].total += item.income;
      byType[type].count += 1;
      
      switch (type) {
        case 'REALIZED_PNL':
          grossPnl += item.income;
          if (item.income > 0) wins++;
          if (item.income < 0) losses++;
          break;
        case 'COMMISSION':
          totalFees += Math.abs(item.income);
          break;
        case 'FUNDING_FEE':
          totalFunding += item.income;
          break;
        case 'COMMISSION_REBATE':
        case 'API_REBATE':
          totalRebates += item.income;
          break;
        case 'TRANSFER':
        case 'INTERNAL_TRANSFER':
          totalTransfers += item.income;
          break;
      }
    });
    
    const netPnl = grossPnl - totalFees + totalFunding + totalRebates;
    
    return { 
      grossPnl,
      netPnl,
      totalFees,
      totalFunding,
      totalRebates,
      totalTransfers,
      wins,
      losses,
      count: incomeData.length,
      byType 
    };
  }, [incomeData]);

  // Filter data by category and symbol
  const filteredData = useMemo(() => {
    if (!incomeData) return [];
    let filtered = incomeData;
    
    // Filter by category
    if (categoryFilter !== 'ALL') {
      filtered = filtered.filter((item: BinanceIncome) => 
        getIncomeTypeCategory(item.incomeType) === categoryFilter
      );
    }
    
    // Filter by symbol
    if (symbolFilter !== 'ALL') {
      filtered = filtered.filter((item: BinanceIncome) => item.symbol === symbolFilter);
    }
    
    // Filter out zero-value entries
    filtered = filtered.filter((item: BinanceIncome) => item.income !== 0);
    
    return filtered.sort((a: BinanceIncome, b: BinanceIncome) => b.time - a.time);
  }, [incomeData, categoryFilter, symbolFilter]);

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
                Full Data
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as IncomeFilterType)}>
                <SelectTrigger className="w-[120px]">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="pnl">P&L</SelectItem>
                  <SelectItem value="fees">Fees</SelectItem>
                  <SelectItem value="funding">Funding</SelectItem>
                  <SelectItem value="transfers">Transfers</SelectItem>
                  <SelectItem value="rewards">Rewards</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
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
        {/* Summary Cards */}
        {summary && (
          <div className="space-y-3 mb-4">
            {/* Main summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className={`p-3 rounded-lg ${summary.netPnl >= 0 ? 'bg-profit/10 border border-profit/20' : 'bg-loss/10 border border-loss/20'}`}>
                <p className="text-xs text-muted-foreground">Net P&L</p>
                <p className={`text-lg font-bold ${summary.netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {summary.netPnl >= 0 ? '+' : ''}{formatCurrency(summary.netPnl, 'USD')}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-loss/10">
                <p className="text-xs text-muted-foreground">Total Fees</p>
                <p className="font-semibold text-loss">-{formatCurrency(summary.totalFees, 'USD')}</p>
              </div>
              <div className={`p-3 rounded-lg ${summary.totalFunding >= 0 ? 'bg-profit/10' : 'bg-loss/10'}`}>
                <p className="text-xs text-muted-foreground">Funding</p>
                <p className={`font-semibold ${summary.totalFunding >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {summary.totalFunding >= 0 ? '+' : ''}{formatCurrency(summary.totalFunding, 'USD')}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-profit/10">
                <p className="text-xs text-muted-foreground">Rebates</p>
                <p className="font-semibold text-profit">+{formatCurrency(summary.totalRebates, 'USD')}</p>
              </div>
            </div>
            
            {/* Collapsible breakdown */}
            <Collapsible open={isBreakdownOpen} onOpenChange={setIsBreakdownOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-full justify-between">
                  <span className="text-xs text-muted-foreground">
                    View breakdown by income type ({Object.keys(summary.byType).length} types)
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isBreakdownOpen ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {Object.entries(summary.byType)
                    .sort((a, b) => Math.abs(b[1].total) - Math.abs(a[1].total))
                    .map(([type, data]) => {
                      const config = incomeTypeConfig[type] || { label: type, color: 'secondary' };
                      return (
                        <div key={type} className="p-2 rounded bg-muted/50 text-xs">
                          <div className="flex items-center gap-1 mb-1">
                            <Badge variant={config.color as any} className="text-[10px]">
                              {config.label}
                            </Badge>
                            <span className="text-muted-foreground">×{data.count}</span>
                          </div>
                          <p className={`font-mono ${data.total >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {data.total >= 0 ? '+' : ''}{formatCurrency(data.total, 'USD')}
                          </p>
                        </div>
                      );
                    })}
                </div>
              </CollapsibleContent>
            </Collapsible>
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
                {filteredData.map((item: BinanceIncome, index: number) => {
                  const config = incomeTypeConfig[item.incomeType] || { label: item.incomeType, color: 'secondary' };
                  return (
                    <TableRow key={`${item.tranId}-${item.time}-${index}`}>
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
                          variant={config.color as any}
                          className="text-xs"
                        >
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`font-mono flex items-center justify-end gap-1 ${item.income >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {item.income >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {item.income >= 0 ? '+' : ''}{formatCurrency(item.income, 'USD')}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No income records found</p>
            <p className="text-xs">Trades will appear here after activity</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
