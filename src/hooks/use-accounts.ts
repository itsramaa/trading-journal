/**
 * React Query hooks for Account Management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Account, AccountTransaction, AccountType, AccountTransactionType } from '@/types/account';

// Query keys
export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  detail: (id: string) => [...accountKeys.all, 'detail', id] as const,
};

export const accountTransactionKeys = {
  all: ['account-transactions'] as const,
  lists: () => [...accountTransactionKeys.all, 'list'] as const,
  byAccount: (accountId: string) => [...accountTransactionKeys.all, 'account', accountId] as const,
};

// ============= Account Hooks =============

export function useAccounts() {
  return useQuery({
    queryKey: accountKeys.lists(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Account[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: accountKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accounts')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Account;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (account: {
      name: string;
      account_type: AccountType;
      currency: string;
      description?: string;
      icon?: string;
      color?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name: account.name,
          account_type: account.account_type,
          currency: account.currency,
          description: account.description || null,
          icon: account.icon || null,
          color: account.color || null,
          balance: 0,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Account> & { id: string }) => {
      const { data, error } = await supabase
        .from('accounts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

// ============= Account Transaction Hooks =============

export function useAccountTransactions(accountId?: string, limit?: number) {
  return useQuery({
    queryKey: accountId 
      ? accountTransactionKeys.byAccount(accountId) 
      : accountTransactionKeys.lists(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let query = supabase
        .from('account_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as AccountTransaction[];
    },
    staleTime: 30 * 1000,
  });
}

export function useDeposit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      amount,
      currency,
      description,
      notes,
    }: {
      accountId: string;
      amount: number;
      currency: string;
      description?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('account_transactions')
        .insert({
          user_id: user.id,
          account_id: accountId,
          transaction_type: 'deposit' as AccountTransactionType,
          amount,
          currency,
          description: description || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountTransactionKeys.lists() });
    },
  });
}

export function useWithdraw() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      accountId,
      amount,
      currency,
      description,
      notes,
    }: {
      accountId: string;
      amount: number;
      currency: string;
      description?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('account_transactions')
        .insert({
          user_id: user.id,
          account_id: accountId,
          transaction_type: 'withdrawal' as AccountTransactionType,
          amount,
          currency,
          description: description || null,
          notes: notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountTransactionKeys.lists() });
    },
  });
}

export function useTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      fromAccountId,
      toAccountId,
      amount,
      currency,
      description,
      notes,
    }: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      currency: string;
      description?: string;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Generate a reference ID to link the two transactions
      const referenceId = crypto.randomUUID();

      // Create withdrawal from source account
      const { error: withdrawError } = await supabase
        .from('account_transactions')
        .insert({
          user_id: user.id,
          account_id: fromAccountId,
          transaction_type: 'transfer_out' as AccountTransactionType,
          amount,
          currency,
          reference_id: referenceId,
          description: description || 'Transfer out',
          notes: notes || null,
        });

      if (withdrawError) throw withdrawError;

      // Create deposit to destination account
      const { data, error: depositError } = await supabase
        .from('account_transactions')
        .insert({
          user_id: user.id,
          account_id: toAccountId,
          transaction_type: 'transfer_in' as AccountTransactionType,
          amount,
          currency,
          reference_id: referenceId,
          description: description || 'Transfer in',
          notes: notes || null,
        })
        .select()
        .single();

      if (depositError) throw depositError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountTransactionKeys.lists() });
    },
  });
}

// ============= Summary Hooks =============

export function useAccountsSummary() {
  const { data: accounts, isLoading } = useAccounts();

  const summary = accounts?.reduce(
    (acc, account) => {
      const balance = Number(account.balance);
      acc.totalBalance += balance;
      acc.byCurrency[account.currency] = (acc.byCurrency[account.currency] || 0) + balance;
      acc.byType[account.account_type] = (acc.byType[account.account_type] || 0) + balance;
      return acc;
    },
    {
      totalBalance: 0,
      byCurrency: {} as Record<string, number>,
      byType: {} as Record<string, number>,
    }
  ) || { totalBalance: 0, byCurrency: {}, byType: {} };

  return {
    ...summary,
    accounts,
    isLoading,
  };
}
