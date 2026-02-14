

# Import & Sync Page - Functional Correctness Audit

## Audit Scope

Reviewed all files in the Import & Sync domain: page (`ImportTrades.tsx`), components (`BinanceFullSyncPanel.tsx`, `SolanaTradeImport.tsx`, `SyncStatusBadge.tsx`, `SyncReconciliationReport.tsx`, `SyncQuotaDisplay.tsx`, `ReSyncTimeWindow.tsx`, `SyncRangeSelector.tsx`, `SyncETADisplay.tsx`), hooks (`use-binance-incremental-sync.ts`, `use-binance-aggregated-sync.ts`, `use-trade-enrichment-binance.ts`, `use-solana-trade-import.ts`, `use-sync-quota.ts`, `use-binance-background-sync.ts`), store (`sync-store.ts`), services (`binance/`, `solana-trade-parser.ts`, `binance-trade-enricher.ts`), types, constants, cross-tab locking, and the service worker (`sw-custom.js`).

---

## Issues Found

### 1. Solana Import Direction Mapping Violates DB Constraint (Data Integrity - CRITICAL)

**File:** `src/hooks/use-solana-trade-import.ts` (line 189)

The `mapToTradeEntry` function maps directions as:
```typescript
direction: trade.direction === 'LONG' ? 'BUY' : trade.direction === 'SHORT' ? 'SELL' : 'UNKNOWN',
```

The `trade_entries` table has a CHECK constraint:
```sql
CHECK (direction = ANY (ARRAY['LONG', 'SHORT', 'long', 'short']))
```

`BUY`, `SELL`, and `UNKNOWN` are **not allowed values**. Every Solana import attempt will fail with a constraint violation error. The Binance sync hooks correctly use `LONG`/`SHORT` directly, confirming this is a Solana-specific regression.

**Fix:** Map direction to the correct enum values:
```typescript
direction: trade.direction === 'LONG' ? 'LONG' : trade.direction === 'SHORT' ? 'SHORT' : 'LONG',
```
(Fallback to `LONG` is safe since the parser already determines direction; `UNKNOWN` is not a valid DB value).

---

### 2. Enrichment Error Toast Leaks Internal Error Messages (Security - HIGH)

**File:** `src/hooks/trading/use-trade-enrichment-binance.ts` (line 493)

The `onError` callback exposes raw error messages to the user:
```typescript
toast.error(`Enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
```

This can leak internal implementation details (Supabase errors, API response payloads, database constraint messages). The project's security standard requires generic messages on the client with internal details logged server-side only. Every other audited edge function and sync handler follows this pattern.

**Fix:** Show a generic message and log the details:
```typescript
onError: (error) => {
  console.error('[Enrichment] Error:', error);
  toast.error('Enrichment failed. Please try again or contact support.');
},
```

---

### 3. Page Missing Top-Level ErrorBoundary (Comprehensiveness - MEDIUM)

**File:** `src/pages/ImportTrades.tsx`

The page renders complex sub-components (`BinanceFullSyncPanel`, `SolanaTradeImport`) with no `ErrorBoundary`. A runtime error in any sync component (e.g., malformed checkpoint data from localStorage, unexpected API response shape) will crash the entire page. Every other audited page now has a top-level ErrorBoundary with key-based retry.

**Fix:** Add ErrorBoundary with `retryKey` pattern:
```typescript
import { ErrorBoundary } from "@/components/ui/error-boundary";

const [retryKey, setRetryKey] = useState(0);

<ErrorBoundary title="Import & Sync" onRetry={() => setRetryKey(k => k + 1)}>
  <div key={retryKey} className="space-y-6">
    {/* existing content */}
  </div>
