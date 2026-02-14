/**
 * Trade History Content - Trade list rendering and infinite scroll
 */
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { TradeHistoryCard } from "@/components/trading/TradeHistoryCard";
import { TradeGalleryCard, TradeGalleryCardSkeleton } from "@/components/journal/TradeGalleryCard";
import { History, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { TradeEntry } from "@/hooks/use-trade-entries";
import { EMPTY_STATE_MESSAGES, VIEW_MODE_CONFIG, type ViewMode } from "@/lib/constants/trade-history";

interface TradeHistoryContentProps {
  viewMode: ViewMode;
  sortedTrades: TradeEntry[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  isFetching: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  isBinanceConnected: boolean;
  loadMoreRef: (node?: Element | null) => void;
  onDeleteTrade: (trade: TradeEntry) => void;
  onEnrichTrade: (trade: TradeEntry) => void;
  onQuickNote: (tradeId: string, note: string) => Promise<void>;
  onTagClick: (tag: string) => void;
  calculateRR: (trade: TradeEntry) => number;
  formatCurrency: (value: number) => string;
}

export function TradeHistoryContent({
  viewMode,
  sortedTrades,
  totalCount,
  isLoading,
  isError,
  error,
  isFetching,
  isFetchingNextPage,
  hasNextPage,
  isBinanceConnected,
  loadMoreRef,
  onDeleteTrade,
  onEnrichTrade,
  onQuickNote,
  onTagClick,
  calculateRR,
  formatCurrency,
}: TradeHistoryContentProps) {
  const navigate = useNavigate();

  const handleGalleryCardClick = (trade: TradeEntry) => {
    navigate(`/trading/${trade.id}`);
  };

  const renderTradeList = (trades: TradeEntry[]) => {
    if (trades.length === 0) {
      return (
        <EmptyState
          icon={History}
          title={EMPTY_STATE_MESSAGES.NO_TRADES.title}
          description={EMPTY_STATE_MESSAGES.NO_TRADES.description}
        />
      );
    }

    if (viewMode === 'gallery') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trades.map((entry) => (
            <TradeGalleryCard
              key={entry.id}
              trade={entry}
              onTradeClick={handleGalleryCardClick}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {trades.map((entry) => (
          <TradeHistoryCard
            key={entry.id}
            entry={entry}
            onDelete={onDeleteTrade}
            onEnrich={onEnrichTrade}
            onQuickNote={onQuickNote}
            onTagClick={onTagClick}
            calculateRR={calculateRR}
            formatCurrency={formatCurrency}
            isBinance={entry.source === 'binance'}
            showEnrichButton={true}
          />
        ))}
      </div>
    );
  };

  const renderLoadingSkeleton = () => {
    if (viewMode === 'gallery') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: VIEW_MODE_CONFIG.skeletonCount.gallery }).map((_, i) => (
            <TradeGalleryCardSkeleton key={i} />
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {Array.from({ length: VIEW_MODE_CONFIG.skeletonCount.list }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return renderLoadingSkeleton();
  }

  if (isError) {
    return (
      <EmptyState
        icon={History}
        title="Failed to load trades"
        description={error?.message || "An error occurred while loading trades."}
      />
    );
  }

  return (
    <>
      <div className={cn("transition-opacity duration-200", isFetching && !isLoading && "opacity-60")}>
        {renderTradeList(sortedTrades)}
      </div>

      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading more trades...</span>
          </div>
        ) : hasNextPage ? (
          <span className="text-sm text-muted-foreground">Scroll for more</span>
        ) : sortedTrades.length > 0 && totalCount > sortedTrades.length ? (
          <span className="text-sm text-muted-foreground">
            {sortedTrades.length} of {totalCount} trades loaded
          </span>
        ) : sortedTrades.length > 0 ? (
          <span className="text-sm text-muted-foreground">
            All {sortedTrades.length} trades loaded
          </span>
        ) : null}
      </div>
    </>
  );
}
