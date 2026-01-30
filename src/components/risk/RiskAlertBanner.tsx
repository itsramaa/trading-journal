/**
 * Risk Alert Banner - Global banner shown when risk thresholds are crossed
 */
import { AlertTriangle, XCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { useTradingGate } from "@/hooks/use-trading-gate";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link } from "react-router-dom";

export function RiskAlertBanner() {
  const { status, reason, lossUsedPercent, canTrade } = useTradingGate();
  const [dismissed, setDismissed] = useState(false);

  // Don't show if status is ok or dismissed
  if (status === 'ok' || dismissed) {
    return null;
  }

  const isDisabled = status === 'disabled';

  return (
    <div className={cn(
      "w-full px-4 py-3 flex items-center justify-between gap-4",
      isDisabled 
        ? "bg-red-500/10 border-b border-red-500/30" 
        : "bg-yellow-500/10 border-b border-yellow-500/30"
    )}>
      <div className="flex items-center gap-3">
        {isDisabled ? (
          <XCircle className="h-5 w-5 text-red-500 shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
        )}
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
          <span className={cn(
            "font-semibold",
            isDisabled ? "text-red-500" : "text-yellow-500"
          )}>
            {isDisabled ? '🔴 TRADING DISABLED' : '⚠️ RISK WARNING'}
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            {reason || `Daily loss at ${lossUsedPercent.toFixed(0)}% of limit`}
            <InfoTooltip 
              content={isDisabled 
                ? "You've hit your daily loss limit. Trading is blocked to protect your capital. Wait until tomorrow or adjust your risk settings." 
                : "You're approaching your daily loss limit. Consider reducing position sizes or taking a break."
              } 
            />
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          asChild
          className={cn(
            isDisabled 
              ? "text-red-500 hover:text-red-600 hover:bg-red-500/10" 
              : "text-yellow-500 hover:text-yellow-600 hover:bg-yellow-500/10"
          )}
        >
          <Link to="/risk">View Details</Link>
        </Button>
        {!isDisabled && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDismissed(true)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
