# API Service Abstraction Layer

**Last Updated:** 2026-02-16

## Overview

The API Service Layer (`src/services/api/`) provides a clean abstraction between the frontend and backend implementation. It uses an **Interface + Implementation** pattern that allows swapping the backend (Supabase → REST API → GraphQL, etc.) without changing any hooks or components.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND LAYER                              │
│                                                                  │
│  React Components → Custom Hooks → Service Registry (singleton)  │
│                                                                  │
│  import { services } from '@/services/api';                      │
│  const result = await services.trades.getAll(userId);            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   SERVICE INTERFACES                             │
│                                                                  │
│  IAuthService       │ ICredentialService  │ ITradeService        │
│  IUserSettingsService │ IMarketDataService                      │
│                                                                  │
│  ✦ TypeScript interfaces define the CONTRACT                     │
│  ✦ No implementation details leak to consumers                   │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              IMPLEMENTATION LAYER (Swappable)                    │
│                                                                  │
│  SupabaseAuthService        │  SupabaseCredentialService         │
│  SupabaseTradeService       │  SupabaseUserSettingsService       │
│  SupabaseMarketDataService  │                                    │
│                                                                  │
│  ✦ Concrete classes implementing interfaces                      │
│  ✦ Supabase SDK calls, Edge Function invocations                 │
│  ✦ Row mapping (snake_case → camelCase)                          │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/services/api/
├── index.ts                   # Service Registry (factory + singleton)
├── types.ts                   # Shared response types
├── auth.service.ts            # IAuthService + SupabaseAuthService
├── credentials.service.ts     # ICredentialService + SupabaseCredentialService
├── trades.service.ts          # ITradeService + SupabaseTradeService
├── user-settings.service.ts   # IUserSettingsService + SupabaseUserSettingsService
└── market-data.service.ts     # IMarketDataService + SupabaseMarketDataService
```

## Service Registry

Central factory that creates and exports all service instances:

```typescript
import { services } from '@/services/api';

// Usage in hooks:
const result = await services.credentials.getStatus('binance');
const trades = await services.trades.getAll(userId);
const session = await services.auth.getSession();
```

### Registry Interface

```typescript
interface ServiceRegistry {
  credentials: ICredentialService;
  trades: ITradeService;
  auth: IAuthService;
  userSettings: IUserSettingsService;
  marketData: IMarketDataService;
}
```

## Shared Types

```typescript
// Unified response wrapper
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Paginated response
interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// User abstraction (decoupled from Supabase auth.users)
interface ServiceUser {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

// Session abstraction
interface ServiceSession {
  accessToken: string;
  user: ServiceUser;
}
```

## Service Interfaces

### IAuthService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `getSession()` | — | `ServiceSession` | Get current authenticated session |
| `signUp()` | email, password, fullName | `ServiceUser` | Register new user |
| `signIn()` | email, password | `ServiceSession` | Email/password login |
| `signInWithGoogle()` | — | `void` | OAuth Google login |
| `signOut()` | — | `void` | Sign out |
| `resetPassword()` | email | `void` | Send password reset email |
| `updatePassword()` | newPassword | `void` | Update password |
| `onAuthStateChange()` | callback | `() => void` | Subscribe to auth events (returns unsubscribe) |

### ICredentialService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `getStatus()` | exchange | `CredentialStatus` | Get masked credential info |
| `save()` | `SaveCredentialParams` | `string` (id) | Save new API credentials |
| `delete()` | credentialId | `boolean` | Deactivate credentials |
| `testConnection()` | accessToken | `ConnectionTestResult` | Test API key validity |

**Types:**
```typescript
interface CredentialStatus {
  id: string;
  exchange: string;
  label: string;
  apiKeyMasked: string;
  isValid: boolean | null;
  permissions: Record<string, unknown> | null;
  lastValidatedAt: string | null;
  createdAt: string;
}

interface SaveCredentialParams {
  apiKey: string;
  apiSecret: string;
  label?: string;
  exchange?: string;
}

interface ConnectionTestResult {
  success: boolean;
  permissions?: Record<string, unknown>;
}
```

### ITradeService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `getAll()` | userId | `TradeEntry[]` | Get all trades for user |
| `create()` | userId, `CreateTradeInput` | `TradeEntry` | Create new trade |
| `update()` | userId, `UpdateTradeInput` | `TradeEntry` | Update trade fields |
| `delete()` | tradeId | `boolean` | Delete trade |
| `closePosition()` | `ClosePositionInput` | `TradeEntry` | Close open position |
| `getStats()` | userId, `TradeStatsFilters` | `TradeStats` | Get aggregated statistics |

**Types:**
```typescript
interface TradeEntry {
  id: string;
  userId: string;
  tradingAccountId: string | null;
  pair: string;
  direction: string;
  entryPrice: number;
  exitPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  quantity: number;
  pnl: number | null;
  fees: number | null;
  confluenceScore: number | null;
  tradeDate: string;
  result: string | null;
  status: 'open' | 'closed';
  realizedPnl: number | null;
  source: string | null;
  tradeMode: string | null;
  notes: string | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

interface TradeStats {
  totalTrades: number;
  totalPnlGross: number;
  totalPnlNet: number;
  totalFees: number;
  totalCommission: number;
  totalFundingFees: number;
  winCount: number;
  lossCount: number;
  breakevenCount: number;
  winRate: number;
  avgPnlPerTrade: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

interface TradeStatsFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  source?: string;
  pairs?: string[];
  direction?: string;
  strategyIds?: string[];
  session?: string;
  tradeMode?: string;
  accountId?: string;
}
```

### IUserSettingsService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `getSettings()` | userId | `UserSettings` | Get user preferences |
| `updateSettings()` | userId, updates | `UserSettings` | Update preferences |
| `getProfile()` | userId | `UserProfile` | Get user profile |
| `updateProfile()` | userId, updates | `UserProfile` | Update profile |
| `uploadAvatar()` | userId, File | `string` (url) | Upload avatar image |

**Types:**
```typescript
interface UserSettings {
  id: string;
  userId: string;
  defaultCurrency: string;
  theme: string;
  language: string;
  notificationsEnabled: boolean;
  subscriptionPlan: string;
  subscriptionStatus: string;
  activeTradeMode: string;
  activeTradingStyle: string;
  useBinanceHistory: boolean;
  binanceDailySyncQuota: number;
  tradeRetentionDays: number | null;
  defaultTradingAccountId: string | null;
  aiSettings: Record<string, boolean | number | string> | null;
}

interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  preferredCurrency: string;
}
```

### IMarketDataService

| Method | Input | Output | Description |
|--------|-------|--------|-------------|
| `getTicker()` | symbol | `TickerData` | Get 24hr ticker for symbol |
| `getTickers()` | symbols[] | `TickerData[]` | Get multiple tickers |
| `getKlines()` | symbol, interval, limit? | `KlineData[]` | Get candlestick data |
| `getFundingRate()` | symbol | `FundingRateData` | Get current funding rate |
| `getOpenInterest()` | symbol | `OpenInterestData` | Get open interest data |

**Types:**
```typescript
interface TickerData {
  symbol: string;
  price: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  high: number;
  low: number;
}

interface KlineData {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}
```

## Backend Migration Guide

### Step 1: Create New Implementation

```typescript
// src/services/api/rest-trades.service.ts
export class RestTradeService implements ITradeService {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async getAll(userId: string): Promise<ApiResponse<TradeEntry[]>> {
    const response = await fetch(`${this.baseUrl}/trades?userId=${userId}`);
    const data = await response.json();
    return { data, error: null };
  }

