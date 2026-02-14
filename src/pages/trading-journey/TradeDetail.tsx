/**
 * TradeDetail - Comprehensive trade detail page with professional layout
 * Supports both DB trades (UUID) and live Binance positions (binance-SYMBOL)
 * Layout: Header → Key Metrics Strip → 3-col Grid → Full-width sections
 */
import { useMemo, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { useBinancePositions } from "@/features/binance";
import type { BinancePosition } from "@/features/binance/types";
import { CryptoIcon } from "@/components/ui/crypto-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TradeStateBadge } from "@/components/ui/trade-state-badge";
import { TradeRatingBadge } from "@/components/ui/trade-rating-badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { TradeEnrichmentDrawer } from "@/components/journal";
import type { UnifiedPosition } from "@/components/journal";
import type { TradeEntry, TradeScreenshot } from "@/hooks/use-trade-entries";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Pencil,
  Wifi,
  FileText,
  Clock,
  Target,
  Brain,
  Tag,
  Image as ImageIcon,
  ChevronDown,
  DollarSign,
  Layers,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Activity,
} from "lucide-react";
import { format } from "date-fns";

// --- Helpers ---

/** Safe number formatting that handles strings, null, undefined */
function safeFixed(val: unknown, digits = 2): string | undefined {
  if (val === null || val === undefined) return undefined;
  const n = typeof val === 'string' ? parseFloat(val) : val;
  if (typeof n !== 'number' || isNaN(n)) return undefined;
  return n.toFixed(digits);
}

function KeyMetric({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="text-center space-y-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`text-sm font-semibold font-mono ${className || ''}`}>{value ?? '-'}</p>
    </div>
  );
}

function DetailRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex justify-between items-start py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right max-w-[60%] ${className || ''}`}>{value ?? '-'}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children, className }: { title: string; icon: React.ElementType; children: React.ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">{children}</CardContent>
    </Card>
  );
}

function formatHoldTime(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return '-';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h ${minutes % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function formatDatetime(dt: string | null | undefined): string {
  if (!dt) return '-';
  try {
    return format(new Date(dt), 'dd MMM yyyy, HH:mm');
  } catch {
    return '-';
  }
}

/** Check if any value has content. Treats 0 as valid content. */
function hasContent(...values: unknown[]): boolean {
  return values.some(v => v !== null && v !== undefined && v !== '');
}

// --- Main Component ---

export default function TradeDetail() {
  const { tradeId } = useParams<{ tradeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { format: formatCurrency, formatPnl } = useCurrencyConversion();
  const [enrichDrawerOpen, setEnrichDrawerOpen] = useState(false);
  const queryClient = useQueryClient();

  const isBinancePosition = tradeId?.startsWith('binance-') ?? false;
  const binanceSymbol = isBinancePosition ? tradeId!.replace('binance-', '') : null;

  const { data: binancePositions = [], isLoading: binanceLoading } = useBinancePositions();

  // DB trade query (for Paper/closed trades)
  const { data: dbTrade, isLoading: dbLoading } = useQuery({
    queryKey: ["trade-detail", tradeId],
    queryFn: async () => {
      if (!user?.id || !tradeId) return null;
      const { data, error } = await supabase
        .from("trade_entries")
        .select("*")
        .eq("id", tradeId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const { data: stratLinks } = await supabase
        .from("trade_entry_strategies")
        .select("trading_strategies(*)")
        .eq("trade_entry_id", tradeId);

      const strategies = stratLinks?.map((s: any) => s.trading_strategies).filter(Boolean) || [];

      return {
        ...data,
        screenshots: (data.screenshots as unknown) as TradeScreenshot[] | null,
        market_context: (data.market_context as unknown) as Record<string, unknown> | null,
        rule_compliance: (data.rule_compliance as unknown) as Record<string, boolean> | null,
        post_trade_analysis: (data.post_trade_analysis as unknown) as Record<string, any> | null,
        strategies,
      } as TradeEntry & { post_trade_analysis: Record<string, any> | null };
    },
    enabled: !!user?.id && !!tradeId && !isBinancePosition,
  });

  // Enrichment data for Binance positions (stored in trade_entries via enrichment drawer)
  const { data: binanceEnrichment } = useQuery({
    queryKey: ["trade-enrichment-binance", binanceSymbol],
    queryFn: async () => {
      if (!user?.id || !binanceSymbol) return null;
      const { data, error } = await supabase
        .from("trade_entries")
        .select("*")
        .eq("binance_trade_id", `binance-${binanceSymbol}`)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return null;
      if (!data) return null;

      const { data: stratLinks } = await supabase
        .from("trade_entry_strategies")
        .select("trading_strategies(*)")
        .eq("trade_entry_id", data.id);

      const strategies = stratLinks?.map((s: any) => s.trading_strategies).filter(Boolean) || [];

      return {
        ...data,
        screenshots: (data.screenshots as unknown) as TradeScreenshot[] | null,
        rule_compliance: (data.rule_compliance as unknown) as Record<string, boolean> | null,
        post_trade_analysis: (data.post_trade_analysis as unknown) as Record<string, any> | null,
        strategies,
      };
    },
    enabled: isBinancePosition && !!user?.id && !!binanceSymbol,
  });

  const binanceTrade = useMemo(() => {
    if (!isBinancePosition || !binanceSymbol) return null;
    const pos = binancePositions.find((p: BinancePosition) => p.symbol === binanceSymbol);
    if (!pos) return null;

    const base: any = {
      id: `binance-${pos.symbol}`,
      pair: pos.symbol,
      direction: pos.positionAmt >= 0 ? 'LONG' : 'SHORT',
      entry_price: pos.entryPrice,
      exit_price: null, stop_loss: null, take_profit: null,
      quantity: Math.abs(pos.positionAmt),
      pnl: pos.unrealizedProfit,
      commission: 0, fees: 0, funding_fees: 0,
      leverage: pos.leverage, margin_type: pos.marginType,
      source: 'binance', trade_mode: 'live', trade_state: 'active',
      trade_rating: null, trade_style: null,
      trade_date: new Date().toISOString(),
      entry_datetime: null, exit_datetime: null, hold_time_minutes: null,
      session: null, entry_signal: null, market_condition: null,
      confluence_score: null, entry_order_type: null, exit_order_type: null,
      ai_quality_score: null, ai_confidence: null,
      bias_timeframe: null, execution_timeframe: null, precision_timeframe: null, chart_timeframe: null,
      emotional_state: null, notes: null, lesson_learned: null,
      rule_compliance: null, tags: null,
      screenshots: [] as TradeScreenshot[],
      market_context: null, post_trade_analysis: null, strategies: [],
      result: null, r_multiple: null, max_adverse_excursion: null,
      binance_trade_id: null, binance_order_id: null, trading_account_id: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      status: 'open', user_id: user?.id || '',
      realized_pnl: null,
      _markPrice: pos.markPrice,
      _liquidationPrice: pos.liquidationPrice,
    };

    // Merge enrichment data if available
    if (binanceEnrichment) {
      base.notes = binanceEnrichment.notes;
      base.emotional_state = binanceEnrichment.emotional_state;
      base.tags = binanceEnrichment.tags;
      base.screenshots = binanceEnrichment.screenshots || [];
      base.strategies = (binanceEnrichment as any).strategies || [];
      base.entry_signal = binanceEnrichment.entry_signal;
      base.market_condition = binanceEnrichment.market_condition;
      base.confluence_score = binanceEnrichment.confluence_score;
      base.bias_timeframe = binanceEnrichment.bias_timeframe;
      base.execution_timeframe = binanceEnrichment.execution_timeframe;
      base.precision_timeframe = binanceEnrichment.precision_timeframe;
      base.chart_timeframe = binanceEnrichment.chart_timeframe;
      base.trade_rating = binanceEnrichment.trade_rating;
      base.trade_style = binanceEnrichment.trade_style;
      base.lesson_learned = binanceEnrichment.lesson_learned;
      base.rule_compliance = (binanceEnrichment.rule_compliance as unknown) as Record<string, boolean> | null;
      base.post_trade_analysis = (binanceEnrichment as any).post_trade_analysis;
      base.ai_quality_score = binanceEnrichment.ai_quality_score;
      base.ai_confidence = binanceEnrichment.ai_confidence;
      base.stop_loss = binanceEnrichment.stop_loss;
      base.take_profit = binanceEnrichment.take_profit;
      base.entry_order_type = binanceEnrichment.entry_order_type;
      base.exit_order_type = binanceEnrichment.exit_order_type;
      base.r_multiple = binanceEnrichment.r_multiple;
      base.max_adverse_excursion = binanceEnrichment.max_adverse_excursion;
    }

    return base;
  }, [isBinancePosition, binanceSymbol, binancePositions, user?.id, binanceEnrichment]);

  const trade = isBinancePosition ? binanceTrade : dbTrade;
  const isLoading = isBinancePosition ? binanceLoading : dbLoading;
  const isReadOnly = trade?.source === 'binance' || trade?.trade_mode === 'live' || isBinancePosition;

  // Set page title
  useEffect(() => {
    if (trade) {
      document.title = `${trade.pair} ${trade.direction} - Trade Detail`;
    }
    return () => { document.title = 'Trading Journal'; };
  }, [trade?.pair, trade?.direction]);

  const enrichmentPosition: UnifiedPosition | null = useMemo(() => {
    if (!trade) return null;
    return {
      id: trade.id, source: trade.source === 'binance' ? 'binance' : 'paper',
      symbol: trade.pair, direction: trade.direction as 'LONG' | 'SHORT',
      entryPrice: trade.entry_price, currentPrice: trade.exit_price || trade.entry_price,
      quantity: trade.quantity, unrealizedPnL: trade.pnl || 0,
      tradeState: trade.trade_state, tradeRating: trade.trade_rating,
      fees: (trade.commission || 0) + (trade.fees || 0),
      fundingFees: (trade as any).funding_fees || 0,
      entryDatetime: (trade as any).entry_datetime || trade.created_at,
      isReadOnly: !!isReadOnly, originalData: trade,
    };
  }, [trade, isReadOnly]);

  const handleEnrichmentSaved = () => {
    if (isBinancePosition) {
      queryClient.invalidateQueries({ queryKey: ["trade-enrichment-binance", binanceSymbol] });
    } else {
      queryClient.invalidateQueries({ queryKey: ["trade-detail", tradeId] });
    }
  };

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  // --- Not found ---
  if (!trade) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground">Trade not found or access denied.</p>
        <Button variant="outline" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/trading')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
        </Button>
      </div>
    );
  }

  const pnlValue = trade.realized_pnl ?? trade.pnl ?? 0;
  const totalFees = (trade.commission || 0) + (trade.fees || 0) + ((trade as any).funding_fees || 0);
  const netPnl = pnlValue - totalFees;
  const isPaper = trade.source !== 'binance' && trade.trade_mode !== 'live';
  const postAnalysis = trade.post_trade_analysis as Record<string, any> | null;
  const ruleCompliance = trade.rule_compliance as Record<string, boolean> | null;
  const screenshots = trade.screenshots || [];

  const hasTimingData = hasContent(trade.entry_datetime, trade.exit_datetime, (trade as any).hold_time_minutes, (trade as any).session);
  const hasTimeframeData = hasContent(trade.bias_timeframe, trade.execution_timeframe, (trade as any).precision_timeframe);
  const hasStrategyData = hasContent(trade.entry_signal, trade.market_condition, trade.confluence_score) || (trade.strategies?.length > 0);
  const hasJournalData = hasContent(trade.emotional_state, trade.notes, trade.lesson_learned) || (trade.tags?.length > 0) || (ruleCompliance && Object.keys(ruleCompliance).length > 0);
  const hasAnyEnrichment = hasStrategyData || hasJournalData || hasTimeframeData || screenshots.length > 0;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ===== HEADER ===== */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/trading')} className="mt-0.5">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CryptoIcon symbol={trade.pair} size={32} className="mt-1" />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{trade.pair}</h1>
              <Badge
                variant="outline"
                className={trade.direction === 'LONG' ? 'text-profit border-profit/30' : 'text-loss border-loss/30'}
              >
                {trade.direction === 'LONG' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {trade.direction}
              </Badge>
              <Badge variant={isPaper ? "secondary" : "default"} className="gap-1 text-xs">
                {isPaper ? <><FileText className="h-3 w-3" /> Paper</> : <><Wifi className="h-3 w-3" /> Live</>}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <TradeStateBadge state={trade.trade_state} />
              <TradeRatingBadge rating={trade.trade_rating} />
              {(trade as any).trade_style && <Badge variant="outline" className="text-xs">{(trade as any).trade_style}</Badge>}
            </div>
          </div>
        </div>

        {/* P&L + Actions */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Net P&L</p>
            <p className={`text-2xl font-bold font-mono ${netPnl >= 0 ? 'text-profit' : 'text-loss'}`}>
              {formatPnl(netPnl)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEnrichDrawerOpen(true)}>
              <BookOpen className="h-4 w-4 mr-1" /> {isReadOnly ? 'Enrich' : 'Edit / Enrich'}
            </Button>
          </div>
        </div>
      </div>

      {/* ===== KEY METRICS STRIP ===== */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <KeyMetric label="Entry" value={safeFixed(trade.entry_price, 2)} />
            <KeyMetric label="Exit" value={safeFixed(trade.exit_price, 2)} />
            <KeyMetric label="Size" value={safeFixed(trade.quantity, 4)} />
            <KeyMetric label="Leverage" value={(trade as any).leverage ? `${(trade as any).leverage}x` : undefined} />
            <KeyMetric label="R-Multiple" value={safeFixed((trade as any).r_multiple, 2)} />
            <KeyMetric
              label="Gross P&L"
              value={formatPnl(pnlValue)}
              className={pnlValue >= 0 ? 'text-profit' : 'text-loss'}
            />
          </div>
        </CardContent>
      </Card>

      {/* ===== ENRICHMENT CTA (for unenriched positions) ===== */}
      {isBinancePosition && !hasAnyEnrichment && (
        <Card className="border-dashed border-primary/30 bg-primary/5">
          <CardContent className="py-6 text-center space-y-3">
            <BookOpen className="h-8 w-8 text-primary mx-auto" />
            <div>
              <p className="font-medium">This position hasn't been enriched yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add journal notes, strategies, and screenshots to improve your analysis.
              </p>
            </div>
            <Button onClick={() => setEnrichDrawerOpen(true)} className="gap-2">
              <BookOpen className="h-4 w-4" /> Enrich Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ===== MAIN CONTENT GRID ===== */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Left column (2/3) */}
        <div className="md:col-span-2 space-y-4">
          {/* Price & Performance */}
          <SectionCard title="Price & Performance" icon={DollarSign}>
            <div className="grid grid-cols-2 gap-x-6">
              <DetailRow label="Entry Price" value={safeFixed(trade.entry_price, 4)} />
              <DetailRow label="Exit Price" value={safeFixed(trade.exit_price, 4)} />
              <DetailRow label="Stop Loss" value={safeFixed(trade.stop_loss, 4)} />
              <DetailRow label="Take Profit" value={safeFixed(trade.take_profit, 4)} />
            </div>
            <div className="border-t border-border mt-3 pt-3">
              <div className="grid grid-cols-2 gap-x-6">
                <DetailRow label="Gross P&L" value={formatPnl(pnlValue)} className={pnlValue >= 0 ? 'text-profit' : 'text-loss'} />
                <DetailRow label="Net P&L" value={formatPnl(netPnl)} className={netPnl >= 0 ? 'text-profit' : 'text-loss'} />
                <DetailRow label="Commission" value={hasContent(trade.commission) ? formatCurrency(trade.commission!) : undefined} />
                <DetailRow label="Fees" value={hasContent(trade.fees) ? formatCurrency(trade.fees!) : undefined} />
                <DetailRow label="Funding Fees" value={hasContent((trade as any).funding_fees) ? formatCurrency((trade as any).funding_fees) : undefined} />
                <DetailRow label="MAE" value={safeFixed((trade as any).max_adverse_excursion, 4)} />
              </div>
            </div>
            {trade.result && (
              <div className="border-t border-border mt-3 pt-3">
                <DetailRow label="Result" value={<Badge variant="outline" className="text-xs">{trade.result}</Badge>} />
              </div>
            )}
          </SectionCard>

          {/* Live Position Data (Binance only) */}
          {isBinancePosition && (trade._markPrice || trade._liquidationPrice) && (
            <SectionCard title="Live Position Data" icon={Activity}>
              <div className="grid grid-cols-2 gap-x-6">
                <DetailRow label="Mark Price" value={safeFixed(trade._markPrice, 4)} />
                <DetailRow label="Liq. Price" value={safeFixed(trade._liquidationPrice, 4)} />
                <DetailRow label="Margin Type" value={(trade as any).margin_type} />
                <DetailRow label="Leverage" value={(trade as any).leverage ? `${(trade as any).leverage}x` : undefined} />
              </div>
            </SectionCard>
          )}

          {/* Timing */}
          {hasTimingData && (
            <SectionCard title="Timing" icon={Clock}>
              <div className="grid grid-cols-2 gap-x-6">
                <DetailRow label="Trade Date" value={formatDatetime(trade.trade_date)} />
                <DetailRow label="Session" value={(trade as any).session} />
                <DetailRow label="Entry Time" value={formatDatetime((trade as any).entry_datetime)} />
                <DetailRow label="Exit Time" value={formatDatetime((trade as any).exit_datetime)} />
                <DetailRow label="Hold Time" value={formatHoldTime((trade as any).hold_time_minutes)} />
              </div>
            </SectionCard>
          )}

          {/* Timeframe Analysis */}
          {hasTimeframeData && (
            <SectionCard title="Timeframe Analysis" icon={Layers}>
              <div className="grid grid-cols-2 gap-x-6">
                <DetailRow label="Bias (HTF)" value={trade.bias_timeframe} />
                <DetailRow label="Execution" value={trade.execution_timeframe} />
                <DetailRow label="Precision (LTF)" value={(trade as any).precision_timeframe} />
                <DetailRow label="Chart TF" value={trade.chart_timeframe} />
              </div>
            </SectionCard>
          )}
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-4">
          {/* Strategy & Setup */}
          {hasStrategyData && (
            <SectionCard title="Strategy & Setup" icon={Target}>
              {trade.strategies && trade.strategies.length > 0 && (
                <div className="pb-2">
                  <p className="text-xs text-muted-foreground mb-1.5">Strategies</p>
                  <div className="flex flex-wrap gap-1">
                    {trade.strategies.map((s: any) => (
                      <Badge key={s.id} variant="outline" className="text-xs" style={{ borderColor: s.color || undefined }}>{s.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <DetailRow label="Entry Signal" value={trade.entry_signal} />
              <DetailRow label="Market Condition" value={trade.market_condition} />
              <DetailRow label="Confluence" value={trade.confluence_score?.toString()} />
              <DetailRow label="Entry Order" value={(trade as any).entry_order_type} />
              <DetailRow label="Exit Order" value={(trade as any).exit_order_type} />
              {hasContent(trade.ai_quality_score, trade.ai_confidence) && (
                <div className="border-t border-border mt-2 pt-2">
                  <DetailRow label="AI Quality" value={safeFixed(trade.ai_quality_score, 0)} />
                  <DetailRow label="AI Confidence" value={trade.ai_confidence ? `${safeFixed(trade.ai_confidence, 0)}%` : undefined} />
                </div>
              )}
            </SectionCard>
          )}

          {/* Journal Enrichment */}
          {hasJournalData && (
            <SectionCard title="Journal" icon={MessageSquare}>
              {trade.emotional_state && <DetailRow label="Emotion" value={trade.emotional_state} />}
              {trade.notes && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm bg-muted/50 rounded-md p-2 whitespace-pre-wrap">{trade.notes}</p>
                </div>
              )}
              {trade.lesson_learned && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Lesson Learned</p>
                  <p className="text-sm bg-muted/50 rounded-md p-2 whitespace-pre-wrap">{trade.lesson_learned}</p>
                </div>
              )}
              {ruleCompliance && Object.keys(ruleCompliance).length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Rule Compliance</p>
                  <div className="space-y-1">
                    {Object.entries(ruleCompliance).map(([rule, passed]) => (
                      <div key={rule} className="flex items-center gap-2 text-sm">
                        {passed ? <CheckCircle2 className="h-3.5 w-3.5 text-profit" /> : <XCircle className="h-3.5 w-3.5 text-loss" />}
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {trade.tags && trade.tags.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {trade.tags.map((tag: string) => <Badge key={tag} variant="secondary" className="text-xs"><Tag className="h-3 w-3 mr-1" />{tag}</Badge>)}
                  </div>
                </div>
              )}
            </SectionCard>
          )}
        </div>
      </div>

      {/* ===== FULL-WIDTH SECTIONS ===== */}

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <SectionCard title={`Screenshots (${screenshots.length})`} icon={ImageIcon}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {screenshots.map((ss: TradeScreenshot, i: number) => (
              <a key={i} href={ss.url} target="_blank" rel="noopener noreferrer" className="block rounded-md overflow-hidden border hover:ring-2 hover:ring-primary/50 transition-shadow">
                <img src={ss.url} alt={`Screenshot ${i + 1}`} className="w-full aspect-video object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        </SectionCard>
      )}

      {/* AI Post-Trade Analysis */}
      {postAnalysis && (
        <SectionCard title="AI Post-Trade Analysis" icon={Brain}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6">
            {postAnalysis.entry_timing && <DetailRow label="Entry Timing" value={postAnalysis.entry_timing} />}
            {postAnalysis.exit_efficiency && <DetailRow label="Exit Efficiency" value={postAnalysis.exit_efficiency} />}
            {postAnalysis.sl_placement && <DetailRow label="SL Placement" value={postAnalysis.sl_placement} />}
            {postAnalysis.strategy_adherence && <DetailRow label="Strategy Adherence" value={postAnalysis.strategy_adherence} />}
          </div>
          {postAnalysis.ai_review && (
            <div className="pt-3 border-t border-border mt-3">
              <p className="text-xs text-muted-foreground mb-1">AI Review</p>
              <p className="text-sm bg-muted/50 rounded-md p-3 whitespace-pre-wrap">{postAnalysis.ai_review}</p>
            </div>
          )}
          {postAnalysis.what_worked?.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-1">What Worked</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">{postAnalysis.what_worked.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}
          {postAnalysis.what_to_improve?.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-1">What to Improve</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">{postAnalysis.what_to_improve.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}
          {postAnalysis.follow_up_actions?.length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-1">Follow-up Actions</p>
              <ul className="list-disc list-inside text-sm space-y-0.5">{postAnalysis.follow_up_actions.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
            </div>
          )}
        </SectionCard>
      )}

      {/* Metadata - Collapsible */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
            <span className="text-sm">Metadata & IDs</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="mt-2">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-x-6">
                <DetailRow label="Trade ID" value={<span className="font-mono text-xs">{trade.id.slice(0, 8)}...</span>} />
                <DetailRow label="Source" value={trade.source} />
                <DetailRow label="Trade Mode" value={trade.trade_mode} />
                <DetailRow label="Account ID" value={trade.trading_account_id ? <span className="font-mono text-xs">{trade.trading_account_id.slice(0, 8)}...</span> : undefined} />
                {trade.binance_trade_id && <DetailRow label="Binance Trade ID" value={trade.binance_trade_id} />}
                {trade.binance_order_id && <DetailRow label="Binance Order ID" value={trade.binance_order_id.toString()} />}
                <DetailRow label="Created" value={formatDatetime(trade.created_at)} />
                <DetailRow label="Updated" value={formatDatetime(trade.updated_at)} />
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      {/* Enrichment Drawer */}
      <TradeEnrichmentDrawer
        position={enrichmentPosition}
        open={enrichDrawerOpen}
        onOpenChange={setEnrichDrawerOpen}
        onSaved={handleEnrichmentSaved}
      />
    </div>
  );
}
