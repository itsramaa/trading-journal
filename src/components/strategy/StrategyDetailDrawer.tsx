/**
 * StrategyDetailDrawer - Full strategy detail view with Market Fit and Pair Recommendations
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Clock, 
  TrendingUp, 
  Shield, 
  Target, 
  Tag, 
  Star, 
  Brain,
  Play,
  Edit,
  CheckCircle2,
  XCircle,
  AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import type { TradingStrategy } from "@/hooks/use-trading-strategies";
import { useStrategyContext } from "@/hooks/use-strategy-context";
import { getQualityScoreLabel, type StrategyPerformance } from "@/hooks/use-strategy-performance";
import { MarketFitSection } from "./MarketFitSection";
import { PairRecommendations } from "./PairRecommendations";
import { Progress } from "@/components/ui/progress";

// Design system color tokens
const colorClasses: Record<string, string> = {
  blue: 'bg-primary/10 text-primary border-primary/30',
  green: 'bg-profit/10 text-profit border-profit/30',
  purple: 'bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3))]/30',
  orange: 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/30',
  red: 'bg-loss/10 text-loss border-loss/30',
  teal: 'bg-[hsl(var(--chart-1))]/10 text-[hsl(var(--chart-1))] border-[hsl(var(--chart-1))]/30',
  pink: 'bg-[hsl(var(--chart-6))]/10 text-[hsl(var(--chart-6))] border-[hsl(var(--chart-6))]/30',
  yellow: 'bg-[hsl(var(--chart-4))]/15 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/30',
};

interface StrategyDetailDrawerProps {
  strategy: TradingStrategy | null;
  performance?: StrategyPerformance;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onBacktest: () => void;
}

export function StrategyDetailDrawer({
  strategy,
  performance,
  open,
  onOpenChange,
  onEdit,
  onBacktest,
}: StrategyDetailDrawerProps) {
  const strategyContext = useStrategyContext(strategy);
  const qualityScore = performance?.aiQualityScore || 0;
  const scoreInfo = getQualityScoreLabel(qualityScore);
  const colorClass = colorClasses[strategy?.color || 'blue'] || colorClasses.blue;

  if (!strategy) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${colorClass.split(' ')[0]}`} />
            <SheetTitle className="text-xl">{strategy.name}</SheetTitle>
          </div>
          {strategy.description && (
            <p className="text-sm text-muted-foreground">{strategy.description}</p>
          )}
        </SheetHeader>

        <div className="space-y-6">
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={onEdit} variant="outline" className="flex-1">
              <Edit className="h-4 w-4 mr-2" />
              Edit Strategy
            </Button>
            <Button onClick={onBacktest} className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Run Backtest
            </Button>
          </div>

          {/* Strategy Metadata */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Strategy Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {strategy.timeframe && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {strategy.timeframe}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {strategy.market_type || 'spot'}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {strategy.min_confluences || 4} confluences
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  {strategy.min_rr || 1.5}:1 R:R
                </Badge>
              </div>

              {/* Tags */}
              {strategy.tags && strategy.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {strategy.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      <Tag className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="text-xs text-muted-foreground mt-3">
                Created {format(new Date(strategy.created_at), 'MMM d, yyyy')}
              </div>
            </CardContent>
          </Card>

          {/* AI Quality Score */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  AI Quality Score
                </CardTitle>
                <Badge className={`${scoreInfo.colorClass}`}>
                  {qualityScore > 0 ? `${qualityScore}% - ${scoreInfo.label}` : 'No Data'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {performance && performance.totalTrades > 0 ? (
                <div className="space-y-3">
                  <Progress value={qualityScore} className="h-2" />
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-lg font-bold">{(performance.winRate * 100).toFixed(0)}%</div>
                      <div className="text-xs text-muted-foreground">Win Rate</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{performance.totalTrades}</div>
                      <div className="text-xs text-muted-foreground">Total Trades</div>
                    </div>
                    <div>
                      <div className="text-lg font-bold">{performance.profitFactor.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">Profit Factor</div>
                    </div>
                  </div>
                  <div className="flex justify-center gap-4 text-sm">
                    <span className="text-profit flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      {performance.wins} Wins
                    </span>
                    <span className="text-loss flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      {performance.losses} Losses
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <p>No trade data available yet.</p>
                  <p className="text-xs mt-1">Execute trades with this strategy to see performance metrics.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Market Fit Section */}
          {strategyContext?.isLoading ? (
            <Card>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ) : strategyContext?.marketFit ? (
            <>
              <MarketFitSection marketFit={strategyContext.marketFit} />

              {/* Validity Reasons */}
              {strategyContext.validityReasons.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {strategyContext.isValidForCurrentConditions ? (
                        <CheckCircle2 className="h-4 w-4 text-profit" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-loss" />
                      )}
                      Current Conditions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {strategyContext.validityReasons.map((reason, index) => (
                        <li 
                          key={index} 
                          className={`text-sm flex items-start gap-2 ${
                            reason.includes('optimal') || reason.includes('Strong') 
                              ? 'text-profit' 
                              : reason.includes('consider') || reason.includes('waiting') || reason.includes('poor')
                              ? 'text-loss'
                              : 'text-muted-foreground'
                          }`}
                        >
                          <span className="mt-0.5">•</span>
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}

          {/* Pair Recommendations */}
          {strategyContext?.recommendations && (
            <PairRecommendations
              bestPairs={strategyContext.recommendations.bestPairs}
              avoidPairs={strategyContext.recommendations.avoidPairs}
              currentPairScore={strategyContext.recommendations.currentPairScore}
            />
          )}

          {/* Historical Performance Summary */}
          {strategyContext?.performance && strategyContext.performance.totalTrades > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Historical Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {strategyContext.performance.bestTimeframe && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Most Used Timeframe</span>
                    <Badge variant="outline">{strategyContext.performance.bestTimeframe}</Badge>
                  </div>
                )}
                {strategyContext.performance.avgHoldTime !== null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Average Hold Time</span>
                    <span className="font-medium">
                      {strategyContext.performance.avgHoldTime >= 24 
                        ? `${(strategyContext.performance.avgHoldTime / 24).toFixed(1)} days`
                        : `${strategyContext.performance.avgHoldTime.toFixed(1)} hours`
                      }
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Win Rate</span>
                  <span className={`font-medium ${strategyContext.performance.overallWinRate >= 50 ? 'text-profit' : 'text-loss'}`}>
                    {strategyContext.performance.overallWinRate.toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
