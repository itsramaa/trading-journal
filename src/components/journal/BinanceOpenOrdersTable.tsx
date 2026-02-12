/**
 * BinanceOpenOrdersTable - Displays pending Binance Futures open orders
 * Shows LIMIT, STOP, TAKE_PROFIT orders awaiting fill with cancel functionality
 */
import { useState } from "react";
import { CryptoIcon } from "@/components/ui/crypto-icon";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wifi, X, Clock, AlertCircle } from "lucide-react";
import type { BinanceOrder } from "@/features/binance/types";
import { useCancelBinanceOrder } from "@/features/binance";
import { toast } from "@/hooks/use-toast";

interface BinanceOpenOrdersTableProps {
  orders: BinanceOrder[];
  isLoading: boolean;
  formatCurrency: (value: number) => string;
}

const ORDER_TYPE_LABELS: Record<string, string> = {
  LIMIT: "Limit",
  MARKET: "Market",
  STOP: "Stop Loss",
  STOP_MARKET: "Stop Market",
  TAKE_PROFIT: "Take Profit",
  TAKE_PROFIT_MARKET: "TP Market",
};

const ORDER_TYPE_VARIANTS: Record<string, "default" | "secondary" | "outline"> = {
  LIMIT: "secondary",
  STOP: "outline",
  STOP_MARKET: "outline",
  TAKE_PROFIT: "default",
  TAKE_PROFIT_MARKET: "default",
};

export function BinanceOpenOrdersTable({
  orders,
  isLoading,
  formatCurrency,
}: BinanceOpenOrdersTableProps) {
  const [cancelingOrder, setCancelingOrder] = useState<BinanceOrder | null>(null);
  const cancelOrder = useCancelBinanceOrder();

  const handleCancelOrder = async () => {
    if (!cancelingOrder) return;

    try {
      await cancelOrder.mutateAsync({
        symbol: cancelingOrder.symbol,
        orderId: cancelingOrder.orderId,
      });
      toast({
        title: "Order Cancelled",
        description: `${cancelingOrder.symbol} ${cancelingOrder.type} order has been cancelled.`,
      });
      setCancelingOrder(null);
    } catch (error) {
      toast({
        title: "Cancel Failed",
        description: error instanceof Error ? error.message : "Failed to cancel order",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wifi className="h-4 w-4" />
          <span>Binance Open Orders</span>
        </div>
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wifi className="h-4 w-4 text-profit" />
        <span>Binance Open Orders</span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
          <Clock className="h-8 w-8 mb-2 opacity-50" />
          <p className="text-sm">No pending orders on Binance</p>
          <p className="text-xs mt-1">Limit and stop orders will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Wifi className="h-4 w-4 text-profit" />
        <span>Binance Open Orders</span>
        <Badge variant="secondary" className="text-xs">
          {orders.length}
        </Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Side</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">Stop</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Filled</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const direction = order.positionSide === "BOTH" 
                ? (order.side === "BUY" ? "LONG" : "SHORT")
                : order.positionSide;
              const fillPercent = order.origQty > 0 
                ? (order.executedQty / order.origQty) * 100 
                : 0;

              return (
                <TableRow key={order.orderId}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <CryptoIcon symbol={order.symbol} size={18} />
                      <span>{order.symbol.replace("USDT", "")}</span>
                      <Badge 
                        variant={direction === "LONG" ? "long" : "short"}
                        className="text-[10px] px-1.5"
                      >
                        {direction}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ORDER_TYPE_VARIANTS[order.type] || "outline"}>
                      {ORDER_TYPE_LABELS[order.type] || order.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={order.side === "BUY" ? "text-profit" : "text-loss"}>
                      {order.side}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {order.price > 0 ? formatCurrency(order.price) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {order.stopPrice > 0 ? (
                      <span className="flex items-center justify-end gap-1 text-warning">
                        <AlertCircle className="h-3 w-3" />
                        {formatCurrency(order.stopPrice)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {order.origQty}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-sm">{order.executedQty}</span>
                      {fillPercent > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {fillPercent.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(order.time), "MMM d, HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => setCancelingOrder(order)}
                      aria-label={`Cancel ${order.symbol} order`}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!cancelingOrder}
        onOpenChange={(open) => !open && setCancelingOrder(null)}
        title="Cancel Order"
        description={
          cancelingOrder
            ? `Cancel ${cancelingOrder.symbol} ${ORDER_TYPE_LABELS[cancelingOrder.type] || cancelingOrder.type} order at ${formatCurrency(cancelingOrder.price || cancelingOrder.stopPrice)}?`
            : ""
        }
        confirmLabel="Cancel Order"
        variant="destructive"
        onConfirm={handleCancelOrder}
      />
    </div>
  );
}
