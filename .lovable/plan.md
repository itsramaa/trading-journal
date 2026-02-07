

# Plan: Implementasi Lengkap Trade Enrichment System

## Executive Summary

Sistem Trade History saat ini **tidak berfungsi dengan benar**. Dari 124 trade Binance di database:
- 0% memiliki `entry_price` (semua = 0)
- 0% memiliki `exit_price` (semua = 0)
- 0% memiliki `quantity` (semua = 0)
- 100% memiliki `direction` = 'LONG' (hardcoded, bukan data aktual)

**Root Cause**: Enrichment gagal karena Binance API `/fapi/v1/userTrades` memiliki limit 7-hari per request. Meskipun frontend sudah di-refactor untuk chunking, **ada timing issue** dimana chunk masih melebihi 7 hari.

---

## Problem Breakdown

### Problem 1: 7-Day Limit Error (CRITICAL)

**Lokasi**: `src/services/binance-trade-enricher.ts` → `fetchUserTradesChunk()`

**Issue**: 
```typescript
// Line 146 - Chunk calculation bisa off-by-one
const chunkEnd = Math.min(chunkStart + MAX_TRADES_INTERVAL_MS, endTime);
```

Jika `MAX_TRADES_INTERVAL_MS` exactly 7 hari = `604800000ms`, Binance API bisa reject karena mereka mungkin menggunakan `<` bukan `<=`. Perlu safety margin.

**Fix**: Kurangi chunk ke 6.5 hari (97% dari 7 hari) untuk safety margin.

---

### Problem 2: Hardcoded Direction di Fallback

**Lokasi**: `src/hooks/use-binance-full-sync.ts` line 243

```typescript
// HARDCODED - SALAH
return {
  direction: 'LONG', // <-- Ini selalu LONG bahkan untuk SHORT positions
  ...
}
```

**Impact**: Semua trade di database terlihat sebagai LONG, analytics direction-based rusak.

**Fix**: Gunakan logika inferensi dari `positionSide` atau jangan insert jika tidak bisa menentukan.

---

### Problem 3: Matching Logic Terlalu Ketat

**Lokasi**: `src/services/binance-trade-enricher.ts` → `linkIncomeWithTrades()`

```typescript
// Line 284 - 1-minute bucket terlalu sempit
const key = `${group.symbol}_${Math.floor(group.exitTime / 60000)}`;
```

**Issue**: Jika exit time income record dan userTrade berbeda beberapa menit, matching gagal.

**Fix**: Gunakan 5-minute bucket atau matching by orderId.

---

### Problem 4: UI Stats Mismatch

**Lokasi**: `src/pages/TradeHistory.tsx` line 232-234

```typescript
// Stats dihitung dari sortedTrades (setelah filter)
// Tapi header menampilkan ini sebagai "global" stats
const totalPnL = sortedTrades.reduce((sum, t) => sum + (t.realized_pnl || 0), 0);
```

**Issue**: Jika user filter by session, stats berubah tapi user tidak sadar ini stats filtered.

**Fix**: Bedakan "Global Stats" vs "Filtered Stats" secara visual.

---

## Implementation Plan

### Phase 1: Fix 7-Day Chunking (Edge Function + Frontend)

**File**: `supabase/functions/binance-futures/index.ts`

```typescript
// Tambahkan validasi di getTrades()
async function getTrades(...) {
  // VALIDASI: Enforce 7-day limit di server side juga
  if (startTime && endTime) {
    const interval = endTime - startTime;
    const MAX_INTERVAL = 7 * 24 * 60 * 60 * 1000 - 60000; // 7 days minus 1 minute safety
    if (interval > MAX_INTERVAL) {
      return { 
        success: false, 
        error: `Time interval ${interval}ms exceeds max ${MAX_INTERVAL}ms. Use chunked fetching.`,
        code: 'INTERVAL_TOO_LARGE'
      };
    }
  }
  // ... rest of function
}
```

**File**: `src/services/binance-trade-enricher.ts`

```typescript
// Reduce chunk size with safety margin
const MAX_TRADES_INTERVAL_MS = 6.5 * 24 * 60 * 60 * 1000; // 6.5 days (safety margin)
```

---

### Phase 2: Fix Matching Logic

**File**: `src/services/binance-trade-enricher.ts`

```typescript
// Expand to 5-minute bucket
function linkIncomeWithTrades(...) {
  // Create MULTIPLE lookup keys for each trade (fuzzy matching)
  const tradesBySymbolTime = new Map<string, TradeFillGroup>();
  for (const group of tradeFillGroups) {
    // 5-minute bucket
    const bucket5min = Math.floor(group.exitTime / 300000);
    // Also store for adjacent buckets
    for (const offset of [-1, 0, 1]) {
      const key = `${group.symbol}_${bucket5min + offset}`;
      if (!tradesBySymbolTime.has(key)) {
        tradesBySymbolTime.set(key, group);
      }
    }
  }
  
  // Match using 5-min bucket
  for (const income of incomeRecords) {
    const bucket5min = Math.floor(income.time / 300000);
    const timeKey = `${income.symbol}_${bucket5min}`;
    const matchingTrade = tradesBySymbolTime.get(timeKey);
    // ...
  }
}
```

---

### Phase 3: Fix Hardcoded Direction

**File**: `src/hooks/use-binance-full-sync.ts`

```typescript
function incomeToTradeEntry(income: BinanceIncome, userId: string) {
  // INFER direction from P&L if possible, but mark as uncertain
  const inferredDirection = income.income > 0 
    ? 'UNKNOWN_WIN' 
    : income.income < 0 
      ? 'UNKNOWN_LOSS' 
      : 'UNKNOWN';
  
  return {
    // ... other fields
    direction: 'UNKNOWN', // Don't assume LONG
    needs_enrichment: true, // Flag for later enrichment
    notes: `Auto-synced. Direction unknown - needs enrichment.`,
  };
}
```

