/**
 * Top Movers Page - Shows top gainers, losers, and volume leaders
 * Uses Phase 3 useBinanceTopMovers hook
 */
import { useState, useMemo, memo } from "react";
import { useSearchParams } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Volume2,
  AlertTriangle,
} from "lucide-react";
import { useBinanceTopMovers, type Ticker24h } from "@/features/binance";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { cn } from "@/lib/utils";
import { getBaseSymbol } from "@/lib/symbol-utils";
import { CryptoIcon } from "@/components/ui/crypto-icon";

type SortBy = 'percentage' | 'priceChange' | 'volume';
type MinVolume = 'all' | '100k' | '1m' | '10m';

interface MoverCardProps {
  ticker: Ticker24h;
  rank: number;
  type: 'gainer' | 'loser' | 'volume';
  sortBy: SortBy;
  format: (v: number) => string;
}

const MoverCard = memo(function MoverCard({ ticker, rank, type, sortBy, format }: MoverCardProps) {
  const isPositive = ticker.priceChangePercent >= 0;
  const symbol = getBaseSymbol(ticker.symbol);
  const showVolume = type === 'volume' || sortBy === 'volume';
  const isLowVolume = ticker.quoteVolume < 100_000;

  // Determine right-side display content
  const rightContent = useMemo(() => {
    if (showVolume) {
      return {
        primary: format(ticker.quoteVolume),
        secondary: "24h Volume",
        colorClass: undefined,
        icon: undefined,
      };
    }
    if (sortBy === 'priceChange') {
      return {
        primary: format(Math.abs(ticker.priceChange)),
        secondary: `${isPositive ? '+' : ''}${ticker.priceChangePercent.toFixed(2)}%`,
        colorClass: isPositive ? "text-profit" : "text-loss",
        icon: isPositive ? ArrowUpRight : ArrowDownRight,
      };
    }
    return {
      primary: `${isPositive ? '+' : ''}${ticker.priceChangePercent.toFixed(2)}%`,
      secondary: format(Math.abs(ticker.priceChange)),
      colorClass: isPositive ? "text-profit" : "text-loss",
      icon: isPositive ? ArrowUpRight : ArrowDownRight,
    };
  }, [ticker, sortBy, showVolume, isPositive, format]);

  const IconComp = rightContent.icon;

  return (
    <div className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
        {rank}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <CryptoIcon symbol={ticker.symbol} size={24} />
          <span className="font-semibold">{symbol}</span>
          <Badge variant="outline" className="text-xs cursor-help" title="Only USDT-denominated trading pairs are shown for consistent comparison.">
            USDT
          </Badge>
          {isLowVolume && (
            <Badge variant="outline" className="text-[10px] h-4 px-1 border-[hsl(var(--chart-4))]/50 text-[hsl(var(--chart-4))] cursor-help" title="Volume below $100K. Low liquidity means wider spreads and higher slippage risk.">
              <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
              Low Liq
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-mono-numbers">{format(ticker.lastPrice)}</span>
          <span className="text-xs cursor-help" title="24-hour trading volume denominated in USDT.">Vol: {format(ticker.quoteVolume)}</span>
        </div>
      </div>
      
      <div className={cn("flex items-center gap-1 text-right", rightContent.colorClass)}>
        {IconComp && <IconComp className="h-4 w-4" />}
        <div>
          <div className="font-semibold font-mono-numbers">{rightContent.primary}</div>
          <div className="text-xs opacity-80">{rightContent.secondary}</div>
        </div>
      </div>
    </div>
  );
});

function MoversList({ tickers, type, isLoading, sortBy, format }: { 
  tickers: Ticker24h[];
  type: 'gainer' | 'loser' | 'volume';
  isLoading: boolean;
  sortBy: SortBy;
  format: (v: number) => string;
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
        description="No coins match the current filters, or market data is unavailable."
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
          sortBy={sortBy}
          format={format}
        />
      ))}
    </div>
  );
}

