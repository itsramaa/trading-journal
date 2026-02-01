
# Implementation Plan: Credential Rotation Test, Rate Limit Cleanup, Vault Verification, and Generic Position Hook

## Summary of Gaps Identified

| Issue | Root Cause | Solution |
|-------|------------|----------|
| No credential rotation integration test | Missing test file | Create `credential-rotation.integration.test.tsx` |
| `cleanup_old_rate_limits` no schedule | `pg_cron` extension not available | Add alternative: Edge Function cron via Supabase |
| Encryption is base64 NOT Vault | `save_exchange_credential` uses `encode(..., 'base64')` not `vault.encrypt()` | **Document as acceptable** OR upgrade to true Vault |
| UI uses `BinancePosition` directly | `BinancePositionsTab` defines inline type | Adopt `ExchangePosition` type via mapper |
| No `usePositions(exchange)` wrapper | Missing abstraction hook | Create `useExchangePositions` hook |

---

## Phase 1: Integration Test for Credential Rotation

**File**: `src/test/integration/credential-rotation.integration.test.tsx`

### Test Cases

```text
describe('Credential Rotation Flow')
├── it('should save new credentials and deactivate old')
├── it('should validate credentials via edge function')
├── it('should update validation status after test connection')
├── it('should allow credential removal')
└── it('should prevent operations without credentials')
```

### Implementation Details

```typescript
// Test flow:
// 1. Save initial credentials → verify returned UUID
// 2. Save new credentials → verify old deactivated
// 3. Test connection → verify validation status updated
// 4. Delete credentials → verify is_active = false
// 5. Call edge function → verify error for missing credentials
```

### Mock Strategy

- Mock `supabase.rpc()` for credential functions
- Mock fetch for edge function calls
- Verify query invalidation after operations

---

## Phase 2: Rate Limit Cleanup Schedule

### Current State

- `cleanup_old_rate_limits()` function exists
- No `pg_cron` extension available in Lovable Cloud
- Old rate limit records accumulate indefinitely

### Solution: Scheduled Edge Function

**File**: `supabase/functions/cleanup-rate-limits/index.ts`

```typescript
// Lightweight Edge Function to clean old rate limits
// Intended to be called via external cron (e.g., GitHub Actions, Vercel Cron)
// OR called manually from admin UI

Deno.serve(async (req) => {
  // Verify admin or service role key
  const supabase = createClient(url, serviceKey);
  
  const { data, error } = await supabase.rpc('cleanup_old_rate_limits');
  
  return new Response(JSON.stringify({ 
    success: !error, 
    deleted: data 
  }));
});
```

### Alternative: Trigger on Insert

Add database trigger to cleanup when table grows:

```sql
CREATE OR REPLACE FUNCTION auto_cleanup_rate_limits()
RETURNS TRIGGER AS $$
BEGIN
  -- Cleanup if more than 10000 rows
  IF (SELECT COUNT(*) FROM api_rate_limits) > 10000 THEN
    DELETE FROM api_rate_limits 
    WHERE window_end < now() - interval '1 hour';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_auto_cleanup_rate_limits
AFTER INSERT ON api_rate_limits
FOR EACH STATEMENT
EXECUTE FUNCTION auto_cleanup_rate_limits();
```

---

## Phase 3: Vault Encryption Verification & Documentation

### Current Implementation Analysis

Current `save_exchange_credential` uses:
```sql
v_encrypted_key := encode(convert_to(p_api_key, 'UTF8'), 'base64');
```

This is **base64 encoding**, NOT encryption!

### Options

| Option | Security Level | Effort |
|--------|----------------|--------|
| A. Document as "obfuscation" | Low | None |
| B. Use `vault.encrypt()` | High | Medium |
| C. Use `pgcrypto` with app key | Medium | Medium |

### Recommended: Option B - True Vault Encryption

Update `save_exchange_credential`:

```sql
-- Store in vault.secrets and reference by secret_id
INSERT INTO vault.secrets (name, description, secret)
VALUES (
  'api_key_' || v_credential_id::TEXT,
  'Binance API Key for user ' || v_user_id::TEXT,
  p_api_key
)
RETURNING id INTO v_secret_id;

-- Store secret_id in exchange_credentials instead of encrypted value
UPDATE exchange_credentials 
SET api_key_secret_id = v_secret_id
WHERE id = v_credential_id;
```

### Alternative: Document Current State

If true Vault is not required for MVP:

```markdown
## Security Note: Credential Storage

Current implementation uses base64 encoding for API key storage.
This provides obfuscation but NOT cryptographic security.

For production multi-tenant deployment, upgrade to:
1. Supabase Vault (vault.encrypt/decrypt)
2. Or external KMS (AWS KMS, HashiCorp Vault)
```

---

## Phase 4: Adopt ExchangePosition Type in UI

### Current: BinancePositionsTab

```typescript
// CURRENT: Inline Binance-specific type
interface BinancePosition {
  symbol: string;
  positionAmt: number;  // Binance-specific naming
  entryPrice: number;
  ...
}
```

### Target: Use ExchangePosition

```typescript
// NEW: Import from exchange types
import type { ExchangePosition } from '@/types/exchange';

interface PositionsTableProps {
  positions: ExchangePosition[];
  isLoading: boolean;
  exchange?: ExchangeType;
}

export function PositionsTable({ positions, isLoading }: PositionsTableProps) {
  // No filter needed - positions are already non-zero from mapper
  return (
    <Table>
      {positions.map((position) => (
        <TableRow key={`${position.source}-${position.symbol}`}>
          <TableCell>{position.symbol}</TableCell>
          <TableCell>
            <Badge variant={position.side === 'LONG' ? "default" : "secondary"}>
              {position.side}
            </Badge>
          </TableCell>
          <TableCell>{position.size.toFixed(4)}</TableCell>
          <TableCell>${position.entryPrice.toFixed(2)}</TableCell>
          <TableCell>${position.markPrice.toFixed(2)}</TableCell>
          <TableCell className={position.unrealizedPnl >= 0 ? "text-profit" : "text-loss"}>
            {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
          </TableCell>
          <TableCell>${position.liquidationPrice.toFixed(2)}</TableCell>
          <TableCell>{position.leverage}x</TableCell>
        </TableRow>
      ))}
    </Table>
  );
}
```

