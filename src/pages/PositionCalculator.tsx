/**
 * Position Calculator Page - Standalone page with tabs for calculator and volatility stop-loss
 * Includes compact market score widget for quick assessment before sizing
 */
import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FormSkeleton, MetricsGridSkeleton } from "@/components/ui/loading-skeleton";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Calculator, Activity, Percent, Settings, AlertTriangle } from "lucide-react";
import { calculatePositionSize } from "@/lib/calculations/position-sizing";
import { useRiskProfile } from "@/hooks/use-risk-profile";
import { useBestAvailableBalance } from "@/hooks/use-combined-balance";
import { useBinanceCommissionRate, useBinanceLeverageBrackets, getMaxLeverageForNotional } from "@/features/binance";
import { CalculatorInputs, CalculatorResults, QuickReferenceR, ContextWarnings, RiskAdjustmentBreakdown } from "@/components/risk/calculator";
import { VolatilityStopLoss } from "@/components/risk/calculator/VolatilityStopLoss";
import { MarketScoreWidget } from "@/components/dashboard/MarketScoreWidget";
import { TradingPairCombobox } from "@/components/ui/trading-pair-combobox";
import { useMarketContext } from "@/contexts/MarketContext";
import { trackEvent, ANALYTICS_EVENTS } from "@/lib/analytics";
import { formatPercentUnsigned } from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { 
  DEFAULT_RISK_VALUES, 
  POSITION_SIZING_THRESHOLDS, 
  CALCULATOR_INPUT_DEFAULTS 
} from "@/lib/constants/risk-thresholds";

