/**
 * BinanceNotConfiguredState
 * Reusable empty state component for when Binance API credentials are not configured
 * Provides consistent UX across all features requiring Binance connection
 */

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, Wifi, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BinanceNotConfiguredStateProps {
  /** Title shown above the description */
  title?: string;
  /** Description explaining why configuration is needed */
  description?: string;
  /** Additional className for the container */
  className?: string;
  /** Compact mode for smaller widgets */
  compact?: boolean;
  /** Custom icon to show */
  icon?: React.ReactNode;
}

export function BinanceNotConfiguredState({
  title = "Binance Not Connected",
  description = "Connect your Binance API key to access live trading data, positions, and balance.",
  className,
  compact = false,
  icon,
}: BinanceNotConfiguredStateProps) {
  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 p-4", className)}>
        <div className="shrink-0">
          {icon || <Wifi className="h-6 w-6 text-muted-foreground/50" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <Button variant="outline" size="sm" asChild className="shrink-0">
          <Link to="/settings?tab=exchange">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Configure
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col items-center justify-center py-8 px-4 text-center", className)}>
      <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mb-4">
        {icon || <Wifi className="h-7 w-7 text-muted-foreground/50" />}
      </div>
      <h3 className="text-base font-medium mb-1.5">{title}</h3>
      <p className="text-sm text-muted-foreground mb-5 max-w-xs">
        {description}
      </p>
      <Button variant="outline" asChild>
        <Link to="/settings?tab=exchange">
          <Settings className="h-4 w-4 mr-2" />
          Configure Binance API
        </Link>
      </Button>
    </div>
  );
}

/**
 * Inline variant for use inside cards that already have structure
 */
export function BinanceNotConfiguredBanner({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20",
      className
    )}>
      <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">Binance API not configured</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Live trading data requires API connection.{" "}
          <Link 
            to="/settings?tab=exchange" 
            className="text-primary hover:underline inline-flex items-center gap-0.5"
          >
            Set up now
            <Settings className="h-3 w-3" />
          </Link>
        </p>
      </div>
    </div>
  );
}
