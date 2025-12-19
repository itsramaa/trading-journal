/**
 * Custom hook for debounced search across assets, portfolios, and transactions
 * Separates search logic from UI
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { demoAssets, demoHoldings, demoTransactions, demoPortfolio } from '@/lib/demo-data';

export interface SearchResult {
  type: 'asset' | 'portfolio' | 'transaction' | 'page';
  id: string;
  title: string;
  subtitle?: string;
  value?: string;
  href: string;
  metadata?: Record<string, any>;
}

interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  error: string | null;
}

const DEBOUNCE_DELAY = 300;

// Static pages for navigation
const staticPages: SearchResult[] = [
  { type: 'page', id: 'page-dashboard', title: 'Dashboard', subtitle: 'Portfolio overview', href: '/' },
  { type: 'page', id: 'page-portfolio', title: 'Portfolio', subtitle: 'Holdings & allocation', href: '/portfolio' },
  { type: 'page', id: 'page-transactions', title: 'Transactions', subtitle: 'Transaction history', href: '/transactions' },
  { type: 'page', id: 'page-analytics', title: 'Analytics', subtitle: 'Performance metrics', href: '/analytics' },
  { type: 'page', id: 'page-ff', title: 'Financial Freedom', subtitle: 'FIRE progress tracker', href: '/ff' },
  { type: 'page', id: 'page-fire', title: 'FIRE Calculator', subtitle: 'Calculate your FIRE number', href: '/ff/fire-calculator' },
  { type: 'page', id: 'page-trading', title: 'Trading Summary', subtitle: 'Trading performance', href: '/trading' },
  { type: 'page', id: 'page-journal', title: 'Trading Journal', subtitle: 'Log your trades', href: '/trading/journal' },
  { type: 'page', id: 'page-performance', title: 'Trading Performance', subtitle: 'Strategy analytics', href: '/trading/performance' },
  { type: 'page', id: 'page-settings', title: 'Settings', subtitle: 'App preferences', href: '/settings' },
  { type: 'page', id: 'page-account', title: 'Account Settings', subtitle: 'Profile & security', href: '/settings/account' },
];

function searchAssets(query: string): SearchResult[] {
  const lowerQuery = query.toLowerCase();
  return demoAssets
    .filter(asset => 
      asset.symbol.toLowerCase().includes(lowerQuery) ||
      asset.name.toLowerCase().includes(lowerQuery)
    )
    .slice(0, 5)
    .map(asset => ({
      type: 'asset' as const,
      id: asset.id,
      title: asset.symbol,
      subtitle: asset.name,
      value: `$${asset.currentPrice.toLocaleString()}`,
      href: `/asset/${asset.symbol}`,
      metadata: { priceChange: asset.priceChange24h }
    }));
}

function searchPortfolios(query: string): SearchResult[] {
  const lowerQuery = query.toLowerCase();
  const portfolios = [demoPortfolio]; // In real app, fetch from API
  
  return portfolios
    .filter(p => 
      p.name.toLowerCase().includes(lowerQuery) ||
      (p.description?.toLowerCase().includes(lowerQuery))
    )
    .map(p => ({
      type: 'portfolio' as const,
      id: p.id,
      title: p.name,
      subtitle: p.description || 'Portfolio',
      href: '/portfolio',
      metadata: { currency: p.currency }
    }));
}

function searchTransactions(query: string): SearchResult[] {
  const lowerQuery = query.toLowerCase();
  return demoTransactions
    .filter(tx => 
      tx.assetSymbol.toLowerCase().includes(lowerQuery) ||
      tx.assetName.toLowerCase().includes(lowerQuery) ||
      tx.type.toLowerCase().includes(lowerQuery) ||
      (tx.notes?.toLowerCase().includes(lowerQuery))
    )
    .slice(0, 5)
    .map(tx => ({
      type: 'transaction' as const,
      id: tx.id,
      title: `${tx.type} ${tx.assetSymbol}`,
      subtitle: tx.notes || `${tx.quantity} @ $${tx.price.toLocaleString()}`,
      value: `$${tx.totalAmount.toLocaleString()}`,
      href: '/transactions',
      metadata: { date: tx.date, type: tx.type }
    }));
}

function searchPages(query: string): SearchResult[] {
  const lowerQuery = query.toLowerCase();
  return staticPages.filter(page => 
    page.title.toLowerCase().includes(lowerQuery) ||
    (page.subtitle?.toLowerCase().includes(lowerQuery))
  );
}

function performSearch(query: string): SearchResult[] {
  if (!query.trim()) return [];
  
  const assets = searchAssets(query);
  const portfolios = searchPortfolios(query);
  const transactions = searchTransactions(query);
  const pages = searchPages(query);
  
  return [...assets, ...portfolios, ...transactions, ...pages];
}

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    isLoading: false,
    error: null,
  });

  const setQuery = useCallback((query: string) => {
    setState(prev => ({ ...prev, query, isLoading: query.length > 0 }));
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!state.query.trim()) {
      setState(prev => ({ ...prev, results: [], isLoading: false }));
      return;
    }

    const timeoutId = setTimeout(() => {
      try {
        const results = performSearch(state.query);
        setState(prev => ({ ...prev, results, isLoading: false, error: null }));
      } catch (err) {
        setState(prev => ({ 
          ...prev, 
          results: [], 
          isLoading: false, 
          error: 'Search failed. Please try again.' 
        }));
      }
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [state.query]);

  // Grouped results for UI
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {
      assets: [],
      portfolios: [],
      transactions: [],
      pages: [],
    };

    state.results.forEach(result => {
      switch (result.type) {
        case 'asset':
          groups.assets.push(result);
          break;
        case 'portfolio':
          groups.portfolios.push(result);
          break;
        case 'transaction':
          groups.transactions.push(result);
          break;
        case 'page':
          groups.pages.push(result);
          break;
      }
    });

    return groups;
  }, [state.results]);

  const hasResults = state.results.length > 0;
  const isEmpty = !state.isLoading && state.query.trim() && !hasResults;

  return {
    query: state.query,
    setQuery,
    results: state.results,
    groupedResults,
    isLoading: state.isLoading,
    error: state.error,
    hasResults,
    isEmpty,
    clear: () => setState({ query: '', results: [], isLoading: false, error: null }),
  };
}
