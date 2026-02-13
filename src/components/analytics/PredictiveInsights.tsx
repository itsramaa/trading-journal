/**
 * Predictive Insights Component
 * Displays statistical pattern-based predictions from historical trading data.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, TrendingDown, Calendar, Clock, BarChart3, Zap, 
  ArrowUpRight, ArrowDownRight, Minus 
} from "lucide-react";
import { useModeFilteredTrades } from "@/hooks/use-mode-filtered-trades";
import {
  calculateStreakProbability,
  getDayOfWeekEdge,
  getPairMomentum,
  getSessionOutlook,
  type Confidence,
} from "@/lib/predictive-analytics";
import { cn } from "@/lib/utils";

const confidenceColors: Record<Confidence, string> = {
  low: 'border-muted-foreground text-muted-foreground',
  medium: 'border-chart-4 text-chart-4',
  high: 'border-profit text-profit',
};

const confidenceLabels: Record<Confidence, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function PredictiveInsights() {
  const { data: trades = [] } = useModeFilteredTrades();

  const { streak, dayEdge, momentum, session } = useMemo(() => ({
    streak: calculateStreakProbability(trades),
    dayEdge: getDayOfWeekEdge(trades),
    momentum: getPairMomentum(trades),
    session: getSessionOutlook(trades),
  }), [trades]);

  const hasData = streak || dayEdge || momentum.length > 0 || session;

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="font-semibold mb-2">Not Enough Data for Predictions</h3>
          <p className="text-sm text-muted-foreground">
            Complete more trades to unlock statistical predictions about your trading patterns.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2" role="region" aria-label="Predictive trading insights">
      {/* Streak Continuation */}
      {streak && (
        <PredictionCard
          icon={TrendingUp}
          title="Streak Continuation"
          description={streak.description}
          value={`${streak.value.toFixed(0)}%`}
          confidence={streak.confidence}
          sampleSize={streak.sampleSize}
        />
      )}

      {/* Day-of-Week Edge */}
      {dayEdge && (
        <PredictionCard
          icon={Calendar}
          title="Today's Edge"
          description={dayEdge.description}
          value={`${dayEdge.value.toFixed(0)}%`}
          confidence={dayEdge.confidence}
          sampleSize={dayEdge.sampleSize}
        />
      )}

      {/* Session Outlook */}
      {session && (
        <PredictionCard
          icon={Clock}
          title="Session Outlook"
          description={session.description}
          value={`${session.value.toFixed(0)}%`}
          confidence={session.confidence}
          sampleSize={session.sampleSize}
        />
      )}

      {/* Pair Momentum */}
      {momentum.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-primary" />
              Pair Momentum
            </CardTitle>
            <CardDescription>Recent performance trend per pair</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {momentum.slice(0, 5).map(p => (
              <div key={p.pair} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  {p.momentum === 'bullish' && <ArrowUpRight className="h-4 w-4 text-profit" />}
                  {p.momentum === 'bearish' && <ArrowDownRight className="h-4 w-4 text-loss" />}
                  {p.momentum === 'neutral' && <Minus className="h-4 w-4 text-muted-foreground" />}
                  <span className="font-medium text-sm">{p.pair}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{p.wins}/{p.total} wins</span>
                  <Badge variant="outline" className={cn("text-xs capitalize",
                    p.momentum === 'bullish' && 'border-profit text-profit',
                    p.momentum === 'bearish' && 'border-loss text-loss',
                  )}>
                    {p.momentum}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PredictionCard({
  icon: Icon, title, description, value, confidence, sampleSize,
}: {
  icon: typeof TrendingUp;
  title: string;
  description: string;
  value: string;
  confidence: Confidence;
  sampleSize: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-5 w-5 text-primary" />
            {title}
          </CardTitle>
          <Badge variant="outline" className={cn("text-xs", confidenceColors[confidence])}>
            {confidenceLabels[confidence]} confidence
          </Badge>
        </div>
      </CardHeader>
      <CardContent role="group" aria-label={`${title}: ${value} probability, ${confidenceLabels[confidence]} confidence, based on ${sampleSize} samples`}>
        <p className="text-2xl font-bold font-mono-numbers mb-2" aria-hidden="true">{value}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground mt-2">Based on {sampleSize} historical occurrences</p>
      </CardContent>
    </Card>
  );
}
