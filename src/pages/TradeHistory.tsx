/**
 * Trade History - Standalone page for closed trades with full journaling
 * Features: Paginated data, List/Gallery toggle, Infinite scroll, AI Sorting, Enrichment
 * Architecture: Cursor-based pagination with 1-year default lookback
 * Full History: Triggers Binance sync for complete trading history
 */
import { useState, useMemo, useEffect } from "react";
import { subYears } from "date-fns";
import { useInView } from "react-intersection-observer";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TradeHistoryCard } from "@/components/trading/TradeHistoryCard";
import { TradeGalleryCard, TradeGalleryCardSkeleton } from "@/components/journal/TradeGalleryCard";
import { FeeHistoryTab } from "@/components/trading/FeeHistoryTab";
import { FundingHistoryTab } from "@/components/trading/FundingHistoryTab";
import { History, Wifi, BookOpen, FileText, Loader2, List, LayoutGrid, Download, CloudDownload, Percent, ArrowUpDown } from "lucide-react";
import { FilterActiveIndicator } from "@/components/ui/filter-active-indicator";
import { format } from "date-fns";
import { useTradeEntriesPaginated, type TradeFilters } from "@/hooks/use-trade-entries-paginated";
import type { TradeEntry } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useBinanceConnectionStatus } from "@/features/binance";
import { useBinanceFullSync, type FullSyncProgress } from "@/hooks/use-binance-full-sync";
import { useTradeEnrichment } from "@/hooks/use-trade-enrichment";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { useQueryClient } from "@tanstack/react-query";
import { DateRange } from "@/components/trading/DateRangeFilter";
import { TradeHistoryFilters, TradeEnrichmentDrawer, type ResultFilter, type DirectionFilter, type SessionFilter } from "@/components/journal";
import type { UnifiedPosition } from "@/components/journal";
import { getTradeSession, TradingSession } from "@/lib/session-utils";

type ViewMode = 'list' | 'gallery';

// Default: 1 year lookback
const DEFAULT_START_DATE = subYears(new Date(), 1).toISOString().split('T')[0];
const PAGE_SIZE = 50;

