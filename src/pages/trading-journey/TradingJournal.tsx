/**
 * Trading Journal - Trade Management Hub
 * Tabs: Pending, Active
 */
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
  Target,
  TrendingUp
} from "lucide-react";
import { useTradeEntries, useDeleteTradeEntry, useClosePosition, useUpdateTradeEntry, TradeEntry } from "@/hooks/use-trade-entries";
import { useBinancePositions, useBinanceBalance, useBinanceConnectionStatus } from "@/features/binance";
import { calculateTradingStats } from "@/lib/trading-calculations";
import { WinRateTooltip, ProfitFactorTooltip, ProfitLossTooltip } from "@/components/ui/info-tooltip";
import { InfoTooltip } from "@/components/ui/info-tooltip";

import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { useUserSettings } from "@/hooks/use-user-settings";
import { TradeEntryWizard } from "@/components/trade/entry/TradeEntryWizard";
import { useQueryClient } from "@tanstack/react-query";
import { usePostTradeAnalysis } from "@/hooks/use-post-trade-analysis";
import { 
  TradeSummaryStats, 
  ClosePositionDialog,
  EditPositionDialog,
  AllPositionsTable,
  TradeEnrichmentDrawer,
} from "@/components/journal";
import type { UnifiedPosition } from "@/components/journal";


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
  const { data: userSettings } = useUserSettings();
  const { data: trades, isLoading: tradesLoading } = useTradeEntries();
  
  // Binance data
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: binancePositions = [], isLoading: binancePositionsLoading } = useBinancePositions();
  const { data: binanceBalance } = useBinanceBalance();
  const isBinanceConnected = connectionStatus?.isConnected ?? false;
  
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

  // Separate open and closed trades
  const openPositions = useMemo(() => trades?.filter(t => t.status === 'open') || [], [trades]);
  const closedTrades = useMemo(() => trades?.filter(t => t.status === 'closed') || [], [trades]);

  // Calculate P&L summaries
  const totalUnrealizedPnL = useMemo(() => openPositions.reduce((sum, t) => sum + (t.pnl || 0), 0), [openPositions]);
  const totalRealizedPnL = useMemo(() => closedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0), [closedTrades]);

  // Trading stats for performance cards
  const tradingStats = useMemo(() => calculateTradingStats(trades || []), [trades]);

  const hasTrades = closedTrades.length > 0;

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
            {/* Pro Tip - below header description */}
            <QuickTip storageKey="trading_journal_tip" className="mt-2">
              <strong>Pro tip:</strong> Document every trade with detailed notes and tag your strategies. 
              Focus on quality setups and review your patterns to improve your trading edge.
            </QuickTip>
          </div>
          <Button variant="default" onClick={() => setIsWizardOpen(true)} aria-label="Open trade entry wizard">
            <Wand2 className="mr-2 h-4 w-4" aria-hidden="true" />
            New Trade
          </Button>
        </div>

        {/* Portfolio Performance (at top, 7-Day Stats moved to Dashboard) */}
        {hasTrades && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      Win Rate
                      <WinRateTooltip />
                    </p>
                    <p className="text-2xl font-bold">{tradingStats.winRate.toFixed(1)}%</p>
                  </div>
                  <Target className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      Profit Factor
                      <ProfitFactorTooltip />
                    </p>
                    <p className={`text-2xl font-bold ${tradingStats.profitFactor >= 1 ? 'text-profit' : 'text-loss'}`}>
                      {tradingStats.profitFactor.toFixed(2)}
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      Expectancy
                      <InfoTooltip content="Average expected profit per trade based on your historical performance." />
                    </p>
                    <p className={`text-2xl font-bold ${tradingStats.expectancy >= 0 ? 'text-profit' : 'text-loss'}`}>
                      {tradingStats.expectancy >= 0 ? '+' : ''}{formatCurrency(tradingStats.expectancy)}
                    </p>
                  </div>
                  <ProfitLossTooltip />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
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
              <TabsList className="grid w-full grid-cols-2 max-w-[300px]">
                <TabsTrigger value="pending" className="gap-2">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Pending</span>
                  {openPositions.filter(p => !p.entry_price || p.entry_price === 0).length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {openPositions.filter(p => !p.entry_price || p.entry_price === 0).length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="active" className="gap-2">
                  <Circle className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Active</span>
                  {(openPositions.filter(p => p.entry_price && p.entry_price > 0).length + binancePositions.filter(p => p.positionAmt !== 0).length) > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                      {openPositions.filter(p => p.entry_price && p.entry_price > 0).length + binancePositions.filter(p => p.positionAmt !== 0).length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              {/* Pending Orders Tab */}
              <TabsContent value="pending" className="mt-4">
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
              </TabsContent>
              
              {/* Active Positions Tab */}
              <TabsContent value="active" className="mt-4">
                <AllPositionsTable
                  paperPositions={openPositions.filter(p => p.entry_price && p.entry_price > 0)}
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
          description={`Are you sure you want to delete this ${deletingTrade?.pair} trade? This action cannot be undone.`}
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </div>
    </DashboardLayout>
  );
}
