import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp, TrendingDown, MoreHorizontal, Filter } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCompactCurrency, formatPercent, formatQuantity } from "@/lib/formatters";
import { AddTransactionDialog } from "@/components/transactions/AddTransactionDialog";
import { AddAssetForm } from "@/components/assets/AddAssetForm";
import { AllocationBreakdown } from "@/components/portfolio/AllocationBreakdown";
import { EmptyHoldings, EmptySearchResults } from "@/components/ui/empty-state";
import { QuickTip } from "@/components/ui/onboarding-tooltip";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { ImportExportDialog } from "@/components/data/ImportExportDialog";
import { useHoldings, useDefaultPortfolio, useAssets, useTransactions, useCreateTransaction } from "@/hooks/use-portfolio";
import { useAuth } from "@/hooks/use-auth";
import { transformHoldings, calculateMetrics, calculateAllocation } from "@/lib/data-transformers";
import type { Holding } from "@/types/portfolio";

const Portfolio = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("value");

  const { user } = useAuth();
  const { data: defaultPortfolio } = useDefaultPortfolio();
  const { data: dbHoldings = [], isLoading: holdingsLoading } = useHoldings(defaultPortfolio?.id);
  const { data: assets = [], isLoading: assetsLoading } = useAssets();
  const { data: transactions = [] } = useTransactions(defaultPortfolio?.id);
  const createTransaction = useCreateTransaction();
  const isLoading = holdingsLoading || assetsLoading;

  // Transform database holdings to UI format
  const holdings = useMemo(() => transformHoldings(dbHoldings), [dbHoldings]);
  const metrics = useMemo(() => calculateMetrics(holdings), [holdings]);
  const detailedAllocation = useMemo(() => calculateAllocation(holdings), [holdings]);

  const filteredHoldings = useMemo(() => {
    return holdings
      .filter((h) => {
        const matchesSearch = 
          h.asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          h.asset.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesMarket = marketFilter === "all" || h.asset.market === marketFilter;
        return matchesSearch && matchesMarket;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "value":
            return b.value - a.value;
          case "pl":
            return b.profitLossPercent - a.profitLossPercent;
          case "name":
            return a.asset.symbol.localeCompare(b.asset.symbol);
          default:
            return 0;
        }
      });
  }, [holdings, searchQuery, marketFilter, sortBy]);

  const uniqueMarkets = [...new Set(holdings.map(h => h.asset.market))];

  // Export portfolio transactions
  const handleExportTransactions = useCallback(async () => {
    return transactions.map(tx => ({
      symbol: tx.assets?.symbol || '',
      name: tx.assets?.name || '',
      type: tx.transaction_type,
      quantity: tx.quantity,
      price_per_unit: tx.price_per_unit,
      total_amount: tx.total_amount,
      fee: tx.fee,
      transaction_date: tx.transaction_date,
      notes: tx.notes,
    }));
  }, [transactions]);

  // Import portfolio transactions
  const handleImportTransactions = useCallback(async (data: Record<string, unknown>[]) => {
    if (!user?.id || !defaultPortfolio?.id) throw new Error("User or portfolio not found");
    
    // Get all assets to find matching symbols
    const assetMap = new Map(assets.map(a => [a.symbol.toUpperCase(), a]));
    
    for (const row of data) {
      const symbol = String(row.symbol || '').toUpperCase();
      const asset = assetMap.get(symbol);
      
      if (!asset) {
        console.warn(`Asset not found for symbol: ${symbol}`);
        continue;
      }

      await createTransaction.mutateAsync({
        user_id: user.id,
        portfolio_id: defaultPortfolio.id,
        asset_id: asset.id,
        payment_account_id: null,
        transaction_type: String(row.type || 'BUY'),
        quantity: Number(row.quantity) || 0,
        price_per_unit: Number(row.price_per_unit) || 0,
        total_amount: Number(row.total_amount) || (Number(row.quantity) * Number(row.price_per_unit)),
        fee: row.fee ? Number(row.fee) : 0,
        transaction_date: row.transaction_date ? String(row.transaction_date) : new Date().toISOString(),
        notes: row.notes ? String(row.notes) : null,
      });
    }
  }, [user?.id, defaultPortfolio?.id, assets, createTransaction]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
            <p className="text-muted-foreground">Manage your investment holdings and allocations.</p>
          </div>
          <MetricsGridSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
            <p className="text-muted-foreground">
              Manage your investment holdings and allocations.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ImportExportDialog
              title="Import/Export Portfolio"
              description="Backup your portfolio transactions or import from another source"
              exportData={handleExportTransactions}
              importData={handleImportTransactions}
              exportFilename="portfolio-transactions"
              templateFields={['symbol', 'type', 'quantity', 'price_per_unit', 'total_amount', 'fee', 'transaction_date', 'notes']}
            />
            <AddTransactionDialog portfolioId={defaultPortfolio?.id} />
          </div>
        </div>

        {/* Quick Tip - Nielsen H10 */}
        <QuickTip storageKey="portfolio_tip" className="mb-2">
          <strong>Pro tip:</strong> Click on any holding card to see detailed asset information, price history, and all related transactions.
        </QuickTip>

        {/* Portfolio Value Summary - 5 Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {/* Total Portfolio Value */}
          <Card className="col-span-2 lg:col-span-1 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono-numbers">
                {formatCompactCurrency(metrics.totalValue)}
              </p>
              <div className={cn("flex items-center gap-1 mt-1", metrics.totalProfitLoss >= 0 ? "text-profit" : "text-loss")}>
                {metrics.totalProfitLoss >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span className="text-xs font-medium font-mono-numbers">
                  {formatPercent(metrics.totalProfitLossPercent)} all time
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Total Assets */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{holdings.length}</p>
              <p className="text-xs text-muted-foreground">Across {uniqueMarkets.length} markets</p>
            </CardContent>
          </Card>

          {/* Cost Basis */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cost Basis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono-numbers">
                {formatCompactCurrency(metrics.totalCostBasis)}
              </p>
              <p className="text-xs text-muted-foreground">Total invested</p>
            </CardContent>
          </Card>

          {/* Best Performer */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Best Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {metrics.bestPerformer?.symbol ?? 'N/A'}
              </p>
              <p className={cn("text-xs font-mono-numbers", "text-profit")}>
                {metrics.bestPerformer 
                  ? '+' + formatPercent(metrics.bestPerformer.profitLossPercent) + ' return'
                  : 'No data'}
              </p>
            </CardContent>
          </Card>

          {/* Worst Performer */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Worst Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {metrics.worstPerformer?.symbol ?? 'N/A'}
              </p>
              <p className={cn(
                "text-xs font-mono-numbers", 
                (metrics.worstPerformer?.profitLossPercent ?? 0) >= 0 ? "text-profit" : "text-loss"
              )}>
                {metrics.worstPerformer 
                  ? (metrics.worstPerformer.profitLossPercent >= 0 ? '+' : '') + 
                    formatPercent(metrics.worstPerformer.profitLossPercent) + ' return'
                  : 'No data'}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="holdings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search holdings..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={marketFilter} onValueChange={setMarketFilter}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Market" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="all">All Markets</SelectItem>
                  <SelectItem value="CRYPTO">Crypto</SelectItem>
                  <SelectItem value="US">US Stocks</SelectItem>
                  <SelectItem value="ID">ID Stocks</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="value">By Value</SelectItem>
                  <SelectItem value="pl">By P/L %</SelectItem>
                  <SelectItem value="name">By Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Holdings Grid */}
            {filteredHoldings.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredHoldings.map((holding) => (
                  <HoldingCard key={holding.id} holding={holding} onClick={() => navigate(`/asset/${holding.asset.symbol}`)} />
                ))}
              </div>
            ) : holdings.length === 0 ? (
              <EmptyHoldings />
            ) : (
              <EmptySearchResults 
                onClearSearch={() => {
                  setSearchQuery("");
                  setMarketFilter("all");
                }} 
              />
            )}
          </TabsContent>

          <TabsContent value="allocation" className="space-y-4">
            <AllocationBreakdown allocations={detailedAllocation} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

// ============= Extracted Components =============

interface HoldingCardProps {
  holding: Holding;
  onClick: () => void;
}

function HoldingCard({ holding, onClick }: HoldingCardProps) {
  return (
    <Card 
      className="group relative overflow-hidden border-border/50 cursor-pointer transition-all hover:border-border hover:shadow-sm"
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 font-bold text-primary">
              {holding.asset.symbol.slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold">{holding.asset.symbol}</p>
              <p className="text-sm text-muted-foreground">
                {holding.asset.name}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onClick(); }}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>Add Transaction</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Value</p>
            <p className="font-semibold font-mono-numbers">
              {formatCurrency(holding.value, holding.asset.market)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Quantity</p>
            <p className="font-semibold font-mono-numbers">
              {formatQuantity(holding.quantity, holding.asset.market)}
            </p>
          </div>
        </div>

        {/* P/L Section with Avg Buy Price */}
        <div className="mt-4 rounded-lg bg-muted/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">P/L</p>
              <p
                className={cn(
                  "font-semibold font-mono-numbers",
                  holding.profitLoss >= 0 ? "text-profit" : "text-loss"
                )}
              >
                {holding.profitLoss >= 0 ? "+" : ""}
                {formatCurrency(holding.profitLoss, holding.asset.market)}
              </p>
            </div>
            <Badge
              className={cn(
                "gap-1",
                holding.profitLossPercent >= 0
                  ? "bg-profit-muted text-profit hover:bg-profit-muted"
                  : "bg-loss-muted text-loss hover:bg-loss-muted"
              )}
            >
              {holding.profitLossPercent >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatPercent(holding.profitLossPercent)}
            </Badge>
          </div>
          
          {/* Avg Buy Price */}
          <div className="pt-2 border-t border-border/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg Buy Price</span>
              <span className="font-mono-numbers">
                {formatCurrency(holding.avgPrice, holding.asset.market)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default Portfolio;
