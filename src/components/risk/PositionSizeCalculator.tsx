/**
 * Position Size Calculator Component - Per Trading Journey Markdown spec
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calculator, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from "lucide-react";
import { calculatePositionSize } from "@/lib/calculations/position-sizing";
import { useRiskProfile } from "@/hooks/use-risk-profile";

interface PositionSizeCalculatorProps {
  accountBalance?: number;
  onCalculate?: (result: ReturnType<typeof calculatePositionSize>) => void;
}

export function PositionSizeCalculator({ 
  accountBalance: initialBalance = 10000,
  onCalculate 
}: PositionSizeCalculatorProps) {
  const { data: riskProfile } = useRiskProfile();
  
  const [accountBalance, setAccountBalance] = useState(initialBalance);
  const [riskPercent, setRiskPercent] = useState(riskProfile?.risk_per_trade_percent || 2);
  const [entryPrice, setEntryPrice] = useState(50000);
  const [stopLossPrice, setStopLossPrice] = useState(49000);
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState(1);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Position Size Calculator
        </CardTitle>
        <CardDescription>
          Calculate optimal position size based on your risk parameters
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Section */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Account Balance ($)</Label>
            <Input
              type="number"
              value={accountBalance}
              onChange={(e) => setAccountBalance(Number(e.target.value))}
              min={0}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Risk per Trade (%)</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[riskPercent]}
                onValueChange={([value]) => setRiskPercent(value)}
                min={0.5}
                max={5}
                step={0.5}
                className="flex-1"
              />
              <span className="w-12 text-right font-medium">{riskPercent}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Entry Price ($)</Label>
            <Input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(Number(e.target.value))}
              min={0}
              step={0.01}
            />
          </div>

          <div className="space-y-2">
            <Label>Stop Loss Price ($)</Label>
            <Input
              type="number"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(Number(e.target.value))}
              min={0}
              step={0.01}
            />
          </div>

          <div className="space-y-2">
            <Label>Direction</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDirection('long')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                  direction === 'long'
                    ? 'bg-green-500/20 border-green-500/50 text-green-500'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Long
              </button>
              <button
                type="button"
                onClick={() => setDirection('short')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                  direction === 'short'
                    ? 'bg-red-500/20 border-red-500/50 text-red-500'
                    : 'border-border hover:bg-accent'
                }`}
              >
                <TrendingDown className="h-4 w-4" />
                Short
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Leverage</Label>
            <div className="flex items-center gap-3">
              <Slider
                value={[leverage]}
                onValueChange={([value]) => setLeverage(value)}
                min={1}
                max={20}
                step={1}
                className="flex-1"
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
            
            <div className="p-4 rounded-lg bg-red-500/10">
              <p className="text-sm text-muted-foreground">Risk Amount (1R)</p>
              <p className="text-2xl font-bold text-red-500">
                -{formatCurrency(result.potential_loss)}
              </p>
              <p className="text-sm text-muted-foreground">
                {result.stop_distance_percent.toFixed(2)}% stop distance
              </p>
            </div>
            
            <div className="p-4 rounded-lg bg-green-500/10">
              <p className="text-sm text-muted-foreground">Potential Profit (2R)</p>
              <p className="text-2xl font-bold text-green-500">
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
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-500">
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
