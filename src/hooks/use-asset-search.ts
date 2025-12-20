import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface SearchedAsset {
  id: string;
  symbol: string;
  name: string;
  type: 'CRYPTO' | 'US_STOCK' | 'ID_STOCK';
  logo_url?: string;
  // External IDs for price fetching
  coingecko_id?: string;
  finnhub_symbol?: string;
  fcs_symbol?: string;
  alpha_symbol?: string;
}

// CoinGecko API search
async function searchCoinGecko(query: string): Promise<SearchedAsset[]> {
  if (!query || query.length < 2) return [];
  
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return (data.coins || []).slice(0, 10).map((coin: any) => ({
      id: `coingecko-${coin.id}`,
      symbol: coin.symbol?.toUpperCase() || '',
      name: coin.name || '',
      type: 'CRYPTO' as const,
      logo_url: coin.large || coin.thumb,
      coingecko_id: coin.id,
    }));
  } catch (error) {
    console.error('CoinGecko search error:', error);
    return [];
  }
}

// Finnhub stock search (free tier has limitations)
async function searchFinnhub(query: string): Promise<SearchedAsset[]> {
  if (!query || query.length < 2) return [];
  
  try {
    // Using a public endpoint for stock symbol lookup
    // Note: For production, you'd use Finnhub API with API key
    const response = await fetch(
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=demo`
    );
    
    if (!response.ok) return [];
    
    const data = await response.json();
    
    return (data.bestMatches || []).slice(0, 10).map((match: any) => ({
      id: `stock-${match['1. symbol']}`,
      symbol: match['1. symbol'] || '',
      name: match['2. name'] || '',
      type: (match['4. region'] === 'Indonesia' ? 'ID_STOCK' : 'US_STOCK') as 'US_STOCK' | 'ID_STOCK',
      finnhub_symbol: match['1. symbol'],
      alpha_symbol: match['1. symbol'],
    }));
  } catch (error) {
    console.error('Stock search error:', error);
    return [];
  }
}

export function useAssetSearch(searchQuery: string, assetType: 'CRYPTO' | 'STOCK' | 'ALL' = 'ALL') {
  return useQuery({
    queryKey: ['asset-search', searchQuery, assetType],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      
      const results: SearchedAsset[] = [];
      
      if (assetType === 'CRYPTO' || assetType === 'ALL') {
        const cryptoResults = await searchCoinGecko(searchQuery);
        results.push(...cryptoResults);
      }
      
      if (assetType === 'STOCK' || assetType === 'ALL') {
        const stockResults = await searchFinnhub(searchQuery);
        results.push(...stockResults);
      }
      
      return results;
    },
    enabled: searchQuery.length >= 2,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDebouncedSearch() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  
  const updateSearch = useCallback((term: string) => {
    setSearchTerm(term);
    
    const timeoutId = setTimeout(() => {
      setDebouncedTerm(term);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, []);
  
  return { searchTerm, debouncedTerm, updateSearch, setSearchTerm };
}
