/**
 * MarketContext - Global symbol selection context
 * Shared across Market Data, Calculator, Trade Entry pages
 * Persisted in localStorage
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

interface MarketContextState {
  selectedSymbol: string;
  watchlist: string[];
  setSelectedSymbol: (symbol: string) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  clearWatchlist: () => void;
}

const STORAGE_KEY = 'trading-journey-market-context';
const DEFAULT_SYMBOL = 'BTCUSDT';
const DEFAULT_WATCHLIST = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

const MarketContext = createContext<MarketContextState | null>(null);

export function MarketContextProvider({ children }: { children: ReactNode }) {
  const [selectedSymbol, setSelectedSymbolState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_SYMBOL;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.selectedSymbol || DEFAULT_SYMBOL;
      } catch {
        return DEFAULT_SYMBOL;
      }
    }
    return DEFAULT_SYMBOL;
  });

  const [watchlist, setWatchlist] = useState<string[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_WATCHLIST;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.watchlist || DEFAULT_WATCHLIST;
      } catch {
        return DEFAULT_WATCHLIST;
      }
    }
    return DEFAULT_WATCHLIST;
  });

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      selectedSymbol,
      watchlist,
    }));
  }, [selectedSymbol, watchlist]);

  const setSelectedSymbol = useCallback((symbol: string) => {
    setSelectedSymbolState(symbol);
  }, []);

  const addToWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => {
      if (prev.includes(symbol)) return prev;
      return [...prev, symbol];
    });
  }, []);

  const removeFromWatchlist = useCallback((symbol: string) => {
    setWatchlist(prev => prev.filter(s => s !== symbol));
  }, []);

  const clearWatchlist = useCallback(() => {
    setWatchlist(DEFAULT_WATCHLIST);
  }, []);

  return (
    <MarketContext.Provider value={{
      selectedSymbol,
      watchlist,
      setSelectedSymbol,
      addToWatchlist,
      removeFromWatchlist,
      clearWatchlist,
    }}>
      {children}
    </MarketContext.Provider>
  );
}

export function useMarketContext() {
  const context = useContext(MarketContext);
  if (!context) {
    throw new Error('useMarketContext must be used within a MarketContextProvider');
  }
  return context;
}

// Optional hook that doesn't throw - for pages that may or may not be wrapped
export function useMarketContextOptional() {
  return useContext(MarketContext);
}
