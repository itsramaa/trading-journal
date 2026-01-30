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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradingPairCombobox } from "@/components/ui/trading-pair-combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DateRangeFilter, DateRange } from "@/components/trading/DateRangeFilter";
import { QuickTip } from "@/components/ui/onboarding-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar, Tag, Target, Building2, TrendingUp, TrendingDown, BookOpen, MoreVertical, Trash2, Clock, CheckCircle, Circle, DollarSign, XCircle, AlertCircle, Edit, Wand2, Timer, Brain, ArrowUpDown, Wifi, RefreshCw, Download } from "lucide-react";
import { format } from "date-fns";
import { useTradingAccounts } from "@/hooks/use-trading-accounts";
import { useTradeEntries, useCreateTradeEntry, useDeleteTradeEntry, useClosePosition, useUpdateTradeEntry, TradeEntry } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useBinancePositions, useBinanceBalance, useBinanceConnectionStatus } from "@/features/binance";
import { BinanceTradeHistory } from "@/components/trading/BinanceTradeHistory";
import { TradeHistoryCard } from "@/components/trading/TradeHistoryCard";

import { filterTradesByDateRange, filterTradesByStrategies } from "@/lib/trading-calculations";
import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { useUserSettings } from "@/hooks/use-user-settings";
import { TradeEntryWizard } from "@/components/trade/entry/TradeEntryWizard";
import { useQueryClient } from "@tanstack/react-query";
import { usePostTradeAnalysis } from "@/hooks/use-post-trade-analysis";
import { cn } from "@/lib/utils";

// Binance Futures fee rates
const BINANCE_MAKER_FEE = 0.0002; // 0.02%
const BINANCE_TAKER_FEE = 0.0005; // 0.05%

const tradeFormSchema = z.object({
  pair: z.string().min(1, "Pair is required"),
  direction: z.enum(["LONG", "SHORT"]),
  trade_date: z.string().min(1, "Date is required"),
  quantity: z.coerce.number().positive("Position size must be positive").default(1),
  pnl: z.coerce.number().optional(),
  rr_achieved: z.coerce.number().optional(),
  fee_type: z.enum(["maker", "taker"]).default("taker"),
  notes: z.string().optional(),
  trading_account_id: z.string().optional(),
  status: z.enum(["open", "closed"]).default("closed"),
});

const closePositionSchema = z.object({
  exit_price: z.coerce.number().positive("Exit price must be positive"),
  fees: z.coerce.number().optional(),
  notes: z.string().optional(),
});

