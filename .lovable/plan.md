
# Rencana: Deep Check Accounts & Remove Trading Sessions

---

## Executive Summary

Analisis mendalam terhadap `accounts`, `account_transactions`, dan `trading_sessions` mengungkapkan beberapa **gap** dan **legacy artifacts** yang perlu dibersihkan agar sistem sepenuhnya align dengan arsitektur **Binance-Centered**.

---

## Findings Summary

### 1. Trading Sessions (REMOVE)

| Item | Status | Action |
|------|--------|--------|
| Table `trading_sessions` | 0 rows di DB | **DROP TABLE** |
| Column `session_id` di `trade_entries` | 0 rows dengan value | **DROP COLUMN** |
| FK constraint `trade_entries_session_id_fkey` | Exists | **DROP FK** |
| Docs reference di `DATABASE.md` | Multiple mentions | **Update docs** |
| Docs reference di `ARCHITECTURE.md` | None | No change |
| Test references in contract tests | Multiple mentions | **Update tests** |
| Frontend references | `use-trade-entries.ts` (interface), `use-realtime.ts` | **Clean up** |

### 2. Account Table - Enum Mismatch

**Problem:** Database `account_type` enum memiliki 9 values (bank, ewallet, broker, cash, soft_wallet, investment, emergency, goal_savings, trading), tapi frontend hanya menggunakan 2 (`trading`, `backtest` via metadata).

| DB Enum Value | Used in App | Action |
|---------------|-------------|--------|
| `trading` | ✅ Yes | Keep |
| `broker` | ❌ Legacy | Consider removing |
| `bank`, `ewallet`, `cash`, `investment`, `emergency`, `goal_savings`, `soft_wallet` | ❌ Not used | Consider removing |

**Recommendation:** Keep enum di DB karena Supabase enum alteration is risky. Frontend sudah handle mapping dengan benar via `mapAccountType()`.

### 3. Account Transactions - Unused Columns

**Problem:** Table `account_transactions` memiliki kolom legacy yang tidak digunakan:

| Column | Purpose | Used in App | Action |
|--------|---------|-------------|--------|
| `category_id` | Financial category | ❌ No | Keep (nullable, no harm) |
| `portfolio_transaction_id` | Portfolio link | ❌ No | Keep (nullable, no harm) |
| `counterparty_account_id` | Transfer between accounts | ❌ No | Keep (for potential transfer feature) |
| `trade_entry_id` | Link to trade | ❌ No | Keep (for potential P&L tracking) |

**Recommendation:** Keep columns karena nullable dan tidak menganggu. Bisa berguna untuk fitur future.

### 4. Transaction Type Enum Check

Query menunjukkan transaction_type enum kosong di pg_enum - perlu verify bahwa `deposit` dan `withdrawal` berfungsi dengan benar.

### 5. Default Currency Mismatch

**Problem:** DB default currency adalah `'IDR'::text` tapi app mostly uses `'USD'` untuk trading context.

**Recommendation:** Keep as-is, frontend already handles this via user settings.

---

## Implementation Plan

### Phase 1: Database Migration - Drop Trading Sessions

```sql
-- Step 1: Drop FK constraint on trade_entries
ALTER TABLE trade_entries 
DROP CONSTRAINT IF EXISTS trade_entries_session_id_fkey;

-- Step 2: Drop session_id column from trade_entries
ALTER TABLE trade_entries 
DROP COLUMN IF EXISTS session_id;

-- Step 3: Drop trading_sessions table
DROP TABLE IF EXISTS trading_sessions;
```

### Phase 2: Frontend Cleanup

| File | Changes |
|------|---------|
| `src/hooks/use-trade-entries.ts` | Remove `session_id` from interface |
| `src/hooks/use-realtime.ts` | Already cleaned (no trading_sessions reference) |
| `src/test/contracts/supabase-tables.contract.test.ts` | Remove session_id from tests |
| `src/test/contracts/hooks.contract.test.tsx` | Remove session_id from mock data |

### Phase 3: Documentation Update

| File | Changes |
|------|---------|
| `docs/DATABASE.md` | Remove trading_sessions table, update ERD |

