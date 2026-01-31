/**
 * Step 1: Setup (Combined Pre-validation + Strategy + Basic Details)
 * Now supports Binance account selection when connected
 * Includes market context capture for unified analysis
 */
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  CheckCircle, XCircle, AlertTriangle, Loader2, ShieldCheck, 
  Building2, Brain, Sparkles, TrendingUp, TrendingDown, Target, 
  Clock, ChevronDown, Layers, Wifi, Activity, Trophy, Ban
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePreTradeValidation } from "@/features/trade/usePreTradeValidation";
import { useTradeEntryWizard } from "@/features/trade/useTradeEntryWizard";
import { useTradingAccounts } from "@/hooks/use-trading-accounts";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useAIPreflight } from "@/features/ai/useAIPreflight";
import { TradingPairCombobox } from "@/components/ui/trading-pair-combobox";
import { TIMEFRAME_OPTIONS, type TimeframeType } from "@/types/strategy";
import { useBinanceBalance, useBinanceConnectionStatus } from "@/features/binance";
import { useCaptureMarketContext } from "@/hooks/use-capture-market-context";
import { MarketContextBadge } from "@/components/market/MarketContextBadge";
import { useStrategyContext, type MarketFit } from "@/hooks/use-strategy-context";
import type { ValidationResult } from "@/types/trade-wizard";

interface SetupStepProps {
  onNext: () => void;
  onCancel: () => void;
}

function ValidationItem({ result, label }: { result: ValidationResult; label: string }) {
  return (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
      result.status === 'pass' && "border-green-500/30 bg-green-500/5",
      result.status === 'warning' && "border-yellow-500/30 bg-yellow-500/5",
      result.status === 'fail' && "border-red-500/30 bg-red-500/5"
    )}>
      <div className={cn(
        result.status === 'pass' && "text-green-500",
        result.status === 'warning' && "text-yellow-500",
        result.status === 'fail' && "text-red-500"
      )}>
        {result.status === 'pass' && <CheckCircle className="h-4 w-4" />}
        {result.status === 'warning' && <AlertTriangle className="h-4 w-4" />}
        {result.status === 'fail' && <XCircle className="h-4 w-4" />}
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium">{label}</span>
        <p className="text-xs text-muted-foreground">{result.message}</p>
      </div>
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs",
          result.status === 'pass' && "border-green-500 text-green-500",
          result.status === 'warning' && "border-yellow-500 text-yellow-500",
          result.status === 'fail' && "border-red-500 text-red-500"
        )}
      >
        {result.status.toUpperCase()}
      </Badge>
    </div>
  );
}

