import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Plus, Calendar, Tag, Target, Building2, TrendingUp, BookOpen, MoreVertical, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useAccounts } from "@/hooks/use-accounts";
import { useTradeEntries, useCreateTradeEntry, useDeleteTradeEntry, TradeEntry } from "@/hooks/use-trade-entries";
import { useTradingStrategies, useCreateTradingStrategy, TradingStrategy } from "@/hooks/use-trading-strategies";
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
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

export default function TradingJournal() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
  const [newTradeStrategies, setNewTradeStrategies] = useState<string[]>([]);
  const [deletingTrade, setDeletingTrade] = useState<TradeEntry | null>(null);

  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: trades, isLoading: tradesLoading } = useTradeEntries();
  const { data: strategies = [] } = useTradingStrategies();
  const createTrade = useCreateTradeEntry();
  const deleteTrade = useDeleteTradeEntry();
  const createStrategy = useCreateTradingStrategy();

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      direction: "LONG",
      quantity: 1,
      trade_date: new Date().toISOString().split('T')[0],
    },
  });

  // Filter accounts suitable for trading (broker type)
  const tradingAccounts = accounts?.filter(a => 
    a.is_active && (a.account_type === 'broker' || a.account_type === 'soft_wallet')
  );

  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    let filtered = filterTradesByDateRange(trades, dateRange.from, dateRange.to);
    filtered = filterTradesByStrategies(filtered, selectedStrategyIds);
    return filtered;
  }, [trades, dateRange, selectedStrategyIds]);

  const formatCurrencyLocal = (v: number) => {
    if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
    return `$${v.toFixed(0)}`;
  };

  const handleAddStrategy = async (strategyData: { name: string; description: string; tags: string[] }) => {
    try {
      const result = await createStrategy.mutateAsync(strategyData);
      setNewTradeStrategies(prev => [...prev, result.id]);
    } catch (error) {
      // Error handled by mutation
    }
  };

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
        strategy_ids: newTradeStrategies,
      });
      setIsAddOpen(false);
      form.reset();
      setNewTradeStrategies([]);
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

        {/* Trading Accounts Summary */}
        {tradingAccounts && tradingAccounts.length > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="font-semibold">Trading Accounts</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {tradingAccounts.slice(0, 4).map((account) => (
                  <div key={account.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border">
                    <span className="text-sm font-medium">{account.name}</span>
                    <Badge variant="secondary">
                      {formatCurrency(Number(account.balance), account.currency)}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <QuickTip storageKey="trading_journal_tip" className="mb-2">
          <strong>Pro tip:</strong> Trades with confluence scores above 7 tend to have higher win rates. 
          Focus on quality setups and document your entry signals for pattern recognition.
        </QuickTip>

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

        {/* Journal Entries */}
        <div className="space-y-4">
          {filteredTrades.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No trades found"
              description="No trades match your current filters. Try adjusting the date range or strategy filters, or add your first trade entry."
              action={{
                label: "Add New Entry",
                onClick: () => setIsAddOpen(true),
              }}
            />
          ) : (
            filteredTrades.map((entry) => {
              const rr = calculateRR(entry);
              return (
                <Card key={entry.id}>
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
                        <span className={`font-bold text-lg ${(entry.pnl || 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {(entry.pnl || 0) >= 0 ? "+" : ""}{formatCurrencyLocal(entry.pnl || 0)}
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
                      <div><span className="text-muted-foreground">Entry:</span> {entry.entry_price}</div>
                      <div><span className="text-muted-foreground">Exit:</span> {entry.exit_price || '-'}</div>
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
