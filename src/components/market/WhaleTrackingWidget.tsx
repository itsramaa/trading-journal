/**
 * Volume Anomaly Detector - Statistical volume spike detection (>95th percentile)
 * Renamed from "Whale Tracking" — honest labeling of volume-based detection
 * Wrapped with ErrorBoundary for graceful API failure handling
 */
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ErrorBoundary, AsyncErrorFallback } from "@/components/ui/error-boundary";
import { Activity, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WhaleActivity, WhaleSignal } from "@/features/market-insight/types";
import { DISPLAY_LIMITS, BADGE_LABELS } from "@/lib/constants/market-config";

interface WhaleTrackingWidgetProps {
  whaleData: WhaleActivity[];
  isLoading: boolean;
  error?: Error | null;
  selectedAsset?: string;
  isSelectedInWatchlist?: boolean;
  onRetry?: () => void;
  className?: string;
}

function getSignalLabel(signal: WhaleSignal): string {
  switch (signal) {
    case 'ACCUMULATION': return 'HIGH VOL BULLISH';
    case 'DISTRIBUTION': return 'HIGH VOL BEARISH';
    default: return 'NORMAL';
  }
}

function getWhaleSignalColor(signal: WhaleSignal) {
  switch (signal) {
    case 'ACCUMULATION': return 'bg-profit';
    case 'DISTRIBUTION': return 'bg-loss';
    default: return 'bg-muted-foreground';
  }
}

function WhaleTrackingContent({
  whaleData,
  isLoading,
  error,
  selectedAsset = '',
  isSelectedInWatchlist = true,
  onRetry,
  className,
}: WhaleTrackingWidgetProps) {
  // Handle async data errors
  if (error) {
    return (
      <Card className={className} role="region" aria-label="Volume Anomaly Detector">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Volume Anomaly Detector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncErrorFallback 
            error={error} 
            onRetry={onRetry}
            title="Failed to load whale data"
            compact
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className} role="region" aria-label="Volume Anomaly Detector">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Volume Anomaly Detector</CardTitle>
          </div>
          <Badge variant="outline">
            {!isSelectedInWatchlist && selectedAsset 
              ? BADGE_LABELS.formatAdditionalSymbol(selectedAsset) 
              : BADGE_LABELS.TOP_WATCHLIST}
          </Badge>
        </div>
        <CardDescription>
          Statistical volume spike detection (&gt;95th percentile)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: DISPLAY_LIMITS.SKELETON_COUNT }).map((_, i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : whaleData.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No volume anomalies detected</p>
          </div>
        ) : (
          whaleData.map((whale) => (
            <Collapsible key={`${whale.asset}-${whale.signal}`}>
              <div className="rounded-lg border overflow-hidden">
                <CollapsibleTrigger className="flex items-center justify-between p-3 w-full hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      getWhaleSignalColor(whale.signal)
                    )} />
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{whale.asset}</Badge>
                        <Badge 
                          variant="secondary" 
                          className={cn(
                            "text-[10px]",
                            whale.signal === 'ACCUMULATION' && "bg-profit/20 text-profit",
                            whale.signal === 'DISTRIBUTION' && "bg-loss/20 text-loss"
                          )}
                        >
                          {getSignalLabel(whale.signal)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                        {whale.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-medium">
                        {whale.volumeChange24h > 0 ? '+' : ''}{whale.volumeChange24h.toFixed(1)}%
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {whale.confidence}% conf.
                      </p>
                    </div>
                    <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform duration-200" />
                  </div>
                </CollapsibleTrigger>
                {/* Method transparency - Phase 2A */}
                {(whale.method || whale.thresholds) && (
                  <CollapsibleContent>
                    <div className="px-3 pb-3 pt-1 border-t bg-muted/30 space-y-1">
                      {whale.method && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0">Method:</span>
                          <span className="font-mono text-foreground">{whale.method}</span>
                        </div>
                      )}
                      {whale.thresholds && (
                        <div className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground shrink-0">Threshold:</span>
                          <span className="font-mono text-foreground">{whale.thresholds}</span>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                )}
              </div>
            </Collapsible>
          ))
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Exported component wrapped with ErrorBoundary
 */
export function WhaleTrackingWidget(props: WhaleTrackingWidgetProps) {
  return (
    <ErrorBoundary 
      title="Volume Anomaly Detector" 
      onRetry={props.onRetry}
    >
      <WhaleTrackingContent {...props} />
    </ErrorBoundary>
  );
}