export function SetupStep({ onNext, onCancel }: SetupStepProps) {
  // Account type: 'binance' or paper account ID
  const [selectedAccountType, setSelectedAccountType] = useState<'binance' | string>('');
  
  // Binance connection
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: binanceBalance } = useBinanceBalance();
  const isBinanceConnected = connectionStatus?.isConnected ?? false;
  
  // Paper trading accounts
  const { data: tradingAccounts, isLoading: accountsLoading } = useTradingAccounts();
  const activeTradingAccounts = tradingAccounts?.filter(a => a.is_active) || [];
  
  // Get balance based on selection
  const accountBalance = useMemo(() => {
    if (selectedAccountType === 'binance' && binanceBalance) {
      return binanceBalance.availableBalance;
    }
    const paperAccount = activeTradingAccounts.find(a => a.id === selectedAccountType);
    return paperAccount ? Number(paperAccount.current_balance) : 0;
  }, [selectedAccountType, binanceBalance, activeTradingAccounts]);

  // Strategy state
  const { data: strategies = [], isLoading: strategiesLoading } = useTradingStrategies();
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>("");
  const selectedStrategy = strategies.find(s => s.id === selectedStrategyId);

  // Trade details state
  const [pair, setPair] = useState<string>("");
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [timeframe, setTimeframe] = useState<string>("1h");
  
  // Strategy context for pair recommendations (must be after pair state)
  const strategyContext = useStrategyContext(selectedStrategy || null, pair);

  // Wizard & validation
  const wizard = useTradeEntryWizard();
  const { runAllChecks, isLoading: validationLoading } = usePreTradeValidation({ accountBalance });
  const aiPreflight = useAIPreflight();
  
  // Market context capture
  const { 
    context: marketContext, 
    isLoading: contextLoading,
    capture: captureMarketContext,
  } = useCaptureMarketContext({ symbol: pair || 'BTCUSDT', enabled: !!pair });
  
  const [validationResult, setValidationResult] = useState<ReturnType<typeof runAllChecks> | null>(null);
  const [hasRunValidation, setHasRunValidation] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState({ validation: true, strategy: true, trade: true, context: true });

  // Auto-select Binance if connected
  useEffect(() => {
    if (isBinanceConnected && !selectedAccountType) {
      setSelectedAccountType('binance');
    }
  }, [isBinanceConnected]);

  // Initialize from wizard state
  useEffect(() => {
    if (wizard.tradingAccountId) setSelectedAccountType(wizard.tradingAccountId);
    if (wizard.selectedStrategyId) setSelectedStrategyId(wizard.selectedStrategyId);
    if (wizard.tradeDetails) {
      setPair(wizard.tradeDetails.pair);
      setDirection(wizard.tradeDetails.direction);
      setTimeframe(wizard.tradeDetails.timeframe);
    }
  }, []);

  // Run validation when account changes
  useEffect(() => {
    if (selectedAccountType && accountBalance > 0) {
      const result = runAllChecks();
      setValidationResult(result);
      setHasRunValidation(true);
      wizard.setPreValidation(result);
      wizard.setTradingAccount(selectedAccountType, accountBalance);
    }
  }, [selectedAccountType, accountBalance]);

  // Update wizard when strategy changes
  useEffect(() => {
    if (selectedStrategyId && selectedStrategy) {
      wizard.setStrategy(selectedStrategyId, selectedStrategy as any);
      // Auto-set timeframe from strategy if available
      const strategyTimeframe = (selectedStrategy as any)?.timeframe;
      if (strategyTimeframe) {
        setTimeframe(strategyTimeframe);
      }
    }
  }, [selectedStrategyId, selectedStrategy]);

  // Check if can proceed
  const isAccountSelected = !!selectedAccountType;
  const isValidationPassed = validationResult?.canProceed ?? false;
  const isStrategySelected = !!selectedStrategyId;
  const isPairSelected = !!pair;
  const canProceed = isAccountSelected && isValidationPassed && isStrategySelected && isPairSelected;

  const handleNext = async () => {
    // Capture market context before proceeding
    let capturedContext = marketContext;
    if (pair && !capturedContext) {
      capturedContext = await captureMarketContext(pair);
    }
    
    // Save trade details to wizard with market context
    wizard.setTradeDetails({
      pair,
      direction,
      timeframe: timeframe as TimeframeType,
    });
    
    // Store market context in wizard for later use
    if (capturedContext) {
      wizard.setMarketContext(capturedContext);
    }
    
    onNext();
  };

  // AI Pre-flight handler
  const handleAIPreflight = async () => {
    if (!pair) return;
    
    const mockUserHistory = [
      { pair, winRate: 65, totalTrades: 24, avgWin: 150, avgLoss: 80 },
    ];
    
    await aiPreflight.mutateAsync({
      pair,
      direction,
      userHistory: mockUserHistory,
      currentMarketConditions: { trend: 'bullish', volatility: 'moderate' },
    });
  };

  const getAIVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'proceed': return 'text-green-500 border-green-500';
      case 'caution': return 'text-yellow-500 border-yellow-500';
      case 'skip': return 'text-red-500 border-red-500';
      default: return 'text-muted-foreground border-muted';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Trade Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trading Account Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Trading Account
            </Label>
            <Select value={selectedAccountType} onValueChange={setSelectedAccountType}>
              <SelectTrigger>
                <SelectValue placeholder={accountsLoading ? "Loading..." : "Select account"} />
              </SelectTrigger>
              <SelectContent>
                {/* Binance Account Option (if connected) */}
                {isBinanceConnected && binanceBalance && (
                  <SelectItem value="binance">
                    <div className="flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-green-500" />
                      <span>Binance Futures</span>
                      <span className="text-xs text-muted-foreground">
                        ${binanceBalance.availableBalance.toLocaleString()}
                      </span>
                    </div>
                  </SelectItem>
                )}
                
                {/* Separator if both options exist */}
                {isBinanceConnected && activeTradingAccounts.length > 0 && (
                  <div className="px-2 py-1 text-xs text-muted-foreground border-t mt-1 pt-2">
                    Paper Trading
                  </div>
                )}
                
                {/* Paper Trading Accounts */}
                {activeTradingAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <span>{account.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ${Number(account.current_balance).toLocaleString()}
                      </span>
                    </div>
                  </SelectItem>
                ))}
                
                {!isBinanceConnected && activeTradingAccounts.length === 0 && (
                  <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                    No trading accounts found
                  </div>
                )}
              </SelectContent>
            </Select>
            
            {selectedAccountType === 'binance' && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Wifi className="h-3 w-3 text-green-500" />
                Using live Binance Futures account
              </p>
            )}
          </div>

          {/* Pre-validation Section */}
          {selectedAccountType && (
            <Collapsible open={sectionsOpen.validation} onOpenChange={(open) => setSectionsOpen(p => ({ ...p, validation: open }))}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium text-sm">Pre-validation Checks</span>
                  <div className="flex items-center gap-2">
                    {validationResult && (
                      <Badge variant={validationResult.canProceed ? "default" : "destructive"} className="text-xs">
                        {validationResult.canProceed ? "PASSED" : "FAILED"}
                      </Badge>
                    )}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", sectionsOpen.validation && "rotate-180")} />
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2 pt-2">
                {validationLoading && (
                  <div className="flex items-center gap-2 p-4 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running validation...
                  </div>
                )}
                {validationResult && (
                  <>
                    <ValidationItem result={validationResult.dailyLossCheck} label="Daily Loss Limit" />
                    <ValidationItem result={validationResult.positionLimitCheck} label="Position Limit" />
                    <ValidationItem result={validationResult.correlationCheck} label="Correlation Check" />
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Strategy Selection */}
          {isValidationPassed && (
            <Collapsible open={sectionsOpen.strategy} onOpenChange={(open) => setSectionsOpen(p => ({ ...p, strategy: open }))}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium text-sm flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Strategy Selection
                  </span>
                  <div className="flex items-center gap-2">
                    {selectedStrategy && (
                      <Badge variant="secondary" className="text-xs">{selectedStrategy.name}</Badge>
                    )}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", sectionsOpen.strategy && "rotate-180")} />
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <Select value={selectedStrategyId} onValueChange={setSelectedStrategyId}>
                  <SelectTrigger>
                    <SelectValue placeholder={strategiesLoading ? "Loading..." : "Select strategy"} />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.length === 0 && (
                      <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                        No strategies found. Create one first.
                      </div>
                    )}
                    {strategies.map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: strategy.color || '#3b82f6' }}
                          />
                          <span>{strategy.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedStrategy && (
                  <div className="p-3 rounded-lg bg-muted/30 space-y-3">
                    {/* Strategy Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-muted-foreground">Timeframe</p>
                        <p className="font-medium">{(selectedStrategy as any).timeframe || 'Any'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Min R:R</p>
                        <p className="font-medium">{(selectedStrategy as any).min_rr || 1.5}:1</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Confluences</p>
                        <p className="font-medium">{(selectedStrategy as any).min_confluences || 4}</p>
                      </div>
                    </div>
                    
                    {/* Market Fit Badge */}
                    {strategyContext?.marketFit && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Market Fit</span>
                        <Badge className={cn(
                          "text-xs",
                          strategyContext.marketFit.overallFit === 'optimal' && "bg-profit/10 text-profit border-profit/30",
                          strategyContext.marketFit.overallFit === 'acceptable' && "bg-muted text-muted-foreground border-border",
                          strategyContext.marketFit.overallFit === 'poor' && "bg-loss/10 text-loss border-loss/30"
                        )}>
                          <Activity className="h-3 w-3 mr-1" />
                          {strategyContext.marketFit.fitScore}% - {strategyContext.marketFit.overallFit}
                        </Badge>
                      </div>
                    )}
                    
                    {/* Pair Recommendations */}
                    {strategyContext && (strategyContext.recommendations.bestPairs.length > 0 || strategyContext.recommendations.avoidPairs.length > 0) && (
                      <div className="pt-2 border-t space-y-2">
                        {/* Best Pairs */}
                        {strategyContext.recommendations.bestPairs.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-profit">
                              <Trophy className="h-3 w-3" />
                              <span className="font-medium">Best Pairs</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {strategyContext.recommendations.bestPairs.slice(0, 3).map(p => (
                                <Badge 
                                  key={p.pair} 
                                  variant="outline" 
                                  className="text-xs cursor-pointer bg-profit/5 border-profit/30 hover:bg-profit/10"
                                  onClick={() => setPair(p.pair)}
                                >
                                  {p.pair} ({p.winRate.toFixed(0)}%)
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Avoid Pairs */}
                        {strategyContext.recommendations.avoidPairs.length > 0 && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-xs text-loss">
                              <Ban className="h-3 w-3" />
                              <span className="font-medium">Avoid</span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {strategyContext.recommendations.avoidPairs.slice(0, 3).map(p => (
                                <Badge 
                                  key={p.pair} 
                                  variant="outline" 
                                  className="text-xs bg-loss/5 border-loss/30 text-loss"
                                >
                                  {p.pair} ({p.winRate.toFixed(0)}%)
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Current Pair Warning */}
                        {pair && strategyContext.recommendations.avoidPairs.some(p => p.pair === pair) && (
                          <div className="flex items-center gap-2 p-2 rounded-md bg-loss/10 border border-loss/30 text-xs text-loss">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>{pair} has poor historical performance with this strategy</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Trade Setup */}
          {isStrategySelected && (
            <Collapsible open={sectionsOpen.trade} onOpenChange={(open) => setSectionsOpen(p => ({ ...p, trade: open }))}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                  <span className="font-medium text-sm flex items-center gap-2">
                    <Layers className="h-4 w-4" />
                    Trade Setup
                  </span>
                  <div className="flex items-center gap-2">
                    {pair && (
                      <Badge variant={direction === 'LONG' ? 'default' : 'destructive'} className="text-xs">
                        {direction} {pair}
                      </Badge>
                    )}
                    <ChevronDown className={cn("h-4 w-4 transition-transform", sectionsOpen.trade && "rotate-180")} />
                  </div>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-2">
                {/* Pair */}
                <div className="space-y-2">
                  <Label>Trading Pair</Label>
                  <TradingPairCombobox
                    value={pair}
                    onValueChange={setPair}
                    placeholder="Select trading pair"
                  />
                </div>

                {/* Direction */}
                <div className="space-y-2">
                  <Label>Direction</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={direction === "LONG" ? "default" : "outline"}
                      className={cn("flex-1", direction === "LONG" && "bg-green-600 hover:bg-green-700")}
                      onClick={() => setDirection("LONG")}
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      LONG
                    </Button>
                    <Button
                      type="button"
                      variant={direction === "SHORT" ? "default" : "outline"}
                      className={cn("flex-1", direction === "SHORT" && "bg-red-600 hover:bg-red-700")}
                      onClick={() => setDirection("SHORT")}
                    >
                      <TrendingDown className="h-4 w-4 mr-2" />
                      SHORT
                    </Button>
                  </div>
                </div>

                {/* Timeframe */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Timeframe
                  </Label>
                  <Select value={timeframe} onValueChange={setTimeframe}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEFRAME_OPTIONS.map((tf) => (
                        <SelectItem key={tf.value} value={tf.value}>{tf.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* AI Pre-flight */}
                {pair && (
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">AI Pre-flight</span>
                        <Badge variant="secondary" className="text-xs">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Optional
                        </Badge>
                      </div>
                      {!aiPreflight.data && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleAIPreflight}
                          disabled={aiPreflight.isPending}
                        >
                          {aiPreflight.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Run Check"
                          )}
                        </Button>
                      )}
                    </div>

                    {aiPreflight.data && (
                      <div className={cn(
                        "flex items-center gap-3 p-2 rounded border",
                        getAIVerdictColor(aiPreflight.data.verdict)
                      )}>
                        <span className="font-semibold uppercase text-sm">{aiPreflight.data.verdict}</span>
                        <span className="text-xs">Confidence: {aiPreflight.data.confidence}%</span>
                        <span className="text-xs">Win Pred: {aiPreflight.data.winPrediction}%</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Market Context Section */}
                {pair && (
                  <Collapsible open={sectionsOpen.context} onOpenChange={(open) => setSectionsOpen(p => ({ ...p, context: open }))}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between p-2 h-auto">
                        <span className="font-medium text-sm flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Market Context
                        </span>
                        <div className="flex items-center gap-2">
                          {contextLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : marketContext ? (
                            <MarketContextBadge context={marketContext} variant="compact" />
                          ) : null}
                          <ChevronDown className={cn("h-4 w-4 transition-transform", sectionsOpen.context && "rotate-180")} />
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      {contextLoading ? (
                        <div className="flex items-center gap-2 p-4 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading market context...
                        </div>
                      ) : marketContext ? (
                        <MarketContextBadge context={marketContext} variant="full" />
                      ) : (
                        <div className="text-sm text-muted-foreground p-3">
                          Market context will be captured when you proceed.
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Ready Status */}
          {canProceed && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-600">
                Setup complete. Ready to check confluences.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleNext} disabled={!canProceed}>
          Next: Confluence Check
        </Button>
      </div>
    </div>
  );
}
