/**
 * Daily Loss Tracker - Visual gauge for daily loss limit
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { useDailyRiskStatus, useRiskProfile } from "@/hooks/use-risk-profile";
import { RISK_THRESHOLDS } from "@/types/risk";

export function DailyLossTracker() {
  const { data: riskStatus } = useDailyRiskStatus();
  const { data: riskProfile } = useRiskProfile();

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

  const getStatusColor = () => {
    if (riskStatus.loss_used_percent >= 100) return 'text-red-500';
    if (riskStatus.loss_used_percent >= RISK_THRESHOLDS.danger_percent) return 'text-red-500';
    if (riskStatus.loss_used_percent >= RISK_THRESHOLDS.warning_percent) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getProgressColor = () => {
    if (riskStatus.loss_used_percent >= 100) return 'bg-red-500';
    if (riskStatus.loss_used_percent >= RISK_THRESHOLDS.danger_percent) return 'bg-red-500';
    if (riskStatus.loss_used_percent >= RISK_THRESHOLDS.warning_percent) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (riskStatus.loss_used_percent >= 100) {
      return <XCircle className="h-6 w-6 text-red-500" />;
    }
    if (riskStatus.loss_used_percent >= RISK_THRESHOLDS.warning_percent) {
      return <AlertTriangle className="h-6 w-6 text-yellow-500" />;
    }
    return <CheckCircle className="h-6 w-6 text-green-500" />;
  };

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Daily Loss Tracker
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
            <span className="text-sm text-muted-foreground">Loss Limit Used</span>
            <span className={`text-2xl font-bold ${getStatusColor()}`}>
              {riskStatus.loss_used_percent.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={Math.min(100, riskStatus.loss_used_percent)} 
            className="h-4"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span className="text-yellow-500">{RISK_THRESHOLDS.warning_percent}%</span>
            <span className="text-red-500">{RISK_THRESHOLDS.danger_percent}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Starting Balance</p>
            <p className="text-lg font-semibold">
              {formatCurrency(riskStatus.starting_balance)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Loss Limit</p>
            <p className="text-lg font-semibold">
              {formatCurrency(riskStatus.loss_limit)}
            </p>
          </div>
          <div className={`p-3 rounded-lg ${riskStatus.current_pnl >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <p className="text-xs text-muted-foreground">Today's P&L</p>
            <p className={`text-lg font-semibold ${riskStatus.current_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {riskStatus.current_pnl >= 0 ? '+' : ''}{formatCurrency(riskStatus.current_pnl)}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Remaining Budget</p>
            <p className={`text-lg font-semibold ${riskStatus.remaining_budget <= 0 ? 'text-red-500' : ''}`}>
              {formatCurrency(riskStatus.remaining_budget)}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-center pt-4 border-t">
          {riskStatus.trading_allowed ? (
            <Badge className="bg-green-500/20 text-green-500 border-green-500/30 px-4 py-2">
              <CheckCircle className="h-4 w-4 mr-2" />
              Trading Allowed
            </Badge>
          ) : (
            <Badge className="bg-red-500/20 text-red-500 border-red-500/30 px-4 py-2">
              <XCircle className="h-4 w-4 mr-2" />
              Trading Disabled - Limit Reached
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