const editPositionSchema = z.object({
  stop_loss: z.coerce.number().optional(),
  take_profit: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;
type ClosePositionFormValues = z.infer<typeof closePositionSchema>;
type EditPositionFormValues = z.infer<typeof editPositionSchema>;

export default function TradingJournal() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [newTradeStrategies, setNewTradeStrategies] = useState<string[]>([]);
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

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      direction: "LONG",
      quantity: 1,
      trade_date: new Date().toISOString().split('T')[0],
      status: "closed",
      fee_type: "taker",
    },
  });

  const closeForm = useForm<ClosePositionFormValues>({
    resolver: zodResolver(closePositionSchema),
    defaultValues: {},
  });

  const editForm = useForm<EditPositionFormValues>({
    resolver: zodResolver(editPositionSchema),
    defaultValues: {},
  });

  // Filter accounts suitable for trading (from trading_accounts table)
  const activeTradingAccounts = tradingAccounts?.filter(a => a.is_active) || [];

  // Separate open and closed trades (pending not currently in DB schema, but prepared for future)
  const openPositions = useMemo(() => trades?.filter(t => t.status === 'open') || [], [trades]);
  const closedTrades = useMemo(() => trades?.filter(t => t.status === 'closed') || [], [trades]);
  
  // Separate Binance trades vs Paper trades
  const binanceTrades = useMemo(() => closedTrades.filter(t => t.source === 'binance'), [closedTrades]);
  const paperTrades = useMemo(() => closedTrades.filter(t => t.source !== 'binance'), [closedTrades]);

  // Filter and sort closed trades by date/strategy/AI score
  const filterAndSortTrades = (tradesToFilter: typeof closedTrades) => {
    let filtered = filterTradesByDateRange(tradesToFilter, dateRange.from, dateRange.to);
    filtered = filterTradesByStrategies(filtered, selectedStrategyIds);
    
    // AI Quality Score sorting
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
  const filteredClosedTrades = useMemo(() => filterAndSortTrades(closedTrades), [closedTrades, dateRange, selectedStrategyIds, sortByAI]);

  // Calculate P&L summaries
  const totalUnrealizedPnL = useMemo(() => openPositions.reduce((sum, t) => sum + (t.pnl || 0), 0), [openPositions]);
  const totalRealizedPnL = useMemo(() => closedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0), [closedTrades]);

  // Calculate unrealized P&L for each open position (simulated current price)
  const positionsWithPnL = useMemo(() => {
    return openPositions.map((position) => {
      // Simulate current price change for demo
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

  const handleSubmit = async (values: TradeFormValues) => {
    // Calculate fees based on position size and fee type
    const feeRate = values.fee_type === 'maker' ? BINANCE_MAKER_FEE : BINANCE_TAKER_FEE;
    const calculatedFees = values.quantity * feeRate * 2; // Entry + Exit fees
    
    try {
      await createTrade.mutateAsync({
        pair: values.pair,
        direction: values.direction,
        entry_price: 0, // No longer used but required by DB
        trade_date: values.trade_date,
        quantity: values.quantity,
        pnl: values.pnl,
        fees: calculatedFees,
        notes: values.notes,
        trading_account_id: values.trading_account_id,
        status: values.status,
        strategy_ids: newTradeStrategies,
      });
      setIsAddOpen(false);
      form.reset();
      setNewTradeStrategies([]);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleClosePosition = async (values: ClosePositionFormValues) => {
    if (!closingPosition) return;
    
    // Calculate P&L based on direction
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
      
      // Trigger async AI post-trade analysis (non-blocking)
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
              <BookOpen className="h-6 w-6 text-primary" />
              Trading Journal
            </h1>
            <p className="text-muted-foreground">Document every trade for continuous improvement</p>
          </div>
          <div className="flex gap-2">
            {/* Wizard Entry Button */}
            <Button variant="default" onClick={() => setIsWizardOpen(true)}>
              <Wand2 className="mr-2 h-4 w-4" />
              New Trade (Wizard)
            </Button>
            
            {/* Quick Entry Dialog */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="mr-2 h-4 w-4" />Quick Entry</Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New Trade Entry</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
                {/* Trading Account Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Trading Account
                  </Label>
                  <Select 
                    value={form.watch("trading_account_id") || ""} 
                    onValueChange={(v) => form.setValue("trading_account_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={accountsLoading ? "Loading..." : "Select trading account"} />
                    </SelectTrigger>
                    <SelectContent>
                      {activeTradingAccounts.length === 0 && (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          No trading accounts found. Create a trading account first.
                        </div>
                      )}
                      {activeTradingAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            <span>{account.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatCurrency(Number(account.current_balance), account.currency)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Trade Status */}
                <div className="space-y-2">
                  <Label>Trade Status</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.watch("status") === "open"}
                        onChange={() => form.setValue("status", "open")}
                        className="sr-only"
                      />
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        form.watch("status") === "open" 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-muted-foreground"
                      }`}>
                        <Circle className="h-4 w-4" />
                        <span>Open Position</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.watch("status") === "closed"}
                        onChange={() => form.setValue("status", "closed")}
                        className="sr-only"
                      />
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        form.watch("status") === "closed" 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-muted-foreground"
                      }`}>
                        <CheckCircle className="h-4 w-4" />
                        <span>Closed Trade</span>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Pair *</Label>
                    <TradingPairCombobox
                      value={form.watch("pair") || ""}
                      onValueChange={(v) => form.setValue("pair", v)}
                      placeholder="Select pair"
                    />
                    {form.formState.errors.pair && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.pair.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>Direction *</Label>
                    <Select 
                      value={form.watch("direction")} 
                      onValueChange={(v) => form.setValue("direction", v as "LONG" | "SHORT")}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LONG">LONG</SelectItem>
                        <SelectItem value="SHORT">SHORT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Input type="date" {...form.register("trade_date")} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Position Size *</Label>
                    <Input type="number" step="any" {...form.register("quantity")} placeholder="1000" />
                    {form.formState.errors.quantity && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.quantity.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>P&L *</Label>
                    <Input type="number" step="any" {...form.register("pnl")} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>R:R Achieved</Label>
                    <Input type="number" step="any" {...form.register("rr_achieved")} placeholder="1.5" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fee Type (Binance Futures)</Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.watch("fee_type") === "maker"}
                        onChange={() => form.setValue("fee_type", "maker")}
                        className="sr-only"
                      />
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        form.watch("fee_type") === "maker" 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-muted-foreground"
                      }`}>
                        <span>Maker (0.02%)</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={form.watch("fee_type") === "taker"}
                        onChange={() => form.setValue("fee_type", "taker")}
                        className="sr-only"
                      />
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        form.watch("fee_type") === "taker" 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-muted-foreground"
                      }`}>
                        <span>Taker (0.05%)</span>
                      </div>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Estimated fee: ${((form.watch("quantity") || 0) * (form.watch("fee_type") === "maker" ? BINANCE_MAKER_FEE : BINANCE_TAKER_FEE) * 2).toFixed(4)}
                  </p>
                </div>

                {/* Strategy Selection with Redirect */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Strategies Used</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-xs"
                      asChild
                    >
                      <Link to="/strategies">
                        <Plus className="h-3 w-3" />
                        Add New Strategy
                      </Link>
                    </Button>
                  </div>
                  
                  {strategies.length === 0 ? (
                    <div className="p-4 border rounded-lg bg-muted/30 text-center">
                      <p className="text-sm text-muted-foreground mb-2">No strategies yet</p>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/strategies">Create Your First Strategy</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {strategies.map((strategy) => (
                        <Badge
                          key={strategy.id}
                          variant={newTradeStrategies.includes(strategy.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setNewTradeStrategies(prev =>
                              prev.includes(strategy.id)
                                ? prev.filter(id => id !== strategy.id)
                                : [...prev, strategy.id]
                            );
                          }}
                        >
                          {strategy.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea {...form.register("notes")} placeholder="Trade analysis and lessons learned..." />
                </div>

                <Button type="submit" disabled={createTrade.isPending}>
                  {createTrade.isPending ? "Saving..." : "Save Entry"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
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

        {/* P&L Summary Cards - Binance Centered */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                Open Positions
                {isBinanceConnected && <Wifi className="h-3 w-3 text-green-500" />}
              </CardTitle>
              <Circle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isBinanceConnected ? binancePositions.filter(p => p.positionAmt !== 0).length : openPositions.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {isBinanceConnected ? 'From Binance' : 'Paper Trading'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
              {(binanceBalance?.totalUnrealizedProfit ?? totalUnrealizedPnL) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-profit" />
              ) : (
                <TrendingDown className="h-4 w-4 text-loss" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(binanceBalance?.totalUnrealizedProfit ?? totalUnrealizedPnL) >= 0 ? "text-profit" : "text-loss"}`}>
                {formatCurrency(isBinanceConnected ? (binanceBalance?.totalUnrealizedProfit ?? 0) : totalUnrealizedPnL, "USD")}
              </div>
              <p className="text-xs text-muted-foreground">
                {isBinanceConnected ? 'Live from Binance' : 'From paper positions'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Closed Trades</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{closedTrades.length}</div>
              <p className="text-xs text-muted-foreground">Completed trades</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Realized P&L</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalRealizedPnL >= 0 ? "text-profit" : "text-loss"}`}>
                {formatCurrency(totalRealizedPnL, "USD")}
              </div>
              <p className="text-xs text-muted-foreground">From closed trades</p>
            </CardContent>
          </Card>
        </div>

        {/* Trade Management Card with Unified Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Trade Management
              {isBinanceConnected && (
                <Badge variant="outline" className="text-xs gap-1 ml-2">
                  <Wifi className="h-3 w-3 text-green-500" />
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
                    <Wifi className="h-4 w-4" />
                    <span className="hidden sm:inline">Binance</span>
                    {binancePositions.filter(p => p.positionAmt !== 0).length > 0 && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                        {binancePositions.filter(p => p.positionAmt !== 0).length}
                      </Badge>
                    )}
                  </TabsTrigger>
                )}
                <TabsTrigger value="open" className="gap-2">
                  <Circle className="h-4 w-4" />
                  <span className="hidden sm:inline">Paper</span>
                  {openPositions.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{openPositions.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">History</span>
                  {closedTrades.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{closedTrades.length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="import" className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Import</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Binance Positions Tab */}
              {isBinanceConnected && (
                <TabsContent value="binance" className="mt-4">
                  {binancePositionsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : binancePositions.filter(p => p.positionAmt !== 0).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
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
                                position.unrealizedProfit >= 0 ? "text-green-500" : "text-red-500"
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
                {positionsWithPnL.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="font-medium">No Open Positions</h3>
                    <p className="text-sm text-muted-foreground">
                      Create a new trade with status "Open" to track active positions.
                    </p>
                  </div>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Pair</TableHead>
                          <TableHead>Direction</TableHead>
                          <TableHead className="text-right">Entry</TableHead>
                          <TableHead className="text-right">Current</TableHead>
                          <TableHead className="text-right">Size</TableHead>
                          <TableHead className="text-right">Unrealized P&L</TableHead>
                          <TableHead className="text-right">SL / TP</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {positionsWithPnL.map((position) => (
                          <TableRow key={position.id}>
                            <TableCell className="font-medium">{position.pair}</TableCell>
                            <TableCell>
                              <Badge variant={position.direction === "LONG" ? "default" : "secondary"}>
                                {position.direction}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(position.entry_price, "USD")}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(position.currentPrice, "USD")}
                            </TableCell>
                            <TableCell className="text-right font-mono">{position.quantity}</TableCell>
                            <TableCell className={`text-right font-mono font-medium ${position.unrealizedPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {position.unrealizedPnL >= 0 ? "+" : ""}{formatCurrency(position.unrealizedPnL, "USD")}
                              <span className="text-xs ml-1">
                                ({position.unrealizedPnLPercent >= 0 ? "+" : ""}{position.unrealizedPnLPercent.toFixed(2)}%)
                              </span>
                            </TableCell>
                            <TableCell className="text-right text-xs">
                              <span className="text-red-500">{position.stop_loss ? formatCurrency(position.stop_loss, "USD") : "-"}</span>
                              {" / "}
                              <span className="text-green-500">{position.take_profit ? formatCurrency(position.take_profit, "USD") : "-"}</span>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => handleOpenEditDialog(position)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    setClosingPosition(position);
                                    closeForm.reset();
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Close
                                </Button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setDeletingTrade(position)}>
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <p className="text-xs text-muted-foreground text-center mt-4">
                      Note: Current prices are simulated. Integrate with a market data API for live prices.
                    </p>
                  </>
                )}
              </TabsContent>
              
              {/* Trade History Tab - With Sub-tabs for Binance (priority) and Paper */}
              <TabsContent value="history" className="mt-4">
                {/* Filters */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
                  <DateRangeFilter value={dateRange} onChange={setDateRange} />
                  
                  {/* AI Score Sort Button */}
                  <Button 
                    variant={sortByAI !== 'none' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setSortByAI(prev => prev === 'none' ? 'desc' : prev === 'desc' ? 'asc' : 'none')}
                    className="gap-1"
                  >
                    <Brain className="h-4 w-4" />
                    AI Score {sortByAI === 'desc' ? '↓' : sortByAI === 'asc' ? '↑' : ''}
                    {sortByAI !== 'none' && (
                      <ArrowUpDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                  
                  {strategies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {strategies.map((strategy) => (
                        <Badge
                          key={strategy.id}
                          variant={selectedStrategyIds.includes(strategy.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedStrategyIds(prev =>
                              prev.includes(strategy.id)
                                ? prev.filter(id => id !== strategy.id)
                                : [...prev, strategy.id]
                            );
                          }}
                        >
                          {strategy.name}
                        </Badge>
                      ))}
                      {selectedStrategyIds.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => setSelectedStrategyIds([])}>
                          Clear
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub-tabs: Binance History (priority) and Paper History */}
                <Tabs defaultValue="binance-history" className="w-full">
                  <TabsList className="mb-4">
                    <TabsTrigger value="binance-history" className="gap-2">
                      <Wifi className="h-4 w-4" />
                      Binance
                      {filteredBinanceTrades.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">{filteredBinanceTrades.length}</Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="paper-history" className="gap-2">
                      <BookOpen className="h-4 w-4" />
                      Paper
                      {filteredPaperTrades.length > 0 && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">{filteredPaperTrades.length}</Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>
                  
                  {/* Binance History Sub-Tab (Priority) */}
                  <TabsContent value="binance-history">
                    <div className="space-y-4">
                      {filteredBinanceTrades.length === 0 ? (
                        <EmptyState
                          icon={Wifi}
                          title="No Binance trades found"
                          description={isBinanceConnected 
                            ? "Import trades from your Binance account using the Import tab." 
                            : "Connect your Binance account to import trade history."}
                          action={isBinanceConnected ? undefined : {
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
                          description="No paper trades match your current filters. Try adjusting the date range or strategy filters."
                          action={{
                            label: "Add Paper Trade",
                            onClick: () => setIsAddOpen(true),
                          }}
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
                  <BinanceTradeHistory />
                ) : (
                  <div className="text-center py-12 space-y-4">
                    <div className="flex justify-center">
                      <div className="rounded-full bg-muted p-4">
                        <Wifi className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-medium">Connect Binance to Import Trades</h3>
                      <p className="text-sm text-muted-foreground max-w-md mx-auto">
                        Connect your Binance Futures account in Settings to import your trade history and sync positions.
                      </p>
                    </div>
                    <Button variant="outline" asChild>
                      <Link to="/settings">
                        <Wifi className="h-4 w-4 mr-2" />
                        Go to Settings
                      </Link>
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Pro Tip - Moved to bottom */}
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
