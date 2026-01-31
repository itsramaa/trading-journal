/**
 * Symbol Validation Utilities
 * Validates trading symbols before sending to edge functions
 * Uses trading_pairs table as source of truth
 */

import { supabase } from "@/integrations/supabase/client";

// Common valid USDT pairs from Binance Futures (cached in memory)
let cachedValidSymbols: Set<string> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Fetch valid symbols from database
 */
async function fetchValidSymbols(): Promise<Set<string>> {
  const now = Date.now();
  
  // Return cached if still valid
  if (cachedValidSymbols && (now - cacheTimestamp) < CACHE_TTL) {
    return cachedValidSymbols;
  }
  
  try {
    const { data, error } = await supabase
      .from('trading_pairs')
      .select('symbol')
      .eq('is_active', true)
      .eq('quote_asset', 'USDT');
    
    if (error) {
      console.error('Error fetching valid symbols:', error);
      // Return fallback on error
      return getDefaultValidSymbols();
    }
    
    cachedValidSymbols = new Set(data.map(p => p.symbol));
    cacheTimestamp = now;
    
    return cachedValidSymbols;
  } catch (err) {
    console.error('Symbol validation error:', err);
    return getDefaultValidSymbols();
  }
}

/**
 * Fallback valid symbols (most common, definitely valid on Binance)
 */
function getDefaultValidSymbols(): Set<string> {
  return new Set([
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
    'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT',
    'LINKUSDT', 'LTCUSDT', 'ATOMUSDT', 'UNIUSDT', 'ETCUSDT',
    'XLMUSDT', 'NEARUSDT', 'INJUSDT', 'OPUSDT', 'ARBUSDT',
    'APTUSDT', 'SUIUSDT', 'SEIUSDT', 'TIAUSDT', 'JUPUSDT',
    'FILUSDT', 'RUNEUSDT', 'AAVEUSDT', 'MKRUSDT', 'SUSHIUSDT',
    'SANDUSDT', 'MANAUSDT', 'AXSUSDT', 'APEUSDT', 'GMTUSDT',
    'DYDXUSDT', 'WLDUSDT', 'FETUSDT', 'RENDERUSDT', 'TAOUSDT',
  ]);
}

/**
 * Validate if a symbol is valid (exists in trading_pairs)
 */
export async function isValidSymbol(symbol: string): Promise<boolean> {
  // Basic format validation
  if (!symbol || typeof symbol !== 'string') return false;
  
  // Must end with USDT
  if (!symbol.toUpperCase().endsWith('USDT')) return false;
  
  // Must have a base asset (at least 2 chars before USDT)
  const baseAsset = symbol.replace('USDT', '');
  if (baseAsset.length < 2) return false;
  
  // Check against database
  const validSymbols = await fetchValidSymbols();
  return validSymbols.has(symbol.toUpperCase());
}

/**
 * Filter array of symbols to only valid ones
 * Returns filtered array + logs invalid symbols
 */
export async function filterValidSymbols(symbols: string[]): Promise<string[]> {
  if (!Array.isArray(symbols) || symbols.length === 0) return [];
  
  const validSymbols = await fetchValidSymbols();
  
  const filtered: string[] = [];
  const invalid: string[] = [];
  
  for (const symbol of symbols) {
    const upperSymbol = symbol.toUpperCase();
    if (validSymbols.has(upperSymbol)) {
      filtered.push(upperSymbol);
    } else {
      invalid.push(symbol);
    }
  }
  
  if (invalid.length > 0) {
    console.warn('Filtered out invalid symbols:', invalid);
  }
  
  return filtered;
}

/**
 * Synchronous validation using fallback list only
 * Use when you can't await (e.g., in useMemo initial value)
 */
export function isValidSymbolSync(symbol: string): boolean {
  if (!symbol || typeof symbol !== 'string') return false;
  if (!symbol.toUpperCase().endsWith('USDT')) return false;
  
  const baseAsset = symbol.replace('USDT', '');
  if (baseAsset.length < 2) return false;
  
  // Use cached if available, otherwise use default
  const validSymbols = cachedValidSymbols || getDefaultValidSymbols();
  return validSymbols.has(symbol.toUpperCase());
}

/**
 * Warm up the cache by pre-fetching valid symbols
 * Call this on app initialization
 */
export async function warmupSymbolCache(): Promise<void> {
  await fetchValidSymbols();
}

/**
 * Clear the symbol cache (useful after sync)
 */
export function clearSymbolCache(): void {
  cachedValidSymbols = null;
  cacheTimestamp = 0;
}
