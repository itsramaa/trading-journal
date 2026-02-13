

# Incremental Batch Insert for Binance Sync Engine

## Problem

The current sync pipeline is strictly sequential:

```text
fetch ALL symbols → group ALL → aggregate ALL → validate ALL → insert ALL at end
```

This means:
- If sync is interrupted at phase 6 (inserting), ALL processing work is lost
- UI shows no new trades until the entire pipeline completes
- For large accounts (200+ trades, 30+ symbols), this can take 5-10 minutes with zero visible progress in the journal

## Solution: Per-Symbol-Batch Pipeline

Process symbols in batches of 4 (matching existing `MAX_PARALLEL_SYMBOLS`), and for each batch run the complete pipeline through to DB insert before moving to the next batch.

```text
BEFORE (monolithic):
  fetch(sym1..sym30) → group(all) → aggregate(all) → validate(all) → insert(all)

AFTER (incremental):
  fetch(sym1..4) → group → aggregate → validate → insert → checkpoint
  fetch(sym5..8) → group → aggregate → validate → insert → checkpoint
  ...
  fetch(sym29..30) → group → aggregate → validate → insert → checkpoint
  → final reconciliation
```

## Architecture Changes

### File: `src/hooks/use-binance-aggregated-sync.ts`

**Core refactor of `syncMutation.mutationFn`:**

Replace the current linear phases 2-6 with a loop that processes symbol batches end-to-end:

1. **Phase 1** (unchanged): Fetch all income records, extract unique symbols
2. **Phase 2** (NEW loop): For each batch of symbols (4 at a time):
   a. Fetch trades + orders for batch symbols (existing `fetchTradesWithTolerance` logic, scoped to batch)
   b. Build `RawBinanceData` for this batch only (trades + orders + relevant income)
   c. `groupIntoLifecycles()` for this batch
   d. `aggregateAllLifecycles()` for this batch's complete lifecycles
   e. `validateAllTrades()` for this batch
   f. Dedup check against DB (`binance_trade_id IN (...)`)
   g. `batchInsertTrades()` for this batch's valid trades
   h. Save checkpoint with accumulated results
   i. `invalidateTradeQueries()` so UI updates immediately
3. **Phase 3** (adjusted): Final reconciliation across ALL accumulated trades

**New accumulator pattern:**

```typescript
interface BatchAccumulator {
  allAggregatedTrades: AggregatedTrade[];
  totalInserted: number;
  totalSkippedDupes: number;
  allFailures: AggregationFailure[];
  allLifecycles: PositionLifecycle[];
  failedBatches: Array<{ batch: number; error: string }>;
  validationStats: { valid: number; invalid: number; warnings: number };
}
```

Each symbol batch appends to this accumulator. Final reconciliation uses `allAggregatedTrades` + full income array.

**Checkpoint enhancement:**

Add `insertedTradeIds: string[]` to checkpoint so resume knows which trades are already in DB (idempotent — dedup check uses this + DB query).

**UI invalidation per batch:**

After each successful batch insert, call `invalidateTradeQueries(queryClient)` so the Trade History page shows new trades appearing incrementally.

### File: `src/store/sync-store.ts`

**Progress update for new flow:**

Update `AggregationProgress` phase type to include a new composite message format:

```text
"Processing BTCUSDT, ETHUSDT... (batch 3/8) — 45 trades inserted so far"
```

The existing phase names (`fetching-trades`, `grouping`, `aggregating`, `validating`, `inserting`) remain valid — they just cycle per batch instead of running once globally.

**Checkpoint schema addition:**

Add `insertedTradeIds: string[]` to `SyncCheckpoint` type so resume can skip already-inserted trades without querying DB for all of them.

### File: `src/services/binance/types.ts`

Add `insertedTradeIds` field to `SyncCheckpoint` interface:

```typescript
interface SyncCheckpoint {
  // ... existing fields
  insertedTradeIds: string[]; // NEW: tracks which trades are already in DB
}
```

## Idempotency Guarantee

Each batch insert is idempotent because:
1. Dedup check queries DB for `binance_trade_id IN (batch_ids)` before insert
2. Checkpoint tracks `insertedTradeIds` for resume scenarios
3. `binance_trade_id` is unique per trade — no duplicates possible even if same batch runs twice

## ETA Calculation Adjustment

Current ETA uses fixed phase weights (fetching-trades: 55%, inserting: 15%). With incremental inserts, the weight distribution shifts:

```typescript
// NEW: Single "processing" super-phase that encompasses fetch+group+aggregate+validate+insert per batch
// ETA = (elapsed / batchesCompleted) * batchesRemaining
```

Simpler and more accurate since each batch takes roughly the same time.

## Resume Behavior

When resuming from checkpoint:
- `processedSymbols` tells us which symbols are fully done (fetched + inserted)
- `insertedTradeIds` confirms what's in DB
- Resume starts from next unprocessed symbol batch
- No risk of duplicate inserts

## Files Modified

| File | Change |
|------|--------|
| `src/hooks/use-binance-aggregated-sync.ts` | Refactor phases 2-6 into per-batch loop with incremental insert + UI refresh |
| `src/store/sync-store.ts` | Update `createEmptyCheckpoint` to include `insertedTradeIds` |
| `src/services/binance/types.ts` | Add `insertedTradeIds` to `SyncCheckpoint` interface |

## What Does NOT Change

- `groupIntoLifecycles`, `aggregateAllLifecycles`, `validateAllTrades` — called per batch, same API
- `mapToDbRow` — unchanged
- `fetchTradesForSymbol`, `fetchOrdersForSymbol` — unchanged
- `BinanceFullSyncPanel` UI — unchanged (progress phases still cycle the same way)
- `SyncReconciliationReport` — unchanged (receives final accumulated result)
- `useBinanceFullSync` (legacy hook) — not touched

## Risk Mitigation

- Lifecycle grouping per batch may miss cross-symbol correlations — but Binance positions are per-symbol, so this is safe
- Income records for a symbol may span multiple batches — filter income by symbol before passing to `groupIntoLifecycles`
- Final reconciliation still uses ALL income vs ALL aggregated trades for accuracy

