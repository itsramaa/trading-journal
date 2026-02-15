/**
 * System Status Indicator - Shows trading status (green/yellow/red)
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Shield, 
  ChevronRight,
  Loader2 
} from "lucide-react";
import { useTradingGate } from "@/hooks/use-trading-gate";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { formatPercentUnsigned } from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

interface SystemStatusIndicatorProps {
  compact?: boolean;
}

export function SystemStatusIndicator({ compact = false }: SystemStatusIndicatorProps) {
  const { format: formatCurrency, formatPnl } = useCurrencyConversion();
  const { 
    status, 
    canTrade, 
    reason, 
    lossUsedPercent, 
    remainingBudget,
    dailyLossLimit,
    currentPnl,
    isLoading,
  } = useTradingGate();

  if (isLoading) {
    return (
      <Card className={cn(compact && "border-0 shadow-none bg-transparent")}>
        <CardContent className={cn("flex items-center gap-3", compact ? "p-0" : "p-4")}>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking status...</span>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    ok: {
      icon: CheckCircle,
      color: 'text-profit',
      bg: 'bg-profit/10',
      border: 'border-profit/30',
      label: 'RISK LIMITS OK',
      description: 'Daily loss limit within bounds',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-[hsl(var(--chart-4))]',
      bg: 'bg-[hsl(var(--chart-4))]/10',
      border: 'border-[hsl(var(--chart-4))]/30',
      label: 'CAUTION',
      description: reason || `${lossUsedPercent.toFixed(0)}% of daily limit used`,
    },
    disabled: {
      icon: XCircle,
      color: 'text-loss',
      bg: 'bg-loss/10',
      border: 'border-loss/30',
      label: 'TRADING DISABLED',
      description: reason || 'Daily loss limit reached',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div 
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg",
          config.bg,
          config.border,
          "border"
        )}
        role="status"
        aria-live="polite"
        aria-label={`Trading status: ${config.label}`}
      >
        <Icon className={cn("h-4 w-4", config.color)} aria-hidden="true" />
        <span className={cn("text-sm font-medium", config.color)}>
          {canTrade ? '🟢' : status === 'warning' ? '🟡' : '🔴'} {config.label}
        </span>
      </div>
    );
  }

  return (
    <Card 
      className={cn("border-2", config.border, config.bg)}
      role="status"
      aria-live="polite"
      aria-label={`Trading status: ${config.label}. ${config.description}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-full", config.bg)}>
              <Icon className={cn("h-6 w-6", config.color)} aria-hidden="true" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("font-bold text-lg", config.color)}>
                  {canTrade ? '🟢' : status === 'warning' ? '🟡' : '🔴'} {config.label}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {config.description}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/risk" className="flex items-center gap-1">
              <Shield className="h-4 w-4" aria-hidden="true" />
              <span className="hidden md:inline">Details</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
              <span className="sr-only">View risk management details</span>
            </Link>
          </Button>
        </div>

        {/* Progress bar showing loss limit usage */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Daily Loss Limit Usage
              <InfoTooltip content="Percentage of your daily loss limit that has been used. At 70% you'll see a warning, at 100% trading is disabled to protect your capital." />
            </span>
            <span className={cn("font-medium", config.color)}>
              {formatPercentUnsigned(lossUsedPercent, 1)}
            </span>
          </div>
          <Progress 
            value={lossUsedPercent} 
            className={cn(
              "h-2",
              status === 'ok' && "[&>div]:bg-profit",
              status === 'warning' && "[&>div]:bg-[hsl(var(--chart-4))]",
              status === 'disabled' && "[&>div]:bg-loss"
            )}
            aria-label={`Daily loss limit usage: ${formatPercentUnsigned(lossUsedPercent, 1)}`}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              Today's Realized P&L: <span className={currentPnl >= 0 ? 'text-profit' : 'text-loss'}>
                {formatPnl(currentPnl)}
              </span>
              <InfoTooltip content="Realized P&L from closed trades today. Unrealized P&L from open positions is not included. Negative values count against your daily loss limit." />
            </span>
            <span className="flex items-center gap-1">
              Remaining: {formatCurrency(remainingBudget)} of {formatCurrency(dailyLossLimit)}
              <InfoTooltip content="How much more you can lose today before hitting your limit and having trading disabled." />
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
