

# Cross-Check: 15 Potensi Bug/Gap — Temuan & Remediation Plan

## Methodology

Setiap area dicek langsung di codebase. Statusnya:
- **SAFE** = Sudah ter-handle di kode
- **MINOR GAP** = Ada gap kecil, perlu fix ringan  
- **NEEDS FIX** = Bug/gap nyata yang perlu diperbaiki

---

## Hasil Cross-Check

### 1. Server-Side Stats (RPC) — Filter Null/Empty → Heavy Load
**Status: SAFE**

`use-trade-stats.ts` line 82: `p_trade_mode: effectiveMode || null`. Jika null, RPC mengembalikan semua trades — tapi ini *by design* karena ada fallback ke `globalTradeMode` (line 51-53). RPC juga hanya SELECT aggregate tanpa returning rows, jadi load tetap ringan. Tidak perlu pagination pada aggregate function.

### 2. Cursor-Based Pagination — Stale Cursor
**Status: SAFE**

`use-trade-entries-paginated.ts` line 116-118 menggunakan composite cursor `(trade_date, id)`. Karena `id` adalah UUID yang immutable, cursor tidak bisa stale bahkan jika trade dihapus (soft-delete via `deleted_at`). React Query `getNextPageParam` otomatis mengembalikan `null` jika `hasMore = false`.

### 3. Mode Isolation — trades dengan `trade_mode = null`
**Status: MINOR GAP — NEEDS FIX**

`trade_mode` nullable di DB (`trade_mode: string | null`). Filter `.eq("trade_mode", "live")` akan **exclude** trades dengan `trade_mode = null`. Ini bisa menyebabkan trade lama (sebelum mode isolation diimplementasi) hilang dari tampilan.

**Fix**: Tambahkan migration untuk set default `trade_mode = 'live'` pada trades yang masih null, dan update column default.

### 4. Auto Incremental Sync — Multi-Tab Race Condition
**Status: MINOR GAP — NEEDS FIX**

`use-binance-incremental-sync.ts` line 296-300: `autoSyncOnMount` akan trigger `syncMutation.mutate()` di setiap tab/window yang mount halaman tersebut. Tidak ada cross-tab lock. `syncMutation.isPending` hanya lokal per-instance.

**Fix**: Tambahkan `localStorage`-based lock dengan timestamp (acquire lock, release on complete/error) + stale lock timeout (e.g., 5 menit).

### 5. Binance Source Filter — Mid-Sync Toggle
**Status: SAFE**

`use_binance_history` flag hanya dibaca saat query key changes, dan sync mutation reads filter at start. Toggle mid-sync tidak mengubah active mutation's filter — React Query isolation mencegah ini. Post-sync invalidation akan re-fetch dengan filter terbaru.

### 6. Stale Sync Detection — Timezone Mismatch
**Status: SAFE**

`use-binance-incremental-sync.ts` line 90-91 menggunakan `Date.now()` dan `getTime()` — keduanya Unix timestamps (UTC-independent). `STALE_THRESHOLD_MS` dihitung murni dengan milliseconds. Tidak ada timezone conversion yang bisa salah.

### 7. Trades Needing Enrichment — Double Count During Enrichment
**Status: MINOR GAP**

`useTradesNeedingEnrichmentCount` (line 192-197) queries `entry_price = 0`. Selama enrichment in-progress, count belum berubah sampai DB commit. Tapi enrichment update dilakukan per-trade (line 448), jadi count akan turun incrementally. Gap: jika user menekan enrich button saat enrichment sudah running → bisa double-trigger.

**Fix**: `isEnriching` state sudah dipakai di `ImportTrades.tsx` line 191 (`{!isEnriching && tradesNeedingEnrichment > 0}`). **Already guarded**. Status: **SAFE**.

### 8. Sync Quota — Atomic Increment & Timezone
**Status: MINOR GAP — NEEDS FIX**

Quota date check: `use-sync-quota.ts` line 36 `new Date().toISOString().split('T')[0]` — ini menggunakan **UTC date**, bukan local date. Jika user timezone = UTC+7, quota bisa reset 7 jam lebih awal dari midnight lokal mereka.

Atomicity: `increment_sync_quota` adalah server-side RPC (`Args: { p_user_id: string }; Returns: number`) — ini **atomic** karena berjalan di Postgres. Tapi calling code `increment_sync_quota` tidak ditemukan di client code — hanya di types.

**Fix 1**: Konsistenkan timezone — gunakan UTC date di semua tempat (sudah dilakukan, jadi ini konsisten). Dokumentasikan bahwa quota reset at UTC midnight.
**Fix 2**: Pastikan `increment_sync_quota` RPC dipanggil sebelum sync start di `useBinanceAggregatedSync`.

### 9. Sync Checkpoint Persistence — Atomic Save
**Status: SAFE**

Checkpoint disimpan di Zustand global store (`sync-store.ts`). Zustand `set()` adalah synchronous dan atomic. Checkpoint di-save setelah setiap batch sukses (line 418 di aggregated sync). Jika batch gagal, checkpoint tidak diupdate untuk batch tersebut — hanya `failedSymbols` ditambahkan.

### 10. Partial Failure Handling — Overflow Log & Retry Limit
**Status: SAFE**