export default function PositionCalculator() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'calculator';
  const setActiveTab = (tab: string) => setSearchParams({ tab });
  const isMobile = useIsMobile();
  const { data: riskProfile, isLoading: profileLoading } = useRiskProfile();
  const { balance: combinedBalance, source, isLoading: balanceLoading } = useBestAvailableBalance();
  const { formatCompact, currency } = useCurrencyConversion();
  
  // Use global MarketContext for symbol selection
  const { selectedSymbol, setSelectedSymbol } = useMarketContext();
  
  // Fetch real commission rates from Binance API (Phase 2)
  const { data: commissionRate, isLoading: commissionLoading } = useBinanceCommissionRate(selectedSymbol);
  const { data: leverageBrackets } = useBinanceLeverageBrackets(selectedSymbol);
  
  // Use combined balance (Binance if connected, else Paper accounts)
  const defaultBalance = useMemo(() => {
    if (combinedBalance > 0) return combinedBalance;
    return DEFAULT_RISK_VALUES.FALLBACK_BALANCE;
  }, [combinedBalance]);
  
  const [accountBalance, setAccountBalance] = useState<number>(defaultBalance);
  const [riskPercent, setRiskPercent] = useState<number>(DEFAULT_RISK_VALUES.RISK_PER_TRADE);
  const [entryPrice, setEntryPrice] = useState<number>(CALCULATOR_INPUT_DEFAULTS.ENTRY_PRICE);
  const [stopLossPrice, setStopLossPrice] = useState<number>(CALCULATOR_INPUT_DEFAULTS.STOP_LOSS_PRICE);
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState<number>(CALCULATOR_INPUT_DEFAULTS.LEVERAGE);
  
  // Calculate max leverage based on position value (memoized)
  const estimatedNotional = useMemo(() => {
    const stopDist = Math.abs(entryPrice - stopLossPrice) / entryPrice;
    if (stopDist === 0) return 0;
    return (accountBalance * riskPercent / 100) / stopDist * entryPrice;
  }, [accountBalance, riskPercent, entryPrice, stopLossPrice]);

  const maxAllowedLeverage = leverageBrackets && 'brackets' in leverageBrackets
    ? getMaxLeverageForNotional(leverageBrackets, estimatedNotional)
    : POSITION_SIZING_THRESHOLDS.MAX_LEVERAGE_DEFAULT;

  // Leverage exceeds exchange limit warning
  const leverageExceedsMax = leverage > maxAllowedLeverage && leverageBrackets && 'brackets' in leverageBrackets;

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
      <div className="space-y-6">
        <PageHeader
          icon={Calculator}
          title="Risk Calculator"
          description="Loading your risk settings..."
        />
        <MetricsGridSkeleton />
        <FormSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6" role="region" aria-label="Risk Calculator">
      <PageHeader
          icon={Calculator}
          title="Risk Calculator"
          description="Calculate position sizes and manage risk before entering trades"
        />

      <ErrorBoundary>
        {/* Symbol Selector */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1">
            Trading Pair
            <InfoTooltip
              content="Select the asset pair for position sizing. Changes are synchronized with the Market Data page."
              variant="info"
            />
          </Label>
          <TradingPairCombobox 
            value={selectedSymbol}
            onValueChange={setSelectedSymbol}
            className="max-w-xs"
          />
        </div>

        {/* Market Score Widget - Quick Assessment */}
        <div className="grid gap-4 md:grid-cols-2 mt-4">
          <MarketScoreWidget symbol={selectedSymbol} compact />
          <ContextWarnings symbol={selectedSymbol} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="calculator" className="gap-2">
                    <Calculator className="h-4 w-4" />
                    {isMobile ? "Calculator" : "Position Size Calculator"}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">Calculate how many units to trade based on your account size, risk percent, and stop loss distance.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger value="volatility" className="gap-2">
                    <Activity className="h-4 w-4" />
                    {isMobile ? "Vol. Stop Loss" : "Volatility-Based Stop Loss"}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">ATR-based stop loss suggestions that adapt to current market volatility for the selected pair.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
                      <Link to="/risk?tab=settings" className="hover:underline">
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
                  currency={currency}
                />

                <Separator />

                <CalculatorResults result={result} />
                
                {/* Commission Rate Display (Phase 2) */}
                {commissionRate && estimatedFees && (
                  <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Percent className="h-4 w-4" />
                      Commission Rates (Real-time from Binance)
                      <InfoTooltip
                        content="Real-time fee rates from Binance. Maker fees apply to limit orders, taker fees to market orders."
                        variant="info"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Maker Fee:</span>
                        <span className="ml-2 font-medium">
                          {formatPercentUnsigned(commissionRate.makerCommissionRate * 100)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({formatCompact(estimatedFees.makerFee)})
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Taker Fee:</span>
                        <span className="ml-2 font-medium">
                          {formatPercentUnsigned(commissionRate.takerCommissionRate * 100)}
                        </span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({formatCompact(estimatedFees.takerFee)})
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
                  <div className={cn(
                    "flex items-center gap-2 text-xs p-2 rounded",
                    leverageExceedsMax
                      ? "bg-destructive/10 text-destructive border border-destructive/30"
                      : "bg-muted/30 text-muted-foreground"
                  )}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="text-xs">Max Leverage</Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">Maximum leverage allowed by the exchange for the estimated position notional value. Based on Binance tier brackets.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span>
                      {maxAllowedLeverage}x for ~{formatCompact(estimatedNotional)} notional
                    </span>
                    {leverageExceedsMax && (
                      <span className="flex items-center gap-1 ml-auto font-medium">
                        <AlertTriangle className="h-3 w-3" />
                        Current {leverage}x exceeds limit
                      </span>
                    )}
                  </div>
                )}

                <QuickReferenceR 
                  potential1R={result.potential_profit_1r}
                  potential2R={result.potential_profit_2r}
                  potential3R={result.potential_profit_3r}
                />
                
                {/* Risk Adjustment Breakdown - moved inside CardContent for better grouping */}
                <div className="pt-4">
                  <RiskAdjustmentBreakdown symbol={selectedSymbol} baseRiskPercent={riskPercent} />
                </div>
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
      </ErrorBoundary>
    </div>
  );
}
