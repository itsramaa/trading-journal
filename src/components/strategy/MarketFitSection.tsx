/**
 * MarketFitSection - Visual display of strategy fit with current market conditions
 */
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Minus
} from "lucide-react";
import type { MarketFit, MatchLevel, AlignmentLevel, EventRiskLevel } from "@/hooks/use-strategy-context";

interface MarketFitSectionProps {
  marketFit: MarketFit;
  compact?: boolean;
}

const matchLevelConfig: Record<MatchLevel, { label: string; color: string; icon: React.ReactNode }> = {
  optimal: { label: 'Optimal', color: 'bg-profit/10 text-profit border-profit/30', icon: <CheckCircle2 className="h-3 w-3" /> },
  acceptable: { label: 'Acceptable', color: 'bg-muted text-muted-foreground border-border', icon: <Minus className="h-3 w-3" /> },
  poor: { label: 'Poor', color: 'bg-loss/10 text-loss border-loss/30', icon: <XCircle className="h-3 w-3" /> },
};

const alignmentConfig: Record<AlignmentLevel, { label: string; color: string; icon: React.ReactNode }> = {
  aligned: { label: 'Aligned', color: 'bg-profit/10 text-profit border-profit/30', icon: <TrendingUp className="h-3 w-3" /> },
  neutral: { label: 'Neutral', color: 'bg-muted text-muted-foreground border-border', icon: <Minus className="h-3 w-3" /> },
  counter: { label: 'Counter', color: 'bg-loss/10 text-loss border-loss/30', icon: <TrendingDown className="h-3 w-3" /> },
};

const eventRiskConfig: Record<EventRiskLevel, { label: string; color: string; icon: React.ReactNode }> = {
  clear: { label: 'Clear', color: 'bg-profit/10 text-profit border-profit/30', icon: <CheckCircle2 className="h-3 w-3" /> },
  caution: { label: 'Caution', color: 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/30', icon: <AlertTriangle className="h-3 w-3" /> },
  avoid: { label: 'Avoid', color: 'bg-loss/10 text-loss border-loss/30', icon: <XCircle className="h-3 w-3" /> },
};

export function MarketFitSection({ marketFit, compact = false }: MarketFitSectionProps) {
  const overallConfig = matchLevelConfig[marketFit.overallFit];

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className={`text-xs gap-1 ${overallConfig.color}`}>
              <Activity className="h-3 w-3" />
              {marketFit.fitScore}%
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="w-64">
            <div className="space-y-2">
              <p className="font-medium">Market Fit: {overallConfig.label}</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span>Volatility:</span>
                <span className={matchLevelConfig[marketFit.volatilityMatch].color.split(' ')[1]}>
                  {matchLevelConfig[marketFit.volatilityMatch].label}
                </span>
                <span>Trend:</span>
                <span className={alignmentConfig[marketFit.trendAlignment].color.split(' ')[1]}>
                  {alignmentConfig[marketFit.trendAlignment].label}
                </span>
                <span>Events:</span>
                <span className={eventRiskConfig[marketFit.eventRisk].color.split(' ')[1]}>
                  {eventRiskConfig[marketFit.eventRisk].label}
                </span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Market Fit Analysis
          </CardTitle>
          <Badge className={`${overallConfig.color}`}>
            {overallConfig.icon}
            <span className="ml-1">{marketFit.fitScore}% - {overallConfig.label}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* Volatility Match */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Volatility</div>
            <Badge variant="outline" className={`text-xs ${matchLevelConfig[marketFit.volatilityMatch].color}`}>
              {matchLevelConfig[marketFit.volatilityMatch].icon}
              <span className="ml-1">{matchLevelConfig[marketFit.volatilityMatch].label}</span>
            </Badge>
          </div>

          {/* Trend Alignment */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Trend</div>
            <Badge variant="outline" className={`text-xs ${alignmentConfig[marketFit.trendAlignment].color}`}>
              {alignmentConfig[marketFit.trendAlignment].icon}
              <span className="ml-1">{alignmentConfig[marketFit.trendAlignment].label}</span>
            </Badge>
          </div>

          {/* Session Match */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Session</div>
            <Badge variant="outline" className={`text-xs ${marketFit.sessionMatch === 'active' ? 'bg-profit/10 text-profit border-profit/30' : 'bg-muted text-muted-foreground border-border'}`}>
              <Clock className="h-3 w-3" />
              <span className="ml-1">{marketFit.sessionMatch === 'active' ? 'Active' : 'Off Hours'}</span>
            </Badge>
          </div>

          {/* Event Risk */}
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Event Risk</div>
            <Badge variant="outline" className={`text-xs ${eventRiskConfig[marketFit.eventRisk].color}`}>
              {eventRiskConfig[marketFit.eventRisk].icon}
              <span className="ml-1">{eventRiskConfig[marketFit.eventRisk].label}</span>
            </Badge>
          </div>
        </div>

        {/* Fit Score Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Fit Score</span>
            <span>{marketFit.fitScore}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                marketFit.fitScore >= 70 ? 'bg-profit' : 
                marketFit.fitScore >= 40 ? 'bg-[hsl(var(--chart-4))]' : 
                'bg-loss'
              }`}
              style={{ width: `${marketFit.fitScore}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
