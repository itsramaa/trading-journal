/**
 * Hook to fetch volatility percentile data from history table
 * Used by VolatilityMeterWidget to show historical context
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VolatilityPercentile {
  symbol: string;
  percentile180d: number;
  dataPoints: number;
}

/**
 * Compute percentile rank: what percentage of historical values are below the current value
 */
function computePercentile(currentValue: number, historicalValues: number[]): number {
  if (historicalValues.length === 0) return 50;
  const below = historicalValues.filter(v => v < currentValue).length;
  return Math.round((below / historicalValues.length) * 100);
}

/**
 * Fetch volatility percentile for multiple symbols from the history table
 */
export function useVolatilityPercentiles(symbols: string[]) {
  return useQuery({
    queryKey: ['volatility-percentiles', symbols.join(',')],
    queryFn: async (): Promise<Record<string, VolatilityPercentile>> => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 180);
      const cutoffDate = cutoff.toISOString().split('T')[0];
      
      // Fetch all history for requested symbols in one query
      const { data: history, error } = await supabase
        .from('volatility_history')
        .select('symbol, annualized_volatility, snapshot_date')
        .in('symbol', symbols)
        .gte('snapshot_date', cutoffDate)
        .order('snapshot_date', { ascending: true });

      if (error || !history) {
        console.warn('Failed to fetch volatility history:', error);
        return {};
      }

      // Group by symbol
      const bySymbol: Record<string, number[]> = {};
      for (const row of history) {
        if (!bySymbol[row.symbol]) bySymbol[row.symbol] = [];
        bySymbol[row.symbol].push(Number(row.annualized_volatility));
      }

      // Compute percentile for each symbol (using the latest value as current)
      const result: Record<string, VolatilityPercentile> = {};
      for (const symbol of symbols) {
        const values = bySymbol[symbol] || [];
        if (values.length > 0) {
          const currentValue = values[values.length - 1];
          result[symbol] = {
            symbol,
            percentile180d: computePercentile(currentValue, values),
            dataPoints: values.length,
          };
        }
      }

      return result;
    },
    staleTime: 30 * 60 * 1000, // 30 min cache (historical data changes slowly)
    enabled: symbols.length > 0,
  });
}
