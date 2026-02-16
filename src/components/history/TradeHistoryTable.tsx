/**
 * Trade History Table View
 * Professional sortable table for detailed trade data
 */
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { TradeEntry } from "@/hooks/use-trade-entries";

type SortKey = 'trade_date' | 'pair' | 'direction' | 'pnl' | 'fees' | 'entry_price' | 'exit_price' | 'quantity' | 'hold_time';
type SortDir = 'asc' | 'desc';

interface TradeHistoryTableProps {
  trades: TradeEntry[];
  formatCurrency: (value: number) => string;
}

export function TradeHistoryTable({ trades, formatCurrency }: TradeHistoryTableProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('trade_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedTrades = useMemo(() => {
    return [...trades].sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      switch (sortKey) {
        case 'trade_date':
          valA = new Date(a.trade_date).getTime();
          valB = new Date(b.trade_date).getTime();
          break;
        case 'pair':
          valA = a.pair;
          valB = b.pair;
          break;
        case 'direction':
          valA = a.direction;
          valB = b.direction;
          break;
        case 'pnl':
          valA = a.realized_pnl ?? a.pnl ?? 0;
          valB = b.realized_pnl ?? b.pnl ?? 0;
          break;
        case 'fees':
          valA = (a.commission ?? 0) + (a.fees ?? 0);
          valB = (b.commission ?? 0) + (b.fees ?? 0);
          break;
        case 'entry_price':
          valA = a.entry_price;
          valB = b.entry_price;
          break;
        case 'exit_price':
          valA = a.exit_price ?? 0;
          valB = b.exit_price ?? 0;
          break;
        case 'quantity':
          valA = a.quantity;
          valB = b.quantity;
          break;
        case 'hold_time':
          valA = (a as any).hold_time_minutes ?? 0;
          valB = (b as any).hold_time_minutes ?? 0;
          break;
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [trades, sortKey, sortDir]);

  const SortableHeader = ({ label, sortKeyName, tooltip }: { label: string; sortKeyName: SortKey; tooltip?: string }) => (
    <TableHead>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 -ml-3 font-medium text-muted-foreground hover:text-foreground"
        onClick={() => handleSort(sortKeyName)}
      >
        {label}
        {tooltip && <InfoTooltip content={tooltip} />}
        {sortKey === sortKeyName ? (
          sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
        ) : (
          <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
        )}
      </Button>
    </TableHead>
  );

  const formatDuration = (minutes: number | null | undefined): string => {
    if (!minutes) return '—';
    if (minutes < 60) return `${minutes}m`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
    return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
  };

  const formatPrice = (price: number | null | undefined): string => {
    if (price === null || price === undefined) return '—';
    if (price < 0.01) return price.toFixed(8);
    if (price < 1) return price.toFixed(4);
    return price.toFixed(2);
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableHeader label="Date" sortKeyName="trade_date" />
            <SortableHeader label="Pair" sortKeyName="pair" />
            <SortableHeader label="Direction" sortKeyName="direction" />
            <SortableHeader label="Entry" sortKeyName="entry_price" tooltip="Entry price" />
            <SortableHeader label="Exit" sortKeyName="exit_price" tooltip="Exit price" />
            <SortableHeader label="Qty" sortKeyName="quantity" />
            <SortableHeader label="P&L" sortKeyName="pnl" tooltip="Realized P&L (gross, before fees)" />
            <SortableHeader label="Fees" sortKeyName="fees" tooltip="Commission + funding fees" />
            <SortableHeader label="Duration" sortKeyName="hold_time" tooltip="Trade hold time" />
            <TableHead className="text-right">Source</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTrades.map((trade) => {
            const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
            const totalFees = (trade.commission ?? 0) + ((trade as any).funding_fees ?? 0);
            const holdTime = (trade as any).hold_time_minutes;

            return (
              <TableRow
                key={trade.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/trading/${trade.id}`)}
              >
                <TableCell className="font-mono-numbers text-sm whitespace-nowrap">
                  {format(new Date(trade.trade_date), 'MMM dd, yyyy HH:mm')}
                </TableCell>
                <TableCell className="font-medium">{trade.pair}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      trade.direction.toUpperCase() === 'LONG' ? 'text-profit border-profit/30' : 'text-loss border-loss/30'
                    )}
                  >
                    {trade.direction.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono-numbers text-sm">{formatPrice(trade.entry_price)}</TableCell>
                <TableCell className="font-mono-numbers text-sm">{formatPrice(trade.exit_price)}</TableCell>
                <TableCell className="font-mono-numbers text-sm">{trade.quantity}</TableCell>
                <TableCell className={cn("font-mono-numbers text-sm font-medium", pnl > 0 ? "text-profit" : pnl < 0 ? "text-loss" : "text-muted-foreground")}>
                  {pnl > 0 ? '+' : ''}{formatCurrency(pnl)}
                </TableCell>
                <TableCell className="font-mono-numbers text-sm text-muted-foreground">
                  {totalFees > 0 ? `-${formatCurrency(totalFees)}` : '—'}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {formatDuration(holdTime)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="secondary" className="text-xs">
                    {trade.source === 'binance' ? 'Binance' : 'Manual'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
