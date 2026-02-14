/**
 * Trade History - Standalone page for closed trades with full journaling
 * Architecture: Orchestrator pattern with sub-components
 */
import { useState, useMemo, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterActiveIndicator } from "@/components/ui/filter-active-indicator";
import { History, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TradeHistoryFilters, TradeEnrichmentDrawer } from "@/components/journal";
import type { UnifiedPosition } from "@/components/journal";
import { TradeHistoryStats } from "@/components/history/TradeHistoryStats";
import { TradeHistoryToolbar } from "@/components/history/TradeHistoryToolbar";
import { TradeHistoryContent } from "@/components/history/TradeHistoryContent";
import { useTradeEntriesPaginated, type TradeFilters } from "@/hooks/use-trade-entries-paginated";
import { useTradeStats } from "@/hooks/use-trade-stats";
import { useTradeMode } from "@/hooks/use-trade-mode";
import type { TradeEntry } from "@/hooks/use-trade-entries";
import { useSoftDeleteTradeEntry } from "@/hooks/use-trade-entries-paginated";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useBinanceConnectionStatus } from "@/features/binance";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { useSyncStore, selectIsFullSyncRunning } from "@/store/sync-store";
import { useTradeEnrichment } from "@/hooks/use-trade-enrichment";
import { useTradesNeedingEnrichmentCount } from "@/hooks/use-trade-enrichment-binance";
import { useBinanceDataSource } from "@/hooks/use-binance-data-source";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { useQueryClient } from "@tanstack/react-query";
import { useTradeHistoryFilters } from "@/hooks/use-trade-history-filters";
import { calculateRiskReward } from "@/lib/trade-utils";
import { TRADE_HISTORY_CONFIG, type ViewMode, VIEW_MODE_CONFIG } from "@/lib/constants/trade-history";
import { Link } from "react-router-dom";

const PAGE_SIZE = TRADE_HISTORY_CONFIG.pagination.defaultPageSize;

