/**
 * Global App Store using Zustand
 * Handles UI state: currency, notifications, search
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Currency = 'USD' | 'IDR';

export interface CurrencyPair {
  base: string;
  quote: string;
}

export interface Notification {
  id: string;
  type: 'price_alert' | 'transaction' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  assetSymbol?: string;
}

interface AppState {
  // Currency pair
  currencyPair: CurrencyPair;
  setCurrencyPair: (pair: CurrencyPair) => void;
  
  // Legacy currency support
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  
  // Exchange rate (USD to IDR)
  exchangeRate: number;
  setExchangeRate: (rate: number) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  unreadCount: () => number;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  
  // AI Chatbot
  isChatbotOpen: boolean;
  setChatbotOpen: (open: boolean) => void;
  chatbotInitialPrompt: string | null;
  setChatbotInitialPrompt: (prompt: string | null) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Currency pair
      currencyPair: { base: 'USD', quote: 'IDR' },
      setCurrencyPair: (pair) => set({ currencyPair: pair }),
      
      // Legacy currency support
      currency: 'USD',
      setCurrency: (currency) => set({ currency }),
      
      // Exchange rate
      exchangeRate: 15800, // Default USD to IDR
      setExchangeRate: (rate) => set({ exchangeRate: rate }),
      
      // Notifications
      notifications: [],
      addNotification: (notification) => set((state) => ({
        notifications: [
          {
            ...notification,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date(),
            read: false,
          },
          ...state.notifications,
        ],
      })),
      markAsRead: (id) => set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
      })),
      markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
      })),
      clearNotifications: () => set({ notifications: [] }),
      unreadCount: () => get().notifications.filter((n) => !n.read).length,
      
      // Search
      searchQuery: '',
      setSearchQuery: (query) => set({ searchQuery: query }),
      isSearchOpen: false,
      setSearchOpen: (open) => set({ isSearchOpen: open }),
      
      // AI Chatbot
      isChatbotOpen: false,
      setChatbotOpen: (open) => set({ isChatbotOpen: open }),
      chatbotInitialPrompt: null,
      setChatbotInitialPrompt: (prompt) => set({ chatbotInitialPrompt: prompt }),
    }),
    {
      name: 'trading-app-storage',
      partialize: (state) => ({
        currencyPair: state.currencyPair,
        currency: state.currency,
        notifications: state.notifications,
      }),
    }
  )
);

// Helper to convert currency
export function convertCurrency(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRate: number
): number {
  if (fromCurrency === toCurrency) return amount;
  if (fromCurrency === 'USD' && toCurrency === 'IDR') return amount * exchangeRate;
  if (fromCurrency === 'IDR' && toCurrency === 'USD') return amount / exchangeRate;
  return amount;
}
