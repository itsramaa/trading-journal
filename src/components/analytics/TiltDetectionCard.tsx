/**
 * @module TiltDetectionCard
 * @description AI-powered revenge trading pattern detection.
 * Analyzes trade frequency, sizing changes, and loss sequences
 * to detect emotional "tilt" episodes.
 */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle, Shield, ShieldAlert, ShieldCheck,
  Zap, TrendingUp, Clock, Shuffle, Globe,
  ArrowDownRight,
} from "lucide-react";
import type { TradeEntry } from "@/hooks/use-trade-entries";
import { detectTilt, type TiltAnalysis, type TiltEpisode } from "@/lib/trading-calculations";
import { format } from "date-fns";

interface TiltDetectionCardProps {
  trades: TradeEntry[];
}

const RISK_CONFIG = {
  none: { icon: ShieldCheck, label: "No Tilt", color: "text-green-500", bg: "bg-green-500/10 border-green-500/20" },
  low: { icon: Shield, label: "Low Risk", color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/20" },
  medium: { icon: ShieldAlert, label: "Medium Risk", color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/20" },
  high: { icon: AlertTriangle, label: "High Risk", color: "text-destructive", bg: "bg-destructive/10 border-destructive/20" },
} as const;

const SIGNAL_CONFIG = [
  { key: 'frequencyEscalation' as const, icon: Zap, label: "Rapid Trading", desc: "Firing trades too quickly after losses" },
  { key: 'sizingEscalation' as const, icon: TrendingUp, label: "Size Escalation", desc: "Increasing position size to recover losses" },
  { key: 'lossSequence' as const, icon: ArrowDownRight, label: "Loss Spiral", desc: "Extended consecutive losing streak" },
  { key: 'pairScattering' as const, icon: Shuffle, label: "Pair Scatter", desc: "Switching pairs erratically after losses" },
  { key: 'sessionDeviation' as const, icon: Globe, label: "Session Drift", desc: "Trading outside normal hours after losses" },
];

const SEVERITY_BADGE = {
  mild: { variant: "secondary" as const, label: "Mild" },
  moderate: { variant: "outline" as const, label: "Moderate" },
  severe: { variant: "destructive" as const, label: "Severe" },
};

function SignalBar({ score, label, desc, icon: Icon }: { score: number; label: string; desc: string; icon: React.ElementType }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{label}</span>
          <InfoTooltip content={desc} />
        </div>
        <span className="font-mono-numbers text-xs text-muted-foreground">{score}%</span>
      </div>
      <Progress value={score} className="h-1.5" />
    </div>
  );
}

function EpisodeRow({ episode, index }: { episode: TiltEpisode; index: number }) {
  const badge = SEVERITY_BADGE[episode.severity];
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">
            {format(new Date(episode.startDate), 'MMM d')}
            {episode.startDate !== episode.endDate && ` – ${format(new Date(episode.endDate), 'MMM d')}`}
          </span>
          <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
          <span className={`text-xs font-mono-numbers ${episode.totalPnl < 0 ? 'text-destructive' : 'text-green-500'}`}>
            {episode.totalPnl >= 0 ? '+' : ''}{episode.totalPnl.toFixed(2)}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          {episode.signals.map(sig => (
            <Badge key={sig} variant="outline" className="text-[10px] px-1.5 py-0">
              {sig.replace('_', ' ')}
            </Badge>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          {episode.tradeCount} trades · {episode.pairs.slice(0, 3).join(', ')}
          {episode.pairs.length > 3 && ` +${episode.pairs.length - 3}`}
        </div>
      </div>
    </div>
  );
}

function MetricComparison({ label, tiltValue, normalValue, unit, inverted }: {
  label: string; tiltValue: number | null; normalValue: number | null; unit: string; inverted?: boolean;
}) {
  if (tiltValue === null || normalValue === null) return null;
  const worse = inverted ? tiltValue < normalValue : tiltValue > normalValue;
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3 font-mono-numbers text-xs">
        <span className={worse ? 'text-destructive font-medium' : ''}>
          {tiltValue.toFixed(1)}{unit}
          <span className="text-muted-foreground ml-1">tilt</span>
        </span>
        <span className="text-muted-foreground">vs</span>
        <span>
          {normalValue.toFixed(1)}{unit}
          <span className="text-muted-foreground ml-1">normal</span>
        </span>
      </div>
    </div>
  );
}

export function TiltDetectionCard({ trades }: TiltDetectionCardProps) {
  const analysis = useMemo(() => detectTilt(trades), [trades]);

  if (trades.length < 5) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Tilt Detection
            <InfoTooltip content="AI-powered detection for revenge trading patterns. Analyzes trade frequency, position sizing, and loss sequences to identify emotional tilt episodes." />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Need at least 5 closed trades for tilt analysis.</p>
        </CardContent>
      </Card>
    );
  }

  const risk = RISK_CONFIG[analysis.currentRisk];
  const RiskIcon = risk.icon;
  const activeSignals = SIGNAL_CONFIG.filter(s => analysis.signals[s.key] > 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Tilt Detection
            <InfoTooltip content="AI-powered detection for revenge trading patterns. Analyzes trade frequency, position sizing, and loss sequences to identify emotional tilt episodes." />
          </CardTitle>
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 ${risk.bg}`}>
            <RiskIcon className={`h-4 w-4 ${risk.color}`} />
            <span className={`text-sm font-medium ${risk.color}`}>{risk.label}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Tilt Score */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Overall Tilt Score
              <InfoTooltip content="Weighted composite of all behavioral signals. 0 = no tilt indicators, 100 = severe multi-signal tilt detected." />
            </span>
            <span className="font-mono-numbers font-medium">{analysis.tiltScore}/100</span>
          </div>
          <Progress value={analysis.tiltScore} className="h-2" />
        </div>

        {/* Signal Breakdown */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Behavioral Signals</h4>
          {SIGNAL_CONFIG.map(sig => (
            <SignalBar key={sig.key} score={analysis.signals[sig.key]} label={sig.label} desc={sig.desc} icon={sig.icon} />
          ))}
        </div>

        {/* Comparative Metrics */}
        {analysis.metrics.episodeCount > 0 && (
          <>
            <Separator />
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Tilt vs Normal Performance
              </h4>
              <MetricComparison
                label="Avg Interval"
                tiltValue={analysis.metrics.avgTimeBetweenTradesTilt}
                normalValue={analysis.metrics.avgTimeBetweenTradesNormal}
                unit="m"
                inverted
              />
              <MetricComparison
                label="Avg Size"
                tiltValue={analysis.metrics.avgSizeTilt}
                normalValue={analysis.metrics.avgSizeNormal}
                unit=""
              />
              <MetricComparison
                label="Win Rate"
                tiltValue={analysis.metrics.winRateTilt}
                normalValue={analysis.metrics.winRateNormal}
                unit="%"
                inverted
              />
              <div className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-muted-foreground">P&L During Tilt</span>
                <span className={`font-mono-numbers text-xs font-medium ${analysis.metrics.totalTiltPnl < 0 ? 'text-destructive' : 'text-green-500'}`}>
                  {analysis.metrics.totalTiltPnl >= 0 ? '+' : ''}{analysis.metrics.totalTiltPnl.toFixed(2)}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Episodes */}
        {analysis.episodes.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Detected Episodes ({analysis.episodes.length})
              </h4>
              <div className="max-h-64 overflow-y-auto space-y-1 divide-y divide-border">
                {analysis.episodes.slice(0, 10).map((ep, i) => (
                  <EpisodeRow key={i} episode={ep} index={i} />
                ))}
              </div>
              {analysis.episodes.length > 10 && (
                <p className="text-xs text-muted-foreground">
                  + {analysis.episodes.length - 10} more episodes
                </p>
              )}
            </div>
          </>
        )}

        {analysis.episodes.length === 0 && analysis.tiltScore === 0 && (
          <div className="text-center py-4">
            <ShieldCheck className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium">No tilt patterns detected</p>
            <p className="text-xs text-muted-foreground">Your trading discipline looks solid!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
