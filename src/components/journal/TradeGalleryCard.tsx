/**
 * TradeGalleryCard - Visual card for gallery view with thumbnail support
 * Optimized for image-first display with lazy loading
 */
import { format } from "date-fns";
import { ImageOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LazyImage } from "@/components/ui/lazy-image";
import { getTradeSession, SESSION_LABELS, SESSION_COLORS } from "@/lib/session-utils";
import { useCurrencyConversion } from "@/hooks/use-currency-conversion";
import type { TradeEntry } from "@/hooks/use-trade-entries";

interface TradeGalleryCardProps {
  trade: TradeEntry;
  onTradeClick: (trade: TradeEntry) => void;
}

export function TradeGalleryCard({ 
  trade, 
  onTradeClick,
}: TradeGalleryCardProps) {
  const { formatPnl } = useCurrencyConversion();
  const hasScreenshots = trade.screenshots && trade.screenshots.length > 0;
  const thumbnailUrl = hasScreenshots ? trade.screenshots![0].url : null;
  const pnl = trade.realized_pnl ?? trade.pnl ?? 0;
  const isProfit = pnl > 0;
  const isLoss = pnl < 0;
  
  return (
    <Card 
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
            variant={trade.direction === 'LONG' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {trade.direction}
          </Badge>
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
          <span className="font-semibold text-sm">{trade.pair}</span>
          <span className="text-xs text-muted-foreground">
            {format(new Date(trade.trade_date), "MMM d")}
          </span>
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
