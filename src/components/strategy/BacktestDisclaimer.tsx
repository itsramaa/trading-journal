/**
 * Backtest Disclaimer Component
 * Displays important caveats about backtest simulation limitations
 */

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Info, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface BacktestAssumptions {
  slippage?: number;
  slippageModel?: string;
  commissionModel?: string;
  executionModel?: string;
  liquidationRisk?: string;
  fundingRates?: string;
  marketImpact?: string;
}

interface BacktestDisclaimerProps {
  assumptions?: BacktestAssumptions;
  accuracyNotes?: string;
  simulationVersion?: string;
  className?: string;
  variant?: "compact" | "full";
}

export function BacktestDisclaimer({
  assumptions,
  accuracyNotes,
  simulationVersion = "v1-simplified",
  className,
  variant = "compact",
}: BacktestDisclaimerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const slippagePercent = assumptions?.slippage 
    ? (assumptions.slippage * 100).toFixed(2) 
    : "0.10";

  if (variant === "compact") {
    return (
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Alert variant="default" className={cn("border-[hsl(var(--chart-4))]/50 bg-[hsl(var(--chart-4))]/5", className)}>
          <AlertTriangle className="h-4 w-4 text-[hsl(var(--chart-4))]" />
          <AlertTitle className="flex items-center justify-between">
            <span>Simulated Results</span>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </AlertTitle>
          <AlertDescription>
            <p className="text-sm text-muted-foreground">
              This backtest uses simplified modeling. Actual results may differ significantly.
            </p>
            
            <CollapsibleContent className="mt-3 space-y-2">
              <ul className="list-disc ml-4 text-sm text-muted-foreground space-y-1">
                <li>Instant order fills (no slippage beyond {slippagePercent}%)</li>
                <li>Funding rates not included</li>
                <li>Liquidation risk not modeled</li>
                <li>Market impact not considered</li>
                <li>No partial fill simulation</li>
              </ul>
              
              {assumptions && (
                <div className="mt-3 p-2 rounded bg-muted/50 text-xs">
                  <p className="font-medium mb-1">Simulation Parameters:</p>
                  <div className="grid grid-cols-2 gap-1 text-muted-foreground">
                    <span>Slippage Model:</span>
                    <span>{assumptions.slippageModel || "fixed_percentage"}</span>
                    <span>Execution Model:</span>
                    <span>{assumptions.executionModel || "instant_fill"}</span>
                    <span>Commission Model:</span>
                    <span>{assumptions.commissionModel || "maker_taker_average"}</span>
                  </div>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mt-2">
                Version: {simulationVersion}
              </p>
            </CollapsibleContent>
          </AlertDescription>
        </Alert>
      </Collapsible>
    );
  }

  // Full variant
  return (
    <Alert variant="default" className={cn("border-[hsl(var(--chart-4))]/50 bg-[hsl(var(--chart-4))]/5", className)}>
      <AlertTriangle className="h-4 w-4 text-[hsl(var(--chart-4))]" />
      <AlertTitle>Simulated Results - Important Disclaimer</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm">
          This backtest uses simplified simulation. Key limitations:
        </p>
        
        <ul className="list-disc ml-4 text-sm space-y-1">
          <li>
            <strong>Instant order fills</strong> - Real markets may have slippage beyond the 
            modeled {slippagePercent}%
          </li>
          <li>
            <strong>No funding rates</strong> - Perpetual futures incur funding costs every 8 hours
          </li>
          <li>
            <strong>Liquidation not modeled</strong> - High leverage positions may get liquidated
          </li>
          <li>
            <strong>No market impact</strong> - Large orders move the market
          </li>
          <li>
            <strong>No partial fills</strong> - Orders are assumed to fill completely
          </li>
        </ul>

        {accuracyNotes && (
          <div className="p-3 rounded bg-muted/50 text-sm">
            <p className="font-medium mb-1 flex items-center gap-1">
              <Info className="h-4 w-4" />
              Accuracy Notes
            </p>
            <p className="text-muted-foreground whitespace-pre-line">{accuracyNotes}</p>
          </div>
        )}

        {assumptions && (
          <div className="p-3 rounded bg-muted/50 text-sm">
            <p className="font-medium mb-2">Simulation Parameters</p>
            <div className="grid grid-cols-2 gap-2 text-muted-foreground">
              <span>Slippage:</span>
              <span>{slippagePercent}% ({assumptions.slippageModel || "fixed"})</span>
              <span>Execution:</span>
              <span>{assumptions.executionModel || "instant_fill"}</span>
              <span>Commission:</span>
              <span>{assumptions.commissionModel || "maker_taker_average"}</span>
              <span>Liquidation:</span>
              <span>{assumptions.liquidationRisk || "not_modeled"}</span>
              <span>Funding Rates:</span>
              <span>{assumptions.fundingRates || "not_included"}</span>
              <span>Market Impact:</span>
              <span>{assumptions.marketImpact || "not_modeled"}</span>
            </div>
          </div>
        )}

        <p className="text-sm font-medium text-[hsl(var(--chart-4))]">
          ⚠️ Actual trading results may differ significantly from these simulated results.
        </p>
        
        <p className="text-xs text-muted-foreground">
          Simulation Version: {simulationVersion}
        </p>
      </AlertDescription>
    </Alert>
  );
}
