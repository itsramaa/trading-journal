

# Plan: Fix Excessive Income Fetching + Complete Enrichment System

## Problem Statement

Saat melakukan Re-Enrich, sistem mengambil **100,000+ income records** dari Binance padahal hanya butuh ~500 records. Ini terjadi karena:

1. **Date range terlalu besar** (134 hari untuk 124 trades)
2. **Tidak ada pagination limit** untuk income fetching
3. **Tidak ada smart filtering** - fetch semua, baru filter

---

## Root Cause Analysis

### Issue 1: Date Range = Full History (134 Days)
```typescript
// use-trade-enrichment-binance.ts line 188-194
const startTime = oldestTrade - (2 * 24 * 60 * 60 * 1000);
const endTime = newestTrade + (2 * 24 * 60 * 60 * 1000);
// Jika trades tersebar 5 bulan → fetch 5 bulan income!
```

### Issue 2: Infinite Pagination Loop
```typescript
// use-trade-enrichment-binance.ts line 82-99
while (true) {
  // NO LIMIT! Keeps fetching until Binance runs out
  fromId = result.data[result.data.length - 1].tranId + 1;
}
```

### Issue 3: Fetch All, Filter Later (Inefficient)
```typescript
// Current approach:
// 1. Fetch 100k income records
// 2. Filter to ~200 REALIZED_PNL
// 3. Match with 124 trades

// Better approach:
// 1. Get specific trade IDs that need enrichment
// 2. Fetch income only for those time windows
// 3. Much smaller data volume
```

---

## Solution Architecture

### Strategy: Per-Trade Time Windows Instead of Full Range

```text
OLD APPROACH (inefficient):
┌─────────────────────────────────────────────────────────┐
│ Fetch ALL income from Jan 1 to Jun 1 (5 months)         │
│ = 100,000+ records                                       │
└─────────────────────────────────────────────────────────┘

NEW APPROACH (efficient):
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Window 1│  │ Window 2│  │ Window 3│  │ Window N│
│ ±1 hour │  │ ±1 hour │  │ ±1 hour │  │ ±1 hour │
│ Trade A │  │ Trade B │  │ Trade C │  │ Trade N │
└─────────┘  └─────────┘  └─────────┘  └─────────┘
= ~500 records total (deduplicated)
```

---

## Implementation Plan

### Phase 1: Optimize Income Fetching Strategy

**File**: `src/hooks/use-trade-enrichment-binance.ts`

**Changes**:
1. Add maximum fetch limit (10,000 records) as safety net
2. Use smart chunking - group trades by week and fetch per chunk
3. Early termination when all needed data is found
4. Add proper progress reporting during fetch

```typescript
// New approach: Smart Time Window Chunking
async function fetchIncomeForTrades(
  trades: { trade_date: string; pair: string }[],
  onProgress?: (fetched: number, phase: string) => void
): Promise<BinanceIncome[]> {
  const allRecords: BinanceIncome[] = [];
  const MAX_RECORDS = 10000; // Safety limit
  
  // Group trades by 7-day windows
  const tradeWindows = groupTradesIntoWeeklyWindows(trades);
  
  for (const window of tradeWindows) {
    if (allRecords.length >= MAX_RECORDS) break;
    
    // Fetch income for this specific window only
    const windowRecords = await fetchPaginatedIncome(
      window.startTime,
      window.endTime,
      MAX_RECORDS - allRecords.length
    );
    
    allRecords.push(...windowRecords);
    onProgress?.(allRecords.length, `Window ${window.index + 1}/${tradeWindows.length}`);
  }
  
  // Deduplicate
  return deduplicateByTranId(allRecords);
}
```

### Phase 2: Add Maximum Fetch Limits

**File**: `src/hooks/use-trade-enrichment-binance.ts`

```typescript
// Add limit parameter to fetchPaginatedIncome
async function fetchPaginatedIncome(
  startTime: number,
  endTime: number,
  maxRecords: number = 5000, // NEW: Default limit
  onProgress?: (fetched: number) => void
): Promise<BinanceIncome[]> {
  const allRecords: BinanceIncome[] = [];
  let fromId: number | undefined = undefined;
  
  while (true) {
    // NEW: Check limit
    if (allRecords.length >= maxRecords) {
      console.warn(`Hit max records limit (${maxRecords})`);
      break;
    }
    
    const result = await callBinanceApi<BinanceIncome[]>('income', {
      startTime,
      endTime,
      limit: Math.min(RECORDS_PER_PAGE, maxRecords - allRecords.length),
      ...(fromId && { fromId }),
    });
    
    // ... rest unchanged
  }
  
  return allRecords;
}
```

