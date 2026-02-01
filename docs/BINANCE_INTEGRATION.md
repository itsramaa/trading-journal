# Binance Futures Integration

## Overview

Binance Futures API adalah **Source of Truth** untuk:
- Wallet balance
- Open positions
- Trade history (REALIZED_PNL)
- Income records (fees, funding, rebates)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────►│  Edge Function  │────►│  Binance API    │
│   (React)       │     │  (binance-*)    │     │  (fapi.binance) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       
        │ JWT Token             │ Per-User              
        │ React Query           │ HMAC Signature        
        ▼                       ▼                       
┌─────────────────┐     ┌─────────────────┐
│   Local State   │     │ exchange_       │
│   (Zustand)     │     │ credentials     │
└─────────────────┘     └─────────────────┘
                              │
                              │ Per-user API keys
                              ▼
                        ┌─────────────────┐
                        │   PostgreSQL    │
                        │   (Supabase)    │
                        └─────────────────┘
```

### Authentication Flow

```
1. User saves API keys in Settings
        │
        ▼
2. Credentials stored in exchange_credentials table (per-user)
        │
        ▼
3. Frontend sends request with JWT token
        │
        ▼
4. Edge Function:
   ├─ Verifies JWT
   ├─ Looks up per-user credentials
   ├─ Creates HMAC signature
   └─ Forwards to Binance
        │
        ▼
5. Response returned to frontend
```

## Edge Functions

### binance-futures (Authenticated)

**Base URL**: `https://fapi.binance.com`

**Supported Actions**:

| Action | Binance Endpoint | Description |
|--------|------------------|-------------|
| `validate` | `/fapi/v2/account` | Validate credentials |
| `balance` | `/fapi/v2/balance` | Wallet balance |
| `positions` | `/fapi/v2/positionRisk` | Open positions |
| `trades` | `/fapi/v1/userTrades` | Trade history |
| `open-orders` | `/fapi/v1/openOrders` | Pending orders |
| `income` | `/fapi/v1/income` | Income history |
| `commission-rate` | `/fapi/v1/commissionRate` | Fee rates |
| `leverage-brackets` | `/fapi/v1/leverageBracket` | Leverage tiers |
| `force-orders` | `/fapi/v1/forceOrders` | Liquidations |
| `position-mode` | `/fapi/v1/positionSide/dual` | Hedge mode |
| `all-orders` | `/fapi/v1/allOrders` | All orders |
| `adl-quantile` | `/fapi/v1/adlQuantile` | ADL risk |
| `symbol-config` | (computed) | Symbol settings |
| `transaction-history` | `/fapi/v1/income` (TRANSFER) | Transfers |
| `request-download` | `/fapi/v1/income/asyn` | CSV export |
| `get-download` | `/fapi/v1/income/asyn/id` | Export status |

### binance-market-data (Public)

No authentication required.

| Action | Description |
|--------|-------------|
| `top-trader-ratio` | Long/short ratio |
| `open-interest` | Open interest |
| `taker-volume` | Buy/sell volume |
| `funding-rate` | Funding rates |
| `klines` | Candlestick data |
| `ticker-24hr` | 24hr stats |
| `historical-volatility` | Volatility |
| `top-movers` | Price leaders |

## HMAC SHA256 Signature

