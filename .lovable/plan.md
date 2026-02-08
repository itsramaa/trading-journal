
# Fix Plan: Binance API Pagination & Retry Mechanism

## Summary

Dua perbaikan untuk meningkatkan reliability sinkronisasi data Binance:
1. **Parameter Clarity**: Hapus `startTime`/`endTime` saat menggunakan `fromId` (cursor-based pagination)
2. **Empty Response Retry**: Tambah mekanisme retry untuk empty response yang mungkin bersifat sementara (race condition)

---

## Problem Analysis

### Issue 1: Redundant Time Filters dengan fromId

**Current Behavior:**
```
Frontend kirim: { startTime, endTime, fromId, limit }
Edge function forward: { startTime, endTime, fromId, limit }
Binance behavior: fromId OVERRIDES startTime/endTime
```

**Problem:**
- Parameter redundan menyebabkan confusion saat debugging
- Meskipun Binance mengabaikan time filters saat `fromId` ada, ini bukan best practice
- Potential edge case: beberapa endpoint mungkin tidak konsisten

**Solution:**
- Edge function: jangan kirim `startTime`/`endTime` jika `fromId` sudah ada
- Tambah comment menjelaskan perilaku ini

### Issue 2: Empty Response Handling

**Current Behavior:**
```
if (result.data.length === 0) {
  break; // Stop immediately - no retry
}
```

**Problem:**
- Binance matching engine memiliki delay mikro antara trade execution dan API exposure
- Empty response bisa bersifat sementara (race condition)
- Langsung break bisa menyebabkan data terlewat

**Solution:**
- Tambah `emptyRetryCount` dengan limit (2-3 retries)
- Delay lebih lama untuk empty response retry
- Hanya stop jika empty berturut-turut setelah retry

---

## Implementation Plan

### Phase 1: Edge Function Parameter Cleanup

**File:** `supabase/functions/binance-futures/index.ts`

**Changes:**

1. **`getIncomeHistory` function (~line 559-589)**
   ```typescript
   // BEFORE
   const params: Record<string, any> = { limit };
   if (startTime) params.startTime = startTime;
   if (endTime) params.endTime = endTime;
   if (fromId) params.fromId = fromId;
   
   // AFTER
   const params: Record<string, any> = { limit };
   // When using cursor-based pagination (fromId), time filters are ignored by Binance API
   // Only send time filters for initial request (no fromId)
   if (fromId) {
     params.fromId = fromId;
     // Note: startTime/endTime intentionally NOT sent with fromId
     // Binance ignores them anyway, and this prevents debugging confusion
   } else {
     if (startTime) params.startTime = startTime;
     if (endTime) params.endTime = endTime;
   }
   ```

2. **`getTrades` function (~line 447-451)**
   ```typescript
   // BEFORE
   const params: Record<string, any> = { symbol, limit };
   if (startTime) params.startTime = startTime;
   if (endTime) params.endTime = endTime;
   if (fromId) params.fromId = fromId;
   
   // AFTER  
   const params: Record<string, any> = { symbol, limit };
   // When using cursor-based pagination, omit time filters
   if (fromId) {
     params.fromId = fromId;
   } else {
     if (startTime) params.startTime = startTime;
     if (endTime) params.endTime = endTime;
   }
   ```

### Phase 2: Empty Response Retry (Frontend)

**File:** `src/hooks/use-binance-full-sync.ts`

**Changes in `fetchPaginatedIncomeChunk`:**

```typescript
// ADD: Constants at top
const EMPTY_RETRY_LIMIT = 2;
const EMPTY_RETRY_DELAY = 500; // Longer delay for race condition recovery

// MODIFY: fetchPaginatedIncomeChunk function
async function fetchPaginatedIncomeChunk(
  startTime: number,
  endTime: number,
  onPageProgress?: (page: number, recordsInChunk: number) => void
): Promise<{ records: BinanceIncome[]; errors: string[] }> {
  const allRecords: BinanceIncome[] = [];
  const errors: string[] = [];
  let fromId: number | undefined = undefined;
  let page = 0;
  let emptyRetryCount = 0; // NEW: Track empty retries
  
  while (true) {
    page++;
    
    try {
      const result = await callBinanceApi<BinanceIncome[]>('income', {
        startTime: fromId ? undefined : startTime,  // Don't send time filters with fromId
        endTime: fromId ? undefined : endTime,
        limit: RECORDS_PER_PAGE,
        ...(fromId && { fromId }),
      });
      
      if (!result.success) {
        errors.push(`Page ${page}: ${result.error || 'Unknown error'}`);
        break;
      }
      
      // NEW: Handle empty response with retry
      if (!result.data?.length) {
        if (emptyRetryCount < EMPTY_RETRY_LIMIT && fromId !== undefined) {
          // Only retry if we had previous data (fromId set) - race condition possible
          emptyRetryCount++;
          console.log(`[FullSync] Empty response, retry ${emptyRetryCount}/${EMPTY_RETRY_LIMIT}`);
          await new Promise(r => setTimeout(r, EMPTY_RETRY_DELAY));
          continue; // Retry same request
        }
        break; // Truly no more records
      }
      
      emptyRetryCount = 0; // Reset on successful data
      allRecords.push(...result.data);
      onPageProgress?.(page, allRecords.length);
      
      // ... rest unchanged
    }
  }
}
```

