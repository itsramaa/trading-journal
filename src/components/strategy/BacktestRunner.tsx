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
import { 
  Play, 
  Loader2, 
  Calendar as CalendarIcon, 
  TrendingUp,
  AlertTriangle 
} from "lucide-react";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";
import { useRunBacktest } from "@/hooks/use-backtest";
import { useBaseAssets } from "@/hooks/use-trading-pairs";
import { BacktestResults } from "./BacktestResults";
import type { BacktestConfig, BacktestResult } from "@/types/backtest";
import { COMMON_PAIRS } from "@/types/strategy";

export function BacktestRunner() {
  const [searchParams] = useSearchParams();
  const strategyFromUrl = searchParams.get('strategy');
  
  const [selectedStrategyId, setSelectedStrategyId] = useState<string>(strategyFromUrl || '');
  const [selectedPair, setSelectedPair] = useState('BTC');
  const [periodStart, setPeriodStart] = useState<Date>(subMonths(new Date(), 3));
  const [periodEnd, setPeriodEnd] = useState<Date>(new Date());
  const [initialCapital, setInitialCapital] = useState(10000);
  const [commissionRate, setCommissionRate] = useState(0.04); // 0.04%
  const [result, setResult] = useState<BacktestResult | null>(null);

  const { data: strategies, isLoading: strategiesLoading } = useTradingStrategies();
  const { data: baseAssets } = useBaseAssets();
  const runBacktest = useRunBacktest();

  // Update selected strategy when URL param changes or strategies load
  useEffect(() => {
    if (strategyFromUrl && strategies?.some(s => s.id === strategyFromUrl)) {
      setSelectedStrategyId(strategyFromUrl);
    }
  }, [strategyFromUrl, strategies]);

  const availablePairs = baseAssets.length > 0 ? baseAssets : COMMON_PAIRS;

  const handleRunBacktest = async () => {
    if (!selectedStrategyId) return;

    const config: BacktestConfig = {
      strategyId: selectedStrategyId,
      pair: selectedPair,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      initialCapital,
      commissionRate: commissionRate / 100, // Convert percentage to decimal
    };

    try {
      const backtestResult = await runBacktest.mutateAsync(config);
      setResult(backtestResult);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const selectedStrategy = strategies?.find(s => s.id === selectedStrategyId);

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

          {/* Capital & Commission */}
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
            </div>
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
          </div>

          {/* Strategy Info */}
          {selectedStrategy && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>{selectedStrategy.name}</strong> will be tested with:
                <ul className="list-disc list-inside mt-1 text-sm">
                  <li>Timeframe: {selectedStrategy.timeframe || 'Not set'}</li>
                  <li>Market: {selectedStrategy.market_type || 'spot'}</li>
                  <li>Min confluences: {selectedStrategy.min_confluences || 4}</li>
                  <li>TP/SL from exit rules</li>
                </ul>
              </AlertDescription>
            </Alert>
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
