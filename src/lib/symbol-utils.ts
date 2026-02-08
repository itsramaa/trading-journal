/**
 * Symbol Utilities
 * Centralized functions for handling trading pair symbol formatting
 */

// Common quote assets in order of priority
export const QUOTE_ASSETS = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH'] as const;

export type QuoteAsset = typeof QUOTE_ASSETS[number];

/**
 * Extract base symbol from a trading pair
 * @example getBaseSymbol('BTCUSDT') => 'BTC'
 * @example getBaseSymbol('ETHBTC', 'BTC') => 'ETH'
 */
export function getBaseSymbol(pair: string, quoteAsset?: string): string {
  if (!pair) return '';
  
  // If quote asset is specified, use it directly
  if (quoteAsset && pair.endsWith(quoteAsset)) {
    return pair.slice(0, -quoteAsset.length);
  }
  
  // Auto-detect quote asset
  for (const quote of QUOTE_ASSETS) {
    if (pair.endsWith(quote)) {
      return pair.slice(0, -quote.length);
    }
  }
  
  // Return original if no known quote asset found
  return pair;
}

/**
 * Extract quote asset from a trading pair
 * @example getQuoteAsset('BTCUSDT') => 'USDT'
 * @example getQuoteAsset('ETHBTC') => 'BTC'
 */
export function getQuoteAsset(pair: string): string {
  if (!pair) return 'USDT';
  
  for (const quote of QUOTE_ASSETS) {
    if (pair.endsWith(quote)) {
      return quote;
    }
  }
  
  return 'USDT';
}

/**
 * Format symbol for display with base and quote separated
 * @example formatSymbolDisplay('BTCUSDT') => { base: 'BTC', quote: 'USDT' }
 */
export function formatSymbolDisplay(pair: string): { base: string; quote: string } {
  const quote = getQuoteAsset(pair);
  const base = getBaseSymbol(pair, quote);
  return { base, quote };
}

/**
 * Format symbol for display (base only, no quote)
 * @example formatSymbolBase('BTCUSDT') => 'BTC'
 */
export function formatSymbolBase(pair: string): string {
  return getBaseSymbol(pair);
}

/**
 * Check if a pair uses a specific quote asset
 * @example isQuoteAsset('BTCUSDT', 'USDT') => true
 */
export function isQuoteAsset(pair: string, quote: string): boolean {
  return pair.endsWith(quote);
}

/**
 * Check if a pair is a USDT pair
 * @example isUsdtPair('BTCUSDT') => true
 * @example isUsdtPair('ETHBTC') => false
 */
export function isUsdtPair(pair: string): boolean {
  return isQuoteAsset(pair, 'USDT');
}

/**
 * Normalize pair to standard format (uppercase, trimmed)
 */
export function normalizePair(pair: string): string {
  return pair.toUpperCase().trim();
}

/**
 * Create a trading pair from base and quote
 * @example createPair('BTC', 'USDT') => 'BTCUSDT'
 */
export function createPair(base: string, quote: string): string {
  return `${base.toUpperCase()}${quote.toUpperCase()}`;
}