export default function TradeHistory() {
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<string[]>([]);
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all');
  const [sortByAI, setSortByAI] = useState<'none' | 'asc' | 'desc'>('none');
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  // Full sync states
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [syncProgress, setSyncProgress] = useState<FullSyncProgress | null>(null);
  
  // View mode state - default gallery for closed trades
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  
  // UI states
  const [deletingTrade, setDeletingTrade] = useState<TradeEntry | null>(null);
  const [enrichingPosition, setEnrichingPosition] = useState<UnifiedPosition | null>(null);

  const queryClient = useQueryClient();
  const { data: userSettings } = useUserSettings();
  const { data: strategies = [] } = useTradingStrategies();
  
  // Binance connection
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isBinanceConnected = connectionStatus?.isConnected ?? false;
  
  // Full history sync
  const { syncFullHistory, isSyncing: isFullSyncing, lastResult: fullSyncResult } = useBinanceFullSync();

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
  const paginatedFilters: TradeFilters = useMemo(() => ({
    status: 'closed' as const,
    startDate: showFullHistory ? undefined : (dateRange.from?.toISOString().split('T')[0] || DEFAULT_START_DATE),
    endDate: dateRange.to?.toISOString().split('T')[0],
    pairs: selectedPairs.length > 0 ? selectedPairs : undefined,
    result: resultFilter !== 'all' ? resultFilter as TradeFilters['result'] : undefined,
    direction: directionFilter !== 'all' ? directionFilter : undefined,
    strategyIds: selectedStrategyIds.length > 0 ? selectedStrategyIds : undefined,
  }), [dateRange, selectedPairs, resultFilter, directionFilter, selectedStrategyIds, showFullHistory]);

  // Paginated query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useTradeEntriesPaginated({ limit: PAGE_SIZE, filters: paginatedFilters });

  // Flatten all pages
  const allTrades = useMemo(() => 
    data?.pages.flatMap(page => page.trades) ?? [], 
    [data]
  );
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Sort by AI score (client-side after fetch) and filter by session
  const sortedTrades = useMemo(() => {
    let filtered = allTrades;
    
    // Filter by session (client-side since session is computed from trade_date)
    if (sessionFilter !== 'all') {
      filtered = filtered.filter(trade => {
        const session = getTradeSession({
          trade_date: trade.trade_date,
          entry_datetime: null,
          market_context: trade.market_context as { session?: { current: TradingSession } } | null,
        });
        return session === sessionFilter;
      });
    }
    
    // Sort by AI
    if (sortByAI === 'none') return filtered;
    return [...filtered].sort((a, b) => {
      const scoreA = a.ai_quality_score ?? -1;
      const scoreB = b.ai_quality_score ?? -1;
      return sortByAI === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
  }, [allTrades, sortByAI, sessionFilter]);

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

  // Calculate R:R
  const calculateRR = (trade: TradeEntry): number => {
    if (!trade.stop_loss || !trade.entry_price || !trade.exit_price) return 0;
    const risk = Math.abs(trade.entry_price - trade.stop_loss);
    if (risk === 0) return 0;
    const reward = Math.abs(trade.exit_price - trade.entry_price);
    return reward / risk;
  };

  const handleDeleteTrade = async () => {
    if (!deletingTrade) return;
    try {
      // Use soft delete from paginated hook exports
      const { error } = await import("@/integrations/supabase/client").then(m => 
        m.supabase.from("trade_entries").delete().eq("id", deletingTrade.id)
      );
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
      queryClient.invalidateQueries({ queryKey: ["trade-entries-paginated"] });
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
      originalData: trade,
    };
    setEnrichingPosition(unified);
  };

  // Stats based on loaded trades
  const totalPnL = sortedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const winCount = sortedTrades.filter(t => (t.realized_pnl || 0) > 0).length;
  const winRate = sortedTrades.length > 0 ? (winCount / sortedTrades.length) * 100 : 0;

  // Filter state detection
  const hasActiveFilters = useMemo(() => 
    dateRange.from !== null || 
    dateRange.to !== null ||
    resultFilter !== 'all' ||
    directionFilter !== 'all' ||
    sessionFilter !== 'all' ||
    selectedStrategyIds.length > 0 ||
    selectedPairs.length > 0,
    [dateRange, resultFilter, directionFilter, sessionFilter, selectedStrategyIds, selectedPairs]
  );

  const activeFilterCount = useMemo(() => 
    [
      resultFilter !== 'all',
      directionFilter !== 'all',
      sessionFilter !== 'all',
      selectedStrategyIds.length > 0,
      selectedPairs.length > 0,
    ].filter(Boolean).length,
    [resultFilter, directionFilter, sessionFilter, selectedStrategyIds, selectedPairs]
  );

  const handleClearAllFilters = () => {
    setDateRange({ from: null, to: null });
    setResultFilter('all');
    setDirectionFilter('all');
    setSessionFilter('all');
    setSelectedStrategyIds([]);
    setSelectedPairs([]);
    setSortByAI('none');
  };

  // Render trade list based on view mode
  const renderTradeList = (trades: TradeEntry[]) => {
    if (trades.length === 0) {
      return (
        <EmptyState
          icon={History}
          title="No trades found"
          description="No trades match your current filters. Try adjusting the filters above."
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
          {Array.from({ length: 8 }).map((_, i) => (
            <TradeGalleryCardSkeleton key={i} />
          ))}
        </div>
      );
    }
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
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
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <History className="h-6 w-6 text-primary" aria-hidden="true" />
              Trade History
            </h1>
            <p className="text-muted-foreground">Review and enrich your closed trades for journaling</p>
          </div>
          
          {/* Stats Summary + Export */}
          <div className="flex items-center gap-6">
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {sortedTrades.length}
                  {totalCount > sortedTrades.length && (
                    <span className="text-sm text-muted-foreground font-normal">/{totalCount}</span>
                  )}
                </div>
                <div className="text-muted-foreground">Trades</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-profit' : 'text-loss'}`}>
                  {formatCurrency(totalPnL)}
                </div>
                <div className="text-muted-foreground">P&L</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
                <div className="text-muted-foreground">Win Rate</div>
              </div>
            </div>
            
            {/* Export Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                // Export current filtered trades as CSV
                const csvHeader = 'Date,Pair,Direction,Entry,Exit,P&L,Result,Notes\n';
                const csvRows = sortedTrades.map(t => 
                  `${t.trade_date},${t.pair},${t.direction},${t.entry_price},${t.exit_price || ''},${t.realized_pnl || t.pnl || 0},${t.result || ''},${(t.notes || '').replace(/,/g, ';')}`
                ).join('\n');
                const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `trade-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              disabled={sortedTrades.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filter Active Indicator */}
        {hasActiveFilters && (
          <FilterActiveIndicator
            isActive={hasActiveFilters}
            dateRange={dateRange}
            filterCount={activeFilterCount}
            onClear={handleClearAllFilters}
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
                {/* Sync Full History Button */}
                <div className="flex items-center gap-3">
                  {isFullSyncing ? (
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          {syncProgress?.phase === 'enriching' 
                            ? 'Enriching trades with accurate prices...'
                            : `Syncing Binance history... (${syncProgress?.phase || 'starting'})`
                          }
                        </span>
                        <div className="flex items-center gap-2">
                          <Progress value={syncProgress?.percent ?? 0} className="w-32 h-2" />
                          <span className="text-xs text-muted-foreground">
                            {(syncProgress?.percent ?? 0).toFixed(0)}%
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {syncProgress?.recordsFetched ? `${syncProgress.recordsFetched} records fetched` : ''}
                          {syncProgress?.enrichedCount ? ` • ${syncProgress.enrichedCount} enriched` : ''}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <>
                      {isBinanceConnected && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowSyncConfirm(true)}
                          className="gap-2"
                        >
                          <CloudDownload className="h-4 w-4" />
                          Sync Full History
                        </Button>
                      )}
                      {fullSyncResult && fullSyncResult.synced > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          +{fullSyncResult.synced} synced
                          {fullSyncResult.enriched > 0 && ` (${fullSyncResult.enriched} enriched)`}
                        </Badge>
                      )}
                    </>
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
          description={`Are you sure you want to delete this ${deletingTrade?.pair} trade? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDeleteTrade}
        />
        
        {/* Full Sync Confirmation Dialog */}
        <AlertDialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <CloudDownload className="h-5 w-5 text-primary" />
                Sync Full Binance History
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3">
                <p>
                  This will fetch your <strong>complete trading history</strong> from Binance 
                  (up to 2 years or entire account history).
                </p>
                <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                  <p className="flex items-center gap-2">
                    <span className="text-profit">✓</span> Fetches all trades (2+ years history)
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-profit">✓</span> <strong>Auto-enriches</strong> with accurate entry/exit prices
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-profit">✓</span> Captures direction (LONG/SHORT), quantity, fees
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="text-profit">✓</span> Duplicates automatically skipped
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Process may take a few minutes depending on trading volume.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowSyncConfirm(false)}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={async () => {
                  setShowSyncConfirm(false);
                  setSyncProgress({ phase: 'fetching', chunk: 0, totalChunks: 0, page: 0, recordsFetched: 0, recordsToInsert: 0, enrichedCount: 0, percent: 0 });
                  
                  try {
                    await syncFullHistory({
                      fetchAll: true,
                      onProgress: setSyncProgress,
                    });
                    // After successful sync, show full history
                    setShowFullHistory(true);
                  } finally {
                    setSyncProgress(null);
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Sync All History
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