export default function TradeHistory() {
  const {
    filters: { dateRange, resultFilter, directionFilter, sessionFilter, selectedStrategyIds, selectedPairs, selectedTags, sortByAI, showFullHistory },
    setters: { setDateRange, setResultFilter, setDirectionFilter, setSessionFilter, setSelectedStrategyIds, setSelectedPairs, setSelectedTags, setSortByAI },
    computed: { hasActiveFilters, activeFilterCount, effectiveStartDate, effectiveEndDate },
    actions: { clearAllFilters },
  } = useTradeHistoryFilters();

  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE_CONFIG.default);
  const [deletingTrade, setDeletingTrade] = useState<TradeEntry | null>(null);
  const [enrichingPosition, setEnrichingPosition] = useState<UnifiedPosition | null>(null);

  const queryClient = useQueryClient();
  const { tradeMode } = useTradeMode();
  const { data: strategies = [] } = useTradingStrategies();
  const { showExchangeData } = useModeVisibility();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isBinanceConnected = showExchangeData && (connectionStatus?.isConnected ?? false);
  const isFullSyncing = useSyncStore(selectIsFullSyncRunning);
  const { sourceFilter: binanceSourceFilter } = useBinanceDataSource();
  const { data: tradesNeedingEnrichment = 0 } = useTradesNeedingEnrichmentCount();
  const { addQuickNote } = useTradeEnrichment();
  const { format: formatCurrency } = useCurrencyConversion();

  const handleQuickNote = async (tradeId: string, note: string) => {
    await addQuickNote(tradeId, note);
    queryClient.invalidateQueries({ queryKey: ['trade-entries'] });
    queryClient.invalidateQueries({ queryKey: ['trade-entries-paginated'] });
  };

  // Build paginated filters
  const paginatedFilters: TradeFilters = useMemo(() => {
    const mappedResult = resultFilter === 'profit' ? 'win' : resultFilter;
    return {
      status: 'closed' as const,
      startDate: effectiveStartDate,
      endDate: effectiveEndDate,
      pairs: selectedPairs.length > 0 ? selectedPairs : undefined,
      result: mappedResult !== 'all' ? mappedResult as TradeFilters['result'] : undefined,
      direction: directionFilter !== 'all' ? directionFilter : undefined,
      strategyIds: selectedStrategyIds.length > 0 ? selectedStrategyIds : undefined,
      session: sessionFilter !== 'all' ? sessionFilter as TradeFilters['session'] : undefined,
      selectedTags: selectedTags.length > 0 ? selectedTags : undefined,
      source: binanceSourceFilter,
      tradeMode,
    };
  }, [effectiveStartDate, effectiveEndDate, selectedPairs, resultFilter, directionFilter, selectedStrategyIds, sessionFilter, selectedTags, binanceSourceFilter, tradeMode]);

  const {
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching, isLoading, isError, error,
  } = useTradeEntriesPaginated({ limit: PAGE_SIZE, filters: paginatedFilters });

  const { data: tradeStats, isLoading: isStatsLoading } = useTradeStats({ filters: paginatedFilters });

  const allTrades = useMemo(() => data?.pages.flatMap(page => page.trades) ?? [], [data]);
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  const sortedTrades = useMemo(() => {
    if (sortByAI === 'none') return allTrades;
    return [...allTrades].sort((a, b) => {
      const scoreA = a.ai_quality_score ?? -1;
      const scoreB = b.ai_quality_score ?? -1;
      return sortByAI === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
  }, [allTrades, sortByAI]);

  const availablePairs = useMemo(() => Array.from(new Set(allTrades.map(t => t.pair))).sort(), [allTrades]);

  // Infinite scroll
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1, rootMargin: "100px" });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const calculateRR = calculateRiskReward;
  const softDelete = useSoftDeleteTradeEntry();

  const handleDeleteTrade = async () => {
    if (!deletingTrade) return;
    try {
      await softDelete.mutateAsync(deletingTrade.id);
      setDeletingTrade(null);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleEnrichTrade = (trade: TradeEntry) => {
    const unified: UnifiedPosition = {
      id: trade.id,
      symbol: trade.pair,
      direction: trade.direction as 'LONG' | 'SHORT',
      entryPrice: trade.entry_price,
      quantity: trade.quantity,
      source: (trade.source as 'binance' | 'paper') || 'paper',
      unrealizedPnL: trade.pnl || 0,
      leverage: (trade as any).leverage || 1,
      isReadOnly: trade.source === 'binance' || trade.trade_mode === 'live',
      originalData: trade,
    };
    setEnrichingPosition(unified);
  };

  const totalPnLGross = tradeStats?.totalPnlGross ?? 0;
  const totalPnLNet = tradeStats?.totalPnlNet ?? 0;
  const winRate = tradeStats?.winRate ?? 0;
  const serverTotalTrades = tradeStats?.totalTrades ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader icon={History} title="Trade History" description="Review and enrich your closed trades for journaling">
        <div className="flex items-center gap-6">
          <Badge variant={tradeMode === 'paper' ? 'secondary' : 'default'} className="text-xs font-normal">
            {tradeMode === 'paper' ? 'Paper Mode' : 'Live Mode'}
          </Badge>
          <TradeHistoryStats
            isLoading={isStatsLoading && !tradeStats}
            displayedCount={sortedTrades.length}
            serverTotalTrades={serverTotalTrades}
            totalPnLGross={totalPnLGross}
            totalPnLNet={totalPnLNet}
            winRate={winRate}
            tradesNeedingEnrichment={tradesNeedingEnrichment}
            hasActiveFilters={hasActiveFilters}
            formatCurrency={formatCurrency}
          />
          <Button variant="outline" size="sm" asChild>
            <Link to="/export?tab=journal">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Link>
          </Button>
        </div>
      </PageHeader>

      {hasActiveFilters && (
        <FilterActiveIndicator
          isActive={hasActiveFilters}
          dateRange={dateRange}
          filterCount={activeFilterCount}
          onClear={clearAllFilters}
        />
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <TradeHistoryFilters
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              resultFilter={resultFilter}
              onResultFilterChange={setResultFilter}
              directionFilter={directionFilter}
              onDirectionFilterChange={setDirectionFilter}
              strategies={strategies}
              selectedStrategyIds={selectedStrategyIds}
              onStrategyIdsChange={setSelectedStrategyIds}
              availablePairs={availablePairs}
              selectedPairs={selectedPairs}
              onPairsChange={setSelectedPairs}
              sortByAI={sortByAI}
              onSortByAIChange={setSortByAI}
              sessionFilter={sessionFilter}
              onSessionFilterChange={setSessionFilter}
              selectedTags={selectedTags}
              onTagsChange={setSelectedTags}
              totalCount={totalCount}
              filteredCount={sortedTrades.length}
            />
            <TradeHistoryToolbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              isFullSyncing={isFullSyncing}
              isBinanceConnected={isBinanceConnected}
              tradesNeedingEnrichment={tradesNeedingEnrichment}
            />
          </div>
        </CardContent>
      </Card>

      <TradeHistoryContent
        viewMode={viewMode}
        sortedTrades={sortedTrades}
        totalCount={totalCount}
        isLoading={isLoading}
        isError={isError}
        error={error}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        hasNextPage={!!hasNextPage}
        isBinanceConnected={isBinanceConnected}
        loadMoreRef={loadMoreRef}
        onDeleteTrade={setDeletingTrade}
        onEnrichTrade={handleEnrichTrade}
        onQuickNote={handleQuickNote}
        onTagClick={(tag) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
        calculateRR={calculateRR}
        formatCurrency={formatCurrency}
      />

      <TradeEnrichmentDrawer
        position={enrichingPosition}
        open={!!enrichingPosition}
        onOpenChange={(open) => !open && setEnrichingPosition(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
          queryClient.invalidateQueries({ queryKey: ["trade-entries-paginated"] });
        }}
      />

      <ConfirmDialog
        open={!!deletingTrade}
        onOpenChange={(open) => !open && setDeletingTrade(null)}
        title="Delete Trade Entry"
        description={`Are you sure you want to delete this ${deletingTrade?.pair} trade? You can recover it later from Settings > Deleted Trades.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteTrade}
      />
    </div>
  );
}
