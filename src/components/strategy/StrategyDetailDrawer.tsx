/**
 * StrategyDetailDrawer - Full strategy detail view with Market Fit and Pair Recommendations
 * Enhanced with Position Sizing, Trade Management, and Futures fields
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  AlertCircle,
  Download,
  Share2,
  Layers,
  Timer,
  Globe,
  Settings2,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import type { TradingStrategy } from "@/hooks/use-trading-strategies";
import { useStrategyContext } from "@/hooks/use-strategy-context";
import { getQualityScoreLabel, type StrategyPerformance } from "@/hooks/use-strategy-performance";
import { useStrategyExport } from "@/hooks/use-strategy-export";
import { MarketFitSection } from "./MarketFitSection";
import { PairRecommendations } from "./PairRecommendations";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { METHODOLOGY_OPTIONS, TRADING_STYLE_OPTIONS, SESSION_OPTIONS, POSITION_SIZING_MODELS } from "@/lib/constants/strategy-config";

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
  onShare: () => void;
}

export function StrategyDetailDrawer({
  strategy,
  performance,
  open,
  onOpenChange,
  onEdit,
  onBacktest,
  onShare,
}: StrategyDetailDrawerProps) {
  const strategyContext = useStrategyContext(strategy);
  const { exportToPDF } = useStrategyExport();
  const qualityScore = performance?.aiQualityScore || 0;
  const scoreInfo = getQualityScoreLabel(qualityScore);
  const colorClass = colorClasses[strategy?.color || 'blue'] || colorClasses.blue;

  const handleExportPDF = () => {
    if (!strategy) return;
    
    exportToPDF({
      strategy,
      performance,
      marketFit: strategyContext?.marketFit,
      strategyPerformance: strategyContext?.performance,
      recommendations: strategyContext?.recommendations,
      validityReasons: strategyContext?.validityReasons,
      isValidForCurrentConditions: strategyContext?.isValidForCurrentConditions,
    });
    
    toast.success('Strategy report exported', {
      description: `PDF saved for ${strategy.name}`,
    });
  };

  if (!strategy) return null;

  const positionSizingLabel = POSITION_SIZING_MODELS.find(m => m.value === strategy.position_sizing_model)?.label || 'Fixed % Risk';
  const positionSizingUnit = POSITION_SIZING_MODELS.find(m => m.value === strategy.position_sizing_model)?.unit || '%';

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
              Edit
            </Button>
            <Button onClick={onBacktest} variant="outline" className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Backtest
            </Button>
            <Button 
              onClick={onShare} 
              variant="outline"
              aria-label="Share strategy"
            >
              <Share2 className="h-4 w-4" />
            </Button>
            <Button 
              onClick={handleExportPDF} 
              variant="outline"
              disabled={strategyContext?.isLoading}
              aria-label="Export strategy report as PDF"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>

          {/* Strategy Metadata */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Strategy Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Methodology & Style */}
              <div className="flex flex-wrap gap-2">
                {strategy.methodology && (
                  <Badge variant="secondary" className="text-xs">
                    <Layers className="h-3 w-3 mr-1" />
                    {METHODOLOGY_OPTIONS.find(m => m.value === strategy.methodology)?.label || strategy.methodology}
                  </Badge>
                )}
                {strategy.trading_style && (
                  <Badge variant="outline" className="text-xs">
                    <Timer className="h-3 w-3 mr-1" />
                    {TRADING_STYLE_OPTIONS.find(s => s.value === strategy.trading_style)?.label || strategy.trading_style}
                  </Badge>
                )}
                {strategy.difficulty_level && (
                  <Badge variant="outline" className="text-xs capitalize">
                    {strategy.difficulty_level}
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Multi-Timeframe Analysis - Clean labels */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Multi-Timeframe Analysis
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Higher TF (Bias)</p>
                    <Badge variant="outline" className="text-xs">
                      {strategy.higher_timeframe || 'Not set'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Primary TF (Trade)</p>
                    <Badge variant="default" className="text-xs">
                      {strategy.timeframe || 'Not set'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-1">Lower TF (Entry)</p>
                    <Badge variant="outline" className="text-xs">
                      {strategy.lower_timeframe || 'Not set'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Session Preference */}
              {strategy.session_preference && strategy.session_preference.length > 0 && !strategy.session_preference.includes('all') && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <Globe className="h-3 w-3" />
                    Preferred Sessions
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {strategy.session_preference.map(session => (
                      <Badge key={session} variant="outline" className="text-xs">
                        {SESSION_OPTIONS.find(s => s.value === session)?.label || session}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Separator />
              
              {/* Core Settings */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {strategy.market_type || 'spot'}
                </Badge>
                {/* Futures badges */}
                {strategy.market_type === 'futures' && (
                  <>
                    <Badge variant="outline" className="text-xs">
                      {strategy.default_leverage}x leverage
                    </Badge>
                    <Badge variant="outline" className="text-xs capitalize">
                      {strategy.margin_mode} margin
                    </Badge>
                  </>
                )}
                <Badge variant="outline" className="text-xs">
                  <Shield className="h-3 w-3 mr-1" />
                  {strategy.min_confluences || 3} confluences
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  {strategy.min_rr || 1.5}:1 R:R
                </Badge>
              </div>

              {/* Position Sizing */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Position Sizing:</span>
                <Badge variant="outline" className="text-xs">
                  {positionSizingLabel} — {strategy.position_sizing_value}{positionSizingUnit}
                </Badge>
              </div>

              {/* Trade Management Rules */}
              {strategy.trade_management && (
                (() => {
                  const tm = strategy.trade_management;
                  const hasRules = tm.partial_tp_enabled || tm.move_sl_to_be || 
                    tm.max_trades_per_day !== null || tm.max_daily_loss_percent !== null || 
                    tm.max_consecutive_losses !== null;
                  if (!hasRules) return null;
                  return (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <Settings2 className="h-3 w-3" />
                        Trade Management
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tm.partial_tp_enabled && (
                          <Badge variant="outline" className="text-xs">
                            Partial TP ({tm.partial_tp_levels.length} levels)
                          </Badge>
                        )}
                        {tm.move_sl_to_be && (
                          <Badge variant="outline" className="text-xs">
                            SL→BE at {tm.move_sl_to_be_at_rr}R
                          </Badge>
                        )}
                        {tm.max_trades_per_day !== null && (
                          <Badge variant="outline" className="text-xs">
                            Max {tm.max_trades_per_day} trades/day
                          </Badge>
                        )}
                        {tm.max_daily_loss_percent !== null && (
                          <Badge variant="outline" className="text-xs">
                            Kill: -{tm.max_daily_loss_percent}% daily
                          </Badge>
                        )}
                        {tm.max_consecutive_losses !== null && (
                          <Badge variant="outline" className="text-xs">
                            Kill: {tm.max_consecutive_losses} consec. losses
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Validation Score with tooltip */}
              {strategy.validation_score !== null && strategy.validation_score !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Confidence:</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="text-xs cursor-help">
                          <Info className="h-3 w-3 mr-1" />
                          {strategy.validation_score}%
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Confidence score is based on: completeness of entry/exit rules, specificity of conditions, and backtest-readiness. Not a win rate prediction.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}

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
