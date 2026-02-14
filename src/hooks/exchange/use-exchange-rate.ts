/**
 * useExchangeRate - Fetches real-time USD/IDR exchange rate
 * Uses free API with fallback to stored rate
 * Updates app store for global access
 */
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/app-store";

// Default fallback rate if API fails
const DEFAULT_USD_IDR_RATE = 16000;

// Free exchange rate API endpoints (no key required)
const EXCHANGE_RATE_APIS = [
  // Primary: exchangerate.host (free, no auth)
  'https://api.exchangerate.host/latest?base=USD&symbols=IDR',
  // Fallback: open.er-api.com (free)
  'https://open.er-api.com/v6/latest/USD',
];

interface ExchangeRateResponse {
  success?: boolean;
  rates?: Record<string, number>;
  result?: string;
}

async function fetchExchangeRate(): Promise<number> {
  // Try primary API
  try {
    const response = await fetch(EXCHANGE_RATE_APIS[0], {
      signal: AbortSignal.timeout(5000),
    });
    const data: ExchangeRateResponse = await response.json();
    
    if (data.rates?.IDR) {
      return data.rates.IDR;
    }
  } catch (e) {
    console.warn('Primary exchange rate API failed, trying fallback');
  }
  
  // Try fallback API
  try {
    const response = await fetch(EXCHANGE_RATE_APIS[1], {
      signal: AbortSignal.timeout(5000),
    });
    const data: ExchangeRateResponse = await response.json();
    
    if (data.rates?.IDR) {
      return data.rates.IDR;
    }
  } catch (e) {
    console.warn('Fallback exchange rate API failed');
  }
  
  // Return default if all APIs fail
  return DEFAULT_USD_IDR_RATE;
}

export function useExchangeRate() {
  const { exchangeRate: storedRate, setExchangeRate } = useAppStore();
  
  const query = useQuery({
    queryKey: ['exchange-rate', 'USD', 'IDR'],
    queryFn: async () => {
      const rate = await fetchExchangeRate();
      // Update global store
      setExchangeRate(rate);
      return rate;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 60 * 60 * 1000, // Refresh hourly
    refetchOnWindowFocus: false,
  });
  
  return {
    rate: query.data ?? storedRate ?? DEFAULT_USD_IDR_RATE,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
