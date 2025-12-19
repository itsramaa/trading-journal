import { TrendingUp, TrendingDown, MoreHorizontal } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/formatters";
import type { Holding } from "@/types/portfolio";

interface HoldingsTableProps {
  holdings: Holding[];
}

const marketColors: Record<string, string> = {
  CRYPTO: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  US: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  ID: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
        <div>
          <h3 className="font-semibold">Holdings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{holdings.length} assets in portfolio</p>
        </div>
        <Button variant="ghost" size="sm" className="text-xs">
          View All
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border/50">
              <TableHead className="pl-5 font-medium text-xs uppercase tracking-wider">Asset</TableHead>
              <TableHead className="font-medium text-xs uppercase tracking-wider">Market</TableHead>
              <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Price</TableHead>
              <TableHead className="text-right font-medium text-xs uppercase tracking-wider">24h</TableHead>
              <TableHead className="text-right font-medium text-xs uppercase tracking-wider">7d</TableHead>
              <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Holdings</TableHead>
              <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Value</TableHead>
              <TableHead className="text-right font-medium text-xs uppercase tracking-wider pr-5">P/L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding, index) => (
              <TableRow 
                key={holding.id} 
                className={cn(
                  "group transition-colors hover:bg-muted/30",
                  index === holdings.length - 1 && "border-0"
                )}
              >
                <TableCell className="pl-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 text-xs font-bold text-primary">
                      {holding.asset.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{holding.asset.symbol}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[120px]">{holding.asset.name}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("font-medium text-[10px] border", marketColors[holding.asset.market])}>
                    {holding.asset.market}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-mono-numbers text-sm">
                  {formatCurrency(holding.asset.currentPrice, holding.asset.market)}
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "inline-flex items-center gap-0.5 font-mono-numbers text-sm",
                    holding.asset.priceChange24h >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {holding.asset.priceChange24h >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {formatPercent(holding.asset.priceChange24h)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={cn(
                    "font-mono-numbers text-sm",
                    holding.asset.priceChange7d >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {formatPercent(holding.asset.priceChange7d)}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <p className="font-mono-numbers text-sm">{formatQuantity(holding.quantity, holding.asset.market)}</p>
                  <p className="text-[10px] text-muted-foreground font-mono-numbers">
                    @ {formatCurrency(holding.avgPrice, holding.asset.market)}
                  </p>
                </TableCell>
                <TableCell className="text-right font-mono-numbers font-medium text-sm">
                  {formatCurrency(holding.value, holding.asset.market)}
                </TableCell>
                <TableCell className="text-right pr-5">
                  <div className={cn(
                    "flex flex-col items-end",
                    holding.profitLoss >= 0 ? "text-profit" : "text-loss"
                  )}>
                    <span className="font-mono-numbers text-sm font-medium">
                      {holding.profitLoss >= 0 ? '+' : ''}{formatCurrency(Math.abs(holding.profitLoss), holding.asset.market)}
                    </span>
                    <span className="text-[10px] font-mono-numbers">
                      {formatPercent(holding.profitLossPercent)}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
