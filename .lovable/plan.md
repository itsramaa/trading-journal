
# Plan: Complete Trading Journey - Binance Data Integration Enhancement

## Executive Summary

Berdasarkan dua dokumen yang diberikan:
1. **ANALYSIS_TRADE_GAP.md** - Mengidentifikasi bug kritis pada pagination (gap 600 fee vs 114 trades)
2. **BINANCE_API_DATA_SOURCES** - Dokumentasi lengkap endpoint Binance yang belum digunakan

Plan ini akan memperbaiki bug yang ada dan mengimplementasikan pengambilan data trading yang lengkap.

---

## Root Causes yang Diidentifikasi

### Bug #1: Pagination Tidak Diimplementasikan
```text
Current Flow:
Request: GET /fapi/v1/income?limit=1000
Response: 1000 records (CAPPED!)
Missing: Records 1001+ (NEVER FETCHED)
```
**Lokasi:** `useBinanceFullSync.ts` line 83-87

### Bug #2: Hanya Menggunakan 1 Endpoint (Income)
```text
Current:                           Available (Not Used):
├── /fapi/v1/income (REALIZED_PNL) ├── /fapi/v1/userTrades (EXACT entry/exit prices!)
└── ... nothing else               ├── /fapi/v1/allOrders (order types, avg price)
                                   ├── /fapi/v2/positionRisk (leverage, direction)
                                   └── /fapi/v1/forceOrders (liquidation history)
```

### Bug #3: Data Tidak Lengkap
```text
Current trade_entries:             Should have:
├── direction: 'LONG' (hardcoded)  ├── direction: from positionSide
├── entry_price: 0                 ├── entry_price: from userTrades/allOrders
├── exit_price: 0                  ├── exit_price: from userTrades/allOrders
├── quantity: 0                    ├── quantity: from userTrades qty
├── fees: null                     ├── fees: from COMMISSION income
└── leverage: null                 └── leverage: from positionRisk
```

---

## Solution Architecture

### Phase 1: Fix Critical Pagination Bug (Priority CRITICAL)

**Target:** Mengatasi cap 1000 records per request

```text
┌─────────────────────────────────────────────────────────────────┐
│              NEW PAGINATED INCOME FETCH                          │
└─────────────────────────────────────────────────────────────────┘

BEFORE (BROKEN):
  Chunk 1 (90 days) ──► API call ──► 1000 records (CAPPED!)
                                     Records 1001-N = LOST

AFTER (FIXED):
  Chunk 1 (90 days) ──► API call (fromId=undefined) ──► 1000 records
                   └──► API call (fromId=last+1)    ──► 1000 records
                   └──► API call (fromId=last+1)    ──► 500 records
                   └──► STOP (length < 1000)
                   └──► Total: 2500 records (ALL CAPTURED)
```

**Files to modify:**
1. `supabase/functions/binance-futures/index.ts` - Add `fromId` parameter
2. `src/hooks/use-binance-full-sync.ts` - Implement pagination loop
3. `src/features/binance/useBinanceFutures.ts` - Fix `useBinanceAllIncome`

---

### Phase 2: Enhance Trade Data with userTrades Endpoint (Priority HIGH)

**Target:** Capture exact entry/exit prices, quantity, direction

```text
┌─────────────────────────────────────────────────────────────────┐
│           ENHANCED TRADE RECONSTRUCTION                          │
└─────────────────────────────────────────────────────────────────┘

Current Flow:
  /income (REALIZED_PNL) ──► trade_entries (missing entry/exit prices)

New Flow:
  /income (REALIZED_PNL) ─┬─► Get orderId from income.orderId
                          │
                          ├──► /userTrades (orderId) ──► entry/exit fills
                          │    ├── BUY fills = entry price
                          │    ├── SELL fills = exit price
                          │    ├── qty = position size
                          │    └── positionSide = direction
                          │
                          └──► trade_entries (COMPLETE DATA)
```

**New data captured:**
| Field | Source | Current | After |
|-------|--------|---------|-------|
| entry_price | userTrades (BUY fill) | 0 | ✅ Actual |
| exit_price | userTrades (SELL fill) | 0 | ✅ Actual |
| quantity | userTrades.qty | 0 | ✅ Actual |
| direction | userTrades.positionSide | 'LONG' (hardcoded) | ✅ LONG/SHORT |
| commission | userTrades.commission | null | ✅ Per-trade fee |
| is_maker | userTrades.maker | - | ✅ Maker/Taker |

---

### Phase 3: Link Income Types to Trades (Priority MEDIUM)

