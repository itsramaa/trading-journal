/**
 * Crypto Ranking - Ranks pairs by performance with AI recommendations
 */
import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Trophy, Medal, Award } from "lucide-react";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import { cn } from "@/lib/utils";
import { formatWinRate } from "@/lib/formatters";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";

interface PairStats {
  pair: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPnl: number;
  avgPnl: number;
  recommendation: 'keep' | 'reduce' | 'avoid';
}

export function CryptoRanking() {
  const { data: trades } = useModeFilteredTrades();
  const { formatPnl } = useCurrencyConversion();

  const pairStats = useMemo((): PairStats[] => {
    if (!trades || trades.length === 0) return [];

    const closedTrades = trades.filter(t => t.status === 'closed');
    const statsMap: Map<string, PairStats> = new Map();

    closedTrades.forEach((trade) => {
      const existing = statsMap.get(trade.pair) || {
        pair: trade.pair,
        trades: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        totalPnl: 0,
        avgPnl: 0,
        recommendation: 'keep' as const,
      };

      existing.trades++;
      const pnl = trade.realized_pnl || trade.pnl || 0;
      existing.totalPnl += pnl;

      if (pnl > 0) {
        existing.wins++;
      } else {
        existing.losses++;
      }

      statsMap.set(trade.pair, existing);
    });

    // Calculate final stats and recommendations
    const result = Array.from(statsMap.values()).map((stat) => {
      stat.winRate = (stat.wins / stat.trades) * 100;
      stat.avgPnl = stat.totalPnl / stat.trades;

      // Determine recommendation
      if (stat.winRate >= 60 && stat.avgPnl > 0) {
        stat.recommendation = 'keep';
      } else if (stat.winRate < 40 || stat.avgPnl < 0) {
        stat.recommendation = 'avoid';
      } else {
        stat.recommendation = 'reduce';
      }

      return stat;
    });

    // Sort by total P&L
    return result.sort((a, b) => b.totalPnl - a.totalPnl);
  }, [trades]);

  if (pairStats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Pair Performance Ranking
          </CardTitle>
          <CardDescription>Track which pairs are most profitable</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No trading data available</p>
            <p className="text-sm">Start trading to see pair rankings</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Medal className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Award className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm text-muted-foreground">#{index + 1}</span>;
  };

  const getRecommendationBadge = (rec: PairStats['recommendation']) => {
    switch (rec) {
      case 'keep':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Keep Trading</Badge>;
      case 'reduce':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Reduce Size</Badge>;
      case 'avoid':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Avoid</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Pair Performance Ranking
        </CardTitle>
        <CardDescription>AI-powered recommendations based on your trading history</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pairStats.slice(0, 10).map((stat, index) => (
            <div 
              key={stat.pair}
              className={cn(
                "p-4 rounded-lg border",
                index === 0 && "border-yellow-500/30 bg-yellow-500/5",
                index === 1 && "border-gray-400/30 bg-gray-400/5",
                index === 2 && "border-amber-600/30 bg-amber-600/5",
                index > 2 && "border-border"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getRankIcon(index)}
                  <span className="font-bold text-lg">{stat.pair}</span>
                  {getRecommendationBadge(stat.recommendation)}
                </div>
                <div className={cn(
                  "font-bold text-lg",
                  stat.totalPnl >= 0 ? "text-profit" : "text-loss"
                )}>
                  {formatPnl(stat.totalPnl)}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Trades</p>
                  <p className="font-medium">{stat.trades}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Win Rate</p>
                  <div className="flex items-center gap-1">
                    {stat.winRate >= 50 ? (
                      <TrendingUp className="h-3 w-3 text-profit" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-loss" />
                    )}
                    <span className={stat.winRate >= 50 ? "text-profit" : "text-loss"}>
                      {formatWinRate(stat.winRate)}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground">W/L</p>
                  <p className="font-medium">{stat.wins}/{stat.losses}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg P&L</p>
                  <p className={stat.avgPnl >= 0 ? "text-profit" : "text-loss"}>
                    {formatPnl(stat.avgPnl)}
                  </p>
                </div>
              </div>

              <Progress 
                value={stat.winRate} 
                className={cn(
                  "h-1 mt-3",
                  stat.winRate >= 60 && "[&>div]:bg-green-500",
                  stat.winRate >= 40 && stat.winRate < 60 && "[&>div]:bg-yellow-500",
                  stat.winRate < 40 && "[&>div]:bg-red-500"
                )}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
