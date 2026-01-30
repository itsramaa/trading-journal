/**
 * FundingRateTracker - Dedicated component for tracking funding fees
 * Shows 24H funding summary, positive/negative balance, and per-symbol breakdown
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock,
  AlertTriangle,
  Zap,
  ArrowUpDown
} from "lucide-react";
import { useBinanceFundingFees, useBinanceConnectionStatus, BinanceIncome } from "@/features/binance";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";

interface FundingRateTrackerProps {
  showHeader?: boolean;
  compact?: boolean;
}

export function FundingRateTracker({ 
  showHeader = true,
  compact = false 
}: FundingRateTrackerProps) {
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConnected = connectionStatus?.isConnected;
  
  const { data: fundingData, isLoading } = useBinanceFundingFees(500);
  
  // Calculate funding stats
  const fundingStats = useMemo(() => {
    if (!fundingData || fundingData.length === 0) {
      return {
        totalFunding: 0,
        fundingPaid: 0,
        fundingReceived: 0,
        bySymbol: {} as Record<string, { total: number; count: number }>,
        recentFunding: [] as BinanceIncome[],
        highestPaid: null as { symbol: string; amount: number } | null,
        highestReceived: null as { symbol: string; amount: number } | null,
      };
    }
    
    const bySymbol: Record<string, { total: number; count: number }> = {};
    let fundingPaid = 0;
    let fundingReceived = 0;
    
    fundingData.forEach((item: BinanceIncome) => {
      const symbol = item.symbol || 'N/A';
      
      if (!bySymbol[symbol]) {
        bySymbol[symbol] = { total: 0, count: 0 };
      }
      bySymbol[symbol].total += item.income;
      bySymbol[symbol].count += 1;
      
      if (item.income < 0) {
        fundingPaid += Math.abs(item.income);
      } else {
        fundingReceived += item.income;
      }
    });
    
    const totalFunding = fundingReceived - fundingPaid;
    
    // Find highest paid/received symbols
    const sortedSymbols = Object.entries(bySymbol)
      .map(([symbol, data]) => ({ symbol, ...data }))
      .sort((a, b) => a.total - b.total);
    
    const highestPaid = sortedSymbols.length > 0 && sortedSymbols[0].total < 0
      ? { symbol: sortedSymbols[0].symbol, amount: sortedSymbols[0].total }
      : null;
    
    const highestReceived = sortedSymbols.length > 0 && sortedSymbols[sortedSymbols.length - 1].total > 0
      ? { symbol: sortedSymbols[sortedSymbols.length - 1].symbol, amount: sortedSymbols[sortedSymbols.length - 1].total }
      : null;
    
    // Get recent funding events (last 10)
    const recentFunding = fundingData
      .filter((item: BinanceIncome) => item.income !== 0)
      .sort((a: BinanceIncome, b: BinanceIncome) => b.time - a.time)
      .slice(0, 10);
    
    return {
      totalFunding,
      fundingPaid,
      fundingReceived,
      bySymbol,
      recentFunding,
      highestPaid,
      highestReceived,
    };
  }, [fundingData]);
  
  if (!isConnected) {
    return (
      <Card className="border-dashed">
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowUpDown className="h-5 w-5 text-muted-foreground" />
              Funding Rate Tracker
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Connect Binance to track funding fees</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (isLoading) {
    return (
      <Card>
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowUpDown className="h-5 w-5 text-primary" />
              Funding Rate Tracker
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const hasActivity = fundingStats.recentFunding.length > 0;
  const isNetPositive = fundingStats.totalFunding >= 0;
  
  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowUpDown className="h-5 w-5 text-primary" />
              Funding Rate Tracker
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              24H
            </Badge>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {!hasActivity ? (
          <div className="text-center py-6 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No funding fees in the last 24 hours</p>
            <p className="text-xs">Funding is charged every 8 hours on open positions</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              {/* Net Funding */}
              <div className={`p-3 rounded-lg ${isNetPositive ? 'bg-profit/10' : 'bg-loss/10'}`}>
                <p className="text-xs text-muted-foreground">Net Funding</p>
                <p className={`text-lg font-semibold ${isNetPositive ? 'text-profit' : 'text-loss'}`}>
                  {isNetPositive ? '+' : ''}{formatCurrency(fundingStats.totalFunding, 'USD')}
                </p>
              </div>
              
              {/* Received */}
              <div className="p-3 rounded-lg bg-profit/10">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Received
                </p>
                <p className="text-lg font-semibold text-profit">
                  +{formatCurrency(fundingStats.fundingReceived, 'USD')}
                </p>
              </div>
              
              {/* Paid */}
              <div className="p-3 rounded-lg bg-loss/10">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" /> Paid
                </p>
                <p className="text-lg font-semibold text-loss">
                  -{formatCurrency(fundingStats.fundingPaid, 'USD')}
                </p>
              </div>
            </div>
            
            {/* Alert if high funding paid */}
            {fundingStats.fundingPaid > fundingStats.fundingReceived * 2 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <p className="text-sm text-warning">
                  High funding fees! Consider closing positions before funding time.
                </p>
              </div>
            )}
            
            {/* Symbol breakdown - only in non-compact mode */}
            {!compact && Object.keys(fundingStats.bySymbol).length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">By Symbol</p>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {Object.entries(fundingStats.bySymbol)
                    .sort((a, b) => b[1].total - a[1].total)
                    .map(([symbol, data]) => (
                      <div 
                        key={symbol}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">
                            {symbol}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {data.count} events
                          </span>
                        </div>
                        <span className={`text-sm font-mono ${data.total >= 0 ? 'text-profit' : 'text-loss'}`}>
                          {data.total >= 0 ? '+' : ''}{formatCurrency(data.total, 'USD')}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
            
            {/* Recent funding events - compact mode */}
            {compact && fundingStats.recentFunding.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Recent Events</p>
                {fundingStats.recentFunding.slice(0, 5).map((item) => (
                  <div 
                    key={`${item.tranId}-${item.time}`}
                    className="flex items-center justify-between text-xs p-1.5 rounded bg-muted/30"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {format(new Date(item.time), "HH:mm")}
                      </span>
                      <span className="font-mono">{item.symbol}</span>
                    </div>
                    <span className={item.income >= 0 ? 'text-profit' : 'text-loss'}>
                      {item.income >= 0 ? '+' : ''}{formatCurrency(item.income, 'USD')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
