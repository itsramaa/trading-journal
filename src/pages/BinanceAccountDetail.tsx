/**
 * Binance Account Detail - Virtual account detail page for connected Binance exchange
 * Shows balance, positions, and P&L from Binance API data
 */
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  ArrowLeft,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Target,
  BarChart3,
  Percent,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import {
  useBinanceConnectionStatus,
  useBinanceBalance,
  useBinancePositions,
  useRefreshBinanceData,
} from "@/features/binance";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

export default function BinanceAccountDetail() {
  const navigate = useNavigate();
  const { data: connectionStatus, isLoading: statusLoading } = useBinanceConnectionStatus();
  const { data: balance, isLoading: balanceLoading } = useBinanceBalance();
  const { data: positions, isLoading: positionsLoading } = useBinancePositions();
  const refreshBinance = useRefreshBinanceData();
  const { format: formatCurrency, formatPnl } = useCurrencyConversion();

  const isConnected = connectionStatus?.isConnected ?? false;
  const activePositions = positions?.filter(p => p.positionAmt !== 0) || [];
  const walletBalance = Number(balance?.totalWalletBalance) || 0;
  const unrealizedPnl = Number(balance?.totalUnrealizedProfit) || 0;
  const availableBalance = Number(balance?.availableBalance) || 0;
  const marginUsed = walletBalance - availableBalance;
  const marginUsedPercent = walletBalance > 0 ? (marginUsed / walletBalance) * 100 : 0;

  if (statusLoading || balanceLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Binance not connected</p>
        <Button onClick={() => navigate("/accounts")} className="mt-4">
          Back to Accounts
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Binance Futures | Trading Account</title>
        <meta name="description" content="Binance Futures exchange account details" />
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate("/accounts")} className="self-start">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Activity className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">Binance Futures</h1>
              <Badge variant="outline" className="text-profit border-profit/30">Live</Badge>
            </div>
            <p className="text-muted-foreground">Connected Exchange • USDT</p>
          </div>
          <div className="flex items-center gap-3 sm:ml-auto">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Wallet Balance</p>
              <p className="text-2xl font-bold">{formatCurrency(walletBalance)}</p>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refreshBinance.mutate()}
              disabled={refreshBinance.isPending}
            >
              <RefreshCw className={`h-4 w-4 ${refreshBinance.isPending ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Unrealized P&L</p>
                  <p className={`text-xl font-bold ${unrealizedPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                    {formatPnl(unrealizedPnl)}
                  </p>
                </div>
                {unrealizedPnl >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-profit/50" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-loss/50" />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-xl font-bold">{formatCurrency(availableBalance)}</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Margin Used</p>
                  <p className="text-xl font-bold">{marginUsedPercent.toFixed(1)}%</p>
                </div>
                <Percent className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(marginUsed)} of {formatCurrency(walletBalance)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Open Positions</p>
                  <p className="text-xl font-bold">{activePositions.length}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Positions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Active Positions</CardTitle>
            <CardDescription>Currently open positions on Binance Futures</CardDescription>
          </CardHeader>
          <CardContent>
            {positionsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : activePositions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No open positions</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Side</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      <TableHead className="text-right">Entry Price</TableHead>
                      <TableHead className="text-right">Mark Price</TableHead>
                      <TableHead className="text-right">Unrealized P&L</TableHead>
                      <TableHead className="text-right">Leverage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activePositions.map((pos) => {
                      const pnl = Number(pos.unrealizedProfit) || 0;
                      const isLong = pos.positionAmt > 0;
                      return (
                        <TableRow key={`${pos.symbol}-${pos.positionAmt > 0 ? 'long' : 'short'}`}>
                          <TableCell className="font-medium">{pos.symbol}</TableCell>
                          <TableCell>
                            <Badge variant={isLong ? "default" : "destructive"} className="text-xs">
                              {isLong ? 'LONG' : 'SHORT'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {Math.abs(pos.positionAmt).toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {Number(pos.entryPrice).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {Number(pos.markPrice).toFixed(2)}
                          </TableCell>
                          <TableCell className={`text-right font-mono ${pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
                            {formatPnl(pnl)}
                          </TableCell>
                          <TableCell className="text-right">
                            {pos.leverage}x
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
