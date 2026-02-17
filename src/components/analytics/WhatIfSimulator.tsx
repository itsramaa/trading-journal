/**
 * What-If Simulator — Interactive scenario tool
 * Simulates "what if SL was tighter" or "what if I skipped low-confluence trades"
 */
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { FlaskConical, TrendingUp, TrendingDown, ArrowRight, Filter, Crosshair } from "lucide-react";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { TradeEntry } from "@/hooks/use-trade-entries";

// ─── helpers ────────────────────────────────────────────────────────

function getNetPnl(t: TradeEntry): number {
  return t.realized_pnl ?? t.pnl ?? 0;
}

interface SimResult {
  totalPnl: number;
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  profitFactor: number;
  avgPnl: number;
  maxDrawdown: number;
  tradesRemoved: number;
  pnlDelta: number;
  winRateDelta: number;
}

function computeStats(trades: TradeEntry[]): Omit<SimResult, "tradesRemoved" | "pnlDelta" | "winRateDelta"> {
  const closed = trades.filter(t => t.status === "closed");
  if (!closed.length) return { totalPnl: 0, winRate: 0, totalTrades: 0, wins: 0, losses: 0, profitFactor: 0, avgPnl: 0, maxDrawdown: 0 };

  let grossProfit = 0, grossLoss = 0, wins = 0, losses = 0;
  let peak = 0, cumPnl = 0, maxDd = 0;

  for (const t of closed) {
    const pnl = getNetPnl(t);
    if (pnl > 0) { grossProfit += pnl; wins++; }
    else if (pnl < 0) { grossLoss += Math.abs(pnl); losses++; }

    cumPnl += pnl;
    if (cumPnl > peak) peak = cumPnl;
    const dd = peak - cumPnl;
    if (dd > maxDd) maxDd = dd;
  }

  const totalTrades = closed.length;
  return {
    totalPnl: closed.reduce((s, t) => s + getNetPnl(t), 0),
    winRate: totalTrades > 0 ? (wins / totalTrades) * 100 : 0,
    totalTrades,
    wins,
    losses,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0,
    avgPnl: totalTrades > 0 ? closed.reduce((s, t) => s + getNetPnl(t), 0) / totalTrades : 0,
    maxDrawdown: maxDd,
  };
}

// ─── Simulate tighter SL ────────────────────────────────────────────

function simulateTighterSL(trades: TradeEntry[], slReductionPct: number): TradeEntry[] {
  return trades.map(t => {
    if (!t.stop_loss || !t.entry_price || !t.exit_price || t.status !== "closed") return t;

    const originalRisk = Math.abs(t.entry_price - t.stop_loss);
    const newRisk = originalRisk * (1 - slReductionPct / 100);
    if (newRisk <= 0) return t;

    const isLong = t.direction?.toUpperCase() === "LONG";
    const newSL = isLong ? t.entry_price - newRisk : t.entry_price + newRisk;

    // Would the tighter SL have been hit?
    const mae = (t as unknown as Record<string, unknown>).max_adverse_excursion as number | null | undefined;
    const wouldBeHit = isLong ? t.exit_price <= newSL || (mae != null && t.entry_price - mae <= newSL)
      : t.exit_price >= newSL || (mae != null && t.entry_price + mae >= newSL);

    if (wouldBeHit && getNetPnl(t) > 0) {
      // Winner that would have been stopped out — becomes a loss
      const fakePnl = isLong
        ? (newSL - t.entry_price) * t.quantity
        : (t.entry_price - newSL) * t.quantity;
      return { ...t, pnl: fakePnl, realized_pnl: fakePnl, result: "loss" as const } as TradeEntry;
    }
    if (!wouldBeHit && getNetPnl(t) < 0) {
      // Loser with tighter SL → smaller loss
      const fakePnl = isLong
        ? (newSL - t.entry_price) * t.quantity
        : (t.entry_price - newSL) * t.quantity;
      return { ...t, pnl: fakePnl, realized_pnl: fakePnl } as TradeEntry;
    }
    return t;
  });
}

// ─── Component ──────────────────────────────────────────────────────

interface WhatIfSimulatorProps {
  trades: TradeEntry[];
}

