import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ExternalLink,
  Activity,
  DollarSign,
  BarChart3,
  Clock
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { demoAssets, demoHoldings, demoTransactions, performance24h } from "@/lib/demo-data";

const timeframes = ['1H', '24H', '7D', '1M', '1Y', 'ALL'] as const;

const AssetDetail = () => {
  const { symbol } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24H');

  const asset = demoAssets.find(a => a.symbol === symbol);
  const holding = demoHoldings.find(h => h.asset.symbol === symbol);
  const assetTransactions = demoTransactions.filter(t => t.assetSymbol === symbol);

  if (!asset) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-muted-foreground">Asset not found</p>
          <Button onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const isPositive = asset.priceChange24h >= 0;

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
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 text-lg font-bold text-primary">
                {asset.symbol.slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold">{asset.name}</h1>
                  <Badge variant="outline" className="text-xs">{asset.symbol}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="text-xs">{asset.market}</Badge>
                  <span>•</span>
                  <span>{asset.type}</span>
                  {asset.sector && (
                    <>
                      <span>•</span>
                      <span>{asset.sector}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              View on Exchange
            </Button>
            <Button className="gap-2">
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
                  {formatCurrency(asset.currentPrice, asset.market)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn(
                    "inline-flex items-center gap-1 text-sm font-medium",
                    isPositive ? "text-profit" : "text-loss"
                  )}>
                    {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {formatPercent(asset.priceChange24h)}
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
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={performance24h} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={isPositive ? "hsl(152, 82%, 39%)" : "hsl(0, 84%, 60%)"} stopOpacity={0.2} />
                      <stop offset="100%" stopColor={isPositive ? "hsl(152, 82%, 39%)" : "hsl(0, 84%, 60%)"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} domain={['dataMin - 1000', 'dataMax + 1000']} width={60} />
                  <Tooltip content={({ active, payload, label }) => active && payload?.length ? (
                    <div className="rounded-lg border border-border/50 bg-card px-3 py-2 shadow-lg">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-sm font-semibold font-mono-numbers">{formatCurrency(payload[0].value as number, asset.market)}</p>
                    </div>
                  ) : null} />
                  <Area type="monotone" dataKey="value" stroke={isPositive ? "hsl(152, 82%, 39%)" : "hsl(0, 84%, 60%)"} strokeWidth={2} fill="url(#priceGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="space-y-4">
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h3 className="font-semibold mb-4">Price Statistics</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">1h Change</span>
                  <span className={cn("font-mono-numbers font-medium", asset.priceChange1h >= 0 ? "text-profit" : "text-loss")}>
                    {formatPercent(asset.priceChange1h)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">24h Change</span>
                  <span className={cn("font-mono-numbers font-medium", asset.priceChange24h >= 0 ? "text-profit" : "text-loss")}>
                    {formatPercent(asset.priceChange24h)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">7d Change</span>
                  <span className={cn("font-mono-numbers font-medium", asset.priceChange7d >= 0 ? "text-profit" : "text-loss")}>
                    {formatPercent(asset.priceChange7d)}
                  </span>
                </div>
              </div>
            </div>

            {holding && (
              <div className="rounded-xl border border-border/50 bg-card p-5">
                <h3 className="font-semibold mb-4">Your Position</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-mono-numbers font-medium">{formatQuantity(holding.quantity, asset.market)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg. Price</span>
                    <span className="font-mono-numbers font-medium">{formatCurrency(holding.avgPrice, asset.market)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Value</span>
                    <span className="font-mono-numbers font-medium">{formatCurrency(holding.value, asset.market)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">P/L</span>
                    <span className={cn("font-mono-numbers font-medium", holding.profitLoss >= 0 ? "text-profit" : "text-loss")}>
                      {holding.profitLoss >= 0 ? '+' : ''}{formatCurrency(holding.profitLoss, asset.market)} ({formatPercent(holding.profitLossPercent)})
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
                          tx.type === 'BUY' ? "bg-profit/10" : "bg-loss/10"
                        )}>
                          {tx.type === 'BUY' ? (
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
                          {tx.quantity} {asset.symbol}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono-numbers">
                          @ {formatCurrency(tx.price, asset.market)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No transactions yet</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-2">
                    <Plus className="h-4 w-4" />
                    Add Transaction
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="about">
            <div className="rounded-xl border border-border/50 bg-card p-5">
              <h3 className="font-semibold mb-3">About {asset.name}</h3>
              <p className="text-sm text-muted-foreground">
                {asset.type === 'CRYPTO' 
                  ? `${asset.name} (${asset.symbol}) is a cryptocurrency trading on decentralized exchanges.`
                  : `${asset.name} (${asset.symbol}) is a ${asset.type.toLowerCase()} listed on the ${asset.market === 'US' ? 'US stock' : 'Indonesian stock'} market${asset.sector ? ` in the ${asset.sector} sector` : ''}.`
                }
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AssetDetail;
