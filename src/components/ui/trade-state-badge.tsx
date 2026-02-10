/**
 * TradeStateBadge - Visual badge for trade lifecycle state
 * Maps trade_state to color-coded badges with icons
 */
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Loader2,
  Zap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradeState } from "@/services/binance/trade-state-machine";

interface TradeStateBadgeProps {
  state: string | null | undefined;
  className?: string;
  size?: 'sm' | 'default';
}

const STATE_CONFIG: Record<TradeState, {
  label: string;
  icon: React.ElementType;
  className: string;
}> = {
  OPENING: {
    label: 'Opening',
    icon: Clock,
    className: 'border-amber-500/50 text-amber-500 bg-amber-500/10',
  },
  PARTIALLY_FILLED: {
    label: 'Partial',
    icon: Loader2,
    className: 'border-blue-500/50 text-blue-500 bg-blue-500/10',
  },
  ACTIVE: {
    label: 'Active',
    icon: Zap,
    className: 'border-emerald-500/50 text-emerald-500 bg-emerald-500/10',
  },
  CLOSED: {
    label: 'Closed',
    icon: CheckCircle2,
    className: 'border-muted-foreground/50 text-muted-foreground bg-muted/50',
  },
  CANCELED: {
    label: 'Canceled',
    icon: XCircle,
    className: 'border-muted-foreground/30 text-muted-foreground/70 bg-muted/30',
  },
  LIQUIDATED: {
    label: 'Liquidated',
    icon: AlertTriangle,
    className: 'border-destructive/50 text-destructive bg-destructive/10',
  },
};

export function TradeStateBadge({ state, className, size = 'sm' }: TradeStateBadgeProps) {
  if (!state) return null;

  const config = STATE_CONFIG[state as TradeState];
  if (!config) return null;

  const Icon = config.icon;
  const isSmall = size === 'sm';

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium',
        isSmall && 'text-xs px-1.5 py-0',
        config.className,
        className,
      )}
    >
      <Icon className={cn('shrink-0', isSmall ? 'h-3 w-3' : 'h-3.5 w-3.5')} />
      {config.label}
    </Badge>
  );
}