### Keep Backward Compatibility

Rename and keep old component as alias:

```typescript
// Re-export for backward compatibility
export { PositionsTable as BinancePositionsTab };
```

---

## Phase 5: Create usePositions(exchange) Wrapper Hook

### File: `src/hooks/use-positions.ts`

```typescript
/**
 * usePositions - Exchange-agnostic position hook
 * Wraps exchange-specific hooks and returns generic ExchangePosition[]
 */
import { useBinancePositions } from '@/features/binance/useBinanceFutures';
import { mapBinancePositions } from '@/lib/exchange-mappers';
import type { ExchangePosition, ExchangeType } from '@/types/exchange';

interface UsePositionsOptions {
  exchange?: ExchangeType;
  symbol?: string;
  enabled?: boolean;
}

interface UsePositionsResult {
  positions: ExchangePosition[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function usePositions(options: UsePositionsOptions = {}): UsePositionsResult {
  const { exchange = 'binance', symbol, enabled = true } = options;
  
  // Currently only Binance is supported
  const binanceQuery = useBinancePositions(symbol);
  
  // Map to generic positions
  const positions: ExchangePosition[] = binanceQuery.data 
    ? mapBinancePositions(binanceQuery.data)
    : [];
  
  return {
    positions,
    isLoading: binanceQuery.isLoading,
    isError: binanceQuery.isError,
    error: binanceQuery.error as Error | null,
    refetch: binanceQuery.refetch,
  };
}

// Future: Add Bybit/OKX hooks here
// When adding new exchange:
// 1. Create useBybitPositions hook
// 2. Add switch case based on exchange param
// 3. Map using mapBybitPositions
```

### Additional Generic Hooks

```typescript
// src/hooks/use-balance.ts
export function useBalance(options: { exchange?: ExchangeType } = {}) {
  const { exchange = 'binance' } = options;
  
  const binanceQuery = useBinanceBalance();
  
  const accountSummary = binanceQuery.data 
    ? mapBinanceAccountSummary(binanceQuery.data)
    : null;
  
  return {
    balance: accountSummary,
    isLoading: binanceQuery.isLoading,
    isError: binanceQuery.isError,
    error: binanceQuery.error as Error | null,
    refetch: binanceQuery.refetch,
  };
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/test/integration/credential-rotation.integration.test.tsx` | Integration test for add→validate→update→remove flow |
| `supabase/functions/cleanup-rate-limits/index.ts` | Optional cron Edge Function for cleanup |
| `src/hooks/use-positions.ts` | Generic `usePositions(exchange)` wrapper |
| `src/hooks/use-balance.ts` | Generic `useBalance(exchange)` wrapper |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/journal/BinancePositionsTab.tsx` | Refactor to use `ExchangePosition` type |
| `supabase/migrations/..._auto_cleanup_trigger.sql` | Add auto-cleanup trigger |
| `docs/MULTI_EXCHANGE_ARCHITECTURE.md` | Add security note about current encryption |

---

## Implementation Order

```text
1. Create credential-rotation.integration.test.tsx (30 min)
   └── Test add → validate → update → remove flow

2. Add auto-cleanup trigger for rate limits (15 min)
   └── Trigger-based cleanup when table grows

3. Refactor BinancePositionsTab (30 min)
   └── Adopt ExchangePosition type
   └── Keep backward-compatible export

4. Create usePositions hook (30 min)
   └── Generic wrapper with exchange param
   └── Maps to ExchangePosition[]

5. Create useBalance hook (20 min)
   └── Generic wrapper for account balance

6. Update documentation (15 min)
   └── Security note about base64 vs Vault
   └── Document cleanup trigger
```

---

## Technical Notes

### Current Encryption Status

| Column | Claimed | Actual | Risk |
|--------|---------|--------|------|
| `api_key_encrypted` | Vault encrypted | base64 encoded | Medium - readable if DB leaked |
| `api_secret_encrypted` | Vault encrypted | base64 encoded | Medium - readable if DB leaked |

**Mitigation**: 
- RLS prevents other users from reading
- Service role only used in Edge Function
- For true security, upgrade to `vault.secrets` table

### Rate Limit Cleanup Options

| Approach | Pros | Cons |
|----------|------|------|
| Trigger on INSERT | Automatic, no external deps | Slight insert overhead |
| Edge Function cron | Full control | Requires external scheduler |
| Manual cleanup | Simple | Must remember to run |

**Recommended**: Trigger-based auto-cleanup

---

## Deliverables Checklist

- [x] Integration test for credential rotation (`src/test/integration/credential-rotation.integration.test.tsx`)
- [x] Auto-cleanup trigger for rate limits (`tr_auto_cleanup_rate_limits` trigger)
- [x] `usePositions(exchange)` generic hook (`src/hooks/use-positions.ts`)
- [x] `useExchangeBalance(exchange)` generic hook (`src/hooks/use-exchange-balance.ts`)
- [x] Refactored PositionsTable using ExchangePosition (`src/components/journal/PositionsTable.tsx`)
- [x] Documentation update for encryption status (`docs/MULTI_EXCHANGE_ARCHITECTURE.md`)

## Implementation Complete

All phases implemented on 2026-02-01.
