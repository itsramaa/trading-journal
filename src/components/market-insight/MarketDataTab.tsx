/**
 * Market Data Tab Component - Volatility, Opportunities, Whale Tracking
 * Extracted from MarketInsight.tsx for tabbed interface
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  Target,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarketInsightResponse, WhaleSignal } from "@/features/market-insight/types";

interface MarketDataTabProps {
  sentimentData?: MarketInsightResponse;
  isLoading: boolean;
  hideVolatilityAssessment?: boolean;
}

export function MarketDataTab({ sentimentData, isLoading, hideVolatilityAssessment = false }: MarketDataTabProps) {
  const getWhaleSignalColor = (signal: WhaleSignal) => {
    switch (signal) {
      case 'ACCUMULATION': return 'bg-profit';
      case 'DISTRIBUTION': return 'bg-loss';
      default: return 'bg-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Two Column: Volatility + Opportunities */}
      <div className={cn("grid gap-6", !hideVolatilityAssessment && "lg:grid-cols-2")}>
        {/* AI Volatility Assessment - conditionally hidden */}
        {!hideVolatilityAssessment && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Volatility Assessment</CardTitle>
            </div>
            <CardDescription>
              Real-time volatility from price data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
                <Skeleton className="h-14" />
              </div>
            ) : sentimentData?.volatility.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{item.asset}</span>
                  <Badge 
                    variant="outline"
                    className={cn(
                      item.level === 'high' && "border-loss text-loss",
                      item.level === 'medium' && "border-secondary text-secondary-foreground",
                      item.level === 'low' && "border-profit text-profit"
                    )}
                  >
                    {item.level}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Progress 
                    value={item.value} 
                    className={cn(
                      "w-16 h-2",
                      item.level === 'high' && "[&>div]:bg-loss",
                      item.level === 'medium' && "[&>div]:bg-secondary",
                      item.level === 'low' && "[&>div]:bg-profit"
                    )}
                  />
                  <span className="text-xs text-muted-foreground w-24 text-right">{item.status}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        )}

        {/* AI Trading Opportunities */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Trading Opportunities</CardTitle>
            </div>
            <CardDescription>
              AI-ranked setups based on technicals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : sentimentData?.opportunities.map((opp, idx) => (
              <div key={idx} className="p-3 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{opp.pair}</span>
                    <Badge 
                      variant={opp.direction === 'LONG' ? 'default' : opp.direction === 'SHORT' ? 'destructive' : 'secondary'}
                    >
                      {opp.direction}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-bold">{opp.confidence}%</span>
                    <span className="text-xs text-muted-foreground">conf.</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{opp.reason}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* AI Whale Tracking */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Whale Tracking</CardTitle>
            </div>
            <Badge variant="outline">Volume Proxy</Badge>
          </div>
          <CardDescription>
            Volume-based whale activity detection from Binance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : sentimentData?.whaleActivity.map((whale, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  getWhaleSignalColor(whale.signal)
                )} />
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{whale.asset}</Badge>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-xs",
                        whale.signal === 'ACCUMULATION' && "bg-profit/20 text-profit",
                        whale.signal === 'DISTRIBUTION' && "bg-loss/20 text-loss"
                      )}
                    >
                      {whale.signal}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{whale.description}</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-medium">
                  {whale.volumeChange24h > 0 ? '+' : ''}{whale.volumeChange24h.toFixed(1)}% vol
                </span>
                <p className="text-xs text-muted-foreground">
                  {whale.confidence}% confidence
                </p>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground text-center pt-2">
            Based on 24h volume analysis from Binance API
          </p>
        </CardContent>
      </Card>

      {/* Data Quality Footer */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Data quality: {sentimentData?.dataQuality ?? '-'}% • 
          Last updated: {sentimentData?.lastUpdated 
            ? new Date(sentimentData.lastUpdated).toLocaleTimeString() 
            : '-'}
        </span>
        <span>
          Sources: Binance, CoinGecko, Alternative.me
        </span>
      </div>
    </div>
  );
}
