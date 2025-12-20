import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/formatters";
import { TrendingUp, TrendingDown, AlertCircle, DollarSign, BarChart3 } from "lucide-react";

export default function Positions() {
  const { data: tradeEntries = [], isLoading } = useTradeEntries();

  // Filter only open positions
  const openPositions = useMemo(() => {
    return tradeEntries.filter((trade) => trade.status === "open");
  }, [tradeEntries]);

  // Calculate unrealized P&L for each position
  // In a real scenario, you'd fetch live prices from an API
  // For now, we'll use a simulated current price based on entry price
  const positionsWithPnL = useMemo(() => {
    return openPositions.map((position) => {
      // Simulate current price (in production, fetch from price API)
      // Using entry_price with a random fluctuation for demo
      const simulatedPriceChange = (Math.random() - 0.5) * 0.1; // ±5%
      const currentPrice = position.entry_price * (1 + simulatedPriceChange);
      
      // Calculate unrealized P&L
      const priceDiff = position.direction === "long" 
        ? currentPrice - position.entry_price 
        : position.entry_price - currentPrice;
      
      const unrealizedPnL = priceDiff * position.quantity;
      const unrealizedPnLPercent = (priceDiff / position.entry_price) * 100;
      
      // Calculate distance to stop loss and take profit
      const distanceToSL = position.stop_loss 
        ? ((position.entry_price - position.stop_loss) / position.entry_price) * 100
        : null;
      const distanceToTP = position.take_profit
        ? ((position.take_profit - position.entry_price) / position.entry_price) * 100
        : null;

      return {
        ...position,
        currentPrice,
        unrealizedPnL,
        unrealizedPnLPercent,
        distanceToSL,
        distanceToTP,
      };
    });
  }, [openPositions]);

  // Summary metrics
  const summary = useMemo(() => {
    const totalUnrealizedPnL = positionsWithPnL.reduce((sum, p) => sum + p.unrealizedPnL, 0);
    const totalExposure = positionsWithPnL.reduce((sum, p) => sum + (p.entry_price * p.quantity), 0);
    const longCount = positionsWithPnL.filter(p => p.direction === "long").length;
    const shortCount = positionsWithPnL.filter(p => p.direction === "short").length;
    const winningPositions = positionsWithPnL.filter(p => p.unrealizedPnL > 0).length;
    
    return {
      totalUnrealizedPnL,
      totalExposure,
      positionCount: positionsWithPnL.length,
      longCount,
      shortCount,
      winningPositions,
    };
  }, [positionsWithPnL]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Open Positions</h1>
        <p className="text-muted-foreground">
          Track your open trades with live unrealized P&L
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Unrealized P&L</CardTitle>
            {summary.totalUnrealizedPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalUnrealizedPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
              {formatCurrency(summary.totalUnrealizedPnL, "USD")}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {summary.positionCount} positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exposure</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.totalExposure, "USD")}
            </div>
            <p className="text-xs text-muted-foreground">
              Capital at risk
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Position Split</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.longCount}L / {summary.shortCount}S
            </div>
            <p className="text-xs text-muted-foreground">
              Long vs Short positions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Winning Positions</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.winningPositions} / {summary.positionCount}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in profit
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Positions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {positionsWithPnL.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No Open Positions</h3>
              <p className="text-muted-foreground">
                You don't have any open trades. Create a trade in the Journal with status "Open".
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pair</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead className="text-right">Entry Price</TableHead>
                  <TableHead className="text-right">Current Price</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unrealized P&L</TableHead>
                  <TableHead className="text-right">P&L %</TableHead>
                  <TableHead className="text-right">Stop Loss</TableHead>
                  <TableHead className="text-right">Take Profit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {positionsWithPnL.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">{position.pair}</TableCell>
                    <TableCell>
                      <Badge variant={position.direction === "long" ? "default" : "secondary"}>
                        {position.direction.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(position.entry_price, "USD")}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(position.currentPrice, "USD")}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {position.quantity}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-medium ${position.unrealizedPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {position.unrealizedPnL >= 0 ? "+" : ""}{formatCurrency(position.unrealizedPnL, "USD")}
                    </TableCell>
                    <TableCell className={`text-right font-mono ${position.unrealizedPnLPercent >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {position.unrealizedPnLPercent >= 0 ? "+" : ""}{position.unrealizedPnLPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right font-mono text-red-500">
                      {position.stop_loss ? formatCurrency(position.stop_loss, "USD") : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-green-500">
                      {position.take_profit ? formatCurrency(position.take_profit, "USD") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Note about live prices */}
      <p className="text-xs text-muted-foreground text-center">
        Note: Current prices are simulated. Integrate with a market data API for live prices.
      </p>
    </div>
  );
}
