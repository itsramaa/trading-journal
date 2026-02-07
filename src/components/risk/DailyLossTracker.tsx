/**
 * Daily Loss Tracker - System-First Design
 * Visual gauge for daily loss limit tracking
 * Works with both Paper Trading accounts and Binance (enrichment)
 * 
 * Philosophy: Always functional with internal data, Binance adds real-time accuracy
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingDown, AlertTriangle, CheckCircle, XCircle, Wifi, Settings } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useDailyRiskStatus, useRiskProfile } from "@/hooks/use-risk-profile";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { RISK_THRESHOLDS } from "@/types/risk";
import { Link } from "react-router-dom";

export function DailyLossTracker() {
  const { data: riskStatus, isBinanceConnected } = useDailyRiskStatus();
  const { data: riskProfile, isLoading: profileLoading } = useRiskProfile();
  const { format, formatPnl } = useCurrencyConversion();

  // Loading state
  if (profileLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Daily Loss Tracker
          </CardTitle>
          <CardDescription>Loading risk profile...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // No risk profile configured - prompt to set up
  if (!riskProfile) {
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
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Set your daily loss limits to protect your capital and track your risk in real-time.
            </p>
            <Button asChild variant="outline" size="sm">
              <Link to="/settings?tab=trading">
                <Settings className="h-4 w-4 mr-2" />
                Configure Risk Profile
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No risk status data yet (no balance source)
  if (!riskStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Daily Loss Tracker
          </CardTitle>
          <CardDescription>
            {riskProfile.max_daily_loss_percent}% max daily loss limit
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Create a paper trading account or connect Binance to start tracking your daily loss limit.
            </p>
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/accounts">
                  Create Paper Account
                </Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link to="/settings?tab=exchange">
                  Connect Exchange
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
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

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Daily Loss Tracker
              {isBinanceConnected ? (
                <Badge variant="outline" className="text-xs gap-1 ml-1 border-profit/30 text-profit">
                  <Wifi className="h-3 w-3" />
                  Live
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs ml-1">
                  Paper
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
              {format(riskStatus.starting_balance)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Loss Limit
              <InfoTooltip content="Maximum dollar amount you can lose today based on your risk profile percentage. Calculated from your starting balance." />
            </p>
            <p className="text-lg font-semibold">
              {format(riskStatus.loss_limit)}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${riskStatus.current_pnl >= 0 ? 'bg-profit-muted' : 'bg-loss-muted'}`}>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Today's P&L
              <InfoTooltip content="Your total realized profit or loss for today. Negative values count against your daily loss limit." />
            </p>
            <p className={`text-lg font-semibold ${riskStatus.current_pnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {formatPnl(riskStatus.current_pnl)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              Remaining Budget
              <InfoTooltip content="How much more you can lose today before hitting your daily loss limit. When this reaches $0, trading should stop." />
            </p>
            <p className={`text-lg font-semibold ${riskStatus.remaining_budget <= 0 ? 'text-loss' : ''}`}>
              {format(riskStatus.remaining_budget)}
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

        {/* Enhancement CTA for non-Binance users */}
        {!isBinanceConnected && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground text-xs">
                Using paper account data
              </span>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link to="/settings?tab=exchange">
                  Upgrade to live tracking
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
