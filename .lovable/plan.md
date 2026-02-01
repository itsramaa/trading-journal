

# Implementation Plan: Database Integrity Hardening (TIER 1 Critical Fixes)

## Executive Summary

Berdasarkan System Architecture Review yang diberikan, plan ini fokus pada **TIER 1 Critical Fixes** yang harus diselesaikan sebelum production scale. Audit mengidentifikasi beberapa gap yang sudah ada constraint-nya, jadi plan ini akan mengklarifikasi dan memfokuskan pada yang benar-benar missing.

---

## Current State vs Audit Findings

| Issue dari Audit | Status Aktual | Action Required |
|------------------|---------------|-----------------|
| Missing CHECK on direction | ❌ Benar missing | **ADD constraint** |
| Missing CHECK on status | ✅ Sudah ada | No action |
| No UNIQUE on binance_trade_id | ⚠️ Partial - hanya global | **MODIFY ke per-user** |
| No UNIQUE on daily_risk_snapshots | ✅ Sudah ada | No action |
| No CHECK on amounts | ❌ Benar missing | **ADD constraint** |
| No CHECK on percentages | ❌ Benar missing | **ADD constraint** |

---

## Phase 1: Database Schema Hardening (Estimated: 2-3 hours)

### 1.1 Add Direction CHECK Constraint

**Tabel:** `trade_entries`  
**Problem:** Kolom `direction` tidak di-enforce, bisa diisi nilai invalid

```sql
ALTER TABLE trade_entries 
ADD CONSTRAINT trade_entries_direction_check 
CHECK (direction IN ('LONG', 'SHORT', 'long', 'short'));
```

**Note:** Include lowercase karena beberapa source menggunakan lowercase.

### 1.2 Modify binance_trade_id Unique Constraint

**Problem:** Unique index saat ini adalah global, bukan per-user. Ini memblokir skenario edge case di mana dua user berbeda melakukan trade berbeda yang kebetulan memiliki ID sama (sangat unlikely, tapi secara desain salah).

**Current Index:**
```sql
CREATE UNIQUE INDEX idx_trade_entries_binance_trade_id 
ON public.trade_entries USING btree (binance_trade_id) 
WHERE (binance_trade_id IS NOT NULL)
```

**Migration:**
```sql
-- Drop existing global unique index
DROP INDEX IF EXISTS idx_trade_entries_binance_trade_id;

-- Create per-user unique index
CREATE UNIQUE INDEX idx_trade_entries_binance_trade_per_user 
ON public.trade_entries (user_id, binance_trade_id) 
WHERE (binance_trade_id IS NOT NULL);
```

### 1.3 Add Amount Constraints

**Tabel:** `account_transactions`  
**Problem:** `amount` bisa negatif

```sql
ALTER TABLE account_transactions 
ADD CONSTRAINT account_transactions_amount_positive 
CHECK (amount > 0);
```

### 1.4 Add Risk Profile Percentage Constraints

**Tabel:** `risk_profiles`  
**Problem:** Percentage values bisa > 100% atau negatif

```sql
ALTER TABLE risk_profiles 
ADD CONSTRAINT risk_profiles_risk_per_trade_check 
CHECK (risk_per_trade_percent > 0 AND risk_per_trade_percent <= 100);

ALTER TABLE risk_profiles 
ADD CONSTRAINT risk_profiles_max_daily_loss_check 
CHECK (max_daily_loss_percent > 0 AND max_daily_loss_percent <= 100);

ALTER TABLE risk_profiles 
ADD CONSTRAINT risk_profiles_max_weekly_drawdown_check 
CHECK (max_weekly_drawdown_percent > 0 AND max_weekly_drawdown_percent <= 100);

ALTER TABLE risk_profiles 
ADD CONSTRAINT risk_profiles_max_position_size_check 
CHECK (max_position_size_percent > 0 AND max_position_size_percent <= 100);

ALTER TABLE risk_profiles 
ADD CONSTRAINT risk_profiles_max_correlated_exposure_check 
CHECK (max_correlated_exposure > 0 AND max_correlated_exposure <= 1);

ALTER TABLE risk_profiles 
ADD CONSTRAINT risk_profiles_max_concurrent_positions_check 
CHECK (max_concurrent_positions > 0);
```

### 1.5 Add Source CHECK Constraint

**Tabel:** `trade_entries`  
**Problem:** Source tidak di-enforce

```sql
ALTER TABLE trade_entries 
ADD CONSTRAINT trade_entries_source_check 
CHECK (source IN ('binance', 'manual', 'paper', 'import'));
```

---

## Phase 2: Data Validation Pre-Check (Before Constraints)

Sebelum menjalankan migration, perlu verifikasi tidak ada data invalid yang akan menyebabkan constraint gagal.

### 2.1 Check Invalid Direction Values
```sql
SELECT DISTINCT direction, COUNT(*) 
FROM trade_entries 
GROUP BY direction;
```

### 2.2 Check Negative Amounts
```sql
SELECT COUNT(*) 
FROM account_transactions 
WHERE amount <= 0;
```

