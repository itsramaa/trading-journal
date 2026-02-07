# Trade History Architecture

## Overview

Trade History adalah fitur inti untuk melihat dan menganalisis riwayat trading yang sudah ditutup (closed trades). Fitur ini mendukung dua sumber data utama:
1. **Binance Futures API** - Sinkronisasi otomatis dari exchange
2. **Paper Trading** - Entri manual untuk simulasi

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TRADE HISTORY FLOW                              │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────┐    ┌──────────────────┐    ┌──────────────────────────────────┐
│   BINANCE    │    │  EDGE FUNCTION   │    │         SUPABASE DB              │
│   FUTURES    │───▶│ binance-futures  │───▶│       trade_entries              │
│     API      │    │                  │    │                                  │
└──────────────┘    └──────────────────┘    └──────────────────────────────────┘
       │                    │                            │
       │                    ▼                            │
       │           ┌──────────────────┐                  │
       │           │  Rate Limiting   │                  │
       │           │  Deduplication   │                  │
       │           │  Transformation  │                  │
       │           └──────────────────┘                  │
       │                                                 │
       ▼                                                 ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            FRONTEND HOOKS                                     │
│  ┌────────────────────────┐  ┌─────────────────────┐  ┌───────────────────┐  │
│  │ useTradeEntriesPaginated│  │ useBinanceFullSync │  │ useTradeEnrichment│  │
│  │ (infinite scroll)       │  │ (2-year sync)      │  │ (journaling)      │  │
│  └────────────────────────┘  └─────────────────────┘  └───────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                           TRADE HISTORY PAGE                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────────────┐   │
│  │ Filters     │  │ Tabs        │  │ List/Gallery│  │ Enrichment Drawer  │   │
│  │ (date, pair)│  │ (Binance/   │  │ View Toggle │  │ (notes, strategy,  │   │
│  │             │  │  Paper)     │  │             │  │  screenshots)      │   │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Detail

### 1. Binance Sync Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                    BINANCE FULL SYNC FLOW                           │
└─────────────────────────────────────────────────────────────────────┘

User clicks "Sync Full History"
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ useBinanceFullSync.syncFullHistory()                                │
│                                                                     │
│  1. Chunked Fetch (90-day intervals)                                │
│     └── Loop: 8 chunks = 2 years of history                         │
│         └── Each chunk: GET /fapi/v1/income                         │
│             └── CURSOR-BASED PAGINATION (fromId parameter)          │
│                 └── Fetch ALL records even if >1000 per chunk       │
│             └── Rate limit: 300ms delay between requests            │
│                                                                     │
│  2. Pagination Loop (within each chunk)                             │
│     └── While records.length == 1000:                               │
│         └── Set fromId = lastRecord.tranId + 1                      │
│         └── Fetch next page                                         │
│         └── This ensures NO records are lost due to API cap         │
│                                                                     │
│  3. Filter REALIZED_PNL only                                        │
│     └── Ignore: FUNDING_FEE, COMMISSION, TRANSFER, etc.             │
│                                                                     │
│  4. Deduplicate against existing trades                             │
│     └── Check: binance_trade_id = 'income_{tranId}'                 │
│                                                                     │
│  5. Batch Insert (100 per batch)                                    │
│     └── Insert into trade_entries table                             │
│                                                                     │
│  6. Invalidate Queries                                              │
│     └── trade-entries-paginated, unified-portfolio, daily-pnl       │
└─────────────────────────────────────────────────────────────────────┘
```

**Key Fix (v2.0):** Cursor-based pagination using `fromId` parameter now
handles cases where a single 90-day chunk has >1000 records, ensuring
ALL income records are fetched without loss.

### 2. Edge Function Architecture

**File:** `supabase/functions/binance-futures/index.ts`

```typescript
// Supported Actions (41 endpoints)
action: 'income'           // GET /fapi/v1/income - P&L history
action: 'balance'          // GET /fapi/v2/balance - Account balance
action: 'positions'        // GET /fapi/v2/positionRisk - Open positions
action: 'trades'           // GET /fapi/v1/userTrades - Trade fills
action: 'open-orders'      // GET /fapi/v1/openOrders
action: 'all-orders'       // GET /fapi/v1/allOrders
action: 'commission-rate'  // GET /fapi/v1/commissionRate
action: 'leverage-brackets'// GET /fapi/v1/leverageBracket
action: 'force-orders'     // GET /fapi/v1/forceOrders (liquidations)
action: 'position-mode'    // GET /fapi/v1/positionSide/dual
// ... and more
```

**Security Features:**
- JWT authentication (decoded from Authorization header)
- Per-user credential lookup via `get_decrypted_credential` RPC
- HMAC SHA256 signature generation for Binance API
- Rate limit tracking via `check_rate_limit` RPC

---

## Database Schema

### Table: `trade_entries`

```sql
CREATE TABLE trade_entries (
  -- Primary Keys
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES auth.users,
  
  -- Trade Core Data
  pair                   TEXT NOT NULL,           -- 'BTCUSDT', 'ETHUSDT'
  direction              TEXT NOT NULL,           -- 'LONG' | 'SHORT'
  entry_price            NUMERIC NOT NULL,
  exit_price             NUMERIC,
  quantity               NUMERIC DEFAULT 0,
  
  -- P&L Fields
  pnl                    NUMERIC,                 -- Calculated P&L
  realized_pnl           NUMERIC,                 -- From Binance API
  fees                   NUMERIC,
  commission             NUMERIC,
  commission_asset       TEXT,
  
  -- Status & Result
  status                 TEXT DEFAULT 'open',     -- 'open' | 'closed'
  result                 TEXT,                    -- 'win' | 'loss' | 'breakeven'
  trade_date             TIMESTAMPTZ DEFAULT now(),
  entry_datetime         TIMESTAMPTZ,
  exit_datetime          TIMESTAMPTZ,
  
  -- Source Tracking
  source                 TEXT DEFAULT 'manual',   -- 'binance' | 'paper' | 'manual'
  binance_trade_id       TEXT UNIQUE,             -- 'income_{tranId}' for sync
  binance_order_id       BIGINT,
  
  -- Enrichment Data (Journaling)
  notes                  TEXT,
  emotional_state        TEXT,
  chart_timeframe        TEXT,
  tags                   TEXT[],
  screenshots            JSONB,                   -- [{url, path}, ...]
  market_context         JSONB,                   -- Fear/Greed, Events at trade time
  
  -- AI Analysis
  ai_quality_score       INTEGER,                 -- 0-100
  ai_confidence          NUMERIC,
  ai_model_version       TEXT,
  ai_analysis_generated_at TIMESTAMPTZ,
  post_trade_analysis    JSONB,
  pre_trade_validation   JSONB,
  confluence_score       INTEGER,
  confluences_met        JSONB,
  
  -- Relationships
  trading_account_id     UUID REFERENCES accounts,
  
  -- Soft Delete
  deleted_at             TIMESTAMPTZ,
  
  -- Timestamps
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);
```

### Table: `trade_entry_strategies` (Junction)

```sql
CREATE TABLE trade_entry_strategies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_entry_id  UUID REFERENCES trade_entries(id),
  strategy_id     UUID REFERENCES trading_strategies(id),
  user_id         UUID NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

