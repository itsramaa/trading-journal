/**
 * Daily Loss Tracker - Visual gauge for daily loss limit
 * Now Binance-centered with badge indicator
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, AlertTriangle, CheckCircle, XCircle, Wifi } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useDailyRiskStatus, useRiskProfile } from "@/hooks/use-risk-profile";
import { useBinanceConnectionStatus } from "@/features/binance";
import { BinanceNotConfiguredState } from "@/components/binance";
import { RISK_THRESHOLDS } from "@/types/risk";

export function DailyLossTracker() {
  const { data: riskStatus, isBinanceConnected } = useDailyRiskStatus();
  const { data: riskProfile } = useRiskProfile();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isConfigured = connectionStatus?.isConfigured ?? true;

  // Not configured state - show specific CTA
  if (!isConfigured) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Daily Loss Tracker
          </CardTitle>
          <CardDescription>
            Track your daily loss limit usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BinanceNotConfiguredState 
            compact 
            title="API Key Required"
            description="Connect your Binance API to enable live loss tracking."
          />
        </CardContent>
      </Card>
    );
  }

  if (!riskProfile || !riskStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Daily Loss Tracker
          </CardTitle>
          <CardDescription>
            Configure your risk profile to enable loss tracking
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Design system color tokens
  const getStatusColor = () => {
    if (riskStatus.loss_used_percent >= 100) return 'text-loss';
    if (riskStatus.loss_used_percent >= RISK_THRESHOLDS.danger_percent) return 'text-loss';
    if (riskStatus.loss_used_percent >= RISK_THRESHOLDS.warning_percent) return 'text-[hsl(var(--chart-4))]';
    return 'text-profit';
  };

  const getStatusIcon = () => {
    if (riskStatus.loss_used_percent >= 100) {
      return <XCircle className="h-6 w-6 text-loss" />;
    }
    if (riskStatus.loss_used_percent >= RISK_THRESHOLDS.warning_percent) {
      return <AlertTriangle className="h-6 w-6 text-[hsl(var(--chart-4))]" />;
    }
    return <CheckCircle className="h-6 w-6 text-profit" />
  };

  // Local formatCurrency with max 4 decimals for small values
  const formatCurrencyLocal = (value: number) => {
    const decimals = Math.abs(value) < 1 ? 4 : 2;
    return `$${value.toFixed(decimals)}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Daily Loss Tracker
              {isBinanceConnected && (
                <Badge variant="outline" className="text-xs gap-1 ml-1">
                  <Wifi className="h-3 w-3" />
                  Live
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {riskProfile.max_daily_loss_percent}% max daily loss limit
            </CardDescription>
          </div>
          {getStatusIcon()}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Gauge */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              Loss Limit Used
              <InfoTooltip content="Percentage of your daily loss limit consumed. Trading is disabled at 100% to protect your capital." />
            </span>
            <span className={`text-2xl font-bold ${getStatusColor()}`}>
              {riskStatus.loss_used_percent.toFixed(2)}%
            </span>
          </div>
          <Progress 
            value={Math.min(100, riskStatus.loss_used_percent)} 
            className="h-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="text-[hsl(var(--chart-4))]">{RISK_THRESHOLDS.warning_percent}%</span>
            <span className="text-loss">{RISK_THRESHOLDS.danger_percent}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {isBinanceConnected ? 'Wallet Balance' : 'Starting Balance'}
              <InfoTooltip content={isBinanceConnected ? "Your current Binance Futures wallet balance used as the base for daily loss calculations." : "Your starting balance for today, used as the base for daily loss limit calculations."} />
            </p>
            <p className="text-lg font-semibold">
              {formatCurrencyLocal(riskStatus.starting_balance)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Loss Limit
              <InfoTooltip content="Maximum dollar amount you can lose today based on your risk profile percentage. Calculated from your starting balance." />
            </p>
            <p className="text-lg font-semibold">
              {formatCurrencyLocal(riskStatus.loss_limit)}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${riskStatus.current_pnl >= 0 ? 'bg-profit-muted' : 'bg-loss-muted'}`}>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Today's P&L
              <InfoTooltip content="Your total realized profit or loss for today. Negative values count against your daily loss limit." />
            </p>
            <p className={`text-lg font-semibold ${riskStatus.current_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {riskStatus.current_pnl >= 0 ? '+' : ''}{formatCurrencyLocal(riskStatus.current_pnl)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Remaining Budget
              <InfoTooltip content="How much more you can lose today before hitting your daily loss limit. When this reaches $0, trading should stop." />
            </p>
            <p className={`text-lg font-semibold ${riskStatus.remaining_budget <= 0 ? 'text-loss' : ''}`}>
              {formatCurrencyLocal(riskStatus.remaining_budget)}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-center pt-4 border-t">
          {riskStatus.trading_allowed ? (
            <Badge className="bg-profit-muted text-profit border-profit/30 px-4 py-2">
              <CheckCircle className="h-4 w-4 mr-2" />
              Trading Allowed
            </Badge>
          ) : (
            <Badge className="bg-loss-muted text-loss border-loss/30 px-4 py-2">
              <XCircle className="h-4 w-4 mr-2" />
              Trading Disabled - Limit Reached
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
