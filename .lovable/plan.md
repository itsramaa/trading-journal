
# Plan: Data Wajib Lengkap + Re-Enrich Existing Trades

## ✅ STATUS: IMPLEMENTED

All phases completed. Ready for testing.

---

## Problem Statement

Cross-check menunjukkan **124 trade Binance di database memiliki data tidak lengkap**:

| Field | Current Value | Should Be |
|-------|--------------|-----------|
| entry_price | 0 | Actual from userTrades |
| exit_price | 0 | Actual from userTrades |
| quantity | 0 | Actual position size |
| direction | 'LONG' (hardcoded) | LONG/SHORT from positionSide |
| fees | 0 | Commission from userTrades |

---

## Solution Implemented

### ✅ Phase A: Re-Enrich Button in TradeHistory

**File**: `src/pages/TradeHistory.tsx`
- Added "Enrich X Trades" button with count badge
- Progress dialog showing phases (checking, fetching-income, fetching-trades, updating)
- "All trades enriched" badge when count is 0

### ✅ Phase B: Extended Enrichment Hook  

**File**: `src/hooks/use-trade-enrichment-binance.ts`
- Extended to 730 days (2 years) default range
- Added `useTradesNeedingEnrichmentCount()` query hook
- Cursor-based pagination for >1000 income records
- Targets trades with `entry_price = 0`
- Progress tracking with detailed messages

### ✅ Phase C: Auto-Enrichment on Sync

**File**: `src/hooks/use-binance-full-sync.ts`
- Enrichment runs by default (`skipEnrichment = false`)
- Uses `fetchEnrichedTradesForSymbols()` from enricher service
- Falls back to basic data if enrichment fails

---

## Files Changed

1. `src/pages/TradeHistory.tsx` - Added Re-Enrich button and progress UI
2. `src/hooks/use-trade-enrichment-binance.ts` - Complete rewrite with pagination
3. `src/hooks/use-binance-full-sync.ts` - Already has enrichment enabled
4. `src/services/binance-trade-enricher.ts` - Core enrichment logic

---

## Testing Instructions

1. Go to Trade History page
2. If "Enrich X Trades" button appears, click it
3. Watch progress as it fetches income → fetches trades → updates DB
4. After completion, verify trades show entry/exit prices

### Verification Query
```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN entry_price > 0 THEN 1 END) as has_entry,
  COUNT(CASE WHEN exit_price > 0 THEN 1 END) as has_exit,
  COUNT(CASE WHEN quantity > 0 THEN 1 END) as has_quantity
FROM trade_entries
WHERE source = 'binance' AND deleted_at IS NULL;
```

Target: All counts should match `total`.

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Trades with entry_price > 0 | 0/124 | 124/124 |
| Trades with exit_price > 0 | 0/124 | 124/124 |
| Trades with correct direction | 124/124 | 124/124 |
| Trades with quantity > 0 | 0/124 | 124/124 |
