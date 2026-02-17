/**
 * Smart Quick Actions - Context-aware action buttons
 * Disables actions based on trading gate status and highlights warnings
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  BookOpen, 
  CandlestickChart, 
  LineChart, 
  Shield,
  AlertTriangle,
  Ban,
  type LucideIcon
} from "lucide-react";
import { useTradingGate } from "@/hooks/use-trading-gate";
import { useRiskEvents } from "@/hooks/use-risk-events";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { cn } from "@/lib/utils";

interface SmartAction {
  id: string;
  label: string;
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
  
  
  // Check for recent risk warnings (last 24h)
  const hasRecentWarning = useMemo(() => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    return riskEvents.some(e => 
      new Date(e.created_at || e.event_date) >= oneDayAgo &&
      (e.event_type.includes('warning') || e.event_type === 'limit_reached')
    );
  }, [riskEvents]);

  const actions = useMemo((): SmartAction[] => {
    // C-06: Hide "Add Trade" in Live mode
    const tradeDisabled = !canCreateManualTrade || !canTrade;
    const tradeReason = !canCreateManualTrade 
      ? 'Live mode — trades are executed on Binance'
      : (!canTrade ? (reason || 'Trading is currently disabled') : undefined);
    
    return [
      {
        id: 'add-trade',
        label: 'Add Trade',
        href: '/trading',
        icon: BookOpen,
        disabled: tradeDisabled,
        disabledReason: tradeReason,
        priority: tradeDisabled ? 'warning' : 'normal',
        badge: tradeDisabled ? (canCreateManualTrade ? 'Locked' : 'Live Mode') : undefined,
      },
      {
        id: 'add-account',
        label: 'Add Account',
        href: '/accounts',
        icon: CandlestickChart,
        disabled: false,
        priority: 'normal',
      },
      {
        id: 'add-strategy',
        label: 'Add Strategy',
        href: '/strategies',
        icon: LineChart,
        disabled: false,
        priority: 'normal',
      },
      {
        id: 'risk-check',
        label: 'Risk Check',
        href: '/risk',
        icon: Shield,
        disabled: false,
        priority: hasRecentWarning || status === 'warning' ? 'high' : 'normal',
        badge: hasRecentWarning ? 'Action Needed' : status === 'warning' ? 'Warning' : undefined,
      },
    ];
  }, [canTrade, canCreateManualTrade, reason, status, hasRecentWarning]);

  const getButtonVariant = (action: SmartAction) => {
    if (action.disabled) return 'outline';
    if (action.priority === 'high') return 'default';
    if (action.priority === 'warning') return 'outline';
    return 'outline';
  };

  const getIconColor = (action: SmartAction) => {
    if (action.disabled) return 'text-muted-foreground';
    if (action.priority === 'high') return 'text-primary-foreground';
    if (action.priority === 'warning') return 'text-loss';
    return 'text-primary';
  };

  return (
    <Card className="h-full">
      <CardContent className="p-4 h-full flex flex-col justify-center">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => {
            const ActionIcon = action.icon;
            
            const buttonContent = (
              <Button 
                variant={getButtonVariant(action)} 
                className={cn(
                  "h-auto py-3 px-3 flex flex-col gap-1.5 relative rounded-xl border-border/50",
                  action.disabled && "opacity-60 cursor-not-allowed",
                  action.priority === 'high' && "border-primary bg-primary hover:bg-primary/90",
                  action.priority === 'warning' && !action.disabled && "border-loss/50"
                )}
                disabled={action.disabled}
                asChild={!action.disabled}
              >
                {action.disabled ? (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="relative">
                      <ActionIcon className={cn("h-4 w-4", getIconColor(action))} />
                      <Ban className="h-2.5 w-2.5 text-loss absolute -top-0.5 -right-0.5" />
                    </div>
                    <span className="text-xs">{action.label}</span>
                    {action.badge && (
                      <Badge variant="destructive" className="text-[10px] absolute -top-1.5 -right-1.5 px-1 py-0">
                        {action.badge}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <Link to={action.href} className="flex flex-col items-center gap-1.5">
                    <ActionIcon className={cn("h-4 w-4", getIconColor(action))} />
                    <span className="text-xs">{action.label}</span>
                    {action.badge && (
                      <Badge 
                        variant={action.priority === 'high' ? 'secondary' : 'destructive'} 
                        className="text-[10px] absolute -top-1.5 -right-1.5 px-1 py-0"
                      >
                        {action.badge}
                      </Badge>
                    )}
                  </Link>
                )}
              </Button>
            );

            if (action.disabledReason) {
              return (
                <Tooltip key={action.id}>
                  <TooltipTrigger asChild>
                    {buttonContent}
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-loss shrink-0 mt-0.5" />
                      <span>{action.disabledReason}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return <div key={action.id}>{buttonContent}</div>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
