/**
 * TradeHistoryCard - Display a single trade entry in the history
 * Enhanced with accessibility, Enrich button for journaling, Quick Note, and market context badges
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Tag, Target, MoreVertical, Trash2, Brain, Wifi, Edit3, ImageIcon, MessageSquarePlus, MessageSquare, Loader2, ExternalLink, Eye } from "lucide-react";
import { TradeStateBadge } from "@/components/ui/trade-state-badge";
import { TradeRatingBadge } from "@/components/ui/trade-rating-badge";
import { format } from "date-fns";
import { TradeEntry } from "@/hooks/use-trade-entries";
import { cn } from "@/lib/utils";
import { RiskRewardTooltip, ConfluenceScoreTooltip, InfoTooltip } from "@/components/ui/info-tooltip";
import { FearGreedBadge, EventDayBadge } from "@/components/market/MarketContextBadge";
import { formatFee } from "@/lib/formatters";
import { CONFLUENCE_SCALE } from "@/lib/constants/trade-history";
import { tradeHasScreenshots, getScreenshotCount, tradeHasNotes, getNotesLineCount, hasMultipleNotes as checkMultipleNotes, hasRecentNoteTimestamp } from "@/lib/trade-utils";
import type { UnifiedMarketContext } from "@/types/market-context";

interface TradeHistoryCardProps {
  entry: TradeEntry;
  onDelete: (entry: TradeEntry) => void;
  onEnrich?: (entry: TradeEntry) => void;
  onQuickNote?: (tradeId: string, note: string) => Promise<void>;
  onTagClick?: (tag: string) => void;
  calculateRR: (trade: TradeEntry) => number;
  formatCurrency: (value: number, currency?: string) => string;
  isBinance?: boolean;
  showEnrichButton?: boolean;
}

export function TradeHistoryCard({ 
  entry, 
  onDelete,
  onEnrich,
  onQuickNote,
  onTagClick,
  calculateRR, 
  formatCurrency,
  isBinance = false,
  showEnrichButton = false,
}: TradeHistoryCardProps) {
  const [isQuickNoteOpen, setIsQuickNoteOpen] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const navigate = useNavigate();

  const rr = calculateRR(entry);
  // Use centralized utility functions
  const hasScreenshots = tradeHasScreenshots(entry);
  const screenshotCount = getScreenshotCount(entry);
  const hasNotes = tradeHasNotes(entry);
  const notesLines = hasNotes ? entry.notes!.split('\n').filter(line => line.trim()) : [];
  const hasMultipleNotes = checkMultipleNotes(entry);
  const hasRecentNote = hasRecentNoteTimestamp(entry);
  
  // Parse market context from trade entry (may be partial or null)
  const rawMarketContext = entry.market_context as unknown;
  const marketContext = rawMarketContext && typeof rawMarketContext === 'object' 
    ? rawMarketContext as Partial<UnifiedMarketContext>
    : null;
  const fearGreedValue = marketContext?.fearGreed?.value;
  const fearGreedLabel = marketContext?.fearGreed?.label;
  const hasHighImpactEvent = marketContext?.events?.hasHighImpactToday;
  const eventName = marketContext?.events?.upcomingEvent?.name;

  const handleQuickNoteSave = async () => {
    if (!quickNote.trim() || !onQuickNote) return;
    setIsSavingNote(true);
    try {
      await onQuickNote(entry.id, quickNote);
      setQuickNote('');
      setIsQuickNoteOpen(false);
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleOpenQuickNote = () => {
    setQuickNote('');
    setIsQuickNoteOpen(true);
  };
  
  return (
    <>
      <Card className="border-muted">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <Badge variant={entry.direction === "LONG" ? "long" : "short"} className="text-xs sm:text-sm">
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
              {/* Solscan Badge for Solana trades */}
              {(entry.source as string) === 'solana' && entry.binance_trade_id && (
                <a
                  href={`https://solscan.io/tx/${entry.binance_trade_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Badge variant="outline" className="gap-1 text-xs border-purple-500 text-purple-500 cursor-pointer hover:bg-purple-500/10">
                    <ExternalLink className="h-3 w-3" />
                    Solscan
                  </Badge>
                </a>
              )}
              {/* Trade State Badge */}
              <TradeStateBadge state={entry.trade_state} />
              {/* Trade Rating Badge */}
              <TradeRatingBadge rating={entry.trade_rating} />
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
              {/* Notes indicator */}
              {hasNotes && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <MessageSquare className="h-3 w-3" />
                  Notes
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
                {(entry.realized_pnl || 0) >= 0 ? "+" : ""}{formatCurrency(entry.realized_pnl || 0)}
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
                  <DropdownMenuItem onClick={() => navigate(`/trading/${entry.id}`)}>
                    <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                    View Detail
                  </DropdownMenuItem>
                  {onQuickNote && (
                    <DropdownMenuItem onClick={handleOpenQuickNote}>
                      <MessageSquarePlus className="h-4 w-4 mr-2" aria-hidden="true" />
                      Quick Note
                    </DropdownMenuItem>
                  )}
                  {onEnrich && (
                    <DropdownMenuItem onClick={() => onEnrich(entry)}>
                      <Edit3 className="h-4 w-4 mr-2" aria-hidden="true" />
                      Edit Journal
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
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
            <div><span className="text-muted-foreground">Entry:</span> {formatCurrency(entry.entry_price)}</div>
            <div><span className="text-muted-foreground">Exit:</span> {entry.exit_price ? formatCurrency(entry.exit_price) : '-'}</div>
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
                <Badge variant="outline" className="text-xs">{CONFLUENCE_SCALE.format(entry.confluence_score)}</Badge>
              ) : '-'}
            </div>
            {/* Fee Display - Improved handling for missing data */}
            {isBinance && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Fee:</span>
                {entry.commission && entry.commission > 0 ? (
                  <span className="font-mono">{formatFee(entry.commission, entry.commission_asset || 'USDT')}</span>
                ) : (
                  <span className="text-muted-foreground text-xs italic flex items-center gap-1">
                    See Summary
                    <InfoTooltip content="Trading fees are aggregated in the Accounts page Financial Summary. Individual trade fees from income sync are not available per-trade." />
                  </span>
                )}
              </div>
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
            <div className="space-y-1">
              <div className={cn(
                "text-sm text-muted-foreground whitespace-pre-line",
                !isNotesExpanded && "line-clamp-2"
              )}>
                {entry.notes}
              </div>
              {hasMultipleNotes && (
                <button
                  type="button"
                  onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                  className="text-xs text-primary hover:underline"
                >
                  {isNotesExpanded ? 'Show less' : `Show more (${notesLines.length} notes)`}
                </button>
              )}
              {hasRecentNote && !isNotesExpanded && (
                <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                  Recently updated
                </Badge>
              )}
            </div>
          )}

          {entry.tags && entry.tags.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {entry.tags.map((tag) => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className={cn("text-xs", onTagClick && "cursor-pointer hover:bg-accent")}
                  onClick={onTagClick ? (e) => { e.stopPropagation(); onTagClick(tag); } : undefined}
                >
                  <Tag className="h-3 w-3 mr-1" />{tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Note Dialog */}
      <Dialog open={isQuickNoteOpen} onOpenChange={setIsQuickNoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquarePlus className="h-5 w-5" />
              Quick Note - {entry.pair} {entry.direction}
            </DialogTitle>
            <DialogDescription>
              Add a quick note to this trade. Notes are automatically timestamped.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="What did you observe? What could you improve?"
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              className="min-h-[100px]"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setIsQuickNoteOpen(false)}
              disabled={isSavingNote}
            >
              Cancel
            </Button>
            <Button
              onClick={handleQuickNoteSave}
              disabled={!quickNote.trim() || isSavingNote}
            >
              {isSavingNote ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Note'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
