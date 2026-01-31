# State Management

## Overview

State management menggunakan kombinasi:
1. **Zustand** - Client-side global state
2. **React Query** - Server state & caching
3. **React Context** - Component-scoped state
4. **localStorage** - Persistence

## Zustand Store

### App Store (`src/store/app-store.ts`)

```typescript
interface AppState {
  // Currency Configuration
  currencyPair: { base: string; quote: string };
  currency: 'USD' | 'IDR';
  exchangeRate: number;
  setCurrencyPair: (pair: CurrencyPair) => void;
  setCurrency: (currency: Currency) => void;
  setExchangeRate: (rate: number) => void;
  
  // Notifications
  notifications: Notification[];
  addNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  unreadCount: () => number;
  
  // Search / Command Palette
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
```

### Persistence

```typescript
// Persisted to localStorage
persist(
  (set, get) => ({ /* state */ }),
  {
    name: 'trading-app-storage',
    partialize: (state) => ({
      currencyPair: state.currencyPair,
      currency: state.currency,
      notifications: state.notifications,
    }),
  }
)
```

### Usage

```tsx
import { useAppStore } from '@/store/app-store';

function Component() {
  const { currency, setCurrency, notifications, addNotification } = useAppStore();
  
  const handleChange = () => {
    setCurrency('IDR');
    addNotification({
      type: 'system',
      title: 'Currency Changed',
      message: 'Currency set to IDR',
    });
  };
}
```

## React Query

### Query Client Setup

```typescript
// src/App.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 minutes
      gcTime: 30 * 60 * 1000,       // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Query Key Conventions

```typescript
// Pattern: [domain, ...identifiers, options?]

// Accounts
['accounts']
['accounts', accountId]
['trading-accounts']
['account-transactions', accountId]
['balance-snapshots', accountId]

// Trades
['trade-entries', userId]
['trade-entries', userId, { status: 'open' }]
['trade-entry', tradeId]

// Strategies
['trading-strategies', userId]
['trading-strategy', strategyId]
['shared-strategy', shareToken]
['backtest-results', strategyId]

// Binance (real-time data)
['binance', 'connection-status']
['binance', 'balance']
['binance', 'positions']
['binance', 'positions', symbol]
['binance', 'trades', symbol]
['binance', 'income', { days: 7, incomeType: 'REALIZED_PNL' }]
['binance', 'daily-pnl']
['binance', 'weekly-pnl']
['binance', 'commission-rate', symbol]
['binance', 'leverage-brackets']
['binance', 'adl-quantile']

// Risk
['risk-profile', userId]
['risk-events', userId]
['daily-risk-snapshot', userId, date]

// Market
['market-sentiment']
['market-insight', symbol]
['unified-market-score', symbol]
['economic-calendar', { startDate, endDate }]
['top-movers']

// AI
['ai-preflight', { pair, direction, ... }]
['trade-quality', tradeId]
['dashboard-insights', userId]
['confluence-detection', params]

// User
['user-settings', userId]
['notifications', userId]
```

### Query Invalidation Patterns

```typescript
// After trade creation
queryClient.invalidateQueries({ queryKey: ['trade-entries'] });
queryClient.invalidateQueries({ queryKey: ['binance', 'positions'] });

// After account update
queryClient.invalidateQueries({ queryKey: ['accounts'] });
queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });

// After strategy change
queryClient.invalidateQueries({ queryKey: ['trading-strategies'] });
```

### Stale Time Configuration

```typescript
// Real-time data (short stale time)
useQuery({
  queryKey: ['binance', 'positions'],
  staleTime: 10 * 1000,  // 10 seconds
});

// Reference data (long stale time)
useQuery({
  queryKey: ['trading-pairs'],
  staleTime: 60 * 60 * 1000,  // 1 hour
});

// Market sentiment (medium stale time)
useQuery({
  queryKey: ['market-sentiment'],
  staleTime: 5 * 60 * 1000,  // 5 minutes
});
```

## React Context

### MarketContext

**Purpose**: Global symbol selection shared across pages.

```typescript
// src/contexts/MarketContext.tsx
interface MarketContextState {
  selectedSymbol: string;
  watchlist: string[];
  setSelectedSymbol: (symbol: string) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  clearWatchlist: () => void;
}

// Persisted to localStorage
const STORAGE_KEY = 'trading-journey-market-context';
```

**Usage**:
```tsx
import { useMarketContext } from '@/contexts/MarketContext';

function SymbolSelector() {
  const { selectedSymbol, setSelectedSymbol, watchlist } = useMarketContext();
  
  return (
    <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
      {watchlist.map(symbol => (
        <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
      ))}
    </Select>
  );
}
```

### ThemeProvider

**Purpose**: Dark/light mode management.

```tsx
<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
  {children}
</ThemeProvider>
```

## Realtime Subscriptions

### useRealtime Hook

```typescript
// src/hooks/use-realtime.ts
function useRealtime({ tables, enabled }: UseRealtimeOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!enabled || !user?.id) return;

    const channel = supabase.channel(`realtime-${user.id}`);

    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate relevant queries
          switch (table) {
            case 'accounts':
              queryClient.invalidateQueries({ queryKey: ['accounts'] });
              break;
            case 'trade_entries':
              queryClient.invalidateQueries({ queryKey: ['trade-entries'] });
              break;
            // ...
          }
        }
      );
    });

    channel.subscribe();
    return () => supabase.removeChannel(channel);
  }, [enabled, user?.id, tables]);
}
```

### Subscribed Tables

| Table | Triggers Invalidation |
|-------|----------------------|
| `accounts` | accounts, trading-accounts |
| `account_transactions` | account-transactions, accounts |
| `trade_entries` | trade-entries |
| `trading_strategies` | trading-strategies |

## Data Flow Diagram

```
User Action
    │
    ▼
┌─────────────────────────┐
│   React Component       │
│   (useState for local)  │
└────────────┬────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐    ┌─────────────┐
│ Zustand │    │ React Query │
│ (UI)    │    │ (Server)    │
└────┬────┘    └──────┬──────┘
     │                │
     │                ▼
     │         ┌─────────────┐
     │         │ Supabase    │
     │         │ Edge Func   │
     │         └──────┬──────┘
     │                │
     │                ▼
     │         ┌─────────────┐
     │         │ Database /  │
     │         │ Binance API │
     │         └─────────────┘
     │
     ▼
┌─────────────────────────┐
│   localStorage          │
│   (Persistence)         │
└─────────────────────────┘
```

## Best Practices

### 1. Query Key Consistency
```typescript
// Always use consistent key structure
['domain', identifier, options]
```

### 2. Optimistic Updates
```typescript
useMutation({
  onMutate: async (newData) => {
    await queryClient.cancelQueries({ queryKey: ['items'] });
    const previous = queryClient.getQueryData(['items']);
    queryClient.setQueryData(['items'], (old) => [...old, newData]);
    return { previous };
  },
  onError: (err, newData, context) => {
    queryClient.setQueryData(['items'], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
  },
});
```

### 3. Selective Subscription
```typescript
// Only subscribe to what you need
const { notifications } = useAppStore(
  (state) => ({ notifications: state.notifications })
);
```

### 4. Query Enabled Pattern
```typescript
useQuery({
  queryKey: ['user-data', userId],
  queryFn: fetchUserData,
  enabled: !!userId,  // Only run when userId exists
});
```
