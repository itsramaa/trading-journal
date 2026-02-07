

# Plan: Data Wajib Lengkap + Re-Enrich Existing Trades

## Problem Statement

Cross-check menunjukkan **semua 124 trade Binance di database memiliki data tidak lengkap**:

| Field | Current Value | Should Be |
|-------|--------------|-----------|
| entry_price | 0 | Actual from userTrades |
| exit_price | 0 | Actual from userTrades |
| quantity | 0 | Actual position size |
| direction | 'LONG' (hardcoded) | LONG/SHORT from positionSide |
| fees | 0 | Commission from userTrades |
| hold_time_minutes | null | Calculated |
| is_maker | null | Maker/Taker info |

**Root Cause**: Enrichment hanya berjalan saat **sync baru**, bukan untuk data yang sudah ada di database.

---

## Solution Architecture

### Phase A: Add "Re-Enrich" Button to TradeHistory Page

Tambahkan tombol untuk meng-enrich ulang semua trade Binance yang ada di database.

**Location**: `src/pages/TradeHistory.tsx` - dekat tombol Sync Full History

**UI Flow**:
```text
[Sync Full History] [Re-Enrich Trades]
                          │
                          ▼
               ┌─────────────────────┐
               │ Progress Dialog:    │
               │ - Fetching income   │
               │ - Fetching trades   │
               │ - Updating DB       │
               │ [52/124 enriched]   │
               └─────────────────────┘
```

### Phase B: Fix Enrichment Hook untuk Handle SEMUA Data

Perbaiki `useTradeEnrichmentBinance` untuk:
1. Fetch trades yang memiliki `entry_price = 0` dari database
2. Extend daysBack ke 730 hari (2 tahun) untuk cover semua history
3. Update dengan pagination yang benar (handle >1000 records)

**Code Changes**:

```typescript
// use-trade-enrichment-binance.ts - Extended version
export function useTradeEnrichmentBinance() {
  // ...
  const enrichTrades = useMutation({
    mutationFn: async (options: {
      daysBack?: number;
      onlyMissingData?: boolean; // NEW: Only enrich trades with entry_price=0
      onProgress?: (progress: EnrichmentProgress) => void;
    } = {}): Promise<EnrichmentResult> => {
      const { daysBack = 730, onlyMissingData = true, onProgress } = options;
      
      // Step 0: Get binance trades that need enrichment
      if (onlyMissingData) {
        const { data: tradesNeedingEnrichment } = await supabase
          .from('trade_entries')
          .select('binance_trade_id, trade_date')
          .eq('user_id', user.id)
          .eq('source', 'binance')
          .eq('entry_price', 0)
          .order('trade_date', { ascending: false });
        
        // Use these trades' date range for fetching
        // ...
      }
      // ... rest of logic
    }
  });
}
```

### Phase C: Make Future Syncs Always Enrich

Memastikan **setiap sync baru selalu menggunakan enrichment** - ini sudah diimplementasi tapi perlu verifikasi flow.

**Verification Checklist**:
- `useBinanceFullSync.ts` line 397-452: Enrichment phase sudah ada
- `skipEnrichment` default = `false` (sudah benar)
- `enrichedTradeToEntry()` mengisi semua field yang diperlukan

### Phase D: Add Validation Before Insert

Tambahkan validasi bahwa trade **wajib punya entry_price > 0** sebelum disimpan, atau diberi flag `needs_enrichment`.

---

## File Changes

### 1. `src/pages/TradeHistory.tsx`
- Import `useTradeEnrichmentBinance` hook
- Add "Re-Enrich Trades" button next to Sync button
- Add progress dialog for enrichment
- Show count of trades needing enrichment

### 2. `src/hooks/use-trade-enrichment-binance.ts`
- Extend `daysBack` default to 730 (2 years)
- Add `onlyMissingData` option to filter trades with `entry_price = 0`
- Implement paginated income fetch (handle >1000 records)
- Better progress tracking with phases

### 3. `src/hooks/use-binance-full-sync.ts`
- Ensure enrichment is NEVER skipped by default
- Add fallback to basic entry if enrichment fails (log warning)
- Add `needs_enrichment` flag for trades that couldn't be enriched

### 4. `docs/TRADE_HISTORY_ARCHITECTURE.md`
- Document enrichment requirements
- Add troubleshooting section for incomplete data

---

## Database Query for Verification

After implementation, run this to verify data completeness:

```sql
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN entry_price > 0 THEN 1 END) as has_entry,
  COUNT(CASE WHEN exit_price > 0 THEN 1 END) as has_exit,
  COUNT(CASE WHEN quantity > 0 THEN 1 END) as has_quantity,
  COUNT(CASE WHEN direction IN ('LONG', 'SHORT') THEN 1 END) as has_direction
FROM trade_entries
WHERE source = 'binance' AND deleted_at IS NULL;
```

Target: All counts should match `total`.

---

## UI Design for Re-Enrich Button

```text
┌──────────────────────────────────────────────────────────────┐
│ [Sync Full History]  [Re-Enrich 124 Trades]                  │
│                            ▲                                  │
│                            │                                  │
│         Badge: "124 trades need enrichment"                  │
└──────────────────────────────────────────────────────────────┘
```

Button states:
- **Default**: "Re-Enrich 124 Trades" (shows count)
- **Loading**: "Enriching... 52/124" with progress
- **Done**: "All trades enriched" (disabled, green check)

---

## Implementation Steps

### Step 1: Update TradeHistory UI
1. Add state for enrichment progress
2. Import and use `useTradeEnrichmentBinance` hook
3. Add count query for trades needing enrichment
4. Add Re-Enrich button with progress dialog

### Step 2: Fix Enrichment Hook
1. Extend daysBack to 730
2. Add pagination for income fetch (>1000 records)
3. Add `onlyMissingData` filter
4. Improve error handling

### Step 3: Verify Sync Enrichment
1. Ensure enrichment runs by default
2. Add logging for enrichment success/failure
3. Add fallback handling

### Step 4: Testing
1. Click Re-Enrich button
2. Verify all 124 trades get updated
3. Check entry_price, exit_price, direction, quantity are populated
4. Run verification SQL query

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Trades with entry_price > 0 | 0/124 | 124/124 |
| Trades with exit_price > 0 | 0/124 | 124/124 |
| Trades with correct direction | 0/124 | 124/124 |
| Trades with quantity > 0 | 0/124 | 124/124 |
| Trades with fees data | 0/124 | ~124/124 |

---

## Technical Notes

### Binance userTrades API Behavior
- Requires `symbol` parameter (cannot fetch all symbols at once)
- Returns trades sorted by id ascending when using `fromId`
- Each call limited to 1000 records
- Rate limit: 5 weight per call

### Enrichment Matching Strategy
Current: Match by `symbol + approximate exit time (1-minute bucket)`
This may miss some trades if timing differs. Consider:
- Using `orderId` from income record if available
- Expanding time bucket to 5 minutes
- Matching by realized P&L amount as secondary check

