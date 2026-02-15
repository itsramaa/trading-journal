import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Play, 
  Loader2, 
  Calendar as CalendarIcon, 
  TrendingUp,
  AlertTriangle,
  Filter,
  ChevronDown,
  Clock,
  Activity,
  Zap
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useRunBacktest } from "@/hooks/use-backtest";
import { useBaseAssets } from "@/hooks/use-trading-pairs";
import { useAccounts } from "@/hooks/use-accounts";
import { useBinanceConnectionStatus, useBinanceBalance } from "@/features/binance";
import { useTradeMode } from "@/hooks/use-trade-mode";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { BacktestResults } from "./BacktestResults";
import type { 
  BacktestConfig, 
  BacktestResult, 
  BacktestEventFilter, 
  BacktestSessionFilter, 
  BacktestVolatilityFilter 
} from "@/types/backtest";
import { COMMON_PAIRS } from "@/types/strategy";
import { BACKTEST_DEFAULTS, BACKTEST_FILTERS, EXCHANGE_COMMISSION_RATES } from "@/lib/constants/backtest-config";
import { STRATEGY_DEFAULTS } from "@/lib/constants/strategy-config";

export function BacktestRunner() {
  const [searchParams] = useSearchParams();
  const strategyFromUrl = searchParams.get('strategy');
  const { format: formatCurrency } = useCurrencyConversion();
  
  // Basic config
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(strategyFromUrl || '');
  const [selectedPair, setSelectedPair] = useState<string>(BACKTEST_DEFAULTS.DEFAULT_PAIR);
  const [periodStart, setPeriodStart] = useState<Date>(subMonths(new Date(), BACKTEST_DEFAULTS.PERIOD_MONTHS));
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date());
  const [initialCapital, setInitialCapital] = useState<number>(BACKTEST_DEFAULTS.INITIAL_CAPITAL);
  const [commissionRate, setCommissionRate] = useState<number>(EXCHANGE_COMMISSION_RATES.BINANCE_FUTURES.TAKER);
  const [slippage, setSlippage] = useState<number>(BACKTEST_DEFAULTS.SLIPPAGE * 100); // 0.1%
  const [riskPerTrade, setRiskPerTrade] = useState<number>(BACKTEST_DEFAULTS.RISK_PER_TRADE * 100); // 2%
  const [compounding, setCompounding] = useState<boolean>(false);
  const [leverage, setLeverage] = useState<number>(1);
  const [result, setResult] = useState<BacktestResult | null>(null);

  // Enhanced filters
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [eventFilter, setEventFilter] = useState<BacktestEventFilter>({
    excludeHighImpact: false,
    bufferHours: BACKTEST_FILTERS.EVENT_BUFFER.DEFAULT_HOURS,
  });
  const [sessionFilter, setSessionFilter] = useState<BacktestSessionFilter>('all');
  const [volatilityFilter, setVolatilityFilter] = useState<BacktestVolatilityFilter>('all');

  const { data: strategies, isLoading: strategiesLoading } = useTradingStrategies();
  const { data: baseAssets } = useBaseAssets();
  const runBacktest = useRunBacktest();
  
  // For quick fill buttons
  const { data: accounts } = useAccounts();
  const { data: connectionStatus } = useBinanceConnectionStatus();
  const { data: binanceBalance } = useBinanceBalance();
  const { isPaper } = useTradeMode();
  
  // Get trading accounts for quick fill
  const tradingAccounts = accounts?.filter(a => 
    a.account_type === 'trading' && a.is_active
  ) || [];
  // Hide Binance balance in Paper mode (M-29)
  const isBinanceConnected = !isPaper && connectionStatus?.isConnected;
  const binanceAvailableBalance = !isPaper && binanceBalance?.availableBalance ? binanceBalance.availableBalance : 0;

  const selectedStrategy = strategies?.find(s => s.id === selectedStrategyId);
  const isFutures = selectedStrategy?.market_type === 'futures';

  // Update selected strategy when URL param changes or strategies load
  useEffect(() => {
    if (strategyFromUrl && strategies?.some(s => s.id === strategyFromUrl)) {
      setSelectedStrategyId(strategyFromUrl);
    }
  }, [strategyFromUrl, strategies]);

  // Auto-populate leverage from strategy
  useEffect(() => {
    if (selectedStrategy?.default_leverage) {
      setLeverage(selectedStrategy.default_leverage);
    } else {
      setLeverage(1);
    }
  }, [selectedStrategy]);

  // Auto-populate session filter from strategy's session_preference
  useEffect(() => {
    if (selectedStrategy?.session_preference?.length && 
        !selectedStrategy.session_preference.includes('all')) {
      setSessionFilter(selectedStrategy.session_preference[0] as BacktestSessionFilter);
    }
  }, [selectedStrategy]);

  const availablePairs = baseAssets.length > 0 ? baseAssets : COMMON_PAIRS;

  // Check if any filter is active
  const hasActiveFilters = eventFilter.excludeHighImpact || sessionFilter !== 'all' || volatilityFilter !== 'all';

  const handleRunBacktest = async () => {
    if (!selectedStrategyId) return;

    const config: BacktestConfig = {
      strategyId: selectedStrategyId,
      pair: selectedPair,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      initialCapital,
      commissionRate: commissionRate / 100,
      slippage: slippage / 100,
      riskPerTrade: riskPerTrade / 100,
      compounding,
      leverage: isFutures ? leverage : undefined,
      // Enhanced filters
      eventFilter: eventFilter.excludeHighImpact ? eventFilter : undefined,
      sessionFilter: sessionFilter !== 'all' ? sessionFilter : undefined,
      volatilityFilter: volatilityFilter !== 'all' ? volatilityFilter : undefined,
    };

    try {
      const backtestResult = await runBacktest.mutateAsync(config);
      setResult(backtestResult);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Backtest Configuration
          </CardTitle>
          <CardDescription>
            Test your strategy against historical data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Strategy Selection */}
          <div className="space-y-2">
            <Label>Select Strategy</Label>
            <Select
              value={selectedStrategyId}
              onValueChange={setSelectedStrategyId}
              disabled={strategiesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a strategy to backtest" />
              </SelectTrigger>
              <SelectContent>
                {strategies?.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    {strategy.name}
                    {strategy.timeframe && ` (${strategy.timeframe})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {strategies?.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No strategies found. Create one first.
              </p>
            )}
          </div>

          {/* Strategy Context Badges */}
          {selectedStrategy && (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant={selectedStrategy.timeframe ? "secondary" : "destructive"}>
                  TF: {selectedStrategy.timeframe || 'Not set'}
                </Badge>
                {isFutures && (
                  <Badge variant="secondary">
                    Leverage: {leverage}x
                  </Badge>
                )}
                <Badge variant="secondary">
                  Sizing: {selectedStrategy.position_sizing_model || 'fixed_percent'}
                </Badge>
                {selectedStrategy.methodology && (
                  <Badge variant="outline">
                    {selectedStrategy.methodology.toUpperCase()}
                  </Badge>
                )}
              </div>
              {!selectedStrategy.timeframe && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Strategy has no timeframe defined. Backtest results may be unreliable.
                </p>
              )}
            </div>
          )}

          {/* Trading Pair */}
          <div className="space-y-2">
            <Label>Trading Pair</Label>
            <Select value={selectedPair} onValueChange={setSelectedPair}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availablePairs.map((pair) => (
                  <SelectItem key={pair} value={pair}>
                    {pair}/USDT
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !periodStart && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodStart ? format(periodStart, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={periodStart}
                    onSelect={(date) => date && setPeriodStart(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !periodEnd && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {periodEnd ? format(periodEnd, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={periodEnd}
                    onSelect={(date) => date && setPeriodEnd(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Capital & Risk */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="capital">Initial Capital (USDT)</Label>
              <Input
                id="capital"
                type="number"
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                min={100}
                step={100}
              />
              {/* Quick Fill Buttons */}
              <div className="flex flex-wrap gap-1.5">
                {isBinanceConnected && binanceAvailableBalance > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setInitialCapital(Math.floor(binanceAvailableBalance))}
                  >
                    Binance: {formatCurrency(binanceAvailableBalance)}
                  </Button>
                )}
                {tradingAccounts.slice(0, 2).map((account) => (
                  <Button
                    key={account.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => setInitialCapital(Math.floor(Number(account.balance)))}
                  >
                    {account.name}: {formatCurrency(Number(account.balance))}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Backtest uses simulated capital — not your actual account balance. Quick-fill buttons copy your current balance for realistic simulation.
              </p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="riskPerTrade">Risk Per Trade (%)</Label>
                <Input
                  id="riskPerTrade"
                  type="number"
                  value={riskPerTrade}
                  onChange={(e) => setRiskPerTrade(Number(e.target.value))}
                  min={BACKTEST_DEFAULTS.MIN_RISK_PER_TRADE}
                  max={BACKTEST_DEFAULTS.MAX_RISK_PER_TRADE}
                  step={BACKTEST_DEFAULTS.RISK_PER_TRADE_STEP}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="compounding" className="text-sm">Compounding</Label>
                <Switch
                  id="compounding"
                  checked={compounding}
                  onCheckedChange={setCompounding}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {compounding 
                  ? "Position size recalculates from current equity each trade." 
                  : "Position size always based on initial capital."}
              </p>
            </div>
          </div>

          {/* Commission, Slippage & Leverage */}
          <div className={cn("grid grid-cols-1 gap-4", isFutures ? "md:grid-cols-3" : "md:grid-cols-2")}>
            <div className="space-y-2">
              <Label htmlFor="commission">Commission Rate (%)</Label>
              <Input
                id="commission"
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                min={0}
                max={1}
                step={0.01}
              />
              <p className="text-xs text-muted-foreground">
                Binance Futures: 0.02% maker / 0.04% taker
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="slippage">Slippage (%)</Label>
              <Input
                id="slippage"
                type="number"
                value={slippage}
                onChange={(e) => setSlippage(Number(e.target.value))}
                min={BACKTEST_DEFAULTS.MIN_SLIPPAGE}
                max={BACKTEST_DEFAULTS.MAX_SLIPPAGE}
                step={BACKTEST_DEFAULTS.SLIPPAGE_STEP}
              />
              <p className="text-xs text-muted-foreground">
                Estimated price impact per fill
              </p>
            </div>
            {isFutures && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Leverage</Label>
                  <span className="text-sm font-mono font-medium">{leverage}x</span>
                </div>
                <Slider
                  value={[leverage]}
                  onValueChange={([v]) => setLeverage(v)}
                  min={1}
                  max={BACKTEST_DEFAULTS.MAX_LEVERAGE}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Default from strategy: {selectedStrategy?.default_leverage || 1}x
                </p>
              </div>
            )}
          </div>

          {/* Leverage > 10x Warning */}
          {isFutures && leverage > 10 && (
            <Alert className="border-destructive/30">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm">
                Liquidation modeling not enabled. Results at {leverage}x leverage may be unrealistic.
              </AlertDescription>
            </Alert>
          )}

          {/* Advanced Filters */}
          <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <span>Advanced Filters</span>
                  {hasActiveFilters && (
                    <Badge variant="secondary" className="text-xs">Active</Badge>
                  )}
                </div>
                <ChevronDown className={cn("h-4 w-4 transition-transform", filtersOpen && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-4 space-y-4">
              {/* Event Filter */}
              <div className="space-y-3 p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Economic Event Filter</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="excludeEvents"
                    checked={eventFilter.excludeHighImpact}
                    onCheckedChange={(checked) => 
                      setEventFilter(prev => ({ ...prev, excludeHighImpact: !!checked }))
                    }
                  />
                  <label htmlFor="excludeEvents" className="text-sm cursor-pointer">
                    Exclude high-impact event days (FOMC, CPI, etc.)
                  </label>
                </div>
                {eventFilter.excludeHighImpact && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm text-muted-foreground">Buffer hours around events</Label>
                      <span className="text-sm font-medium">{eventFilter.bufferHours}h</span>
                    </div>
                    <Slider
                      value={[eventFilter.bufferHours]}
                      onValueChange={([value]) => 
                        setEventFilter(prev => ({ ...prev, bufferHours: value }))
                      }
                      min={0}
                      max={48}
                      step={4}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Session Filter */}
              <div className="space-y-3 p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Trading Session Filter</Label>
                </div>
                <Select value={sessionFilter} onValueChange={(v) => setSessionFilter(v as BacktestSessionFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sessions</SelectItem>
                    <SelectItem value="asian">Asian Session (00:00-08:00 UTC)</SelectItem>
                    <SelectItem value="london">London Session (08:00-16:00 UTC)</SelectItem>
                    <SelectItem value="ny">New York Session (13:00-22:00 UTC)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Only backtest trades that would occur during selected session hours
                </p>
              </div>

              {/* Volatility Filter */}
              <div className="space-y-3 p-4 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  <Label className="font-medium">Volatility Filter</Label>
                </div>
                <Select value={volatilityFilter} onValueChange={(v) => setVolatilityFilter(v as BacktestVolatilityFilter)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Volatility Levels</SelectItem>
                    <SelectItem value="low">Low Volatility Only</SelectItem>
                    <SelectItem value="medium">Medium Volatility Only</SelectItem>
                    <SelectItem value="high">High Volatility Only</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Based on ATR percentile classification (requires sufficient data)
                </p>
              </div>

              {/* Filter Warning */}
              {hasActiveFilters && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    Filters will reduce the sample size. Results may be less reliable with fewer than 30 trades.
                  </AlertDescription>
                </Alert>
              )}
            </CollapsibleContent>
          </Collapsible>

          {/* Strategy Info (collapsible detail) */}
          {selectedStrategy && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  View full strategy config ▾
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{selectedStrategy.name}</strong> will be tested with:
                    <ul className="list-disc list-inside mt-1 text-sm">
                      <li>
                        Timeframe: {selectedStrategy.higher_timeframe && `${selectedStrategy.higher_timeframe} → `}
                        {selectedStrategy.timeframe || 'Not set'}
                        {selectedStrategy.lower_timeframe && ` → ${selectedStrategy.lower_timeframe}`}
                      </li>
                      {selectedStrategy.methodology && (
                        <li>Methodology: {selectedStrategy.methodology.toUpperCase()}</li>
                      )}
                      {selectedStrategy.session_preference && !selectedStrategy.session_preference.includes('all') && (
                        <li>Sessions: {selectedStrategy.session_preference.join(', ')}</li>
                      )}
                      <li>Market: {selectedStrategy.market_type || 'spot'}</li>
                      <li>Min confluences: {selectedStrategy.min_confluences || 4}</li>
                      <li>TP/SL from exit rules</li>
                      {hasActiveFilters && <li className="text-primary">+ Advanced filters applied</li>}
                    </ul>
                  </AlertDescription>
                </Alert>
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Run Button */}
          <Button
            onClick={handleRunBacktest}
            disabled={!selectedStrategyId || runBacktest.isPending}
            className="w-full"
            size="lg"
          >
            {runBacktest.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Backtest...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Backtest
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && <BacktestResults result={result} />}
    </div>
  );
}
