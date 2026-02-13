/**
 * useCurrencyConversion - Centralized currency conversion hook
 * Converts USD values to user's preferred currency with formatting
 * 
 * Features:
 * - Real-time exchange rate (USD → IDR)
 * - IDR compact notation (k, jt, m, t)
 * - Consistent formatting across all components
 */
import { useUserSettings } from "@/hooks/use-user-settings";
import { useAppStore } from "@/store/app-store";
import { useExchangeRate } from "@/hooks/use-exchange-rate";
import {
  formatCurrency as formatCurrencyBase,
  formatCompactCurrency as formatCompactBase,
  formatPnl as formatPnlBase,
  formatCompactPnl as formatCompactPnlBase,
} from "@/lib/formatters";

export type SupportedCurrency = 'USD' | 'IDR';

export interface UseCurrencyConversionReturn {
  /**
   * Convert USD value to user's currency
   */
  convert: (usdValue: number) => number;
  
  /**
   * Format converted value with currency symbol
   */
  format: (usdValue: number) => string;
  
  /**
   * Format P&L with sign prefix (+$x / -$x)
   */
  formatPnl: (usdValue: number) => string;
  
  /**
   * Format with compact notation (K/M/B or k/jt/m/t)
   */
  formatCompact: (usdValue: number) => string;
  
  /**
   * Format P&L with compact notation
   */
  formatCompactPnl: (usdValue: number) => string;
  
  /**
   * User's current display currency
   */
  currency: SupportedCurrency;
  
  /**
   * Current USD/IDR exchange rate
   */
  exchangeRate: number;
  
  /**
   * Whether exchange rate is still loading
   */
  isLoading: boolean;
}

export function useCurrencyConversion(): UseCurrencyConversionReturn {
  const { data: settings } = useUserSettings();
  const { exchangeRate: storedRate } = useAppStore();
  const { rate, isLoading } = useExchangeRate();
  
  // Prefer fetched rate, fall back to stored rate
  const exchangeRate = rate || storedRate || 16000;
  
  // Get user's currency preference (default USD)
  const currency = (settings?.default_currency as SupportedCurrency) || 'USD';
  
  /**
   * Convert USD value to user's preferred currency
   */
  const convert = (usdValue: number): number => {
    if (currency === 'IDR') {
      return usdValue * exchangeRate;
    }
    return usdValue;
  };
  
  /**
   * Format converted value with proper currency formatting
   */
  const format = (usdValue: number): string => {
    const converted = convert(usdValue);
    return formatCurrencyBase(converted, currency);
  };
  
  /**
   * Format P&L with +/- sign prefix
   */
  const formatPnl = (usdValue: number): string => {
    const converted = convert(usdValue);
    return formatPnlBase(converted, currency);
  };
  
  /**
   * Format with compact notation
   */
  const formatCompact = (usdValue: number): string => {
    const converted = convert(usdValue);
    return formatCompactBase(converted, currency);
  };
  
  /**
   * Format P&L with compact notation
   */
  const formatCompactPnl = (usdValue: number): string => {
    const converted = convert(usdValue);
    return formatCompactPnlBase(converted, currency);
  };
  
  return {
    convert,
    format,
    formatPnl,
    formatCompact,
    formatCompactPnl,
    currency,
    exchangeRate,
    isLoading,
  };
}
