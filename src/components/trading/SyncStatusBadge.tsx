/**
 * Sync Status Badge - Compact indicator for sync state with click-to-view report
 * Shows: Success/Warning badge that opens detailed reconciliation report on click
 * Includes: Sync Quality Score (Excellent/Good/Fair/Poor)
 */
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, AlertTriangle, ExternalLink, Star, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { SyncReconciliationReport } from "./SyncReconciliationReport";
import type { AggregationResult } from "@/services/binance/types";
import { formatCurrency } from "@/lib/formatters";
import { useSyncStore, selectLastSyncInfo, type SyncQualityScore } from "@/store/sync-store";

interface SyncStatusBadgeProps {
  result: AggregationResult | null;
  className?: string;
}

// Quality score colors and icons
const qualityConfig: Record<NonNullable<SyncQualityScore>, { 
  color: string; 
  bgColor: string;
  icon: typeof Star;
  label: string;
}> = {
  Excellent: { 
    color: 'text-profit', 
    bgColor: 'bg-profit/10',
    icon: Star,
    label: '95%+ match' 
  },
  Good: { 
    color: 'text-primary', 
    bgColor: 'bg-primary/10',
    icon: TrendingUp,
    label: '80-95% match' 
  },
  Fair: { 
    color: 'text-warning', 
    bgColor: 'bg-warning/10',
    icon: Minus,
    label: '60-80% match' 
  },
  Poor: { 
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10',
    icon: TrendingDown,
    label: '<60% match' 
  },
};

export function SyncStatusBadge({ result, className = '' }: SyncStatusBadgeProps) {
  const [showReport, setShowReport] = useState(false);
  const lastSyncInfo = useSyncStore(selectLastSyncInfo);

  if (!result) return null;

  const { stats, reconciliation } = result;
  const hasIssues = stats.invalidTrades > 0 || stats.warningTrades > 0 || !reconciliation.isReconciled;
  const isFullSuccess = !hasIssues && stats.validTrades > 0;

  // Get sync quality from result metadata or lastSyncInfo
  const syncQuality: SyncQualityScore = result._syncMeta?.syncQuality || lastSyncInfo?.quality || null;
  const matchRate = result._syncMeta?.matchRate || lastSyncInfo?.matchRate || 0;
  const qualityInfo = syncQuality ? qualityConfig[syncQuality] : null;
  const QualityIcon = qualityInfo?.icon || Star;

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1.5 ${className}`}>
              {/* Main sync status badge */}
              <Badge 
                variant={isFullSuccess ? "outline" : "secondary"}
                className={`gap-1 cursor-pointer hover:bg-accent ${
                  isFullSuccess ? 'text-profit border-profit/30' : 'text-warning'
                }`}
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

              {/* Sync Quality indicator */}
              {qualityInfo && (
                <Badge 
                  variant="outline"
                  className={`gap-1 ${qualityInfo.color} border-current/30 ${qualityInfo.bgColor}`}
                >
                  <QualityIcon className="h-3 w-3" />
                  <span className="text-xs">{syncQuality}</span>
                </Badge>
              )}
            </div>
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
              
              {/* Quality score details */}
              {syncQuality && qualityInfo && (
                <div className="pt-2 border-t border-border/50">
                  <p className={`font-medium ${qualityInfo.color}`}>
                    Sync Quality: {syncQuality}
                  </p>
                  <p className="text-muted-foreground">
                    Match Rate: {matchRate.toFixed(1)}% ({qualityInfo.label})
                  </p>
                </div>
              )}
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

/**
 * Compact quality indicator for use in other contexts
 */
export function SyncQualityIndicator({ 
  quality, 
  matchRate,
  showLabel = true,
  className = '' 
}: { 
  quality: SyncQualityScore; 
  matchRate?: number;
  showLabel?: boolean;
  className?: string;
}) {
  if (!quality) return null;

  const config = qualityConfig[quality];
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 ${config.color} ${className}`}>
            <Icon className="h-3.5 w-3.5" />
            {showLabel && <span className="text-xs font-medium">{quality}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Sync Quality: {quality}
            {matchRate !== undefined && ` (${matchRate.toFixed(1)}% match rate)`}
          </p>
          <p className="text-xs text-muted-foreground">{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
