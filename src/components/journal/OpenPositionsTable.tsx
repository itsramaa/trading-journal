/**
 * Open Positions Table - Paper trading open positions
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { AlertCircle, Edit, XCircle, MoreVertical, Trash2 } from "lucide-react";
import type { TradeEntry } from "@/hooks/use-trade-entries";

interface PositionWithPnL extends TradeEntry {
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

interface OpenPositionsTableProps {
  positions: PositionWithPnL[];
  onEdit: (position: TradeEntry) => void;
  onClose: (position: TradeEntry) => void;
  onDelete: (position: TradeEntry) => void;
  formatCurrency: (value: number, currency: string) => string;
}

export function OpenPositionsTable({
  positions,
  onEdit,
  onClose,
  onDelete,
  formatCurrency,
}: OpenPositionsTableProps) {
  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />
        <h3 className="font-medium">No Open Positions</h3>
        <p className="text-sm text-muted-foreground">
          Create a new trade with status "Open" to track active positions.
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pair</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead className="text-right">Entry</TableHead>
            <TableHead className="text-right">Current</TableHead>
            <TableHead className="text-right">Size</TableHead>
            <TableHead className="text-right">Unrealized P&L</TableHead>
            <TableHead className="text-right">SL / TP</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {positions.map((position) => (
            <TableRow key={position.id}>
              <TableCell className="font-medium">{position.pair}</TableCell>
              <TableCell>
                <Badge variant={position.direction === "LONG" ? "default" : "secondary"}>
                  {position.direction}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(position.entry_price, "USD")}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(position.currentPrice, "USD")}
              </TableCell>
              <TableCell className="text-right font-mono">{position.quantity}</TableCell>
              <TableCell className={`text-right font-mono font-medium ${position.unrealizedPnL >= 0 ? "text-profit" : "text-loss"}`}>
                {position.unrealizedPnL >= 0 ? "+" : ""}{formatCurrency(position.unrealizedPnL, "USD")}
                <span className="text-xs ml-1">
                  ({position.unrealizedPnLPercent >= 0 ? "+" : ""}{position.unrealizedPnLPercent.toFixed(2)}%)
                </span>
              </TableCell>
              <TableCell className="text-right text-xs">
                <span className="text-loss">{position.stop_loss ? formatCurrency(position.stop_loss, "USD") : "-"}</span>
                {" / "}
                <span className="text-profit">{position.take_profit ? formatCurrency(position.take_profit, "USD") : "-"}</span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex gap-1 justify-end">
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => onEdit(position)}
                    aria-label={`Edit ${position.pair} position`}
                  >
                    <Edit className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onClose(position)}
                    aria-label={`Close ${position.pair} position`}
                  >
                    <XCircle className="h-4 w-4 mr-1" aria-hidden="true" />
                    Close
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options">
                        <MoreVertical className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDelete(position)}>
                        <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="text-xs text-muted-foreground text-center mt-4">
        Note: Current prices are simulated. Integrate with a market data API for live prices.
      </p>
    </>
  );
}
