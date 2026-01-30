/**
 * Position Size Calculator Component - Per Trading Journey Markdown spec
 * Refactored into smaller focused components for maintainability
 */
import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator } from "lucide-react";
import { calculatePositionSize } from "@/lib/calculations/position-sizing";
import { useRiskProfile } from "@/hooks/use-risk-profile";
import { useBestAvailableBalance } from "@/hooks/use-combined-balance";
import { CalculatorInputs, CalculatorResults, QuickReferenceR } from "./calculator";

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

  const isLoading = profileLoading || balanceLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" aria-hidden="true" />
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
          <Calculator className="h-5 w-5" aria-hidden="true" />
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
        <CalculatorInputs
          accountBalance={accountBalance}
          setAccountBalance={setAccountBalance}
          riskPercent={riskPercent}
          setRiskPercent={setRiskPercent}
          entryPrice={entryPrice}
          setEntryPrice={setEntryPrice}
          stopLossPrice={stopLossPrice}
          setStopLossPrice={setStopLossPrice}
          direction={direction}
          setDirection={setDirection}
          leverage={leverage}
          setLeverage={setLeverage}
          source={source}
          riskProfileDefault={riskProfile?.risk_per_trade_percent}
        />

        <Separator />

        <CalculatorResults result={result} />

        <QuickReferenceR 
          potential1R={result.potential_profit_1r}
          potential2R={result.potential_profit_2r}
          potential3R={result.potential_profit_3r}
        />
      </CardContent>
    </Card>
  );
}
