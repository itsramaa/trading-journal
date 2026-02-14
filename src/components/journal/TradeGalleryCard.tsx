/**
 * TradeGalleryCard - Visual card for gallery view with thumbnail support
 * Optimized for image-first display with lazy loading
 * Now includes "Needs Enrichment" indicator for incomplete Binance trades
 */
import { forwardRef } from "react";
import { format } from "date-fns";
import { ImageOff, AlertCircle } from "lucide-react";
import { CryptoIcon } from "@/components/ui/crypto-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LazyImage } from "@/components/ui/lazy-image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import { tradeNeedsEnrichment, tradeHasScreenshots, getThumbnailUrl, isTradeProfit, isTradeLoss, getDirectionBadgeVariant, getDirectionDisplay } from "@/lib/trade-utils";
import type { TradeEntry } from "@/hooks/use-trade-entries";

interface TradeGalleryCardProps {
  trade: TradeEntry;
  onTradeClick: (trade: TradeEntry) => void;
}

export const TradeGalleryCard = forwardRef<HTMLDivElement, TradeGalleryCardProps>(
  function TradeGalleryCard({ trade, onTradeClick }, ref) {
    const { formatPnl } = useCurrencyConversion();
    
    const hasScreenshots = tradeHasScreenshots(trade);
    const thumbnailUrl = getThumbnailUrl(trade);
    const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
    const isProfit = isTradeProfit(pnl);
    const isLoss = isTradeLoss(pnl);
    const needsEnrichment = tradeNeedsEnrichment(trade);
    
    return (
      <Card 
        ref={ref}
        className="cursor-pointer hover:border-primary transition-colors overflow-hidden group"
        onClick={() => onTradeClick(trade)}
      >
      {/* Thumbnail Section */}
      <div className="aspect-video bg-muted relative overflow-hidden">
        {thumbnailUrl ? (
          <LazyImage 
            src={thumbnailUrl} 
            alt={`${trade.pair} chart`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            containerClassName="w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}
        
        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          <Badge 
            variant={trade.direction === 'LONG' ? 'long' : trade.direction === 'UNKNOWN' ? 'outline' : 'short'}
            className={`text-xs ${trade.direction === 'UNKNOWN' ? 'bg-muted/80 text-muted-foreground' : ''}`}
          >
            {trade.direction === 'UNKNOWN' ? '?' : trade.direction}
          </Badge>
          
          {/* Needs Enrichment indicator */}
          {needsEnrichment && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="destructive" className="text-xs px-1.5 gap-0.5">
                    <AlertCircle className="h-3 w-3" />
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Missing entry/exit prices. Click "Enrich Trades" to fetch accurate data.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        <div className="absolute top-2 right-2">
          <Badge 
            variant={isLoss ? 'destructive' : 'default'}
            className={isProfit ? 'bg-profit text-profit-foreground' : ''}
          >
            {formatPnl(pnl)}
          </Badge>
        </div>
        
        {/* Screenshot count indicator */}
        {hasScreenshots && trade.screenshots!.length > 1 && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="text-xs bg-background/80">
              +{trade.screenshots!.length - 1} more
            </Badge>
          </div>
        )}
      </div>
      
      {/* Info Section */}
      <CardContent className="p-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <CryptoIcon symbol={trade.pair} size={16} />
            <span className="font-semibold text-sm">{trade.pair}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {format(new Date(trade.trade_date), "MMM d")}
          </span>
        </div>
        
        {/* Key prices */}
        <div className="text-xs text-muted-foreground mt-2 space-y-0.5">
          <div className="flex justify-between">
            <span>Entry</span>
            <span className="font-mono">{trade.entry_price ? trade.entry_price.toFixed(2) : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span>SL</span>
            <span className="font-mono">{trade.stop_loss ? trade.stop_loss.toFixed(2) : '-'}</span>
          </div>
          <div className="flex justify-between">
            <span>TP</span>
            <span className="font-mono">{trade.take_profit ? trade.take_profit.toFixed(2) : '-'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
          {trade.strategies?.[0] && (
            <Badge 
              variant="outline" 
              className="text-xs px-1.5 py-0"
              style={{ 
                borderColor: trade.strategies[0].color || undefined,
                color: trade.strategies[0].color || undefined
              }}
            >
              {trade.strategies[0].name}
            </Badge>
          )}
          
          {trade.source === 'binance' && (
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              Binance
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
    );
  }
);

// Skeleton for loading state
export function TradeGalleryCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="aspect-video bg-muted animate-pulse" />
      <CardContent className="p-3">
        <div className="flex justify-between">
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
          <div className="h-3 w-12 bg-muted animate-pulse rounded" />
        </div>
        <div className="h-4 w-16 bg-muted animate-pulse rounded mt-1.5" />
      </CardContent>
    </Card>
  );
}
