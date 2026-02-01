/**
 * Risk Summary Card - Shows daily risk status on dashboard
 * Now displays Binance badge when using real data
 * Enhanced with correlation warning for open positions
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, XCircle, CheckCircle, Wifi, Link2 } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useDailyRiskStatus } from "@/hooks/use-risk-profile";
import { useBinanceConnectionStatus } from "@/features/binance";
import { usePositions } from "@/hooks/use-positions";
import { checkCorrelationRisk, extractSymbols, type CorrelationWarning } from "@/lib/correlation-utils";
import { formatPercentUnsigned, formatCurrency } from "@/lib/formatters";

export function RiskSummaryCard() {
  const { data: riskStatus, riskProfile, isBinanceConnected } = useDailyRiskStatus();
  const { positions } = usePositions();
  const { data: connectionStatus } = useBinanceConnectionStatus();

  // Check correlation risk for open positions (already filtered by usePositions)
  const correlationWarning = useMemo((): CorrelationWarning | null => {
    if (!connectionStatus?.isConnected || positions.length < 2) return null;
    const symbols = extractSymbols(positions);
    return checkCorrelationRisk(symbols);
  }, [positions, connectionStatus]);

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

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Risk Status
            {isBinanceConnected && (
              <Badge variant="outline" className="text-xs gap-1 ml-1">
                <Wifi className="h-3 w-3" />
                Binance
              </Badge>
            )}
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Daily Loss Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Daily Loss Limit
              <InfoTooltip content="Maximum amount you're allowed to lose in a single trading day, based on your risk profile percentage of total capital." />
            </span>
            <span className="font-medium">
              {formatPercentUnsigned(riskStatus.loss_used_percent, 1)} used
            </span>
          </div>
          <Progress 
            value={Math.min(100, riskStatus.loss_used_percent)} 
            className="h-2"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              Remaining: {formatCurrency(riskStatus.remaining_budget, 'USD')}
              <InfoTooltip content="How much more you can lose today before hitting your daily loss limit." />
            </span>
            <span>Limit: {formatCurrency(riskStatus.loss_limit, 'USD')}</span>
          </div>
        </div>

        {/* Trading Status */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {getStatusIcon()}
          <span className="text-sm flex items-center gap-1">
            {riskStatus.trading_allowed 
              ? 'Trading allowed' 
              : 'Trading disabled - limit reached'}
            <InfoTooltip content="Your trading status based on daily loss limit. Trading is disabled when you've used 100% of your allowed daily loss." />
          </span>
        </div>

        {/* Correlation Warning */}
        {correlationWarning && (
          <div className="flex items-start gap-2 pt-2 border-t">
            <Link2 className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-medium text-warning">
                Correlated Positions
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {correlationWarning.pairs.length} pair{correlationWarning.pairs.length !== 1 ? 's' : ''} ({formatPercentUnsigned(correlationWarning.avgCorrelation * 100, 0)} avg)
                {correlationWarning.highRiskCount > 0 && (
                  <Badge variant="outline" className="ml-1.5 text-xs border-warning/30 text-warning">
                    High Risk
                  </Badge>
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
