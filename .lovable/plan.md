

# Hardening Full Sync: Rate Limit Headers, Retry, and Log Routing

## Overview

3 targeted improvements to eliminate false-negative data (data = 0) during large Full Sync operations.

---

## 1. Parse X-MBX-USED-WEIGHT in Edge Function and Return to Client

**Current State:** `binanceRequest()` (line 252-288) returns the raw `Response` but callers like `getTrades()`, `getBalance()`, etc. only parse `response.json()` — the `X-MBX-USED-WEIGHT-1M` header is discarded.

**Change in `supabase/functions/binance-futures/index.ts`:**

- In `binanceRequest()`, after getting the Binance response, extract `X-MBX-USED-WEIGHT-1M` header
- Return it alongside the response data
- Each action handler (getTrades, getIncome, etc.) includes `usedWeight` in its return payload
- The edge function's final JSON response includes `usedWeight` field

- In every action handler that calls `binanceRequest`, capture the weight and include it:
  ```typescript
  // binanceRequest now returns { response, usedWeight }
  const { response, usedWeight } = await binanceRequestWithWeight(...)
  return { success: true, data: trades, usedWeight }
  ```

- The outer response handler passes `usedWeight` through to the client

**Change in client-side (`use-binance-aggregated-sync.ts`):**

- `callBinanceApi` response type extended: `usedWeight?: number`
- After each API call, if `usedWeight > 900` (approaching 1200 limit), increase delay dynamically
- Log weight to sync panel: `addSyncLog(\`Rate limit weight: ${usedWeight}/1200\`)`

This gives real-time rate limit awareness instead of internal estimation.

---

## 2. Add Retry with Exponential Backoff to `use-binance-full-sync.ts` and `binance-trade-enricher.ts`

**Current State:**
- `use-binance-aggregated-sync.ts` already has retry in its `callBinanceApi` (lines 70-110) -- this is solid
- `use-binance-full-sync.ts` `callBinanceApi` (lines 67-83) has **zero retry** -- raw fetch, single attempt
- `binance-trade-enricher.ts` `callBinanceApi` (lines 80-96) has **zero retry** -- raw fetch, single attempt

**Fix -- both files get the same pattern:**

Replace both `callBinanceApi` functions with a retry-aware version:

```typescript
async function callBinanceApi<T>(
  action: string,
  params: Record<string, unknown> = {},
  maxRetries = 3
): Promise<{ success: boolean; data?: T; error?: string; usedWeight?: number }> {
  const { data: { session } } = await supabase.auth.getSession();
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(BINANCE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({ action, ...params }),
      });
      
      // Handle 429 from edge function
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
        const delay = retryAfter * 1000 + Math.random() * 1000;
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
      }
      
      // Handle 5xx server errors
      if (response.status >= 500 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      return response.json();
    } catch (error) {
      // Network errors (timeout, DNS, etc.)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }
  
  return { success: false, error: 'Max retries exceeded' };
}
```

This handles: 429 (with Retry-After), 5xx, network timeouts, DNS failures.

---

## 3. Route Enricher Console Logs to Sync Log Panel

**Current State:** `binance-trade-enricher.ts` has `console.log` calls (lines 125, 160) that go to browser console only, not visible in the Sync Log Panel.

**Fix:**

- Add an optional `logFn` parameter to `fetchEnrichedTradesForSymbols` and `fetchUserTradesForSymbol`:
  ```typescript
  export async function fetchEnrichedTradesForSymbols(
    symbols: string[],
    startTime: number,
    endTime: number,
    incomeRecords: BinanceIncome[],
    onProgress?: (current: number, total: number) => void,
    logFn?: (msg: string, level?: 'info' | 'warn' | 'error') => void
  )
  ```

- Replace all `console.log('[Enricher]...')` with `logFn?.('...')` calls
- In `use-binance-full-sync.ts`, pass `addSyncLog` from the sync store as `logFn`
- In `use-binance-aggregated-sync.ts`, same -- pass `addSyncLog`

This routes all enricher activity into the visible Sync Log Panel.

---

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/binance-futures/index.ts` | Parse `X-MBX-USED-WEIGHT-1M` header in `binanceRequest`, return `usedWeight` in all action responses |
| `src/hooks/use-binance-full-sync.ts` | Add retry logic to `callBinanceApi`, pass `logFn` to enricher |
| `src/services/binance-trade-enricher.ts` | Add retry to `callBinanceApi`, accept `logFn` param, replace `console.log` with `logFn` |
| `src/hooks/use-binance-aggregated-sync.ts` | Read `usedWeight` from API responses, dynamic delay adjustment, log weight to sync panel |

## Risk Assessment

- **Edge function change**: Additive only (new field in response). Backward compatible -- existing callers simply ignore `usedWeight`.
- **Retry logic**: Only retries on 429/5xx/network errors. Non-retryable errors (400, 401, 403) fail immediately.
- **Log routing**: Optional `logFn` parameter. If not provided, falls back silently (no breaking change).