```typescript
async function createSignature(
  queryString: string, 
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  
  // Import key
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  // Sign query string
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(queryString)
  );
  
  // Convert to hex
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

## Data Types

### BinanceAccountSummary
```typescript
interface BinanceAccountSummary {
  totalWalletBalance: number;
  availableBalance: number;
  totalUnrealizedProfit: number;
  totalMarginBalance: number;
  assets: BinanceBalance[];
}
```

### BinancePosition
```typescript
interface BinancePosition {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  markPrice: number;
  unrealizedProfit: number;
  liquidationPrice: number;
  leverage: number;
  marginType: 'isolated' | 'cross';
  isolatedMargin: number;
  isAutoAddMargin: boolean;
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  notional: number;
  updateTime: number;
}
```

### BinanceTrade
```typescript
interface BinanceTrade {
  id: number;
  symbol: string;
  orderId: number;
  side: 'BUY' | 'SELL';
  price: number;
  qty: number;
  realizedPnl: number;
  marginAsset: string;
  quoteQty: number;
  commission: number;
  commissionAsset: string;
  time: number;
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
  maker: boolean;
  buyer: boolean;
}
```

### BinanceIncome
```typescript
interface BinanceIncome {
  symbol: string;
  incomeType: BinanceIncomeType;
  income: number;
  asset: string;
  time: number;
  tranId: number;
  tradeId: string | null;
  info: string;
}
```

## Income Types

### Category Mapping

```typescript
type IncomeTypeCategory = 'pnl' | 'fees' | 'funding' | 'transfers' | 'rewards' | 'other';

function getIncomeTypeCategory(type: string): IncomeTypeCategory {
  switch (type) {
    case 'REALIZED_PNL':
      return 'pnl';
    case 'COMMISSION':
      return 'fees';
    case 'FUNDING_FEE':
      return 'funding';
    case 'TRANSFER':
    case 'INTERNAL_TRANSFER':
    case 'COIN_SWAP_DEPOSIT':
    case 'COIN_SWAP_WITHDRAW':
      return 'transfers';
    case 'WELCOME_BONUS':
    case 'REFERRAL_KICKBACK':
    case 'COMMISSION_REBATE':
    case 'API_REBATE':
    case 'CONTEST_REWARD':
      return 'rewards';
    default:
      return 'other';
  }
}
```

### Trade Sync Rule

**CRITICAL**: Hanya `REALIZED_PNL` yang di-sync sebagai trade entry.

```typescript
const TRADE_INCOME_TYPES = ['REALIZED_PNL'] as const;

// Filter for trade sync
const tradesToSync = incomeRecords.filter(
  r => TRADE_INCOME_TYPES.includes(r.incomeType)
);
```

## Frontend Hooks

### Connection & Balance
```typescript
// Check connection status
const { data: status } = useBinanceConnectionStatus();

// Get balance
const { data: balance } = useBinanceBalance();
```

### Positions
```typescript
// Get all positions
const { data: positions } = useBinancePositions();

// Get specific symbol
const { data: btcPosition } = useBinancePositions('BTCUSDT');
```

### Income History
```typescript
// Get all income (7 days)
const { data: income } = useBinanceIncomeHistory(7);

// Get specific type
const { data: pnl } = useBinanceIncomeHistory(7, 'REALIZED_PNL');

// Get all income with aggregation
const { data: allIncome } = useBinanceAllIncome(30);
```

### P&L Hooks
```typescript
// Daily P&L with breakdown
const { 
  grossPnl, 
  totalCommission, 
  totalFunding, 
  netPnl,
  bySymbol 
} = useBinanceDailyPnl();

// Weekly P&L
const { weeklyStats } = useBinanceWeeklyPnl();

// Week-over-week comparison
const { comparison } = useBinanceWeekComparison();
```

### Advanced Data
```typescript
// Commission rates
const { data: rates } = useBinanceCommissionRate('BTCUSDT');

// Leverage brackets
const { data: brackets } = useBinanceLeverageBrackets();

// ADL quantile
const { data: adl } = useBinanceAdlQuantile();

// Volatility data
const { data: vol } = useBinanceVolatility('BTCUSDT');
```

## Auto-Sync Flow

```
┌─────────────────┐
│ useBinanceAutoSync │
└────────┬────────┘
         │ poll every 5 min
         ▼
┌─────────────────┐
│ Fetch Income    │
│ (REALIZED_PNL)  │
└────────┬────────┘
         │ filter new
         ▼
┌─────────────────┐
│ Map to trade_entries │
│ with binance_trade_id │
└────────┬────────┘
         │ upsert
         ▼