  async create(userId: string, input: CreateTradeInput): Promise<ApiResponse<TradeEntry>> {
    const response = await fetch(`${this.baseUrl}/trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, ...input }),
    });
    const data = await response.json();
    return { data, error: null };
  }

  // ... implement remaining methods
}
```

### Step 2: Swap in Service Registry

```typescript
// src/services/api/index.ts
import { RestTradeService } from './rest-trades.service';

function createServiceRegistry(): ServiceRegistry {
  return {
    credentials: new RestCredentialService(API_URL),
    trades: new RestTradeService(API_URL),         // ← Swapped!
    auth: new RestAuthService(API_URL),
    userSettings: new RestUserSettingsService(API_URL),
    marketData: new RestMarketDataService(API_URL),
  };
}
```

### Step 3: No Changes Needed in Hooks/Components

All hooks and components continue to work because they depend on the **interface**, not the implementation.

## Data Mapping Convention

All service implementations handle the mapping between backend format (snake_case) and frontend format (camelCase):

```
Backend (Supabase)           Service Layer              Frontend (React)
─────────────────           ─────────────              ─────────────────
user_id          →    mapTradeRow()     →    userId
entry_price      →                     →    entryPrice
trading_account_id →                   →    tradingAccountId
realized_pnl     →                     →    realizedPnl
```

This ensures that consumers never deal with backend-specific naming conventions.

## Error Handling

All services return `ApiResponse<T>` which always has:
- `data: T | null` — the result if successful
- `error: string | null` — error message if failed

```typescript
const result = await services.trades.getAll(userId);
if (result.error) {
  console.error('Failed:', result.error);
  return;
}
// result.data is guaranteed to be non-null here
```

## Future Services to Add

| Domain | Interface | Priority |
|--------|-----------|----------|
| Strategy | `IStrategyService` | High |
| Risk | `IRiskService` | High |
| Backtest | `IBacktestService` | Medium |
| Notification | `INotificationService` | Medium |
| Analytics | `IAnalyticsService` | Low |
| Account | `IAccountService` | Low |
