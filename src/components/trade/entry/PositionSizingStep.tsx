/**
 * Step 5: Position Sizing
 * Integrated position size calculator
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Calculator, AlertTriangle, CheckCircle, DollarSign, Percent, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { useRiskProfile } from "@/hooks/use-risk-profile";
import { calculatePositionSize, validateRiskLimits } from "@/lib/calculations/position-sizing";
import type { PositionSizeResult } from "@/types/risk";

interface PositionSizingStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function PositionSizingStep({ onNext, onBack }: PositionSizingStepProps) {
  const wizard = useTradeEntryWizard();
  const { data: riskProfile } = useRiskProfile();
  
  const tradeDetails = wizard.tradeDetails;
  const accountBalance = wizard.accountBalance;
  
  const defaultRiskPercent = riskProfile?.risk_per_trade_percent || 2;
  const [riskPercent, setRiskPercent] = useState(defaultRiskPercent);
  const [leverage, setLeverage] = useState(1);
  const [result, setResult] = useState<PositionSizeResult | null>(null);

  // Calculate position size when inputs change
  useEffect(() => {
    if (!tradeDetails || accountBalance <= 0) return;

    const calculated = calculatePositionSize({
      account_balance: accountBalance,
      risk_percent: riskPercent,
      entry_price: tradeDetails.entryPrice,
      stop_loss_price: tradeDetails.stopLoss,
      leverage,
    });

    setResult(calculated);
    wizard.setPositionSizing(calculated);
  }, [tradeDetails, accountBalance, riskPercent, leverage]);

  // Validate against risk limits
  const riskValidation = result && riskProfile 
    ? validateRiskLimits(result, riskProfile, 0, 0, accountBalance)
    : { canTrade: true, warnings: [] };

  const canProceed = result?.is_valid && riskValidation.canTrade;

  const handleNext = () => {
    if (canProceed && result) {
      onNext();
    }
  };

  if (!tradeDetails) {
    return (
      <div className="text-center py-8">
        <p>Trade details not found. Please go back and fill in trade details.</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            Position Sizing
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Account Info */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Account Balance</p>
                <p className="text-lg font-bold">${accountBalance.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entry Price</p>
                <p className="text-lg font-bold">${tradeDetails.entryPrice.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stop Loss</p>
                <p className="text-lg font-bold text-red-500">${tradeDetails.stopLoss.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Take Profit</p>
                <p className="text-lg font-bold text-green-500">${tradeDetails.takeProfit.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Risk Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Risk per Trade: {riskPercent.toFixed(1)}%
              </Label>
              <Slider
                value={[riskPercent]}
                onValueChange={(v) => setRiskPercent(v[0])}
                min={0.5}
                max={5}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Conservative (0.5%)</span>
                <span>Aggressive (5%)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leverage" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Leverage
              </Label>
              <Input
                id="leverage"
                type="number"
                min={1}
                max={100}
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value) || 1)}
                aria-describedby="leverage-hint"
              />
              <p id="leverage-hint" className="text-xs text-muted-foreground">
                For spot trading, leave at 1x
              </p>
            </div>
          </div>

          {/* Results */}
          {result && (
            <div className="space-y-4">
              <div className={cn(
                "p-6 rounded-lg border-2",
                result.is_valid ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
              )}>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Position Size</p>
                    <p className="text-2xl font-bold">{result.position_size.toFixed(4)}</p>
                    <p className="text-xs text-muted-foreground">units</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Position Value</p>
                    <p className="text-2xl font-bold">${result.position_value.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">total</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Risk Amount</p>
                    <p className="text-2xl font-bold text-red-500">${result.risk_amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">max loss</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Capital Used</p>
                    <p className="text-2xl font-bold">{result.capital_deployment_percent.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">of account</p>
                  </div>
                </div>
              </div>

              {/* Potential Outcomes */}
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-muted-foreground">If SL Hit</p>
                  <p className="font-bold text-red-500">-${result.potential_loss.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground">1R Profit</p>
                  <p className="font-bold text-green-500">+${result.potential_profit_1r.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground">2R Profit</p>
                  <p className="font-bold text-green-500">+${result.potential_profit_2r.toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground">3R Profit</p>
                  <p className="font-bold text-green-500">+${result.potential_profit_3r.toFixed(2)}</p>
                </div>
              </div>

              {/* Warnings */}
              {(result.warnings.length > 0 || riskValidation.warnings.length > 0) && (
                <div className="space-y-2">
                  {[...result.warnings, ...riskValidation.warnings].map((warning, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                      <span className="text-sm text-yellow-600">{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Valid Status */}
              {canProceed && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm font-medium text-green-600">
                    Position size is within risk limits. Ready to proceed.
                  </span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={handleNext} disabled={!canProceed}>
          Next: Final Checklist
        </Button>
      </div>
    </div>
  );
}
