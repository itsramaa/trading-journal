/**
 * Trading Opportunities Widget - AI-ranked setups based on technicals
 * Extracted from MarketData.tsx for reusability
 * Wrapped with ErrorBoundary for graceful API failure handling
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary, AsyncErrorFallback } from "@/components/ui/error-boundary";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TradingOpportunity } from "@/features/market-insight/types";
import { DISPLAY_LIMITS, BADGE_LABELS } from "@/lib/constants/market-config";

interface TradingOpportunitiesWidgetProps {
  opportunities: TradingOpportunity[];
  isLoading: boolean;
  error?: Error | null;
  selectedAsset?: string;
  isSelectedInWatchlist?: boolean;
  onRetry?: () => void;
  className?: string;
}

function TradingOpportunitiesContent({
  opportunities,
  isLoading,
  error,
  selectedAsset = '',
  isSelectedInWatchlist = true,
  onRetry,
  className,
}: TradingOpportunitiesWidgetProps) {
  // Handle async data errors
  if (error) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-primary" />
            Trading Opportunities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AsyncErrorFallback 
            error={error} 
            onRetry={onRetry}
            title="Failed to load opportunities"
            compact
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Trading Opportunities</CardTitle>
          </div>
          <Badge variant="outline">
            {!isSelectedInWatchlist && selectedAsset 
              ? BADGE_LABELS.formatAdditionalSymbol(selectedAsset) 
              : BADGE_LABELS.TOP_WATCHLIST}
          </Badge>
        </div>
        <CardDescription>
          AI-ranked setups based on technicals
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: DISPLAY_LIMITS.SKELETON_COUNT }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No trading opportunities found</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {opportunities.map((opp, idx) => (
              <div 
                key={idx} 
                className="p-3 rounded-lg border"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{opp.pair}</span>
                    <Badge 
                      variant={opp.direction === 'LONG' ? 'default' : opp.direction === 'SHORT' ? 'destructive' : 'secondary'}
                    >
                      {opp.direction}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold">{opp.confidence}%</span>
                    <span className="text-xs text-muted-foreground">conf.</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{opp.reason}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Exported component wrapped with ErrorBoundary
 */
export function TradingOpportunitiesWidget(props: TradingOpportunitiesWidgetProps) {
  return (
    <ErrorBoundary 
      title="Trading Opportunities" 
      onRetry={props.onRetry}
    >
      <TradingOpportunitiesContent {...props} />
    </ErrorBoundary>
  );
}
