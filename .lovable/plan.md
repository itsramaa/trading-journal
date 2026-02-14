

# Deep UX Analysis: AI Analysis Page (`/market`)

## Status: Solid Core, 2 Issues Found (1 Bug, 1 Cosmetic)

The AI Analysis page at `/market` (component: `MarketInsight.tsx`) is correctly **mode-agnostic** -- all data comes from public APIs (Binance, CoinGecko, Alternative.me) via edge functions. Layout and components are identical across Paper and Live modes.

---

## Architecture Verification

| Aspect | Status | Detail |
|--------|--------|--------|
| Mode independence | OK | Only uses `tradingStyle` for bias expiry duration -- not mode-dependent |
| Data flow | OK | `useMarketSentiment` -> `market-insight` EF; `useMacroAnalysis` -> `macro-analysis` EF |
| Combined analysis | OK | `useCombinedAnalysis` derives alignment from crypto + macro scores client-side |
| Error handling | OK | `ErrorBoundary` + `AsyncErrorFallback` in `AIAnalysisTab` |
| Loading states | OK | Skeleton loaders for all 3 sections |
| Empty/error states | OK | Error card with retry CTA |
| Refresh mechanism | OK | Manual button + 5-min auto-refresh (sentiment) + 15-min (macro) |
| Alert system | OK | `useMarketAlerts` fires toast on extreme Fear/Greed and crypto-macro conflicts |
| Bias expiry | OK | `BiasExpiryIndicator` with countdown and auto-refresh on expiry |
| Cross-feature use | OK | Sentiment/macro data consumed by `useCaptureMarketContext`, `useNotificationTriggers`, Dashboard |

### Component Tree (verified correct)

```text
MarketInsight (page at /market)
  +-- PageHeader (title: "Market Insight", Refresh button)
  +-- BiasExpiryIndicator (conditional: countdown badge)
  +-- Error Card (conditional: fetch failures)
  +-- AIAnalysisTab
  |    +-- AI Market Sentiment card (confidence, Fear & Greed, recommendation, signals)
  |    +-- AI Macro Analysis card (sentiment pill, correlations grid, AI summary)
  +-- CombinedAnalysisCard (alignment score, recommendation, position size adj.)
```

---

## Issues Found

### BUG 1: `validUntil` Race Condition in `useMarketSentiment` (Medium)

**File:** `src/features/market-insight/useMarketSentiment.ts`

The hook accepts an optional `tradingStyle` parameter that determines `validityMinutes` (Scalping: 15m, Short: 60m, Swing: 240m). This value is used inside `queryFn` to calculate `validUntil`. However, the queryKey is always `["market-sentiment"]` regardless of `tradingStyle`.

**Problem:** React Query deduplicates by queryKey. Whichever caller triggers the fetch first determines `validUntil` for ALL consumers. Since `useCombinedAnalysis()`, `useMarketAlerts()`, `useCaptureMarketContext()`, and `useNotificationTriggers()` all call `useMarketSentiment()` without `tradingStyle`, they default to `short_trade` (60m). If any of these resolves before `MarketInsight.tsx` (which passes the actual `tradingStyle`), the cached response has `validUntil` based on 60m, not the user's trading style.

This means a Scalping user sees a 60m validity badge instead of 15m, and a Swing user sees 60m instead of 240m.

**Fix:** Move `validUntil` calculation OUT of `queryFn` and into the consuming component. The hook should return raw data; the page computes `validUntil` locally:

1. Remove `validUntil` mutation from `useMarketSentiment`
2. Compute `validUntil` in `MarketInsight.tsx` using `sentimentData.sentiment.lastUpdated` + `tradingStyle`

This keeps the cached data pure and lets each consumer apply its own interpretation.

---

### COSMETIC 2: Page Title Mismatch (Minor)

**Files:** Multiple navigation files

The page is registered as **"AI Analysis"** in sidebar, command palette, keyboard shortcuts, and breadcrumbs. But the `PageHeader` inside `MarketInsight.tsx` renders **"Market Insight"** as the title with description "AI-powered market analysis and trading opportunities."

This creates a minor disconnect: user clicks "AI Analysis" in the sidebar but sees "Market Insight" as the page title.

**Fix:** Update `PageHeader` title from "Market Insight" to "AI Analysis" for consistency with all navigation references. Keep the description as-is.

---

## No Mode-Related Issues

The AI Analysis page has **zero mode-related inconsistencies** because:
1. All data is from public APIs -- no user trade data
2. No account-specific queries or `trade_entries` reads
3. `tradingStyle` affects only bias expiry duration, not data visibility
4. `useMarketAlerts` fires identical alerts regardless of mode

---

## Implementation Summary

| File | Action | Detail |
|------|--------|--------|
| `src/features/market-insight/useMarketSentiment.ts` | Remove `validUntil` mutation from `queryFn` | Keep cached data pure -- no side effects in queryFn |
| `src/pages/MarketInsight.tsx` | Compute `validUntil` locally from `sentimentData` + `tradingStyle` | Pass computed value to `BiasExpiryIndicator` |
| `src/pages/MarketInsight.tsx` | Update PageHeader title to "AI Analysis" | Match sidebar/command palette naming |

Total: 1 bug fix (validUntil race), 1 cosmetic fix (title). No structural changes needed.

