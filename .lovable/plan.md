
# Hardening Full Sync: Rate Limit Headers, Retry, and Log Routing

## Status: ✅ IMPLEMENTED

All 3 improvements have been implemented.

## Changes Made

### 1. ✅ Parse X-MBX-USED-WEIGHT in Edge Function
- `binanceRequest()` now captures `X-MBX-USED-WEIGHT-1M` header from Binance responses
- Module-level `lastUsedWeight` variable stores the latest value
- Main response handler includes `usedWeight` field in all API responses
- Backward compatible — existing callers ignore the new field

### 2. ✅ Retry with Exponential Backoff
- `use-binance-full-sync.ts` `callBinanceApi`: 3 retries with 429/5xx/network handling
- `binance-trade-enricher.ts` `callBinanceApi`: Same retry pattern
- Both handle: 429 (Retry-After), 5xx (exponential backoff), network errors

### 3. ✅ Enricher Log Routing + Dynamic Delay
- `fetchEnrichedTradesForSymbols` accepts optional `logFn` parameter
- `fetchUserTradesForSymbol` and `fetchUserTradesChunk` propagate `logFn`
- All `console.log('[Enricher]...')` replaced with `logFn?.()` calls
- `use-binance-aggregated-sync.ts`: Dynamic delay based on actual `usedWeight` (>900 = 2x delay, >600 = 1.3x)

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/binance-futures/index.ts` | Capture `X-MBX-USED-WEIGHT-1M`, include `usedWeight` in responses |
| `src/hooks/use-binance-full-sync.ts` | Retry logic in `callBinanceApi`, pass `logFn` to enricher |
| `src/services/binance-trade-enricher.ts` | Retry in `callBinanceApi`, `logFn` param, replaced console.log |
| `src/hooks/use-binance-aggregated-sync.ts` | `usedWeight` in ApiResponse, dynamic delay based on actual weight |
