/**
 * Strategy Card - Individual strategy display card
 */
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MoreVertical, Edit, Play, Trash2, Clock, TrendingUp, Shield, Target, Tag, Star, Brain, Activity } from "lucide-react";
import { format } from "date-fns";
import type { TradingStrategy } from "@/hooks/use-trading-strategies";
import { getQualityScoreLabel, type StrategyPerformance } from "@/hooks/use-strategy-performance";
import { useStrategyContext } from "@/hooks/use-strategy-context";

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

interface StrategyCardProps {
  strategy: TradingStrategy;
  performance?: StrategyPerformance;
  onEdit: (strategy: TradingStrategy) => void;
  onDelete: (strategy: TradingStrategy) => void;
  onBacktest: (strategyId: string) => void;
}

export function StrategyCard({ strategy, performance, onEdit, onDelete, onBacktest }: StrategyCardProps) {
  const navigate = useNavigate();
  const qualityScore = performance?.aiQualityScore || 0;
  const scoreInfo = getQualityScoreLabel(qualityScore);
  const colorClass = colorClasses[strategy.color || 'blue'] || colorClasses.blue;
  
  // Get market fit context for this strategy
  const strategyContext = useStrategyContext(strategy);
  const marketFit = strategyContext?.marketFit;

  const handleBacktest = () => {
    // Navigate to backtest page with strategy pre-selected
    navigate(`/backtest?strategy=${strategy.id}`);
  };

  return (
    <Card className={`border-l-4 ${colorClass.replace('bg-', 'border-l-').split(' ')[0] || 'border-l-blue-500'}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${colorClass.split(' ')[0]}`} />
            <CardTitle className="text-lg">{strategy.name}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {/* Market Fit Badge */}
            {marketFit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className={`text-xs ${
                      marketFit.overallFit === 'optimal' ? 'bg-profit/10 text-profit border-profit/30' :
                      marketFit.overallFit === 'poor' ? 'bg-loss/10 text-loss border-loss/30' :
                      'bg-muted text-muted-foreground border-border'
                    }`}>
                      <Activity className="h-3 w-3 mr-1" aria-hidden="true" />
                      {marketFit.fitScore}%
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-sm space-y-1">
                      <p className="font-medium">Market Fit: {marketFit.overallFit}</p>
                      <p>Volatility: {marketFit.volatilityMatch}</p>
                      <p>Trend: {marketFit.trendAlignment}</p>
                      <p>Event Risk: {marketFit.eventRisk}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* AI Quality Score Badge */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge className={`text-xs ${scoreInfo.colorClass}`}>
                    <Brain className="h-3 w-3 mr-1" aria-hidden="true" />
                    {qualityScore > 0 ? `${qualityScore}%` : 'N/A'}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-sm space-y-1">
                    <p className="font-medium">AI Quality Score: {scoreInfo.label}</p>
                    {performance && performance.totalTrades > 0 ? (
                      <>
                        <p>Win Rate: {(performance.winRate * 100).toFixed(1)}%</p>
                        <p>Trades: {performance.totalTrades}</p>
                        <p>Profit Factor: {performance.profitFactor.toFixed(2)}</p>
                      </>
                    ) : (
                      <p>No trade data available</p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  aria-label={`Options for ${strategy.name} strategy`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Strategy options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit(strategy);
                }}>
                  <Edit className="h-4 w-4 mr-2" aria-hidden="true" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  handleBacktest();
                }}>
                  <Play className="h-4 w-4 mr-2" aria-hidden="true" />
                  Run Backtest
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(strategy);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <CardDescription className="line-clamp-2">
          {strategy.description || 'No description'}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {/* Strategy metadata badges */}
          <div className="flex flex-wrap gap-2">
            {strategy.timeframe && (
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" aria-hidden="true" />
                {strategy.timeframe}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
              {strategy.market_type || 'spot'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Shield className="h-3 w-3 mr-1" aria-hidden="true" />
              {strategy.min_confluences || 4} confluences
            </Badge>
            <Badge variant="outline" className="text-xs">
              <Target className="h-3 w-3 mr-1" aria-hidden="true" />
              {strategy.min_rr || 1.5}:1 R:R
            </Badge>
          </div>

          {/* Performance stats if available */}
          {performance && performance.totalTrades > 0 && (
            <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5">
              <span className="flex items-center gap-1">
                <Star className="h-3 w-3" aria-hidden="true" />
                {performance.wins}W / {performance.losses}L
              </span>
              <span>|</span>
              <span className={performance.winRate >= 0.5 ? 'text-profit' : 'text-loss'}>
                {(performance.winRate * 100).toFixed(0)}% WR
              </span>
            </div>
          )}

          {/* Tags */}
          {strategy.tags && strategy.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {strategy.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="h-3 w-3 mr-1" aria-hidden="true" />
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            Created {format(new Date(strategy.created_at), 'MMM d, yyyy')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
