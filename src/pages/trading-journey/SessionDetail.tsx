import { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradingPairCombobox } from "@/components/ui/trading-pair-combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { ArrowLeft, Plus, Clock, Calendar, TrendingUp, TrendingDown, Target, MoreVertical, Trash2, Smile, Meh, Frown, Star, DollarSign, BarChart3, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useTradingSessions } from "@/hooks/use-trading-sessions";
import { useTradeEntries, useCreateTradeEntry, useDeleteTradeEntry, TradeEntry, CreateTradeEntryInput } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useAccounts } from "@/hooks/use-accounts";
import { useUserSettings } from "@/hooks/use-user-settings";

import { formatCurrency as formatCurrencyUtil } from "@/lib/formatters";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Binance Futures fee rates
const BINANCE_MAKER_FEE = 0.0002;
const BINANCE_TAKER_FEE = 0.0005;

const moodIcons = {
  positive: Smile,
  neutral: Meh,
  negative: Frown,
};

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
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

export default function SessionDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const { data: sessions = [], isLoading: sessionsLoading } = useTradingSessions();
  const { data: allTrades = [], isLoading: tradesLoading } = useTradeEntries();
  const { data: strategies = [] } = useTradingStrategies();
  const { data: accounts = [] } = useAccounts();
  const { data: userSettings } = useUserSettings();
  
  const createTrade = useCreateTradeEntry();
  const deleteTrade = useDeleteTradeEntry();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [deletingTrade, setDeletingTrade] = useState<TradeEntry | null>(null);
  const [newTradeStrategies, setNewTradeStrategies] = useState<string[]>([]);

  const defaultCurrency = userSettings?.default_currency || 'USD';

  const formatCurrency = (value: number, currency?: string) => 
    formatCurrencyUtil(value, currency || defaultCurrency);

  const session = sessions.find(s => s.id === sessionId);
  const sessionTrades = useMemo(() => 
    allTrades.filter(t => t.session_id === sessionId),
    [allTrades, sessionId]
  );

  const tradingAccounts = accounts?.filter(a => 
    a.is_active && a.account_type === 'trading'
  );

  const form = useForm<TradeFormValues>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      direction: "LONG",
      quantity: 1,
      trade_date: session?.session_date || new Date().toISOString().split('T')[0],
      fee_type: "taker",
    },
  });

  // Stats calculations
  const totalPnL = sessionTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const winTrades = sessionTrades.filter(t => (t.pnl || 0) > 0).length;
  const lossTrades = sessionTrades.filter(t => (t.pnl || 0) < 0).length;
  const winRate = sessionTrades.length > 0 ? (winTrades / sessionTrades.length) * 100 : 0;

  const handleSubmit = async (values: TradeFormValues) => {
    const feeRate = values.fee_type === 'maker' ? BINANCE_MAKER_FEE : BINANCE_TAKER_FEE;
    const calculatedFees = values.quantity * feeRate * 2;

    try {
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
        status: 'closed',
        strategy_ids: newTradeStrategies,
      });
      setIsAddOpen(false);
      form.reset({
        direction: "LONG",
        quantity: 1,
        trade_date: session?.session_date || new Date().toISOString().split('T')[0],
        fee_type: "taker",
      });
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

  if (sessionsLoading || tradesLoading) {
    return (
      <DashboardLayout>
        <MetricsGridSkeleton />
      </DashboardLayout>
    );
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate('/trading/sessions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sessions
          </Button>
          <EmptyState
            icon={Calendar}
            title="Session not found"
            description="The trading session you're looking for doesn't exist."
            action={{
              label: "View All Sessions",
              onClick: () => navigate('/trading/sessions'),
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  const MoodIcon = moodIcons[session.mood as keyof typeof moodIcons] || Meh;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/trading/sessions')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Session: {format(new Date(session.session_date), "MMMM d, yyyy")}
              </h1>
              <div className="flex items-center gap-3 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {session.start_time?.slice(0, 5)} - {session.end_time?.slice(0, 5) || 'Ongoing'}
                </span>
                <span className="flex items-center gap-1">
                  <MoodIcon className="h-4 w-4" />
                  {session.mood}
                </span>
                <span className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < session.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`}
                    />
                  ))}
                </span>
              </div>
            </div>
          </div>
          
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Add Trade</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add Trade to Session</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
                {/* Trading Account */}
                <div className="space-y-2">
                  <Label>Trading Account</Label>
                  <Select 
                    value={form.watch("trading_account_id") || ""} 
                    onValueChange={(v) => form.setValue("trading_account_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {tradingAccounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name} - {formatCurrency(Number(account.balance), account.currency)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Pair *</Label>
                    <TradingPairCombobox
                      value={form.watch("pair") || ""}
                      onValueChange={(v) => form.setValue("pair", v)}
                      placeholder="Select pair"
                    />
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
                    <Label>Date</Label>
                    <Input type="date" {...form.register("trade_date")} />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Position Size *</Label>
                    <Input type="number" step="any" {...form.register("quantity")} />
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
                  <Label>Fee Type</Label>
                  <div className="flex gap-4">
                    {["maker", "taker"].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={form.watch("fee_type") === type}
                          onChange={() => form.setValue("fee_type", type as "maker" | "taker")}
                          className="sr-only"
                        />
                        <div className={`px-3 py-2 rounded-lg border transition-all ${
                          form.watch("fee_type") === type 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover:border-muted-foreground"
                        }`}>
                          {type === "maker" ? "Maker (0.02%)" : "Taker (0.05%)"}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Strategy Selection */}
                <div className="space-y-2">
                  <Label>Strategies</Label>
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
                </div>

                <div>
                  <Label>Notes</Label>
                  <Textarea {...form.register("notes")} placeholder="Trade notes..." />
                </div>

                <Button type="submit" disabled={createTrade.isPending}>
                  {createTrade.isPending ? "Saving..." : "Add Trade"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Session Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessionTrades.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Session P&L</CardTitle>
              {totalPnL >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatCurrency(totalPnL, 'USD')}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{winRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">{winTrades}W / {lossTrades}L</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Market Condition</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">{session.market_condition || 'N/A'}</div>
            </CardContent>
          </Card>
        </div>

        {/* Session Notes */}
        {session.notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Session Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground whitespace-pre-wrap">{session.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Trades Table */}
        <Card>
          <CardHeader>
            <CardTitle>Trades in this Session</CardTitle>
            <CardDescription>All trades linked to this trading session</CardDescription>
          </CardHeader>
          <CardContent>
            {sessionTrades.length === 0 ? (
              <EmptyState
                icon={TrendingUp}
                title="No trades yet"
                description="Add your first trade to this session to track your performance."
                action={{
                  label: "Add Trade",
                  onClick: () => setIsAddOpen(true),
                }}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pair</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Fees</TableHead>
                    <TableHead>Strategies</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionTrades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">{trade.pair}</TableCell>
                      <TableCell>
                        <Badge variant={trade.direction === 'LONG' ? 'default' : 'secondary'}>
                          {trade.direction}
                        </Badge>
                      </TableCell>
                      <TableCell>{trade.quantity}</TableCell>
                      <TableCell className={trade.pnl && trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {formatCurrency(trade.pnl || 0, 'USD')}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        ${(trade.fees || 0).toFixed(4)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {trade.strategies?.map(s => (
                            <Badge key={s.id} variant="outline" className="text-xs">
                              {s.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {trade.notes || '-'}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => setDeletingTrade(trade)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deletingTrade}
          onOpenChange={(open) => !open && setDeletingTrade(null)}
          title="Delete Trade"
          description="Are you sure you want to delete this trade? This action cannot be undone."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </div>
    </DashboardLayout>
  );
}
