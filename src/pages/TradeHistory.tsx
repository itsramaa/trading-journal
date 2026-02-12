/**
 * Trade History - Standalone page for closed trades with full journaling
 * Features: Paginated data, List/Gallery toggle, Infinite scroll, AI Sorting, Enrichment
 * Architecture: Cursor-based pagination with 1-year default lookback
 * Full History: Triggers Binance sync for complete trading history
 */
import { useState, useMemo, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TradeHistoryCard } from "@/components/trading/TradeHistoryCard";
import { TradeGalleryCard, TradeGalleryCardSkeleton } from "@/components/journal/TradeGalleryCard";
import { FeeHistoryTab } from "@/components/trading/FeeHistoryTab";
import { FundingHistoryTab } from "@/components/trading/FundingHistoryTab";
import { History, Wifi, BookOpen, FileText, Loader2, List, LayoutGrid, Download, Percent, ArrowUpDown, RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { FilterActiveIndicator } from "@/components/ui/filter-active-indicator";
import { format } from "date-fns";
import { useTradeEntriesPaginated, type TradeFilters } from "@/hooks/use-trade-entries-paginated";
import { useTradeStats } from "@/hooks/use-trade-stats";
import { useTradeMode } from "@/hooks/use-trade-mode";
import type { TradeEntry } from "@/hooks/use-trade-entries";
import { useSoftDeleteTradeEntry } from "@/hooks/use-trade-entries-paginated";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useBinanceConnectionStatus } from "@/features/binance";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { useBinanceIncrementalSync } from "@/hooks/use-binance-incremental-sync";
import { BinanceFullSyncPanel } from "@/components/trading/BinanceFullSyncPanel";
import { useSyncStore, selectIsFullSyncRunning, selectFullSyncProgress } from "@/store/sync-store";
import { useTradeEnrichment } from "@/hooks/use-trade-enrichment";
import { useTradeEnrichmentBinance, useTradesNeedingEnrichmentCount, type EnrichmentProgress } from "@/hooks/use-trade-enrichment-binance";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useBinanceDataSource } from "@/hooks/use-binance-data-source";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { useQueryClient } from "@tanstack/react-query";
import { useTradeHistoryFilters, type ResultFilter, type DirectionFilter, type SessionFilter, type SortByAI } from "@/hooks/use-trade-history-filters";
import { TradeHistoryFilters, TradeEnrichmentDrawer } from "@/components/journal";
import type { UnifiedPosition } from "@/components/journal";
import { TRADE_HISTORY_CONFIG, EMPTY_STATE_MESSAGES, type ViewMode, VIEW_MODE_CONFIG } from "@/lib/constants/trade-history";
import { exportTradesCsv } from "@/lib/export/trade-export";
import { calculateRiskReward } from "@/lib/trade-utils";

// Use centralized config
const PAGE_SIZE = TRADE_HISTORY_CONFIG.pagination.defaultPageSize;

