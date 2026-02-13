

# Hybrid Incremental Sync — Blueprint Optimization Plan

## Gap Analysis: Current vs Blueprint

Setelah cross-check menyeluruh terhadap codebase, berikut status setiap layer:

| # | Blueprint Item | Current Status | Action |
|---|---------------|---------------|--------|
| 1a | Batch Size 30 | BATCH_INSERT_SIZE=50, MAX_PARALLEL_SYMBOLS=4 | Adjust to 30 insert + keep parallel fetch at 4 |
| 1b | Cursor-based pagination | Already uses cursor (tranId for income, fromId for trades) | DONE |
| 1c | Prefetch next batch | Not implemented — sequential batch loop | NEEDS IMPL |
| 2a | Mandatory fields check | Already validated (price, qty, direction, datetime, binance_trade_id) | DONE |
| 2b | SL/TP consistency | Not applicable at sync level (SL/TP set by user post-sync) | SKIP |
| 2c | Source consistency | Hardcoded `source: 'binance'` in mapToDbRow | DONE |
| 2d | Market context validation | Market context captured separately, not during sync | SKIP |
| 2e | Invalid trade audit log | Invalid trades filtered but not persisted for audit | NEEDS IMPL |
| 3a | Atomic bulk insert | Uses Supabase `.insert()` — no DB transaction rollback | NEEDS IMPL (RPC) |
| 3b | Index-aware batch insert | Supabase handles this at DB level | DONE |
| 4a | Virtualized rendering | Trade table already paginated (cursor-based) | DONE |
| 4b | Incremental stats update | `invalidateTradeQueries()` called per batch | DONE |
| 4c | Progress indicator | Already shows "batch X/Y, N trades saved" | DONE |
| 4d | Badges update per batch | Badges re-render via React Query invalidation | DONE |
| 5a | Checkpoint per batch | Already implemented with `saveCheckpoint()` | DONE |
| 5b | Resume logic | Already skips processedSymbols + insertedTradeIds | DONE |
| 5c | Corruption safety | Checkpoint only saved on success, preserved on failure | DONE |
| 6a | Batch-level error | Already has retry (MAX_INSERT_RETRIES=3) + skip on failure | DONE |
| 6b | Invalid trade review | Not persisted — only counted | NEEDS IMPL |
| 6c | Alerting on batch fail | failedBatches tracked, shown in toast | DONE |
| 7a | Parallel prefetch | Not implemented | NEEDS IMPL (same as 1c) |
| 7b | Rate limit handling | Adaptive delay + 429 retry with backoff | DONE |
| 7c | Memory efficient | Batch-by-batch, no full dataset in memory | DONE |
| 7d | Worker thread | Over-engineering for this use case | SKIP |

## Items to Implement (4 changes)

### 1. Prefetch Next Batch (Overlap IO)

**File: `src/hooks/use-binance-aggregated-sync.ts`**

Saat batch N sedang di-process (group, aggregate, validate, insert), mulai fetch trades+orders untuk batch N+1 secara paralel.

```text
Current:  [Fetch B1] → [Process B1] → [Fetch B2] → [Process B2]
Improved: [Fetch B1] → [Process B1 + Fetch B2] → [Process B2 + Fetch B3]
```

Implementasi: sebelum loop batch, prefetch batch pertama. Di dalam loop, setelah fetch selesai, langsung trigger prefetch batch berikutnya sebagai Promise, lalu lanjut processing batch current. Await prefetch di iterasi berikutnya.

Estimated speedup: 20-30% untuk sync besar (IO overlap menghilangkan serial wait).

### 2. Atomic Batch Insert via RPC

**New DB Function + Migration**

Buat RPC `batch_insert_trades` yang wraps insert dalam transaction:

