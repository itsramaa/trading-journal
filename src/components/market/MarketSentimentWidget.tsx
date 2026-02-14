/**
 * Market Sentiment Widget
 * Displays bullish/bearish scores from Binance Phase 1 data
 * Controlled component - symbol state managed by parent via props
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  RefreshCw, 
  Users, 
  BarChart3,
  Zap,
  Activity,
  Percent,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { useState, useMemo } from "react";
import { useBinanceMarketSentiment } from "@/features/binance";
import { useTradingPairs } from "@/hooks/use-trading-pairs";
import type { OpenInterestPeriod } from "@/features/binance/market-data-types";
import { cn } from "@/lib/utils";
import { 
  QUICK_ACCESS_SYMBOLS, 
  DEFAULT_SYMBOL, 
  SENTIMENT_PERIODS, 
  DEFAULT_SENTIMENT_PERIOD 
} from "@/lib/constants/market-config";
import { getSentimentColorClass, getSentimentBgClass } from "@/lib/constants/sentiment-thresholds";

interface MarketSentimentWidgetProps {
  /** Controlled symbol value from parent */
  symbol?: string;
  /** @deprecated Use `symbol` prop instead */
  defaultSymbol?: string;
  showSymbolSelector?: boolean;
  className?: string;
  onSymbolChange?: (symbol: string) => void;
}

