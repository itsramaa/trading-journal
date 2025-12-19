import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ExternalLink,
  Clock,
  Bell
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Area, 
  AreaChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip 
} from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent, formatQuantity, formatDate } from "@/lib/formatters";
import { useAssetBySymbol, useHoldings, useTransactions, useDefaultPortfolio } from "@/hooks/use-portfolio";
import { useAssetHistory } from "@/hooks/use-asset-history";
import { transformHoldings, transformTransactions } from "@/lib/data-transformers";
import { useAppStore, convertCurrency } from "@/store/app-store";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { PriceAlertForm } from "@/components/alerts/PriceAlertForm";

const timeframes = ['1H', '24H', '7D', '1M', '1Y', 'ALL'] as const;

function AssetDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32 mt-2" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-[350px] rounded-xl lg:col-span-2" />
        <Skeleton className="h-[350px] rounded-xl" />
      </div>
    </div>
  );
}

const AssetDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24H');
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showAlertForm, setShowAlertForm] = useState(false);
  
  const { currency, exchangeRate } = useAppStore();
  const { data: portfolio } = useDefaultPortfolio();
  const { data: assetData, isLoading: assetLoading } = useAssetBySymbol(symbol || '');
  const { data: historyData, isLoading: historyLoading } = useAssetHistory(symbol, selectedTimeframe);
  const { data: dbHoldings, isLoading: holdingsLoading } = useHoldings(portfolio?.id);
  const { data: dbTransactions, isLoading: transactionsLoading } = useTransactions(portfolio?.id);

  const isLoading = assetLoading || holdingsLoading || transactionsLoading;

  // Transform data
  const holdings = useMemo(() => dbHoldings ? transformHoldings(dbHoldings) : [], [dbHoldings]);
  const transactions = useMemo(() => dbTransactions ? transformTransactions(dbTransactions) : [], [dbTransactions]);

  // Find holding and transactions for this asset
  const holding = holdings.find(h => h.asset.symbol === symbol);
  const assetTransactions = transactions.filter(t => t.assetSymbol === symbol);

  // Transform historical data for chart
  const chartData = useMemo(() => {
    // If we have real historical data, use it
    if (historyData && historyData.length > 0) {
      return historyData.map(item => ({
        date: formatChartDate(item.date, selectedTimeframe),
        value: item.price,
      }));
    }
    
    // Fallback to simulated data if no historical data
    if (!assetData?.price_cache) return [];
    
    const currentPrice = assetData.price_cache.price || 0;
    const points: { date: string; value: number }[] = [];
    const now = new Date();
    
    let intervals = 24;
    let intervalMs = 60 * 60 * 1000; // 1 hour
    
    switch (selectedTimeframe) {
      case '1H':
        intervals = 12;
        intervalMs = 5 * 60 * 1000;
        break;
      case '24H':
        intervals = 24;
        intervalMs = 60 * 60 * 1000;
        break;
      case '7D':
        intervals = 7;
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case '1M':
        intervals = 30;
        intervalMs = 24 * 60 * 60 * 1000;
        break;
      case '1Y':
        intervals = 12;
        intervalMs = 30 * 24 * 60 * 60 * 1000;
        break;
      case 'ALL':
        intervals = 24;
        intervalMs = 30 * 24 * 60 * 60 * 1000;
        break;
    }
    
    const change24h = assetData.price_cache.price_change_percentage_24h || 0;
    const volatility = Math.abs(change24h) / 100;
    
    for (let i = intervals; i >= 0; i--) {
      const date = new Date(now.getTime() - i * intervalMs);
      const randomChange = (Math.random() - 0.5) * volatility * 2;
      const historicalPrice = currentPrice * (1 - (change24h / 100) * (i / intervals) + randomChange);
      
      points.push({
        date: formatChartDate(date.toISOString(), selectedTimeframe),
        value: historicalPrice,
      });
    }
    
    return points;
  }, [historyData, assetData, selectedTimeframe]);

  // Helper to format chart dates
  function formatChartDate(dateStr: string, timeframe: string): string {
    const date = new Date(dateStr);
    if (timeframe === '1H' || timeframe === '24H') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Format currency with conversion
  const formatValue = (value: number, market: 'US' | 'ID' | 'CRYPTO' = 'US') => {
    if (currency === 'IDR' && market !== 'ID') {
      return formatCurrency(convertCurrency(value, 'USD', 'IDR', exchangeRate), 'ID');
    }
    return formatCurrency(value, market);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <AssetDetailSkeleton />
      </DashboardLayout>
    );
  }

  if (!assetData) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-muted-foreground">Asset not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const priceCache = assetData.price_cache;
  const currentPrice = priceCache?.price || 0;
  const priceChange24h = priceCache?.price_change_percentage_24h || 0;
  const priceChange1h = 0; // Not available in current schema
  const priceChange7d = 0; // Not available in current schema
  const isPositive = priceChange24h >= 0;
  const market = assetData.asset_type === 'ID_STOCK' ? 'ID' : 'US';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              {assetData.logo_url ? (
                <img src={assetData.logo_url} alt={assetData.name} className="h-12 w-12 rounded-xl" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-bold text-primary">
                  {assetData.symbol.slice(0, 2)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{assetData.name}</h1>
                  <Badge variant="outline" className="text-xs">{assetData.symbol}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">{assetData.asset_type}</Badge>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setShowAlertForm(true)}>
              <Bell className="h-4 w-4" />
              Set Alert
            </Button>
            <Button className="gap-2" onClick={() => setShowTransactionForm(true)}>
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Price & Chart Section */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-xl border border-border/50 bg-card p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-3xl font-bold font-mono-numbers">
                  {formatValue(currentPrice, market)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "inline-flex items-center gap-1 text-sm font-medium",
                    isPositive ? "text-profit" : "text-loss"
                  )}>
                    {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {formatPercent(priceChange24h)}
                  </span>
                  <span className="text-sm text-muted-foreground">24h</span>
                </div>
              </div>
              <div className="flex gap-1">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSelectedTimeframe(tf)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                      selectedTimeframe === tf
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[300px] w-full">
              {historyLoading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm">Loading chart data...</span>
                  </div>
                </div>
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isPositive ? "hsl(152, 82%, 39%)" : "hsl(0, 84%, 60%)"} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={isPositive ? "hsl(152, 82%, 39%)" : "hsl(0, 84%, 60%)"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={['dataMin * 0.99', 'dataMax * 1.01']} width={60} tickFormatter={(v) => formatValue(v, market)} />
                    <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                      <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-lg">
                        <p className="text-xs text-muted-foreground">{label}</p>
                        <p className="text-sm font-semibold font-mono-numbers">{formatValue(payload[0].value as number, market)}</p>
                      </div>
                    ) : null} />
                    <Area type="monotone" dataKey="value" stroke={isPositive ? "hsl(152, 82%, 39%)" : "hsl(0, 84%, 60%)"} strokeWidth={2} fill="url(#priceGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No price data available
                </div>
              )}
            </div>
          </div>

          {/* Stats Panel */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h3 className="font-semibold mb-4">Price Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">1h Change</span>
                  <span className={cn("font-mono-numbers font-medium", priceChange1h >= 0 ? "text-profit" : "text-loss")}>
                    {formatPercent(priceChange1h)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">24h Change</span>
                  <span className={cn("font-mono-numbers font-medium", priceChange24h >= 0 ? "text-profit" : "text-loss")}>
                    {formatPercent(priceChange24h)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">7d Change</span>
                  <span className={cn("font-mono-numbers font-medium", priceChange7d >= 0 ? "text-profit" : "text-loss")}>
                    {formatPercent(priceChange7d)}
                  </span>
                </div>
                {priceCache?.market_cap && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Market Cap</span>
                    <span className="font-mono-numbers font-medium">
                      {formatValue(priceCache.market_cap, market)}
                    </span>
                  </div>
                )}
                {priceCache?.volume_24h && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">24h Volume</span>
                    <span className="font-mono-numbers font-medium">
                      {formatValue(priceCache.volume_24h, market)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {holding && (
              <div className="rounded-xl border border-border/50 bg-card p-5">
                <h3 className="font-semibold mb-4">Your Position</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-mono-numbers font-medium">{formatQuantity(holding.quantity, market)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg. Price</span>
                    <span className="font-mono-numbers font-medium">{formatValue(holding.avgPrice, market)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Value</span>
                    <span className="font-mono-numbers font-medium">{formatValue(holding.value, market)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">P/L</span>
                    <span className={cn("font-mono-numbers font-medium", holding.profitLoss >= 0 ? "text-profit" : "text-loss")}>
                      {holding.profitLoss >= 0 ? '+' : ''}{formatValue(holding.profitLoss, market)} ({formatPercent(holding.profitLossPercent)})
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="about">About</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <div className="rounded-xl border border-border/50 bg-card">
              <div className="px-5 py-4 border-b border-border/50">
                <h3 className="font-semibold">Transaction History</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{assetTransactions.length} transactions for this asset</p>
              </div>
              {assetTransactions.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {assetTransactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg",
                          tx.type === 'BUY' || tx.type === 'TRANSFER_IN' ? "bg-profit/10" : "bg-loss/10"
                        )}>
                          {tx.type === 'BUY' || tx.type === 'TRANSFER_IN' ? (
                            <TrendingDown className="h-4 w-4 text-profit" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-loss" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{tx.type}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(tx.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono-numbers font-medium">
                          {tx.quantity} {assetData.symbol}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono-numbers">
                          @ {formatValue(tx.price, market)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No transactions yet</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => setShowTransactionForm(true)}>
                    <Plus className="h-4 w-4" />
                    Add Transaction
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="about">
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h3 className="font-semibold mb-3">About {assetData.name}</h3>
              <p className="text-sm text-muted-foreground">
                {assetData.asset_type === 'crypto' 
                  ? `${assetData.name} (${assetData.symbol}) is a cryptocurrency trading on decentralized exchanges.`
                  : `${assetData.name} (${assetData.symbol}) is a ${assetData.asset_type.replace('_', ' ')} listed on the ${market === 'US' ? 'US stock' : 'Indonesian stock'} market.`
                }
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Transaction Form Dialog */}
      {showTransactionForm && portfolio && (
        <TransactionForm portfolioId={portfolio.id} />
      )}

      {/* Price Alert Form Dialog */}
      {showAlertForm && (
        <PriceAlertForm 
          assetId={assetData.id}
          assetSymbol={assetData.symbol}
          currentPrice={currentPrice}
          onClose={() => setShowAlertForm(false)}
        />
      )}
    </DashboardLayout>
  );
};

export default AssetDetail;
