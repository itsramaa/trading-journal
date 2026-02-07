/**
 * Formatting utilities for Trading Journey
 * Centralized formatters for currency, percentages, and numbers
 * 
 * STANDARDS:
 * - Currency/Numbers: max 4 decimal places
 * - Percentages: always 2 decimal places
 * - Quantities (Crypto): up to 8 decimals
 */

type AssetMarket = 'CRYPTO' | 'US' | 'ID';
type Currency = 'USD' | 'IDR' | 'EUR' | 'SGD' | 'MYR';

/**
 * Get the appropriate number of decimals for a value
 * Small values get more decimals (up to 4), larger values get 2
 */
function getSmartDecimals(value: number, maxDecimals: number = 4): number {
  const absValue = Math.abs(value);
  if (absValue === 0) return 2;
  if (absValue < 0.01) return maxDecimals;
  if (absValue < 1) return Math.min(4, maxDecimals);
  return 2;
}

/**
 * Format currency value based on market or currency type
 * Uses smart decimals: max 4 for small values, 2 for larger
 */
export function formatCurrency(
  value: number,
  currency: Currency | AssetMarket | string = 'USD'
): string {
  // Map market to currency if needed
  let currencyCode: string;
  if (currency === 'ID') {
    currencyCode = 'IDR';
  } else if (currency === 'CRYPTO' || currency === 'US') {
    currencyCode = 'USD';
  } else {
    currencyCode = currency;
  }
  
  const decimals = getSmartDecimals(value, 4);
  
  if (currencyCode === 'IDR') {
    // IDR formatting: no decimals, use Indonesian locale
    return `Rp ${value.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
  
  if (currencyCode === 'EUR') {
    return `€${value.toLocaleString('de-DE', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
  
  if (currencyCode === 'SGD') {
    return `S$${value.toLocaleString('en-SG', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
  
  if (currencyCode === 'MYR') {
    return `RM${value.toLocaleString('ms-MY', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }
  
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format compact IDR with Indonesian notation
 * 1,000 - 999,999 = k (1k, 10k, 100k, 999k)
 * 1,000,000+ = jt (1jt, 1.5jt, 10jt - juta)
 * 1,000,000,000+ = m (1m, 1.5m - miliar)
 * 1,000,000,000,000+ = t (1t - triliun)
 */
export function formatCompactIDR(value: number): string {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  
  if (absValue >= 1_000_000_000_000) {
    const formatted = (absValue / 1_000_000_000_000).toFixed(1);
    return `${sign}Rp ${parseFloat(formatted)}t`;
  }
  if (absValue >= 1_000_000_000) {
    const formatted = (absValue / 1_000_000_000).toFixed(1);
    return `${sign}Rp ${parseFloat(formatted)}m`;
  }
  if (absValue >= 1_000_000) {
    const formatted = (absValue / 1_000_000).toFixed(1);
    return `${sign}Rp ${parseFloat(formatted)}jt`;
  }
  if (absValue >= 1_000) {
    const formatted = (absValue / 1_000).toFixed(0);
    return `${sign}Rp ${formatted}k`;
  }
  
  // Small values: show full amount
  return formatCurrency(value, 'IDR');
}

/**
 * Format large currency values with compact notation
 * USD: K/M/B suffixes
 * IDR: k/jt/m/t suffixes (Indonesian notation)
 */
export function formatCompactCurrency(
  value: number,
  currency: Currency | AssetMarket | string = 'USD'
): string {
  let currencyCode: string;
  if (currency === 'ID') {
    currencyCode = 'IDR';
  } else if (currency === 'CRYPTO' || currency === 'US') {
    currencyCode = 'USD';
  } else {
    currencyCode = currency;
  }
  
  // Use Indonesian notation for IDR
  if (currencyCode === 'IDR') {
    return formatCompactIDR(value);
  }
  
  const prefix = currencyCode === 'EUR' ? '€' : currencyCode === 'SGD' ? 'S$' : currencyCode === 'MYR' ? 'RM' : '$';
  
  if (Math.abs(value) >= 1_000_000_000) {
    return `${prefix}${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${prefix}${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${prefix}${(value / 1_000).toFixed(2)}K`;
  }
  
  return formatCurrency(value, currency);
}

/**
 * Format PnL value with proper sign prefix (STANDARD)
 * Format: +$x for profit, -$x for loss
 * Used for all profit/loss displays across the application
 */
export function formatPnl(
  value: number,
  currency: Currency | AssetMarket | string = 'USD'
): string {
  const absFormatted = formatCurrency(Math.abs(value), currency);
  // Replace currency symbol position to put sign before it
  // e.g., "$100" -> "+$100" or "-$100"
  if (value >= 0) {
    return absFormatted.replace(/^([^\d]+)/, '+$1');
  } else {
    return absFormatted.replace(/^([^\d]+)/, '-$1');
  }
}

/**
 * Format PnL for compact display (K/M/B)
 * Uses same +$x / -$x standard
 */
export function formatCompactPnl(
  value: number,
  currency: Currency | AssetMarket | string = 'USD'
): string {
  const absFormatted = formatCompactCurrency(Math.abs(value), currency);
  if (value >= 0) {
    return absFormatted.replace(/^([^\d]+)/, '+$1');
  } else {
    return absFormatted.replace(/^([^\d]+)/, '-$1');
  }
}

/**
 * Format percentage with sign and fixed 2 decimals (STANDARD)
 */
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format percentage without sign (always 2 decimals)
 */
export function formatPercentUnsigned(value: number, decimals: number = 2): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Format a number with max 4 decimals, removing trailing zeros
 */
export function formatNumber(value: number, maxDecimals: number = 4): string {
  return parseFloat(value.toFixed(maxDecimals)).toString();
}

/**
 * Format fee/commission with 4 decimal precision
 */
export function formatFee(value: number, asset: string = 'USDT'): string {
  return `${parseFloat(value.toFixed(4))} ${asset}`;
}

/**
 * Format quantity with appropriate precision
 */
export function formatQuantity(value: number, market: AssetMarket = 'US'): string {
  if (market === 'CRYPTO') {
    // Remove trailing zeros but keep up to 8 decimals
    return parseFloat(value.toFixed(8)).toString();
  }
  
  // For stocks, show whole numbers or up to 4 decimals for fractional shares
  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }
  return parseFloat(value.toFixed(4)).toLocaleString();
}

/**
 * Format price with appropriate decimals based on value (max 4)
 */
export function formatPrice(value: number, currency: Currency | AssetMarket | string = 'USD'): string {
  let currencyCode: string;
  if (currency === 'ID') {
    currencyCode = 'IDR';
  } else if (currency === 'CRYPTO' || currency === 'US') {
    currencyCode = 'USD';
  } else {
    currencyCode = currency;
  }
  const prefix = currencyCode === 'IDR' ? 'Rp ' : currencyCode === 'EUR' ? '€' : currencyCode === 'SGD' ? 'S$' : currencyCode === 'MYR' ? 'RM' : '$';
  
  if (currencyCode === 'IDR') {
    return `${prefix}${value.toLocaleString('id-ID', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  
  // For small values, show more decimals (max 4)
  const decimals = getSmartDecimals(value, 4);
  
  return `${prefix}${value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Format R:R ratio with 2 decimal precision
 */
export function formatRatio(value: number): string {
  return `${value.toFixed(2)}:1`;
}

/**
 * Format win rate (percentage without sign, 1 decimal for display)
 */
export function formatWinRate(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date with time
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(d);
}
