/**
 * TradeReplayCard - Visual step-by-step playback of a closed trade
 * Shows the trade lifecycle: Setup → Entry → Price Journey → Exit → Outcome
 * with an animated price visualization and timeline navigation
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw,
  Target, ArrowRightCircle, TrendingUp, TrendingDown,
  Activity, Shield, DollarSign, Clock, Crosshair, AlertTriangle,
  CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TradeReplayProps {
  trade: {
    pair: string;
    direction: string;
    entry_price: number;
    exit_price?: number | null;
    stop_loss?: number | null;
    take_profit?: number | null;
    pnl?: number | null;
    realized_pnl?: number | null;
    fees?: number | null;
    commission?: number | null;
    funding_fees?: number | null;
    quantity: number;
    leverage?: number | null;
    r_multiple?: number | null;
    max_adverse_excursion?: number | null;
    entry_datetime?: string | null;
    exit_datetime?: string | null;
    hold_time_minutes?: number | null;
    entry_signal?: string | null;
    market_condition?: string | null;
    confluence_score?: number | null;
    emotional_state?: string | null;
    result?: string | null;
    session?: string | null;
    entry_order_type?: string | null;
    exit_order_type?: string | null;
    trade_rating?: string | null;
    lesson_learned?: string | null;
  };
  formatCurrency: (val: number) => string;
  formatPnl: (val: number) => string;
}

interface ReplayStep {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  content: React.ReactNode;
  priceHighlight?: 'entry' | 'sl' | 'tp' | 'mae' | 'exit';
}

function formatHoldTimeShort(minutes: number | null | undefined): string {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h ${minutes % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export function TradeReplayCard({ trade, formatCurrency, formatPnl }: TradeReplayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const isLong = trade.direction?.toUpperCase() === 'LONG';
  const pnlValue = trade.realized_pnl ?? trade.pnl ?? 0;
  const totalFees = (trade.commission || 0) + (trade.fees || 0) + (trade.funding_fees || 0);
  const netPnl = pnlValue - totalFees;
  const isWin = netPnl > 0;

  // Build dynamic steps based on available data
  const steps: ReplayStep[] = useMemo(() => {
    const s: ReplayStep[] = [];

    // Step 1: Setup Analysis
    s.push({
      id: 'setup',
      title: 'Trade Setup',
      subtitle: 'Market analysis & signal identification',
      icon: Crosshair,
      color: 'text-primary',
      priceHighlight: undefined,
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {trade.market_condition && (
              <InfoBlock label="Market Condition" value={trade.market_condition} />
            )}
            {trade.entry_signal && (
              <InfoBlock label="Entry Signal" value={trade.entry_signal} />
            )}
            {trade.confluence_score != null && (
              <InfoBlock label="Confluence Score" value={`${trade.confluence_score}/5`} />
            )}
            {trade.session && (
              <InfoBlock label="Session" value={trade.session} />
            )}
          </div>
          {trade.emotional_state && (
            <div className="flex items-center gap-2 text-sm">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Emotional State:</span>
              <Badge variant="outline" className="text-xs">{trade.emotional_state}</Badge>
            </div>
          )}
          {!trade.entry_signal && !trade.market_condition && !trade.confluence_score && (
            <p className="text-sm text-muted-foreground italic">No setup details recorded for this trade.</p>
          )}
        </div>
      ),
    });

    // Step 2: Entry Execution
    s.push({
      id: 'entry',
      title: 'Entry Execution',
      subtitle: `${isLong ? 'Long' : 'Short'} position opened`,
      icon: ArrowRightCircle,
      color: isLong ? 'text-profit' : 'text-loss',
      priceHighlight: 'entry',
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <InfoBlock label="Entry Price" value={formatCurrency(trade.entry_price)} highlight />
            <InfoBlock label="Direction" value={isLong ? '🟢 LONG' : '🔴 SHORT'} />
            <InfoBlock label="Quantity" value={trade.quantity.toString()} />
            {trade.leverage && <InfoBlock label="Leverage" value={`${trade.leverage}x`} />}
            {trade.entry_order_type && <InfoBlock label="Order Type" value={trade.entry_order_type} />}
            {trade.entry_datetime && (
              <InfoBlock label="Time" value={new Date(trade.entry_datetime).toLocaleString()} />
            )}
          </div>
        </div>
      ),
    });

    // Step 3: Risk Plan
    if (trade.stop_loss || trade.take_profit) {
      const riskAmt = trade.stop_loss ? Math.abs(trade.entry_price - trade.stop_loss) * trade.quantity : null;
      const rewardAmt = trade.take_profit ? Math.abs(trade.take_profit - trade.entry_price) * trade.quantity : null;
      const rrRatio = riskAmt && rewardAmt ? (rewardAmt / riskAmt).toFixed(2) : null;

      s.push({
        id: 'risk',
        title: 'Risk Plan',
        subtitle: 'Stop loss & take profit levels',
        icon: Shield,
        color: 'text-primary',
        priceHighlight: 'sl',
        content: (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {trade.stop_loss && (
                <InfoBlock label="Stop Loss" value={formatCurrency(trade.stop_loss)} className="text-loss" />
              )}
              {trade.take_profit && (
                <InfoBlock label="Take Profit" value={formatCurrency(trade.take_profit)} className="text-profit" />
              )}
              {riskAmt && <InfoBlock label="Risk Amount" value={formatCurrency(riskAmt)} className="text-loss" />}
              {rrRatio && <InfoBlock label="Risk:Reward" value={`1:${rrRatio}`} />}
            </div>
          </div>
        ),
      });
    }

    // Step 4: Price Journey (MAE)
    if (trade.max_adverse_excursion != null) {
      const maePercent = trade.entry_price > 0
        ? ((trade.max_adverse_excursion / trade.entry_price) * 100).toFixed(2)
        : '0';
      s.push({
        id: 'journey',
        title: 'Price Journey',
        subtitle: 'Maximum adverse excursion during trade',
        icon: Activity,
        color: 'text-warning',
        priceHighlight: 'mae',
        content: (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InfoBlock label="Max Adverse Excursion" value={formatCurrency(trade.max_adverse_excursion)} className="text-loss" />
              <InfoBlock label="MAE %" value={`${maePercent}%`} className="text-loss" />
            </div>
            <div className="bg-muted/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground">
                {parseFloat(maePercent) > 2
                  ? '⚠️ Price moved significantly against you before recovering. Consider tighter entries.'
                  : '✅ Price stayed relatively close to entry — clean execution.'}
              </p>
            </div>
          </div>
        ),
      });
    }

    // Step 5: Exit Execution
    if (trade.exit_price) {
      s.push({
        id: 'exit',
        title: 'Exit Execution',
        subtitle: 'Position closed',
        icon: Target,
        color: isWin ? 'text-profit' : 'text-loss',
        priceHighlight: 'exit',
        content: (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <InfoBlock label="Exit Price" value={formatCurrency(trade.exit_price)} highlight />
              {trade.exit_order_type && <InfoBlock label="Order Type" value={trade.exit_order_type} />}
              {trade.exit_datetime && (
                <InfoBlock label="Time" value={new Date(trade.exit_datetime).toLocaleString()} />
              )}
              {trade.hold_time_minutes && (
                <InfoBlock label="Hold Time" value={formatHoldTimeShort(trade.hold_time_minutes)} />
              )}
            </div>
          </div>
        ),
      });
    }

    // Step 6: Outcome
    s.push({
      id: 'outcome',
      title: 'Outcome',
      subtitle: isWin ? 'Profitable trade ✅' : netPnl === 0 ? 'Breakeven trade' : 'Losing trade ❌',
      icon: DollarSign,
      color: isWin ? 'text-profit' : netPnl === 0 ? 'text-muted-foreground' : 'text-loss',
      priceHighlight: 'exit',
      content: (
        <div className="space-y-3">
          <div className="text-center py-2">
            <p className={cn("text-3xl font-bold font-mono", isWin ? "text-profit" : netPnl === 0 ? "text-muted-foreground" : "text-loss")}>
              {formatPnl(netPnl)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Net P&L (after fees)</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <InfoBlock label="Gross P&L" value={formatPnl(pnlValue)} className={pnlValue >= 0 ? 'text-profit' : 'text-loss'} />
            <InfoBlock label="Total Fees" value={formatCurrency(totalFees)} className="text-loss" />
            {trade.r_multiple != null && (
              <InfoBlock label="R-Multiple" value={`${Number(trade.r_multiple) >= 0 ? '+' : ''}${Number(trade.r_multiple).toFixed(2)}R`} className={Number(trade.r_multiple) >= 0 ? 'text-profit' : 'text-loss'} />
            )}
            {trade.trade_rating && <InfoBlock label="Rating" value={trade.trade_rating} />}
          </div>
          {trade.lesson_learned && (
            <div className="bg-muted/50 rounded-md p-3 mt-2">
              <p className="text-xs text-muted-foreground mb-1 font-medium">Lesson Learned</p>
              <p className="text-sm">{trade.lesson_learned}</p>
            </div>
          )}
        </div>
      ),
    });

    return s;
  }, [trade, isLong, isWin, netPnl, pnlValue, totalFees, formatCurrency, formatPnl]);

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [isPlaying, steps.length]);

  const step = steps[currentStep];
  const StepIcon = step.icon;

  // Build price levels for the visual chart
  const priceLevels = useMemo(() => {
    const levels: { price: number; label: string; color: string; type: string }[] = [];
    levels.push({ price: trade.entry_price, label: 'Entry', color: 'text-primary', type: 'entry' });
    if (trade.stop_loss) levels.push({ price: trade.stop_loss, label: 'Stop Loss', color: 'text-loss', type: 'sl' });
    if (trade.take_profit) levels.push({ price: trade.take_profit, label: 'Take Profit', color: 'text-profit', type: 'tp' });
    if (trade.exit_price) levels.push({ price: trade.exit_price, label: 'Exit', color: isWin ? 'text-profit' : 'text-loss', type: 'exit' });
    if (trade.max_adverse_excursion != null) {
      const maePrice = isLong
        ? trade.entry_price - trade.max_adverse_excursion
        : trade.entry_price + trade.max_adverse_excursion;
      levels.push({ price: maePrice, label: 'MAE', color: 'text-warning', type: 'mae' });
    }
    return levels.sort((a, b) => b.price - a.price);
  }, [trade, isLong, isWin]);

  const priceMin = Math.min(...priceLevels.map(l => l.price)) * 0.999;
  const priceMax = Math.max(...priceLevels.map(l => l.price)) * 1.001;
  const priceRange = priceMax - priceMin || 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="h-4 w-4 text-primary" />
            Trade Replay
          </CardTitle>
          <Badge variant="outline" className="text-xs font-mono">
            {currentStep + 1}/{steps.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timeline Progress */}
        <div className="flex items-center gap-1.5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <TooltipProvider key={s.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { setCurrentStep(i); setIsPlaying(false); }}
                      className={cn(
                        "flex-1 h-2 rounded-full transition-all duration-300",
                        i <= currentStep ? "bg-primary" : "bg-muted",
                        i === currentStep && "ring-2 ring-primary/30"
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top"><p className="text-xs">{s.title}</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Current Step Header */}
        <div className="flex items-center gap-3 py-2">
          <div className={cn("p-2 rounded-lg bg-muted", step.color)}>
            <StepIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm">{step.title}</h3>
            <p className="text-xs text-muted-foreground">{step.subtitle}</p>
          </div>
        </div>

        {/* Two-column layout: Price Viz + Content */}
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4">
          {/* Price Level Visualization */}
          <div className="relative bg-muted/30 rounded-lg p-3 min-h-[180px]">
            <p className="text-[10px] text-muted-foreground mb-2 text-center uppercase tracking-wider">Price Levels</p>
            <div className="relative h-[140px]">
              {priceLevels.map((level) => {
                const yPercent = ((priceMax - level.price) / priceRange) * 100;
                const isActive = step.priceHighlight === level.type;
                return (
                  <div
                    key={level.type}
                    className={cn(
                      "absolute left-0 right-0 flex items-center gap-1.5 transition-all duration-500",
                      isActive ? "opacity-100 scale-105" : "opacity-50"
                    )}
                    style={{ top: `${Math.min(Math.max(yPercent, 2), 90)}%` }}
                  >
                    <div className={cn("h-[2px] flex-1", isActive ? "bg-primary" : "bg-border")} />
                    <span className={cn("text-[10px] font-mono whitespace-nowrap", level.color, isActive && "font-bold")}>
                      {level.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="min-h-[180px]">
            {step.content}
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-border">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setCurrentStep(0); setIsPlaying(false); }}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0}>
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => {
              if (currentStep >= steps.length - 1) {
                setCurrentStep(0);
              }
              setIsPlaying(!isPlaying);
            }}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} disabled={currentStep >= steps.length - 1}>
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** Small info block for replay step content */
function InfoBlock({ label, value, className, highlight }: { label: string; value: string; className?: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-md p-2", highlight ? "bg-primary/10 border border-primary/20" : "bg-muted/50")}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={cn("text-sm font-semibold font-mono mt-0.5", className)}>{value}</p>
    </div>
  );
}
