/**
 * AllPositionsTable - Unified view for Binance + Paper positions
 * Shows source badge, allows enrichment via drawer
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wifi, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Pencil,
  X,
  Trash2,
  BookOpen,
} from "lucide-react";
import type { TradeEntry } from "@/hooks/use-trade-entries";
import type { BinancePosition } from "@/features/binance/types";

interface UnifiedPosition {
  id: string;
  source: 'binance' | 'paper';
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice?: number;
  quantity: number;
  unrealizedPnL: number;
  unrealizedPnLPercent?: number;
  leverage?: number;
  // Original data for actions
  originalData: TradeEntry | BinancePosition;
}

interface AllPositionsTableProps {
  paperPositions: TradeEntry[];
  binancePositions: BinancePosition[];
  isLoading?: boolean;
  isBinanceConnected: boolean;
  onEnrich: (position: UnifiedPosition) => void;
  onEdit?: (position: TradeEntry) => void;
  onClose?: (position: TradeEntry) => void;
  onDelete?: (position: TradeEntry) => void;
  formatCurrency: (value: number) => string;
}

function mapToUnifiedPositions(
  paperPositions: TradeEntry[],
  binancePositions: BinancePosition[]
): UnifiedPosition[] {
  const unified: UnifiedPosition[] = [];

  // Map paper positions
  paperPositions.forEach((pos) => {
    unified.push({
      id: pos.id,
      source: 'paper',
      symbol: pos.pair,
      direction: pos.direction as 'LONG' | 'SHORT',
      entryPrice: pos.entry_price,
      currentPrice: pos.entry_price, // No live price for paper
      quantity: pos.quantity,
      unrealizedPnL: pos.pnl || 0,
      originalData: pos,
    });
  });

  // Map Binance positions (only with non-zero amounts)
  binancePositions
    .filter((p) => p.positionAmt !== 0)
    .forEach((pos) => {
      unified.push({
        id: `binance-${pos.symbol}`,
        source: 'binance',
        symbol: pos.symbol,
        direction: pos.positionAmt > 0 ? 'LONG' : 'SHORT',
        entryPrice: pos.entryPrice,
        currentPrice: pos.markPrice,
        quantity: Math.abs(pos.positionAmt),
        unrealizedPnL: pos.unrealizedProfit,
        unrealizedPnLPercent: pos.entryPrice > 0 
          ? (pos.unrealizedProfit / (pos.entryPrice * Math.abs(pos.positionAmt))) * 100 
          : 0,
        leverage: pos.leverage,
        originalData: pos,
      });
    });

  return unified;
}

export function AllPositionsTable({
  paperPositions,
  binancePositions,
  isLoading,
  isBinanceConnected,
  onEnrich,
  onEdit,
  onClose,
  onDelete,
  formatCurrency,
}: AllPositionsTableProps) {
  const unifiedPositions = mapToUnifiedPositions(paperPositions, binancePositions);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (unifiedPositions.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No open positions"
        description={
          isBinanceConnected
            ? "You have no open positions in Binance or Paper trading."
            : "Start a new trade using the wizard or connect Binance for live positions."
        }
      />
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Source</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead className="hidden sm:table-cell">Direction</TableHead>
            <TableHead className="text-right hidden md:table-cell">Entry</TableHead>
            <TableHead className="text-right hidden md:table-cell">Current</TableHead>
            <TableHead className="text-right hidden lg:table-cell">Size</TableHead>
            <TableHead className="text-right">P&L</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {unifiedPositions.map((position) => {
            const isPaper = position.source === 'paper';
            const pnlColor = position.unrealizedPnL >= 0 ? 'text-profit' : 'text-loss';

            return (
              <TableRow key={position.id}>
                <TableCell>
                  <Badge 
                    variant={isPaper ? "secondary" : "default"}
                    className="gap-1"
                  >
                    {isPaper ? (
                      <>
                        <FileText className="h-3 w-3" />
                        Paper
                      </>
                    ) : (
                      <>
                        <Wifi className="h-3 w-3" />
                        Binance
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {position.symbol}
                  {position.leverage && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {position.leverage}x
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge 
                    variant="outline"
                    className={position.direction === 'LONG' ? 'text-profit border-profit/30' : 'text-loss border-loss/30'}
                  >
                    {position.direction === 'LONG' ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {position.direction}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono hidden md:table-cell">
                  {position.entryPrice.toFixed(2)}
                </TableCell>
                <TableCell className="text-right font-mono hidden md:table-cell">
                  {position.currentPrice?.toFixed(2) || '-'}
                </TableCell>
                <TableCell className="text-right font-mono hidden lg:table-cell">
                  {position.quantity.toFixed(4)}
                </TableCell>
                <TableCell className={`text-right font-mono ${pnlColor}`}>
                  {formatCurrency(position.unrealizedPnL)}
                  {position.unrealizedPnLPercent !== undefined && (
                    <span className="text-xs ml-1">
                      ({position.unrealizedPnLPercent.toFixed(2)}%)
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEnrich(position)}
                      title="Enrich with journal data"
                    >
                      <BookOpen className="h-4 w-4" />
                    </Button>
                    {isPaper && (
                      <>
                        {onEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEdit(position.originalData as TradeEntry)}
                            title="Edit position"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {onClose && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onClose(position.originalData as TradeEntry)}
                            title="Close position"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-loss hover:text-loss"
                            onClick={() => onDelete(position.originalData as TradeEntry)}
                            title="Delete position"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export type { UnifiedPosition };
