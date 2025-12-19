/**
 * Formatting utilities for Portfolio Assets Management
 * Centralized formatters for currency, percentages, and numbers
 */

import type { AssetMarket, Currency } from '@/types/portfolio';

/**
 * Format currency value based on market or currency type
 * PRD Requirement: Support USD and IDR with proper formatting
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
  
  if (currencyCode === 'IDR') {
    return `Rp ${value.toLocaleString('id-ID', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }
  
  if (currencyCode === 'EUR') {
    return `€${value.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  
  if (currencyCode === 'SGD') {
    return `S$${value.toLocaleString('en-SG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  
  if (currencyCode === 'MYR') {
    return `RM${value.toLocaleString('ms-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format large currency values with K/M/B suffixes
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
  const prefix = currencyCode === 'IDR' ? 'Rp ' : currencyCode === 'EUR' ? '€' : currencyCode === 'SGD' ? 'S$' : currencyCode === 'MYR' ? 'RM' : '$';
  
  if (Math.abs(value) >= 1_000_000_000) {
    return `${prefix}${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (Math.abs(value) >= 1_000_000) {
    return `${prefix}${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${prefix}${(value / 1_000).toFixed(1)}K`;
  }
  
  return formatCurrency(value, currency);
}

/**
 * Format percentage with sign and fixed decimals
 */
export function formatPercent(value: number, decimals: number = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

/**
 * Format percentage without sign
 */
export function formatPercentUnsigned(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format quantity with appropriate precision
 * Crypto: up to 8 decimals, Stocks: whole numbers or 2 decimals for fractional
 */
export function formatQuantity(value: number, market: AssetMarket = 'US'): string {
  if (market === 'CRYPTO') {
    // Remove trailing zeros but keep up to 8 decimals
    return parseFloat(value.toFixed(8)).toString();
  }
  
  // For stocks, show whole numbers or 2 decimals for fractional shares
  if (Number.isInteger(value)) {
    return value.toLocaleString();
  }
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format price with appropriate decimals based on value
 * Small prices (< $1): 4-8 decimals
 * Regular prices: 2 decimals
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
  
  // For small values, show more decimals
  if (Math.abs(value) < 0.01) {
    return `${prefix}${value.toFixed(8)}`;
  }
  if (Math.abs(value) < 1) {
    return `${prefix}${value.toFixed(4)}`;
  }
  
  return `${prefix}${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
