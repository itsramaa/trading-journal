/**
 * Binance Transaction History Hooks - Phase 6
 * Hooks for tracking deposits, withdrawals, and transfers
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// =============================================================================
// Types
// =============================================================================

export interface BinanceTransaction {
  tranId: number;
  asset: string;
  amount: number;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  time: number;
  info: string;
}

export interface TransactionHistoryParams {
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface TransactionSummary {
  totalDeposits: number;
  totalWithdrawals: number;
  netFlow: number;
  depositCount: number;
  withdrawalCount: number;
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Get transaction history (deposits, withdrawals, transfers)
 */
export function useBinanceTransactionHistory(params: TransactionHistoryParams = {}) {
  return useQuery({
    queryKey: ['binance', 'transaction-history', params],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('binance-futures', {
        body: { action: 'transaction-history', params },
      });
      
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Failed to fetch transaction history');
      
      return data.data as BinanceTransaction[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get transaction history for the last N days
 */
export function useRecentTransactions(days: number = 30) {
  const startTime = Date.now() - days * 24 * 60 * 60 * 1000;
  
  return useBinanceTransactionHistory({
    startTime,
    limit: 500,
  });
}

/**
 * Get transaction summary with aggregated data
 */
export function useTransactionSummary(days: number = 30) {
  const { data: transactions, ...query } = useRecentTransactions(days);
  
  const summary: TransactionSummary | null = transactions
    ? transactions.reduce(
        (acc, tx) => {
          if (tx.type === 'DEPOSIT') {
            acc.totalDeposits += Math.abs(tx.amount);
            acc.depositCount++;
          } else {
            acc.totalWithdrawals += Math.abs(tx.amount);
            acc.withdrawalCount++;
          }
          acc.netFlow = acc.totalDeposits - acc.totalWithdrawals;
          return acc;
        },
        {
          totalDeposits: 0,
          totalWithdrawals: 0,
          netFlow: 0,
          depositCount: 0,
          withdrawalCount: 0,
        }
      )
    : null;
  
  return {
    ...query,
    data: summary,
    transactions,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

export function getTransactionTypeLabel(type: string): string {
  switch (type) {
    case 'DEPOSIT':
      return 'Deposit';
    case 'WITHDRAWAL':
      return 'Withdrawal';
    case 'TRANSFER':
      return 'Transfer';
    default:
      return type;
  }
}

export function getTransactionTypeVariant(type: string): 'default' | 'destructive' {
  return type === 'DEPOSIT' ? 'default' : 'destructive';
}
