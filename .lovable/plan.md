

# Refactor: Binance-Centered Trading Journal

## Overview

Refactoring project dari sistem manual (local DB + simulasi) menjadi **Binance Futures-centered** dimana data akun, posisi, balance, dan trade history bersumber langsung dari Binance API.

---

## Current vs Target Architecture

```text
CURRENT STATE:
┌─────────────────────────────────────────────────────────────┐
│  Local DB (Supabase)                                        │
│  ├─ accounts table → manual balance tracking                │
│  ├─ trade_entries → manually logged trades                  │
│  ├─ trading_sessions → manual session management            │
│  └─ Simulated P&L calculations                             │
└─────────────────────────────────────────────────────────────┘

TARGET STATE:
┌─────────────────────────────────────────────────────────────┐
│  Binance Futures API (PRIMARY SOURCE)                       │
│  ├─ Balance & Margin → Real-time from Binance               │
│  ├─ Positions → Live positions from Binance                 │
│  ├─ Trade History → Synced from Binance                     │
│  └─ Unrealized P&L → Calculated by Binance                 │
├─────────────────────────────────────────────────────────────┤
│  Local DB (SECONDARY - Journal Metadata Only)               │
│  ├─ trade_entries → Enhanced with Binance trade ID link     │
│  ├─ trading_strategies → User-defined strategies            │
│  ├─ AI analysis data → Post-trade analysis                  │
│  └─ Notes, emotions, confluence scores                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Files to Create

### 1. `src/components/dashboard/BinancePositionsTable.tsx`

**Purpose:** Replace `ActivePositionsTable` with real Binance positions

**Features:**
- Fetch live positions from `useBinancePositions()`
- Display: Symbol, Direction, Entry Price, Mark Price, Unrealized P&L, Leverage, Liquidation Price
- Real-time polling (15s interval)
- "Sync to Journal" button untuk log trade ke local DB

---

### 2. `src/components/dashboard/BinanceBalanceWidget.tsx`

**Purpose:** Real-time Binance wallet balance widget untuk Dashboard

**Features:**
- Total Wallet Balance
- Available Balance
- Unrealized P&L
- Margin Balance
- Auto-refresh setiap 30 detik

---

### 3. `src/components/trading/BinanceTradeHistory.tsx`

**Purpose:** Display trade history langsung dari Binance

**Features:**
- Symbol filter dropdown
- Recent trades dengan realized P&L
- Commission/fees display
- "Import to Journal" action per trade
- Pagination via limit param

---

### 4. `src/components/trading/BinanceSyncButton.tsx`

**Purpose:** Bulk sync trades dari Binance ke local journal

**Features:**
- Select date range
- Select symbols
- Preview trades to import
- Map to existing strategies
- Avoid duplicate imports (check by Binance trade ID)

---

### 5. `src/hooks/use-binance-sync.ts`

**Purpose:** Hook untuk sync Binance data ke local DB

**Features:**
- `syncTradeToJournal(binanceTrade, metadata)` - Import single trade
- `bulkSyncTrades(trades[], strategyId)` - Bulk import
- Duplicate detection via `binance_trade_id` field
- Auto-map direction (BUY = LONG, SELL = SHORT)

---

## Files to Modify

### 1. `src/pages/Dashboard.tsx`

**Changes:**
- Replace Accounts section dengan `BinanceBalanceWidget`
- Replace `ActivePositionsTable` dengan `BinancePositionsTable`
- Add connection status indicator untuk Binance
- Portfolio Performance metrics dari Binance balance

---

### 2. `src/pages/Accounts.tsx`

**Changes:**
- Simplify ke single "Binance Account" view
- Remove manual account creation for Real accounts
- Keep Paper Trading accounts untuk backtesting
- Show Binance connection status
- Quick link ke Settings untuk API configuration

---

### 3. `src/pages/trading-journey/TradingJournal.tsx`

**Changes:**
- Add "Import from Binance" tab/section
- Trade History tab: Option untuk view Binance history vs local journal
- Open Positions: Fetch dari Binance langsung
- Closed Trades: Merge Binance trades dengan journal metadata (notes, strategies, AI scores)

---

### 4. `src/components/dashboard/ActivePositionsTable.tsx`

**Changes:**
- Rename to `LocalPositionsTable` (untuk Paper Trading)
- Add conditional: Show Binance data jika connected, else show local
- Add "Source" badge: "Binance" vs "Paper Trading"

---

### 5. `src/components/accounts/TradingAccountsDashboard.tsx`

**Changes:**
- Primary metrics dari Binance (jika connected)
- Fallback ke local calculation (untuk Paper Trading)
- Add Binance sync status indicator

---

### 6. `src/components/dashboard/TodayPerformance.tsx`

**Changes:**
- Fetch 24H trades dari Binance API
- Calculate 24H P&L dari Binance realized P&L
- Calculate win rate dari Binance trade results
- Display commission/fees paid today

---

### 7. `src/hooks/use-trade-entries.ts`

**Add fields:**
- `binance_trade_id: string | null` - Link ke Binance trade
- `binance_order_id: number | null` - Link ke Binance order
- `source: 'manual' | 'binance'` - Data source

**Changes:**
- Add `useMergedTradeHistory()` hook: Combine Binance + local journal data
- Update create mutation: Accept Binance trade data for import

---

### 8. `src/pages/trading-journey/Performance.tsx`

**Changes:**
- Equity curve: Calculate dari Binance realized P&L history
- Add data source toggle: "Binance" vs "Journal Only"
- Win rate, profit factor: Derive dari Binance trades

---

### 9. `src/features/binance/useBinanceFutures.ts`

**Add hooks:**
- `useBinance24HTrades()` - Trades dalam 24 jam terakhir
- `useBinanceAllSymbolsTrades()` - Aggregate trades dari all symbols
- `useBinanceTotalPnL()` - Total realized P&L

---

### 10. `src/components/settings/BinanceApiSettings.tsx`

**Enhancements:**
- Add "Sync Settings" section: Auto-sync interval, symbols to track
- Add "Data Management" section: Clear synced data, re-sync all
- Add permission check display: Ensure Read + Futures enabled

---

## Database Migration

**New columns for `trade_entries`:**

```sql
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS binance_trade_id TEXT;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS binance_order_id BIGINT;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS commission NUMERIC DEFAULT 0;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS commission_asset TEXT;