export default function TopMovers() {
  const { format } = useCurrencyConversion();
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<SortBy>('percentage');
  const [minVolume, setMinVolume] = useState<MinVolume>('100k');
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab URL persistence
  const activeTab = searchParams.get('tab') || 'gainers';
  const handleTabChange = (tab: string) => {
    setSearchParams(prev => {
      prev.set('tab', tab);
      return prev;
    }, { replace: true });
  };

  const { data, isLoading, refetch, isFetching, dataUpdatedAt } = useBinanceTopMovers(limit);
  const { topGainers = [], topLosers = [], topVolume = [], allTickers = [] } = data || {};
  
  // Volume filter thresholds
  const volumeThreshold = useMemo(() => {
    switch (minVolume) {
      case '100k': return 100_000;
      case '1m': return 1_000_000;
      case '10m': return 10_000_000;
      default: return 0;
    }
  }, [minVolume]);
  
  // Apply volume filter — return empty if none match (no silent fallback)
  const filteredTickers = useMemo(() => {
    if (volumeThreshold === 0) return allTickers;
    return allTickers.filter(t => t.quoteVolume >= volumeThreshold);
  }, [allTickers, volumeThreshold]);
  
  // Format last updated time
  const lastUpdated = dataUpdatedAt 
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;
  
  // Dynamic sorting based on user selection + volume filter
  // Gainers: always positive priceChangePercent coins
  const sortedGainers = useMemo(() => {
    const source = filteredTickers.filter(t => t.priceChangePercent > 0);
    if (sortBy === 'volume') {
      return [...source].sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, limit);
    }
    if (sortBy === 'priceChange') {
      return [...source].sort((a, b) => b.priceChange - a.priceChange).slice(0, limit);
    }
    return [...source].sort((a, b) => b.priceChangePercent - a.priceChangePercent).slice(0, limit);
  }, [filteredTickers, sortBy, limit]);

  // Losers: always negative priceChangePercent coins, sorted by most negative first
  const sortedLosers = useMemo(() => {
    const source = filteredTickers.filter(t => t.priceChangePercent < 0);
    if (sortBy === 'volume') {
      // Highest volume losers (most significant declines)
      return [...source].sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, limit);
    }
    if (sortBy === 'priceChange') {
      return [...source].sort((a, b) => a.priceChange - b.priceChange).slice(0, limit);
    }
    return [...source].sort((a, b) => a.priceChangePercent - b.priceChangePercent).slice(0, limit);
  }, [filteredTickers, sortBy, limit]);

  // Volume tab: top volume from filtered pool
  const sortedVolume = useMemo(() => {
    return [...filteredTickers].sort((a, b) => b.quoteVolume - a.quoteVolume).slice(0, limit);
  }, [filteredTickers, limit]);

  // Summary cards derived from filtered data
  const summaryGainer = sortedGainers[0] ?? null;
  const summaryLoser = sortedLosers[0] ?? null;
  const summaryVolume = sortedVolume[0] ?? null;
  
  return (
    <div className="space-y-6" role="region" aria-label="Top Movers">
      {/* Page Header */}
        <PageHeader
          icon={BarChart3}
          title="Top Movers"
          description="Top gainers, losers, and volume leaders in the last 24 hours"
        >
          {isFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">Updated: {lastUpdated}</span>
          )}
          <div className="flex items-center gap-1">
            <InfoTooltip content="Sort coins by percentage change, absolute price change, or 24h trading volume." />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">% Change</SelectItem>
                <SelectItem value="priceChange">Price Change</SelectItem>
                <SelectItem value="volume">Volume</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-1">
            <InfoTooltip content="Filter out low-volume coins to focus on actively traded assets. Higher thresholds reduce noise from illiquid pairs." />
            <Select value={minVolume} onValueChange={(v) => setMinVolume(v as MinVolume)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Min Volume" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Coins</SelectItem>
                <SelectItem value="100k">Vol &gt;$100K</SelectItem>
                <SelectItem value="1m">Vol &gt;$1M</SelectItem>
                <SelectItem value="10m">Vol &gt;$10M</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLimit(limit === 10 ? 20 : 10)}
            title="Toggle between showing top 10 or top 20 results."
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
        </PageHeader>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-profit/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-profit" />
                Top Gainer
                <InfoTooltip content="Largest 24h percentage increase across all USDT pairs on Binance, respecting current volume filter." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : summaryGainer ? (
                <>
                  <div className="text-2xl font-bold">
                    {getBaseSymbol(summaryGainer.symbol)}
                  </div>
                  <p className="text-profit font-semibold">
                    +{summaryGainer.priceChangePercent.toFixed(2)}%
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
                <InfoTooltip content="Largest 24h percentage decrease across all USDT pairs on Binance, respecting current volume filter." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : summaryLoser ? (
                <>
                  <div className="text-2xl font-bold">
                    {getBaseSymbol(summaryLoser.symbol)}
                  </div>
                  <p className="text-loss font-semibold">
                    {summaryLoser.priceChangePercent.toFixed(2)}%
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
                <InfoTooltip content="Highest 24-hour USDT trading volume on Binance, respecting current volume filter." />
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32" />
              ) : summaryVolume ? (
                <>
                  <div className="text-2xl font-bold">
                    {getBaseSymbol(summaryVolume.symbol)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(summaryVolume.quoteVolume)}
                  </p>
                </>
              ) : (
                <span className="text-muted-foreground">No data</span>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabbed Lists */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
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
                  tickers={sortedGainers} 
                  type="gainer" 
                  isLoading={isLoading}
                  sortBy={sortBy}
                  format={format}
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
                  tickers={sortedLosers} 
                  type="loser" 
                  isLoading={isLoading}
                  sortBy={sortBy}
                  format={format}
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
                  <InfoTooltip content="Total quote (USDT) volume traded in the last 24 hours." />
                </CardTitle>
                <CardDescription>
                  Coins with the highest trading volume in the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MoversList 
                  tickers={sortedVolume} 
                  type="volume" 
                  isLoading={isLoading}
                  sortBy={sortBy}
                  format={format}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}
