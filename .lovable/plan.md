
# AI Analysis Page - Functional Correctness Audit

## Audit Scope

Reviewed all files in the AI Analysis domain: page (`MarketInsight.tsx`), components (`AIAnalysisTab.tsx`, `CombinedAnalysisCard.tsx`, `BiasExpiryIndicator.tsx`), hooks (`useMarketSentiment.ts`, `useMacroAnalysis.ts`, `useCombinedAnalysis.ts`, `useMarketAlerts.ts`, `useMultiSymbolMarketInsight.ts`), types (`features/market-insight/types.ts`), edge functions (`market-insight/index.ts`, `macro-analysis/index.ts`), shared constants, and barrel exports.

---

## Issues Found

### 1. macro-analysis Edge Function Leaks Internal Error Messages (Security - HIGH)

**File:** `supabase/functions/macro-analysis/index.ts` (line 302)

The catch block returns raw error messages directly to the client:
```typescript
JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
```

The `market-insight` edge function correctly returns a generic message (`'An error occurred processing your request'`). This function violates the project's own security standard (documented in memory: "All Edge Functions use a sanitizeError helper to return generic messages to the client while logging internal details only on the server"). Internal stack traces or library-specific error strings could leak implementation details.

**Fix:** Replace with a generic message, matching `market-insight`:
```typescript
JSON.stringify({ error: 'An error occurred processing your request' })
```

---

### 2. `handleRefresh` Not Memoized, Causing Repeated API Calls on Bias Expiry (Accuracy / Code Quality - HIGH)

**File:** `src/pages/MarketInsight.tsx` (lines 56-59)

`handleRefresh` is defined as a plain function, so it gets a new reference on every render. It is passed to `BiasExpiryIndicator` as `onExpired`. Inside `BiasExpiryIndicator`, the `useEffect` at line 29-32 depends on `[isExpired, onExpired]`:

```typescript
useEffect(() => {
  if (isExpired && onExpired) {
    onExpired();
  }
}, [isExpired, onExpired]);
```

When bias expires:
1. `isExpired` becomes `true`
2. `onExpired()` fires, calling `refetchSentiment()` + `refetchMacro()`
3. React re-renders the page
4. `handleRefresh` gets a new reference
5. `onExpired` prop changes, re-triggering the effect
6. Goto step 2 -- infinite loop of API calls

This creates a burst of repeated requests until the data finally returns with a new `lastUpdated` that un-expires the bias. On slow connections or API failures, this could fire dozens of requests.

**Fix:** Wrap `handleRefresh` in `useCallback`:
```typescript
const handleRefresh = useCallback(() => {
  refetchSentiment();
  refetchMacro();
}, [refetchSentiment, refetchMacro]);
```

---

### 3. Page Missing Top-Level ErrorBoundary (Comprehensiveness - MEDIUM)

**File:** `src/pages/MarketInsight.tsx`

The `AIAnalysisTab` has its own internal `ErrorBoundary`, but `BiasExpiryIndicator` and `CombinedAnalysisCard` sit outside any error boundary. If `useCombinedAnalysis` throws a runtime error (e.g., unexpected null from API data shape mismatch), or `BiasExpiryIndicator` encounters an invalid date string, the entire page crashes with a white screen.

Every other audited page (Economic Calendar, Market Data widgets) now has top-level error boundaries. This page should follow the same pattern.

**Fix:** Wrap the page content in an ErrorBoundary with key-based retry:
```typescript
const [retryKey, setRetryKey] = useState(0);
// ...
<ErrorBoundary
  title="AI Analysis"
  onRetry={() => setRetryKey(k => k + 1)}
>
  <div key={retryKey} className="space-y-6">
    {/* existing content */}
  </div>
</ErrorBoundary>
```

---

## Verified Correct (No Issues)