-- Index untuk prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_trade_entries_binance_trade_id 
ON trade_entries(binance_trade_id) WHERE binance_trade_id IS NOT NULL;
```

---

## UI Flow Changes

### Dashboard (New Flow)
```text
Dashboard
├─ Pro Tip
├─ Quick Actions
├─ System Status + Binance Connection Status (NEW)
├─ Market Sessions
├─ Binance Account Overview (REPLACED Accounts section)
│   ├─ Wallet Balance
│   ├─ Available Balance
│   ├─ Unrealized P&L
│   └─ Margin Balance
├─ Today's Activity
│   ├─ TodayPerformance (from Binance 24H trades)
│   └─ BinancePositionsTable (live positions)
├─ Risk & AI Insights
└─ Trading Journey (7-day stats from Binance)
```

### Accounts Page (New Flow)
```text
Accounts
├─ Binance Connection Card (PRIMARY)
│   ├─ Connection Status
│   ├─ Balance Overview
│   ├─ Positions Summary
│   └─ "Configure API" button
├─ Paper Trading Accounts (for backtesting)
│   └─ Manual accounts for practice
└─ Sync Status
    ├─ Last sync time
    ├─ Trades synced count
    └─ "Sync Now" button
```

### Trading Journal (New Flow)
```text
Trading Journal
├─ Tabs:
│   ├─ Open Positions (from Binance)
│   ├─ Trade History (merged: Binance + Journal metadata)
│   ├─ Import from Binance (NEW)
│   └─ Paper Trades (local only)
├─ Import from Binance:
│   ├─ Symbol filter
│   ├─ Date range
│   ├─ Preview trades
│   ├─ Assign strategy
│   └─ Bulk import
└─ Trade Detail
    ├─ Binance data (price, qty, fees)
    ├─ Journal data (notes, emotions, confluences)
    └─ AI analysis
```

---

## Implementation Order

### Phase 1: Core Binance Integration (Priority)
1. Database migration - Add Binance ID columns
2. Create `BinanceBalanceWidget`
3. Create `BinancePositionsTable`
4. Update Dashboard dengan Binance widgets
5. Add Binance connection status ke System Status

### Phase 2: Trade Sync
6. Create `use-binance-sync.ts` hook
7. Create `BinanceTradeHistory` component
8. Create `BinanceSyncButton` untuk bulk import
9. Update `useTradeEntries` dengan source field
10. Update Trading Journal dengan Import tab

### Phase 3: Analytics Integration
11. Update Performance page dengan Binance data toggle
12. Update TodayPerformance dengan Binance 24H trades
13. Update TradingAccountsDashboard dengan Binance primary
14. Merge equity curve calculation (Binance + local)

### Phase 4: Accounts Simplification
15. Simplify Accounts page (Binance primary + Paper secondary)
16. Remove manual Real account creation
17. Update account selection flows

---

## Fallback Strategy

Jika Binance tidak connected:
- Show Paper Trading data only
- Display "Connect Binance" CTA
- Allow manual trade logging
- All existing functionality tetap berjalan

---

## Technical Considerations

### API Rate Limits
- Binance limit: 2400 requests/minute
- Polling intervals: Balance 30s, Positions 15s, Trades 60s
- Cache aggressively dengan TanStack Query

### Data Consistency
- Binance = source of truth untuk balance & positions
- Local DB = enrichment layer (notes, strategies, AI)
- Merge via `binance_trade_id` foreign key

### Security
- API keys tetap di Supabase secrets
- Edge function sebagai secure proxy
- No secrets exposed ke frontend

---

## Success Criteria

| Feature | Metric |
|---------|--------|
| Real-time balance | Update setiap 30s |
| Live positions | Update setiap 15s |
| Trade import | Bulk sync working |
| No duplicates | Unique constraint enforced |
| Fallback working | Paper trading tetap functional |
| Performance data | Equity curve dari Binance |