```sql
CREATE OR REPLACE FUNCTION batch_insert_trades(p_trades jsonb)
RETURNS jsonb AS $$
DECLARE
  inserted_count integer;
BEGIN
  INSERT INTO trade_entries (
    user_id, pair, direction, entry_price, exit_price, 
    quantity, realized_pnl, pnl, fees, commission,
    commission_asset, funding_fees, entry_datetime, exit_datetime,
    trade_date, hold_time_minutes, leverage, margin_type,
    is_maker, entry_order_type, exit_order_type, result,
    status, source, binance_trade_id, binance_order_id
  )
  SELECT 
    (t->>'user_id')::uuid,
    t->>'pair', t->>'direction',
    (t->>'entry_price')::numeric, (t->>'exit_price')::numeric,
    (t->>'quantity')::numeric, (t->>'realized_pnl')::numeric,
    (t->>'pnl')::numeric, (t->>'fees')::numeric,
    (t->>'commission')::numeric, t->>'commission_asset',
    (t->>'funding_fees')::numeric,
    (t->>'entry_datetime')::timestamptz, (t->>'exit_datetime')::timestamptz,
    (t->>'trade_date')::timestamptz, (t->>'hold_time_minutes')::integer,
    (t->>'leverage')::integer, t->>'margin_type',
    (t->>'is_maker')::boolean, t->>'entry_order_type',
    t->>'exit_order_type', t->>'result',
    t->>'status', t->>'source',
    t->>'binance_trade_id', (t->>'binance_order_id')::bigint
  FROM jsonb_array_elements(p_trades) AS t;
  
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  
  RETURN jsonb_build_object('inserted', inserted_count);
EXCEPTION WHEN OTHERS THEN
  -- Full rollback happens automatically
  RETURN jsonb_build_object('error', SQLERRM, 'inserted', 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Keuntungan: jika satu row gagal, seluruh batch rollback (bukan partial insert). Client-side retry logic tetap dipertahankan.

Update `batchInsertTrades` di hook untuk call `supabase.rpc('batch_insert_trades', { p_trades: JSON.stringify(dbRows) })` instead of `.insert()`.

### 3. Invalid Trade Audit Logging

**File: `src/hooks/use-binance-aggregated-sync.ts`**

Setelah `validateAllTrades()`, log invalid trades ke `audit_logs` untuk review:

```typescript
// After validation
if (batchValidation.invalid.length > 0) {
  await supabase.from('audit_logs').insert(
    batchValidation.invalid.map(t => ({
      user_id: userId,
      action: 'trade_validation_failed',
      entity_type: 'trade_entry',
      entity_id: t.binance_trade_id,
      metadata: {
        pair: t.pair,
        direction: t.direction,
        errors: t._validation.errors.map(e => e.message),
        entry_price: t.entry_price,
        exit_price: t.exit_price,
      },
    }))
  );
}
```

Ini memungkinkan user/admin melihat trade apa saja yang ditolak oleh validator dan alasannya.

Perlu tambahkan `'trade_validation_failed'` ke `AuditAction` type di `src/lib/audit-logger.ts`.

### 4. Adjust BATCH_INSERT_SIZE

**File: `src/hooks/use-binance-aggregated-sync.ts`**

Ubah `BATCH_INSERT_SIZE` dari 50 ke 30 untuk konsistensi dengan blueprint dan optimal balance antara network overhead dan transaction size.

## Files Modified

| File | Change |
|------|--------|
| DB Migration | Create `batch_insert_trades` RPC function |
| `src/hooks/use-binance-aggregated-sync.ts` | Prefetch logic, atomic RPC insert, invalid trade logging, batch size 30 |
| `src/lib/audit-logger.ts` | Add `trade_validation_failed` to AuditAction type |

## Implementation Order

1. DB Migration (RPC function) — foundation
2. Audit logger type update — small, no deps
3. Hook updates — prefetch + atomic insert + invalid logging + batch size

## Items Deliberately Skipped

| Item | Reason |
|------|--------|
| Worker thread separation | Overkill. Sync runs async in mutation, UI stays responsive via batch invalidation. JS main thread not blocked because each batch `await`s IO (network/DB), yielding to event loop. |
| SL/TP consistency check | SL/TP tidak di-set saat sync — user menambahkan post-sync via wizard. Tidak ada data untuk validate. |
| Market context validation | Market context di-capture terpisah oleh `useCaptureMarketContext`, bukan bagian dari sync pipeline. |
| Batch size reduce to 30 for fetch | `MAX_PARALLEL_SYMBOLS=4` sudah optimal untuk API rate limits. Yang di-adjust adalah insert batch size. |