---

## Frontend Components

### 1. Page: `TradeHistory.tsx`

**Location:** `src/pages/TradeHistory.tsx`

**Responsibilities:**
- Filter management (date, pair, result, direction, session, strategy)
- Tab switching (Binance / Paper / Fees / Funding)
- View mode toggle (List / Gallery)
- Infinite scroll pagination
- CSV export
- Full history sync trigger

**Key States:**
```typescript
// Filter states
const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all');
const [selectedStrategyIds, setSelectedStrategyIds] = useState<string[]>([]);
const [selectedPairs, setSelectedPairs] = useState<string[]>([]);
const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all');
const [sortByAI, setSortByAI] = useState<'none' | 'asc' | 'desc'>('none');
const [viewMode, setViewMode] = useState<ViewMode>('gallery');
```

### 2. Hook: `useTradeEntriesPaginated`

**Location:** `src/hooks/use-trade-entries-paginated.ts`

**Features:**
- Cursor-based pagination (50 items per page)
- Filter support (status, pair, direction, result, source, date range, strategies)
- Strategy relationship loading
- Infinite query with React Query

**Filter Interface:**
```typescript
interface TradeFilters {
  status?: 'open' | 'closed' | 'all';
  pair?: string;
  pairs?: string[];
  direction?: 'LONG' | 'SHORT';
  result?: 'win' | 'loss' | 'breakeven' | 'profit';
  source?: 'manual' | 'binance';
  startDate?: string;
  endDate?: string;
  strategyId?: string;
  strategyIds?: string[];
}
```

### 3. Hook: `useBinanceFullSync`

**Location:** `src/hooks/use-binance-full-sync.ts`

**Features:**
- Chunked fetching (90-day intervals for API limit)
- Progress tracking with callback
- Deduplication by `income_{tranId}`
- Batch insert (100 per batch)
- Query invalidation cascade

