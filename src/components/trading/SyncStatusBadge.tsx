/**
 * Sync Status Badge - Compact indicator for sync state with click-to-view report
 * Shows: Success/Warning badge that opens detailed reconciliation report on click
 */
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, AlertTriangle, Info, ExternalLink } from "lucide-react";
import { SyncReconciliationReport } from "./SyncReconciliationReport";
import type { AggregationResult } from "@/services/binance/types";
import { formatCurrency } from "@/lib/formatters";

interface SyncStatusBadgeProps {
  result: AggregationResult | null;
  className?: string;
}

export function SyncStatusBadge({ result, className = '' }: SyncStatusBadgeProps) {
  const [showReport, setShowReport] = useState(false);

  if (!result) return null;

  const { stats, reconciliation } = result;
  const hasIssues = stats.invalidTrades > 0 || stats.warningTrades > 0 || !reconciliation.isReconciled;
  const isFullSuccess = !hasIssues && stats.validTrades > 0;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={isFullSuccess ? "outline" : "secondary"}
              className={`gap-1 cursor-pointer hover:bg-accent ${
                isFullSuccess ? 'text-profit border-profit/30' : 'text-warning'
              } ${className}`}
              onClick={() => setShowReport(true)}
            >
              {isFullSuccess ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              <span>{stats.validTrades} synced</span>
              <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2 text-xs">
              <p className="font-medium">Sync Complete - Click for details</p>
              <div className="space-y-1">
                <p>✓ {stats.validTrades} trades synced</p>
                {stats.invalidTrades > 0 && (
                  <p className="text-destructive">✗ {stats.invalidTrades} invalid</p>
                )}
                {stats.warningTrades > 0 && (
                  <p className="text-warning">⚠ {stats.warningTrades} with warnings</p>
                )}
                <p className={reconciliation.isReconciled ? 'text-profit' : 'text-warning'}>
                  P&L: {formatCurrency(reconciliation.aggregatedTotalPnl)}
                  {!reconciliation.isReconciled && ` (${reconciliation.differencePercent.toFixed(2)}% diff)`}
                </p>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <SyncReconciliationReport
        result={result}
        open={showReport}
        onOpenChange={setShowReport}
      />
    </>
  );
}