export function MarketSentimentWidget({ 
  symbol: controlledSymbol,
  defaultSymbol,
  showSymbolSelector = true,
  className,
  onSymbolChange
}: MarketSentimentWidgetProps) {
  // Support both controlled (symbol) and uncontrolled (defaultSymbol) modes
  const activeSymbol = controlledSymbol ?? defaultSymbol ?? DEFAULT_SYMBOL;
  
  const [period, setPeriod] = useState<OpenInterestPeriod>(DEFAULT_SENTIMENT_PERIOD as OpenInterestPeriod);
  const [open, setOpen] = useState(false);
  
  const { data: sentiment, isLoading, refetch } = useBinanceMarketSentiment(activeSymbol, period);
  const { data: tradingPairs = [], isLoading: pairsLoading } = useTradingPairs();
  
  // Build symbol options from trading pairs
  const symbolOptions = useMemo(() => {
    if (!tradingPairs.length) {
      return [...QUICK_ACCESS_SYMBOLS];
    }
    
    return tradingPairs
      .filter(p => p.quote_asset === 'USDT')
      .map(p => ({
        value: p.symbol,
        label: p.base_asset,
      }));
  }, [tradingPairs]);
  
  const currentLabel = symbolOptions.find(s => s.value === activeSymbol)?.label || activeSymbol.replace('USDT', '');

  const handleSymbolSelect = (newSymbol: string) => {
    onSymbolChange?.(newSymbol);
    setOpen(false);
  };

  const getFactorIcon = (factor: string) => {
    switch (factor) {
      case "topTraders": return <Users className="h-3.5 w-3.5" />;
      case "retail": return <BarChart3 className="h-3.5 w-3.5" />;
      case "takerVolume": return <Zap className="h-3.5 w-3.5" />;
      case "openInterest": return <Activity className="h-3.5 w-3.5" />;
      case "fundingRate": return <Percent className="h-3.5 w-3.5" />;
      default: return null;
    }
  };

  const getFactorLabel = (factor: string) => {
    switch (factor) {
      case "topTraders": return "Pro Traders";
      case "retail": return "Retail";
      case "takerVolume": return "Taker Volume";
      case "openInterest": return "Open Interest";
      case "fundingRate": return "Funding Rate";
      default: return factor;
    }
  };

  const getFactorBadge = (value: string) => {
    const isPositive = ["bullish", "increasing", "positive"].includes(value);
    const isNegative = ["bearish", "decreasing", "negative"].includes(value);
    
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs capitalize",
          isPositive && "border-green-500/50 text-green-500",
          isNegative && "border-red-500/50 text-red-500",
          !isPositive && !isNegative && "border-muted-foreground/50 text-muted-foreground"
        )}
      >
        {isPositive && <TrendingUp className="h-3 w-3 mr-1" />}
        {isNegative && <TrendingDown className="h-3 w-3 mr-1" />}
        {!isPositive && !isNegative && <Minus className="h-3 w-3 mr-1" />}
        {value}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className={className} role="region" aria-label="Market Sentiment">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center">
            <Skeleton className="h-24 w-24 rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine if sentiment data is truly insufficient vs neutral
  const isSentimentInsufficient = sentiment && 
    Object.values(sentiment.factors).every(v => v === 'neutral' || v === 'stable');

  return (
    <Card className={className} role="region" aria-label="Market Sentiment">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Market Sentiment
            <InfoTooltip 
              content="Aggregated sentiment from pro traders, retail positions, taker volume, OI trends, and funding rates"
            />
          </CardTitle>
          <div className="flex items-center gap-2">
            {showSymbolSelector && (
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="h-8 w-28 justify-between"
                    disabled={pairsLoading}
                  >
                    {activeSymbol}
                    <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48 p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search pair..." className="h-9" />
                    <CommandList>
                      <CommandEmpty>No pair found.</CommandEmpty>
                        <CommandGroup heading="Popular">
                          {QUICK_ACCESS_SYMBOLS.map((s) => (
                            <CommandItem
                              key={s.value}
                              value={s.value}
                              onSelect={() => handleSymbolSelect(s.value)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  activeSymbol === s.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {s.value}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        <CommandGroup heading="All Pairs">
                          {symbolOptions
                            .filter(s => !QUICK_ACCESS_SYMBOLS.some(d => d.value === s.value))
                            .map((s) => (
                              <CommandItem
                                key={s.value}
                                value={s.value}
                                onSelect={() => handleSymbolSelect(s.value)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    activeSymbol === s.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {s.value}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
            <Select value={period} onValueChange={(v) => setPeriod(v as OpenInterestPeriod)}>
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SENTIMENT_PERIODS.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {sentiment ? (
          <>
            {/* Score Gauge */}
            <div className="flex justify-center">
              <div className={cn(
                "relative w-28 h-28 rounded-full flex items-center justify-center",
                getSentimentBgClass(sentiment.bullishScore)
              )}>
                <div className="text-center">
                  <div className={cn(
                    "text-3xl font-bold",
                    getSentimentColorClass(sentiment.bullishScore)
                  )}>
                    {sentiment.bullishScore}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    {isSentimentInsufficient ? 'Insufficient Data' : sentiment.sentiment}
                  </div>
                </div>
                {/* Visual indicator ring */}
                <svg 
                  className="absolute inset-0 -rotate-90" 
                  viewBox="0 0 112 112"
                  role="img"
                  aria-label={`Sentiment score: ${sentiment.bullishScore}%`}
                >
                  <circle
                    cx="56"
                    cy="56"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-muted/30"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r="52"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${(sentiment.bullishScore / 100) * 327} 327`}
                    className={getSentimentColorClass(sentiment.bullishScore)}
                  />
                </svg>
              </div>
            </div>

            {/* Bull vs Bear bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-green-500 font-medium">
                  Bullish {sentiment.bullishScore}%
                </span>
                <span className="text-red-500 font-medium">
                  Bearish {sentiment.bearishScore}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden flex">
                <div 
                  className="bg-green-500 transition-all duration-500"
                  style={{ width: `${sentiment.bullishScore}%` }}
                />
                <div 
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${sentiment.bearishScore}%` }}
                />
              </div>
            </div>

            {/* Sentiment Factors */}
            <div className="grid grid-cols-1 gap-2">
              {Object.entries(sentiment.factors).map(([key, value]) => (
                <div 
                  key={key} 
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2 text-sm">
                    {getFactorIcon(key)}
                    <span className="text-muted-foreground">{getFactorLabel(key)}</span>
                  </div>
                  {getFactorBadge(value)}
                </div>
              ))}
            </div>

            {/* Raw Data Summary */}
            {sentiment.rawData?.markPrice && (
              <div className="pt-2 border-t text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Mark Price</span>
                  <span className="font-mono">
                    ${sentiment.rawData.markPrice.markPrice.toLocaleString(undefined, { 
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2 
                    })}
                  </span>
                </div>
                {sentiment.rawData.markPrice.lastFundingRate !== undefined && (
                  <div className="flex justify-between mt-1">
                    <span>Funding Rate</span>
                    <span className={cn(
                      "font-mono",
                      sentiment.rawData.markPrice.lastFundingRate > 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {(sentiment.rawData.markPrice.lastFundingRate * 100).toFixed(4)}%
                    </span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Unable to fetch market data</p>
            <p className="text-xs mt-1">Check your connection and try again</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