### Phase 3: Smart Trade Grouping

**New Function** in `src/hooks/use-trade-enrichment-binance.ts`:

```typescript
interface TradeWindow {
  startTime: number;
  endTime: number;
  trades: Array<{ id: string; trade_date: string }>;
  index: number;
}

function groupTradesIntoWeeklyWindows(
  trades: Array<{ trade_date: string }>
): TradeWindow[] {
  // Sort by date
  const sorted = [...trades].sort((a, b) => 
    new Date(a.trade_date).getTime() - new Date(b.trade_date).getTime()
  );
  
  const windows: TradeWindow[] = [];
  const WINDOW_SIZE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const BUFFER_MS = 2 * 60 * 60 * 1000; // 2 hour buffer
  
  let currentWindow: TradeWindow | null = null;
  
  for (const trade of sorted) {
    const tradeTime = new Date(trade.trade_date).getTime();
    
    if (!currentWindow || tradeTime > currentWindow.endTime) {
      // Start new window
      currentWindow = {
        startTime: tradeTime - BUFFER_MS,
        endTime: tradeTime + WINDOW_SIZE_MS,
        trades: [],
        index: windows.length,
      };
      windows.push(currentWindow);
    }
    
    currentWindow.trades.push(trade as any);
  }
  
  return windows;
}
```

### Phase 4: Better Progress Reporting

**File**: `src/hooks/use-trade-enrichment-binance.ts`

```typescript
// Update progress interface
export interface EnrichmentProgress {
  phase: 'checking' | 'fetching-income' | 'fetching-trades' | 'enriching' | 'updating' | 'done';
  current: number;
  total: number;
  percent: number;
  message?: string;
  windowInfo?: { current: number; total: number }; // NEW: Window progress
  recordsFetched?: number; // NEW: Actual records count
}
```

### Phase 5: Verify 7-Day Chunking for Trades

**File**: `src/services/binance-trade-enricher.ts`

Verify that the existing chunking is working:
```typescript
// Line 24 - Already correct
const MAX_TRADES_INTERVAL_MS = 6.5 * 24 * 60 * 60 * 1000; // 6.5 days

// But need to add logging for debugging
async function fetchUserTradesForSymbol(
  symbol: string,
  startTime: number,
  endTime: number
): Promise<BinanceTrade[]> {
  const totalDuration = endTime - startTime;
  const numChunks = Math.ceil(totalDuration / MAX_TRADES_INTERVAL_MS);
  
  // NEW: Add debug logging
  console.log(`[Enricher] ${symbol}: Fetching ${numChunks} chunks for ${Math.round(totalDuration / (24*60*60*1000))} days`);
  
  // ... rest unchanged
}
```

---

## File Changes Summary

| File | Change | Priority |
|------|--------|----------|
| `src/hooks/use-trade-enrichment-binance.ts` | Smart windowed fetching + max limits | CRITICAL |
| `src/services/binance-trade-enricher.ts` | Add debug logging | LOW |
| `src/pages/TradeHistory.tsx` | Improve progress UI | MEDIUM |

---

## Expected Improvement

| Metric | Before | After |
|--------|--------|-------|
| Income records fetched | 100,000+ | ~500 |
| API calls | ~100+ | ~5-10 |
| Enrichment time | Minutes | ~30 seconds |
| Memory usage | High | Normal |
| User experience | Progress stuck | Clear progress |

---

## Testing Strategy

### Test 1: Income Fetch Limit
1. Trigger enrichment
2. Console should show "Fetched X income records" where X < 10,000
3. Progress should not get stuck on "fetching-income" phase

### Test 2: Weekly Window Chunking
1. Check console for window logging
2. Should see "Window 1/N", "Window 2/N" progress
3. Each window should take ~1-2 seconds

### Test 3: Trades Enrichment Success
After enrichment completes, run SQL:
```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN entry_price > 0 THEN 1 END) as enriched
FROM trade_entries
WHERE source = 'binance' AND deleted_at IS NULL;
```

---

## Rollback Plan

If the new approach fails:
1. Revert to original `fetchPaginatedIncome` without limits
2. Add manual "Cancel" button for long-running enrichment
3. Show warning: "Large history may take several minutes"

