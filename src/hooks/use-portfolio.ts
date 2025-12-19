/**
 * React Query hooks for portfolio data management
 * Follows project conventions: server data in React Query, UI state in Zustand
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

// Query keys for cache management
export const portfolioKeys = {
  all: ['portfolios'] as const,
  lists: () => [...portfolioKeys.all, 'list'] as const,
  list: (userId: string) => [...portfolioKeys.lists(), userId] as const,
  details: () => [...portfolioKeys.all, 'detail'] as const,
  detail: (id: string) => [...portfolioKeys.details(), id] as const,
  history: (portfolioId: string, period: string) => [...portfolioKeys.all, 'history', portfolioId, period] as const,
};

export const holdingKeys = {
  all: ['holdings'] as const,
  lists: () => [...holdingKeys.all, 'list'] as const,
  list: (portfolioId: string) => [...holdingKeys.lists(), portfolioId] as const,
};

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (portfolioId: string) => [...transactionKeys.lists(), portfolioId] as const,
};

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  prices: () => [...assetKeys.all, 'prices'] as const,
};

export const alertKeys = {
  all: ['price-alerts'] as const,
  lists: () => [...alertKeys.all, 'list'] as const,
};

// Types derived from database
type Portfolio = Tables<'portfolios'>;
type Holding = Tables<'holdings'>;
type Transaction = Tables<'transactions'>;
type Asset = Tables<'assets'>;
type PriceCache = Tables<'price_cache'>;
type PortfolioHistory = Tables<'portfolio_history'>;
type PriceAlert = Tables<'price_alerts'>;

export interface HoldingWithAsset extends Holding {
  assets: Asset;
  price_cache: PriceCache | null;
}

export interface TransactionWithAsset extends Transaction {
  assets: Asset;
}

export interface PriceAlertWithAsset extends PriceAlert {
  assets: Asset;
}

// ============= Portfolio Hooks =============

export function usePortfolios() {
  return useQuery({
    queryKey: portfolioKeys.lists(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      return data as Portfolio[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDefaultPortfolio() {
  return useQuery({
    queryKey: [...portfolioKeys.lists(), 'default'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('portfolios')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data as Portfolio | null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (portfolio: Omit<Portfolio, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('portfolios')
        .insert(portfolio)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
    },
  });
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Portfolio> & { id: string }) => {
      const { data, error } = await supabase
        .from('portfolios')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
    },
  });
}

export function useDeletePortfolio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('portfolios')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
    },
  });
}

// ============= Portfolio History Hooks =============

export function usePortfolioHistory(portfolioId?: string, period: string = '1Y') {
  return useQuery({
    queryKey: portfolioKeys.history(portfolioId || '', period),
    queryFn: async () => {
      if (!portfolioId) return [];
      
      // Calculate date range based on period
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case '1M':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '3M':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1Y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case 'ALL':
          startDate = new Date('2020-01-01');
          break;
        default:
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      }
      
      const { data, error } = await supabase
        .from('portfolio_history')
        .select('*')
        .eq('portfolio_id', portfolioId)
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: true });
      
      if (error) throw error;
      return data as PortfolioHistory[];
    },
    enabled: !!portfolioId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRecordPortfolioHistory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (history: Omit<PortfolioHistory, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('portfolio_history')
        .insert(history)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: portfolioKeys.history(variables.portfolio_id, '') });
    },
  });
}

// ============= Holdings Hooks =============

export function useHoldings(portfolioId?: string) {
  return useQuery({
    queryKey: portfolioId ? holdingKeys.list(portfolioId) : holdingKeys.lists(),
    queryFn: async () => {
      let query = supabase
        .from('holdings')
        .select(`
          *,
          assets (*),
          price_cache:price_cache(*)
        `)
        .gt('quantity', 0);
      
      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }
      
      const { data, error } = await query.order('total_cost', { ascending: false });
      
      if (error) throw error;
      
      // Transform the data to match expected structure
      return (data || []).map(holding => ({
        ...holding,
        price_cache: Array.isArray(holding.price_cache) 
          ? holding.price_cache[0] || null 
          : holding.price_cache,
      })) as HoldingWithAsset[];
    },
    staleTime: 30 * 1000, // 30 seconds for holdings (price sensitive)
    enabled: !!portfolioId || portfolioId === undefined,
  });
}

// ============= Transactions Hooks =============

export function useTransactions(portfolioId?: string, limit?: number) {
  return useQuery({
    queryKey: [...transactionKeys.lists(), portfolioId, limit],
    queryFn: async () => {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          assets (*)
        `)
        .order('transaction_date', { ascending: false });
      
      if (portfolioId) {
        query = query.eq('portfolio_id', portfolioId);
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as TransactionWithAsset[];
    },
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (transaction: Omit<Transaction, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transaction)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: holdingKeys.list(variables.portfolio_id) });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Transaction> & { id: string }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: holdingKeys.all });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: holdingKeys.all });
    },
  });
}

// ============= Assets Hooks =============

export function useAssets() {
  return useQuery({
    queryKey: assetKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('symbol');
      
      if (error) throw error;
      return data as Asset[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - assets don't change often
  });
}

export function useAssetBySymbol(symbol: string) {
  return useQuery({
    queryKey: [...assetKeys.lists(), symbol],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assets')
        .select(`
          *,
          price_cache:price_cache(*)
        `)
        .eq('symbol', symbol)
        .single();
      
      if (error) throw error;
      return {
        ...data,
        price_cache: Array.isArray(data.price_cache) ? data.price_cache[0] : data.price_cache,
      };
    },
    enabled: !!symbol,
    staleTime: 30 * 1000,
  });
}

export function useCreateAsset() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (asset: Omit<Asset, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('assets')
        .insert(asset)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.lists() });
    },
  });
}

export function useAssetPrices() {
  return useQuery({
    queryKey: assetKeys.prices(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('price_cache')
        .select(`
          *,
          assets (*)
        `);
      
      if (error) throw error;
      return data;
    },
    staleTime: 30 * 1000, // 30 seconds - prices are time sensitive
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// ============= Price Alerts Hooks =============

export function usePriceAlerts() {
  return useQuery({
    queryKey: alertKeys.lists(),
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('price_alerts')
        .select(`
          *,
          assets (*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as PriceAlertWithAsset[];
    },
    staleTime: 60 * 1000,
  });
}

export function useCreatePriceAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (alert: Omit<PriceAlert, 'id' | 'created_at' | 'updated_at' | 'is_triggered' | 'triggered_at'>) => {
      const { data, error } = await supabase
        .from('price_alerts')
        .insert(alert)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

export function useDeletePriceAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('price_alerts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: alertKeys.lists() });
    },
  });
}

// ============= Price Refresh Hook =============

export function useRefreshPrices() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-prices');
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetKeys.prices() });
      queryClient.invalidateQueries({ queryKey: holdingKeys.all });
    },
  });
}

// ============= User Settings Hooks =============

export function useUserSettings() {
  return useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<Tables<'user_settings'>>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // First check if settings exist
      const { data: existing } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (existing) {
        const { data, error } = await supabase
          .from('user_settings')
          .update({ ...settings, updated_at: new Date().toISOString() })
          .eq('user_id', user.id)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('user_settings')
          .insert({ ...settings, user_id: user.id })
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
  });
}
