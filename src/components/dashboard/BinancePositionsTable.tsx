/**
 * BinancePositionsTable - Real-time positions from Binance Futures
 * Replaces ActivePositionsTable with live data from Binance API
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Activity, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Settings,
  ExternalLink
} from "lucide-react";
import { Link } from "react-router-dom";
import { useBinancePositions, useBinanceConnectionStatus, BinancePosition } from "@/features/binance";
import { formatCurrency } from "@/lib/formatters";

export function BinancePositionsTable() {
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { 
    data: positions, 
    isLoading, 
    error,
    refetch,
    isFetching
  } = useBinancePositions();

  const isConnected = connectionStatus?.isConnected;

  // Filter active positions (positionAmt != 0)
  const activePositions = positions?.filter(p => p.positionAmt !== 0) || [];

  // Not connected state
  if (!isConnected) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-muted-foreground" />
            Active Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Connect Binance to view live positions
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/settings?tab=exchange">
                <Settings className="h-4 w-4 mr-2" />
                Configure API
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Active Positions
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Loading
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-destructive" />
            Active Positions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-destructive mb-3">Failed to fetch positions</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (activePositions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Active Positions
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No active positions</p>
            <p className="text-xs">Your Binance Futures positions will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Active Positions
            <Badge variant="secondary" className="ml-2">
              {activePositions.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">Live</Badge>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table aria-label="Active trading positions">
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Symbol</TableHead>
                <TableHead scope="col">Side</TableHead>
                <TableHead scope="col" className="text-right">Size</TableHead>
                <TableHead scope="col" className="text-right">Entry</TableHead>
                <TableHead scope="col" className="text-right">Mark</TableHead>
                <TableHead scope="col" className="text-right">PnL</TableHead>
                <TableHead scope="col" className="text-center">Lev</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody aria-live="polite" aria-atomic="false">
              {activePositions.map((position) => (
                <PositionRow key={position.symbol} position={position} />
              ))}
            </TableBody>
          </Table>
        </div>
        
        {/* Total Unrealized P&L */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Unrealized PnL</span>
            <TotalPnL positions={activePositions} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PositionRow({ position }: { position: BinancePosition }) {
  const isLong = position.positionAmt > 0;
  const pnl = position.unrealizedProfit;
  const pnlPercent = position.entryPrice > 0 
    ? ((position.markPrice - position.entryPrice) / position.entryPrice) * 100 * (isLong ? 1 : -1)
    : 0;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-medium">{position.symbol}</span>
          <a 
            href={`https://www.binance.com/en/futures/${position.symbol}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </TableCell>
      <TableCell>
        <Badge 
          variant={isLong ? "default" : "destructive"}
          className="text-xs"
        >
          {isLong ? 'LONG' : 'SHORT'}
        </Badge>
      </TableCell>
      <TableCell className="text-right font-mono-numbers">
        {Math.abs(position.positionAmt).toFixed(4)}
      </TableCell>
      <TableCell className="text-right font-mono-numbers">
        ${position.entryPrice.toFixed(2)}
      </TableCell>
      <TableCell className="text-right font-mono-numbers">
        ${position.markPrice.toFixed(2)}
      </TableCell>
      <TableCell className="text-right">
        <div className={`flex items-center justify-end gap-1 ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
          {pnl >= 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          <span className="font-mono-numbers font-medium">
            {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, 'USD')}
          </span>
          <span className="text-xs text-muted-foreground">
            ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
          </span>
        </div>
      </TableCell>
      <TableCell className="text-center">
        <Badge variant="outline" className="text-xs">
          {position.leverage}x
        </Badge>
      </TableCell>
    </TableRow>
  );
}

function TotalPnL({ positions }: { positions: BinancePosition[] }) {
  const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedProfit, 0);
  
  return (
    <span className={`text-lg font-bold font-mono-numbers ${totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
      {totalPnL >= 0 ? '+' : ''}{formatCurrency(totalPnL, 'USD')}
    </span>
  );
}
