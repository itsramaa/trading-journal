

# Market Data Page - Functional Correctness Audit

## Audit Scope

Reviewed 15+ files across pages, components, hooks, edge functions, contexts, constants, types, and utilities that compose the Market Data domain.

---

## Issues Found

### 1. MarketSentimentWidget ErrorBoundary Uses `window.location.reload()` (Code Quality / Consistency - MEDIUM)

**File:** `src/components/market/MarketSentimentWidget.tsx` (line 407)

The MarketSentimentWidget's ErrorBoundary uses `window.location.reload()` as its retry mechanism:
```typescript
<ErrorBoundary 
  title="Market Sentiment"
  onRetry={() => window.location.reload()}
>
```

The VolatilityMeterWidget uses a key-based remount pattern (`setRetryKey(k => k + 1)`) which is the established best practice in this codebase -- it avoids full page reload, preserves state of other widgets, and only remounts the failed component. The WhaleTrackingWidget and TradingOpportunitiesWidget correctly pass `props.onRetry` (which triggers `refetch()`).

**Fix:** Adopt the key-based remount pattern matching VolatilityMeterWidget:
```typescript
export function MarketSentimentWidget(props: MarketSentimentWidgetProps) {
  const [retryKey, setRetryKey] = useState(0);
  return (
    <ErrorBoundary 
      title="Market Sentiment"
      onRetry={() => setRetryKey(k => k + 1)}
    >
      <MarketSentimentContent key={retryKey} {...props} />
    </ErrorBoundary>
  );
}
```

---

### 2. `useBinanceMarketSentiment` Recalculates on Every Render (Accuracy / Code Quality - MEDIUM)

**File:** `src/features/binance/useBinanceMarketData.ts` (lines 368-442)

The `calculateSentiment()` function is defined inline and called on every render when `!isLoading && !isError` (line 445). It does not use `useMemo`, meaning sentiment scores, factors, and raw data are recomputed on every unrelated re-render of a parent component. While functionally correct, this is wasteful and violates the memoization pattern used everywhere else in the project.

**Fix:** Wrap with `useMemo` keyed on the five query data values:
```typescript
const data = useMemo(() => {
  if (isLoading || isError) return null;
  return calculateSentiment();
}, [
  isLoading, isError,
  topTraderQuery.data, globalRatioQuery.data,
  takerVolumeQuery.data, openInterestQuery.data,
  markPriceQuery.data, symbol
]);
```

This requires importing `useMemo` at the top of the file and moving `calculateSentiment` logic into the memo callback.

---

### 3. Funding Rate Color Missing Zero-Value Case (Accuracy - LOW)

**File:** `src/components/market/MarketSentimentWidget.tsx` (line 370)

The funding rate display uses:
```typescript
sentiment.rawData.markPrice.lastFundingRate > 0 ? "text-profit" : "text-loss"
```

When `lastFundingRate` is exactly `0`, it will incorrectly render as `text-loss` (red). A zero funding rate is neutral, not bearish.

**Fix:** Add the zero case:
```typescript
sentiment.rawData.markPrice.lastFundingRate > 0 
  ? "text-profit" 
  : sentiment.rawData.markPrice.lastFundingRate < 0 
    ? "text-loss" 
    : "text-muted-foreground"
```

---

## Verified Correct (No Issues)

The following were explicitly verified and found functionally sound:

- **Edge function auth**: JWT validation via `getClaims` with proper 401 responses
- **Input validation**: `SYMBOL_REGEX` + `.slice(0, MAX_SYMBOLS_PER_REQUEST)` prevents injection and abuse
- **Symbol validation pipeline**: `filterValidSymbols()` validates against DB with 1-hour cache + fallback list
- **MarketContext persistence**: localStorage read/write with JSON parse error handling
- **useMarketContext guard**: Throws if used outside provider (fail-fast)
- **Query configuration**: staleTime, refetchInterval, retry, retryDelay all properly configured
- **normalizeError utility**: Handles Error, string, unknown, and null correctly
- **Sentiment calculation logic**: RSI, MA, volatility formulas are mathematically correct
- **Whale detection**: Volume spike + price direction cross-analysis with confidence capping
- **Fear & Greed fallback**: Returns neutral (50) on API failure instead of crashing
- **CoinGecko fallback**: Returns neutral defaults on failure
- **Data quality metric**: Correctly reflects kline data completeness
- **Confidence scoring**: Agreement bonus, distance-from-neutral, data quality all properly weighted
- **ErrorBoundary coverage**: All 4 widgets wrapped
- **ARIA attributes**: All 4 widgets have `role="region"` and `aria-label`
- **Loading skeletons**: Present in all 4 widgets
- **Empty states**: Present in WhaleTracking, TradingOpportunities, Volatility, Sentiment
- **Error states with retry**: Present in all 4 widgets
- **Semantic colors**: `text-profit`/`text-loss` used consistently (fixed in prior audit)
- **Centralized constants**: All thresholds, limits, and config in `src/lib/constants/`
- **Shared constants in edge function**: `_shared/constants/market-config.ts` ensures sync
- **React keys**: Stable keys used (fixed in prior audit)
- **Symbol selector**: Combobox with search, popular group, all pairs group

---

## Summary

| # | File | Issue | Criteria | Severity |
|---|------|-------|----------|----------|
| 1 | MarketSentimentWidget.tsx | ErrorBoundary uses `window.location.reload()` instead of key-based remount | Code Quality | Medium |
| 2 | useBinanceMarketData.ts | `calculateSentiment()` not memoized, recalculates every render | Code Quality | Medium |
| 3 | MarketSentimentWidget.tsx | Funding rate zero value renders as loss (red) instead of neutral | Accuracy | Low |

Total: 2 files, 3 fixes.

## Technical Details

### Fix 1: Key-based remount for MarketSentimentWidget

Add `useState` import (already imported), wrap with key-based retry pattern matching VolatilityMeterWidget.

### Fix 2: Memoize calculateSentiment

Add `useMemo` import to `useBinanceMarketData.ts`, wrap the sentiment calculation in a `useMemo` hook with proper dependency array.

### Fix 3: Funding rate zero handling

Add ternary for the `=== 0` case to render `text-muted-foreground` instead of `text-loss`.

