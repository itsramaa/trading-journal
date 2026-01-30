/**
 * Trade Quick Entry Form - Quick trade entry dialog
 */
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TradingPairCombobox } from "@/components/ui/trading-pair-combobox";
import { Plus, Building2, TrendingUp, Circle, CheckCircle } from "lucide-react";
import type { TradingStrategy } from "@/hooks/use-trading-strategies";

// Binance Futures fee rates
const BINANCE_MAKER_FEE = 0.0002;
const BINANCE_TAKER_FEE = 0.0005;

const tradeFormSchema = z.object({
  pair: z.string().min(1, "Trading pair is required."),
  direction: z.enum(["LONG", "SHORT"]),
  trade_date: z.string().min(1, "Trade date is required."),
  quantity: z.coerce.number().positive("Position size must be greater than zero.").default(1),
  pnl: z.coerce.number().optional(),
  rr_achieved: z.coerce.number().optional(),
  fee_type: z.enum(["maker", "taker"]).default("taker"),
  notes: z.string().optional(),
  trading_account_id: z.string().optional(),
  status: z.enum(["open", "closed"]).default("closed"),
});

type TradeFormValues = z.infer<typeof tradeFormSchema>;

interface TradingAccount {
  id: string;
  name: string;
  current_balance: number;
  currency: string;
  is_active: boolean;
}

interface TradeQuickEntryFormProps {
  tradingAccounts: TradingAccount[];
  accountsLoading: boolean;
  strategies: TradingStrategy[];
  onSubmit: (values: TradeFormValues, strategyIds: string[]) => Promise<void>;
  isPending: boolean;
  formatCurrency: (value: number, currency: string) => string;
}

export function TradeQuickEntryForm({
  tradingAccounts,
  accountsLoading,
  strategies,
  onSubmit,
  isPending,
  formatCurrency,
}: TradeQuickEntryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStrategies, setSelectedStrategies] = useState<string[]>([]);

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

  const activeTradingAccounts = tradingAccounts?.filter(a => a.is_active) || [];

  const handleSubmit = async (values: TradeFormValues) => {
    await onSubmit(values, selectedStrategies);
    setIsOpen(false);
    form.reset();
    setSelectedStrategies([]);
  };

  const estimatedFee = (form.watch("quantity") || 0) * 
    (form.watch("fee_type") === "maker" ? BINANCE_MAKER_FEE : BINANCE_TAKER_FEE) * 2;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" aria-label="Open quick trade entry form">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Quick Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="trade-form-description">
        <DialogHeader>
          <DialogTitle>New Trade Entry</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="grid gap-4 py-4">
          {/* Trading Account Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" aria-hidden="true" />
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
                    No trading accounts found.
                  </div>
                )}
                {activeTradingAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" aria-hidden="true" />
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
                  <Circle className="h-4 w-4" aria-hidden="true" />
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
                  <CheckCircle className="h-4 w-4" aria-hidden="true" />
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

          {/* Fee Type */}
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
              Estimated fee: ${estimatedFee.toFixed(4)}
            </p>
          </div>

          {/* Strategy Selection */}
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
                  <Plus className="h-3 w-3" aria-hidden="true" />
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
                    variant={selectedStrategies.includes(strategy.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedStrategies(prev =>
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

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
