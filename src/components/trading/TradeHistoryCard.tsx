/**
 * TradeHistoryCard - Display a single trade entry in the history
 * Enhanced with accessibility, Enrich button for journaling, and market context badges
 */
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar, Tag, Target, MoreVertical, Trash2, Brain, Wifi, Edit3, ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { TradeEntry } from "@/hooks/use-trade-entries";
import { cn } from "@/lib/utils";
import { RiskRewardTooltip, ConfluenceScoreTooltip } from "@/components/ui/info-tooltip";
import { FearGreedBadge, EventDayBadge } from "@/components/market/MarketContextBadge";
import type { UnifiedMarketContext } from "@/types/market-context";

interface TradeHistoryCardProps {
  entry: TradeEntry;
  onDelete: (entry: TradeEntry) => void;
  onEnrich?: (entry: TradeEntry) => void;
  calculateRR: (trade: TradeEntry) => number;
  formatCurrency: (value: number, currency?: string) => string;
  isBinance?: boolean;
  showEnrichButton?: boolean;
}

export function TradeHistoryCard({ 
  entry, 
  onDelete,
  onEnrich,
  calculateRR, 
  formatCurrency,
  isBinance = false,
  showEnrichButton = false,
}: TradeHistoryCardProps) {
  const rr = calculateRR(entry);
  const hasScreenshots = entry.screenshots && Array.isArray(entry.screenshots) && entry.screenshots.length > 0;
  const screenshotCount = hasScreenshots ? entry.screenshots!.length : 0;
  const hasNotes = entry.notes && entry.notes.length > 0;
  
  // Parse market context from trade entry (may be partial or null)
  const rawMarketContext = entry.market_context as unknown;
  const marketContext = rawMarketContext && typeof rawMarketContext === 'object' 
    ? rawMarketContext as Partial<UnifiedMarketContext>
    : null;
  const fearGreedValue = marketContext?.fearGreed?.value;
  const fearGreedLabel = marketContext?.fearGreed?.label;
  const hasHighImpactEvent = marketContext?.events?.hasHighImpactToday;
  const eventName = marketContext?.events?.upcomingEvent?.name;
  
  return (
    <Card className="border-muted">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Badge variant={entry.direction === "LONG" ? "default" : "secondary"} className="text-xs sm:text-sm">
              {entry.direction}
            </Badge>
            <span className="font-bold text-base sm:text-lg">{entry.pair}</span>
            <span className="text-muted-foreground flex items-center gap-1 text-xs sm:text-sm">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">{format(new Date(entry.trade_date), "MMM d, yyyy")}</span>
              <span className="xs:hidden">{format(new Date(entry.trade_date), "MM/dd")}</span>
            </span>
            {/* Source Badge */}
            {isBinance && (
              <Badge variant="outline" className="gap-1 text-xs border-green-500 text-green-500">
                <Wifi className="h-3 w-3" />
                Binance
              </Badge>
            )}
            {/* AI Quality Score Badge */}
            {entry.ai_quality_score !== null && entry.ai_quality_score !== undefined && (
              <Badge 
                variant="outline" 
                className={cn(
                  "gap-1",
                  entry.ai_quality_score >= 80 && "border-green-500 text-green-500",
                  entry.ai_quality_score >= 60 && entry.ai_quality_score < 80 && "border-yellow-500 text-yellow-500",
                  entry.ai_quality_score < 60 && "border-red-500 text-red-500"
                )}
              >
                <Brain className="h-3 w-3" />
                AI: {entry.ai_quality_score}%
              </Badge>
            )}
            {/* Screenshot indicator */}
            {hasScreenshots && (
              <Badge variant="outline" className="gap-1 text-xs">
                <ImageIcon className="h-3 w-3" />
                {screenshotCount}
              </Badge>
            )}
            {/* Market Context Badges */}
            {fearGreedValue !== undefined && (
              <FearGreedBadge value={fearGreedValue} label={fearGreedLabel} />
            )}
            {hasHighImpactEvent && (
              <EventDayBadge eventName={eventName} />
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`font-bold text-lg ${(entry.realized_pnl || 0) >= 0 ? "text-profit" : "text-loss"}`}>
              {(entry.realized_pnl || 0) >= 0 ? "+" : ""}{formatCurrency(entry.realized_pnl || 0, "USD")}
            </span>
            
            {/* Enrich Button */}
            {showEnrichButton && onEnrich && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEnrich(entry)}
                className="gap-1"
                aria-label={`Add journal data for ${entry.pair} trade`}
              >
                <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Journal</span>
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Options for ${entry.pair} trade`}>
                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                  <span className="sr-only">Trade options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEnrich && (
                  <DropdownMenuItem onClick={() => onEnrich(entry)}>
                    <Edit3 className="h-4 w-4 mr-2" aria-hidden="true" />
                    Edit Journal
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => onDelete(entry)} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div><span className="text-muted-foreground">Entry:</span> {formatCurrency(entry.entry_price, "USD")}</div>
          <div><span className="text-muted-foreground">Exit:</span> {entry.exit_price ? formatCurrency(entry.exit_price, "USD") : '-'}</div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">R:R:</span> 
            <RiskRewardTooltip />
            {rr > 0 ? (
              <span>{rr.toFixed(2)}:1</span>
            ) : isBinance && !entry.stop_loss ? (
              <span className="text-muted-foreground text-xs italic">
                Add via Journal
              </span>
            ) : (
              <span>-</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Confluence:</span>
            <ConfluenceScoreTooltip />
            {entry.confluence_score !== null && entry.confluence_score !== undefined ? (
              <Badge variant="outline" className="text-xs">{entry.confluence_score}/5</Badge>
            ) : '-'}
          </div>
          {isBinance && entry.commission !== null && entry.commission !== undefined && (
            <div><span className="text-muted-foreground">Fee:</span> {entry.commission.toFixed(4)} {entry.commission_asset || 'USDT'}</div>
          )}
        </div>
        
        {entry.strategies && entry.strategies.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Target className="h-4 w-4 text-muted-foreground" />
            {entry.strategies.map(strategy => (
              <Badge key={strategy.id} variant="secondary">
                {strategy.name}
              </Badge>
            ))}
          </div>
        )}

        {hasNotes && (
          <p className="text-sm text-muted-foreground line-clamp-2">{entry.notes}</p>
        )}

        {entry.tags && entry.tags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                <Tag className="h-3 w-3 mr-1" />{tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