**Target:** Properly categorize and link COMMISSION, FUNDING_FEE to trades

```text
┌─────────────────────────────────────────────────────────────────┐
│              INCOME TYPE PROCESSING                              │
└─────────────────────────────────────────────────────────────────┘

Income Stream:
├── REALIZED_PNL ──────► trade_entries.realized_pnl
├── COMMISSION ────────► trade_entries.fees (linked by orderId)
├── FUNDING_FEE ───────► Separate tracking per position hold time
└── TRANSFER ──────────► account_transactions (existing)
```

**Implementation:**
```typescript
// Group income by orderId for linking
const incomeByOrder = new Map<number, {
  realizedPnl: BinanceIncome | null,
  commissions: BinanceIncome[],
  fundingFees: BinanceIncome[]
}>();

// Process income stream
for (const income of allIncome) {
  if (!incomeByOrder.has(income.orderId)) {
    incomeByOrder.set(income.orderId, { realizedPnl: null, commissions: [], fundingFees: [] });
  }
  const group = incomeByOrder.get(income.orderId)!;
  
  if (income.incomeType === 'REALIZED_PNL') {
    group.realizedPnl = income;
  } else if (income.incomeType === 'COMMISSION') {
    group.commissions.push(income);
  }
}

// Create trade entry with linked data
function createEnhancedTradeEntry(group, userTrades) {
  const entryFill = userTrades.find(t => t.side === 'BUY');
  const exitFill = userTrades.find(t => t.side === 'SELL' && t.realizedPnl !== 0);
  
  return {
    entry_price: entryFill?.price || 0,
    exit_price: exitFill?.price || 0,
    quantity: entryFill?.qty || 0,
    direction: entryFill?.positionSide || 'LONG',
    fees: group.commissions.reduce((sum, c) => sum + Math.abs(c.income), 0),
    realized_pnl: group.realizedPnl?.income || 0,
    // ... other fields
  };
}
```

---

### Phase 4: Add Position Context (Priority MEDIUM)

**Target:** Capture leverage, margin type, liquidation info

**Endpoint:** `/fapi/v2/positionRisk`

```typescript
// Already implemented in edge function (line 373-410)
// Just need to use it during sync to get:
interface PositionContext {
  leverage: number;        // e.g., 20
  marginType: string;      // 'isolated' | 'cross'
  liquidationPrice: number;
  positionSide: 'LONG' | 'SHORT' | 'BOTH';
}
```

**Schema update needed:**
```sql
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS leverage INTEGER;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS margin_type TEXT;
```

---

## File Changes Matrix

### Edge Function Updates

| File | Changes |
|------|---------|
| `supabase/functions/binance-futures/index.ts` | Add `fromId` param to getIncomeHistory |

**Code change:**
```typescript
// Line 569-607: getIncomeHistory function
async function getIncomeHistory(
  apiKey: string, 
  apiSecret: string, 
  incomeType?: string,
  startTime?: number,
  endTime?: number,
  limit = 1000,
  fromId?: number  // NEW: cursor pagination
) {
  const params: Record<string, any> = { limit };
  if (incomeType) params.incomeType = incomeType;
  if (startTime) params.startTime = startTime;
  if (endTime) params.endTime = endTime;
  if (fromId) params.fromId = fromId;  // ADDED
  // ... rest unchanged
}
```

---

### Frontend Hook Updates

| File | Changes |
|------|---------|
| `src/hooks/use-binance-full-sync.ts` | Implement paginated fetch loop |
| `src/features/binance/useBinanceFutures.ts` | Fix useBinanceAllIncome pagination |
| `src/features/binance/types.ts` | Add fromId to params type |

**Key logic for pagination:**
```typescript
// useBinanceFullSync.ts - fetchPaginatedIncomeChunk
async function fetchPaginatedIncomeChunk(
  startTime: number,
  endTime: number,
  onPageProgress?: (page: number, records: number) => void
): Promise<BinanceIncome[]> {
  const allRecords: BinanceIncome[] = [];
  let fromId: number | undefined = undefined;
  let page = 0;
  
  while (true) {
    page++;
    const result = await callBinanceApi<BinanceIncome[]>('income', {
      startTime,
      endTime,
      limit: 1000,
      ...(fromId && { fromId }),
    });
    
    if (!result.success || !result.data?.length) break;
    
    allRecords.push(...result.data);
    onPageProgress?.(page, allRecords.length);
    
    // Stop if less than limit (no more pages)
    if (result.data.length < 1000) break;
    
    // Get next page cursor
    fromId = result.data[result.data.length - 1].tranId + 1;
    
    // Rate limit
    await new Promise(r => setTimeout(r, RATE_LIMIT_DELAY));
  }
  
  return allRecords;
}
```

