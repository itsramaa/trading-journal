import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DateRangeFilter, DateRange } from "@/components/trading/DateRangeFilter";
import { QuickTip } from "@/components/ui/onboarding-tooltip";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar, Tag, Target, Building2, TrendingUp, TrendingDown, BookOpen, MoreVertical, Trash2, Clock, CheckCircle, Circle, DollarSign, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useAccounts } from "@/hooks/use-accounts";
import { useTradeEntries, useCreateTradeEntry, useDeleteTradeEntry, useClosePosition, TradeEntry } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useTradingSessions } from "@/hooks/use-trading-sessions";
import { filterTradesByDateRange, filterTradesByStrategies } from "@/lib/trading-calculations";
import { formatCurrency } from "@/lib/formatters";

const tradeFormSchema = z.object({
  pair: z.string().min(1, "Pair is required"),
  direction: z.enum(["LONG", "SHORT"]),
  trade_date: z.string().min(1, "Date is required"),
  entry_price: z.coerce.number().positive("Entry price must be positive"),
  exit_price: z.coerce.number().optional(),
  stop_loss: z.coerce.number().optional(),
  take_profit: z.coerce.number().optional(),
  quantity: z.coerce.number().positive().default(1),
  pnl: z.coerce.number().optional(),
  fees: z.coerce.number().optional(),
  confluence_score: z.coerce.number().min(1).max(10).optional(),
  market_condition: z.string().optional(),
  entry_signal: z.string().optional(),
  notes: z.string().optional(),
  trading_account_id: z.string().optional(),
  session_id: z.string().optional(),
  status: z.enum(["open", "closed"]).default("closed"),
});