export function WhatIfSimulator({ trades }: WhatIfSimulatorProps) {
  const { format } = useCurrencyConversion();
  const [activeScenario, setActiveScenario] = useState("sl");
  const [slReduction, setSlReduction] = useState(20); // % tighter
  const [minConfluence, setMinConfluence] = useState(3);
  const [skipLowRR, setSkipLowRR] = useState(false);
  const [minRR, setMinRR] = useState(1.5);

  const closedTrades = useMemo(() => trades.filter(t => t.status === "closed"), [trades]);
  const baseline = useMemo(() => computeStats(trades), [trades]);

  // ── Scenario 1: Tighter SL
  const slResult = useMemo((): SimResult => {
    const simulated = simulateTighterSL(trades, slReduction);
    const stats = computeStats(simulated);
    return {
      ...stats,
      tradesRemoved: 0,
      pnlDelta: stats.totalPnl - baseline.totalPnl,
      winRateDelta: stats.winRate - baseline.winRate,
    };
  }, [trades, slReduction, baseline]);

  // ── Scenario 2: Skip low-confluence trades
  const confluenceResult = useMemo((): SimResult => {
    const filtered = trades.filter(t => {
      if (t.status !== "closed") return true;
      const score = t.confluence_score ?? 0;
      return score >= minConfluence;
    });
    const stats = computeStats(filtered);
    return {
      ...stats,
      tradesRemoved: closedTrades.length - stats.totalTrades,
      pnlDelta: stats.totalPnl - baseline.totalPnl,
      winRateDelta: stats.winRate - baseline.winRate,
    };
  }, [trades, minConfluence, baseline, closedTrades]);

  // ── Scenario 3: Skip low R:R trades
  const rrResult = useMemo((): SimResult => {
    if (!skipLowRR) return { ...baseline, tradesRemoved: 0, pnlDelta: 0, winRateDelta: 0 };
    const filtered = trades.filter(t => {
      if (t.status !== "closed") return true;
      if (!t.stop_loss || !t.take_profit || !t.entry_price) return true; // can't evaluate, keep
      const risk = Math.abs(t.entry_price - t.stop_loss);
      const reward = Math.abs(t.take_profit - t.entry_price);
      if (risk === 0) return true;
      return reward / risk >= minRR;
    });
    const stats = computeStats(filtered);
    return {
      ...stats,
      tradesRemoved: closedTrades.length - stats.totalTrades,
      pnlDelta: stats.totalPnl - baseline.totalPnl,
      winRateDelta: stats.winRate - baseline.winRate,
    };
  }, [trades, skipLowRR, minRR, baseline, closedTrades]);

  if (!closedTrades.length) {
    return (
      <Card role="region" aria-label="What-If Simulator">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-primary" />
            What-If Simulator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Close some trades to run simulations.</p>
        </CardContent>
      </Card>
    );
  }

  const activeResult = activeScenario === "sl" ? slResult : activeScenario === "confluence" ? confluenceResult : rrResult;

  return (
    <Card role="region" aria-label="What-If Simulator">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-primary" />
          What-If Simulator
          <InfoTooltip content="Simulate how your performance would change under different scenarios. Adjust parameters to see the hypothetical impact on your P&L and win rate." />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeScenario} onValueChange={setActiveScenario}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="sl" className="text-xs gap-1">
              <Crosshair className="h-3 w-3" />
              <span className="hidden sm:inline">Tighter SL</span>
              <span className="sm:hidden">SL</span>
            </TabsTrigger>
            <TabsTrigger value="confluence" className="text-xs gap-1">
              <Filter className="h-3 w-3" />
              <span className="hidden sm:inline">Confluence</span>
              <span className="sm:hidden">Conf</span>
            </TabsTrigger>
            <TabsTrigger value="rr" className="text-xs gap-1">
              <TrendingUp className="h-3 w-3" />
              <span className="hidden sm:inline">Min R:R</span>
              <span className="sm:hidden">R:R</span>
            </TabsTrigger>
          </TabsList>

          {/* ── Tighter SL ──────── */}
          <TabsContent value="sl" className="space-y-3 mt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  SL Tightened By
                  <InfoTooltip content="Reduces the stop-loss distance by this percentage. Shows how tighter stops would have affected your win rate and P&L." />
                </span>
                <Badge variant="outline" className="font-mono">{slReduction}%</Badge>
              </div>
              <Slider value={[slReduction]} onValueChange={([v]) => setSlReduction(v)} min={5} max={50} step={5} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>5%</span><span>25%</span><span>50%</span>
              </div>
            </div>
          </TabsContent>

          {/* ── Confluence Filter ──────── */}
          <TabsContent value="confluence" className="space-y-3 mt-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  Min Confluence Score
                  <InfoTooltip content="Skip trades with a confluence score below this threshold. Tests whether higher-quality setups improve overall performance." />
                </span>
                <Badge variant="outline" className="font-mono">≥ {minConfluence}</Badge>
              </div>
              <Slider value={[minConfluence]} onValueChange={([v]) => setMinConfluence(v)} min={1} max={6} step={1} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span><span>3</span><span>6</span>
              </div>
            </div>
          </TabsContent>

          {/* ── Min R:R Filter ──────── */}
          <TabsContent value="rr" className="space-y-3 mt-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="rr-toggle" className="text-sm text-muted-foreground flex items-center gap-1">
                  Skip Low R:R Trades
                  <InfoTooltip content="Filter out trades where the planned Risk:Reward ratio was below the threshold. Shows impact of only taking high-quality setups." />
                </Label>
                <Switch id="rr-toggle" checked={skipLowRR} onCheckedChange={setSkipLowRR} />
              </div>
              {skipLowRR && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Minimum R:R</span>
                    <Badge variant="outline" className="font-mono">≥ {minRR.toFixed(1)}</Badge>
                  </div>
                  <Slider value={[minRR * 10]} onValueChange={([v]) => setMinRR(v / 10)} min={5} max={40} step={5} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0.5</span><span>2.0</span><span>4.0</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Results Comparison ──────── */}
        <div className="border rounded-lg divide-y">
          {/* P&L Delta */}
          <DeltaRow
            label="P&L"
            tooltip="Hypothetical change in total P&L under this scenario."
            baseline={baseline.totalPnl}
            simulated={activeResult.totalPnl}
            formatValue={format}
          />
          {/* Win Rate Delta */}
          <DeltaRow
            label="Win Rate"
            tooltip="Hypothetical change in win rate under this scenario."
            baseline={baseline.winRate}
            simulated={activeResult.winRate}
            formatValue={(v) => `${v.toFixed(1)}%`}
          />
          {/* Profit Factor */}
          <DeltaRow
            label="Profit Factor"
            tooltip="Ratio of gross profit to gross loss."
            baseline={baseline.profitFactor === Infinity ? 999 : baseline.profitFactor}
            simulated={activeResult.profitFactor === Infinity ? 999 : activeResult.profitFactor}
            formatValue={(v) => v >= 999 ? "∞" : v.toFixed(2)}
          />
          {/* Trade Count */}
          <div className="flex items-center justify-between p-3 text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              Trades
              <InfoTooltip content="Number of trades in this scenario vs. your actual total." />
            </span>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span>{baseline.totalTrades}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span>{activeResult.totalTrades}</span>
              {activeResult.tradesRemoved > 0 && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1">
                  -{activeResult.tradesRemoved}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">
          Simulations are approximate estimates based on historical data and simplified assumptions.
        </p>
      </CardContent>
    </Card>
  );
}

// ── Reusable delta row ──────────────────────────────────────────────

function DeltaRow({ label, tooltip, baseline, simulated, formatValue }: {
  label: string;
  tooltip: string;
  baseline: number;
  simulated: number;
  formatValue: (v: number) => string;
}) {
  const delta = simulated - baseline;
  const isPositive = delta > 0;
  const isNeutral = Math.abs(delta) < 0.01;

  return (
    <div className="flex items-center justify-between p-3 text-sm">
      <span className="text-muted-foreground flex items-center gap-1">
        {label}
        <InfoTooltip content={tooltip} />
      </span>
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{formatValue(baseline)}</span>
        <ArrowRight className="h-3 w-3 text-muted-foreground" />
        <span className="font-mono text-xs">{formatValue(simulated)}</span>
        {!isNeutral && (
          <Badge variant="outline" className={cn(
            "text-[10px] h-4 px-1 font-mono",
            isPositive ? "text-profit border-profit/50" : "text-loss border-loss/50"
          )}>
            {isPositive ? (
              <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
            ) : (
              <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
            )}
            {isPositive ? "+" : ""}{label === "Win Rate" ? `${delta.toFixed(1)}%` : formatValue(delta)}
          </Badge>
        )}
      </div>
    </div>
  );
}
