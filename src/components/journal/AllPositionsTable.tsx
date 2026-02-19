/**
 * AllPositionsTable - Unified view for Binance + Paper positions
 * Shows source badge, allows enrichment via drawer
 * M-01: Added fees/funding and time-in-trade columns
 * M-33: Read-only enforcement for live/Binance trades
 */
import { useState, useEffect, startTransition } from "react";
import { CryptoIcon } from "@/components/ui/crypto-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TradeStateBadge } from "@/components/ui/trade-state-badge";
import { TradeRatingBadge } from "@/components/ui/trade-rating-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Wifi, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  Pencil,
  X,
  Trash2,
  BookOpen,
  Eye,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { TradeEntry } from "@/hooks/use-trade-entries";
import type { BinancePosition } from "@/features/binance/types";
import type { ViewMode } from "@/lib/constants/trade-history";

export interface UnifiedPosition {
  id: string;
  source: 'binance' | 'paper';
  symbol: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice?: number;
  quantity: number;
  unrealizedPnL: number;
  unrealizedPnLPercent?: number;
  leverage?: number;
  tradeState?: string | null;
  tradeRating?: string | null;
  // M-01: fees & time
  fees?: number;
  fundingFees?: number;
  entryDatetime?: string | null;
  // M-33: read-only flag
  isReadOnly: boolean;
  // SL/TP
  stopLoss?: number | null;
  takeProfit?: number | null;
  // Original data for actions
  originalData: TradeEntry | BinancePosition;
}

interface AllPositionsTableProps {
  paperPositions: TradeEntry[];
  binancePositions: BinancePosition[];
  isLoading?: boolean;
  isBinanceConnected: boolean;
  onEnrich: (position: UnifiedPosition) => void;
  onEdit?: (position: TradeEntry) => void;
  onClose?: (position: TradeEntry) => void;
  onDelete?: (position: TradeEntry) => void;
  formatCurrency: (value: number) => string;
  viewMode?: ViewMode;
}

