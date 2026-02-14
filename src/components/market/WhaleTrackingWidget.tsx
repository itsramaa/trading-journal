/**
 * Whale Tracking Widget - Volume-based whale activity detection
 * Extracted from MarketData.tsx for reusability
 * Wrapped with ErrorBoundary for graceful API failure handling
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary, AsyncErrorFallback } from "@/components/ui/error-boundary";
import { Activity } from "lucide-react";
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
      <Card className={className} role="region" aria-label="Whale Tracking">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            Whale Tracking
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
    <Card className={className} role="region" aria-label="Whale Tracking">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Whale Tracking</CardTitle>
          </div>
          <Badge variant="outline">
            {!isSelectedInWatchlist && selectedAsset 
              ? BADGE_LABELS.formatAdditionalSymbol(selectedAsset) 
              : BADGE_LABELS.TOP_WATCHLIST}
          </Badge>
        </div>
        <CardDescription>
          Volume-based whale activity detection
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
            <p className="text-sm">No whale activity detected</p>
          </div>
        ) : (
          whaleData.map((whale) => (
            <div 
              key={`${whale.asset}-${whale.signal}`} 
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  getWhaleSignalColor(whale.signal)
                )} />
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{whale.asset}</Badge>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs",
                        whale.signal === 'ACCUMULATION' && "bg-profit/20 text-profit",
                        whale.signal === 'DISTRIBUTION' && "bg-loss/20 text-loss"
                      )}
                    >
                      {whale.signal}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                    {whale.description}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-medium">
                  {whale.volumeChange24h > 0 ? '+' : ''}{whale.volumeChange24h.toFixed(1)}%
                </span>
                <p className="text-xs text-muted-foreground">
                  {whale.confidence}% conf.
                </p>
              </div>
            </div>
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
      title="Whale Tracking" 
      onRetry={props.onRetry}
    >
      <WhaleTrackingContent {...props} />
    </ErrorBoundary>
  );
}
