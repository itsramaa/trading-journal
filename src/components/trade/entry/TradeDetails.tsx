/**
 * Step 3: Trade Details
 */
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { TIMEFRAME_OPTIONS, type TimeframeType } from "@/types/strategy";

const tradeDetailsSchema = z.object({
  pair: z.string().min(1, "Pair is required"),
  direction: z.enum(["LONG", "SHORT"]),
  timeframe: z.string().min(1, "Timeframe is required"),
  entryPrice: z.coerce.number().positive("Entry price must be positive"),
  stopLoss: z.coerce.number().positive("Stop loss must be positive"),
  takeProfit: z.coerce.number().positive("Take profit must be positive"),
});

type TradeDetailsFormValues = z.infer<typeof tradeDetailsSchema>;

interface TradeDetailsProps {
  onNext: () => void;
  onBack: () => void;
}

export function TradeDetails({ onNext, onBack }: TradeDetailsProps) {
  const wizard = useTradeEntryWizard();
  const strategyDetails = wizard.strategyDetails;

  const form = useForm<TradeDetailsFormValues>({
    resolver: zodResolver(tradeDetailsSchema),
    defaultValues: {
      pair: wizard.tradeDetails?.pair || "",
      direction: wizard.tradeDetails?.direction || "LONG",
      timeframe: wizard.tradeDetails?.timeframe || (strategyDetails as any)?.timeframe || "1h",
      entryPrice: wizard.tradeDetails?.entryPrice || 0,
      stopLoss: wizard.tradeDetails?.stopLoss || 0,
      takeProfit: wizard.tradeDetails?.takeProfit || 0,
    },
  });

  const direction = form.watch("direction");
  const validPairs = (strategyDetails as any)?.valid_pairs || [];

  // Simulate current price (for demo)
  const entryPrice = form.watch("entryPrice");
  const simulatedCurrentPrice = entryPrice * (1 + (Math.random() - 0.5) * 0.001);

  const handleSubmit = (values: TradeDetailsFormValues) => {
    wizard.setTradeDetails({
      pair: values.pair,
      direction: values.direction,
      timeframe: values.timeframe as TimeframeType,
      entryPrice: values.entryPrice,
      stopLoss: values.stopLoss,
      takeProfit: values.takeProfit,
      currentPrice: simulatedCurrentPrice,
    });
    onNext();
  };

  // Calculate R:R ratio
  const stopLoss = form.watch("stopLoss");
  const takeProfit = form.watch("takeProfit");
  const calculateRR = () => {
    if (!entryPrice || !stopLoss || !takeProfit) return null;
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    if (risk === 0) return null;
    return (reward / risk).toFixed(2);
  };
  const rrRatio = calculateRR();
  const minRR = (strategyDetails as any)?.min_rr || 1.5;
  const isRRValid = rrRatio ? parseFloat(rrRatio) >= minRR : false;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Trade Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Pair and Direction */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pair">Trading Pair *</Label>
                <Input
                  id="pair"
                  {...form.register("pair")}
                  placeholder="BTC/USDT"
                  className="uppercase"
                  aria-describedby={form.formState.errors.pair ? "pair-error" : undefined}
                  aria-invalid={!!form.formState.errors.pair}
                />
                {form.formState.errors.pair && (
                  <p id="pair-error" className="text-xs text-destructive" role="alert">
                    {form.formState.errors.pair.message}
                  </p>
                )}
                {validPairs.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-xs text-muted-foreground">Valid pairs:</span>
                    {validPairs.map((pair: string) => (
                      <Badge
                        key={pair}
                        variant="outline"
                        className="text-xs cursor-pointer hover:bg-primary/10"
                        onClick={() => form.setValue("pair", pair)}
                      >
                        {pair}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Direction *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={direction === "LONG" ? "default" : "outline"}
                    className={direction === "LONG" ? "bg-green-600 hover:bg-green-700" : ""}
                    onClick={() => form.setValue("direction", "LONG")}
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    LONG
                  </Button>
                  <Button
                    type="button"
                    variant={direction === "SHORT" ? "default" : "outline"}
                    className={direction === "SHORT" ? "bg-red-600 hover:bg-red-700" : ""}
                    onClick={() => form.setValue("direction", "SHORT")}
                  >
                    <TrendingDown className="h-4 w-4 mr-2" />
                    SHORT
                  </Button>
                </div>
              </div>
            </div>

            {/* Timeframe */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeframe *
              </Label>
              <Select
                value={form.watch("timeframe")}
                onValueChange={(v) => form.setValue("timeframe", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timeframe" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEFRAME_OPTIONS.map((tf) => (
                    <SelectItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryPrice">Entry Price *</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="any"
                  {...form.register("entryPrice")}
                  placeholder="0.00"
                  aria-describedby={form.formState.errors.entryPrice ? "entryPrice-error" : undefined}
                  aria-invalid={!!form.formState.errors.entryPrice}
                />
                {form.formState.errors.entryPrice && (
                  <p id="entryPrice-error" className="text-xs text-destructive" role="alert">
                    {form.formState.errors.entryPrice.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stopLoss" className="text-red-500">Stop Loss *</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  step="any"
                  {...form.register("stopLoss")}
                  placeholder="0.00"
                  className="border-red-500/30"
                  aria-describedby={form.formState.errors.stopLoss ? "stopLoss-error" : undefined}
                  aria-invalid={!!form.formState.errors.stopLoss}
                />
                {form.formState.errors.stopLoss && (
                  <p id="stopLoss-error" className="text-xs text-destructive" role="alert">
                    {form.formState.errors.stopLoss.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="takeProfit" className="text-green-500">Take Profit *</Label>
                <Input
                  id="takeProfit"
                  type="number"
                  step="any"
                  {...form.register("takeProfit")}
                  placeholder="0.00"
                  className="border-green-500/30"
                  aria-describedby={form.formState.errors.takeProfit ? "takeProfit-error" : undefined}
                  aria-invalid={!!form.formState.errors.takeProfit}
                />
                {form.formState.errors.takeProfit && (
                  <p id="takeProfit-error" className="text-xs text-destructive" role="alert">
                    {form.formState.errors.takeProfit.message}
                  </p>
                )}
              </div>
            </div>

            {/* R:R Ratio Display */}
            {rrRatio && (
              <div className={`p-4 rounded-lg border ${isRRValid ? 'border-green-500/30 bg-green-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk:Reward Ratio</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-2xl font-bold ${isRRValid ? 'text-green-500' : 'text-yellow-500'}`}>
                      1:{rrRatio}
                    </span>
                    <Badge variant={isRRValid ? "default" : "secondary"}>
                      Min {minRR}:1
                    </Badge>
                  </div>
                </div>
                {!isRRValid && (
                  <p className="text-xs text-yellow-500 mt-2">
                    R:R is below minimum. Consider adjusting your TP or SL.
                  </p>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={onBack}>
                Back
              </Button>
              <Button type="submit">
                Next: Confluence Check
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
