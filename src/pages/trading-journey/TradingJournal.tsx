/**
 * Trading Journal - Unified Trade Hub
 * Components: TradeSummaryStats, TradeFilters, AllPositionsTable, 
 * BinancePositionsTab, TradeHistoryTabs, PositionDialogs, TradeEnrichmentDrawer
 */
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { QuickTip } from "@/components/ui/onboarding-tooltip";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Wand2, Wifi, Circle, CheckCircle, Download } from "lucide-react";
import { useTradingAccounts } from "@/hooks/use-trading-accounts";
import { useTradeEntries, useCreateTradeEntry, useDeleteTradeEntry, useClosePosition, useUpdateTradeEntry, TradeEntry } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useBinancePositions, useBinanceBalance, useBinanceConnectionStatus } from "@/features/binance";
import { BinanceTradeHistory } from "@/components/trading/BinanceTradeHistory";
import { BinanceIncomeHistory } from "@/components/trading/BinanceIncomeHistory";
import { useBinanceAutoSync } from "@/hooks/use-binance-auto-sync";
import { filterTradesByDateRange, filterTradesByStrategies } from "@/lib/trading-calculations";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { useUserSettings } from "@/hooks/use-user-settings";
import { TradeEntryWizard } from "@/components/trade/entry/TradeEntryWizard";
import { useQueryClient } from "@tanstack/react-query";
import { usePostTradeAnalysis } from "@/hooks/use-post-trade-analysis";
import { DateRange } from "@/components/trading/DateRangeFilter";
import { 
  TradeSummaryStats, 
  TradeFilters, 
  OpenPositionsTable, 
  BinancePositionsTab,
  TradeHistoryTabs,
  ClosePositionDialog,
  EditPositionDialog,
  AllPositionsTable,
  TradeEnrichmentDrawer,
} from "@/components/journal";
import type { UnifiedPosition } from "@/components/journal";

