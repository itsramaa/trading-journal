/**
 * Step 3: Position Sizing & Price Levels
 * Entry, SL, TP inputs + position size calculator
 * Includes leverage tier warnings from Binance API
 * Enhanced: Paper account balance validation
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Calculator, AlertTriangle, CheckCircle, DollarSign, Percent, TrendingUp, Gauge, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { useRiskProfile } from "@/hooks/use-risk-profile";
import { usePaperAccountValidation } from "@/hooks/use-paper-account-validation";
import { calculatePositionSize, validateRiskLimits } from "@/lib/calculations/position-sizing";
import { useBinanceLeverageBrackets, getMaxLeverageForNotional } from "@/features/binance";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { PositionSizeResult } from "@/types/risk";

interface PositionSizingStepProps {
  onNext: () => void;
  onBack: () => void;
}

export function PositionSizingStep({ onNext, onBack }: PositionSizingStepProps) {
  const wizard = useTradeEntryWizard();
  const { data: riskProfile } = useRiskProfile();
  const { validateTradeBalance, isPaperAccount } = usePaperAccountValidation();
  const { format: formatCurrency, formatPnl } = useCurrencyConversion();
  
  const tradeDetails = wizard.tradeDetails;
  const accountBalance = wizard.accountBalance;
  const tradingAccountId = wizard.tradingAccountId;
  const strategyDetails = wizard.strategyDetails;
  
  // Check if using paper account
  const isUsingPaperAccount = isPaperAccount(tradingAccountId || null);
  
  // Fetch leverage brackets for the trading pair
  const symbol = tradeDetails?.pair || "BTCUSDT";
  const { data: leverageBrackets, isLoading: bracketsLoading } = useBinanceLeverageBrackets(symbol);
  
  // Price levels state
  const [entryPrice, setEntryPrice] = useState(wizard.priceLevels?.entryPrice || 0);
  const [stopLoss, setStopLoss] = useState(wizard.priceLevels?.stopLoss || 0);
  const [takeProfit, setTakeProfit] = useState(wizard.priceLevels?.takeProfit || 0);
  
  // Position sizing state
  const defaultRiskPercent = riskProfile?.risk_per_trade_percent || 2;
  const [riskPercent, setRiskPercent] = useState(defaultRiskPercent);
  const [leverage, setLeverage] = useState(1);
  const [result, setResult] = useState<PositionSizeResult | null>(null);
  
  // Calculate max allowed leverage based on position notional value
  const notionalValue = result?.position_value || 0;
  const maxAllowedLeverage = leverageBrackets && 'brackets' in leverageBrackets
    ? getMaxLeverageForNotional(leverageBrackets, notionalValue)
    : 125;
  
  // Leverage tier warning
  const isLeverageExceeded = leverage > maxAllowedLeverage;

  // Calculate R:R ratio
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

  // Calculate position size when inputs change
  useEffect(() => {
    if (!entryPrice || !stopLoss || accountBalance <= 0) {
      setResult(null);
      return;
    }

    const calculated = calculatePositionSize({
      account_balance: accountBalance,
      risk_percent: riskPercent,
      entry_price: entryPrice,
      stop_loss_price: stopLoss,
      leverage,
    });

    setResult(calculated);
    wizard.setPositionSizing(calculated);
    wizard.setPriceLevels({ entryPrice, stopLoss, takeProfit });
  }, [entryPrice, stopLoss, takeProfit, accountBalance, riskPercent, leverage]);

  // Validate against risk limits
  const riskValidation = result && riskProfile 
    ? validateRiskLimits(result, riskProfile, 0, 0, accountBalance)
    : { canTrade: true, warnings: [] };

  // Paper account balance validation
  const paperValidation = result && isUsingPaperAccount
    ? validateTradeBalance(tradingAccountId || null, result.position_value)
    : { valid: true, message: undefined };

  const pricesValid = entryPrice > 0 && stopLoss > 0 && takeProfit > 0;
  const canProceed = pricesValid && result?.is_valid && riskValidation.canTrade && paperValidation.valid;

  const handleNext = () => {
    if (canProceed && result) {
      onNext();
    }
  };

  if (!tradeDetails) {
    return (
      <div className="text-center py-8">
        <p>Trade setup not found. Please go back and complete setup.</p>
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
            Sizing & Price Levels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trade Context */}
          <div className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={tradeDetails.direction === 'LONG' ? 'default' : 'destructive'}>
                {tradeDetails.direction}
              </Badge>
              <span className="font-medium">{tradeDetails.pair}</span>
              <span className="text-sm text-muted-foreground">{tradeDetails.timeframe}</span>
            </div>
            <span className="text-sm text-muted-foreground">
              Balance: {formatCurrency(accountBalance)}
              {isUsingPaperAccount && (
                <Badge variant="secondary" className="ml-2 text-xs">Paper</Badge>
              )}
            </span>
          </div>

          {/* Price Levels */}
          <div className="space-y-4">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Price Levels
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="entryPrice">Entry Price *</Label>
                <Input
                  id="entryPrice"
                  type="number"
                  step="any"
                  value={entryPrice || ""}
                  onChange={(e) => setEntryPrice(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stopLoss" className="text-red-500">Stop Loss *</Label>
                <Input
                  id="stopLoss"
                  type="number"
                  step="any"
                  value={stopLoss || ""}
                  onChange={(e) => setStopLoss(Number(e.target.value))}
                  placeholder="0.00"
                  className="border-red-500/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="takeProfit" className="text-green-500">Take Profit *</Label>
                <Input
                  id="takeProfit"
                  type="number"
                  step="any"
                  value={takeProfit || ""}
                  onChange={(e) => setTakeProfit(Number(e.target.value))}
                  placeholder="0.00"
                  className="border-green-500/30"
                />
              </div>
            </div>

            {/* R:R Ratio Display */}
            {rrRatio && (
              <div className={cn(
                "p-3 rounded-lg border",
                isRRValid ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"
              )}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Risk:Reward Ratio</span>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-xl font-bold",
                      isRRValid ? "text-green-500" : "text-yellow-500"
                    )}>
                      1:{rrRatio}
                    </span>
                    <Badge variant={isRRValid ? "default" : "secondary"}>
                      Min {minRR}:1
                    </Badge>
                  </div>
                </div>
                {!isRRValid && (
                  <p className="text-xs text-yellow-500 mt-2">
                    R:R is below strategy minimum. Consider adjusting your TP or SL.
                  </p>
                )}
              </div>
            )}
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
                {!bracketsLoading && leverageBrackets && (
                  <Badge variant="outline" className="text-xs">
                    Max: {maxAllowedLeverage}x
                  </Badge>
                )}
              </Label>
              <Input
                id="leverage"
                type="number"
                min={1}
                max={maxAllowedLeverage}
                value={leverage}
                onChange={(e) => setLeverage(Math.min(Number(e.target.value) || 1, maxAllowedLeverage))}
                className={cn(isLeverageExceeded && "border-red-500")}
              />
              <p className="text-xs text-muted-foreground">
                For spot trading, leave at 1x
              </p>
              
              {/* Leverage Tier Warning */}
              {isLeverageExceeded && (
                <div className="flex items-center gap-2 p-2 rounded bg-red-500/10 border border-red-500/30 text-red-500">
                  <Gauge className="h-4 w-4 shrink-0" />
                  <span className="text-xs">
                    Leverage {leverage}x exceeds max {maxAllowedLeverage}x for ${notionalValue.toLocaleString()} notional
                  </span>
                </div>
              )}
              
              {/* Dynamic leverage tier info */}
              {!isLeverageExceeded && leverageBrackets && 'brackets' in leverageBrackets && notionalValue > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Gauge className="h-3 w-3" />
                  <span>
                    Tier allows up to {maxAllowedLeverage}x for current position size
                  </span>
                </div>
              )}
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
                    <p className="text-2xl font-bold">{formatCurrency(result.position_value)}</p>
                    <p className="text-xs text-muted-foreground">total</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Risk Amount</p>
                    <p className="text-2xl font-bold text-red-500">{formatCurrency(result.risk_amount)}</p>
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
                  <p className="font-bold text-red-500">{formatPnl(-result.potential_loss)}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground">1R Profit</p>
                  <p className="font-bold text-green-500">{formatPnl(result.potential_profit_1r)}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground">2R Profit</p>
                  <p className="font-bold text-green-500">{formatPnl(result.potential_profit_2r)}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-muted-foreground">3R Profit</p>
                  <p className="font-bold text-green-500">{formatPnl(result.potential_profit_3r)}</p>
                </div>
              </div>

              {/* Warnings */}
              {(result.warnings.length > 0 || riskValidation.warnings.length > 0 || (paperValidation.message && !paperValidation.valid)) && (
                <div className="space-y-2">
                  {[...result.warnings, ...riskValidation.warnings].map((warning, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                      <span className="text-sm text-yellow-600">{warning}</span>
                    </div>
                  ))}
                  
                  {/* Paper Account Balance Error */}
                  {!paperValidation.valid && paperValidation.message && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                      <Wallet className="h-4 w-4 text-red-500 shrink-0" />
                      <span className="text-sm text-red-600">{paperValidation.message}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Paper Account Balance Warning (when valid but high usage) */}
              {paperValidation.valid && paperValidation.message && isUsingPaperAccount && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <Wallet className="h-4 w-4 text-yellow-500 shrink-0" />
                  <span className="text-sm text-yellow-600">{paperValidation.message}</span>
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
