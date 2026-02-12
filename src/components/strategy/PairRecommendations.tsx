/**
 * PairRecommendations - Shows best/worst pairs for a strategy based on historical performance
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, AlertTriangle, Trophy, XCircle } from "lucide-react";
import { CryptoIcon } from "@/components/ui/crypto-icon";
import type { PairRecommendation } from "@/hooks/use-strategy-context";

interface PairRecommendationsProps {
  bestPairs: PairRecommendation[];
  avoidPairs: PairRecommendation[];
  currentPair?: string;
  currentPairScore?: number | null;
}

export function PairRecommendations({ 
  bestPairs, 
  avoidPairs, 
  currentPair, 
  currentPairScore 
}: PairRecommendationsProps) {
  const hasData = bestPairs.length > 0 || avoidPairs.length > 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Pair Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            <p>No historical data available.</p>
            <p className="text-xs mt-1">Trade with this strategy to generate recommendations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Current Pair Status */}
            {currentPair && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{currentPair}</span>
                    <Badge variant="outline" className="text-xs">Current</Badge>
                  </div>
                  {currentPairScore !== null && currentPairScore !== undefined ? (
                    <Badge className={`${currentPairScore >= 60 ? 'bg-profit/10 text-profit' : currentPairScore >= 40 ? 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]' : 'bg-loss/10 text-loss'}`}>
                      {currentPairScore.toFixed(0)}% WR
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">No data</span>
                  )}
                </div>
              </div>
            )}

            {/* Best Pairs */}
            {bestPairs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-profit">
                  <Trophy className="h-3 w-3" />
                  Best Performing Pairs
                </div>
                <div className="space-y-1.5">
                  {bestPairs.map((pair, index) => (
                    <div 
                      key={pair.pair}
                      className="flex items-center justify-between p-2 rounded-md bg-profit/5 border border-profit/20"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-profit">#{index + 1}</span>
                        <CryptoIcon symbol={pair.pair} size={16} />
                        <span className="text-sm font-medium">{pair.pair}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-3 w-3 text-profit" />
                        <span className="text-xs text-profit font-medium">
                          {pair.winRate.toFixed(0)}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({pair.trades} trades)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Avoid Pairs */}
            {avoidPairs.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-medium text-loss">
                  <AlertTriangle className="h-3 w-3" />
                  Consider Avoiding
                </div>
                <div className="space-y-1.5">
                  {avoidPairs.map((pair) => (
                    <div 
                      key={pair.pair}
                      className="flex items-center justify-between p-2 rounded-md bg-loss/5 border border-loss/20"
                    >
                      <div className="flex items-center gap-2">
                        <XCircle className="h-3 w-3 text-loss" />
                        <CryptoIcon symbol={pair.pair} size={16} />
                        <span className="text-sm font-medium">{pair.pair}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TrendingDown className="h-3 w-3 text-loss" />
                        <span className="text-xs text-loss font-medium">
                          {pair.winRate.toFixed(0)}%
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({pair.trades} trades)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Performance Tip */}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t">
              Based on trades with ≥3 samples for statistical relevance
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
