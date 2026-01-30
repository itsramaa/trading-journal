/**
 * BinanceBalanceWidget - Real-time Binance Futures wallet balance
 * Shows: Wallet Balance, Available Balance, Unrealized P&L, Margin Balance
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  AlertCircle,
  Settings,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { useBinanceBalance, useBinanceConnectionStatus } from "@/features/binance";
import { formatCurrency } from "@/lib/formatters";
import { InfoTooltip } from "@/components/ui/info-tooltip";

export function BinanceBalanceWidget() {
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { 
    data: balance, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useBinanceBalance();

  const isConnected = connectionStatus?.isConnected;

  // Not connected state
  if (!isConnected) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-muted-foreground" />
            Binance Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertCircle className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-4">
              Connect your Binance Futures account to view real-time balance
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
              <Wallet className="h-5 w-5 text-primary" />
              Binance Account
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Loading
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-8 w-32" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
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
            <Wallet className="h-5 w-5 text-destructive" />
            Binance Account
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <XCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p className="text-sm text-destructive mb-3">
              Failed to fetch balance
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalBalance = balance?.totalWalletBalance || 0;
  const availableBalance = balance?.availableBalance || 0;
  const unrealizedPnL = balance?.totalUnrealizedProfit || 0;
  const marginBalance = balance?.totalMarginBalance || 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-primary" />
            Binance Account
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs text-profit">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
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
        <div className="space-y-4">
          {/* Main Balance */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              Wallet Balance
              <InfoTooltip content="Total value of your Binance Futures wallet including all realized profits and deposits, minus withdrawals." />
            </span>
            <span className="text-2xl font-bold font-mono-numbers">
              {formatCurrency(totalBalance, 'USD')}
            </span>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                Available
                <InfoTooltip content="Funds available for opening new positions. This excludes margin currently locked in open positions." />
              </p>
              <p className="text-lg font-semibold font-mono-numbers">
                {formatCurrency(availableBalance, 'USD')}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                Margin Balance
                <InfoTooltip content="Wallet balance plus unrealized P&L. This is the collateral value Binance uses for margin calculations and liquidation." />
              </p>
              <p className="text-lg font-semibold font-mono-numbers">
                {formatCurrency(marginBalance, 'USD')}
              </p>
            </div>
          </div>

          {/* Unrealized P&L */}
          <div className={`p-3 rounded-lg border ${
            unrealizedPnL >= 0 
              ? 'border-profit/30 bg-profit/5' 
              : 'border-loss/30 bg-loss/5'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {unrealizedPnL >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-profit" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-loss" aria-hidden="true" />
                )}
                <span className="text-sm">Unrealized P&L</span>
                <InfoTooltip content="Profit or loss from your currently open positions. This value fluctuates with market prices and only becomes 'realized' when you close the position." />
              </div>
              <span className={`text-lg font-bold font-mono-numbers ${
                unrealizedPnL >= 0 ? 'text-profit' : 'text-loss'
              }`}>
                {unrealizedPnL >= 0 ? '+' : ''}{formatCurrency(unrealizedPnL, 'USD')}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