// Binance Futures fee rates
const BINANCE_MAKER_FEE = 0.0002;
const BINANCE_TAKER_FEE = 0.0005;

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
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [deletingTrade, setDeletingTrade] = useState<TradeEntry | null>(null);
  const [closingPosition, setClosingPosition] = useState<TradeEntry | null>(null);
  const [editingPosition, setEditingPosition] = useState<TradeEntry | null>(null);
  const [sortByAI, setSortByAI] = useState<'none' | 'asc' | 'desc'>('none');
  const [enrichingPosition, setEnrichingPosition] = useState<UnifiedPosition | null>(null);

  const queryClient = useQueryClient();
  const { data: userSettings } = useUserSettings();
  const { data: tradingAccounts, isLoading: accountsLoading } = useTradingAccounts();
  const { data: trades, isLoading: tradesLoading } = useTradeEntries();
  const { data: strategies = [] } = useTradingStrategies();
  
  // Binance data
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: binancePositions = [], isLoading: binancePositionsLoading } = useBinancePositions();
  const { data: binanceBalance } = useBinanceBalance();
  const isBinanceConnected = connectionStatus?.isConnected ?? false;
  
  // Auto-sync hook
  const { syncNow, isSyncing: isAutoSyncing, lastSyncTime, pendingRecords } = useBinanceAutoSync({
    autoSyncOnMount: true,
    enablePeriodicSync: true,
    syncInterval: 5 * 60 * 1000,
  });
  
  const createTrade = useCreateTradeEntry();
  const deleteTrade = useDeleteTradeEntry();
  const closePosition = useClosePosition();
  const updateTrade = useUpdateTradeEntry();
  const { analyzeClosedTrade } = usePostTradeAnalysis();

  // Currency conversion helper
  const displayCurrency = userSettings?.default_currency || 'USD';
  const formatCurrency = (value: number, currency: string = 'USD') => {
    return formatCurrencyUtil(value, displayCurrency);
  };

  const closeForm = useForm<ClosePositionFormValues>({
    resolver: zodResolver(closePositionSchema),
    defaultValues: {},
  });

  const editForm = useForm<EditPositionFormValues>({
    resolver: zodResolver(editPositionSchema),
    defaultValues: {},
  });

  // Filter accounts suitable for trading
  const activeTradingAccounts = tradingAccounts?.filter(a => a.is_active) || [];

  // Separate open and closed trades
  const openPositions = useMemo(() => trades?.filter(t => t.status === 'open') || [], [trades]);
  const closedTrades = useMemo(() => trades?.filter(t => t.status === 'closed') || [], [trades]);
  
  // Separate Binance trades vs Paper trades
  const binanceTrades = useMemo(() => closedTrades.filter(t => t.source === 'binance'), [closedTrades]);
  const paperTrades = useMemo(() => closedTrades.filter(t => t.source !== 'binance'), [closedTrades]);

  // Filter and sort closed trades
  const filterAndSortTrades = (tradesToFilter: typeof closedTrades) => {
    let filtered = filterTradesByDateRange(tradesToFilter, dateRange.from, dateRange.to);
    filtered = filterTradesByStrategies(filtered, selectedStrategyIds);
    
    if (sortByAI !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        const scoreA = a.ai_quality_score ?? -1;
        const scoreB = b.ai_quality_score ?? -1;
        return sortByAI === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      });
    }
    
    return filtered;
  };
  
  const filteredBinanceTrades = useMemo(() => filterAndSortTrades(binanceTrades), [binanceTrades, dateRange, selectedStrategyIds, sortByAI]);
  const filteredPaperTrades = useMemo(() => filterAndSortTrades(paperTrades), [paperTrades, dateRange, selectedStrategyIds, sortByAI]);

  // Calculate P&L summaries
  const totalUnrealizedPnL = useMemo(() => openPositions.reduce((sum, t) => sum + (t.pnl || 0), 0), [openPositions]);
  const totalRealizedPnL = useMemo(() => closedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0), [closedTrades]);

  // Calculate unrealized P&L for each open position
  // Note: Without live price feed, we show stored P&L or entry price as placeholder
  const positionsWithPnL = useMemo(() => {
    return openPositions.map((position) => ({
      ...position,
      currentPrice: position.entry_price, // Use entry as placeholder (no live feed)
      unrealizedPnL: position.pnl || 0,   // Use stored P&L if available
      unrealizedPnLPercent: 0,            // Cannot calculate without live price
    }));
  }, [openPositions]);

  const handleCreateTrade = async (values: any, strategyIds: string[]) => {
    const feeRate = values.fee_type === 'maker' ? BINANCE_MAKER_FEE : BINANCE_TAKER_FEE;
    const calculatedFees = values.quantity * feeRate * 2;
    
    await createTrade.mutateAsync({
      pair: values.pair,
      direction: values.direction,
      entry_price: 0,
      trade_date: values.trade_date,
      quantity: values.quantity,
      pnl: values.pnl,
      fees: calculatedFees,
      notes: values.notes,
      trading_account_id: values.trading_account_id,
      status: values.status,
      strategy_ids: strategyIds,
    });
  };

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

  const handleDelete = async () => {
    if (!deletingTrade) return;
    try {
      await deleteTrade.mutateAsync(deletingTrade.id);
      setDeletingTrade(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const calculateRR = (trade: TradeEntry): number => {
    if (!trade.stop_loss || !trade.entry_price || !trade.exit_price) return 0;
    const risk = Math.abs(trade.entry_price - trade.stop_loss);
    if (risk === 0) return 0;
    const reward = Math.abs(trade.exit_price - trade.entry_price);
    return reward / risk;
  };

  if (tradesLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
            <p className="text-muted-foreground">Document every trade for continuous improvement</p>
          </div>
          <MetricsGridSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" aria-hidden="true" />
              Trading Journal
            </h1>
            <p className="text-muted-foreground">Document every trade for continuous improvement</p>
          </div>
          <Button variant="default" onClick={() => setIsWizardOpen(true)} aria-label="Open trade entry wizard">
            <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
            New Trade
          </Button>
        </div>
        
        {/* Trade Entry Wizard Dialog */}
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

        {/* P&L Summary Cards */}
        <TradeSummaryStats
          openPositionsCount={openPositions.length}
          binancePositionsCount={binancePositions.filter(p => p.positionAmt !== 0).length}
          unrealizedPnL={totalUnrealizedPnL}
          binanceUnrealizedPnL={binanceBalance?.totalUnrealizedProfit}
          closedTradesCount={closedTrades.length}
          realizedPnL={totalRealizedPnL}
          isBinanceConnected={isBinanceConnected}
          formatCurrency={formatCurrency}
        />

        {/* Trade Management Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
              Trade Management
              {isBinanceConnected && (
                <Badge variant="outline" className="text-xs gap-1 ml-2">
                  <Wifi className="h-3 w-3 text-green-500" aria-hidden="true" />
                  Binance Connected
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="active">
              <TabsList className="grid w-full grid-cols-3 max-w-[450px]">
                <TabsTrigger value="active" className="gap-2">
                  <Circle className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Active</span>
                  {(openPositions.length + binancePositions.filter(p => p.positionAmt !== 0).length) > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {openPositions.length + binancePositions.filter(p => p.positionAmt !== 0).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">History</span>
                  {closedTrades.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{closedTrades.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="import" className="gap-2">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Import</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Unified Active Positions Tab */}
              <TabsContent value="active" className="mt-4">
                <AllPositionsTable
                  paperPositions={openPositions}
                  binancePositions={binancePositions}
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
                />
              </TabsContent>
              
              {/* Trade History Tab */}
              <TabsContent value="history" className="mt-4">
                <TradeFilters
                  dateRange={dateRange}
                  onDateRangeChange={setDateRange}
                  sortByAI={sortByAI}
                  onSortByAIChange={setSortByAI}
                  strategies={strategies}
                  selectedStrategyIds={selectedStrategyIds}
                  onStrategyIdsChange={setSelectedStrategyIds}
                />

                <TradeHistoryTabs
                  binanceTrades={filteredBinanceTrades}
                  paperTrades={filteredPaperTrades}
                  isBinanceConnected={isBinanceConnected}
                  lastSyncTime={lastSyncTime}
                  pendingRecords={pendingRecords}
                  isAutoSyncing={isAutoSyncing}
                  onSyncNow={syncNow}
                  onDeleteTrade={setDeletingTrade}
                  calculateRR={calculateRR}
                  formatCurrency={formatCurrency}
                />
              </TabsContent>

              {/* Import from Binance Tab */}
              <TabsContent value="import" className="mt-4">
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

        {/* Pro Tip */}
        <QuickTip storageKey="trading_journal_tip" className="mb-2">
          <strong>Pro tip:</strong> Document every trade with detailed notes and tag your strategies. 
          Focus on quality setups and review your patterns to improve your trading edge.
        </QuickTip>

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