### 2.3 Check Invalid Risk Percentages
```sql
SELECT * 
FROM risk_profiles 
WHERE risk_per_trade_percent <= 0 
   OR risk_per_trade_percent > 100
   OR max_daily_loss_percent <= 0 
   OR max_daily_loss_percent > 100;
```

### 2.4 Check Invalid Source Values
```sql
SELECT DISTINCT source, COUNT(*) 
FROM trade_entries 
GROUP BY source;
```

---

## Phase 3: Documentation Update

### 3.1 Update COMPLETE_DATABASE_ANALYSIS.md

**Section: Known Gaps & TODO**
- Mark constraint issues as RESOLVED
- Document new constraints
- Update Appendix with constraint list

### 3.2 Update DATABASE.md

- Add constraint documentation
- Update table schemas with constraint info

---

## Phase 4: Edge Function Error Handling (Estimated: 4-6 hours)

### 4.1 Create Shared Retry Utility

**File:** `supabase/functions/_shared/retry.ts`

```typescript
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = { maxRetries: 3, baseDelayMs: 1000, maxDelayMs: 10000 }
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Check if retryable
      if (isRateLimitError(error) || isNetworkError(error)) {
        const delay = Math.min(
          config.baseDelayMs * Math.pow(2, attempt),
          config.maxDelayMs
        );
        await sleep(delay);
        continue;
      }
      
      throw error; // Non-retryable error
    }
  }
  
  throw lastError!;
}

function isRateLimitError(error: any): boolean {
  return error?.statusCode === 429 || error?.code === -1015;
}

function isNetworkError(error: any): boolean {
  return error?.message?.includes('fetch failed') || 
         error?.message?.includes('network');
}
```

### 4.2 Apply Retry to binance-futures

**File:** `supabase/functions/binance-futures/index.ts`

Integrate retry utility untuk semua Binance API calls.

### 4.3 Create Error Response Standards

```typescript
interface EdgeFunctionError {
  success: false;
  error: string;
  code?: string;
  retryable: boolean;
  retryAfter?: number; // seconds
}
```

---

## Phase 5: Balance Reconciliation Job (Estimated: 4 hours)

### 5.1 Create Reconciliation Edge Function

**File:** `supabase/functions/reconcile-balances/index.ts`

```typescript
// Pseudocode
async function reconcileBalances() {
  // 1. Get all accounts
  const accounts = await getAccounts();
  
  // 2. For each account, calculate expected balance from transactions
  for (const account of accounts) {
    const expectedBalance = await calculateFromTransactions(account.id);
    const actualBalance = account.balance;
    
    // 3. If discrepancy, log and optionally fix
    if (Math.abs(expectedBalance - actualBalance) > 0.01) {
      await logDiscrepancy({
        account_id: account.id,
        expected: expectedBalance,
        actual: actualBalance,
        discrepancy: expectedBalance - actualBalance,
      });
    }
  }
}
```

### 5.2 Create Discrepancy Tracking Table

```sql
CREATE TABLE account_balance_discrepancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  expected_balance NUMERIC NOT NULL,
  actual_balance NUMERIC NOT NULL,
  discrepancy NUMERIC NOT NULL,
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

-- RLS
ALTER TABLE account_balance_discrepancies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own discrepancies" ON account_balance_discrepancies
FOR SELECT USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);
```

---

## Summary: Files to Create/Modify

| File | Action | Priority |
|------|--------|----------|
| **Migration SQL** | Create | CRITICAL |
| `docs/COMPLETE_DATABASE_ANALYSIS.md` | Update | HIGH |
| `docs/DATABASE.md` | Update | HIGH |
| `supabase/functions/_shared/retry.ts` | Create | MEDIUM |
| `supabase/functions/binance-futures/index.ts` | Modify | MEDIUM |
| `supabase/functions/reconcile-balances/index.ts` | Create | MEDIUM |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Constraint breaks existing invalid data | Pre-check queries before migration |
| Migration downtime | Run during low-traffic period |
| Retry logic causes infinite loops | Max retry limit + exponential backoff |

---

## Verification Checklist

After implementation:
- [x] All CHECK constraints added successfully ✅ (2026-02-01)
- [x] Unique index on `(user_id, binance_trade_id)` exists ✅ (2026-02-01)
- [x] Pre-check queries return 0 invalid records ✅ (2026-02-01)
- [x] Documentation updated ✅ (2026-02-01)
- [ ] Retry utility tested
- [ ] Reconciliation job tested

---

## Technical Notes

### Catatan Penting dari Audit:

1. **Status CHECK sudah ada** - Audit mengatakan missing tapi sebenarnya sudah ada
2. **binance_trade_id unique sudah ada** - Tapi perlu diubah ke per-user
3. **daily_risk_snapshots unique sudah ada** - Audit concern sudah ter-address

### Mengapa CHECK Constraint, Bukan Trigger:

- CHECK lebih performant (validation at insert time)
- CHECK tidak bisa di-bypass
- CHECK self-documenting
- Trigger lebih fleksibel tapi bisa di-skip dengan `SET session_replication_role = 'replica'`

