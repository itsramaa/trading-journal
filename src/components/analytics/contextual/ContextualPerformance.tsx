/**
 * ContextualPerformance - Displays performance breakdown by market conditions
 * Shows win rates segmented by Fear/Greed zones, volatility levels, and event days
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useContextualAnalytics,
  type PerformanceMetrics,
  type FearGreedZone,
  type VolatilityLevel,
  type EventProximity,
  type ContextualInsight,
} from "@/hooks/use-contextual-analytics";
import { cn } from "@/lib/utils";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  AlertTriangle,
  Lightbulb,
  Target,
  Info,
} from "lucide-react";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { ContextualOnboardingGuide } from "./ContextualOnboardingGuide";
import { 
  FEAR_GREED_ZONES, 
  DATA_QUALITY,
  CORRELATION_STRENGTH,
  classifyCorrelation,
} from "@/lib/constants/ai-analytics";

// Zone label mappings
const FEAR_GREED_LABELS: Record<FearGreedZone, { label: string; color: string; range: string }> = {
  extremeFear: { label: 'Extreme Fear', color: 'text-loss', range: `0-${FEAR_GREED_ZONES.EXTREME_FEAR_MAX}` },
  fear: { label: 'Fear', color: 'text-[hsl(var(--chart-4))]', range: `${FEAR_GREED_ZONES.EXTREME_FEAR_MAX + 1}-${FEAR_GREED_ZONES.FEAR_MAX}` },
  neutral: { label: 'Neutral', color: 'text-muted-foreground', range: `${FEAR_GREED_ZONES.FEAR_MAX + 1}-${FEAR_GREED_ZONES.NEUTRAL_MAX}` },
  greed: { label: 'Greed', color: 'text-[hsl(var(--chart-2))]', range: `${FEAR_GREED_ZONES.NEUTRAL_MAX + 1}-${FEAR_GREED_ZONES.GREED_MAX}` },
  extremeGreed: { label: 'Extreme Greed', color: 'text-profit', range: `${FEAR_GREED_ZONES.GREED_MAX + 1}-100` },
};

const VOLATILITY_LABELS: Record<VolatilityLevel, { label: string; icon: typeof Activity }> = {
  low: { label: 'Low Volatility', icon: TrendingDown },
  medium: { label: 'Medium Volatility', icon: Activity },
  high: { label: 'High Volatility', icon: TrendingUp },
};

const EVENT_LABELS: Record<EventProximity, { label: string; description: string }> = {
  eventDay: { label: 'Event Day', description: 'High-impact event' },
  dayBefore: { label: 'Day Before', description: 'Pre-event anticipation' },
  dayAfter: { label: 'Day After', description: 'Post-event reaction' },
  normalDay: { label: 'Normal Day', description: 'No major events' },
};

// Metric row component
function MetricRow({ 
  label, 
  metrics,
  subLabel,
  colorClass,
  formatCurrency,
}: { 
  label: string; 
  metrics: PerformanceMetrics;
  subLabel?: string;
  colorClass?: string;
  formatCurrency: (value: number) => string;
}) {
  if (metrics.trades === 0) {
    return (
      <div className="flex items-center justify-between py-2 opacity-50">
        <div>
          <span className={cn("font-medium", colorClass)}>{label}</span>
          {subLabel && <span className="text-xs text-muted-foreground ml-2">({subLabel})</span>}
        </div>
        <span className="text-sm text-muted-foreground">No trades</span>
      </div>
    );
  }
  
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <div>
          <span className={cn("font-medium", colorClass)}>{label}</span>
          {subLabel && <span className="text-xs text-muted-foreground ml-2">({subLabel})</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{metrics.trades} trades</span>
          <Badge 
            variant="outline" 
            className={cn(
              metrics.winRate >= 50 ? "border-profit text-profit" : "border-loss text-loss"
            )}
          >
            {metrics.winRate.toFixed(0)}%
          </Badge>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Progress 
          value={metrics.winRate} 
          className="h-2 flex-1" 
        />
        <span className={cn(
          "text-sm font-medium font-mono-numbers w-20 text-right",
          metrics.totalPnl >= 0 ? "text-profit" : "text-loss"
        )}>
          {formatCurrency(metrics.totalPnl)}
        </span>
      </div>
    </div>
  );
}

// Insight card component
function InsightCard({ insight }: { insight: ContextualInsight }) {
  const Icon = insight.type === 'opportunity' ? Lightbulb 
    : insight.type === 'warning' ? AlertTriangle 
    : Target;
  
  const bgColor = insight.type === 'opportunity' ? 'bg-profit/5 border-profit/30'
    : insight.type === 'warning' ? 'bg-loss/5 border-loss/30'
    : 'bg-primary/5 border-primary/30';
  
  const iconColor = insight.type === 'opportunity' ? 'text-profit'
    : insight.type === 'warning' ? 'text-loss'
    : 'text-primary';
  
  return (
    <div className={cn("p-4 rounded-lg border", bgColor)}>
      <div className="flex items-start gap-3">
        <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", iconColor)} />
        <div className="flex-1 min-w-0">
          <p className="font-medium">{insight.title}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {insight.description}
          </p>
          <p className="text-xs text-muted-foreground mt-2 italic">
            Evidence: {insight.evidence}
          </p>
          <p className="text-sm font-medium mt-2">
            → {insight.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}

export function ContextualPerformance() {
  const { data, isLoading } = useContextualAnalytics();
  const { format: formatCurrency } = useCurrencyConversion();
  
  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }
  
  if (!data) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">Insufficient Context Data</h3>
          <p className="text-muted-foreground">
            Complete more trades with market context capture to unlock contextual analytics.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Trades need market_context data from the Trade Entry Wizard.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Onboarding Guide for first-time users */}
      <ContextualOnboardingGuide />
      
      {/* Data Quality Banner */}
      {data.dataQualityPercent < DATA_QUALITY.QUALITY_WARNING_PERCENT && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50 border">
          <Info className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="text-sm">
            <span className="font-medium">{data.tradesWithContext}</span> of {data.totalAnalyzedTrades} trades have market context data ({data.dataQualityPercent.toFixed(0)}%).
            Use the Trade Entry Wizard to capture context automatically.
          </div>
        </div>
      )}
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Fear & Greed Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance by Fear & Greed
              <InfoTooltip content="Your win rate segmented by the Fear & Greed Index value at the time of each trade. Helps identify which sentiment environments suit your strategy." />
            </CardTitle>
            <CardDescription>
              Win rates across different market sentiment zones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {(Object.entries(FEAR_GREED_LABELS) as [FearGreedZone, typeof FEAR_GREED_LABELS[FearGreedZone]][]).map(([zone, config]) => (
              <MetricRow
                key={zone}
                label={config.label}
                subLabel={config.range}
                metrics={data.byFearGreed[zone]}
                colorClass={config.color}
                formatCurrency={formatCurrency}
              />
            ))}
          </CardContent>
        </Card>
        
        {/* Volatility Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-primary" />
              Performance by Volatility
              <InfoTooltip content="Win rate in low, medium, and high volatility conditions. Captured from market context at trade entry." />
            </CardTitle>
            <CardDescription>
              Win rates across different volatility levels
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {(Object.entries(VOLATILITY_LABELS) as [VolatilityLevel, typeof VOLATILITY_LABELS[VolatilityLevel]][]).map(([level, config]) => (
              <MetricRow
                key={level}
                label={config.label}
                metrics={data.byVolatility[level]}
                formatCurrency={formatCurrency}
              />
            ))}
          </CardContent>
        </Card>
        
        {/* Event Day Performance */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-primary" />
              Performance by Event Days
              <InfoTooltip content="Compares your performance on high-impact economic event days vs. normal trading days." />
            </CardTitle>
            <CardDescription>
              Win rates on high-impact economic event days
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            {(['eventDay', 'normalDay'] as EventProximity[]).map(proximity => (
              <MetricRow
                key={proximity}
                label={EVENT_LABELS[proximity].label}
                subLabel={EVENT_LABELS[proximity].description}
                metrics={data.byEventProximity[proximity]}
                formatCurrency={formatCurrency}
              />
            ))}
          </CardContent>
        </Card>
        
        {/* Correlations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Target className="h-5 w-5 text-primary" />
              Correlation Analysis
              <InfoTooltip content="Statistical correlation (-1 to +1) between market conditions and your performance. Values near 0 = no relationship, near +/-1 = strong relationship." />
            </CardTitle>
            <CardDescription>
              How market conditions correlate with your performance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.tradesWithContext < DATA_QUALITY.MIN_TRADES_FOR_CORRELATION ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <p>Need at least {DATA_QUALITY.MIN_TRADES_FOR_CORRELATION} trades with market context for correlation analysis.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <CorrelationRow
                  label="Volatility vs Win Rate"
                  value={data.correlations.volatilityVsWinRate}
                  description="Higher = you win more in volatile markets"
                  hasData={data.tradesWithContext >= DATA_QUALITY.MIN_TRADES_FOR_CORRELATION}
                />
                <CorrelationRow
                  label="Fear/Greed vs Win Rate"
                  value={data.correlations.fearGreedVsWinRate}
                  description="Higher = you win more in greedy markets"
                  hasData={data.tradesWithContext >= DATA_QUALITY.MIN_TRADES_FOR_CORRELATION}
                />
                <CorrelationRow
                  label="Event Day vs P&L"
                  value={data.correlations.eventDayVsPnl}
                  description="Higher = you profit more on event days"
                  hasData={data.tradesWithContext >= DATA_QUALITY.MIN_TRADES_FOR_CORRELATION}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Contextual Insights */}
      {data.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Contextual Insights
            </CardTitle>
            <CardDescription>
              AI-generated insights based on your performance patterns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Correlation row component (#27 — font-mono-numbers on correlation values)
function CorrelationRow({ 
  label, 
  value, 
  description,
  hasData,
}: { 
  label: string; 
  value: number; 
  description: string;
  hasData: boolean;
}) {
  if (!hasData) {
    return (
      <div className="flex items-center justify-between py-2 border-b last:border-0">
        <div>
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Insufficient data</p>
        </div>
      </div>
    );
  }

  const { strength, direction } = classifyCorrelation(value);
  
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-0">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="text-right">
        <p className={cn(
          "font-mono-numbers font-medium",
          value > CORRELATION_STRENGTH.WEAK_THRESHOLD ? "text-profit" : value < -CORRELATION_STRENGTH.WEAK_THRESHOLD ? "text-loss" : "text-muted-foreground"
        )}>
          {value > 0 ? '+' : ''}{value.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground">{strength} {direction}</p>
      </div>
    </div>
  );
}