┌─────────────────┐
│ Supabase DB     │
└─────────────────┘
```

### Mapping Logic

```typescript
function mapIncomeToTradeEntry(income: BinanceIncome) {
  return {
    pair: income.symbol,
    direction: income.income > 0 ? 'LONG' : 'SHORT', // inferred
    realized_pnl: income.income,
    source: 'binance',
    binance_trade_id: income.tradeId || `${income.tranId}`,
    trade_date: new Date(income.time).toISOString().split('T')[0],
    status: 'closed',
    // Note: entry_price, exit_price not available from income endpoint
  };
}
```

## Net P&L Calculation

```typescript
interface BinanceIncomeAggregated {
  summary: {
    grossPnl: number;      // Sum of REALIZED_PNL
    totalFees: number;     // Sum of COMMISSION (negative)
    totalFunding: number;  // Sum of FUNDING_FEE (+/-)
    totalRebates: number;  // Sum of REBATES (positive)
    netPnl: number;        // grossPnl - fees + funding + rebates
  };
  byType: Record<string, { total: number; count: number }>;
  bySymbol: Record<string, { pnl: number; fees: number; funding: number }>;
}

// Calculation
const netPnl = grossPnl - totalCommission + totalFunding + totalRebates;
```

## Error Handling

### Common Binance Error Codes

| Code | Description | Action |
|------|-------------|--------|
| -1001 | Disconnected | Retry |
| -1002 | Unauthorized | Check API key |
| -1003 | Rate limit | Backoff |
| -1021 | Invalid timestamp | Sync clock |
| -2014 | Invalid API key | Re-enter key |
| -2015 | Invalid signature | Check secret |
| -4061 | Order would reduce | Check position |

### Error Response Format

```typescript
{
  success: false,
  error: "Error message from Binance",
  code: -1001
}
```

## Rate Limits

- **Weight**: Most endpoints use 5-20 weight
- **Limit**: 1200 weight per minute
- **Orders**: 10 orders per second, 100,000 per day

### Best Practices

1. Cache responses with React Query
2. Use appropriate stale times
3. Batch requests where possible
4. Handle rate limit errors gracefully

## Security

### API Key Architecture

Sistem menggunakan **per-user credential storage** di database:

```
┌─────────────────────────────────────────────────────────────┐
│              exchange_credentials table                      │
│                                                              │
│  user_id | exchange | api_key_encrypted | api_secret_encrypted │
│  --------|----------|-------------------|---------------------|
│  user_1  | binance  | enc(api_key)      | enc(api_secret)     │
│  user_2  | binance  | enc(api_key)      | enc(api_secret)     │
└─────────────────────────────────────────────────────────────┘
```

**Flow**:
1. User memasukkan API Key di Settings page
2. Credentials disimpan di `exchange_credentials` table
3. Edge Function mengambil credentials per-user via JWT auth
4. HMAC signature dibuat di server, keys tidak pernah di-log
5. Fallback ke env credentials HANYA untuk migration (deprecated)

### Per-User Credential Lookup

```typescript
// Edge Function
async function getUserCredentials(userId: string) {
  const { data } = await supabase
    .from('exchange_credentials')
    .select('api_key_encrypted, api_secret_encrypted')
    .eq('user_id', userId)
    .eq('exchange', 'binance')
    .eq('is_active', true)
    .single();
  
  return data;
}
```

### JWT Authentication (REQUIRED)

Edge Function **WAJIB** memverifikasi JWT token sebelum memproses request:

```typescript
const user = await getAuthenticatedUser(authHeader);
if (!user) {
  return { error: 'Authentication required', requiresAuth: true };
}
```

### Permissions Required

| Permission | Required For |
|------------|--------------|
| Enable Reading | All read endpoints |
| Enable Futures | Futures trading data |

**Note**: "Enable Spot & Margin Trading" NOT required for read-only journal.

## Display Locations

| Data | Display Location |
|------|------------------|
| Balance | Dashboard, Accounts |
| Positions | Dashboard, Journal (Active) |
| REALIZED_PNL | Trade History |
| COMMISSION | Financial Summary |
| FUNDING_FEE | Financial Summary |
| TRANSFER | Transactions tab |
| Rebates | Financial Summary |
