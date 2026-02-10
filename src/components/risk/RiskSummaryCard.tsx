/**
 * Risk Summary Card - Shows daily risk status on dashboard
 * System-First: Works with paper accounts, enriched with Binance
 * Enhanced with correlation warning for open positions
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, XCircle, CheckCircle, Wifi, Link2, FileText, Settings } from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useDailyRiskStatus } from "@/hooks/use-risk-profile";
import { useBinanceConnectionStatus } from "@/features/binance";
import { usePositions } from "@/hooks/use-positions";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { checkCorrelationRisk, extractSymbols, type CorrelationWarning } from "@/lib/correlation-utils";
import { formatPercentUnsigned } from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { Link } from "react-router-dom";

export function RiskSummaryCard() {
  const { format: formatCurrency } = useCurrencyConversion();
  const { data: riskStatus, riskProfile, isBinanceConnected } = useDailyRiskStatus();
  const { positions } = usePositions();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { showExchangeData } = useModeVisibility();

  // Check correlation risk for open positions - only in Live mode (M-09)
  const correlationWarning = useMemo((): CorrelationWarning | null => {
    if (!showExchangeData || !connectionStatus?.isConnected || positions.length < 2) return null;
    const symbols = extractSymbols(positions);
    return checkCorrelationRisk(symbols);
  }, [positions, connectionStatus]);

  // Determine data source for badge display
  const dataSource = useMemo(() => {
    if (isBinanceConnected) return 'binance';
    if (riskStatus) return 'paper';
    return 'none';
  }, [isBinanceConnected, riskStatus]);

  // No risk profile - show CTA to configure
  if (!riskProfile) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Risk Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-center py-2">
            <Settings className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Configure risk limits to track daily loss
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link to="/risk-management">
              <Settings className="h-4 w-4 mr-2" />
              Set Up Risk Profile
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Has risk profile but no trading activity today - show clean state
  if (!riskStatus) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Risk Status
            </CardTitle>
            {dataSource === 'paper' && (
              <Badge variant="outline" className="text-xs gap-1">
                <FileText className="h-3 w-3" />
                Paper
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">No trading activity today</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Daily loss limit: {formatCurrency(
              (riskProfile.max_daily_loss_percent ?? 5) / 100 * 10000
            )}
          </div>
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
          </CardTitle>
          <div className="flex items-center gap-2">
            {dataSource === 'binance' && (
              <Badge variant="outline" className="text-xs gap-1 text-profit">
                <Wifi className="h-3 w-3" />
                Binance
              </Badge>
            )}
            {dataSource === 'paper' && (
              <Badge variant="outline" className="text-xs gap-1">
                <FileText className="h-3 w-3" />
                Paper
              </Badge>
            )}
          </div>
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
              Remaining: {formatCurrency(riskStatus.remaining_budget)}
              <InfoTooltip content="How much more you can lose today before hitting your daily loss limit." />
            </span>
            <span>Limit: {formatCurrency(riskStatus.loss_limit)}</span>
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