---

### New Trade Enrichment Service

**New File:** `src/services/binance-trade-enricher.ts`

```typescript
/**
 * Service to enrich trade entries with detailed Binance data
 * Uses userTrades endpoint to get exact entry/exit prices
 */
export interface EnrichedTradeData {
  // From income
  realizedPnl: number;
  tradeDate: Date;
  symbol: string;
  
  // From userTrades (NEW)
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  direction: 'LONG' | 'SHORT';
  entryTime: Date;
  exitTime: Date;
  
  // From commission income (NEW)
  totalFees: number;
  makerFees: number;
  takerFees: number;
  
  // Calculated
  grossPnl: number;  // Price diff × quantity
  netPnl: number;    // grossPnl - fees
}
```

---

## Database Schema Updates

```sql
-- Phase 4: Add missing columns for enhanced trade data
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS leverage INTEGER;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS margin_type TEXT;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS is_maker BOOLEAN;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS entry_order_type TEXT;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS exit_order_type TEXT;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS hold_time_minutes INTEGER;
ALTER TABLE trade_entries ADD COLUMN IF NOT EXISTS funding_fees NUMERIC DEFAULT 0;

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trade_entries_binance_order_id 
  ON trade_entries(binance_order_id) WHERE binance_order_id IS NOT NULL;
```

---

## Implementation Phases

### Phase 1: Pagination Fix (Days 1-2)

1. Update Edge Function with `fromId` support
2. Implement paginated fetch in `useBinanceFullSync`
3. Apply same fix to `useBinanceAllIncome` (Fee/Funding tabs)
4. Test with accounts having >1000 records

**Deliverables:**
- All income records fetched (no more 1000 cap)
- Fee/Funding tabs show complete data
- Progress tracking shows page count

### Phase 2: userTrades Integration (Days 3-4)

1. Add action handler for bulk userTrades fetch by symbols
2. Create trade enrichment service
3. Link userTrades fills to income records by orderId
4. Populate entry_price, exit_price, quantity, direction

**Deliverables:**
- Trades have real entry/exit prices
- Direction correctly identified (LONG/SHORT)
- Quantity populated

### Phase 3: Commission Linking (Day 5)

1. Group COMMISSION income by orderId
2. Sum and link to corresponding trade entry
3. Update fees field in trade_entries

**Deliverables:**
- fees column populated per trade
- FeeHistoryTab can show per-trade fees

### Phase 4: Position Context (Day 6)

1. Fetch position info during open positions
2. Cache leverage and margin type
3. Add schema columns
4. Populate during sync

**Deliverables:**
- leverage field populated
- margin_type field populated

---

## Testing Checklist

```text
[ ] Phase 1: Pagination
    [ ] Fetch >1000 income records in single 90-day chunk
    [ ] Verify all tranIds are unique (no duplicates)
    [ ] Progress shows correct page count
    [ ] FeeHistoryTab shows all 600+ records

[ ] Phase 2: userTrades
    [ ] Entry price matches Binance dashboard
    [ ] Exit price matches Binance dashboard
    [ ] Direction shows LONG or SHORT correctly
    [ ] Quantity matches position size

[ ] Phase 3: Commission Linking
    [ ] fees column has values
    [ ] Sum of fees matches FeeHistoryTab total
    
[ ] Phase 4: Position Context
    [ ] leverage shows correct multiplier
    [ ] margin_type shows isolated/cross
```

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Trades synced | 114 | 500+ (estimated) |
| Income records fetched | 1000 (capped) | All (2500+) |
| Entry price accuracy | 0 (missing) | 100% |
| Exit price accuracy | 0 (missing) | 100% |
| Direction accuracy | 0% (hardcoded LONG) | 100% |
| Fee tracking | ❌ Separate tab only | ✅ Per-trade linked |
| Leverage tracking | ❌ None | ✅ Per-trade |

---

## Risk Assessment

**Low Risk:**
- Backward compatible (existing trades preserved)
- Uses documented Binance API parameters
- Rate limiting maintained

**Medium Risk:**
- Increased API calls per sync (mitigated by rate limiting)
- Longer sync time for large histories (mitigated by progress UI)
- userTrades requires symbol (need to fetch per symbol, not global)

**Mitigation:**
- Implement incremental sync option for daily use
- Full sync only for initial import or recovery
- Cache symbol list from existing trades
