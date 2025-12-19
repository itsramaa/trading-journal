import { useState } from "react";
import { Plus, Search, TrendingUp, TrendingDown, MoreHorizontal } from "lucide-react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { demoHoldings, demoPortfolioMetrics } from "@/lib/demo-data";

const targetAllocations = [
  { name: "Crypto", target: 30, current: 13.3, color: "bg-chart-1" },
  { name: "US Stocks", target: 25, current: 8.7, color: "bg-chart-2" },
  { name: "ID Stocks", target: 35, current: 76.3, color: "bg-chart-3" },
  { name: "ETF", target: 10, current: 1.7, color: "bg-chart-4" },
];

const Portfolio = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredHoldings = demoHoldings.filter(
    (h) =>
      h.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatCurrency = (value: number, market: string) => {
    if (market === "ID") {
      return `Rp ${value.toLocaleString("id-ID")}`;
    }
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Portfolio</h1>
            <p className="text-muted-foreground">
              Manage your investment holdings and allocations.
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Asset
          </Button>
        </div>

        {/* Portfolio Value Summary */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Portfolio Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-4">
                <p className="text-3xl font-bold">
                  ${(demoPortfolioMetrics.totalValue / 1000).toFixed(1)}K
                </p>
                <div className="flex items-center gap-1 text-profit">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    +{demoPortfolioMetrics.totalProfitLossPercent}%
                  </span>
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                +${(demoPortfolioMetrics.totalProfitLoss / 1000).toFixed(1)}K all
                time profit
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Assets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{demoHoldings.length}</p>
              <p className="text-sm text-muted-foreground">Across 3 markets</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Best Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">NVDA</p>
              <p className="text-sm text-profit">+94.4% return</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="holdings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="holdings">Holdings</TabsTrigger>
            <TabsTrigger value="allocation">Allocation</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings" className="space-y-4">
            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search holdings..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Holdings Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredHoldings.map((asset) => (
                <Card key={asset.id} className="group relative overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary font-semibold">
                          {asset.symbol.slice(0, 2)}
                        </div>
                        <div>
                          <p className="font-semibold">{asset.symbol}</p>
                          <p className="text-sm text-muted-foreground">
                            {asset.name}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View Details</DropdownMenuItem>
                          <DropdownMenuItem>Add Transaction</DropdownMenuItem>
                          <DropdownMenuItem className="text-loss">
                            Remove Asset
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Value</p>
                        <p className="font-semibold">
                          {formatCurrency(asset.value, asset.market)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Quantity</p>
                        <p className="font-semibold">{asset.quantity}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-lg bg-secondary/50 p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">P/L</p>
                        <p
                          className={cn(
                            "font-semibold",
                            asset.profitLoss >= 0 ? "text-profit" : "text-loss"
                          )}
                        >
                          {asset.profitLoss >= 0 ? "+" : ""}
                          {formatCurrency(asset.profitLoss, asset.market)}
                        </p>
                      </div>
                      <Badge
                        className={cn(
                          "gap-1",
                          asset.profitLossPercent >= 0
                            ? "bg-profit-muted text-profit hover:bg-profit-muted"
                            : "bg-loss-muted text-loss hover:bg-loss-muted"
                        )}
                      >
                        {asset.profitLossPercent >= 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {asset.profitLossPercent >= 0 ? "+" : ""}
                        {asset.profitLossPercent.toFixed(1)}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="allocation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Target vs Actual Allocation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {targetAllocations.map((allocation) => (
                  <div key={allocation.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn("h-3 w-3 rounded-full", allocation.color)} />
                        <span className="font-medium">{allocation.name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-muted-foreground">
                          Target: {allocation.target}%
                        </span>
                        <span
                          className={cn(
                            "font-medium",
                            Math.abs(allocation.current - allocation.target) > 10
                              ? "text-loss"
                              : "text-profit"
                          )}
                        >
                          Actual: {allocation.current}%
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <Progress value={allocation.current} className="h-2" />
                      <div
                        className="absolute top-0 h-2 w-0.5 bg-foreground"
                        style={{ left: `${allocation.target}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {allocation.current > allocation.target
                        ? `${(allocation.current - allocation.target).toFixed(1)}% overweight`
                        : `${(allocation.target - allocation.current).toFixed(1)}% underweight`}
                    </p>
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

export default Portfolio;
