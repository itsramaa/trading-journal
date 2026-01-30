/**
 * Position Size Calculator Component - Per Trading Journey Markdown spec
 * Now uses Binance balance as primary source when connected
 * Enhanced: Heuristic Evaluation + Accessibility fixes
 */
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Calculator, AlertTriangle, CheckCircle, TrendingUp, TrendingDown, Wifi } from "lucide-react";
import { calculatePositionSize } from "@/lib/calculations/position-sizing";
import { useRiskProfile } from "@/hooks/use-risk-profile";
import { useBestAvailableBalance } from "@/hooks/use-combined-balance";

interface PositionSizeCalculatorProps {
  accountBalance?: number;
  onCalculate?: (result: ReturnType<typeof calculatePositionSize>) => void;
}

export function PositionSizeCalculator({ 
  accountBalance: initialBalance,
  onCalculate 
}: PositionSizeCalculatorProps) {
  const { data: riskProfile, isLoading: profileLoading } = useRiskProfile();
  const { balance: combinedBalance, source, isLoading: balanceLoading } = useBestAvailableBalance();
  
  // Use combined balance (Binance if connected, else Paper accounts)
  const defaultBalance = useMemo(() => {
    if (initialBalance && initialBalance > 0) return initialBalance;
    if (combinedBalance > 0) return combinedBalance;
    return 10000;
  }, [combinedBalance, initialBalance]);
  
  const [accountBalance, setAccountBalance] = useState(defaultBalance);
  const [riskPercent, setRiskPercent] = useState(2);
  const [entryPrice, setEntryPrice] = useState(50000);
  const [stopLossPrice, setStopLossPrice] = useState(49000);
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState(1);

  // Update when risk profile loads
  useEffect(() => {
    if (riskProfile?.risk_per_trade_percent) {
      setRiskPercent(riskProfile.risk_per_trade_percent);
    }
  }, [riskProfile]);
  
  // Update when combined balance changes
  useEffect(() => {
    if (defaultBalance > 0) {
      setAccountBalance(defaultBalance);
    }
  }, [defaultBalance]);

  const result = useMemo(() => {
    const calc = calculatePositionSize({
      account_balance: accountBalance,
      risk_percent: riskPercent,
      entry_price: entryPrice,
      stop_loss_price: stopLossPrice,
      leverage,
    });
    onCalculate?.(calc);
    return calc;
  }, [accountBalance, riskPercent, entryPrice, stopLossPrice, leverage, onCalculate]);

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  const formatQuantity = (value: number) => {
    if (value >= 1) {
      return value.toFixed(4);
    }
    return value.toFixed(8);
  };

  const isLoading = profileLoading || balanceLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Position Size Calculator
          </CardTitle>
          <CardDescription>
            Loading your risk settings...
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Position Size Calculator
        </CardTitle>
        <CardDescription>
          Calculate optimal position size based on your risk parameters
          {riskProfile && (
            <span className="block text-xs mt-1 text-primary">
              Using your Risk Profile settings
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Account Balance ($)
              {source === 'binance' && (
                <Badge variant="outline" className="text-xs gap-1">
                  <Wifi className="h-3 w-3" aria-hidden="true" />
                  Binance
                </Badge>
              )}
              <InfoTooltip 
                content="Your total trading capital. Uses Binance wallet balance when connected."
                variant="info"
              />
            </Label>
            <Input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Number(e.target.value))}
              min={0}
              aria-label="Account balance in USD"
            />
            <p className="text-xs text-muted-foreground">
              {source === 'binance' ? 'From Binance wallet' : 'From paper trading account(s)'}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Risk per Trade (%)
              <InfoTooltip 
                content="The percentage of your account you're willing to lose if this trade hits stop loss. 1-2% is recommended."
                variant="help"
              />
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[riskPercent]}
                onValueChange={([value]) => setRiskPercent(value)}
                min={0.5}
                max={5}
                step={0.5}
                className="flex-1"
                aria-label={`Risk per trade: ${riskPercent}%`}
              />
              <span className="w-12 text-right font-medium">{riskPercent}%</span>
            </div>
            {riskProfile && (
              <p className="text-xs text-muted-foreground">
                Profile default: {riskProfile.risk_per_trade_percent}%
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Entry Price ($)
              <InfoTooltip 
                content="The price at which you plan to enter the trade."
                variant="info"
              />
            </Label>
            <Input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(Number(e.target.value))}
              min={0}
              step={0.01}
              aria-label="Entry price in USD"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Stop Loss Price ($)
              <InfoTooltip 
                content="The price at which you will exit the trade to limit losses. Must be below entry for longs, above for shorts."
                variant="warning"
              />
            </Label>
            <Input
              type="number"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(Number(e.target.value))}
              min={0}
              step={0.01}
              aria-label="Stop loss price in USD"
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Direction
              <InfoTooltip 
                content="Long: profit when price goes up. Short: profit when price goes down. Choose based on your market analysis."
                variant="info"
              />
            </Label>
            <div className="flex gap-2" role="group" aria-label="Trade direction">
              <button
                type="button"
                onClick={() => setDirection('long')}
                aria-pressed={direction === 'long'}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                  direction === 'long'
                    ? 'bg-profit-muted border-profit/50 text-profit'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <TrendingUp className="h-4 w-4" aria-hidden="true" />
                Long
              </button>
              <button
                type="button"
                onClick={() => setDirection('short')}
                aria-pressed={direction === 'short'}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                  direction === 'short'
                    ? 'bg-loss-muted border-loss/50 text-loss'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <TrendingDown className="h-4 w-4" aria-hidden="true" />
                Short
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Leverage
              <InfoTooltip 
                content="Multiplies both gains and losses. 10x leverage means 1% price move = 10% account change. Higher leverage = higher liquidation risk."
                variant="warning"
              />
            </Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[leverage]}
                onValueChange={([value]) => setLeverage(value)}
                min={1}
                max={20}
                step={1}
                className="flex-1"
                aria-label={`Leverage: ${leverage}x`}
              />
              <span className="w-12 text-right font-medium">{leverage}x</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Results Section */}
        <div className="space-y-4">
          <h4 className="font-semibold">Calculation Results</h4>
          
          <div className="grid gap-3 md:grid-cols-2">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Position Size</p>
              <p className="text-2xl font-bold">{formatQuantity(result.position_size)}</p>
              <p className="text-sm text-muted-foreground">units</p>
            </div>
            
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Position Value</p>
              <p className="text-2xl font-bold">{formatCurrency(result.position_value)}</p>
              <p className="text-sm text-muted-foreground">
                {result.capital_deployment_percent.toFixed(1)}% of capital
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-loss-muted">
              <p className="text-sm text-muted-foreground">Risk Amount (1R)</p>
              <p className="text-2xl font-bold text-loss">
                -{formatCurrency(result.potential_loss)}
              </p>
              <p className="text-sm text-muted-foreground">
                {result.stop_distance_percent.toFixed(2)}% stop distance
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-profit-muted">
              <p className="text-sm text-muted-foreground">Potential Profit (2R)</p>
              <p className="text-2xl font-bold text-profit">
                +{formatCurrency(result.potential_profit_2r)}
              </p>
              <p className="text-sm text-muted-foreground">
                3R: +{formatCurrency(result.potential_profit_3r)}
              </p>
            </div>
          </div>

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <Alert variant={result.is_valid ? "default" : "destructive"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {result.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {result.is_valid && result.warnings.length === 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4 text-profit" />
              <AlertDescription className="text-profit">
                Position size is within acceptable risk parameters
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Quick Reference */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">1R = {formatCurrency(result.potential_profit_1r)}</Badge>
          <Badge variant="outline">2R = {formatCurrency(result.potential_profit_2r)}</Badge>
          <Badge variant="outline">3R = {formatCurrency(result.potential_profit_3r)}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
