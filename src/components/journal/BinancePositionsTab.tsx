/**
 * BinancePositionsTab - Displays live Binance Futures positions
 */
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BinancePosition {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unrealizedProfit: number;
  liquidationPrice: number;
  leverage: number;
}

interface BinancePositionsTabProps {
  positions: BinancePosition[];
  isLoading: boolean;
}

export function BinancePositionsTab({ positions, isLoading }: BinancePositionsTabProps) {
  const activePositions = positions.filter(p => p.positionAmt !== 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (activePositions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />
        <h3 className="font-medium">No Active Positions on Binance</h3>
        <p className="text-sm text-muted-foreground">
          Open a position on Binance Futures to see it here.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Symbol</TableHead>
          <TableHead>Side</TableHead>
          <TableHead className="text-right">Size</TableHead>
          <TableHead className="text-right">Entry</TableHead>
          <TableHead className="text-right">Mark</TableHead>
          <TableHead className="text-right">PNL</TableHead>
          <TableHead className="text-right">Liq. Price</TableHead>
          <TableHead className="text-right">Leverage</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activePositions.map((position) => (
          <TableRow key={position.symbol}>
            <TableCell className="font-medium">{position.symbol}</TableCell>
            <TableCell>
              <Badge variant={position.positionAmt > 0 ? "default" : "secondary"}>
                {position.positionAmt > 0 ? 'LONG' : 'SHORT'}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono">
              {Math.abs(position.positionAmt).toFixed(4)}
            </TableCell>
            <TableCell className="text-right font-mono">
              ${position.entryPrice.toFixed(2)}
            </TableCell>
            <TableCell className="text-right font-mono">
              ${position.markPrice.toFixed(2)}
            </TableCell>
            <TableCell className={cn(
              "text-right font-mono font-medium",
              position.unrealizedProfit >= 0 ? "text-profit" : "text-loss"
            )}>
              {position.unrealizedProfit >= 0 ? '+' : ''}${position.unrealizedProfit.toFixed(2)}
            </TableCell>
            <TableCell className="text-right font-mono text-muted-foreground">
              ${position.liquidationPrice.toFixed(2)}
            </TableCell>
            <TableCell className="text-right">
              <Badge variant="outline">{position.leverage}x</Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
