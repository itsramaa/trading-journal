/**
 * Combined Crypto + Macro Analysis Card
 * Displays alignment status and actionable recommendation per INTEGRATION_GUIDE.md
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Zap,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CombinedAnalysis, CombinedRecommendation, AlignmentStatus } from "@/features/market-insight/useCombinedAnalysis";

interface CombinedAnalysisCardProps {
  data: CombinedAnalysis | null;
  isLoading: boolean;
}

function getRecommendationStyle(recommendation: CombinedRecommendation) {
  switch (recommendation) {
    case 'STRONG_BUY':
      return {
        icon: TrendingUp,
        bgClass: 'bg-profit/10 border-profit/30',
        textClass: 'text-profit',
        badgeClass: 'bg-profit text-profit-foreground'
      };
    case 'STRONG_SELL':
      return {
        icon: TrendingDown,
        bgClass: 'bg-loss/10 border-loss/30',
        textClass: 'text-loss',
        badgeClass: 'bg-loss text-loss-foreground'
      };
    case 'CAUTIOUS':
      return {
        icon: AlertTriangle,
        bgClass: 'bg-secondary/20 border-secondary/40',
        textClass: 'text-secondary-foreground',
        badgeClass: 'bg-secondary text-secondary-foreground'
      };
    case 'WAIT':
    default:
      return {
        icon: Target,
        bgClass: 'bg-muted/50 border-muted-foreground/20',
        textClass: 'text-muted-foreground',
        badgeClass: 'bg-muted text-muted-foreground'
      };
  }
}

function getAlignmentIcon(status: AlignmentStatus) {
  switch (status) {
    case 'aligned':
      return <CheckCircle className="h-4 w-4 text-profit" />;
    case 'conflict':
      return <XCircle className="h-4 w-4 text-loss" />;
    default:
      return <AlertTriangle className="h-4 w-4 text-secondary" />;
  }
}

function getAlignmentLabel(status: AlignmentStatus) {
  switch (status) {
    case 'aligned':
      return 'Aligned';
    case 'conflict':
      return 'Conflict';
    default:
      return 'Neutral';
  }
}

export function CombinedAnalysisCard({ data, isLoading }: CombinedAnalysisCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Combined Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to calculate combined analysis. Please refresh market data.
          </p>
        </CardContent>
      </Card>
    );
  }

  const style = getRecommendationStyle(data.recommendation);
  const Icon = style.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Combined Analysis</CardTitle>
          </div>
          <Badge className={style.badgeClass}>
            {data.recommendation.replace('_', ' ')}
          </Badge>
        </div>
        <CardDescription>
          Crypto + Macro sentiment alignment per INTEGRATION_GUIDE
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recommendation Box */}
        <div className={cn(
          "p-4 rounded-lg border-2",
          style.bgClass
        )}>
          <div className="flex items-start gap-3">
            <Icon className={cn("h-6 w-6 shrink-0 mt-0.5", style.textClass)} />
            <div className="space-y-1">
              <p className={cn("font-semibold", style.textClass)}>
                {data.recommendation.replace('_', ' ')}
              </p>
              <p className="text-sm">{data.recommendationText}</p>
            </div>
          </div>
        </div>

        {/* Score Comparison */}
        <div className="grid grid-cols-2 gap-4">
          {/* Crypto Score */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Crypto Sentiment</span>
              <span className="text-lg font-bold">
                {Math.round(data.cryptoScore * 100)}%
              </span>
            </div>
            <Progress 
              value={data.cryptoScore * 100} 
              className={cn(
                "h-2",
                data.cryptoScore > 0.6 && "[&>div]:bg-profit",
                data.cryptoScore < 0.4 && "[&>div]:bg-loss"
              )}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {data.cryptoScore > 0.6 ? 'Bullish' : data.cryptoScore < 0.4 ? 'Bearish' : 'Neutral'}
            </p>
          </div>

          {/* Macro Score */}
          <div className="p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Macro Sentiment</span>
              <span className="text-lg font-bold">
                {Math.round(data.macroScore * 100)}%
              </span>
            </div>
            <Progress 
              value={data.macroScore * 100} 
              className={cn(
                "h-2",
                data.macroScore > 0.6 && "[&>div]:bg-profit",
                data.macroScore < 0.4 && "[&>div]:bg-loss"
              )}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {data.macroScore > 0.6 ? 'Bullish' : data.macroScore < 0.4 ? 'Bearish' : 'Cautious'}
            </p>
          </div>
        </div>

        {/* Alignment Status */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-2">
            {getAlignmentIcon(data.alignmentStatus)}
            <span className="text-sm font-medium">Alignment Status</span>
          </div>
          <div className="flex items-center gap-3">
            <Progress value={data.alignmentPercent} className="w-20 h-2" />
            <span className="text-sm font-bold">{data.alignmentPercent}%</span>
            <Badge variant="outline">{getAlignmentLabel(data.alignmentStatus)}</Badge>
          </div>
        </div>

        {/* Position Size Adjustment */}
        <div className="flex items-center justify-between text-sm p-2 rounded bg-muted/50">
          <span className="text-muted-foreground">Suggested Position Size:</span>
          <span className={cn(
            "font-semibold",
            data.positionSizeAdjustment < 1 && "text-loss",
            data.positionSizeAdjustment === 1 && "text-foreground",
            data.positionSizeAdjustment > 1 && "text-profit"
          )}>
            {data.positionSizeAdjustment < 1 
              ? `Reduce ${Math.round((1 - data.positionSizeAdjustment) * 100)}%`
              : data.positionSizeAdjustment > 1 
              ? `Increase ${Math.round((data.positionSizeAdjustment - 1) * 100)}%`
              : 'Normal Size'}
          </span>
        </div>

        {/* Confidence */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>Analysis Confidence</span>
          <span className="font-medium">{data.confidenceLevel}%</span>
        </div>
      </CardContent>
    </Card>
  );
}