**File:** `src/services/binance-trade-enricher.ts`

**Changes in `fetchUserTradesChunk`:**

```typescript
// ADD: Constants
const EMPTY_RETRY_LIMIT = 2;
const EMPTY_RETRY_DELAY = 500;

async function fetchUserTradesChunk(
  symbol: string,
  startTime: number,
  endTime: number
): Promise<BinanceTrade[]> {
  const allTrades: BinanceTrade[] = [];
  let fromId: number | undefined = undefined;
  let emptyRetryCount = 0; // NEW
  
  while (true) {
    const result = await callBinanceApi<BinanceTrade[]>('trades', {
      symbol,
      // Only send time filters for initial request
      ...(fromId === undefined && { startTime, endTime }),
      limit: 1000,
      ...(fromId && { fromId }),
    });
    
    // NEW: Handle empty with retry
    if (!result.success || !result.data?.length) {
      if (result.success && fromId !== undefined && emptyRetryCount < EMPTY_RETRY_LIMIT) {
        emptyRetryCount++;
        console.log(`[Enricher] ${symbol}: Empty response, retry ${emptyRetryCount}/${EMPTY_RETRY_LIMIT}`);
        await new Promise(r => setTimeout(r, EMPTY_RETRY_DELAY));
        continue;
      }
      break;
    }
    
    emptyRetryCount = 0; // Reset on success
    allTrades.push(...result.data);
    
    if (result.data.length < 1000) break;
    
    fromId = result.data[result.data.length - 1].id + 1;
    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
  }
  
  return allTrades;
}
```

---

## Technical Flow Diagram

```text
┌─────────────────────────────────────────────────────────────────┐
│                    PAGINATION FLOW (FIXED)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  INITIAL REQUEST:                                               │
│  ┌───────────────────┐                                          │
│  │ startTime: T0     │                                          │
│  │ endTime: T1       │   →  Binance API  →  [ data... ]         │
│  │ limit: 1000       │                                          │
│  └───────────────────┘                                          │
│                                                                 │
│  SUBSEQUENT REQUESTS (cursor-based):                            │
│  ┌───────────────────┐                                          │
│  │ fromId: lastId+1  │   →  Binance API  →  [ data... ]         │
│  │ limit: 1000       │                                          │
│  │ (NO time filters) │   ← KEY CHANGE                           │
│  └───────────────────┘                                          │
│                                                                 │
│  EMPTY RESPONSE HANDLING:                                       │
│  ┌───────────────────────────────────────────────┐              │
│  │ Response: []                                  │              │
│  │                                               │              │
│  │ if (fromId exists && retryCount < 2):         │              │
│  │   wait 500ms                                  │              │
│  │   retry same request                          │              │
│  │ else:                                         │              │
│  │   stop pagination (truly empty)               │              │
│  └───────────────────────────────────────────────┘              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Type | Changes |
|------|------|---------|
| `supabase/functions/binance-futures/index.ts` | Edge Function | Parameter cleanup di `getIncomeHistory` dan `getTrades` |
| `src/hooks/use-binance-full-sync.ts` | Hook | Empty retry di `fetchPaginatedIncomeChunk` + param cleanup |
| `src/services/binance-trade-enricher.ts` | Service | Empty retry di `fetchUserTradesChunk` + param cleanup |

---

## Risk Assessment

| Risk | Mitigation |
|------|-----------|
| Edge function perubahan bisa break existing behavior | Binance sudah mengabaikan time filters dengan fromId, jadi behavior sama |
| Retry bisa memperlambat sync | Max 2 retry × 500ms = 1 detik overhead maksimal per empty response |
| Retry bisa infinite loop | Strict counter limit + only retry jika fromId sudah ada |

---

## Documentation Update Required

Setelah implementasi, update `docs/TRADE_HISTORY_COMPLETE_FLOW.md`:
- Section 4.2: Jelaskan parameter cleanup (fromId = no time filters)
- Section 4.3: Tambahkan empty retry behavior

---

## Testing Strategy

1. **Unit Test**: Verify parameter tidak dikirim bersamaan
2. **Integration Test**: Full sync dengan akun yang punya trading gap
3. **Manual Test**: Trigger sync dan monitor console logs untuk retry messages