**Flow:**
```typescript
async function syncFullHistory(options: FullSyncOptions): Promise<FullSyncResult> {
  // Step 1: Fetch all income from Binance (chunked)
  const { incomes } = await fetchChunkedIncomeHistory(monthsBack, fetchAll, onProgress);
  
  // Step 2: Filter to REALIZED_PNL only
  const pnlRecords = incomes.filter(r => r.incomeType === 'REALIZED_PNL' && r.income !== 0);
  
  // Step 3: Check for duplicates
  const existingIds = await getExistingBinanceTradeIds(pnlRecords);
  const newRecords = pnlRecords.filter(r => !existingIds.has(`income_${r.tranId}`));
  
  // Step 4: Insert new trades in batches
  const entries = newRecords.map(r => incomeToTradeEntry(r, userId));
  await batchInsert(entries);
  
  return { synced, skipped, totalFetched, errors };
}
```

### 4. Hook: `useTradeEnrichment`

**Location:** `src/hooks/use-trade-enrichment.ts`

**Purpose:** Journal enrichment for trades

**Functions:**
- `loadLinkedStrategies(tradeId)` - Load strategies linked to trade
- `saveEnrichment(position, enrichmentData)` - Save notes, screenshots, etc.
- `addQuickNote(tradeId, note)` - Append timestamped note

**Enrichment Data:**
```typescript
interface EnrichmentData {
  notes: string;
  emotionalState: string;
  chartTimeframe: string;
  customTags: string;
  screenshots: Screenshot[];
  selectedStrategies: string[];
}
```

### 5. Component: `TradeHistoryCard`

**Location:** `src/components/trading/TradeHistoryCard.tsx`

**Displays:**
- Trade direction badge (LONG/SHORT)
- Symbol & date
- Source badge (Binance indicator)
- AI Quality Score badge
- Screenshot/Notes indicators
- Market context badges (Fear/Greed, Event Day)
- P&L, R:R ratio, Confluence score
- Quick Note dialog
- Journal/Delete actions

---

## Data Transformation

### Binance Income → Trade Entry

```typescript
function incomeToTradeEntry(income: BinanceIncome, userId: string) {
  return {
    user_id: userId,
    pair: income.symbol,                           // 'BTCUSDT'
    direction: 'LONG',                             // Default (no direction in income)
    entry_price: 0,                                // Not available from income API
    exit_price: 0,                                 // Not available from income API
    quantity: 0,                                   // Not available from income API
    pnl: income.income,                            // e.g., 15.32 or -8.21
    realized_pnl: income.income,
    trade_date: new Date(income.time).toISOString(),
    status: 'closed',
    result: income.income > 0 ? 'win' : income.income < 0 ? 'loss' : 'breakeven',
    source: 'binance',
    binance_trade_id: `income_${income.tranId}`,   // Unique identifier for dedup
    notes: 'Auto-synced from Binance REALIZED_PNL',
  };
}
```

### Binance Income Types

| Income Type | Description | Synced as Trade? |
|-------------|-------------|------------------|
| `REALIZED_PNL` | Closed position P&L | ✅ YES |
| `COMMISSION` | Trading fees | ❌ NO (Financial Summary) |
| `FUNDING_FEE` | Funding rate payment | ❌ NO (Funding Tab) |
| `TRANSFER` | Deposit/Withdrawal | ❌ NO (Transactions) |
| `INTERNAL_TRANSFER` | Wallet transfer | ❌ NO |
| `COMMISSION_REBATE` | Fee rebate | ❌ NO (Financial Summary) |
| `API_REBATE` | API rebate | ❌ NO |

---

## Query Invalidation Matrix

```typescript
// After any trade mutation
invalidateTradeQueries(queryClient) {
  // Primary trade data
  queryClient.invalidateQueries({ queryKey: ["trade-entries"] });
  queryClient.invalidateQueries({ queryKey: ["trade-entries-paginated"] });
  
  // Dashboard widgets
  queryClient.invalidateQueries({ queryKey: ["unified-portfolio"] });
  queryClient.invalidateQueries({ queryKey: ["unified-daily-pnl"] });
  queryClient.invalidateQueries({ queryKey: ["unified-weekly-pnl"] });
  
  // Analytics
  queryClient.invalidateQueries({ queryKey: ["contextual-analytics"] });
  queryClient.invalidateQueries({ queryKey: ["symbol-breakdown"] });
  
  // Binance P&L
  queryClient.invalidateQueries({ queryKey: ["binance-daily-pnl"] });
  queryClient.invalidateQueries({ queryKey: ["binance-weekly-pnl"] });
}
```

---

## Filter Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FILTER ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────┘

