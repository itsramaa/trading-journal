/**
 * PositionsTable - Exchange-agnostic positions display component
 * Uses generic ExchangePosition type for multi-exchange readiness
 */

import { Badge } from "@/components/ui/badge";
import { CryptoIcon } from "@/components/ui/crypto-icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { ExchangePosition, ExchangeType } from "@/types/exchange";

export interface PositionsTableProps {
  /** Array of positions (already filtered to non-zero by mapper) */
  positions: ExchangePosition[];
  /** Loading state */
  isLoading: boolean;
  /** Optional: Source exchange for display purposes */
  exchange?: ExchangeType;
  /** Optional: Custom empty state message */
  emptyMessage?: string;
}

/**
 * Generic positions table component
 * Consumes ExchangePosition[] which is exchange-agnostic
 * 
 * @example
 * const { positions, isLoading } = usePositions();
 * return <PositionsTable positions={positions} isLoading={isLoading} />;
 */
export function PositionsTable({ 
  positions, 
  isLoading,
  exchange = 'binance',
  emptyMessage = "No active positions",
}: PositionsTableProps) {
  const { format, formatPnl } = useCurrencyConversion();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />
        <h3 className="font-medium">{emptyMessage}</h3>
        <p className="text-sm text-muted-foreground">
          Open a position to see it here.
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
        {positions.map((position) => (
          <TableRow key={`${position.source}-${position.symbol}`}>
            <TableCell className="font-medium">
              <div className="flex items-center gap-2">
                <CryptoIcon symbol={position.symbol} size={18} />
                {position.symbol}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={position.side === 'LONG' ? "default" : "secondary"}>
                {position.side}
              </Badge>
            </TableCell>
            <TableCell className="text-right font-mono">
              {position.size.toFixed(4)}
            </TableCell>
            <TableCell className="text-right font-mono">
              {format(position.entryPrice)}
            </TableCell>
            <TableCell className="text-right font-mono">
              {format(position.markPrice)}
            </TableCell>
            <TableCell className={cn(
              "text-right font-mono font-medium",
              position.unrealizedPnl >= 0 ? "text-profit" : "text-loss"
            )}>
              {formatPnl(position.unrealizedPnl)}
            </TableCell>
            <TableCell className="text-right font-mono text-muted-foreground">
              {format(position.liquidationPrice)}
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

// Re-export with old name for backward compatibility
export { PositionsTable as BinancePositionsTab };
