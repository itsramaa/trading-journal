/**
 * Active Positions Table - Displays open trades with live P&L
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Clock, ExternalLink, AlertCircle } from "lucide-react";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { formatDistanceToNow } from "date-fns";

export function ActivePositionsTable() {
  const { data: trades } = useTradeEntries();

  const openPositions = useMemo(() => {
    return trades?.filter(t => t.status === 'open') || [];
  }, [trades]);

  // Calculate simulated current P&L for each position
  const positionsWithPnL = useMemo(() => {
    return openPositions.map((position) => {
      // For demo: simulate small price movement
      const simulatedChange = (Math.random() - 0.5) * 0.02;
      const currentPrice = position.entry_price * (1 + simulatedChange);
      
      const priceDiff = position.direction === "LONG"
        ? currentPrice - position.entry_price
        : position.entry_price - currentPrice;
      
      const unrealizedPnL = priceDiff * position.quantity;
      const unrealizedPnLPercent = (priceDiff / position.entry_price) * 100;

      // Calculate R:R if stop loss exists
      let currentRR = 0;
      if (position.stop_loss) {
        const risk = Math.abs(position.entry_price - position.stop_loss);
        if (risk > 0) {
          currentRR = Math.abs(priceDiff) / risk;
          if (priceDiff < 0) currentRR = -currentRR;
        }
      }

      // Calculate time open - use trade_date as fallback
      const entryTime = (position as any).entry_datetime || position.trade_date;
      const timeOpen = entryTime
        ? formatDistanceToNow(new Date(entryTime), { addSuffix: false })
        : 'N/A';

      return {
        ...position,
        currentPrice,
        unrealizedPnL,
        unrealizedPnLPercent,
        currentRR,
        timeOpen,
      };
    });
  }, [openPositions]);

  const totalUnrealizedPnL = useMemo(() => 
    positionsWithPnL.reduce((sum, p) => sum + p.unrealizedPnL, 0),
    [positionsWithPnL]
  );

  if (openPositions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Active Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p className="text-sm">No open positions</p>
            <Button variant="link" size="sm" asChild className="mt-2">
              <Link to="/trading/journal">Open a new trade</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
            Active Positions
            <Badge variant="secondary" className="ml-2">{openPositions.length}</Badge>
          </CardTitle>
          <div className={`font-bold ${totalUnrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toFixed(2)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pair</TableHead>
              <TableHead>Entry</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>P&L</TableHead>
              <TableHead>R:R</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Size</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positionsWithPnL.map((position) => (
              <TableRow key={position.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant={position.direction === "LONG" ? "default" : "secondary"} className="text-xs">
                      {position.direction}
                    </Badge>
                    <span className="font-medium">{position.pair}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  ${position.entry_price.toLocaleString()}
                </TableCell>
                <TableCell>
                  ${position.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <div className={`flex items-center gap-1 ${position.unrealizedPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {position.unrealizedPnL >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span className="font-medium">
                      {position.unrealizedPnL >= 0 ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                    </span>
                    <span className="text-xs">
                      ({position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(2)}%)
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={position.currentRR >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {position.currentRR.toFixed(2)}:1
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Clock className="h-3 w-3" />
                    {position.timeOpen}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {position.quantity}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" className="w-full" asChild>
            <Link to="/trading/journal" className="flex items-center gap-1">
              Manage Positions <ExternalLink className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