User applies filters
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ TradeHistoryFilters Component                                        │
│  ├── DateRangePicker → dateRange state                               │
│  ├── ResultFilter (Win/Loss/All) → resultFilter state                │
│  ├── DirectionFilter (Long/Short/All) → directionFilter state        │
│  ├── SessionFilter (Asia/London/NY/All) → sessionFilter state        │
│  ├── StrategyMultiSelect → selectedStrategyIds state                 │
│  ├── PairMultiSelect → selectedPairs state                           │
│  └── AI Sort Toggle → sortByAI state                                 │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Build paginatedFilters (memoized)                                    │
│                                                                      │
│ const paginatedFilters: TradeFilters = useMemo(() => ({              │
│   status: 'closed',                                                  │
│   startDate: dateRange.from || DEFAULT_START_DATE,                   │
│   endDate: dateRange.to,                                             │
│   pairs: selectedPairs.length > 0 ? selectedPairs : undefined,       │
│   result: resultFilter !== 'all' ? resultFilter : undefined,         │
│   direction: directionFilter !== 'all' ? directionFilter : undefined,│
│   strategyIds: selectedStrategyIds.length > 0 ? strategyIds : undef, │
│ }), [dependencies]);                                                 │
└─────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│ useTradeEntriesPaginated(paginatedFilters)                           │
│                                                                      │
│ Server-side filters (Supabase query):                                │
│   - status, pair, pairs, direction, source                           │
│   - startDate, endDate                                               │
│                                                                      │
│ Client-side filters (post-fetch):                                    │
│   - strategyId, strategyIds (needs join data)                        │
│   - result === 'profit' / 'loss' (based on realized_pnl)             │
│   - sessionFilter (computed from trade_date)                         │
│   - sortByAI (client-side sort)                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tabs Architecture

### Tab 1: Binance Trades

```typescript
const binanceTrades = sortedTrades.filter(t => t.source === 'binance');
```

- Shows trades synced from Binance
- Full journaling support (notes, screenshots, strategy)
- AI Quality Score display
- Market context badges

### Tab 2: Paper Trades

```typescript
const paperTrades = sortedTrades.filter(t => t.source !== 'binance');
```

- Shows manual/paper trades
- Full journaling support
- Used for practice/simulation

### Tab 3: Fees

**Component:** `FeeHistoryTab`

- Displays COMMISSION and COMMISSION_REBATE from Binance income
- Uses global date range filter
- Shows aggregated fee data by symbol

### Tab 4: Funding

**Component:** `FundingHistoryTab`

- Displays FUNDING_FEE from Binance income
- Uses global date range filter
- Shows positive (received) and negative (paid) funding

---

## Performance Optimizations

1. **Cursor-based Pagination**: Prevents offset-based performance degradation
2. **Memoized Filters**: `useMemo` for filter object stability
3. **Infinite Query**: React Query's `useInfiniteQuery` for efficient loading
4. **Batch Inserts**: 100 trades per batch during sync
5. **Chunked Fetching**: 90-day intervals to avoid Binance API limits
6. **Query Invalidation Matrix**: Targeted invalidation instead of full refetch

---

## Related Files Summary

| File | Purpose |
|------|---------|
| `src/pages/TradeHistory.tsx` | Main page component |
| `src/hooks/use-trade-entries-paginated.ts` | Paginated data hook |
| `src/hooks/use-binance-full-sync.ts` | Full history sync hook |
| `src/hooks/use-binance-sync.ts` | Single/bulk trade sync |
| `src/hooks/use-trade-enrichment.ts` | Journaling enrichment |
| `src/components/trading/TradeHistoryCard.tsx` | Trade card component |
| `src/components/journal/TradeGalleryCard.tsx` | Gallery view card |
| `src/components/journal/TradeEnrichmentDrawer.tsx` | Journal drawer |
| `src/components/trading/FeeHistoryTab.tsx` | Fees tab |
| `src/components/trading/FundingHistoryTab.tsx` | Funding tab |
| `src/lib/query-invalidation.ts` | Query invalidation helpers |
| `supabase/functions/binance-futures/index.ts` | Binance API proxy |

---

## Deduplication Strategy

**Key:** `binance_trade_id` column

**Format:** `income_{tranId}` where `tranId` is Binance's unique transaction ID

**Process:**
1. Fetch all income records from Binance
2. Generate `binance_trade_id` for each: `income_${record.tranId}`
3. Query existing trades with those IDs
4. Filter out already-existing trades
5. Insert only new trades

**Edge Case:** Same trade won't be synced twice even if user runs sync multiple times.

---

## Export Feature

**Format:** CSV

**Columns:**
- Date, Pair, Direction, Entry, Exit, P&L, Result, Notes

**Code:**
```typescript
const csvHeader = 'Date,Pair,Direction,Entry,Exit,P&L,Result,Notes\n';
const csvRows = sortedTrades.map(t => 
  `${t.trade_date},${t.pair},${t.direction},${t.entry_price},${t.exit_price || ''},${t.realized_pnl || t.pnl || 0},${t.result || ''},${(t.notes || '').replace(/,/g, ';')}`
).join('\n');
```