- **Authentication**: Both `market-insight` and `macro-analysis` edge functions validate JWT via `getClaims` with 401 responses
- **Input validation**: `market-insight` uses `SYMBOL_REGEX` + `validateSymbols()` with `.slice()` limit
- **Query configuration**: `staleTime`, `refetchInterval`, `retry`, `retryDelay` all properly configured in both hooks
- **Fear and Greed fallback**: Both edge functions return neutral (50) on API failure
- **CoinGecko fallback**: Returns neutral defaults on failure in both functions
- **AI summary fallback**: `macro-analysis` correctly falls back to `generateRuleBasedSummary` when `LOVABLE_API_KEY` is missing or AI call fails
- **Combined analysis memoization**: `useCombinedAnalysis` uses `useMemo` with correct dependency array `[sentimentData, macroData]`
- **Alignment calculation**: Score difference thresholds (0.15 aligned, 0.25 conflict) are logically sound
- **Position size adjustment**: Correctly maps to 0.5 (reduce), 0.75, or 1.0 based on recommendation
- **Confidence calculation**: Properly factors in alignment status and data quality
- **Bias expiry computation**: Locally computed from `tradingStyle` mapping (scalping=15m, short=60m, swing=240m) -- correct
- **Bias timer**: 30-second interval update for countdown display
- **Loading skeletons**: Present in `AIAnalysisTab`, `CombinedAnalysisCard`, and `BiasExpiryIndicator` (implicit via null return)
- **Empty/null state**: `CombinedAnalysisCard` shows "Unable to calculate" message when data is null
- **Error state**: `AIAnalysisTab` renders `AsyncErrorFallback` with retry on error
- **Market alerts**: Deduplication via hourly/30-min keyed `Set` prevents toast spam; cleanup runs hourly
- **Semantic colors**: `text-profit` / `text-loss` used consistently for directional indicators
- **ARIA attributes**: Score regions have `role="region"` and `aria-label`; alignment row has `aria-live="polite"`
- **InfoTooltips**: Complex terms (Crypto Sentiment, Macro Sentiment, Alignment, Position Size) all have explanatory tooltips
- **Refresh button**: Disabled during loading, spinner animation applied
- **Shared query keys**: `useMarketSentiment` and `useMacroAnalysis` are reused by `useCombinedAnalysis` (same query key = shared cache, no duplicate requests)
- **RSI, MA, Volatility formulas**: Mathematically correct (verified in prior Market Data audit)
- **Whale detection logic**: Correct volume spike + price direction cross-analysis
- **Technical signal generation**: Proper MA crossover + RSI + momentum scoring
- **Macro sentiment scoring**: Correct weighted (35/35/30) formula for market cap + F&G + funding
- **Error propagation**: `sentimentError || macroError` correctly passed to `AIAnalysisTab`

---

## Summary

| # | File | Issue | Criteria | Severity |
|---|------|-------|----------|----------|
| 1 | `macro-analysis/index.ts` line 302 | Raw error message leaked to client | Security | High |
| 2 | `MarketInsight.tsx` lines 56-59 | `handleRefresh` not memoized, causes repeated calls on bias expiry | Accuracy | High |
| 3 | `MarketInsight.tsx` | Missing top-level ErrorBoundary | Comprehensiveness | Medium |

Total: 2 files, 3 fixes.

## Technical Details

### Fix 1: Sanitize macro-analysis error response

In `supabase/functions/macro-analysis/index.ts` line 302, replace:
```typescript
JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' })
```
With:
```typescript
JSON.stringify({ error: 'An error occurred processing your request' })
```

### Fix 2: Memoize handleRefresh

In `src/pages/MarketInsight.tsx`, import `useCallback` and wrap `handleRefresh`:
```typescript
import { useMemo, useCallback } from "react";
// ...
const handleRefresh = useCallback(() => {
  refetchSentiment();
  refetchMacro();
}, [refetchSentiment, refetchMacro]);
```

### Fix 3: Add top-level ErrorBoundary

In `src/pages/MarketInsight.tsx`, import `ErrorBoundary` and `useState`, wrap content with key-based retry pattern.
