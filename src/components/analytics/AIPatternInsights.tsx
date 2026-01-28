/**
 * AI Pattern Insights - Shows winning and losing patterns
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Lightbulb, AlertTriangle, Trophy } from "lucide-react";
import { useTradeEntries } from "@/hooks/use-trade-entries";
import { useTradingStrategies } from "@/hooks/use-trading-strategies";

interface PatternData {
  name: string;
  winRate: number;
  trades: number;
  avgPnl: number;
  type: 'winning' | 'losing';
}

export function AIPatternInsights() {
  const { data: trades } = useTradeEntries();
  const { data: strategies } = useTradingStrategies();

  const patterns = useMemo((): PatternData[] => {
    if (!trades || trades.length < 5) return [];

    const closedTrades = trades.filter(t => t.status === 'closed');
    if (closedTrades.length < 5) return [];

    const patternMap: Map<string, { wins: number; losses: number; totalPnl: number; trades: number }> = new Map();

    // Analyze by pair
    closedTrades.forEach((trade) => {
      const key = `${trade.pair}`;
      const existing = patternMap.get(key) || { wins: 0, losses: 0, totalPnl: 0, trades: 0 };
      
      existing.trades++;
      existing.totalPnl += trade.realized_pnl || trade.pnl || 0;
      
      if ((trade.realized_pnl || trade.pnl || 0) > 0) {
        existing.wins++;
      } else {
        existing.losses++;
      }
      
      patternMap.set(key, existing);
    });

    // Convert to pattern array
    const allPatterns: PatternData[] = [];

    patternMap.forEach((data, name) => {
      if (data.trades >= 3) {
        const winRate = (data.wins / data.trades) * 100;
        const avgPnl = data.totalPnl / data.trades;
        
        allPatterns.push({
          name,
          winRate,
          trades: data.trades,
          avgPnl,
          type: winRate >= 50 ? 'winning' : 'losing',
        });
      }
    });

    // Sort by win rate
    return allPatterns.sort((a, b) => b.winRate - a.winRate);
  }, [trades, strategies]);

  const winningPatterns = patterns.filter(p => p.type === 'winning').slice(0, 3);
  const losingPatterns = patterns.filter(p => p.type === 'losing').slice(-3).reverse();

  if (patterns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            AI Pattern Insights
          </CardTitle>
          <CardDescription>Identify winning and losing trading patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Not enough data for pattern analysis</p>
            <p className="text-sm">Complete at least 5 trades to see insights</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          AI Pattern Insights
        </CardTitle>
        <CardDescription>Patterns identified from your trading history</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Winning Patterns */}
        {winningPatterns.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-green-500">
              <Trophy className="h-4 w-4" />
              <span className="font-semibold text-sm">WINNING PATTERNS</span>
            </div>
            {winningPatterns.map((pattern, i) => (
              <div 
                key={pattern.name}
                className="p-3 rounded-lg border border-green-500/30 bg-green-500/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-green-500 text-green-500">
                      #{i + 1}
                    </Badge>
                    <span className="font-medium">{pattern.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="font-bold text-green-500">{pattern.winRate.toFixed(0)}%</span>
                  </div>
                </div>
                <Progress value={pattern.winRate} className="h-2 [&>div]:bg-green-500" />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{pattern.trades} trades</span>
                  <span>Avg: ${pattern.avgPnl.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Losing Patterns */}
        {losingPatterns.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-semibold text-sm">LOSING PATTERNS</span>
            </div>
            {losingPatterns.map((pattern, i) => (
              <div 
                key={pattern.name}
                className="p-3 rounded-lg border border-red-500/30 bg-red-500/5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-red-500 text-red-500">
                      #{i + 1}
                    </Badge>
                    <span className="font-medium">{pattern.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="font-bold text-red-500">{pattern.winRate.toFixed(0)}%</span>
                  </div>
                </div>
                <Progress value={pattern.winRate} className="h-2 [&>div]:bg-red-500" />
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>{pattern.trades} trades</span>
                  <span>Avg: ${pattern.avgPnl.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
