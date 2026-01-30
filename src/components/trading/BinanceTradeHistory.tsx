/**
 * BinanceTradeHistory - Display trade history from Binance Futures API
 * Features: Symbol filter, pagination, import to journal
 */
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  History, 
  RefreshCw, 
  Download,
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Check,
  Plus
} from "lucide-react";
import { format } from "date-fns";
import { useBinanceTrades, useBinanceConnectionStatus, BinanceTrade } from "@/features/binance";
import { useSyncTradeToJournal, useCheckTradeExists } from "@/hooks/use-binance-sync";
import { formatCurrency } from "@/lib/formatters";

const POPULAR_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "MATICUSDT",
];

interface BinanceTradeHistoryProps {
  showHeader?: boolean;
  limit?: number;
}

export function BinanceTradeHistory({ showHeader = true, limit = 50 }: BinanceTradeHistoryProps) {
  const [symbol, setSymbol] = useState<string>("BTCUSDT");
  
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { 
    data: trades, 
    isLoading, 
    error,
    refetch,
    isFetching
  } = useBinanceTrades(symbol, limit);

  const isConnected = connectionStatus?.isConnected;

  // Not connected state
  if (!isConnected) {
    return (
      <Card className="border-dashed">
        {showHeader && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-muted-foreground" />
              Binance Trade History
            </CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Connect Binance API to view trade history
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showHeader && (
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-primary" />
              Binance Trade History
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={symbol} onValueChange={setSymbol}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POPULAR_SYMBOLS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
      )}
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <p className="text-sm text-destructive mb-3">Failed to fetch trades</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : trades && trades.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">PnL</TableHead>
                  <TableHead className="text-right">Fee</TableHead>
                  <TableHead className="text-center">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => (
                  <TradeRow key={trade.id} trade={trade} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No trades found for {symbol}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TradeRow({ trade }: { trade: BinanceTrade }) {
  const [isSynced, setIsSynced] = useState(false);
  const syncTrade = useSyncTradeToJournal();
  const checkExists = useCheckTradeExists();

  const handleSync = async () => {
    try {
      await syncTrade.mutateAsync({ binanceTrade: trade });
      setIsSynced(true);
    } catch {
      // Error handled by mutation
    }
  };

  const pnl = trade.realizedPnl;
  const isBuy = trade.side === "BUY";

  return (
    <TableRow>
      <TableCell className="text-sm text-muted-foreground">
        {format(new Date(trade.time), "MM/dd HH:mm")}
      </TableCell>
      <TableCell>
        <Badge 
          variant={isBuy ? "default" : "destructive"}
          className="text-xs"
        >
          {trade.side}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono-numbers">
        ${trade.price.toFixed(2)}
      </TableCell>
      <TableCell className="text-right font-mono-numbers">
        {trade.qty.toFixed(4)}
      </TableCell>
      <TableCell className="text-right">
        <span className={`font-mono-numbers ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
          {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, 'USD')}
        </span>
      </TableCell>
      <TableCell className="text-right font-mono-numbers text-muted-foreground">
        {trade.commission.toFixed(4)}
      </TableCell>
      <TableCell className="text-center">
        {isSynced ? (
          <Badge variant="outline" className="text-xs text-profit">
            <Check className="h-3 w-3 mr-1" />
            Synced
          </Badge>
        ) : (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleSync}
            disabled={syncTrade.isPending}
          >
            {syncTrade.isPending ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <Download className="h-3 w-3 mr-1" />
                Import
              </>
            )}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
