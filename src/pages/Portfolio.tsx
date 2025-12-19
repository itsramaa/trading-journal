import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp, TrendingDown, MoreHorizontal, Filter, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCompactCurrency, formatPercent, formatQuantity } from "@/lib/formatters";
import { demoHoldings, demoAllocationByType, demoPortfolioMetrics } from "@/lib/demo-data";
import type { Holding } from "@/types/portfolio";

const Portfolio = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("value");

  const holdings = demoHoldings;
  const metrics = demoPortfolioMetrics;
  const allocation = demoAllocationByType;

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
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Portfolio Value Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="col-span-2 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-4">
                <p className="text-3xl font-bold font-mono-numbers">
                  {formatCompactCurrency(metrics.totalValue)}
                </p>
                <div className={cn("flex items-center gap-1", metrics.totalProfitLoss >= 0 ? "text-profit" : "text-loss")}>
                  {metrics.totalProfitLoss >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  <span className="text-sm font-medium font-mono-numbers">
                    {formatPercent(metrics.totalProfitLossPercent)}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {metrics.totalProfitLoss >= 0 ? '+' : ''}{formatCompactCurrency(metrics.totalProfitLoss)} all time P/L
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{holdings.length}</p>
              <p className="text-sm text-muted-foreground">Across {uniqueMarkets.length} markets</p>
            </CardContent>
          </Card>

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
              <p className={cn("text-sm font-mono-numbers", "text-profit")}>
                {metrics.bestPerformer 
                  ? formatPercent(metrics.bestPerformer.profitLossPercent) + ' return'
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
                <SelectContent>
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
                <SelectContent>
                  <SelectItem value="value">By Value</SelectItem>
                  <SelectItem value="pl">By P/L %</SelectItem>
                  <SelectItem value="name">By Name</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Holdings Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredHoldings.map((holding) => (
                <HoldingCard key={holding.id} holding={holding} onClick={() => navigate(`/asset/${holding.asset.symbol}`)} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="allocation" className="space-y-4">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Allocation by Market</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {allocation.map((item) => (
                  <div key={item.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="font-medium font-mono-numbers">
                          {item.percentage.toFixed(1)}%
                        </span>
                        <span className="text-muted-foreground font-mono-numbers">
                          {formatCompactCurrency(item.value)}
                        </span>
                      </div>
                    </div>
                    <Progress value={item.percentage} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
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

        <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 p-3">
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
      </CardContent>
    </Card>
  );
}

export default Portfolio;
