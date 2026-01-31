/**
 * Trade History - Standalone page for closed trades with full journaling
 * Features: Comprehensive Filters, AI Sorting, Enrichment Drawer, Screenshot management, Import
 */
import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { TradeHistoryCard } from "@/components/trading/TradeHistoryCard";
import { BinanceTradeHistory } from "@/components/trading/BinanceTradeHistory";
import { BinanceIncomeHistory } from "@/components/trading/BinanceIncomeHistory";
import { History, Wifi, BookOpen, RefreshCw, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { useTradeEntries, useDeleteTradeEntry, TradeEntry } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useBinanceConnectionStatus } from "@/features/binance";
import { useBinanceAutoSync } from "@/hooks/use-binance-auto-sync";
import { filterTradesByDateRange, filterTradesByStrategies } from "@/lib/trading-calculations";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { useUserSettings } from "@/hooks/use-user-settings";
import { useQueryClient } from "@tanstack/react-query";
import { DateRange } from "@/components/trading/DateRangeFilter";
import { TradeHistoryFilters, TradeEnrichmentDrawer, type ResultFilter, type DirectionFilter } from "@/components/journal";
import type { UnifiedPosition } from "@/components/journal";

export default function TradeHistory() {
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<string[]>([]);
  const [sortByAI, setSortByAI] = useState<'none' | 'asc' | 'desc'>('none');
  
  // UI states
  const [deletingTrade, setDeletingTrade] = useState<TradeEntry | null>(null);
  const [enrichingPosition, setEnrichingPosition] = useState<UnifiedPosition | null>(null);

  const queryClient = useQueryClient();
  const { data: userSettings } = useUserSettings();
  const { data: trades, isLoading } = useTradeEntries();
  const { data: strategies = [] } = useTradingStrategies();
  const deleteTrade = useDeleteTradeEntry();
  
  // Binance connection
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const isBinanceConnected = connectionStatus?.isConnected ?? false;
  
  // Auto-sync
  const { syncNow, isSyncing, lastSyncTime, pendingRecords } = useBinanceAutoSync({
    autoSyncOnMount: false,
    enablePeriodicSync: false,
  });

  // Currency helper
  const displayCurrency = userSettings?.default_currency || 'USD';
  const formatCurrency = (value: number) => formatCurrencyUtil(value, displayCurrency);

  // Separate closed trades by source
  const closedTrades = useMemo(() => trades?.filter(t => t.status === 'closed') || [], [trades]);
  const binanceTrades = useMemo(() => closedTrades.filter(t => t.source === 'binance'), [closedTrades]);
  const paperTrades = useMemo(() => closedTrades.filter(t => t.source !== 'binance'), [closedTrades]);

  // Get unique pairs from closed trades for filter
  const availablePairs = useMemo(() => {
    const pairs = new Set(closedTrades.map(t => t.pair));
    return Array.from(pairs).sort();
  }, [closedTrades]);

  // Comprehensive filter and sort function
  const filterAndSortTrades = (tradesToFilter: typeof closedTrades) => {
    let filtered = tradesToFilter;

    // Date range filter
    filtered = filterTradesByDateRange(filtered, dateRange.from, dateRange.to);
    
    // Strategy filter
    filtered = filterTradesByStrategies(filtered, selectedStrategyIds);
    
    // Result filter (profit/loss/breakeven)
    if (resultFilter === 'profit') {
      filtered = filtered.filter(t => (t.realized_pnl || 0) > 0);
    } else if (resultFilter === 'loss') {
      filtered = filtered.filter(t => (t.realized_pnl || 0) < 0);
    } else if (resultFilter === 'breakeven') {
      filtered = filtered.filter(t => (t.realized_pnl || 0) === 0);
    }

    // Direction filter
    if (directionFilter !== 'all') {
      filtered = filtered.filter(t => t.direction === directionFilter);
    }

    // Pair filter
    if (selectedPairs.length > 0) {
      filtered = filtered.filter(t => selectedPairs.includes(t.pair));
    }
    
    // AI score sort
    if (sortByAI !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        const scoreA = a.ai_quality_score ?? -1;
        const scoreB = b.ai_quality_score ?? -1;
        return sortByAI === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      });
    }
    
    return filtered;
  };
  
  const filteredAllTrades = useMemo(
    () => filterAndSortTrades(closedTrades), 
    [closedTrades, dateRange, selectedStrategyIds, resultFilter, directionFilter, selectedPairs, sortByAI]
  );
  const filteredBinanceTrades = useMemo(
    () => filterAndSortTrades(binanceTrades), 
    [binanceTrades, dateRange, selectedStrategyIds, resultFilter, directionFilter, selectedPairs, sortByAI]
  );
  const filteredPaperTrades = useMemo(
    () => filterAndSortTrades(paperTrades), 
    [paperTrades, dateRange, selectedStrategyIds, resultFilter, directionFilter, selectedPairs, sortByAI]
  );

  // Calculate R:R
  const calculateRR = (trade: TradeEntry): number => {
    if (!trade.stop_loss || !trade.entry_price || !trade.exit_price) return 0;
    const risk = Math.abs(trade.entry_price - trade.stop_loss);
    if (risk === 0) return 0;
    const reward = Math.abs(trade.exit_price - trade.entry_price);
    return reward / risk;
  };

  const handleDelete = async () => {
    if (!deletingTrade) return;
    try {
      await deleteTrade.mutateAsync(deletingTrade.id);
      setDeletingTrade(null);
    } catch (error) {
      // Error handled by mutation
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

  // Stats based on filtered trades
  const totalPnL = filteredAllTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
  const winCount = filteredAllTrades.filter(t => (t.realized_pnl || 0) > 0).length;
  const winRate = filteredAllTrades.length > 0 ? (winCount / filteredAllTrades.length) * 100 : 0;

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
          
          {/* Stats Summary */}
          <div className="flex gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold">{filteredAllTrades.length}</div>
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
        </div>

        {/* Comprehensive Filters */}
        <Card>
          <CardContent className="pt-6">
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
              totalCount={closedTrades.length}
              filteredCount={filteredAllTrades.length}
            />
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
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all" className="gap-2">
                  All
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{filteredAllTrades.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="binance" className="gap-2">
                  <Wifi className="h-4 w-4" aria-hidden="true" />
                  Binance
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{filteredBinanceTrades.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="paper" className="gap-2">
                  <BookOpen className="h-4 w-4" aria-hidden="true" />
                  Paper
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">{filteredPaperTrades.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="import" className="gap-2">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Import
                </TabsTrigger>
              </TabsList>

              {/* All Trades */}
              <TabsContent value="all">
                <div className="space-y-4">
                  {filteredAllTrades.length === 0 ? (
                    <EmptyState
                      icon={History}
                      title="No trades found"
                      description="No trades match your current filters. Try adjusting the filters above."
                    />
                  ) : (
                    filteredAllTrades.map((entry) => (
                      <TradeHistoryCard 
                        key={entry.id} 
                        entry={entry} 
                        onDelete={setDeletingTrade}
                        onEnrich={handleEnrichTrade}
                        calculateRR={calculateRR}
                        formatCurrency={formatCurrency}
                        isBinance={entry.source === 'binance'}
                        showEnrichButton={true}
                      />
                    ))
                  )}
                </div>
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
                  
                  {filteredBinanceTrades.length === 0 ? (
                    <EmptyState
                      icon={Wifi}
                      title="No Binance trades"
                      description={isBinanceConnected 
                        ? "No Binance trades match your filters." 
                        : "Connect Binance in Settings to import trades."}
                    />
                  ) : (
                    filteredBinanceTrades.map((entry) => (
                      <TradeHistoryCard 
                        key={entry.id} 
                        entry={entry} 
                        onDelete={setDeletingTrade}
                        onEnrich={handleEnrichTrade}
                        calculateRR={calculateRR}
                        formatCurrency={formatCurrency}
                        isBinance={true}
                        showEnrichButton={true}
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Paper Trades */}
              <TabsContent value="paper">
                <div className="space-y-4">
                  {filteredPaperTrades.length === 0 ? (
                    <EmptyState
                      icon={BookOpen}
                      title="No paper trades"
                      description="No paper trades match your filters."
                    />
                  ) : (
                    filteredPaperTrades.map((entry) => (
                      <TradeHistoryCard 
                        key={entry.id} 
                        entry={entry} 
                        onDelete={setDeletingTrade}
                        onEnrich={handleEnrichTrade}
                        calculateRR={calculateRR}
                        formatCurrency={formatCurrency}
                        isBinance={false}
                        showEnrichButton={true}
                      />
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Import from Binance Tab */}
              <TabsContent value="import">
                {isBinanceConnected ? (
                  <div className="space-y-6">
                    <BinanceIncomeHistory showHeader={true} limit={100} defaultFilter="pnl" />
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Download className="h-5 w-5" aria-hidden="true" />
                        Manual Import by Symbol
                      </h3>
                      <BinanceTradeHistory />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="flex justify-center">
                      <div className="rounded-full bg-muted p-4">
                        <Wifi className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Connect Binance to Import Trades</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Connect your Binance Futures account in Settings to import your trade history.
                      </p>
                    </div>
                    <Button variant="outline" asChild>
                      <Link to="/settings">
                        <Wifi className="h-4 w-4 mr-2" aria-hidden="true" />
                        Go to Settings
                      </Link>
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Trade Enrichment Drawer */}
        <TradeEnrichmentDrawer
          position={enrichingPosition}
          open={!!enrichingPosition}
          onOpenChange={(open) => !open && setEnrichingPosition(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
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
          onConfirm={handleDelete}
        />
      </div>
    </DashboardLayout>
  );
}
