/**
 * Position Calculator Page - Standalone page with tabs for calculator and volatility stop-loss
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calculator, Activity, Percent, Settings } from "lucide-react";
import { calculatePositionSize } from "@/lib/calculations/position-sizing";
import { useRiskProfile } from "@/hooks/use-risk-profile";
import { useBestAvailableBalance } from "@/hooks/use-combined-balance";
import { useBinanceCommissionRate, useBinanceLeverageBrackets, getMaxLeverageForNotional } from "@/features/binance";
import { CalculatorInputs, CalculatorResults, QuickReferenceR } from "@/components/risk/calculator";
import { VolatilityStopLoss } from "@/components/risk/calculator/VolatilityStopLoss";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { useMemo, useEffect, useRef } from "react";

export default function PositionCalculator() {
  const [activeTab, setActiveTab] = useState("calculator");
  const { data: riskProfile, isLoading: profileLoading } = useRiskProfile();
  const { balance: combinedBalance, source, isLoading: balanceLoading } = useBestAvailableBalance();
  
  // State for symbol to fetch commission rates
  const [selectedSymbol, setSelectedSymbol] = useState("BTCUSDT");
  
  // Fetch real commission rates from Binance API (Phase 2)
  const { data: commissionRate, isLoading: commissionLoading } = useBinanceCommissionRate(selectedSymbol);
  const { data: leverageBrackets } = useBinanceLeverageBrackets(selectedSymbol);
  
  // Use combined balance (Binance if connected, else Paper accounts)
  const defaultBalance = useMemo(() => {
    if (combinedBalance > 0) return combinedBalance;
    return 10000;
  }, [combinedBalance]);
  
  const [accountBalance, setAccountBalance] = useState(defaultBalance);
  const [riskPercent, setRiskPercent] = useState(2);
  const [entryPrice, setEntryPrice] = useState(50000);
  const [stopLossPrice, setStopLossPrice] = useState(49000);
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState(1);
  
  // Calculate max leverage based on position value
  const estimatedNotional = (accountBalance * riskPercent / 100) / (Math.abs(entryPrice - stopLossPrice) / entryPrice) * entryPrice;
  const maxAllowedLeverage = leverageBrackets && 'brackets' in leverageBrackets
    ? getMaxLeverageForNotional(leverageBrackets, estimatedNotional)
    : 125;

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

  const lastTrackedRef = useRef<string>("");
  
  const result = useMemo(() => {
    const calc = calculatePositionSize({
      account_balance: accountBalance,
      risk_percent: riskPercent,
      entry_price: entryPrice,
      stop_loss_price: stopLossPrice,
      leverage,
    });
    
    // Track calculation (debounced by unique key)
    const trackKey = `${accountBalance}-${riskPercent}-${entryPrice}-${stopLossPrice}-${leverage}`;
    if (lastTrackedRef.current !== trackKey && calc.position_size > 0) {
      lastTrackedRef.current = trackKey;
      trackEvent(ANALYTICS_EVENTS.POSITION_SIZE_CALCULATE, {
        accountBalance,
        riskPercent,
        positionSize: calc.position_size,
        riskAmount: calc.risk_amount,
      });
    }
    
    return calc;
  }, [accountBalance, riskPercent, entryPrice, stopLossPrice, leverage]);

  // Calculate estimated fees using real commission rates
  const estimatedFees = useMemo(() => {
    if (!commissionRate || !result) return null;
    const takerFee = result.position_value * commissionRate.takerCommissionRate;
    const makerFee = result.position_value * commissionRate.makerCommissionRate;
    return { takerFee, makerFee };
  }, [commissionRate, result]);

  // Handle apply stop-loss from volatility suggestions
  const handleApplyStopLoss = (newStopLoss: number) => {
    setStopLossPrice(newStopLoss);
    setActiveTab("calculator");
  };

  const isLoading = profileLoading || balanceLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Calculator className="h-6 w-6 text-primary" />
              Position Calculator
            </h1>
            <p className="text-muted-foreground">Loading your risk settings...</p>
          </div>
          <Skeleton className="h-[400px]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Position Calculator
          </h1>
          <p className="text-muted-foreground">
            Calculate optimal position sizes based on your risk parameters
          </p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="calculator" className="gap-2">
              <Calculator className="h-4 w-4" />
              Position Size Calculator
            </TabsTrigger>
            <TabsTrigger value="volatility" className="gap-2">
              <Activity className="h-4 w-4" />
              Volatility-Based Stop Loss
            </TabsTrigger>
          </TabsList>

          {/* Position Size Calculator Tab */}
          <TabsContent value="calculator" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" aria-hidden="true" />
                  Position Size Calculator
                </CardTitle>
                <CardDescription>
                  Calculate optimal position size based on your risk parameters
                  {riskProfile && (
                    <span className="flex items-center gap-2 text-xs mt-1 text-primary">
                      <Settings className="h-3 w-3" />
                      <Link to="/settings" className="hover:underline">
                        Using your Risk Profile settings
                      </Link>
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
                
                {/* Commission Rate Display (Phase 2) */}
                {commissionRate && estimatedFees && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Percent className="h-4 w-4" />
                      Commission Rates (Real-time from Binance)
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Maker Fee:</span>
                        <span className="ml-2 font-medium">
                          {(commissionRate.makerCommissionRate * 100).toFixed(3)}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          (${estimatedFees.makerFee.toFixed(2)})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Taker Fee:</span>
                        <span className="ml-2 font-medium">
                          {(commissionRate.takerCommissionRate * 100).toFixed(3)}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          (${estimatedFees.takerFee.toFixed(2)})
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Market orders use taker fee, limit orders use maker fee
                    </p>
                  </div>
                )}
                
                {/* Max Leverage Info */}
                {leverageBrackets && 'brackets' in leverageBrackets && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded bg-muted/30">
                    <Badge variant="outline" className="text-xs">Max Leverage</Badge>
                    <span>{maxAllowedLeverage}x for ~${Math.round(estimatedNotional).toLocaleString()} notional</span>
                  </div>
                )}

                <QuickReferenceR 
                  potential1R={result.potential_profit_1r}
                  potential2R={result.potential_profit_2r}
                  potential3R={result.potential_profit_3r}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Volatility-Based Stop Loss Tab */}
          <TabsContent value="volatility" className="mt-6">
            <VolatilityStopLoss
              symbol={selectedSymbol}
              entryPrice={entryPrice}
              direction={direction}
              riskPercent={riskPercent}
              onApplyStopLoss={handleApplyStopLoss}
            />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
