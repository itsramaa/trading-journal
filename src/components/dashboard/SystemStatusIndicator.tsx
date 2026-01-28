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

interface SystemStatusIndicatorProps {
  compact?: boolean;
}

export function SystemStatusIndicator({ compact = false }: SystemStatusIndicatorProps) {
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
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      label: 'ALL SYSTEMS NORMAL',
      description: 'You are clear to trade',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      label: 'CAUTION',
      description: reason || `${lossUsedPercent.toFixed(0)}% of daily limit used`,
    },
    disabled: {
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      label: 'TRADING DISABLED',
      description: reason || 'Daily loss limit reached',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        config.bg,
        config.border,
        "border"
      )}>
        <Icon className={cn("h-4 w-4", config.color)} />
        <span className={cn("text-sm font-medium", config.color)}>
          {canTrade ? '🟢' : status === 'warning' ? '🟡' : '🔴'} {config.label}
        </span>
      </div>
    );
  }

  return (
    <Card className={cn("border-2", config.border, config.bg)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className={cn("p-2 rounded-full", config.bg)}>
              <Icon className={cn("h-6 w-6", config.color)} />
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
              <Shield className="h-4 w-4" />
              <span className="hidden md:inline">Details</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Progress bar showing loss limit usage */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Daily Loss Limit Usage</span>
            <span className={cn("font-medium", config.color)}>
              {lossUsedPercent.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={lossUsedPercent} 
            className={cn(
              "h-2",
              status === 'ok' && "[&>div]:bg-green-500",
              status === 'warning' && "[&>div]:bg-yellow-500",
              status === 'disabled' && "[&>div]:bg-red-500"
            )}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Today's P&L: <span className={currentPnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                {currentPnl >= 0 ? '+' : ''}${currentPnl.toFixed(2)}
              </span>
            </span>
            <span>
              Remaining: ${remainingBudget.toFixed(2)} of ${dailyLossLimit.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
