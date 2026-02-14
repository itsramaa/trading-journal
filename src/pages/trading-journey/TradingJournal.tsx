/**
 * Trading Journal - Trade Management Hub
 * Tabs: Pending, Active, Closed (Trade History)
 */
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useInView } from "react-intersection-observer";
import { useModeVisibility } from "@/hooks/use-mode-visibility";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { QuickTip } from "@/components/ui/onboarding-tooltip";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { FilterActiveIndicator } from "@/components/ui/filter-active-indicator";
import { 
  BookOpen, 
  Wand2, 
  Wifi, 
  Circle, 
  Clock, 
  LayoutGrid,
  List,
  History,
  Download,
} from "lucide-react";
import type { ViewMode } from "@/lib/constants/trade-history";
import { TRADE_HISTORY_CONFIG, VIEW_MODE_CONFIG } from "@/lib/constants/trade-history";
import { useTradeEntries, useDeleteTradeEntry, useClosePosition, useUpdateTradeEntry, TradeEntry } from "@/hooks/use-trade-entries";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { useTradeEntriesPaginated, useSoftDeleteTradeEntry, type TradeFilters } from "@/hooks/use-trade-entries-paginated";
import { useTradeStats } from "@/hooks/use-trade-stats";
import { useTradeHistoryFilters } from "@/hooks/use-trade-history-filters";
import { useTradeMode } from "@/hooks/use-trade-mode";
import { useBinancePositions, useBinanceBalance, useBinanceConnectionStatus, useBinanceOpenOrders } from "@/features/binance";

import { useSyncStore, selectIsFullSyncRunning } from "@/store/sync-store";
import { useTradeEnrichment } from "@/hooks/use-trade-enrichment";
import { useTradesNeedingEnrichmentCount } from "@/hooks/use-trade-enrichment-binance";
import { useBinanceDataSource } from "@/hooks/use-binance-data-source";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { TradeEntryWizard } from "@/components/trade/entry/TradeEntryWizard";
import { useQueryClient } from "@tanstack/react-query";
import { usePostTradeAnalysis } from "@/hooks/use-post-trade-analysis";
import { calculateRiskReward } from "@/lib/trade-utils";
import { 
  TradeSummaryStats, 
  ClosePositionDialog,
  EditPositionDialog,
  AllPositionsTable,
  TradeEnrichmentDrawer,
  BinanceOpenOrdersTable,
  TradeHistoryFilters,
} from "@/components/journal";
import type { UnifiedPosition } from "@/components/journal";
import { TradeHistoryStats } from "@/components/history/TradeHistoryStats";
import { TradeHistoryToolbar } from "@/components/history/TradeHistoryToolbar";
import { TradeHistoryContent } from "@/components/history/TradeHistoryContent";
import { TradingOnboardingTour } from "@/components/trading/TradingOnboardingTour";
import { Link } from "react-router-dom";

const PAGE_SIZE = TRADE_HISTORY_CONFIG.pagination.defaultPageSize;

const closePositionSchema = z.object({
  exit_price: z.coerce.number().positive("Exit price must be greater than zero."),
  fees: z.coerce.number().optional(),
  notes: z.string().optional(),
});

