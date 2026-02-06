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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { History, Wifi, BookOpen, RefreshCw, FileText, Loader2, List, LayoutGrid, Calendar, Download, CloudDownload, Percent, ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { useTradeEntriesPaginated, type TradeFilters } from "@/hooks/use-trade-entries-paginated";
import type { TradeEntry } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useBinanceConnectionStatus } from "@/features/binance";
import { useBinanceAutoSync } from "@/hooks/use-binance-auto-sync";
import { useBinanceFullSync } from "@/hooks/use-binance-full-sync";
import { useTradeEnrichment } from "@/hooks/use-trade-enrichment";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useQueryClient } from "@tanstack/react-query";
import { DateRange } from "@/components/trading/DateRangeFilter";
import { TradeHistoryFilters, TradeEnrichmentDrawer, type ResultFilter, type DirectionFilter } from "@/components/journal";
import type { UnifiedPosition } from "@/components/journal";

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
  const [sortByAI, setSortByAI] = useState<'none' | 'asc' | 'desc'>('none');
  const [showFullHistory, setShowFullHistory] = useState(false);
  
  // Full sync states
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  
  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  
  // UI states
  const [deletingTrade, setDeletingTrade] = useState<TradeEntry | null>(null);
  const [enrichingPosition, setEnrichingPosition] = useState<UnifiedPosition | null>(null);

  const queryClient = useQueryClient();
  const { data: userSettings } = useUserSettings();
  const { data: strategies = [] } = useTradingStrategies();
  
  // Binance connection
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isBinanceConnected = connectionStatus?.isConnected ?? false;
  
  // Auto-sync (30 days by default)
  const { syncNow, isSyncing, lastSyncTime, pendingRecords } = useBinanceAutoSync({
    autoSyncOnMount: false,
    enablePeriodicSync: false,
  });
  
  // Full history sync (up to 1 year)
  const { syncFullHistory, isSyncing: isFullSyncing, lastResult: fullSyncResult } = useBinanceFullSync();

  // Quick Note
  const { addQuickNote } = useTradeEnrichment();
  
  const handleQuickNote = async (tradeId: string, note: string) => {
    await addQuickNote(tradeId, note);
    queryClient.invalidateQueries({ queryKey: ['trade-entries'] });
    queryClient.invalidateQueries({ queryKey: ['trade-entries-paginated'] });
  };

  // Currency helper
  const displayCurrency = userSettings?.default_currency || 'USD';
  const formatCurrency = (value: number) => formatCurrencyUtil(value, displayCurrency);

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

  // Sort by AI score (client-side after fetch)
  const sortedTrades = useMemo(() => {
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
              displayCurrency={displayCurrency}
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
                totalCount={totalCount}
                filteredCount={sortedTrades.length}
              />
              
              {/* Time Range & View Toggle Row */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t">
                {/* Time Range Toggle with Full Sync */}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  
                  {isFullSyncing ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Syncing Binance history... {syncProgress.toFixed(0)}%
                      </span>
                      <Progress value={syncProgress} className="w-24 h-2" />
                    </div>
                  ) : (
                    <>
                      <Label htmlFor="full-history" className="text-sm text-muted-foreground cursor-pointer">
                        {showFullHistory ? "Showing full history" : "Last 12 months"}
                      </Label>
                      <Switch
                        id="full-history"
                        checked={showFullHistory}
                        onCheckedChange={(checked) => {
                          if (checked && isBinanceConnected && !showFullHistory) {
                            // Show confirmation dialog for first-time full sync
                            setShowSyncConfirm(true);
                          } else {
                            setShowFullHistory(checked);
                          }
                        }}
                        disabled={isFullSyncing}
                      />
                      {isBinanceConnected && showFullHistory && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <CloudDownload className="h-3 w-3" />
                          Includes Binance
                        </Badge>
                      )}
                      {fullSyncResult && fullSyncResult.synced > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          +{fullSyncResult.synced} synced
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
                  <Wifi className="h-3 w-3 text-green-500" aria-hidden="true" />
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
                  <div className="space-y-4">
                    {isBinanceConnected && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-center gap-2 text-sm">
                          <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <span className="text-muted-foreground">
                            {lastSyncTime 
                              ? `Last sync: ${format(lastSyncTime, 'HH:mm:ss')}`
                              : 'Auto-sync enabled'}
                          </span>
                          {pendingRecords > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {pendingRecords} pending
                            </Badge>
                          )}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={syncNow}
                          disabled={isSyncing}
                          aria-label="Sync trades from Binance"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                          {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </Button>
                      </div>
                    )}
                    
                    {binanceTrades.length === 0 ? (
                      <EmptyState
                        icon={Wifi}
                        title="No Binance trades"
                        description={isBinanceConnected 
                          ? "No Binance trades match your filters." 
                          : "Connect Binance in Settings to import trades."}
                      />
                    ) : renderTradeList(binanceTrades)}
                  </div>
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
                  <FeeHistoryTab isConnected={isBinanceConnected} />
                </TabsContent>
                
                {/* Funding Tab Content */}
                <TabsContent value="funding">
                  <FundingHistoryTab isConnected={isBinanceConnected} />
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
                Sync Full Binance History?
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>
                  This will fetch your complete trading history from Binance (up to 1 year). 
                  The process may take a few minutes depending on your trading volume.
                </p>
                <p className="text-sm text-muted-foreground">
                  • Only new trades will be added (duplicates are skipped)
                  <br />
                  • Your existing journal entries won't be affected
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShowSyncConfirm(false)}>
                Just Local Data
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={async () => {
                  setShowSyncConfirm(false);
                  setShowFullHistory(true);
                  setSyncProgress(0);
                  
                  try {
                    await syncFullHistory({
                      monthsBack: 12,
                      onProgress: setSyncProgress,
                    });
                  } finally {
                    setSyncProgress(0);
                  }
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Sync from Binance
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
