
# AI Analysis Page: Deep UX Analysis & Fixes

## Scope & Coverage (100%)

All files read in full:

**Page**: `src/pages/MarketInsight.tsx` (133 lines)

**Components**: `src/components/market-insight/AIAnalysisTab.tsx` (262 lines), `CombinedAnalysisCard.tsx` (253 lines), `BiasExpiryIndicator.tsx` (69 lines), `CalendarTab.tsx` (346 lines), `index.ts` (5 lines)

**Feature Hooks**: `src/features/market-insight/useMarketSentiment.ts`, `useMacroAnalysis.ts`, `useCombinedAnalysis.ts` (160 lines), `useMarketAlerts.ts` (109 lines), `useMultiSymbolMarketInsight.ts` (43 lines), `types.ts` (95 lines), `index.ts` (8 lines)

**Edge Functions**: `supabase/functions/market-insight/index.ts` (311 lines), `supabase/functions/macro-analysis/index.ts` (280 lines), `supabase/functions/market-analysis/index.ts` (202 lines)

**Shared**: `src/components/ui/error-boundary.tsx` (182 lines)

**Cross-domain**: Dashboard AIInsightsWidget, chatbot market mode, MarketData page, EconomicCalendar page, `use-capture-market-context.ts`

---

## Issues Found

### 1. `macro-analysis` Edge Function Has No Auth Check (Security Gap)

`supabase/functions/macro-analysis/index.ts` (lines 182-280) accepts any request without JWT verification. Unlike `market-insight` which has full auth, `macro-analysis` is completely open, exposing AI gateway costs (it calls `ai.gateway.lovable.dev` for the AI summary).

**Fix**: Add the standard JWT auth check pattern (same as `market-insight` and `trading-analysis`).

### 2. `market-analysis` Calls `market-insight` Without Auth Header (Broken Data Pipeline)

`supabase/functions/market-analysis/index.ts` lines 49-60: When the chatbot's "market" mode triggers `market-analysis`, it internally calls `market-insight` and `macro-analysis` using plain `fetch` without forwarding the `Authorization` header. Since `market-insight` requires auth, this call returns 401, meaning the AI chatbot's market mode operates with empty/error context data.

**Fix**: Forward the `authHeader` in the internal fetch calls to both `market-insight` and `macro-analysis`.

### 3. Dead Imports in `AIAnalysisTab.tsx`

`src/components/market-insight/AIAnalysisTab.tsx` line 22: imports `useMarketSentiment` and `useMacroAnalysis` but never uses them -- all data comes via props. These are dead imports that add unnecessary bundle weight and confusion.

**Fix**: Remove the unused import line.

### 4. `error` Prop Not Passed to `AIAnalysisTab`

`src/pages/MarketInsight.tsx` lines 117-122: The `AIAnalysisTab` component accepts an `error` prop and has built-in error handling (async error fallback with retry). However, the parent page never passes `error` to it. Instead, the page renders its own less informative error card (lines 102-114) that says "Failed to load market data. Please try refreshing." but has no retry button.

The component's own error handler (`AsyncErrorFallback`) includes a retry button and shows the actual error message -- objectively better UX.

**Fix**: Pass the error to `AIAnalysisTab` and remove the redundant page-level error card, or at minimum pass the error prop so the component can render its own fallback. Since `AIAnalysisTab` already short-circuits on error (line 41-48), passing the error means the duplicate page-level card should be removed to avoid showing two error states.

### 5. No Issues Found (Verified Correct)

- **Mode parity**: Page has zero mode-dependent logic -- identical for Paper and Live. Correct per "mode is context, not feature type."
- **Loading states**: `AIAnalysisTab` shows proper Skeleton placeholders for both sentiment and macro sections. `CombinedAnalysisCard` shows skeleton loading. Correct.
- **Empty/null states**: `CombinedAnalysisCard` handles `data === null` with a fallback message. Correct.
- **Bias expiry**: Computed locally from `tradingStyle` with correct `BIAS_VALIDITY_MINUTES` map. Auto-refresh on expiry via `onExpired` callback. Correct.
- **Color tokens**: All sentiment indicators use `text-profit`, `text-loss`, semantic tokens. Correct.
- **ARIA**: Progress bars have `aria-label`, regions have `role="region"`, `aria-live="polite"` on alignment status. `InfoTooltip` on complex terms. Correct.
- **Error boundary**: `AIAnalysisTab` wrapped in `ErrorBoundary` with retry. Correct.
- **Market alerts**: `useMarketAlerts` fires toasts for extreme Fear/Greed and crypto-macro conflict with hourly dedup. Correct.
- **React Query config**: Proper `staleTime`, `refetchInterval`, retry with exponential backoff. Correct.
- **Combined analysis**: Scoring logic with crypto/macro alignment, position size adjustment, and confidence calculation. Correct.
- **CalendarTab**: Not used on this page (used on separate `/calendar` route). Correctly separated. Not dead code.
- **`useMultiSymbolMarketInsight`**: Used by `/market-data` page. Not dead code.

---

## Implementation Plan

### File 1: `supabase/functions/macro-analysis/index.ts`

**Add auth check**: Add JWT verification at the top of the handler, matching the pattern from `market-insight`:
- Import `createClient` from supabase-js
- Check `authorization` header for Bearer token
- Verify via `supabase.auth.getClaims(token)`
- Return 401 if invalid

### File 2: `supabase/functions/market-analysis/index.ts`

**Forward auth header in internal calls** (lines 49-60): Add `Authorization: authHeader` to the headers of both internal fetch calls to `market-insight` and `macro-analysis`:

```typescript
const [sentimentRes, macroRes] = await Promise.all([
  fetch(`${SUPABASE_URL}/functions/v1/market-insight`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({}),
  }),
  fetch(`${SUPABASE_URL}/functions/v1/macro-analysis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': authHeader,
    },
    body: JSON.stringify({}),
  }),
]);
```

### File 3: `src/components/market-insight/AIAnalysisTab.tsx`

**Remove dead imports** (line 22): Delete `import { useMarketSentiment, useMacroAnalysis } from "@/features/market-insight";`

### File 4: `src/pages/MarketInsight.tsx`

**Pass error prop to AIAnalysisTab** and **remove duplicate error card**:
- Remove the page-level error card (lines 102-114)
- Pass `error={sentimentError || macroError}` to `AIAnalysisTab`

Before:
```tsx
{hasError && ( <Card>...</Card> )}
<AIAnalysisTab sentimentData={...} macroData={...} isLoading={...} onRefresh={...} />
```

After:
```tsx
<AIAnalysisTab
  sentimentData={sentimentData}
  macroData={macroData}
  isLoading={isLoading}
  onRefresh={handleRefresh}
  error={sentimentError || macroError || null}
/>
```

---

## Technical Summary

| File | Change |
|------|--------|
| `supabase/functions/macro-analysis/index.ts` | Add JWT auth check |
| `supabase/functions/market-analysis/index.ts` | Forward auth header in internal calls |
| `src/components/market-insight/AIAnalysisTab.tsx` | Remove dead imports |
| `src/pages/MarketInsight.tsx` | Pass error prop, remove duplicate error card |

Total: 4 files modified. Fixes cover 1 security gap, 1 broken data pipeline, 1 dead import, and 1 UX improvement (error handling delegation).
