/**
 * Global Trading Mode Selector
 * Displays Paper/Live toggle + Trading Style selector in the header.
 * Persists to user_settings via useTradeMode hook.
 */
import { cn } from "@/lib/utils";
import {
  useTradeMode,
  TRADE_MODE_LABELS,
  TRADING_STYLE_LABELS,
  TRADING_STYLE_TIMEFRAMES,
  type TradeMode,
  type TradingStyle,
} from "@/hooks/use-trade-mode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, Zap, TrendingUp, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const STYLE_ICONS: Record<TradingStyle, React.ElementType> = {
  scalping: Zap,
  short_trade: TrendingUp,
  swing: Clock,
};

export function TradeModeSelector() {
  const {
    tradeMode,
    tradingStyle,
    isLoading,
    setTradeMode,
    setTradingStyle,
  } = useTradeMode();

  if (isLoading) {
    return <Skeleton className="h-8 w-40" />;
  }

  const StyleIcon = STYLE_ICONS[tradingStyle];

  return (
    <div className="flex items-center gap-1.5">
      {/* Mode Badge (Paper/Live) */}
      <ModeBadge mode={tradeMode} onToggle={() => setTradeMode(tradeMode === 'live' ? 'paper' : 'live')} />

      {/* Style Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <StyleIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{TRADING_STYLE_LABELS[tradingStyle]}</span>
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="text-xs text-muted-foreground">Trading Style</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(Object.keys(TRADING_STYLE_LABELS) as TradingStyle[]).map((style) => {
            const Icon = STYLE_ICONS[style];
            const isActive = tradingStyle === style;
            return (
              <DropdownMenuItem
                key={style}
                onClick={() => setTradingStyle(style)}
                className={cn(
                  "flex items-center justify-between gap-2 cursor-pointer",
                  isActive && "bg-accent"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{TRADING_STYLE_LABELS[style]}</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {TRADING_STYLE_TIMEFRAMES[style]}
                </span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function ModeBadge({
  mode,
  onToggle,
}: {
  mode: TradeMode;
  onToggle: () => void;
}) {
  const isLive = mode === 'live';

  return (
    <button
      onClick={onToggle}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer border",
        isLive
          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-400 dark:border-emerald-500/20"
          : "bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/20"
      )}
      aria-label={`Switch to ${isLive ? 'paper' : 'live'} mode`}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          isLive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
        )}
      />
      {TRADE_MODE_LABELS[mode].toUpperCase()}
    </button>
  );
}
