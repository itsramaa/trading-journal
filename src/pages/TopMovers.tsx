/**
 * Top Movers Page - Shows top gainers, losers, and volume leaders
 * Uses Phase 3 useBinanceTopMovers hook
 */
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Volume2,
} from "lucide-react";
import { useBinanceTopMovers, type Ticker24h } from "@/features/binance";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface MoverCardProps {
  ticker: Ticker24h;
  rank: number;
  type: 'gainer' | 'loser' | 'volume';
}

function MoverCard({ ticker, rank, type }: MoverCardProps) {
  const isPositive = ticker.priceChangePercent >= 0;
  const symbol = ticker.symbol.replace('USDT', '');
  
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      {/* Rank */}
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
        {rank}
      </div>
      
      {/* Symbol & Price */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{symbol}</span>
          <Badge variant="outline" className="text-xs">USDT</Badge>
        </div>
        <div className="text-sm text-muted-foreground font-mono-numbers">
          ${ticker.lastPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
        </div>
      </div>
      
      {/* Change or Volume */}
      {type === 'volume' ? (
        <div className="text-right">
          <div className="text-sm font-medium">
            {formatCurrency(ticker.quoteVolume, 'USD')}
          </div>
          <div className="text-xs text-muted-foreground">
            24h Volume
          </div>
        </div>
      ) : (
        <div className={cn(
          "flex items-center gap-1 text-right",
          isPositive ? "text-profit" : "text-loss"
        )}>
          {isPositive ? (
            <ArrowUpRight className="h-4 w-4" />
          ) : (
            <ArrowDownRight className="h-4 w-4" />
          )}
          <div>
            <div className="font-semibold font-mono-numbers">
              {isPositive ? '+' : ''}{ticker.priceChangePercent.toFixed(2)}%
            </div>
            <div className="text-xs opacity-80">
              {isPositive ? '+' : ''}{ticker.priceChange.toFixed(4)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MoversList({ tickers, type, isLoading }: { 
  tickers: Ticker24h[];
  type: 'gainer' | 'loser' | 'volume';
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }
  
  if (tickers.length === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No data available"
        description="Unable to fetch market data at this time."
      />
    );
  }
  
  return (
    <div className="space-y-3">
      {tickers.map((ticker, index) => (
        <MoverCard 
          key={ticker.symbol} 
          ticker={ticker} 
          rank={index + 1}
          type={type}
        />
      ))}
    </div>
  );
}

export default function TopMovers() {
  const [limit, setLimit] = useState(10);
  const { data, isLoading, refetch, isFetching } = useBinanceTopMovers(limit);
  
  const { topGainers = [], topLosers = [], topVolume = [] } = data || {};
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Top Movers
            </h1>
            <p className="text-muted-foreground">
              Top gainers, losers, and volume leaders in the last 24 hours
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setLimit(limit === 10 ? 20 : 10)}
            >
              Show {limit === 10 ? '20' : '10'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2" 
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-profit/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-profit" />
                Top Gainer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : topGainers[0] ? (
                <>
                  <div className="text-2xl font-bold">
                    {topGainers[0].symbol.replace('USDT', '')}
                  </div>
                  <p className="text-profit font-semibold">
                    +{topGainers[0].priceChangePercent.toFixed(2)}%
                  </p>
                </>
              ) : (
                <span className="text-muted-foreground">No data</span>
              )}
            </CardContent>
          </Card>

          <Card className="border-loss/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-loss" />
                Top Loser
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : topLosers[0] ? (
                <>
                  <div className="text-2xl font-bold">
                    {topLosers[0].symbol.replace('USDT', '')}
                  </div>
                  <p className="text-loss font-semibold">
                    {topLosers[0].priceChangePercent.toFixed(2)}%
                  </p>
                </>
              ) : (
                <span className="text-muted-foreground">No data</span>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Volume2 className="h-4 w-4" />
                Highest Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : topVolume[0] ? (
                <>
                  <div className="text-2xl font-bold">
                    {topVolume[0].symbol.replace('USDT', '')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(topVolume[0].quoteVolume, 'USD')}
                  </p>
                </>
              ) : (
                <span className="text-muted-foreground">No data</span>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Lists */}
        <Tabs defaultValue="gainers" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="gainers" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Gainers
            </TabsTrigger>
            <TabsTrigger value="losers" className="gap-2">
              <TrendingDown className="h-4 w-4" />
              Losers
            </TabsTrigger>
            <TabsTrigger value="volume" className="gap-2">
              <Volume2 className="h-4 w-4" />
              Volume
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="gainers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-profit" />
                  Top Gainers
                </CardTitle>
                <CardDescription>
                  Coins with the highest price increase in the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MoversList 
                  tickers={topGainers} 
                  type="gainer" 
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="losers">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-loss" />
                  Top Losers
                </CardTitle>
                <CardDescription>
                  Coins with the highest price decrease in the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MoversList 
                  tickers={topLosers} 
                  type="loser" 
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="volume">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Volume2 className="h-5 w-5" />
                  Volume Leaders
                </CardTitle>
                <CardDescription>
                  Coins with the highest trading volume in the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MoversList 
                  tickers={topVolume} 
                  type="volume" 
                  isLoading={isLoading} 
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
