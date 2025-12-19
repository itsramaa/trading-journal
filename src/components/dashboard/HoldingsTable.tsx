import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Asset } from "@/lib/demo-data";

interface HoldingsTableProps {
  holdings: Asset[];
}

const marketBadgeVariants: Record<string, string> = {
  CRYPTO: "bg-chart-1/10 text-chart-1 hover:bg-chart-1/20",
  US: "bg-chart-2/10 text-chart-2 hover:bg-chart-2/20",
  ID: "bg-chart-3/10 text-chart-3 hover:bg-chart-3/20",
};

export function HoldingsTable({ holdings }: HoldingsTableProps) {
  const formatCurrency = (value: number, market: string) => {
    if (market === 'ID') {
      return `Rp ${value.toLocaleString('id-ID')}`;
    }
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">Holdings</CardTitle>
        <Badge variant="secondary">{holdings.length} Assets</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-6">Asset</TableHead>
              <TableHead>Market</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">24h</TableHead>
              <TableHead className="text-right">Holdings</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead className="text-right pr-6">P/L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((asset) => (
              <TableRow key={asset.id} className="group cursor-pointer">
                <TableCell className="pl-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary font-semibold text-sm">
                      {asset.symbol.slice(0, 2)}
                    </div>
                    <div>
                      <p className="font-medium">{asset.symbol}</p>
                      <p className="text-sm text-muted-foreground">{asset.name}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn("font-medium", marketBadgeVariants[asset.market])}>
                    {asset.market}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(asset.currentPrice, asset.market)}
                </TableCell>
                <TableCell className="text-right">
                  <div className={cn(
                    "flex items-center justify-end gap-1",
                    asset.priceChange24h >= 0 ? "text-profit" : "text-loss"
                  )}>
                    {asset.priceChange24h >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" />
                    )}
                    <span className="font-medium">
                      {asset.priceChange24h >= 0 ? '+' : ''}{asset.priceChange24h.toFixed(2)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <p className="font-medium">{asset.quantity}</p>
                  <p className="text-sm text-muted-foreground">
                    @ {formatCurrency(asset.avgPrice, asset.market)}
                  </p>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(asset.value, asset.market)}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className={cn(
                    "flex flex-col items-end",
                    asset.profitLoss >= 0 ? "text-profit" : "text-loss"
                  )}>
                    <span className="font-medium">
                      {asset.profitLoss >= 0 ? '+' : ''}{formatCurrency(asset.profitLoss, asset.market)}
                    </span>
                    <span className="text-sm">
                      {asset.profitLossPercent >= 0 ? '+' : ''}{asset.profitLossPercent.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
