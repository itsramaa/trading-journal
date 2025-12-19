/**
 * Hook for fetching and managing exchange rates
 * Provides USD/IDR conversion functionality
 */

import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '@/store/app-store';
import { useEffect } from 'react';

const EXCHANGE_API_URL = 'https://api.exchangerate-api.com/v4/latest/USD';

interface ExchangeRateResponse {
  rates: {
    IDR: number;
    [key: string]: number;
  };
}

export function useExchangeRate() {
  const { setExchangeRate } = useAppStore();
  
  const query = useQuery({
    queryKey: ['exchange-rate'],
    queryFn: async (): Promise<number> => {
      try {
        const response = await fetch(EXCHANGE_API_URL);
        if (!response.ok) {
          throw new Error('Failed to fetch exchange rate');
        }
        const data: ExchangeRateResponse = await response.json();
        return data.rates.IDR;
      } catch {
        // Fallback rate if API fails
        return 15500;
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    refetchInterval: 60 * 60 * 1000, // Refetch every hour
    retry: 2,
  });

  // Update store when rate changes
  useEffect(() => {
    if (query.data) {
      setExchangeRate(query.data);
    }
  }, [query.data, setExchangeRate]);

  return query;
}
