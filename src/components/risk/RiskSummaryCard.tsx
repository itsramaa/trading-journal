/**
 * Risk Summary Card - Shows daily risk status on dashboard
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { useDailyRiskStatus } from "@/hooks/use-risk-profile";

export function RiskSummaryCard() {
  const { data: riskStatus, riskProfile } = useDailyRiskStatus();

  if (!riskProfile) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Risk Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No risk profile configured
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!riskStatus) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Risk Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No trading activity today
          </p>
        </CardContent>
      </Card>
    );
  }

  const getStatusIcon = () => {
    switch (riskStatus.status) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'disabled':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (riskStatus.status) {
      case 'ok':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Normal</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Warning</Badge>;
      case 'disabled':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Limit Reached</Badge>;
    }
  };

  const progressColor = () => {
    if (riskStatus.loss_used_percent >= 90) return 'bg-red-500';
    if (riskStatus.loss_used_percent >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Risk Status
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Daily Loss Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Daily Loss Limit</span>
            <span className="font-medium">
              {riskStatus.loss_used_percent.toFixed(1)}% used
            </span>
          </div>
          <Progress 
            value={Math.min(100, riskStatus.loss_used_percent)} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Remaining: ${riskStatus.remaining_budget.toFixed(2)}</span>
            <span>Limit: ${riskStatus.loss_limit.toFixed(2)}</span>
          </div>
        </div>

        {/* Today's P&L */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Today's P&L</span>
          <span className={`font-bold ${riskStatus.current_pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {riskStatus.current_pnl >= 0 ? '+' : ''}${riskStatus.current_pnl.toFixed(2)}
          </span>
        </div>

        {/* Trading Status */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {getStatusIcon()}
          <span className="text-sm">
            {riskStatus.trading_allowed 
              ? 'Trading allowed' 
              : 'Trading disabled - limit reached'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