</ErrorBoundary>
```

---

### 4. Incremental Sync `releaseSyncLock` Not Called on Early Return (Code Quality - MEDIUM)

**File:** `src/hooks/binance/use-binance-incremental-sync.ts` (lines 176-207)

When the sync lock is acquired (line 176) but no income records are found (line 198), the function returns early at line 201 without calling `releaseSyncLock()`. The lock persists in localStorage until it goes stale (5 minutes), blocking all other tabs from syncing during that window.

The `onSuccess` callback at line 307 calls `releaseSyncLock()`, but only after the mutation resolves. However, the flow at line 198-207 returns a success result directly, so `onSuccess` DOES fire. Let me re-verify...

Actually, on closer inspection, the early return at line 201 returns from `mutationFn`, which feeds into `onSuccess` at line 306 where `releaseSyncLock()` is called. So the lock IS released. This is NOT a bug -- the lock release is handled by the mutation lifecycle. Withdrawn.

---

## Verified Correct (No Issues)

- **Cross-tab sync locking**: `acquireSyncLock` / `releaseSyncLock` with 5-minute stale timeout; properly released in both `onSuccess` and `onError` callbacks
- **Sync quota enforcement**: Server-side atomic RPC (`check_sync_quota` + `increment_sync_quota`) before every full sync; UI blocks when exhausted
- **Checkpoint persistence**: localStorage-based with 24-hour expiry; properly cleared on success, preserved on failure for resume
- **Checkpoint resume**: Skips already-processed symbols; uses `insertedTradeIds` to avoid re-inserting trades; correctly restores `timeRange` from checkpoint
- **Duplicate protection (Binance)**: Deduplication via `binance_trade_id` lookup before insert in both incremental and full sync
- **Duplicate protection (Solana)**: Uses `signature` as `binance_trade_id` for dedup check
- **Rate limit handling**: Adaptive delay based on `usedWeight` header; automatic retry on 429 with exponential backoff
- **Batch insert with retry**: Atomic RPC `batch_insert_trades` with 3 retries per batch; partial success tracking
- **Force re-fetch flow**: Confirmation dialog before destructive delete; clears all binance-sourced trades before re-downloading
- **Income pagination**: Cursor-based using `tranId` with safety limit (20,000 records); proper chunk-based time windowing
- **Trade pagination**: Handles Binance 7-day limit via chunking; cursor-based `fromId` for trades exceeding 1000/request
- **Symbol validation**: `isValidFuturesSymbol` correctly validates length, USDT/BUSD suffix, and alphanumeric pattern
- **Symbol optimization**: Only fetches symbols with non-zero `REALIZED_PNL` income (reduces API calls by ~50%)
- **Parallel fetching**: Up to 4 symbols fetched in parallel with prefetch pipeline (overlaps IO with processing)
- **Reconciliation**: Cross-validates aggregated PnL against Binance income records; reports match rate and quality score
- **Audit logging**: Invalid trades logged to `audit_logs` table for review (fire-and-forget)
- **Monitoring integration**: `recordSyncSuccess` / `recordSyncFailure` for health tracking
- **URL tab persistence**: Tab state via `useSearchParams` with mode-aware default (Solana for paper, Binance for live)
- **Mode isolation**: Binance tab disabled in Paper mode; `isBinanceDisabled` correctly gates all Binance interactions
- **Paper mode banners**: Info alert shown when in Paper mode; connection prompt when not connected
- **Stale sync detection**: 2-minute no-progress threshold with visual warning in `SyncProgressIndicator`
- **Sync log panel**: Terminal-style collapsible with auto-scroll, semantic color coding, and clear button
- **ETA calculation**: Batch-based estimation using per-symbol timing; null during income fetch (insufficient data)
- **Enrichment windowing**: Groups trades into 7-day windows for efficient income fetching; deduplicates by `tranId`
- **Enrichment progress**: Multi-phase tracking (checking -> fetching-income -> fetching-trades -> enriching -> updating -> done)
- **Loading states**: Spinner badges for incremental sync; full progress UI for full sync; Loader2 for Solana scan
- **Empty states**: "No DEX trades found" with "Scan More" option; zero-trade completion messages
- **Error states**: Error badge with resume/retry buttons for full sync; error message with retry for Solana
- **Feature highlight cards**: Properly dimmed in Paper mode with `(Live only)` label
- **Solana wallet detection**: Proper `connected` check with wallet connect CTA
- **Solana import mode awareness**: Badge shows "Paper" or "Live" target mode; `trade_mode` correctly passed to `mapToTradeEntry`
- **Background sync**: Service worker with IndexedDB for offline sync requests; notification on completion
- **ARIA/accessibility**: Tooltips on all action buttons; collapsible triggers are keyboard-accessible
- **Semantic colors**: `text-profit` for success badges; `text-warning` for rate limit; `text-destructive` for errors
- **Query invalidation**: `invalidateTradeQueries` called after successful sync (both incremental and full) and enrichment

---

## Summary

| # | File | Issue | Criteria | Severity |
|---|------|-------|----------|----------|
| 1 | `use-solana-trade-import.ts` line 189 | Direction mapped to `BUY`/`SELL`/`UNKNOWN` but DB constraint only allows `LONG`/`SHORT` -- all Solana imports fail | Accuracy, Data Integrity | Critical |
| 2 | `use-trade-enrichment-binance.ts` line 493 | Raw error messages leaked to user via toast | Security | High |
| 3 | `ImportTrades.tsx` | Missing top-level ErrorBoundary | Comprehensiveness | Medium |

Total: 3 files, 3 fixes.

## Technical Details

### Fix 1: Correct Solana direction mapping

In `src/hooks/use-solana-trade-import.ts` line 189, replace:
```typescript
direction: trade.direction === 'LONG' ? 'BUY' : trade.direction === 'SHORT' ? 'SELL' : 'UNKNOWN',
```
With:
```typescript
direction: trade.direction === 'LONG' ? 'LONG' : trade.direction === 'SHORT' ? 'SHORT' : 'LONG',
```

### Fix 2: Sanitize enrichment error toast

In `src/hooks/trading/use-trade-enrichment-binance.ts` line 493, replace:
```typescript
toast.error(`Enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
```
With:
```typescript
console.error('[Enrichment] Error:', error);
toast.error('Trade enrichment failed. Please try again.');
```

### Fix 3: Add ErrorBoundary to ImportTrades page

In `src/pages/ImportTrades.tsx`, import `ErrorBoundary` and wrap the page content with `retryKey` state pattern, following the established convention from other audited pages.