const closePositionSchema = z.object({
  exit_price: z.coerce.number().positive("Exit price must be positive"),
  fees: z.coerce.number().optional(),
  notes: z.string().optional(),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;
type ClosePositionFormValues = z.infer<typeof closePositionSchema>;

export default function TradingJournal() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [newTradeStrategies, setNewTradeStrategies] = useState<string[]>([]);
  const [deletingTrade, setDeletingTrade] = useState<TradeEntry | null>(null);
  const [closingPosition, setClosingPosition] = useState<TradeEntry | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');

  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: trades, isLoading: tradesLoading } = useTradeEntries();
  const { data: strategies = [] } = useTradingStrategies();
  const { data: sessions = [] } = useTradingSessions();
  const createTrade = useCreateTradeEntry();
  const deleteTrade = useDeleteTradeEntry();
  const closePosition = useClosePosition();

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      direction: "LONG",
      quantity: 1,
      trade_date: new Date().toISOString().split('T')[0],
      status: "closed",
    },
  });

  const closeForm = useForm<ClosePositionFormValues>({
    resolver: zodResolver(closePositionSchema),
    defaultValues: {},
  });

  // Filter accounts suitable for trading (broker type)
  const tradingAccounts = accounts?.filter(a => 
    a.is_active && (a.account_type === 'broker' || a.account_type === 'soft_wallet')
  );

  // Separate open and closed trades
  const openPositions = useMemo(() => trades?.filter(t => t.status === 'open') || [], [trades]);
  const closedTrades = useMemo(() => trades?.filter(t => t.status === 'closed') || [], [trades]);

  // Filter closed trades by date/strategy
  const filteredClosedTrades = useMemo(() => {
    let filtered = filterTradesByDateRange(closedTrades, dateRange.from, dateRange.to);
    filtered = filterTradesByStrategies(filtered, selectedStrategyIds);
    return filtered;
  }, [closedTrades, dateRange, selectedStrategyIds]);

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
    try {
      await createTrade.mutateAsync({
        pair: values.pair,
        direction: values.direction,
        entry_price: values.entry_price,
        trade_date: values.trade_date,
        exit_price: values.exit_price,
        stop_loss: values.stop_loss,
        take_profit: values.take_profit,
        quantity: values.quantity,
        pnl: values.pnl,
        fees: values.fees,
        confluence_score: values.confluence_score,
        market_condition: values.market_condition,
        entry_signal: values.entry_signal,
        notes: values.notes,
        trading_account_id: values.trading_account_id,
        session_id: values.session_id,
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

    try {
      await closePosition.mutateAsync({
        id: closingPosition.id,
        exit_price: values.exit_price,
        pnl,
        fees: values.fees,
        notes: values.notes,
      });
      setClosingPosition(null);
      closeForm.reset();
    } catch (error) {
      // Error handled by mutation
    }
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Trading Journal</h1>
            <p className="text-muted-foreground">Document every trade for continuous improvement</p>
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />New Entry</Button>
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
                      {tradingAccounts?.length === 0 && (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          No trading accounts found. Add a Broker or Soft Wallet account first.
                        </div>
                      )}
                      {tradingAccounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4" />
                            <span>{account.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              {formatCurrency(Number(account.balance), account.currency)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Session Selection */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Link to Session (Optional)
                  </Label>
                  <Select 
                    value={form.watch("session_id") || ""} 
                    onValueChange={(v) => form.setValue("session_id", v === "none" ? undefined : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No session" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No session</SelectItem>
                      {sessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {format(new Date(session.session_date), "MMM d, yyyy")} - {session.start_time?.slice(0, 5)}
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
                    <Input {...form.register("pair")} placeholder="BTC/USDT" />
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

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label>Entry Price *</Label>
                    <Input type="number" step="any" {...form.register("entry_price")} />
                  </div>
                  <div>
                    <Label>Exit Price</Label>
                    <Input type="number" step="any" {...form.register("exit_price")} />
                  </div>
                  <div>
                    <Label>Stop Loss</Label>
                    <Input type="number" step="any" {...form.register("stop_loss")} />
                  </div>
                  <div>
                    <Label>Take Profit</Label>
                    <Input type="number" step="any" {...form.register("take_profit")} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Position Size</Label>
                    <Input type="number" step="any" {...form.register("quantity")} />
                  </div>
                  <div>
                    <Label>P&L</Label>
                    <Input type="number" step="any" {...form.register("pnl")} placeholder="0.00" />
                  </div>
                  <div>
                    <Label>Fees</Label>
                    <Input type="number" step="any" {...form.register("fees")} placeholder="0.00" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Market Condition</Label>
                    <Input {...form.register("market_condition")} placeholder="Bullish, Bearish, Ranging" />
                  </div>
                  <div>
                    <Label>Confluence Score (1-10)</Label>
                    <Input type="number" min="1" max="10" {...form.register("confluence_score")} />
                  </div>
                </div>

                {/* Strategy Selection */}
                <div className="space-y-2">
                  <Label>Strategies Used</Label>
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
                    {strategies.length === 0 && (
                      <p className="text-sm text-muted-foreground">No strategies yet. Create one in settings.</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Entry Signal</Label>
                  <Input {...form.register("entry_signal")} placeholder="Break of structure, FVG, Order block..." />
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

        {/* P&L Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
              <Circle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{openPositions.length}</div>
              <p className="text-xs text-muted-foreground">Active trades</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unrealized P&L</CardTitle>
              {totalUnrealizedPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalUnrealizedPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatCurrency(totalUnrealizedPnL, "USD")}
              </div>
              <p className="text-xs text-muted-foreground">From open positions</p>
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
              <div className={`text-2xl font-bold ${totalRealizedPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
                {formatCurrency(totalRealizedPnL, "USD")}
              </div>
              <p className="text-xs text-muted-foreground">From closed trades</p>
            </CardContent>
          </Card>
        </div>

        {/* Open Positions Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Circle className="h-5 w-5 text-primary" />
              Open Positions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {positionsWithPnL.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-10 w-10 text-muted-foreground mb-3" />
                <h3 className="font-medium">No Open Positions</h3>
                <p className="text-sm text-muted-foreground">
                  Create a new trade with status "Open" to track active positions.
                </p>
              </div>
            ) : (
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
            )}
            <p className="text-xs text-muted-foreground text-center mt-4">
              Note: Current prices are simulated. Integrate with a market data API for live prices.
            </p>
          </CardContent>
        </Card>

        <QuickTip storageKey="trading_journal_tip" className="mb-2">
          <strong>Pro tip:</strong> Trades with confluence scores above 7 tend to have higher win rates. 
          Focus on quality setups and document your entry signals for pattern recognition.
        </QuickTip>

        {/* Trade Logs Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Trade Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
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

            {/* Trade entries */}
            <div className="space-y-4">
              {filteredClosedTrades.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No closed trades found"
                  description="No closed trades match your current filters. Try adjusting the date range or strategy filters, or close an open position."
                  action={{
                    label: "Add New Entry",
                    onClick: () => setIsAddOpen(true),
                  }}
                />
              ) : (
                filteredClosedTrades.map((entry) => {
                  const rr = calculateRR(entry);
                  return (
                    <Card key={entry.id} className="border-muted">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <Badge variant={entry.direction === "LONG" ? "default" : "secondary"}>
                              {entry.direction}
                            </Badge>
                            <span className="font-bold text-lg">{entry.pair}</span>
                            <span className="text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(entry.trade_date), "MMM d, yyyy")}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {entry.confluence_score && (
                              <Badge variant="outline">Confluence: {entry.confluence_score}/10</Badge>
                            )}
                            <span className={`font-bold text-lg ${(entry.realized_pnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                              {(entry.realized_pnl || 0) >= 0 ? "+" : ""}{formatCurrency(entry.realized_pnl || 0, "USD")}
                            </span>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setDeletingTrade(entry)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div><span className="text-muted-foreground">Entry:</span> {formatCurrency(entry.entry_price, "USD")}</div>
                          <div><span className="text-muted-foreground">Exit:</span> {entry.exit_price ? formatCurrency(entry.exit_price, "USD") : '-'}</div>
                          <div><span className="text-muted-foreground">R:R:</span> {rr > 0 ? `${rr.toFixed(2)}:1` : '-'}</div>
                          <div><span className="text-muted-foreground">Market:</span> {entry.market_condition || '-'}</div>
                        </div>
                        
                        {entry.strategies && entry.strategies.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            <Target className="h-4 w-4 text-muted-foreground" />
                            {entry.strategies.map(strategy => (
                              <Badge key={strategy.id} variant="secondary">
                                {strategy.name}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {entry.entry_signal && (
                          <div>
                            <span className="text-sm text-muted-foreground">Entry Signal: </span>
                            <span className="text-sm">{entry.entry_signal}</span>
                          </div>
                        )}

                        {entry.notes && (
                          <p className="text-sm text-muted-foreground">{entry.notes}</p>
                        )}

                        {entry.tags && entry.tags.length > 0 && (
                          <div className="flex gap-2 flex-wrap">
                            {entry.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                <Tag className="h-3 w-3 mr-1" />{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

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
