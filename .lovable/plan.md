

# Optimization Plan: Binance Sync Accuracy & Speed

## Summary

Dua area utama yang dapat dioptimasi:
1. **Accuracy**: Meningkatkan match rate antara income dan trades
2. **Speed**: Mempercepat waktu sync dengan parallel fetching dan caching

---

## Current Analysis

### Bottleneck Identification

| Area | Current State | Issue |
|------|---------------|-------|
| Symbol Fetching | 2 parallel, sequential between batches | 76 symbols × ~2 API calls = ~152 API calls untuk trades saja |
| Income Matching | 5-minute bucket fallback | Jika tidak ada `tradeId`, matching bisa miss |
| Trades API | 6.5-day chunks per symbol | 90 hari = ~14 chunks per symbol |
| Orders API | Fetched per symbol | Sering tidak diperlukan untuk P&L calculation |
| Rate Limit Delay | 500ms base, adaptive | Bisa lebih agresif untuk initial burst |

### Why Only 50 Trades from 347 REALIZED_PNL?

1. **Incomplete Lifecycles**: Position belum ditutup → skip
2. **Aggregation Consolidation**: Multiple fills → 1 lifecycle → 1 trade
3. **Income No Match**: Income tanpa matching trades → tidak jadi lifecycle
4. **Zero PnL Filter**: Breakeven dengan PnL = 0 mungkin di-skip

---

## Optimization Plan

### Phase 1: Improve Match Accuracy (Priority: HIGH)

#### 1.1 Add tradeId to Income Records (Edge Function)

**File:** `supabase/functions/binance-futures/index.ts`

**Current:** Income API response tidak selalu punya `tradeId`
**Solution:** Binance /fapi/v1/income sudah include `tradeId` field sejak update 2023

```typescript
// In getIncomeHistory, ensure tradeId is mapped
const records = data.map((r: any) => ({
  // ... existing fields
  tradeId: r.tradeId ? String(r.tradeId) : null, // Ensure string for consistency
}));
```

#### 1.2 Enhance Matching with tradeId Priority

**File:** `src/services/binance/position-lifecycle-grouper.ts`

```typescript
// findRelatedIncomeByTradeId already uses tradeId as PRIMARY
// But we need to verify tradeId is being passed correctly
```

#### 1.3 Add Debug Logging for Unmatched Income

**File:** `src/hooks/use-binance-aggregated-sync.ts`

```typescript
// After aggregation, log unmatched REALIZED_PNL for debugging
const unmatchedPnl = income.filter(i => 
  i.incomeType === 'REALIZED_PNL' && 
  !matchedIncomeIds.has(...)
);
console.log(`[FullSync] ${unmatchedPnl.length} unmatched REALIZED_PNL records`);
```

---

### Phase 2: Speed Optimization (Priority: MEDIUM)

#### 2.1 Increase Parallel Symbol Fetching

**File:** `src/hooks/use-binance-aggregated-sync.ts`

```typescript
// Current
const MAX_PARALLEL_SYMBOLS = 2;

// Proposed - more aggressive but within rate limits
const MAX_PARALLEL_SYMBOLS = 4;
```

**Risk:** Rate limit (429) lebih sering. Mitigasi: adaptive backoff sudah ada.

#### 2.2 Skip Orders Fetch (Optional)

**Observation:** Orders data used for `entryOrderType` dan `exitOrderType` saja.
**Proposal:** Make orders fetch optional, default off untuk speed.

```typescript
interface FullSyncOptions {
  // ... existing
  includeOrderTypes?: boolean; // default false
}

// In fetchTradesWithTolerance:
if (options.includeOrderTypes) {
  const orders = await fetchOrdersForSymbol(...);
}
```

**Impact:** Removes ~76 API calls, saves ~38 seconds.

#### 2.3 Reduce Rate Limit Delay for Burst

```typescript
// More aggressive initial delay
const BURST_RATE_LIMIT_DELAY = 300; // First 50 calls
const SUSTAINED_RATE_LIMIT_DELAY = 500; // After rate limit hit
```

#### 2.4 Smart Income-First Symbol Filtering

**Current:** Fetch trades for ALL symbols with ANY income type.
**Proposed:** Only fetch trades for symbols with REALIZED_PNL.

