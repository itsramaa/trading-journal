/**
 * LivePriceTicker - Horizontal scrolling marquee of top crypto prices
 * Uses Binance 24h ticker data, auto-scrolling animation
 * Supports drag-to-scroll on hover with grab cursor
 */
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { CryptoIcon } from "@/components/ui/crypto-icon";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const TICKER_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "DOTUSDT", "LINKUSDT"];

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

// Use edge function proxy to avoid CORS
function usePublicTicker() {
  return useQuery({
    queryKey: ['public-ticker-24h'],
    queryFn: async () => {
      const symbols = JSON.stringify(TICKER_SYMBOLS);
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-ticker?symbols=${encodeURIComponent(symbols)}`,
        { headers: { 'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );
      if (!res.ok) throw new Error('Ticker fetch failed');
      const allData = await res.json() as Array<{
        symbol: string;
        lastPrice: string;
        priceChangePercent: string;
      }>;
      return allData.filter(t => TICKER_SYMBOLS.includes(t.symbol));
    },
    staleTime: 15_000,
    refetchInterval: 15_000,
    retry: 2,
  });
}

export function LivePriceTicker() {
  const { data, isLoading } = usePublicTicker();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const dragState = useRef({ startX: 0, scrollLeft: 0 });

  const tickerItems = useMemo(() => {
    if (!data) return [];
    return data.map(t => ({
      symbol: t.symbol,
      lastPrice: parseFloat(t.lastPrice),
      priceChangePercent: parseFloat(t.priceChangePercent),
    }));
  }, [data]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    dragState.current.startX = e.pageX - containerRef.current.offsetLeft;
    dragState.current.scrollLeft = containerRef.current.scrollLeft;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - dragState.current.startX) * 1.5;
    containerRef.current.scrollLeft = dragState.current.scrollLeft - walk;
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsDragging(false);
  }, []);

  // Hide ticker completely while loading - no skeleton placeholders
  if (isLoading || tickerItems.length === 0) {
    return null;
  }

  // Duplicate items for seamless scroll
  const items = [...tickerItems, ...tickerItems];

  return (
    <div
      ref={containerRef}
      className={cn(
        "h-8 bg-muted/20 border-b relative w-full max-w-full select-none",
        isHovered ? "overflow-x-auto scrollbar-none" : "overflow-hidden",
        isDragging ? "cursor-grabbing" : isHovered ? "cursor-grab" : ""
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      <div
        ref={scrollRef}
        className={cn(
          "flex items-center h-full",
          !isHovered && "ticker-scroll"
        )}
        style={{ width: 'max-content' }}
      >
        {items.map((item, idx) => {
          const isUp = item.priceChangePercent >= 0;
          const base = item.symbol.replace("USDT", "");
          return (
            <div
              key={`${item.symbol}-${idx}`}
              className="flex items-center gap-1.5 px-4 shrink-0"
            >
              <CryptoIcon symbol={base} size={14} />
              <span className="text-xs font-medium text-foreground">{base}</span>
              <span className="text-xs font-mono text-muted-foreground">
                ${formatPrice(item.lastPrice)}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold flex items-center gap-0.5",
                  isUp ? "text-profit" : "text-loss"
                )}
              >
                {isUp ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                {isUp ? "+" : ""}{item.priceChangePercent.toFixed(2)}%
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        .ticker-scroll {
          animation: ticker-marquee 30s linear infinite;
        }
        @keyframes ticker-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