**Alternative**: Reject insert if enrichment fails, only allow enriched trades.

---

### Phase 4: Re-Enrich Existing 124 Trades

**File**: `src/hooks/use-trade-enrichment-binance.ts`

Sudah ada logic untuk re-enrich, tapi perlu:
1. Call dengan proper 7-day chunking (Phase 1 fix)
2. Use improved matching (Phase 2 fix)
3. Update UI to show progress accurately

**Enhancement**:
```typescript
// Add retry logic for failed enrichments
const MAX_RETRIES = 2;
for (let retry = 0; retry <= MAX_RETRIES; retry++) {
  try {
    const enrichedData = enrichedByTranId.get(tranId);
    if (enrichedData && enrichedData.entryPrice > 0) {
      // success
      break;
    }
  } catch (error) {
    if (retry === MAX_RETRIES) {
      errors.push(`Trade ${trade.id}: Failed after ${MAX_RETRIES} retries`);
    }
    // Expand time window and retry
  }
}
```

---

### Phase 5: UI Improvements

**File**: `src/pages/TradeHistory.tsx`

1. **Visual indicator for incomplete trades**:
```tsx
// In TradeGalleryCard or TradeHistoryCard
{trade.entry_price === 0 && (
  <Badge variant="destructive" className="text-xs">
    <AlertCircle className="h-3 w-3 mr-1" />
    Needs Enrichment
  </Badge>
)}
```

2. **Separate Global vs Filtered Stats**:
```tsx
<div className="flex gap-4">
  {hasActiveFilters && (
    <Badge variant="outline">Showing filtered: {sortedTrades.length}</Badge>
  )}
  <div className="text-2xl font-bold">
    {hasActiveFilters ? `${sortedTrades.length} (filtered)` : sortedTrades.length}
  </div>
</div>
```

3. **Show enrichment status summary**:
```tsx
{tradesNeedingEnrichment > 0 && (
  <Alert variant="warning">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Incomplete Trade Data</AlertTitle>
    <AlertDescription>
      {tradesNeedingEnrichment} trades are missing entry/exit prices. 
      Click "Enrich Trades" to fetch accurate data from Binance.
    </AlertDescription>
  </Alert>
)}
```

---

### Phase 6: Add Validation Layer

**New Hook**: `src/hooks/use-trade-validation.ts`

```typescript
export function useTradeValidation() {
  // Check trade data completeness
  const validateTrade = (trade: TradeEntry): ValidationResult => {
    const issues: string[] = [];
    
    if (trade.source === 'binance') {
      if (trade.entry_price === 0) issues.push('Missing entry price');
      if (trade.exit_price === 0) issues.push('Missing exit price');
      if (trade.quantity === 0) issues.push('Missing quantity');
      if (trade.direction === 'UNKNOWN') issues.push('Unknown direction');
    }
    
    return {
      isComplete: issues.length === 0,
      issues,
      canDisplay: trade.realized_pnl !== undefined, // At minimum must have P&L
    };
  };
  
  return { validateTrade };
}
```

---

## File Changes Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `supabase/functions/binance-futures/index.ts` | Add 7-day validation | HIGH |
| `src/services/binance-trade-enricher.ts` | Fix chunk size + matching | HIGH |
| `src/hooks/use-binance-full-sync.ts` | Remove hardcoded direction | HIGH |
| `src/hooks/use-trade-enrichment-binance.ts` | Add retry logic | MEDIUM |
| `src/pages/TradeHistory.tsx` | UI improvements | MEDIUM |
| `src/hooks/use-trade-validation.ts` | New validation hook | MEDIUM |
| `docs/TRADE_HISTORY_ARCHITECTURE.md` | Update documentation | LOW |

---

## Testing Strategy

### Test 1: Verify 7-Day Chunking
1. Click "Enrich X Trades" button
2. Observe NO 400 errors in console
3. Progress should show symbol-by-symbol fetching

### Test 2: Verify Data Completeness
```sql
-- Run after enrichment
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN entry_price > 0 THEN 1 END) as has_entry,
  COUNT(CASE WHEN exit_price > 0 THEN 1 END) as has_exit,
  COUNT(CASE WHEN quantity > 0 THEN 1 END) as has_quantity
FROM trade_entries
WHERE source = 'binance' AND deleted_at IS NULL;
```
Target: `has_entry`, `has_exit`, `has_quantity` should match `total` (or close to it).

### Test 3: Verify Direction Accuracy
```sql
SELECT direction, COUNT(*) 
FROM trade_entries 
WHERE source = 'binance' AND deleted_at IS NULL
GROUP BY direction;
```
Target: Should see mix of LONG and SHORT, not all LONG.

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| entry_price > 0 | 0/124 (0%) | ~110/124 (89%) |
| exit_price > 0 | 0/124 (0%) | ~110/124 (89%) |
| quantity > 0 | 0/124 (0%) | ~110/124 (89%) |
| Correct direction | 0/124 (0%) | ~110/124 (89%) |
| 7-day API errors | Frequent | 0 |

*Note: ~89% karena beberapa trade mungkin tidak bisa di-match jika terlalu lama (data userTrades sudah expired di Binance).*

---

## Rollback Plan

Jika enrichment gagal total:
1. Trades tetap di database dengan `entry_price = 0`
2. P&L (dari income) tetap akurat
3. UI harus gracefully handle `entry_price = 0` dengan showing "—" instead of "$0.00"

