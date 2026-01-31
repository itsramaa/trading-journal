/**
 * Algo Orders Tab - Display conditional orders (TP/SL, VP, TWAP)
 * For Trade History page
 */
import { useState } from "react";
import { format } from "date-fns";
import { AlertCircle, Clock, Filter, Target, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  useBinanceAlgoOrders, 
  useBinanceAlgoOpenOrders, 
  getAlgoTypeLabel, 
  getAlgoStatusVariant 
} from "@/features/binance";
import { formatCurrency } from "@/lib/formatters";

export function AlgoOrdersTab() {
  const [symbolFilter, setSymbolFilter] = useState("");
  const { data: openOrders, isLoading: openLoading, error: openError } = useBinanceAlgoOpenOrders();
  const { data: historicalOrders, isLoading: historyLoading, error: historyError } = useBinanceAlgoOrders({
    limit: 50,
  });

  const isLoading = openLoading || historyLoading;
  const hasError = openError || historyError;
  
  // Check if error is related to VIP access
  const isVipError = hasError && (
    (openError as Error)?.message?.includes('VIP') || 
    (historyError as Error)?.message?.includes('VIP') ||
    (openError as Error)?.message?.includes('not available') ||
    (historyError as Error)?.message?.includes('not available')
  );

  // Filter orders
  const filteredOpenOrders = openOrders?.filter(o => 
    !symbolFilter || o.symbol.toLowerCase().includes(symbolFilter.toLowerCase())
  ) || [];
  
  const filteredHistoricalOrders = historicalOrders?.filter(o => 
    !symbolFilter || o.symbol.toLowerCase().includes(symbolFilter.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 w-full animate-pulse bg-muted rounded-md" />
        ))}
      </div>
    );
  }

  // Show VIP access required message
  if (isVipError) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Algo Orders Not Available</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Algo Orders (VP, TWAP) require VIP access on Binance. Standard TP/SL orders can be viewed in the regular Trade History.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasOpenOrders = filteredOpenOrders.length > 0;
  const hasHistoricalOrders = filteredHistoricalOrders.length > 0;

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter by symbol..."
          value={symbolFilter}
          onChange={(e) => setSymbolFilter(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Open Algo Orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Active Algo Orders
            {hasOpenOrders && (
              <Badge variant="secondary">{filteredOpenOrders.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasOpenOrders ? (
            <div className="text-center py-6 text-muted-foreground">
              <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active algo orders</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Trigger Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOpenOrders.map((order) => (
                    <TableRow key={order.algoId}>
                      <TableCell className="font-medium">{order.symbol}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getAlgoTypeLabel(order.algoType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`flex items-center gap-1 ${order.side === 'BUY' ? 'text-profit' : 'text-loss'}`}>
                          {order.side === 'BUY' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {order.side}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono">{formatCurrency(order.triggerPrice, 'USD')}</TableCell>
                      <TableCell className="font-mono">{order.totalQty.toFixed(4)}</TableCell>
                      <TableCell>
                        <Badge variant={getAlgoStatusVariant(order.status)}>{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Algo Orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
            Historical Algo Orders
            {hasHistoricalOrders && (
              <Badge variant="secondary">{filteredHistoricalOrders.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!hasHistoricalOrders ? (
            <div className="text-center py-6 text-muted-foreground">
              <p className="text-sm">No historical algo orders found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Avg Price</TableHead>
                    <TableHead>Filled</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistoricalOrders.map((order) => (
                    <TableRow key={order.algoId}>
                      <TableCell className="text-muted-foreground text-sm">
                        {format(new Date(order.createTime), "MMM dd, HH:mm")}
                      </TableCell>
                      <TableCell className="font-medium">{order.symbol}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getAlgoTypeLabel(order.algoType)}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className={order.side === 'BUY' ? 'text-profit' : 'text-loss'}>
                          {order.side}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{formatCurrency(order.triggerPrice, 'USD')}</TableCell>
                      <TableCell className="font-mono text-sm">{formatCurrency(order.avgPrice, 'USD')}</TableCell>
                      <TableCell className="font-mono text-sm">
                        {order.executedQty.toFixed(4)} / {order.totalQty.toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getAlgoStatusVariant(order.status)}>{order.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