---

## Detailed File Changes

### 1. Migration SQL

```sql
-- Drop trading_sessions completely
ALTER TABLE trade_entries DROP CONSTRAINT IF EXISTS trade_entries_session_id_fkey;
ALTER TABLE trade_entries DROP COLUMN IF EXISTS session_id;
DROP TABLE IF EXISTS trading_sessions;
```

### 2. use-trade-entries.ts

**Before (line 15):**
```typescript
session_id: string | null;
```

**After:**
```typescript
// session_id removed - trading sessions feature deprecated
```

### 3. supabase-tables.contract.test.ts

**Before (lines 10-48):**
```typescript
const tableColumns = [
  "id",
  "user_id",
  "trading_account_id",
  "session_id",  // REMOVE
  ...
];

const mockRow = {
  ...
  session_id: null,  // REMOVE
  ...
};
```

### 4. hooks.contract.test.tsx

**Before (line 88):**
```typescript
session_id: null,  // REMOVE
```

### 5. DATABASE.md

**Remove from Core Tables Overview:**
```markdown
| `trading_sessions` | Trading session tracking | ✅ |
```

**Remove from ERD:**
```
├──► trading_sessions (1:N)
│       │
│       └──► trade_entries (1:N via session_id)
```

**Remove from trade_entries schema:**
```sql
session_id UUID REFERENCES trading_sessions(id),
```

---

## Accounts & Transactions Alignment Summary

### Already Aligned ✅

1. **`useAccounts()`** - Correctly maps DB types to frontend types
2. **`useTradingAccounts()`** - Correctly filters by `is_backtest` metadata
3. **`useAccountTransactions()`** - Correctly filters `deposit`/`withdrawal` only
4. **Balance Updates** - DB trigger `update_account_balance` handles balance sync
5. **Realtime** - Already subscribes to `accounts` and `account_transactions`

### Gap Analysis Result

| Area | Status | Notes |
|------|--------|-------|
| Account creation | ✅ OK | Creates with `trading` type, uses metadata for backtest |
| Transaction recording | ✅ OK | Only deposit/withdrawal supported |
| Balance calculation | ✅ OK | DB trigger handles balance update |
| Binance integration | ✅ OK | Separate Binance balance display |
| Paper trading | ✅ OK | Uses `is_backtest` in metadata |

### No Changes Needed for Accounts

Sistem akun sudah **fully aligned** dengan Binance-Centered architecture:
- Binance wallet balance displayed from API (source of truth)
- Paper accounts stored locally dengan `is_backtest: true`
- Transactions for paper accounts (deposit/withdraw) work correctly

---

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Drop session_id breaks existing data | ❌ None | 0 rows have session_id |
| Drop trading_sessions loses data | ❌ None | 0 rows in table |
| TypeScript compile errors | Medium | Update all interfaces |
| Test failures | High | Update contract tests |

---

## Estimated Effort

| Task | Effort |
|------|--------|
| DB Migration | 5 min |
| Frontend cleanup (3 files) | 10 min |
| Docs update | 5 min |
| Testing | 5 min |
| **Total** | **~25 min** |

---

## Files to Modify

| File | Type | Changes |
|------|------|---------|
| **Database Migration** | SQL | Drop FK, column, table |
| `src/hooks/use-trade-entries.ts` | Edit | Remove `session_id` from interface |
| `src/test/contracts/supabase-tables.contract.test.ts` | Edit | Remove `session_id` from tests |
| `src/test/contracts/hooks.contract.test.tsx` | Edit | Remove `session_id` from mock |
| `docs/DATABASE.md` | Edit | Remove trading_sessions, update ERD |

---

## Verification Checklist

After implementation:
- [ ] `trading_sessions` table tidak ada di DB
- [ ] `session_id` column tidak ada di `trade_entries`
- [ ] TypeScript compiles tanpa error
- [ ] Contract tests pass
- [ ] Accounts page berfungsi normal
- [ ] Trade History page berfungsi normal
- [ ] Paper account creation works
- [ ] Deposit/withdrawal works for paper accounts
