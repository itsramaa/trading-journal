/**
 * ADL Risk Indicator Widget
 * Displays Auto-Deleveraging risk levels for active positions
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CryptoIcon } from "@/components/ui/crypto-icon";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { AlertTriangle, CheckCircle, Shield, TrendingDown, TrendingUp } from "lucide-react";
import { useBinanceAdlQuantile, useBinancePositions, useBinanceConnectionStatus, getAdlRiskLevel } from "@/features/binance";
import { BinanceNotConfiguredState } from "@/components/binance/BinanceNotConfiguredState";
import type { AdlQuantile } from "@/features/binance/types";
import { cn } from "@/lib/utils";

const riskLevelConfig = {
  low: {
    color: 'text-profit',
    bgColor: 'bg-profit/10',
    borderColor: 'border-profit/30',
    icon: CheckCircle,
    label: 'Low Risk',
    description: 'Position is safe from ADL',
    guidance: 'Your position is safe. No action needed.',
  },
  medium: {
    color: 'text-chart-4',
    bgColor: 'bg-chart-4/10',
    borderColor: 'border-chart-4/30',
    icon: Shield,
    label: 'Medium Risk',
    description: 'Monitor your position',
    guidance: 'Monitor your position. Consider reducing size if market volatility increases.',
  },
  high: {
    color: 'text-chart-5',
    bgColor: 'bg-chart-5/10',
    borderColor: 'border-chart-5/30',
    icon: AlertTriangle,
    label: 'High Risk',
    description: 'Consider reducing position',
    guidance: 'Your position may be auto-deleveraged. Reduce position size or add margin to lower risk.',
  },
  critical: {
    color: 'text-loss',
    bgColor: 'bg-loss/10',
    borderColor: 'border-loss/30',
    icon: AlertTriangle,
    label: 'Critical Risk',
    description: 'ADL likely if market moves',
    guidance: 'Immediate action recommended. Your position is at the front of the ADL queue. Reduce position now.',
  },
};

interface PositionADLProps {
  symbol: string;
  side: 'LONG' | 'SHORT' | 'BOTH';
  quantile: number;
}

function PositionADLRow({ symbol, side, quantile }: PositionADLProps) {
  const riskLevel = getAdlRiskLevel(quantile);
  const config = riskLevelConfig[riskLevel];
  const Icon = config.icon;
  const progressValue = (quantile / 5) * 100;

  return (
    <div className={cn(
      "p-3 rounded-lg border space-y-2",
      config.bgColor,
      config.borderColor
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("shrink-0", config.color)}>
            {side === 'LONG' ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
          </div>
          <CryptoIcon symbol={symbol} size={18} />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{symbol}</p>
            <p className="text-xs text-muted-foreground">{side}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-16">
            <Progress 
              value={progressValue} 
              className={cn("h-2", riskLevel === 'critical' && "bg-loss/20")}
            />
          </div>
          <Badge variant="outline" className={cn("gap-1 shrink-0", config.color)}>
            <Icon className="h-3 w-3" />
            {quantile}/5
          </Badge>
        </div>
      </div>
      {(riskLevel === 'high' || riskLevel === 'critical') && (
        <p className={cn("text-xs pl-7", config.color)}>
          💡 {config.guidance}
        </p>
      )}
    </div>
  );
}

export function ADLRiskWidget() {
  const { showExchangeData } = useModeVisibility();

  // All hooks must be called before any early return
  const { data: connectionStatus, isLoading: statusLoading } = useBinanceConnectionStatus();
  const { data: positions, isLoading: positionsLoading } = useBinancePositions();
  const { data: adlData, isLoading: adlLoading } = useBinanceAdlQuantile();

  const isConfigured = connectionStatus?.isConfigured ?? false;
  const isConnected = connectionStatus?.isConnected ?? false;

  // Hide in Paper mode (M-23)
  if (!showExchangeData) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            ADL Risk
            <Badge variant="outline" className="text-xs">Live Only</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <Shield className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">ADL risk monitoring is only available in Live mode</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isLoading = statusLoading || positionsLoading || adlLoading;

  // Filter active positions (non-zero position amount)
  const activePositions = positions?.filter(p => parseFloat(String(p.positionAmt)) !== 0) || [];

  // Map ADL data to positions
  const adlArray = Array.isArray(adlData) ? adlData : adlData ? [adlData] : [];
  const adlMap = new Map<string, AdlQuantile>();
  adlArray.forEach(adl => adlMap.set(adl.symbol, adl));

  // Get positions with ADL data
  const positionsWithADL = activePositions.map(pos => {
    const adl = adlMap.get(pos.symbol);
    const side = parseFloat(String(pos.positionAmt)) > 0 ? 'LONG' : 'SHORT';
    const quantile = adl?.adlQuantile?.[side] || adl?.adlQuantile?.BOTH || 0;
    return {
      symbol: pos.symbol,
      side: side as 'LONG' | 'SHORT',
      quantile,
    };
  }).sort((a, b) => b.quantile - a.quantile); // Sort by risk (highest first)

  // Calculate overall risk
  const maxQuantile = Math.max(...positionsWithADL.map(p => p.quantile), 0);
  const overallRiskLevel = getAdlRiskLevel(maxQuantile);
  const overallConfig = riskLevelConfig[overallRiskLevel];

  // Show not configured state
  if (!statusLoading && !isConfigured) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            ADL Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BinanceNotConfiguredState 
            compact 
            title="API Required"
            description="Configure Binance API to see ADL risk"
          />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            ADL Risk
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2].map(i => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            ADL Risk
            <InfoTooltip content="ADL quantile is ranked 1-5 based on your position's profit and margin ratio relative to other traders. 1 = lowest priority for ADL (safest), 5 = highest priority (most likely to be auto-deleveraged). This is a relative ranking in the queue, not an absolute risk measure." />
          </CardTitle>
          {positionsWithADL.length > 0 && (
            <Badge variant="outline" className={cn("gap-1", overallConfig.color)}>
              {overallConfig.label}
            </Badge>
          )}
        </div>
        <CardDescription>
          Position deleveraging risk levels
        </CardDescription>
      </CardHeader>
      <CardContent>
        {positionsWithADL.length === 0 ? (
          <div className="flex items-center gap-3 py-4">
            <CheckCircle className="h-8 w-8 text-profit" />
            <div>
              <p className="font-medium">No Active Positions</p>
              <p className="text-sm text-muted-foreground">
                No ADL risk when you have no open positions.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {positionsWithADL.slice(0, 5).map((pos) => (
              <PositionADLRow
                key={`${pos.symbol}-${pos.side}`}
                symbol={pos.symbol}
                side={pos.side}
                quantile={pos.quantile}
              />
            ))}
            {positionsWithADL.length > 5 && (
              <p className="text-xs text-center text-muted-foreground pt-2">
                +{positionsWithADL.length - 5} more positions
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