export default function TradeHistory() {
  // Use the centralized filter hook
  const {
    filters: {
      dateRange,
      resultFilter,
      directionFilter,
      sessionFilter,
      selectedStrategyIds,
      selectedPairs,
      sortByAI,
      showFullHistory,
    },
    setters: {
      setDateRange,
      setResultFilter,
      setDirectionFilter,
      setSessionFilter,
      setSelectedStrategyIds,
      setSelectedPairs,
      setSortByAI,
    },
    computed: {
      hasActiveFilters,
      activeFilterCount,
      effectiveStartDate,
      effectiveEndDate,
    },
    actions: {
      clearAllFilters,
    },
  } = useTradeHistoryFilters();
  
  // Re-enrichment states
  const [enrichmentProgress, setEnrichmentProgress] = useState<EnrichmentProgress | null>(null);
  
  // View mode state - default gallery for closed trades
  const [viewMode, setViewMode] = useState<ViewMode>(VIEW_MODE_CONFIG.default);
  
  // UI states
  const [deletingTrade, setDeletingTrade] = useState<TradeEntry | null>(null);
  const [enrichingPosition, setEnrichingPosition] = useState<UnifiedPosition | null>(null);

  const queryClient = useQueryClient();
  const { data: userSettings } = useUserSettings();
  const { tradeMode } = useTradeMode();
  const { data: strategies = [] } = useTradingStrategies();
  
  // Mode visibility
  const { showExchangeData } = useModeVisibility();
  
  // Binance connection — only relevant in Live mode
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isBinanceConnected = showExchangeData && (connectionStatus?.isConnected ?? false);
  
  // Global sync state from store (persists across navigation)
  const isFullSyncing = useSyncStore(selectIsFullSyncRunning);
  const syncProgress = useSyncStore(selectFullSyncProgress);
  
  // Incremental sync hook
  const { sync: triggerIncrementalSync, isLoading: isIncrementalSyncing, lastSyncTime, isStale } = useBinanceIncrementalSync({ autoSyncOnMount: true });
  
  // Data source filter based on user settings
  const { sourceFilter: binanceSourceFilter, useBinanceHistory } = useBinanceDataSource();
  
  // Trade enrichment
  const { enrichTrades, isEnriching } = useTradeEnrichmentBinance();
  const { data: tradesNeedingEnrichment = 0 } = useTradesNeedingEnrichmentCount();

  // Quick Note
  const { addQuickNote } = useTradeEnrichment();
  
  // Currency conversion hook
  const { format: formatCurrency, formatPnl, currency: displayCurrency } = useCurrencyConversion();
  
  const handleQuickNote = async (tradeId: string, note: string) => {
    await addQuickNote(tradeId, note);
    queryClient.invalidateQueries({ queryKey: ['trade-entries'] });
    queryClient.invalidateQueries({ queryKey: ['trade-entries-paginated'] });
  };

  // Currency helper - using the hook version now (displayCurrency and formatCurrency defined above)

  // Build paginated filters - memoized for stability
  // Session filter is now at DB level
  // Map 'profit' -> 'win' for DB query (UI uses 'profit', DB uses 'win')
  // Apply source filter based on use_binance_history setting
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
      // Apply source filter from user settings
      source: binanceSourceFilter,
      // C-05: Mode isolation
      tradeMode,
    };
  }, [effectiveStartDate, effectiveEndDate, selectedPairs, resultFilter, directionFilter, selectedStrategyIds, sessionFilter, binanceSourceFilter, tradeMode]);

  // Paginated query for trade list
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useTradeEntriesPaginated({ limit: PAGE_SIZE, filters: paginatedFilters });

  // Server-side stats (accurate totals regardless of pagination)
  const { data: tradeStats, isLoading: isStatsLoading } = useTradeStats({ filters: paginatedFilters });

  // Flatten all pages
  const allTrades = useMemo(() => 
    data?.pages.flatMap(page => page.trades) ?? [], 
    [data]
  );
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Sort by AI score (client-side after fetch)
  // Session filtering is now at DB level, so no client-side filter needed
  const sortedTrades = useMemo(() => {
    // Sort by AI
    if (sortByAI === 'none') return allTrades;
    return [...allTrades].sort((a, b) => {
      const scoreA = a.ai_quality_score ?? -1;
      const scoreB = b.ai_quality_score ?? -1;
      return sortByAI === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
  }, [allTrades, sortByAI]);

  // Separate by source for tabs
  const binanceTrades = useMemo(() => sortedTrades.filter(t => t.source === 'binance'), [sortedTrades]);
  const paperTrades = useMemo(() => sortedTrades.filter(t => t.source !== 'binance'), [sortedTrades]);

  // Get unique pairs for filter (from loaded trades)
  const availablePairs = useMemo(() => {
    const pairs = new Set(allTrades.map(t => t.pair));
    return Array.from(pairs).sort();
  }, [allTrades]);

  // Infinite scroll trigger
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.1,
    rootMargin: "100px",
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Use centralized R:R calculation
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

  // Convert TradeEntry to UnifiedPosition for enrichment drawer
  const handleEnrichTrade = (trade: TradeEntry) => {
    const unified: UnifiedPosition = {
      id: trade.id,
      symbol: trade.pair,
      direction: trade.direction as 'LONG' | 'SHORT',
      entryPrice: trade.entry_price,
      quantity: trade.quantity,
      source: (trade.source as 'binance' | 'paper') || 'paper',
      unrealizedPnL: trade.pnl || 0,
      leverage: 1,
      isReadOnly: trade.source === 'binance' || trade.trade_mode === 'live',
      originalData: trade,
    };
    setEnrichingPosition(unified);
  };

  // Use server-side stats for accurate totals (not dependent on pagination)
  const totalPnLGross = tradeStats?.totalPnlGross ?? 0;
  const totalPnLNet = tradeStats?.totalPnlNet ?? 0;
  const winRate = tradeStats?.winRate ?? 0;
  const serverTotalTrades = tradeStats?.totalTrades ?? 0;

  // Render trade list based on view mode
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {trades.map((entry) => (
            <TradeGalleryCard 
              key={entry.id} 
              trade={entry}
              onTradeClick={handleEnrichTrade}
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
            onDelete={setDeletingTrade}
            onEnrich={handleEnrichTrade}
            onQuickNote={handleQuickNote}
            calculateRR={calculateRR}
            formatCurrency={formatCurrency}
            isBinance={entry.source === 'binance'}
            showEnrichButton={true}
          />
        ))}
      </div>
    );
  };

  // Loading skeleton based on view mode
  const renderLoadingSkeleton = () => {
    if (viewMode === 'gallery') {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <PageHeader
          icon={History}
          title="Trade History"
          description="Review and enrich your closed trades for journaling"
        >
          
          {/* Stats Summary + Export */}
          <div className="flex items-center gap-6">
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {sortedTrades.length}
                  {serverTotalTrades > sortedTrades.length && (
                    <span className="text-sm text-muted-foreground font-normal">/{serverTotalTrades}</span>
                  )}
                </div>
                <div className="text-muted-foreground">
                  {hasActiveFilters ? 'Filtered' : 'Trades'}
                </div>
              </div>
              {/* P&L with clear terminology */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="text-center cursor-help">
                      <div className={`text-2xl font-bold ${totalPnLGross >= 0 ? 'text-profit' : 'text-loss'}`}>
                        {formatCurrency(totalPnLGross)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        Gross P&L
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <div className="space-y-1">
                      <p><strong>Gross P&L</strong>: {formatCurrency(totalPnLGross)}</p>
                      <p className="text-xs text-muted-foreground">Before fees (realized_pnl from Binance)</p>
                      <div className="border-t pt-1 mt-1">
                        <p><strong>Net P&L</strong>: {formatCurrency(totalPnLNet)}</p>
                        <p className="text-xs text-muted-foreground">After commission & funding fees</p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="text-center">
                <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
                <div className="text-muted-foreground">Win Rate</div>
              </div>
              {/* Needs Enrichment Indicator */}
              {tradesNeedingEnrichment > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="text-center px-3 py-1 rounded-md bg-destructive/10 border border-destructive/20">
                        <div className="text-lg font-bold text-destructive flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {tradesNeedingEnrichment}
                        </div>
                        <div className="text-xs text-destructive/80">Incomplete</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{tradesNeedingEnrichment} trades are missing entry/exit prices.</p>
                      <p className="text-xs text-muted-foreground mt-1">Click "Enrich Trades" to fetch accurate data from Binance.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            {/* Export Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => exportTradesCsv(sortedTrades)}
              disabled={sortedTrades.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </PageHeader>

        {/* Filter Active Indicator */}
        {hasActiveFilters && (
          <FilterActiveIndicator
            isActive={hasActiveFilters}
            dateRange={dateRange}
            filterCount={activeFilterCount}
            onClear={clearAllFilters}
          />
        )}

        {/* Filters */}
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
                totalCount={totalCount}
                filteredCount={sortedTrades.length}
              />
              
              {/* View Toggle & Sync Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t">
                {/* Sync & Enrich Buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* New Aggregated Full Sync Panel */}
                  <BinanceFullSyncPanel isBinanceConnected={isBinanceConnected} compact />
                  
                  {/* Incremental Sync Status */}
                  {isBinanceConnected && lastSyncTime && !isFullSyncing && !isIncrementalSyncing && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={triggerIncrementalSync}
                            className="gap-2 text-muted-foreground"
                          >
                            <RefreshCw className="h-3 w-3" />
                            <span className="text-xs">
                              Last sync: {format(lastSyncTime, 'HH:mm')}
                              {isStale && <span className="text-warning ml-1">(stale)</span>}
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Incremental sync - fetches only new trades since last sync</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  {/* Incremental Sync Loading */}
                  {isIncrementalSyncing && (
                    <Badge variant="secondary" className="gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Syncing new trades...
                    </Badge>
                  )}
                  
                  {/* Enrichment Progress */}
                  {isEnriching && enrichmentProgress && (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          {enrichmentProgress.message || 'Enriching trades...'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Progress value={enrichmentProgress.percent ?? 0} className="w-32 h-2" />
                          <span className="text-xs text-muted-foreground">
                            {(enrichmentProgress.percent ?? 0).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Re-Enrich Button - only show if there are trades needing enrichment */}
                  {!isEnriching && isBinanceConnected && tradesNeedingEnrichment > 0 && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => enrichTrades({ 
                              daysBack: 730, 
                              onProgress: setEnrichmentProgress 
                            })}
                            className="gap-2"
                          >
                            <RefreshCw className="h-4 w-4" />
                            Enrich {tradesNeedingEnrichment} Trades
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Fetch accurate entry/exit prices from Binance for trades with missing data</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  
                  {/* All enriched badge */}
                  {!isEnriching && isBinanceConnected && tradesNeedingEnrichment === 0 && binanceTrades.length > 0 && (
                    <Badge variant="outline" className="text-xs gap-1 text-profit">
                      <CheckCircle className="h-3 w-3" />
                      All trades enriched
                    </Badge>
                  )}
                </div>
                
                {/* View Mode Toggle */}
                <ToggleGroup 
                  type="single" 
                  value={viewMode} 
                  onValueChange={(v) => v && setViewMode(v as ViewMode)}
                  className="border rounded-md"
                >
                  <ToggleGroupItem value="list" aria-label="List view" className="gap-1.5 px-3">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">List</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="gallery" aria-label="Gallery view" className="gap-1.5 px-3">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline text-sm">Gallery</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trade History Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" aria-hidden="true" />
              Closed Trades
              {isBinanceConnected && (
                <Badge variant="outline" className="text-xs gap-1 ml-2">
                  <Wifi className="h-3 w-3 text-profit" aria-hidden="true" />
                  Binance
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              renderLoadingSkeleton()
            ) : isError ? (
              <EmptyState
                icon={History}
                title="Failed to load trades"
                description={error?.message || "An error occurred while loading trades."}
              />
            ) : (
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-4 flex-wrap h-auto gap-1">
                  <TabsTrigger value="all" className="gap-2">
                    All
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{sortedTrades.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="binance" className="gap-2">
                    <Wifi className="h-4 w-4" aria-hidden="true" />
                    Binance
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{binanceTrades.length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="paper" className="gap-2">
                    <BookOpen className="h-4 w-4" aria-hidden="true" />
                    Paper
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{paperTrades.length}</Badge>
                  </TabsTrigger>
                  
                  {/* Fees Tab - requires Binance */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <TabsTrigger 
                            value="fees" 
                            className="gap-2"
                            disabled={!isBinanceConnected}
                          >
                            <Percent className="h-4 w-4" aria-hidden="true" />
                            Fees
                          </TabsTrigger>
                        </span>
                      </TooltipTrigger>
                      {!isBinanceConnected && (
                        <TooltipContent>
                          <p>Requires Binance connection</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  
                  {/* Funding Tab - requires Binance */}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <TabsTrigger 
                            value="funding" 
                            className="gap-2"
                            disabled={!isBinanceConnected}
                          >
                            <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
                            Funding
                          </TabsTrigger>
                        </span>
                      </TooltipTrigger>
                      {!isBinanceConnected && (
                        <TooltipContent>
                          <p>Requires Binance connection</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </TabsList>

                {/* All Trades */}
                <TabsContent value="all">
                  {renderTradeList(sortedTrades)}
                </TabsContent>
                
                {/* Binance Trades */}
                <TabsContent value="binance">
                  {binanceTrades.length === 0 ? (
                    <EmptyState
                      icon={Wifi}
                      title="No Binance trades"
                      description={isBinanceConnected 
                        ? "No Binance trades match your filters." 
                        : "Connect Binance in Settings to import trades."}
                    />
                  ) : renderTradeList(binanceTrades)}
                </TabsContent>

                {/* Paper Trades */}
                <TabsContent value="paper">
                  {paperTrades.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title="No paper trades"
                      description="No paper trades match your filters."
                    />
                  ) : renderTradeList(paperTrades)}
                </TabsContent>
                
                {/* Fees Tab Content */}
                <TabsContent value="fees">
                  <FeeHistoryTab 
                    isConnected={isBinanceConnected}
                    dateRange={dateRange}
                    selectedPairs={selectedPairs}
                    showFullHistory={showFullHistory}
                  />
                </TabsContent>
                
                {/* Funding Tab Content */}
                <TabsContent value="funding">
                  <FundingHistoryTab 
                    isConnected={isBinanceConnected}
                    dateRange={dateRange}
                    selectedPairs={selectedPairs}
                    showFullHistory={showFullHistory}
                  />
                </TabsContent>
              </Tabs>
            )}
            
            {/* Infinite Scroll Trigger */}
            <div ref={loadMoreRef} className="py-4 flex justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading more trades...</span>
                </div>
              ) : hasNextPage ? (
                <span className="text-sm text-muted-foreground">
                  Scroll for more
                </span>
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
          </CardContent>
        </Card>

        {/* Trade Enrichment Drawer */}
        <TradeEnrichmentDrawer
          position={enrichingPosition}
          open={!!enrichingPosition}
          onOpenChange={(open) => !open && setEnrichingPosition(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
            queryClient.invalidateQueries({ queryKey: ["trade-entries-paginated"] });
          }}
        />

        {/* Delete Confirmation */}
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
    </DashboardLayout>
  );
}
