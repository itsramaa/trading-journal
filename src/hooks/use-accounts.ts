/**
 * React Query hooks for Trading Account Management
 * Unified hooks for trading, backtest, and funding accounts
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

// Map database account types to our simplified types
function mapAccountType(dbType: string, metadata: any): AccountType {
  // Check if it's a backtest account
  if (metadata?.is_backtest) return 'backtest';
  
  // Map database types to our simplified types
  switch (dbType) {
    case 'trading':
    case 'broker':
      return 'trading';
    case 'bank':
    case 'ewallet':
    case 'cash':
      return 'funding';
    default:
      return 'trading';
  }
}

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
      
      // Transform accounts to use our simplified types
      return (data || []).map(account => ({
        ...account,
        account_type: mapAccountType(account.account_type, account.metadata),
        metadata: typeof account.metadata === 'string' 
          ? JSON.parse(account.metadata) 
          : account.metadata,
      })) as Account[];
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
      
      return {
        ...data,
        account_type: mapAccountType(data.account_type, data.metadata),
        metadata: typeof data.metadata === 'string' 
          ? JSON.parse(data.metadata) 
          : data.metadata,
      } as Account;
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
      initial_balance?: number;
      metadata?: {
        broker?: string;
        account_number?: string;
        is_backtest?: boolean;
        initial_balance?: number;
      };
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const initialBalance = account.initial_balance || 0;
      
      // Map our simplified type to database type
      let dbAccountType: string = account.account_type;
      if (account.account_type === 'backtest') {
        dbAccountType = 'trading';
      }

      // Create the account with initial balance
      const { data, error } = await supabase
        .from('accounts')
        .insert({
          user_id: user.id,
          name: account.name,
          account_type: dbAccountType as any,
          currency: account.currency,
          description: account.description || null,
          icon: account.icon || null,
          color: account.color || null,
          balance: initialBalance,
          is_active: true,
          metadata: account.metadata || null,
        })
        .select()
        .single();

      if (error) throw error;

      // If there's an initial balance, create a deposit transaction
      if (initialBalance > 0) {
        await supabase
          .from('account_transactions')
          .insert({
            user_id: user.id,
            account_id: data.id,
            transaction_type: 'deposit' as AccountTransactionType,
            amount: initialBalance,
            currency: account.currency,
            description: 'Initial balance',
          });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: accountTransactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Account> & { id: string }) => {
      // Convert metadata to Json compatible type
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      if (updates.metadata) {
        updateData.metadata = updates.metadata as unknown;
      }
      
      const { data, error } = await supabase
        .from('accounts')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });
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
      queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });
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
        .in('transaction_type', ['deposit', 'withdrawal'])
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
      queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });
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
      queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });
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
