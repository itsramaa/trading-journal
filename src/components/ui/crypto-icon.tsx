/**
 * CryptoIcon - Displays cryptocurrency logos with multi-source fallback
 * Tries CoinCap → CryptoCompare → styled text avatar
 */
import { useState } from "react";
import { cn } from "@/lib/utils";

// Extract base symbol from pair (e.g., "BTCUSDT" -> "BTC")
function getBase(symbolOrPair: string): string {
  const s = symbolOrPair.toUpperCase();
  for (const suffix of ["USDT", "BUSD", "USDC", "BTC", "ETH"]) {
    if (s.endsWith(suffix) && s.length > suffix.length) {
      return s.slice(0, -suffix.length);
    }
  }
  return s;
}

// Icon sources ordered by reliability
function getIconSources(base: string): string[] {
  const lower = base.toLowerCase();
  return [
    `https://assets.coincap.io/assets/icons/${lower}@2x.png`,
    `https://www.cryptocompare.com/media/37746251/${lower}.png`,
    `https://cdn.jsdelivr.net/gh/niclin/cryptocurrency-icons@master/128/color/${lower}.png`,
  ];
}

interface CryptoIconProps {
  symbol: string;
  size?: number;
  className?: string;
}

export function CryptoIcon({ symbol, size = 20, className }: CryptoIconProps) {
  const [sourceIndex, setSourceIndex] = useState(0);
  const base = getBase(symbol);
  const sources = getIconSources(base);

  if (sourceIndex >= sources.length) {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-muted text-muted-foreground font-bold shrink-0",
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {base.slice(0, 2)}
      </div>
    );
  }

  return (
    <img
      src={sources[sourceIndex]}
      alt={base}
      width={size}
      height={size}
      className={cn("inline-block rounded-full shrink-0", className)}
      onError={() => setSourceIndex((prev) => prev + 1)}
      loading="lazy"
    />
  );
}
