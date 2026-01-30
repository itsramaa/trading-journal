/**
 * Trading Journal - Refactored per Trading Journey Markdown spec
 * Components extracted: TradeSummaryStats, TradeFilters, OpenPositionsTable, TradeQuickEntryForm
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QuickTip } from "@/components/ui/onboarding-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Wand2, RefreshCw, Wifi, Circle, CheckCircle, Download, History, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useTradingAccounts } from "@/hooks/use-trading-accounts";
import { useTradeEntries, useCreateTradeEntry, useDeleteTradeEntry, useClosePosition, useUpdateTradeEntry, TradeEntry } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useBinancePositions, useBinanceBalance, useBinanceConnectionStatus } from "@/features/binance";
import { BinanceTradeHistory } from "@/components/trading/BinanceTradeHistory";
import { BinanceIncomeHistory } from "@/components/trading/BinanceIncomeHistory";
import { TradeHistoryCard } from "@/components/trading/TradeHistoryCard";
import { useBinanceAutoSync } from "@/hooks/use-binance-auto-sync";
import { filterTradesByDateRange, filterTradesByStrategies } from "@/lib/trading-calculations";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { useUserSettings } from "@/hooks/use-user-settings";
import { TradeEntryWizard } from "@/components/trade/entry/TradeEntryWizard";
import { useQueryClient } from "@tanstack/react-query";
import { usePostTradeAnalysis } from "@/hooks/use-post-trade-analysis";
import { cn } from "@/lib/utils";
import { DateRange } from "@/components/trading/DateRangeFilter";
import { 
  TradeSummaryStats, 
  TradeFilters, 
  OpenPositionsTable, 
  TradeQuickEntryForm 
} from "@/components/journal";

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

  // Calculate unrealized P&L for each open position (simulated)
  const positionsWithPnL = useMemo(() => {
    return openPositions.map((position) => {
      const simulatedPriceChange = (Math.random() - 0.5) * 0.1;
      const currentPrice = position.entry_price * (1 + simulatedPriceChange);
      
      const priceDiff = position.direction === "LONG" 
        ? currentPrice - position.entry_price 
        : position.entry_price - currentPrice;
      
      const unrealizedPnL = priceDiff * position.quantity;
      const unrealizedPnLPercent = (priceDiff / position.entry_price) * 100;

      return {
        ...position,
        currentPrice,
        unrealizedPnL,
        unrealizedPnLPercent,
      };
    });
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
          <div className="flex gap-2">
            <Button variant="default" onClick={() => setIsWizardOpen(true)} aria-label="Open trade entry wizard">
              <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
              New Trade (Wizard)
            </Button>
            <TradeQuickEntryForm
              tradingAccounts={activeTradingAccounts.map(a => ({
                id: a.id,
                name: a.name,
                current_balance: Number(a.current_balance),
                currency: a.currency,
                is_active: a.is_active,
              }))}
              accountsLoading={accountsLoading}
              strategies={strategies}
              onSubmit={handleCreateTrade}
              isPending={createTrade.isPending}
              formatCurrency={formatCurrency}
            />
          </div>
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
            <Tabs defaultValue={isBinanceConnected ? "binance" : "open"}>
              <TabsList className="grid w-full grid-cols-4 max-w-[600px]">
                {isBinanceConnected && (
                  <TabsTrigger value="binance" className="gap-2">
                    <Wifi className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Binance</span>
                    {binancePositions.filter(p => p.positionAmt !== 0).length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {binancePositions.filter(p => p.positionAmt !== 0).length}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
                <TabsTrigger value="open" className="gap-2">
                  <Circle className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Paper</span>
                  {openPositions.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{openPositions.length}</Badge>
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
              
              {/* Binance Positions Tab */}
              {isBinanceConnected && (
                <TabsContent value="binance" className="mt-4">
                  {binancePositionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                    </div>
                  ) : binancePositions.filter(p => p.positionAmt !== 0).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" aria-hidden="true" />
                      <h3 className="font-medium">No Active Positions on Binance</h3>
                      <p className="text-sm text-muted-foreground">
                        Open a position on Binance Futures to see it here.
                      </p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Symbol</TableHead>
                          <TableHead>Side</TableHead>
                          <TableHead className="text-right">Size</TableHead>
                          <TableHead className="text-right">Entry</TableHead>
                          <TableHead className="text-right">Mark</TableHead>
                          <TableHead className="text-right">PNL</TableHead>
                          <TableHead className="text-right">Liq. Price</TableHead>
                          <TableHead className="text-right">Leverage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {binancePositions
                          .filter(p => p.positionAmt !== 0)
                          .map((position) => (
                            <TableRow key={position.symbol}>
                              <TableCell className="font-medium">{position.symbol}</TableCell>
                              <TableCell>
                                <Badge variant={position.positionAmt > 0 ? "default" : "secondary"}>
                                  {position.positionAmt > 0 ? 'LONG' : 'SHORT'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {Math.abs(position.positionAmt).toFixed(4)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                ${position.entryPrice.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                ${position.markPrice.toFixed(2)}
                              </TableCell>
                              <TableCell className={cn(
                                "text-right font-mono font-medium",
                                position.unrealizedProfit >= 0 ? "text-profit" : "text-loss"
                              )}>
                                {position.unrealizedProfit >= 0 ? '+' : ''}${position.unrealizedProfit.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right font-mono text-muted-foreground">
                                ${position.liquidationPrice.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant="outline">{position.leverage}x</Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              )}
              
              {/* Paper Trading Open Positions Tab */}
              <TabsContent value="open" className="mt-4">
                <OpenPositionsTable
                  positions={positionsWithPnL}
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

                {/* Sub-tabs: Binance History and Paper History */}
                <Tabs defaultValue="binance-history" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="binance-history" className="gap-2">
                      <Wifi className="h-4 w-4" aria-hidden="true" />
                      Binance
                      {filteredBinanceTrades.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">{filteredBinanceTrades.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="paper-history" className="gap-2">
                      <BookOpen className="h-4 w-4" aria-hidden="true" />
                      Paper
                      {filteredPaperTrades.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">{filteredPaperTrades.length}</Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Binance History Sub-Tab */}
                  <TabsContent value="binance-history">
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
                            disabled={isAutoSyncing}
                            aria-label="Sync trades from Binance"
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isAutoSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
                            {isAutoSyncing ? 'Syncing...' : 'Sync Now'}
                          </Button>
                        </div>
                      )}
                      
                      {filteredBinanceTrades.length === 0 ? (
                        <EmptyState
                          icon={Wifi}
                          title="No Binance trades found"
                          description={isBinanceConnected 
                            ? "Trades will auto-sync from Binance. Click 'Sync Now' to fetch the latest." 
                            : "Connect your Binance account to import trade history."}
                          action={isBinanceConnected ? {
                            label: "Sync Now",
                            onClick: syncNow,
                          } : {
                            label: "Go to Settings",
                            onClick: () => window.location.href = '/settings',
                          }}
                        />
                      ) : (
                        filteredBinanceTrades.map((entry) => (
                          <TradeHistoryCard 
                            key={entry.id} 
                            entry={entry} 
                            onDelete={setDeletingTrade}
                            calculateRR={calculateRR}
                            formatCurrency={formatCurrency}
                            isBinance={true}
                          />
                        ))
                      )}
                    </div>
                  </TabsContent>
                  
                  {/* Paper History Sub-Tab */}
                  <TabsContent value="paper-history">
                    <div className="space-y-4">
                      {filteredPaperTrades.length === 0 ? (
                        <EmptyState
                          icon={BookOpen}
                          title="No paper trades found"
                          description="No paper trades match your current filters."
                        />
                      ) : (
                        filteredPaperTrades.map((entry) => (
                          <TradeHistoryCard 
                            key={entry.id} 
                            entry={entry} 
                            onDelete={setDeletingTrade}
                            calculateRR={calculateRR}
                            formatCurrency={formatCurrency}
                            isBinance={false}
                          />
                        ))
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
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
        <Dialog open={!!closingPosition} onOpenChange={(open) => !open && setClosingPosition(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Close Position: {closingPosition?.pair}</DialogTitle>
            </DialogHeader>
            <form onSubmit={closeForm.handleSubmit(handleClosePosition)} className="grid gap-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Direction:</span>
                  <Badge variant={closingPosition?.direction === "LONG" ? "default" : "secondary"}>
                    {closingPosition?.direction}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry Price:</span>
                  <span className="font-mono">{formatCurrency(closingPosition?.entry_price || 0, "USD")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Position Size:</span>
                  <span className="font-mono">{closingPosition?.quantity}</span>
                </div>
              </div>

              <div>
                <Label>Exit Price *</Label>
                <Input type="number" step="any" {...closeForm.register("exit_price")} placeholder="Enter exit price" />
                {closeForm.formState.errors.exit_price && (
                  <p className="text-xs text-destructive mt-1">{closeForm.formState.errors.exit_price.message}</p>
                )}
              </div>

              <div>
                <Label>Fees</Label>
                <Input type="number" step="any" {...closeForm.register("fees")} placeholder="0.00" />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea {...closeForm.register("notes")} placeholder="Exit reasoning, lessons learned..." />
              </div>

              <Button type="submit" disabled={closePosition.isPending}>
                {closePosition.isPending ? "Closing..." : "Close Position"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Position Dialog */}
        <Dialog open={!!editingPosition} onOpenChange={(open) => !open && setEditingPosition(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Position: {editingPosition?.pair}</DialogTitle>
            </DialogHeader>
            <form onSubmit={editForm.handleSubmit(handleEditPosition)} className="grid gap-4 py-4">
              <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Direction:</span>
                  <Badge variant={editingPosition?.direction === "LONG" ? "default" : "secondary"}>
                    {editingPosition?.direction}
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Entry Price:</span>
                  <span className="font-mono">{formatCurrency(editingPosition?.entry_price || 0, "USD")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Position Size:</span>
                  <span className="font-mono">{editingPosition?.quantity}</span>
                </div>
              </div>

              <div>
                <Label>Stop Loss</Label>
                <Input type="number" step="any" {...editForm.register("stop_loss")} placeholder="Enter stop loss price" />
              </div>

              <div>
                <Label>Take Profit</Label>
                <Input type="number" step="any" {...editForm.register("take_profit")} placeholder="Enter take profit price" />
              </div>

              <div>
                <Label>Notes</Label>
                <Textarea {...editForm.register("notes")} placeholder="Position notes..." />
              </div>

              <Button type="submit" disabled={updateTrade.isPending}>
                {updateTrade.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

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