function formatDuration(entryDatetime: string | null | undefined): string {
  if (!entryDatetime) return '-';
  const entryMs = new Date(entryDatetime).getTime();
  if (isNaN(entryMs)) return '-';
  const diffMs = Date.now() - entryMs;
  if (diffMs < 0) return '-';
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function mapToUnifiedPositions(
  paperPositions: TradeEntry[],
  binancePositions: BinancePosition[]
): UnifiedPosition[] {
  const unified: UnifiedPosition[] = [];

  paperPositions.forEach((pos) => {
    const isLiveSource = pos.source === 'binance' || pos.trade_mode === 'live';
    unified.push({
      id: pos.id,
      source: 'paper',
      symbol: pos.pair,
      direction: pos.direction as 'LONG' | 'SHORT',
      entryPrice: pos.entry_price,
      currentPrice: pos.entry_price,
      quantity: pos.quantity,
      unrealizedPnL: pos.pnl || 0,
      tradeState: pos.trade_state || 'active',
      tradeRating: pos.trade_rating || null,
      fees: (pos.commission || 0) + (pos.fees || 0),
      fundingFees: (pos as any).funding_fees || 0,
      entryDatetime: (pos as any).entry_datetime || pos.created_at,
      isReadOnly: isLiveSource,
      stopLoss: pos.stop_loss,
      takeProfit: pos.take_profit,
      originalData: pos,
    });
  });

  binancePositions
    .filter((p) => p.positionAmt !== 0)
    .forEach((pos) => {
      unified.push({
        id: `binance-${pos.symbol}`,
        source: 'binance',
        symbol: pos.symbol,
        direction: pos.positionAmt > 0 ? 'LONG' : 'SHORT',
        entryPrice: pos.entryPrice,
        currentPrice: pos.markPrice,
        quantity: Math.abs(pos.positionAmt),
        unrealizedPnL: pos.unrealizedProfit,
        unrealizedPnLPercent: pos.entryPrice > 0 
          ? (pos.unrealizedProfit / (pos.entryPrice * Math.abs(pos.positionAmt))) * 100 
          : 0,
        leverage: pos.leverage,
        tradeState: 'active',
        fees: 0,
        fundingFees: 0,
        entryDatetime: null,
        isReadOnly: true,
        originalData: pos,
      });
    });

  return unified;
}

function TimeInTrade({ entryDatetime }: { entryDatetime: string | null | undefined }) {
  const [display, setDisplay] = useState(() => formatDuration(entryDatetime));
  useEffect(() => {
    if (!entryDatetime) return;
    const interval = setInterval(() => setDisplay(formatDuration(entryDatetime)), 60000);
    return () => clearInterval(interval);
  }, [entryDatetime]);
  return <span>{display}</span>;
}

// --- Gallery Card ---
function PositionGalleryCard({
  position,
  formatCurrency,
  onClick,
  onClose,
  onEdit,
}: {
  position: UnifiedPosition;
  formatCurrency: (v: number) => string;
  onClick: () => void;
  onClose?: (pos: TradeEntry) => void;
  onEdit?: (pos: TradeEntry) => void;
}) {
  const isPaper = position.source === 'paper';
  const pnlColor = position.unrealizedPnL >= 0 ? 'text-profit' : 'text-loss';
  const canEdit = !position.isReadOnly && isPaper;

  return (
    <Card className="hover:ring-2 hover:ring-primary/30 transition-all p-4 flex flex-col gap-3">
      {/* Top: direction + P&L */}
      <div className="flex items-center justify-between">
        <Badge
          variant="outline"
          className={position.direction === 'LONG' ? 'text-profit border-profit/30' : 'text-loss border-loss/30'}
        >
          {position.direction === 'LONG' ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
          {position.direction}
        </Badge>
        <span className={`text-sm font-bold font-mono ${pnlColor}`}>
          {formatCurrency(position.unrealizedPnL)}
        </span>
      </div>

      {/* Symbol row — clickable to navigate */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={onClick}
      >
        <CryptoIcon symbol={position.symbol} size={24} />
        <span className="font-semibold hover:underline">{position.symbol}</span>
        {position.leverage && (
          <Badge variant="outline" className="text-xs">{position.leverage}x</Badge>
        )}
      </div>

      {/* Key prices */}
      <div className="text-sm text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Entry</span>
          <span className="font-mono">{position.entryPrice.toFixed(4)}</span>
        </div>
        <div className="flex justify-between">
          <span>SL</span>
          <span className="font-mono">{position.stopLoss ? position.stopLoss.toFixed(4) : '-'}</span>
        </div>
        <div className="flex justify-between">
          <span>TP</span>
          <span className="font-mono">{position.takeProfit ? position.takeProfit.toFixed(4) : '-'}</span>
        </div>
      </div>

      {/* Bottom: source + state + actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isPaper ? "secondary" : "default"} className="gap-1 text-xs">
            {isPaper ? <><FileText className="h-3 w-3" /> Paper</> : <><Wifi className="h-3 w-3" /> Live</>}
          </Badge>
          <TradeStateBadge state={position.tradeState} />
          <TradeRatingBadge rating={position.tradeRating} />
        </div>

        {canEdit && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      onClick={(e) => { e.stopPropagation(); onEdit(position.originalData as TradeEntry); }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Edit position</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {onClose && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => { e.stopPropagation(); onClose(position.originalData as TradeEntry); }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent><p>Close position</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

export function AllPositionsTable({
  paperPositions,
  binancePositions,
  isLoading,
  isBinanceConnected,
  onEnrich,
  onEdit,
  onClose,
  onDelete,
  formatCurrency,
  viewMode = 'gallery',
}: AllPositionsTableProps) {
  const navigate = useNavigate();
  const unifiedPositions = mapToUnifiedPositions(paperPositions, binancePositions);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (unifiedPositions.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No open positions"
        description={
          isBinanceConnected
            ? "You have no open positions in Binance or Paper trading."
            : "Start a new trade using the wizard or connect Binance for live positions."
        }
      />
    );
  }

  // Gallery view
  if (viewMode === 'gallery') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {unifiedPositions.map((position) => (
          <PositionGalleryCard
            key={position.id}
            position={position}
            formatCurrency={formatCurrency}
            onClick={() => startTransition(() => navigate(`/trading/${position.id}`))}
            onClose={onClose}
            onEdit={onEdit}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild><TableHead className="w-[100px] cursor-default">Source</TableHead></TooltipTrigger><TooltipContent><p>Data origin: Paper (local) or Binance (exchange)</p></TooltipContent></Tooltip>
            </TooltipProvider>
            <TableHead>Symbol</TableHead>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild><TableHead className="hidden sm:table-cell cursor-default">Direction</TableHead></TooltipTrigger><TooltipContent><p>Long (buy) or Short (sell) position</p></TooltipContent></Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild><TableHead className="hidden sm:table-cell cursor-default">State</TableHead></TooltipTrigger><TooltipContent><p>Lifecycle state of the position (Active, Partially Filled, etc.)</p></TooltipContent></Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild><TableHead className="text-right hidden md:table-cell cursor-default">Entry</TableHead></TooltipTrigger><TooltipContent><p>Price at which the position was opened</p></TooltipContent></Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild><TableHead className="text-right hidden md:table-cell cursor-default">Current</TableHead></TooltipTrigger><TooltipContent><p>Current mark price from exchange or last known price</p></TooltipContent></Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild><TableHead className="text-right hidden lg:table-cell cursor-default">Size</TableHead></TooltipTrigger><TooltipContent><p>Position quantity in base asset units</p></TooltipContent></Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip><TooltipTrigger asChild><TableHead className="text-right cursor-default">P&L</TableHead></TooltipTrigger><TooltipContent><p>Unrealized profit or loss on this open position</p></TooltipContent></Tooltip>
            </TooltipProvider>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {unifiedPositions.map((position) => {
            const isPaper = position.source === 'paper';
            const pnlColor = position.unrealizedPnL >= 0 ? 'text-profit' : 'text-loss';
            const totalFees = (position.fees || 0) + (position.fundingFees || 0);

            return (
              <TableRow key={position.id}>
                <TableCell>
                  <Badge 
                    variant={isPaper ? "secondary" : "default"}
                    className="gap-1"
                  >
                    {isPaper ? (
                      <>
                        <FileText className="h-3 w-3" />
                        Paper
                      </>
                    ) : (
                      <>
                        <Wifi className="h-3 w-3" />
                        Binance
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <CryptoIcon symbol={position.symbol} size={18} />
                    {position.symbol}
                  </div>
                  {position.leverage && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {position.leverage}x
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge 
                    variant="outline"
                    className={position.direction === 'LONG' ? 'text-profit border-profit/30' : 'text-loss border-loss/30'}
                  >
                    {position.direction === 'LONG' ? (
                      <TrendingUp className="h-3 w-3 mr-1" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-1" />
                    )}
                    {position.direction}
                  </Badge>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex items-center gap-1">
                    <TradeStateBadge state={position.tradeState} />
                    <TradeRatingBadge rating={position.tradeRating} />
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono hidden md:table-cell">
                  {position.entryPrice.toFixed(4)}
                </TableCell>
                <TableCell className="text-right font-mono hidden md:table-cell">
                  {position.currentPrice?.toFixed(4) || '-'}
                </TableCell>
                <TableCell className="text-right font-mono hidden lg:table-cell">
                  {position.quantity.toFixed(4)}
                </TableCell>
                <TableCell className={`text-right font-mono ${pnlColor}`}>
                  {formatCurrency(position.unrealizedPnL)}
                  {position.unrealizedPnLPercent !== undefined && (
                    <span className="text-xs ml-1">
                      ({position.unrealizedPnLPercent.toFixed(2)}%)
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => startTransition(() => navigate(`/trading/${position.id}`))}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>View trade detail</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button size="sm" variant="ghost" onClick={() => onEnrich(position)}>
                            <BookOpen className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>Enrich with journal data</p></TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {!position.isReadOnly && (
                      <>
                        {onEdit && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" onClick={() => onEdit(position.originalData as TradeEntry)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Edit position</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {onClose && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" onClick={() => onClose(position.originalData as TradeEntry)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Close position</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {onDelete && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="ghost" className="text-loss hover:text-loss" onClick={() => onDelete(position.originalData as TradeEntry)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent><p>Delete position</p></TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