const editPositionSchema = z.object({
  stop_loss: z.coerce.number().optional(),
  take_profit: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type ClosePositionFormValues = z.infer<typeof closePositionSchema>;
type EditPositionFormValues = z.infer<typeof editPositionSchema>;

export default function TradingJournal() {
  // URL-driven tab state
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'active';
  const setActiveTab = (val: string) => {
    setSearchParams(val === 'active' ? {} : { tab: val }, { replace: true });
  };

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [deletingTrade, setDeletingTrade] = useState<TradeEntry | null>(null);
  const [closingPosition, setClosingPosition] = useState<TradeEntry | null>(null);
  const [editingPosition, setEditingPosition] = useState<TradeEntry | null>(null);
  const [enrichingPosition, setEnrichingPosition] = useState<UnifiedPosition | null>(null);
  const viewMode = (searchParams.get('view') || 'gallery') as ViewMode;
  const setViewMode = (v: ViewMode) => {
    const newParams = new URLSearchParams(searchParams);
    if (v === 'gallery') { newParams.delete('view'); } else { newParams.set('view', v); }
    setSearchParams(newParams, { replace: true });
  };

  const queryClient = useQueryClient();
  const { format: formatCurrency } = useCurrencyConversion();
  const { tradeMode } = useTradeMode();
  // M-27: Filter trades by active trade_mode
  const { data: trades, isLoading: tradesLoading } = useModeFilteredTrades();
  const { showExchangeData, showExchangeOrders, showExchangeBalance, canCreateManualTrade, showPaperData } = useModeVisibility();
  
  // Binance data — only fetch when in Live mode
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: binancePositions = [], isLoading: binancePositionsLoading } = useBinancePositions();
  const { data: binanceOpenOrders = [], isLoading: binanceOrdersLoading } = useBinanceOpenOrders();
  const { data: binanceBalance } = useBinanceBalance();
  const isBinanceConnected = showExchangeData && (connectionStatus?.isConnected ?? false);
  
  const deleteTrade = useDeleteTradeEntry();
  const closePosition = useClosePosition();
  const updateTrade = useUpdateTradeEntry();
  const { analyzeClosedTrade } = usePostTradeAnalysis();

  const closeForm = useForm<ClosePositionFormValues>({
    resolver: zodResolver(closePositionSchema),
    defaultValues: {},
  });

  const editForm = useForm<EditPositionFormValues>({
    resolver: zodResolver(editPositionSchema),
    defaultValues: {},
  });

  // Separate open and closed trades
  const openPositions = useMemo(() => trades?.filter(t => t.status === 'open') || [], [trades]);
  const closedTrades = useMemo(() => trades?.filter(t => t.status === 'closed') || [], [trades]);

  // Calculate P&L summaries
  const totalUnrealizedPnL = useMemo(() => openPositions.reduce((sum, t) => sum + (t.pnl || 0), 0), [openPositions]);
  const totalRealizedPnL = useMemo(() => closedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0), [closedTrades]);

  // ===== Closed Tab (Trade History) hooks =====
  const {
    filters: { dateRange, resultFilter, directionFilter, sessionFilter, selectedStrategyIds, selectedPairs, selectedTags, sortByAI, showFullHistory },
    setters: { setDateRange, setResultFilter, setDirectionFilter, setSessionFilter, setSelectedStrategyIds, setSelectedPairs, setSelectedTags, setSortByAI },
    computed: { hasActiveFilters, activeFilterCount, effectiveStartDate, effectiveEndDate },
    actions: { clearAllFilters },
  } = useTradeHistoryFilters();

  const { data: strategies = [] } = useTradingStrategies();
  const isFullSyncing = useSyncStore(selectIsFullSyncRunning);
  const { sourceFilter: binanceSourceFilter } = useBinanceDataSource();
  const { data: tradesNeedingEnrichment = 0 } = useTradesNeedingEnrichmentCount();
  const { addQuickNote } = useTradeEnrichment();
  const softDelete = useSoftDeleteTradeEntry();

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
    data: paginatedData, fetchNextPage, hasNextPage, isFetchingNextPage, isFetching, isLoading: isPaginatedLoading, isError, error: paginatedError,
  } = useTradeEntriesPaginated({ limit: PAGE_SIZE, filters: paginatedFilters });

  const { data: tradeStats, isLoading: isStatsLoading } = useTradeStats({ filters: paginatedFilters });

  const allClosedTrades = useMemo(() => paginatedData?.pages.flatMap(page => page.trades) ?? [], [paginatedData]);
  const closedTotalCount = paginatedData?.pages[0]?.totalCount ?? 0;

  const sortedClosedTrades = useMemo(() => {
    if (sortByAI === 'none') return allClosedTrades;
    return [...allClosedTrades].sort((a, b) => {
      const scoreA = a.ai_quality_score ?? -1;
      const scoreB = b.ai_quality_score ?? -1;
      return sortByAI === 'asc' ? scoreA - scoreB : scoreB - scoreA;
    });
  }, [allClosedTrades, sortByAI]);

  const availablePairs = useMemo(() => Array.from(new Set(allClosedTrades.map(t => t.pair))).sort(), [allClosedTrades]);

  // Infinite scroll for closed tab
  const { ref: loadMoreRef, inView } = useInView({ threshold: 0.1, rootMargin: "100px" });
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleQuickNote = async (tradeId: string, note: string) => {
    await addQuickNote(tradeId, note);
    queryClient.invalidateQueries({ queryKey: ['trade-entries'] });
    queryClient.invalidateQueries({ queryKey: ['trade-entries-paginated'] });
  };

  const handleDeleteClosedTrade = async () => {
    if (!deletingTrade) return;
    try {
      // Use soft delete for closed trades, hard delete for open
      if (deletingTrade.status === 'closed') {
        await softDelete.mutateAsync(deletingTrade.id);
      } else {
        await deleteTrade.mutateAsync(deletingTrade.id);
      }
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
      stopLoss: trade.stop_loss,
      takeProfit: trade.take_profit,
      originalData: trade,
    };
    setEnrichingPosition(unified);
  };

  const totalPnLGross = tradeStats?.totalPnlGross ?? 0;
  const totalPnLNet = tradeStats?.totalPnlNet ?? 0;
  const winRate = tradeStats?.winRate ?? 0;
  const serverTotalTrades = tradeStats?.totalTrades ?? 0;

  // ===== Active/Pending tab handlers =====
  const handleClosePosition = async (values: ClosePositionFormValues) => {
    if (!closingPosition) return;
    
    const priceDiff = closingPosition.direction === "LONG"
      ? values.exit_price - closingPosition.entry_price
      : closingPosition.entry_price - values.exit_price;
    
    const pnl = priceDiff * closingPosition.quantity - (values.fees || 0);
    const tradeId = closingPosition.id;

    try {
      await closePosition.mutateAsync({
        id: tradeId,
        exit_price: values.exit_price,
        pnl,
        fees: values.fees,
        notes: values.notes,
      });
      setClosingPosition(null);
      closeForm.reset();
      analyzeClosedTrade(tradeId).catch(console.error);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleEditPosition = async (values: EditPositionFormValues) => {
    if (!editingPosition) return;
    
    try {
      await updateTrade.mutateAsync({
        id: editingPosition.id,
        stop_loss: values.stop_loss,
        take_profit: values.take_profit,
        notes: values.notes,
      });
      setEditingPosition(null);
      editForm.reset();
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleOpenEditDialog = (position: TradeEntry) => {
    editForm.reset({
      stop_loss: position.stop_loss || undefined,
      take_profit: position.take_profit || undefined,
      notes: position.notes || undefined,
    });
    setEditingPosition(position);
  };

  if (tradesLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
          <p className="text-muted-foreground">Document every trade for continuous improvement</p>
        </div>
        <MetricsGridSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <PageHeader
          icon={BookOpen}
          title="Trading Journal"
          description="Document every trade for continuous improvement"
        >
          <Badge variant="outline" className="text-xs font-normal">Basic Mode</Badge>
          {canCreateManualTrade ? (
            <Button variant="default" onClick={() => setIsWizardOpen(true)} aria-label="Open trade entry wizard">
              <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
              New Trade
            </Button>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Live Mode — trades via exchange
            </Badge>
          )}
        </PageHeader>

        {/* First-time user onboarding tour */}
        <TradingOnboardingTour onNewTrade={() => setIsWizardOpen(true)} />
        
        {/* Pro Tip - below header */}
        <QuickTip storageKey="trading_journal_tip">
          <strong>Pro tip:</strong> Document every trade with detailed notes and tag your strategies. 
          Focus on quality setups and review your patterns to improve your trading edge.
        </QuickTip>
        
        {/* Trade Entry Wizard Dialog — Paper mode only */}
        {canCreateManualTrade && (
          <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
              <TradeEntryWizard
                onClose={() => setIsWizardOpen(false)}
                onComplete={() => {
                  setIsWizardOpen(false);
                  queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* P&L Summary Cards (Operational context - NOT analytics metrics) */}
        <TradeSummaryStats
          openPositionsCount={showPaperData ? openPositions.length : 0}
          binancePositionsCount={showExchangeData ? binancePositions.filter(p => p.positionAmt !== 0).length : 0}
          unrealizedPnL={showPaperData ? totalUnrealizedPnL : 0}
          binanceUnrealizedPnL={showExchangeBalance ? binanceBalance?.totalUnrealizedProfit : undefined}
          closedTradesCount={closedTrades.length}
          realizedPnL={totalRealizedPnL}
          isBinanceConnected={isBinanceConnected}
        />

        {/* Trade Management Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
                Trade Management
                {isBinanceConnected && (
                  <Badge variant="outline" className="text-xs gap-1 ml-2">
                    <Wifi className="h-3 w-3 text-profit" aria-hidden="true" />
                    Binance Connected
                  </Badge>
                )}
              </CardTitle>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(v) => v && setViewMode(v as ViewMode)}
                size="sm"
              >
                <ToggleGroupItem value="gallery" aria-label="Gallery view">
                  <LayoutGrid className="h-4 w-4" />
                </ToggleGroupItem>
                <ToggleGroupItem value="list" aria-label="List view">
                  <List className="h-4 w-4" />
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Pending</span>
                  {(() => {
                    const paperPending = showPaperData ? openPositions.filter(p => !p.entry_price || p.entry_price === 0).length : 0;
                    const exchangePending = showExchangeOrders ? binanceOpenOrders.length : 0;
                    const total = paperPending + exchangePending;
                    return total > 0 ? <Badge variant="secondary" className="ml-1 h-5 px-1.5">{total}</Badge> : null;
                  })()}
                </TabsTrigger>
                <TabsTrigger value="active" className="gap-2">
                  <Circle className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Active</span>
                  {(() => {
                    const paperActive = showPaperData ? openPositions.filter(p => p.entry_price && p.entry_price > 0).length : 0;
                    const exchangeActive = showExchangeData ? binancePositions.filter(p => p.positionAmt !== 0).length : 0;
                    const total = paperActive + exchangeActive;
                    return total > 0 ? <Badge variant="secondary" className="ml-1 h-5 px-1.5">{total}</Badge> : null;
                  })()}
                </TabsTrigger>
                <TabsTrigger value="closed" className="gap-2">
                  <History className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Closed</span>
                  {closedTotalCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{closedTotalCount}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              {/* Pending Orders Tab */}
              <TabsContent value="pending" className="mt-4 space-y-6">
                {/* Binance Open Orders — Live mode only */}
                {showExchangeOrders && isBinanceConnected && (
                  <BinanceOpenOrdersTable
                    orders={binanceOpenOrders}
                    isLoading={binanceOrdersLoading}
                    formatCurrency={formatCurrency}
                  />
                )}

                {/* Paper Pending Trades — Paper mode only */}
                {showPaperData && (
                  <div className="space-y-3">
                    <AllPositionsTable
                      paperPositions={openPositions.filter(p => !p.entry_price || p.entry_price === 0)}
                      binancePositions={[]}
                      isLoading={tradesLoading}
                      isBinanceConnected={false}
                      onEnrich={setEnrichingPosition}
                      onEdit={handleOpenEditDialog}
                      onClose={(pos) => {
                        setClosingPosition(pos);
                        closeForm.reset();
                      }}
                      onDelete={setDeletingTrade}
                      formatCurrency={formatCurrency}
                    />
                  </div>
                )}
              </TabsContent>
              
              {/* Active Positions Tab */}
              <TabsContent value="active" className="mt-4">
                <AllPositionsTable
                  paperPositions={showPaperData ? openPositions.filter(p => p.entry_price && p.entry_price > 0) : []}
                  binancePositions={showExchangeData ? binancePositions : []}
                  isLoading={tradesLoading || binancePositionsLoading}
                  isBinanceConnected={isBinanceConnected}
                  onEnrich={setEnrichingPosition}
                  onEdit={handleOpenEditDialog}
                  onClose={(pos) => {
                    setClosingPosition(pos);
                    closeForm.reset();
                  }}
                  onDelete={setDeletingTrade}
                  formatCurrency={formatCurrency}
                  viewMode={viewMode}
                />
              </TabsContent>

              {/* Closed Trades Tab (Trade History) */}
              <TabsContent value="closed" className="mt-4 space-y-4">
                {/* Stats & Export */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <TradeHistoryStats
                    isLoading={isStatsLoading && !tradeStats}
                    displayedCount={sortedClosedTrades.length}
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

                {hasActiveFilters && (
                  <FilterActiveIndicator
                    isActive={hasActiveFilters}
                    dateRange={dateRange}
                    filterCount={activeFilterCount}
                    onClear={clearAllFilters}
                  />
                )}

                {/* Filters */}
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
                  totalCount={closedTotalCount}
                  filteredCount={sortedClosedTrades.length}
                />

                {/* Toolbar */}
                <TradeHistoryToolbar
                  isFullSyncing={isFullSyncing}
                  isBinanceConnected={isBinanceConnected}
                  tradesNeedingEnrichment={tradesNeedingEnrichment}
                />

                {/* Trade list with infinite scroll */}
                <TradeHistoryContent
                  viewMode={viewMode}
                  sortedTrades={sortedClosedTrades}
                  totalCount={closedTotalCount}
                  isLoading={isPaginatedLoading}
                  isError={isError}
                  error={paginatedError}
                  isFetching={isFetching}
                  isFetchingNextPage={isFetchingNextPage}
                  hasNextPage={!!hasNextPage}
                  isBinanceConnected={isBinanceConnected}
                  loadMoreRef={loadMoreRef}
                  onDeleteTrade={setDeletingTrade}
                  onEnrichTrade={handleEnrichTrade}
                  onQuickNote={handleQuickNote}
                  onTagClick={(tag) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
                  calculateRR={calculateRiskReward}
                  formatCurrency={formatCurrency}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>


        {/* Close Position Dialog */}
        <ClosePositionDialog
          position={closingPosition}
          onOpenChange={() => setClosingPosition(null)}
          form={closeForm}
          onSubmit={handleClosePosition}
          isPending={closePosition.isPending}
          formatCurrency={formatCurrency}
        />

        {/* Edit Position Dialog */}
        <EditPositionDialog
          position={editingPosition}
          onOpenChange={() => setEditingPosition(null)}
          form={editForm}
          onSubmit={handleEditPosition}
          isPending={updateTrade.isPending}
          formatCurrency={formatCurrency}
        />

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
          onConfirm={handleDeleteClosedTrade}
        />
      </div>
    </div>
  );
}