`use-binance-aggregated-sync.ts` line 407-429: Batch insert has `MAX_INSERT_RETRIES = 3` with exponential delay. Failed symbols tracked in checkpoint's `failedSymbols` array. `scheduleRetry` in monitoring (line 192) checks `consecutiveFailures >= maxConsecutiveFailures` before scheduling. Max is bounded at 3.

### 11. Market Context — Corrupted JSONB Fallback
**Status: SAFE**

`use-capture-market-context.ts` line 96-102: `buildFearGreedContext` defaults to `value: 50, label: getFearGreedLabel(50)` when data missing. All context builders have `?? default` fallback patterns. UI components in `CombinedContextualScore.tsx` also handle undefined values gracefully.

### 12. Sync Reconciliation — Floating Point Precision
**Status: SAFE**

`calculateReconciliation` (trade-aggregator.ts line 297-300): `difference = Math.abs(aggregatedTotalPnl - matchedIncomePnl)`. Both values come from `income.income` field (Binance returns numbers, not strings). JavaScript floating point is used consistently on both sides — no precision mismatch between calculated and reported. `differencePercent` uses relative comparison. The 0.1% threshold is generous enough to absorb floating point rounding. **No false positives expected.**

### 13. Sync Quality Scoring — Outdated After New Trades
**Status: SAFE**

Quality score is calculated per-sync from `AggregationResult`. It's not persisted — it's computed from the current sync's match rate and shown in the Reconciliation Report. New trades don't affect a past report. The report is immutable once shown.

### 14. Sync Failure Monitoring & Retry — Max Retry Limit
**Status: SAFE**

`use-sync-monitoring.ts` line 192: `if (state.consecutiveFailures >= config.maxConsecutiveFailures)` → stops scheduling retries. `MAX_RETRY_COUNT = 3`. Cleanup after max retries: logs to console, no further retries. **No resource leak.**

### 15. Sync Notification — Dedup Mechanism
**Status: MINOR GAP — NEEDS FIX**

`notifySyncFailure` (notification-service.ts line 189-230) creates a new notification every time it's called. If sync keeps failing (e.g., 5 consecutive), it creates 1 notification at count=3, then another at count=4, then count=5. No dedup check for existing unread notification of same type.

**Fix**: Add dedup check before creating notification — query for existing unread `sync_error` notification within last hour, skip if exists.

---

## Summary: Items Needing Fix

| # | Area | Severity | Fix |
|---|------|----------|-----|
| 3 | Mode Isolation — null trade_mode | Minor | DB migration: `UPDATE trade_entries SET trade_mode = 'live' WHERE trade_mode IS NULL AND source = 'binance'`; set column default to `'live'` |
| 4 | Multi-Tab Race Condition | Medium | Add localStorage-based sync lock with stale timeout in `useBinanceIncrementalSync` |
| 8 | Sync Quota increment not called | Medium | Ensure `increment_sync_quota` RPC is called before sync starts in `useBinanceAggregatedSync`; add UTC midnight note to docs |
| 15 | Notification Dedup | Minor | Add dedup check in `notifySyncFailure` — skip if unread `sync_error` notification exists within last 1 hour |

## Implementation Plan

### Step 1: DB Migration — trade_mode default
```sql
-- Set existing null trade_mode to 'live' for binance trades
UPDATE trade_entries SET trade_mode = 'live' WHERE trade_mode IS NULL AND source = 'binance';
-- Set default for future inserts
ALTER TABLE trade_entries ALTER COLUMN trade_mode SET DEFAULT 'live';
```

### Step 2: Sync Lock (`src/hooks/use-binance-incremental-sync.ts`)
Add acquire/release lock around sync:
```typescript
const SYNC_LOCK_KEY = 'binance_incremental_sync_lock';
const LOCK_STALE_MS = 5 * 60 * 1000; // 5 minutes

function acquireSyncLock(): boolean {
  const existing = localStorage.getItem(SYNC_LOCK_KEY);
  if (existing) {
    const lockTime = parseInt(existing, 10);
    if (Date.now() - lockTime < LOCK_STALE_MS) return false; // locked
  }
  localStorage.setItem(SYNC_LOCK_KEY, Date.now().toString());
  return true;
}

function releaseSyncLock() {
  localStorage.removeItem(SYNC_LOCK_KEY);
}
```
Call `acquireSyncLock()` before `syncMutation.mutate()`, `releaseSyncLock()` in onSuccess/onError.

### Step 3: Sync Quota Enforcement (`src/hooks/use-binance-aggregated-sync.ts`)
At the start of `syncMutation.mutationFn`, call `check_sync_quota` RPC, throw if exhausted. After sync starts, call `increment_sync_quota` RPC.

### Step 4: Notification Dedup (`src/lib/notification-service.ts`)
In `notifySyncFailure`, before `createNotification`, query:
```typescript
const { data: existing } = await supabase
  .from('notifications')
  .select('id')
  .eq('user_id', userId)
  .eq('type', 'sync_error')
  .is('read_at', null)
  .gte('created_at', new Date(Date.now() - 3600000).toISOString())
  .maybeSingle();

if (existing) return true; // Skip, already notified
```

### Files Modified

| File | Change |
|------|--------|
| DB Migration | Set `trade_mode` default, backfill nulls |
| `src/hooks/use-binance-incremental-sync.ts` | Add cross-tab sync lock |
| `src/hooks/use-binance-aggregated-sync.ts` | Add quota check/increment |
| `src/lib/notification-service.ts` | Add notification dedup |

