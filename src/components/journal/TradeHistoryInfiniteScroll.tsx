/**
 * Trade History with Infinite Scroll
 * Uses cursor-based pagination for efficient loading of large trade histories
 */
import { useEffect, useRef, useCallback } from "react";
import { useInView } from "react-intersection-observer";
import { Loader2 } from "lucide-react";
import { CryptoIcon } from "@/components/ui/crypto-icon";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useTradeEntriesPaginated, 
  type TradeFilters 
} from "@/hooks/use-trade-entries-paginated";
import type { TradeEntry } from "@/hooks/use-trade-entries";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { getTradeSession, SESSION_LABELS } from "@/lib/session-utils";

interface TradeHistoryInfiniteScrollProps {
  filters?: TradeFilters;
  onTradeClick?: (trade: TradeEntry) => void;
  pageSize?: number;
}

export function TradeHistoryInfiniteScroll({
  filters,
  onTradeClick,
  pageSize = 50,
}: TradeHistoryInfiniteScrollProps) {
  const { formatPnl } = useCurrencyConversion();
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useTradeEntriesPaginated({ limit: pageSize, filters });

  // Intersection observer for infinite scroll
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
  });

  // Fetch next page when loader comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all pages into single array
  const allTrades = data?.pages.flatMap(page => page.trades) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <TradeRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-destructive text-center">
            Failed to load trades: {error?.message ?? "Unknown error"}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (allTrades.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            No trades found. Start logging your trades to see them here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>Showing {allTrades.length} of {totalCount} trades</span>
        {hasNextPage && (
          <span className="text-xs">Scroll for more</span>
        )}
      </div>

      {/* Trade list */}
      <div className="space-y-2">
        {allTrades.map((trade) => (
          <TradeRow 
            key={trade.id} 
            trade={trade} 
            onClick={() => onTradeClick?.(trade)} 
          />
        ))}
      </div>

      {/* Load more trigger */}
      <div ref={loadMoreRef} className="py-4 flex justify-center">
        {isFetchingNextPage ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading more trades...</span>
          </div>
        ) : hasNextPage ? (
          <span className="text-sm text-muted-foreground">
            Scroll to load more
          </span>
        ) : allTrades.length > 0 ? (
          <span className="text-sm text-muted-foreground">
            All trades loaded
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface TradeRowProps {
  trade: TradeEntry;
  onClick?: () => void;
}

function TradeRow({ trade, onClick }: TradeRowProps) {
  const { formatPnl } = useCurrencyConversion();
  const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
  const isWin = pnl > 0;
  const isLoss = pnl < 0;
  const session = getTradeSession(trade);

  return (
    <Card 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={onClick}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Pair & Direction */}
          <div className="flex items-center gap-3 min-w-0">
            <CryptoIcon symbol={trade.pair} size={24} />
            <div>
              <div className="font-medium">{trade.pair}</div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(trade.trade_date), "MMM d, yyyy HH:mm")}
              </div>
            </div>
            <Badge 
              variant={trade.direction === 'LONG' ? 'default' : 'secondary'}
              className="shrink-0"
            >
              {trade.direction}
            </Badge>
          </div>

          {/* Center: Status & Strategy & Session */}
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <Badge variant={trade.status === 'open' ? 'outline' : 'secondary'}>
              {trade.status}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {SESSION_LABELS[session]}
            </Badge>
            {trade.strategies && trade.strategies.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {trade.strategies[0].name}
                {trade.strategies.length > 1 && ` +${trade.strategies.length - 1}`}
              </Badge>
            )}
            {trade.source === 'binance' && (
              <Badge variant="outline" className="text-xs">
                Binance
              </Badge>
            )}
          </div>

          {/* Right: P&L */}
          <div className="text-right shrink-0">
            <div className={`font-semibold ${
              isWin ? 'text-profit' : isLoss ? 'text-loss' : ''
            }`}>
              {formatPnl(pnl)}
            </div>
            {trade.result && (
              <Badge 
                variant={trade.result === 'win' ? 'default' : trade.result === 'loss' ? 'destructive' : 'secondary'}
                className="text-xs mt-1"
              >
                {trade.result}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TradeRowSkeleton() {
  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-28" />
            </div>
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

export default TradeHistoryInfiniteScroll;