```typescript
function getSymbolsWithPnl(income: BinanceIncome[]): string[] {
  return [...new Set(
    income
      .filter(i => i.incomeType === 'REALIZED_PNL' && i.income !== 0)
      .map(i => i.symbol)
      .filter(isValidFuturesSymbol)
  )];
}
```

**Impact:** If 76 symbols have income but only 40 have PnL, saves 36 symbol fetches = ~72 API calls.

---

### Phase 3: Diagnostic Improvements (Priority: LOW)

#### 3.1 Enhanced Sync Summary

Add detailed post-sync log:

```typescript
console.log('[FullSync] === SYNC SUMMARY ===');
console.log(`Total Income Records: ${income.length}`);
console.log(`  - REALIZED_PNL: ${pnlCount} (non-zero: ${nonZeroPnl})`);
console.log(`  - COMMISSION: ${commCount}`);
console.log(`  - FUNDING_FEE: ${fundingCount}`);
console.log(`Symbols Processed: ${processedSymbols.length}`);
console.log(`Lifecycles Created: ${lifecycles.length}`);
console.log(`  - Complete: ${completeCount}`);
console.log(`  - Incomplete: ${incompleteCount}`);
console.log(`Trades Inserted: ${insertedCount}`);
console.log(`Match Rate: ${(aggregatedTrades.length / nonZeroPnl * 100).toFixed(1)}%`);
```

#### 3.2 Add "Sync Quality" Score

Display in UI after sync:
- **Excellent**: 95%+ match rate
- **Good**: 80-95% match rate  
- **Fair**: 60-80% match rate
- **Poor**: <60% match rate

---

## Implementation Priority

| Phase | Effort | Impact | Priority |
|-------|--------|--------|----------|
| 1.1 tradeId mapping | Low | High | ⭐⭐⭐ |
| 1.3 Debug logging | Low | Medium | ⭐⭐⭐ |
| 2.4 Symbol filtering | Medium | High | ⭐⭐⭐ |
| 2.1 Parallel increase | Low | Medium | ⭐⭐ |
| 2.2 Skip orders | Low | Medium | ⭐⭐ |
| 3.1 Enhanced summary | Low | Low | ⭐ |

---

## Expected Results

| Metric | Before | After |
|--------|--------|-------|
| Sync Time (90 days, 76 symbols) | ~5-8 min | ~2-4 min |
| Match Rate (PnL to trades) | Unknown | Visible with logging |
| API Calls per Sync | ~300+ | ~150-200 |

---

## Technical Flow After Optimization

```text
┌─────────────────────────────────────────────────────────────────┐
│                    OPTIMIZED SYNC FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. FETCH INCOME (unchanged)                                    │
│     └─> All income types (REALIZED_PNL, COMMISSION, etc)        │
│                                                                 │
│  2. FILTER SYMBOLS (NEW)                                        │
│     └─> Only symbols with non-zero REALIZED_PNL                 │
│     └─> 76 symbols → ~40 symbols (estimated 50% reduction)      │
│                                                                 │
│  3. FETCH TRADES (FASTER)                                       │
│     └─> 4 parallel instead of 2                                 │
│     └─> Skip orders fetch (optional)                            │
│                                                                 │
│  4. MATCH INCOME → TRADES (IMPROVED)                            │
│     └─> Primary: tradeId matching (100% accurate)               │
│     └─> Fallback: 5-min time bucket                             │
│     └─> Log unmatched for debugging                             │
│                                                                 │
│  5. GROUP → AGGREGATE → VALIDATE → INSERT (unchanged)           │
│                                                                 │
│  6. SUMMARY (NEW)                                               │
│     └─> Detailed breakdown                                      │
│     └─> Match rate percentage                                   │
│     └─> Quality score                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/binance-futures/index.ts` | Verify tradeId mapping in income response |
| `src/hooks/use-binance-aggregated-sync.ts` | Symbol filtering, parallel increase, debug logging |
| `src/services/binance/position-lifecycle-grouper.ts` | Verify tradeId matching logic |

---

## Recommendations

**Immediate (Do Now):**
1. Add debug logging untuk melihat berapa PnL yang unmatched
2. Filter symbols berdasarkan REALIZED_PNL saja

**Short-term (Next Sprint):**
1. Increase parallel fetching ke 4
2. Make orders fetch optional
3. Add sync quality score

**Long-term:**
1. Implement incremental sync (only new data since last sync)
2. Cache income data in localStorage for faster resume

