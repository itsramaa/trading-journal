/**
 * Trading Journal - Trade Management Hub
 * Tabs: Pending, Active
 * 
 * REMOVED (moved to Performance page per UX audit):
 * - Portfolio Performance cards (Win Rate, PF, Expectancy)
 */
import { useState, useMemo } from "react";
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
import { 
  BookOpen, 
  Wand2, 
  Wifi, 
  Circle, 
  Clock, 
} from "lucide-react";
import { useTradeEntries, useDeleteTradeEntry, useClosePosition, useUpdateTradeEntry, TradeEntry } from "@/hooks/use-trade-entries";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { useBinancePositions, useBinanceBalance, useBinanceConnectionStatus, useBinanceOpenOrders } from "@/features/binance";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { TradeEntryWizard } from "@/components/trade/entry/TradeEntryWizard";
import { useQueryClient } from "@tanstack/react-query";
import { usePostTradeAnalysis } from "@/hooks/use-post-trade-analysis";
import { 
  TradeSummaryStats, 
  ClosePositionDialog,
  EditPositionDialog,
  AllPositionsTable,
  TradeEnrichmentDrawer,
  BinanceOpenOrdersTable,
} from "@/components/journal";
import type { UnifiedPosition } from "@/components/journal";
import { TradingOnboardingTour } from "@/components/trading/TradingOnboardingTour";


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
  const [deletingTrade, setDeletingTrade] = useState<TradeEntry | null>(null);
  const [closingPosition, setClosingPosition] = useState<TradeEntry | null>(null);
  const [editingPosition, setEditingPosition] = useState<TradeEntry | null>(null);
  const [enrichingPosition, setEnrichingPosition] = useState<UnifiedPosition | null>(null);

  const queryClient = useQueryClient();
  const { format: formatCurrency } = useCurrencyConversion();
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
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs defaultValue="active">
              <TabsList className="grid w-full grid-cols-2 max-w-xs">
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
                    {isBinanceConnected && showExchangeOrders && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Circle className="h-4 w-4" />
                        <span>Paper Pending Trades</span>
                      </div>
                    )}
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
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
