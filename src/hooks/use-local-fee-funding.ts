/**
 * Hooks for fetching fee and funding data from local trade_entries table
 * Implements "Local DB as Ledger of Truth" architecture
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DateRange } from "@/components/trading/DateRangeFilter";

export interface LocalFeeRecord {
  id: string;
  pair: string;
  commission: number;
  commission_asset: string | null;
  entry_datetime: string;
  direction: string;
  realized_pnl: number | null;
}

export interface LocalFundingRecord {
  id: string;
  pair: string;
  funding_fees: number;
  entry_datetime: string;
  direction: string;
  realized_pnl: number | null;
}

interface LocalFeeFilters {
  dateRange: DateRange;
  selectedPairs: string[];
}

/**
 * Hook to fetch commission/fee data from local trade_entries
 * Only returns Binance-sourced trades with non-zero commission
 */
export function useLocalFeeHistory(filters: LocalFeeFilters) {
  return useQuery({
    queryKey: ['local-fee-history', filters.dateRange, filters.selectedPairs],
    queryFn: async () => {
      let query = supabase
        .from('trade_entries')
        .select('id, pair, commission, commission_asset, entry_datetime, direction, realized_pnl')
        .eq('source', 'binance')
        .is('deleted_at', null)
        .not('commission', 'is', null)
        .gt('commission', 0)
        .order('entry_datetime', { ascending: false });

      // Apply date range filter
      if (filters.dateRange.from) {
        query = query.gte('entry_datetime', filters.dateRange.from.toISOString());
      }
      if (filters.dateRange.to) {
        query = query.lte('entry_datetime', filters.dateRange.to.toISOString());
      }

      // Apply pair filter
      if (filters.selectedPairs.length > 0) {
        query = query.in('pair', filters.selectedPairs);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as LocalFeeRecord[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch funding fee data from local trade_entries
 * Only returns Binance-sourced trades with non-zero funding_fees
 */
export function useLocalFundingHistory(filters: LocalFeeFilters) {
  return useQuery({
    queryKey: ['local-funding-history', filters.dateRange, filters.selectedPairs],
    queryFn: async () => {
      let query = supabase
        .from('trade_entries')
        .select('id, pair, funding_fees, entry_datetime, direction, realized_pnl')
        .eq('source', 'binance')
        .is('deleted_at', null)
        .not('funding_fees', 'is', null)
        .neq('funding_fees', 0)
        .order('entry_datetime', { ascending: false });

      // Apply date range filter
      if (filters.dateRange.from) {
        query = query.gte('entry_datetime', filters.dateRange.from.toISOString());
      }
      if (filters.dateRange.to) {
        query = query.lte('entry_datetime', filters.dateRange.to.toISOString());
      }

      // Apply pair filter
      if (filters.selectedPairs.length > 0) {
        query = query.in('pair', filters.selectedPairs);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return (data || []) as LocalFundingRecord[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Calculate fee summary from local fee records
 */
export function calculateFeeSummary(records: LocalFeeRecord[]) {
  if (!records.length) return null;

  const totalFees = records.reduce((sum, r) => sum + (r.commission || 0), 0);
  const tradeCount = records.length;

  return {
    totalFees,
    tradeCount,
    avgFeePerTrade: totalFees / tradeCount,
  };
}

/**
 * Calculate funding summary from local funding records
 */
export function calculateFundingSummary(records: LocalFundingRecord[]) {
  if (!records.length) return null;

  let fundingPaid = 0;
  let fundingReceived = 0;
  let paidCount = 0;
  let receivedCount = 0;

  records.forEach((r) => {
    const fundingFee = r.funding_fees || 0;
    if (fundingFee < 0) {
      fundingPaid += Math.abs(fundingFee);
      paidCount++;
    } else if (fundingFee > 0) {
      fundingReceived += fundingFee;
      receivedCount++;
    }
  });

  return {
    fundingPaid,
    fundingReceived,
    netFunding: fundingReceived - fundingPaid,
    paidCount,
    receivedCount,
    totalCount: records.length,
  };
}
