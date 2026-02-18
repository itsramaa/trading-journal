/**
 * Smart Quick Actions - Context-aware action buttons
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  BookOpen, 
  CandlestickChart, 
  LineChart, 
  Shield,
  AlertTriangle,
  Zap,
  type LucideIcon
} from "lucide-react";
import { useTradingGate } from "@/hooks/use-trading-gate";
import { useRiskEvents } from "@/hooks/use-risk-events";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { cn } from "@/lib/utils";

interface SmartAction {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  disabled: boolean;
  disabledReason?: string;
  priority: 'normal' | 'high' | 'warning';
  badge?: string;
}

export function SmartQuickActions() {
  const { canTrade, reason, status } = useTradingGate();
  const { events: riskEvents = [] } = useRiskEvents();
  const { canCreateManualTrade } = useModeVisibility();

  const hasRecentWarning = useMemo(() => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    return riskEvents.some(e => 
      new Date(e.created_at || e.event_date) >= oneDayAgo &&
      (e.event_type.includes('warning') || e.event_type === 'limit_reached')
    );
  }, [riskEvents]);

  const actions = useMemo((): SmartAction[] => {
    const tradeDisabled = !canCreateManualTrade || !canTrade;
    const tradeReason = !canCreateManualTrade 
      ? 'Live mode — trades are executed on Binance'
      : (!canTrade ? (reason || 'Trading is currently disabled') : undefined);
    
    return [
      {
        id: 'add-trade',
        label: 'Log Trade',
        description: 'Record a new trade',
        href: '/trading',
        icon: BookOpen,
        disabled: tradeDisabled,
        disabledReason: tradeReason,
        priority: tradeDisabled ? 'warning' : 'normal',
        badge: tradeDisabled ? (canCreateManualTrade ? 'Locked' : 'Live') : undefined,
      },
      {
        id: 'add-account',
        label: 'Accounts',
        description: 'Manage accounts',
        href: '/accounts',
        icon: CandlestickChart,
        disabled: false,
        priority: 'normal',
      },
      {
        id: 'add-strategy',
        label: 'Strategies',
        description: 'Build strategies',
        href: '/strategies',
        icon: LineChart,
        disabled: false,
        priority: 'normal',
      },
      {
        id: 'risk-check',
        label: 'Risk',
        description: 'Check risk status',
        href: '/risk',
        icon: Shield,
        disabled: false,
        priority: hasRecentWarning || status === 'warning' ? 'high' : 'normal',
        badge: hasRecentWarning ? '!' : status === 'warning' ? '!' : undefined,
      },
    ];
  }, [canTrade, canCreateManualTrade, reason, status, hasRecentWarning]);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3 pt-4 px-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const ActionIcon = action.icon;
            const isHigh = action.priority === 'high';
            const isWarning = action.priority === 'warning';

            const buttonEl = (
              <div className="relative">
                {action.badge && (
                  <span className={cn(
                    "absolute -top-1.5 -right-1.5 z-10 h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center",
                    isHigh ? "bg-loss text-loss-foreground" : "bg-muted-foreground text-background"
                  )}>
                    {action.badge}
                  </span>
                )}
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-auto py-3 flex flex-col items-center gap-1.5 rounded-xl border transition-all",
                    action.disabled && "opacity-50 cursor-not-allowed",
                    isHigh && "border-loss/40 bg-loss/5 hover:bg-loss/10",
                    !isHigh && !isWarning && !action.disabled && "hover:border-primary/40 hover:bg-primary/5",
                  )}
                  disabled={action.disabled}
                  asChild={!action.disabled}
                >
                  {action.disabled ? (
                    <div className="flex flex-col items-center gap-1.5">
                      <ActionIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-medium">{action.label}</span>
                    </div>
                  ) : (
                    <Link to={action.href} className="flex flex-col items-center gap-1.5">
                      <ActionIcon className={cn(
                        "h-4 w-4",
                        isHigh ? "text-loss" : "text-primary"
                      )} />
                      <span className="text-xs font-medium">{action.label}</span>
                    </Link>
                  )}
                </Button>
              </div>
            );

            if (action.disabledReason) {
              return (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    <div>{buttonEl}</div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-loss shrink-0 mt-0.5" />
                      <span className="text-xs">{action.disabledReason}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={action.id}>{buttonEl}</div>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
