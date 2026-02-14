/**
 * TradeDetail - Comprehensive read-only trade detail page
 * Displays all trade data organized into logical sections
 * Mode-agnostic: renders whatever data exists on the trade record
 */
import { useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { CryptoIcon } from "@/components/ui/crypto-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TradeStateBadge } from "@/components/ui/trade-state-badge";
import { TradeRatingBadge } from "@/components/ui/trade-rating-badge";
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
  Calendar,
  Clock,
  Target,
  Brain,
  Shield,
  Tag,
  Image as ImageIcon,
  Info,
  DollarSign,
  BarChart3,
  Layers,
  MessageSquare,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

// --- Helpers ---

function DetailRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className="flex justify-between items-start py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right max-w-[60%] ${className || ''}`}>{value ?? '-'}</span>
    </div>
  );
}

function SectionCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card>
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
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h ${minutes % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function formatDatetime(dt: string | null | undefined): string {
  if (!dt) return '-';
  try {
    return format(new Date(dt), 'dd MMM yyyy, HH:mm:ss');
  } catch {
    return '-';
  }
}

// --- Main Component ---

export default function TradeDetail() {
  const { tradeId } = useParams<{ tradeId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { format: formatCurrency, formatPnl } = useCurrencyConversion();
  const [enrichDrawerOpen, setEnrichDrawerOpen] = useState(false);

  // Fetch single trade with strategies
  const { data: trade, isLoading, error } = useQuery({
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

      // Fetch linked strategies
      const { data: stratLinks } = await supabase
        .from("trade_entry_strategies")
        .select("trading_strategies(*)")
        .eq("trade_entry_id", tradeId);

      const strategies = stratLinks
        ?.map((s: any) => s.trading_strategies)
        .filter(Boolean) || [];

      return {
        ...data,
        screenshots: (data.screenshots as unknown) as TradeScreenshot[] | null,
        market_context: (data.market_context as unknown) as Record<string, unknown> | null,
        rule_compliance: (data.rule_compliance as unknown) as Record<string, boolean> | null,
        post_trade_analysis: (data.post_trade_analysis as unknown) as Record<string, any> | null,
        strategies,
      } as TradeEntry & { post_trade_analysis: Record<string, any> | null };
    },
    enabled: !!user?.id && !!tradeId,
  });

  const isReadOnly = trade?.source === 'binance' || trade?.trade_mode === 'live';

  // Build UnifiedPosition for enrichment drawer
  const enrichmentPosition: UnifiedPosition | null = useMemo(() => {
    if (!trade) return null;
    return {
      id: trade.id,
      source: trade.source === 'binance' ? 'binance' : 'paper',
      symbol: trade.pair,
      direction: trade.direction as 'LONG' | 'SHORT',
      entryPrice: trade.entry_price,
      currentPrice: trade.exit_price || trade.entry_price,
      quantity: trade.quantity,
      unrealizedPnL: trade.pnl || 0,
      tradeState: trade.trade_state,
      tradeRating: trade.trade_rating,
      fees: (trade.commission || 0) + (trade.fees || 0),
      fundingFees: (trade as any).funding_fees || 0,
      entryDatetime: (trade as any).entry_datetime || trade.created_at,
      isReadOnly: !!isReadOnly,
      originalData: trade,
    };
  }, [trade, isReadOnly]);

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6 p-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  // Not found
  if (!trade) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <p className="text-muted-foreground">Trade not found or access denied.</p>
        <Button variant="outline" onClick={() => navigate('/trading')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Journal
        </Button>
      </div>
    );
  }

  const pnlValue = trade.pnl || 0;
  const netPnl = pnlValue - (trade.commission || 0) - (trade.fees || 0) - ((trade as any).funding_fees || 0);
  const isPaper = trade.source !== 'binance' && trade.trade_mode !== 'live';
  const postAnalysis = trade.post_trade_analysis as Record<string, any> | null;
  const ruleCompliance = trade.rule_compliance as Record<string, boolean> | null;
  const screenshots = trade.screenshots || [];
  const marketCtx = trade.market_context as Record<string, unknown> | null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/trading')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CryptoIcon symbol={trade.pair} size={28} />
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              {trade.pair}
              <Badge variant="outline" className={trade.direction === 'LONG' ? 'text-profit border-profit/30' : 'text-loss border-loss/30'}>
                {trade.direction === 'LONG' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {trade.direction}
              </Badge>
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={isPaper ? "secondary" : "default"} className="gap-1 text-xs">
                {isPaper ? <><FileText className="h-3 w-3" /> Paper</> : <><Wifi className="h-3 w-3" /> Live</>}
              </Badge>
              <TradeStateBadge state={trade.trade_state} />
              <TradeRatingBadge rating={trade.trade_rating} />
              {(trade as any).trade_style && <Badge variant="outline" className="text-xs">{(trade as any).trade_style}</Badge>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEnrichDrawerOpen(true)}>
            <BookOpen className="h-4 w-4 mr-1" /> Enrich
          </Button>
          {!isReadOnly && (
            <Button variant="outline" size="sm" onClick={() => navigate('/trading')}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Content Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Section 1: Price & Performance */}
        <SectionCard title="Price & Performance" icon={DollarSign}>
          <DetailRow label="Entry Price" value={trade.entry_price.toFixed(4)} />
          <DetailRow label="Exit Price" value={trade.exit_price?.toFixed(4)} />
          <DetailRow label="Stop Loss" value={trade.stop_loss?.toFixed(4)} />
          <DetailRow label="Take Profit" value={trade.take_profit?.toFixed(4)} />
          <Separator className="my-2" />
          <DetailRow label="Quantity" value={trade.quantity.toFixed(4)} />
          <DetailRow label="Leverage" value={(trade as any).leverage ? `${(trade as any).leverage}x` : undefined} />
          <DetailRow label="Margin Type" value={(trade as any).margin_type} />
          <Separator className="my-2" />
          <DetailRow label="Gross P&L" value={formatPnl(pnlValue)} className={pnlValue >= 0 ? 'text-profit' : 'text-loss'} />
          <DetailRow label="Commission" value={trade.commission ? formatCurrency(trade.commission) : undefined} />
          <DetailRow label="Fees" value={trade.fees ? formatCurrency(trade.fees) : undefined} />
          <DetailRow label="Funding Fees" value={(trade as any).funding_fees ? formatCurrency((trade as any).funding_fees) : undefined} />
          <DetailRow label="Net P&L" value={formatPnl(netPnl)} className={netPnl >= 0 ? 'text-profit' : 'text-loss'} />
          <Separator className="my-2" />
          <DetailRow label="R-Multiple" value={(trade as any).r_multiple?.toFixed(2)} />
          <DetailRow label="MAE" value={(trade as any).max_adverse_excursion?.toFixed(4)} />
          <DetailRow label="Result" value={trade.result ? <Badge variant="outline" className="text-xs">{trade.result}</Badge> : undefined} />
        </SectionCard>

        {/* Section 2: Timing */}
        <SectionCard title="Timing" icon={Clock}>
          <DetailRow label="Trade Date" value={formatDatetime(trade.trade_date)} />
          <DetailRow label="Entry Time" value={formatDatetime((trade as any).entry_datetime)} />
          <DetailRow label="Exit Time" value={formatDatetime((trade as any).exit_datetime)} />
          <DetailRow label="Hold Time" value={formatHoldTime((trade as any).hold_time_minutes)} />
          <DetailRow label="Session" value={(trade as any).session} />
        </SectionCard>

        {/* Section 3: Strategy & Setup */}
        <SectionCard title="Strategy & Setup" icon={Target}>
          <DetailRow label="Linked Strategies" value={
            trade.strategies && trade.strategies.length > 0
              ? <div className="flex flex-wrap gap-1 justify-end">{trade.strategies.map(s => <Badge key={s.id} variant="outline" className="text-xs" style={{ borderColor: s.color || undefined }}>{s.name}</Badge>)}</div>
              : undefined
          } />
          <DetailRow label="Entry Signal" value={trade.entry_signal} />
          <DetailRow label="Market Condition" value={trade.market_condition} />
          <DetailRow label="Confluence Score" value={trade.confluence_score?.toString()} />
          <DetailRow label="Entry Order" value={(trade as any).entry_order_type} />
          <DetailRow label="Exit Order" value={(trade as any).exit_order_type} />
          <Separator className="my-2" />
          <DetailRow label="AI Quality" value={trade.ai_quality_score?.toFixed(0)} />
          <DetailRow label="AI Confidence" value={trade.ai_confidence ? `${trade.ai_confidence.toFixed(0)}%` : undefined} />
        </SectionCard>

        {/* Section 4: Timeframe Analysis */}
        <SectionCard title="Timeframe Analysis" icon={Layers}>
          <DetailRow label="Bias (HTF)" value={trade.bias_timeframe} />
          <DetailRow label="Execution" value={trade.execution_timeframe} />
          <DetailRow label="Precision (LTF)" value={(trade as any).precision_timeframe} />
          <DetailRow label="Chart TF (legacy)" value={trade.chart_timeframe} />
        </SectionCard>

        {/* Section 5: Journal Enrichment */}
        <SectionCard title="Journal Enrichment" icon={MessageSquare}>
          <DetailRow label="Emotional State" value={trade.emotional_state} />
          {trade.notes && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-1">Notes</p>
              <p className="text-sm bg-muted/50 rounded-md p-2 whitespace-pre-wrap">{trade.notes}</p>
            </div>
          )}
          {trade.lesson_learned && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-1">Lesson Learned</p>
              <p className="text-sm bg-muted/50 rounded-md p-2 whitespace-pre-wrap">{trade.lesson_learned}</p>
            </div>
          )}
          {ruleCompliance && Object.keys(ruleCompliance).length > 0 && (
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-1">Rule Compliance</p>
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
              <p className="text-sm text-muted-foreground mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {trade.tags.map(tag => <Badge key={tag} variant="secondary" className="text-xs"><Tag className="h-3 w-3 mr-1" />{tag}</Badge>)}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Section 6: Screenshots */}
        {screenshots.length > 0 && (
          <SectionCard title={`Screenshots (${screenshots.length})`} icon={ImageIcon}>
            <div className="grid grid-cols-2 gap-2">
              {screenshots.map((ss, i) => (
                <a key={i} href={ss.url} target="_blank" rel="noopener noreferrer" className="block rounded-md overflow-hidden border hover:ring-2 hover:ring-primary/50 transition-shadow">
                  <img src={ss.url} alt={`Screenshot ${i + 1}`} className="w-full h-24 object-cover" loading="lazy" />
                </a>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Section 7: AI Post-Trade Analysis */}
        {postAnalysis && (
          <SectionCard title="AI Post-Trade Analysis" icon={Brain}>
            {postAnalysis.entry_timing && <DetailRow label="Entry Timing" value={postAnalysis.entry_timing} />}
            {postAnalysis.exit_efficiency && <DetailRow label="Exit Efficiency" value={postAnalysis.exit_efficiency} />}
            {postAnalysis.sl_placement && <DetailRow label="SL Placement" value={postAnalysis.sl_placement} />}
            {postAnalysis.strategy_adherence && <DetailRow label="Strategy Adherence" value={postAnalysis.strategy_adherence} />}
            {postAnalysis.ai_review && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-1">AI Review</p>
                <p className="text-sm bg-muted/50 rounded-md p-2 whitespace-pre-wrap">{postAnalysis.ai_review}</p>
              </div>
            )}
            {postAnalysis.what_worked?.length > 0 && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-1">What Worked</p>
                <ul className="list-disc list-inside text-sm space-y-0.5">{postAnalysis.what_worked.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
            {postAnalysis.what_to_improve?.length > 0 && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-1">What to Improve</p>
                <ul className="list-disc list-inside text-sm space-y-0.5">{postAnalysis.what_to_improve.map((w: string, i: number) => <li key={i}>{w}</li>)}</ul>
              </div>
            )}
            {postAnalysis.follow_up_actions?.length > 0 && (
              <div className="pt-2">
                <p className="text-sm text-muted-foreground mb-1">Follow-up Actions</p>
                <ul className="list-disc list-inside text-sm space-y-0.5">{postAnalysis.follow_up_actions.map((a: string, i: number) => <li key={i}>{a}</li>)}</ul>
              </div>
            )}
          </SectionCard>
        )}

        {/* Section 8: Market Context */}
        {marketCtx && Object.keys(marketCtx).length > 0 && (
          <SectionCard title="Market Context" icon={BarChart3}>
            {Object.entries(marketCtx).map(([key, val]) => (
              <DetailRow key={key} label={key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-')} />
            ))}
          </SectionCard>
        )}

        {/* Section 9: Metadata */}
        <SectionCard title="Metadata" icon={Info}>
          <DetailRow label="Trade ID" value={<span className="font-mono text-xs">{trade.id.slice(0, 8)}...</span>} />
          <DetailRow label="Source" value={trade.source} />
          <DetailRow label="Trade Mode" value={trade.trade_mode} />
          <DetailRow label="Account ID" value={trade.trading_account_id ? <span className="font-mono text-xs">{trade.trading_account_id.slice(0, 8)}...</span> : undefined} />
          {trade.binance_trade_id && <DetailRow label="Binance Trade ID" value={trade.binance_trade_id} />}
          {trade.binance_order_id && <DetailRow label="Binance Order ID" value={trade.binance_order_id.toString()} />}
          <Separator className="my-2" />
          <DetailRow label="Created" value={formatDatetime(trade.created_at)} />
          <DetailRow label="Updated" value={formatDatetime(trade.updated_at)} />
        </SectionCard>
      </div>

      {/* Enrichment Drawer */}
      <TradeEnrichmentDrawer
        position={enrichmentPosition}
        open={enrichDrawerOpen}
        onOpenChange={setEnrichDrawerOpen}
      />
    </div>
  );
}
